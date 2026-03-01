import mongoose from 'mongoose';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../common/errors/AppError';
import { isSuperAdminRole } from '../../common/middleware/superAdmin';
import MarketplaceContract, {
  IMarketplaceContract,
  MarketplaceContractStatus,
} from './contract.model';

type ActorContext = {
  userId: mongoose.Types.ObjectId;
  role: string;
  orgId?: string;
};

type ListOptions = {
  page?: number;
  limit?: number;
  status?: MarketplaceContractStatus;
  organizationId?: string;
  search?: string;
};

class MarketplaceContractsService {
  private isAdminLike(role: string): boolean {
    return ['admin', 'platform_admin', 'super_admin'].includes(role);
  }

  private resolveOrganizationId(actor: ActorContext, requested?: string): mongoose.Types.ObjectId | undefined {
    if (isSuperAdminRole(actor.role)) {
      return requested && mongoose.Types.ObjectId.isValid(requested)
        ? new mongoose.Types.ObjectId(requested)
        : undefined;
    }

    if (actor.orgId) {
      if (requested && requested !== actor.orgId) {
        throw new ForbiddenError('Cannot access contracts outside your organization');
      }
      return new mongoose.Types.ObjectId(actor.orgId);
    }

    if (requested) {
      throw new ForbiddenError('Organization context is required');
    }

    return undefined;
  }

  private assertCanAccessContract(contract: IMarketplaceContract, actor: ActorContext): void {
    if (isSuperAdminRole(actor.role)) {
      return;
    }

    const actorId = actor.userId.toString();
    const isParty = contract.parties.some((party) => party.toString() === actorId);
    const isOwner = contract.createdBy.toString() === actorId;
    const isOrgAdmin = this.isAdminLike(actor.role);
    const actorOrg = actor.orgId;

    if (isOrgAdmin) {
      if (!contract.organization || !actorOrg || contract.organization.toString() !== actorOrg) {
        throw new ForbiddenError('Cannot access contracts outside your organization');
      }
      return;
    }

    if (!isParty && !isOwner) {
      throw new ForbiddenError('You are not authorized to access this contract');
    }
  }

  private validateStatusTransition(currentStatus: MarketplaceContractStatus, nextStatus: MarketplaceContractStatus): void {
    const transitions: Record<MarketplaceContractStatus, MarketplaceContractStatus[]> = {
      draft: ['draft', 'under_review', 'terminated'],
      under_review: ['draft', 'under_review', 'active', 'terminated'],
      active: ['active', 'completed', 'terminated'],
      completed: ['completed'],
      terminated: ['terminated'],
    };

    if (!transitions[currentStatus].includes(nextStatus)) {
      throw new BadRequestError(`Invalid contract status transition: ${currentStatus} -> ${nextStatus}`);
    }
  }

  async listContracts(actor: ActorContext, options: ListOptions = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;
    const organization = this.resolveOrganizationId(actor, options.organizationId);

    const filter: Record<string, unknown> = { isActive: true };
    if (organization) {
      filter.organization = organization;
    }
    if (options.status) {
      filter.status = options.status;
    }
    if (options.search) {
      filter.$or = [
        { contractNumber: { $regex: options.search, $options: 'i' } },
        { title: { $regex: options.search, $options: 'i' } },
      ];
    }

    if (!this.isAdminLike(actor.role) && !isSuperAdminRole(actor.role)) {
      filter.$or = [
        { parties: actor.userId },
        { createdBy: actor.userId },
      ];
    }

    const [contracts, total] = await Promise.all([
      MarketplaceContract.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('parties', 'name email')
        .populate('createdBy', 'name email'),
      MarketplaceContract.countDocuments(filter),
    ]);

    return {
      contracts,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async createContract(
    actor: ActorContext,
    payload: Partial<IMarketplaceContract> & {
      organizationId?: string;
    }
  ): Promise<IMarketplaceContract> {
    const organization = this.resolveOrganizationId(actor, payload.organizationId);
    if (!payload.title || !payload.terms) {
      throw new BadRequestError('title and terms are required');
    }

    const parties = (payload.parties || []).map((party) =>
      new mongoose.Types.ObjectId(party.toString())
    );

    if (parties.length === 0) {
      throw new BadRequestError('At least one party is required');
    }

    const created = await MarketplaceContract.create({
      organization,
      listing: payload.listing,
      order: payload.order,
      offer: payload.offer,
      title: payload.title,
      terms: payload.terms,
      valueAmount: payload.valueAmount,
      currency: payload.currency || 'UGX',
      startDate: payload.startDate,
      endDate: payload.endDate,
      parties,
      signatures: [],
      status: payload.status || 'draft',
      createdBy: actor.userId,
      lastModifiedBy: actor.userId,
    });

    return created.populate('parties', 'name email');
  }

  async getContract(contractId: mongoose.Types.ObjectId, actor: ActorContext): Promise<IMarketplaceContract> {
    const contract = await MarketplaceContract.findOne({ _id: contractId, isActive: true })
      .populate('parties', 'name email')
      .populate('createdBy', 'name email')
      .populate('signatures.user', 'name email');
    if (!contract) {
      throw new NotFoundError('Contract not found');
    }

    this.assertCanAccessContract(contract, actor);
    return contract;
  }

  async updateContract(
    contractId: mongoose.Types.ObjectId,
    actor: ActorContext,
    payload: Partial<IMarketplaceContract>
  ): Promise<IMarketplaceContract> {
    const contract = await this.getContract(contractId, actor);

    if (!this.isAdminLike(actor.role) && contract.createdBy.toString() !== actor.userId.toString()) {
      throw new ForbiddenError('Only contract owner or admin can update contract');
    }

    if (payload.status) {
      this.validateStatusTransition(contract.status, payload.status);
      contract.status = payload.status;
    }

    if (payload.title !== undefined) contract.title = payload.title;
    if (payload.terms !== undefined) contract.terms = payload.terms;
    if (payload.valueAmount !== undefined) contract.valueAmount = payload.valueAmount;
    if (payload.currency !== undefined) contract.currency = payload.currency;
    if (payload.startDate !== undefined) contract.startDate = payload.startDate;
    if (payload.endDate !== undefined) contract.endDate = payload.endDate;
    if (payload.listing !== undefined) contract.listing = payload.listing;
    if (payload.order !== undefined) contract.order = payload.order;
    if (payload.offer !== undefined) contract.offer = payload.offer;
    if (payload.parties !== undefined) {
      contract.parties = payload.parties.map((party) => new mongoose.Types.ObjectId(party.toString()));
    }

    contract.lastModifiedBy = actor.userId;
    await contract.save();
    return contract.populate('parties', 'name email');
  }

  async deleteContract(contractId: mongoose.Types.ObjectId, actor: ActorContext): Promise<void> {
    const contract = await this.getContract(contractId, actor);
    if (!this.isAdminLike(actor.role) && contract.createdBy.toString() !== actor.userId.toString()) {
      throw new ForbiddenError('Only contract owner or admin can delete contract');
    }

    await contract.softDelete(actor.userId);
  }

  async signContract(
    contractId: mongoose.Types.ObjectId,
    actor: ActorContext,
    note?: string
  ): Promise<IMarketplaceContract> {
    const contract = await this.getContract(contractId, actor);
    if (contract.status === 'completed' || contract.status === 'terminated') {
      throw new BadRequestError(`Cannot sign contract in ${contract.status} status`);
    }

    const actorId = actor.userId.toString();
    const isParty = contract.parties.some((party) => party.toString() === actorId);
    if (!isParty && !this.isAdminLike(actor.role) && !isSuperAdminRole(actor.role)) {
      throw new ForbiddenError('Only contract parties can sign this contract');
    }

    const existingSignature = contract.signatures.find((signature) => signature.user.toString() === actorId);
    if (existingSignature) {
      existingSignature.signedAt = new Date();
      existingSignature.note = note;
    } else {
      contract.signatures.push({
        user: actor.userId,
        signedAt: new Date(),
        note,
      });
    }

    const uniqueSignedParties = new Set(contract.signatures.map((signature) => signature.user.toString()));
    const allPartiesSigned = contract.parties.every((party) => uniqueSignedParties.has(party.toString()));

    if (allPartiesSigned && contract.status !== 'active') {
      this.validateStatusTransition(contract.status, 'active');
      contract.status = 'active';
    } else if (contract.status === 'draft') {
      this.validateStatusTransition(contract.status, 'under_review');
      contract.status = 'under_review';
    }

    contract.lastModifiedBy = actor.userId;
    await contract.save();
    return contract.populate('signatures.user', 'name email');
  }
}

export default new MarketplaceContractsService();
