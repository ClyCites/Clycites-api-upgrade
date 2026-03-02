import { Request, Response, NextFunction } from 'express';
import { AppError, ForbiddenError } from '../../common/errors/AppError';
import { ResponseHandler } from '../../common/utils/response';
import { isSuperAdminRole } from '../../common/middleware/superAdmin';
import Invoice, { InvoiceStatus } from './invoice.model';
import Credit, { CreditStatus } from './credit.model';
import InsurancePolicy, { InsurancePolicyStatus } from './insurancePolicy.model';
import InsuranceClaim, { InsuranceClaimStatus } from './insuranceClaim.model';

type AnyRecord = Record<string, unknown>;

const INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['draft', 'issued', 'cancelled'],
  issued: ['issued', 'paid', 'overdue', 'cancelled'],
  overdue: ['overdue', 'paid', 'cancelled'],
  paid: ['paid'],
  cancelled: ['cancelled'],
};

const CREDIT_TRANSITIONS: Record<CreditStatus, CreditStatus[]> = {
  applied: ['applied', 'under_review', 'approved', 'rejected'],
  under_review: ['under_review', 'approved', 'rejected'],
  approved: ['approved', 'disbursed', 'rejected'],
  rejected: ['rejected'],
  disbursed: ['disbursed'],
};

const POLICY_TRANSITIONS: Record<InsurancePolicyStatus, InsurancePolicyStatus[]> = {
  active: ['active', 'claim_open', 'expired'],
  claim_open: ['claim_open', 'claim_resolved', 'expired'],
  claim_resolved: ['claim_resolved', 'active', 'expired'],
  expired: ['expired'],
};

const CLAIM_TRANSITIONS: Record<InsuranceClaimStatus, InsuranceClaimStatus[]> = {
  open: ['open', 'under_review', 'resolved', 'rejected'],
  under_review: ['under_review', 'resolved', 'rejected'],
  resolved: ['resolved'],
  rejected: ['rejected'],
};

const toInt = (value: unknown, fallback: number, max?: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  if (typeof max === 'number') return Math.min(parsed, max);
  return parsed;
};

const toPlainObject = <T>(value: T): T => {
  if (value && typeof (value as { toObject?: () => T }).toObject === 'function') {
    return (value as { toObject: () => T }).toObject();
  }
  return value;
};

const withUiStatus = <T extends AnyRecord>(entity: T): T & { uiStatus: unknown } => {
  const plain = toPlainObject(entity);
  return { ...plain, uiStatus: plain.status };
};

const pagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit) || 1,
});

const toOrgId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

class FinanceController {
  private getUserId(req: Request): string {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    return userId;
  }

  private isPrivileged(role?: string): boolean {
    return role === 'admin' || role === 'platform_admin' || isSuperAdminRole(role);
  }

  private resolveOrgId(req: Request): string | undefined {
    const fromQuery = toOrgId(req.query.organizationId);
    const fromHeader = toOrgId(req.headers['x-organization-id']);
    const fromBody = typeof req.body === 'object' && req.body ? toOrgId((req.body as AnyRecord).organizationId) : undefined;
    const requested = fromQuery || fromBody || fromHeader;
    const actorOrg = req.user?.orgId;

    if (isSuperAdminRole(req.user?.role)) return requested || actorOrg;

    if (actorOrg) {
      if (requested && requested !== actorOrg) {
        throw new ForbiddenError('Cannot access finance resources outside your organization context');
      }
      return actorOrg;
    }

    return requested;
  }

  private assertAccess(req: Request, ownerId: string, organizationId?: string): void {
    if (isSuperAdminRole(req.user?.role)) return;

    const actorId = this.getUserId(req);
    const actorOrg = req.user?.orgId;

    if (this.isPrivileged(req.user?.role)) {
      if (organizationId && actorOrg && organizationId !== actorOrg) {
        throw new ForbiddenError('Cannot access finance resources outside your organization context');
      }
      return;
    }

    if (ownerId !== actorId) throw new ForbiddenError('You can only access your own finance resources');

    if (organizationId && actorOrg && organizationId !== actorOrg) {
      throw new ForbiddenError('Cannot access finance resources outside your organization context');
    }
  }

  private assertTransition<T extends string>(currentStatus: T, nextStatus: T, transitions: Record<T, T[]>, label: string): void {
    if (!(transitions[currentStatus] || []).includes(nextStatus)) {
      throw new AppError(`Invalid ${label} transition: ${currentStatus} -> ${nextStatus}`, 400, 'BAD_REQUEST');
    }
  }

  async listInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const page = toInt(req.query.page, 1, 10000);
      const limit = toInt(req.query.limit, 20, 100);
      const skip = (page - 1) * limit;
      const organizationId = this.resolveOrgId(req);
      const filter: Record<string, unknown> = { isActive: true };

      if (organizationId) filter.organization = organizationId;
      if (typeof req.query.status === 'string') filter.status = req.query.status;
      if (typeof req.query.invoiceNumber === 'string') filter.invoiceNumber = { $regex: req.query.invoiceNumber.trim(), $options: 'i' };

      if (!this.isPrivileged(req.user?.role) && !isSuperAdminRole(req.user?.role)) {
        filter.createdBy = this.getUserId(req);
      }

      const [rows, total] = await Promise.all([
        Invoice.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Invoice.countDocuments(filter),
      ]);

      ResponseHandler.success(
        res,
        rows.map((item) => withUiStatus(item as unknown as AnyRecord)),
        'Invoices retrieved',
        200,
        { pagination: pagination(page, limit, total) }
      );
    } catch (error) {
      next(error);
    }
  }

  async createInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = this.getUserId(req);
      const organizationId = this.resolveOrgId(req);

      const items = Array.isArray(req.body.items) ? req.body.items : [];
      const computedAmount = items.reduce((sum: number, item: any) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        return sum + quantity * unitPrice;
      }, 0);
      const amount = req.body.amount !== undefined ? Number(req.body.amount) : computedAmount;

      const invoice = await Invoice.create({
        organization: organizationId,
        createdBy: actorId,
        customerId: req.body.customerId,
        customerName: req.body.customerName,
        items: items.map((item: any) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal || Number(item.quantity) * Number(item.unitPrice)),
        })),
        amount,
        currency: req.body.currency || 'UGX',
        dueDate: new Date(req.body.dueDate),
        status: (req.body.status as InvoiceStatus | undefined) || 'draft',
        notes: req.body.notes,
        metadata: req.body.metadata || {},
      });

      ResponseHandler.created(res, withUiStatus(invoice as unknown as AnyRecord), 'Invoice created');
    } catch (error) {
      next(error);
    }
  }

  async getInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await Invoice.findOne({ _id: req.params.invoiceId, isActive: true });
      if (!invoice) throw new AppError('Invoice not found', 404, 'NOT_FOUND');

      this.assertAccess(req, invoice.createdBy.toString(), invoice.organization?.toString());
      ResponseHandler.success(res, withUiStatus(invoice as unknown as AnyRecord), 'Invoice retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await Invoice.findOne({ _id: req.params.invoiceId, isActive: true });
      if (!invoice) throw new AppError('Invoice not found', 404, 'NOT_FOUND');

      this.assertAccess(req, invoice.createdBy.toString(), invoice.organization?.toString());

      if (typeof req.body.status === 'string') {
        const nextStatus = req.body.status as InvoiceStatus;
        this.assertTransition(invoice.status, nextStatus, INVOICE_TRANSITIONS, 'invoice status');
        invoice.status = nextStatus;

        if (nextStatus === 'issued' && !invoice.issuedAt) invoice.issuedAt = new Date();
        if (nextStatus === 'paid' && !invoice.paidAt) invoice.paidAt = new Date();
      }

      if (req.body.customerName !== undefined) invoice.customerName = req.body.customerName;
      if (req.body.customerId !== undefined) invoice.customerId = req.body.customerId;
      if (req.body.currency !== undefined) invoice.currency = req.body.currency;
      if (req.body.notes !== undefined) invoice.notes = req.body.notes;
      if (req.body.metadata !== undefined) invoice.metadata = req.body.metadata;
      if (req.body.dueDate !== undefined) invoice.dueDate = new Date(req.body.dueDate);
      if (req.body.amount !== undefined) invoice.amount = Number(req.body.amount);

      if (Array.isArray(req.body.items)) {
        invoice.items = req.body.items.map((item: any) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal || Number(item.quantity) * Number(item.unitPrice)),
        }));
      }

      await invoice.save();
      ResponseHandler.success(res, withUiStatus(invoice as unknown as AnyRecord), 'Invoice updated');
    } catch (error) {
      next(error);
    }
  }

  async deleteInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await Invoice.findOne({ _id: req.params.invoiceId, isActive: true });
      if (!invoice) throw new AppError('Invoice not found', 404, 'NOT_FOUND');

      this.assertAccess(req, invoice.createdBy.toString(), invoice.organization?.toString());
      invoice.isActive = false;
      await invoice.save();

      ResponseHandler.success(res, null, 'Invoice deleted');
    } catch (error) {
      next(error);
    }
  }

  async exportInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await Invoice.findOne({ _id: req.params.invoiceId, isActive: true });
      if (!invoice) throw new AppError('Invoice not found', 404, 'NOT_FOUND');

      this.assertAccess(req, invoice.createdBy.toString(), invoice.organization?.toString());

      ResponseHandler.success(
        res,
        {
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          exportedAt: new Date().toISOString(),
          exportFormat: req.body.format || 'pdf',
          fileName: `${invoice.invoiceNumber}.pdf`,
        },
        'Invoice export generated'
      );
    } catch (error) {
      next(error);
    }
  }

  async listCredits(req: Request, res: Response, next: NextFunction) {
    try {
      const page = toInt(req.query.page, 1, 10000);
      const limit = toInt(req.query.limit, 20, 100);
      const skip = (page - 1) * limit;
      const organizationId = this.resolveOrgId(req);
      const filter: Record<string, unknown> = { isActive: true };

      if (organizationId) filter.organization = organizationId;
      if (typeof req.query.status === 'string') filter.status = req.query.status;
      if (typeof req.query.referenceCode === 'string') filter.referenceCode = { $regex: req.query.referenceCode.trim(), $options: 'i' };

      if (!this.isPrivileged(req.user?.role) && !isSuperAdminRole(req.user?.role)) {
        filter.createdBy = this.getUserId(req);
      }

      const [rows, total] = await Promise.all([
        Credit.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Credit.countDocuments(filter),
      ]);

      ResponseHandler.success(
        res,
        rows.map((item) => withUiStatus(item as unknown as AnyRecord)),
        'Credits retrieved',
        200,
        { pagination: pagination(page, limit, total) }
      );
    } catch (error) {
      next(error);
    }
  }

  async createCredit(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = this.getUserId(req);
      const organizationId = this.resolveOrgId(req);

      const credit = await Credit.create({
        organization: organizationId,
        createdBy: actorId,
        applicantId: req.body.applicantId,
        applicantName: req.body.applicantName,
        amountRequested: Number(req.body.amountRequested),
        currency: req.body.currency || 'UGX',
        purpose: req.body.purpose,
        termMonths: req.body.termMonths !== undefined ? Number(req.body.termMonths) : undefined,
        interestRate: req.body.interestRate !== undefined ? Number(req.body.interestRate) : undefined,
        status: (req.body.status as CreditStatus | undefined) || 'applied',
        notes: req.body.notes,
        metadata: req.body.metadata || {},
      });

      ResponseHandler.created(res, withUiStatus(credit as unknown as AnyRecord), 'Credit application created');
    } catch (error) {
      next(error);
    }
  }

  async getCredit(req: Request, res: Response, next: NextFunction) {
    try {
      const credit = await Credit.findOne({ _id: req.params.creditId, isActive: true });
      if (!credit) throw new AppError('Credit not found', 404, 'NOT_FOUND');

      this.assertAccess(req, credit.createdBy.toString(), credit.organization?.toString());
      ResponseHandler.success(res, withUiStatus(credit as unknown as AnyRecord), 'Credit retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateCredit(req: Request, res: Response, next: NextFunction) {
    try {
      const credit = await Credit.findOne({ _id: req.params.creditId, isActive: true });
      if (!credit) throw new AppError('Credit not found', 404, 'NOT_FOUND');

      this.assertAccess(req, credit.createdBy.toString(), credit.organization?.toString());

      if (typeof req.body.status === 'string') {
        const nextStatus = req.body.status as CreditStatus;
        this.assertTransition(credit.status, nextStatus, CREDIT_TRANSITIONS, 'credit status');
        credit.status = nextStatus;
      }

      if (req.body.applicantName !== undefined) credit.applicantName = req.body.applicantName;
      if (req.body.applicantId !== undefined) credit.applicantId = req.body.applicantId;
      if (req.body.amountRequested !== undefined) credit.amountRequested = Number(req.body.amountRequested);
      if (req.body.amountApproved !== undefined) credit.amountApproved = Number(req.body.amountApproved);
      if (req.body.currency !== undefined) credit.currency = req.body.currency;
      if (req.body.purpose !== undefined) credit.purpose = req.body.purpose;
      if (req.body.termMonths !== undefined) credit.termMonths = Number(req.body.termMonths);
      if (req.body.interestRate !== undefined) credit.interestRate = Number(req.body.interestRate);
      if (req.body.notes !== undefined) credit.notes = req.body.notes;
      if (req.body.metadata !== undefined) credit.metadata = req.body.metadata;
      if (req.body.rejectionReason !== undefined) credit.rejectionReason = req.body.rejectionReason;

      await credit.save();
      ResponseHandler.success(res, withUiStatus(credit as unknown as AnyRecord), 'Credit updated');
    } catch (error) {
      next(error);
    }
  }

  async deleteCredit(req: Request, res: Response, next: NextFunction) {
    try {
      const credit = await Credit.findOne({ _id: req.params.creditId, isActive: true });
      if (!credit) throw new AppError('Credit not found', 404, 'NOT_FOUND');

      this.assertAccess(req, credit.createdBy.toString(), credit.organization?.toString());
      credit.isActive = false;
      await credit.save();

      ResponseHandler.success(res, null, 'Credit deleted');
    } catch (error) {
      next(error);
    }
  }

  async approveCredit(req: Request, res: Response, next: NextFunction) {
    try {
      const credit = await Credit.findOne({ _id: req.params.creditId, isActive: true });
      if (!credit) throw new AppError('Credit not found', 404, 'NOT_FOUND');

      this.assertAccess(req, credit.createdBy.toString(), credit.organization?.toString());
      this.assertTransition(credit.status, 'approved', CREDIT_TRANSITIONS, 'credit status');

      credit.status = 'approved';
      credit.amountApproved = req.body.amountApproved !== undefined
        ? Number(req.body.amountApproved)
        : credit.amountRequested;
      credit.reviewedBy = this.getUserId(req) as any;
      credit.reviewedAt = new Date();

      await credit.save();
      ResponseHandler.success(res, withUiStatus(credit as unknown as AnyRecord), 'Credit approved');
    } catch (error) {
      next(error);
    }
  }

  async rejectCredit(req: Request, res: Response, next: NextFunction) {
    try {
      const credit = await Credit.findOne({ _id: req.params.creditId, isActive: true });
      if (!credit) throw new AppError('Credit not found', 404, 'NOT_FOUND');

      this.assertAccess(req, credit.createdBy.toString(), credit.organization?.toString());
      this.assertTransition(credit.status, 'rejected', CREDIT_TRANSITIONS, 'credit status');

      credit.status = 'rejected';
      credit.rejectionReason = req.body.reason || req.body.rejectionReason || 'Rejected';
      credit.reviewedBy = this.getUserId(req) as any;
      credit.reviewedAt = new Date();

      await credit.save();
      ResponseHandler.success(res, withUiStatus(credit as unknown as AnyRecord), 'Credit rejected');
    } catch (error) {
      next(error);
    }
  }

  async disburseCredit(req: Request, res: Response, next: NextFunction) {
    try {
      const credit = await Credit.findOne({ _id: req.params.creditId, isActive: true });
      if (!credit) throw new AppError('Credit not found', 404, 'NOT_FOUND');

      this.assertAccess(req, credit.createdBy.toString(), credit.organization?.toString());
      this.assertTransition(credit.status, 'disbursed', CREDIT_TRANSITIONS, 'credit status');

      credit.status = 'disbursed';
      credit.disbursedAt = new Date();
      if (!credit.amountApproved) {
        credit.amountApproved = credit.amountRequested;
      }

      await credit.save();
      ResponseHandler.success(res, withUiStatus(credit as unknown as AnyRecord), 'Credit disbursed');
    } catch (error) {
      next(error);
    }
  }

  async listInsurancePolicies(req: Request, res: Response, next: NextFunction) {
    try {
      const page = toInt(req.query.page, 1, 10000);
      const limit = toInt(req.query.limit, 20, 100);
      const skip = (page - 1) * limit;
      const organizationId = this.resolveOrgId(req);
      const filter: Record<string, unknown> = { isActive: true };

      if (organizationId) filter.organization = organizationId;
      if (typeof req.query.status === 'string') filter.status = req.query.status;
      if (typeof req.query.policyNumber === 'string') filter.policyNumber = { $regex: req.query.policyNumber.trim(), $options: 'i' };

      if (!this.isPrivileged(req.user?.role) && !isSuperAdminRole(req.user?.role)) {
        filter.createdBy = this.getUserId(req);
      }

      const [rows, total] = await Promise.all([
        InsurancePolicy.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        InsurancePolicy.countDocuments(filter),
      ]);

      ResponseHandler.success(
        res,
        rows.map((item) => withUiStatus(item as unknown as AnyRecord)),
        'Insurance policies retrieved',
        200,
        { pagination: pagination(page, limit, total) }
      );
    } catch (error) {
      next(error);
    }
  }

  async createInsurancePolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = this.getUserId(req);
      const organizationId = this.resolveOrgId(req);

      const policy = await InsurancePolicy.create({
        organization: organizationId,
        createdBy: actorId,
        insuredEntityId: req.body.insuredEntityId,
        insuredEntityName: req.body.insuredEntityName,
        providerName: req.body.providerName,
        coverageType: req.body.coverageType,
        premiumAmount: Number(req.body.premiumAmount),
        coverageAmount: Number(req.body.coverageAmount),
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        status: (req.body.status as InsurancePolicyStatus | undefined) || 'active',
        notes: req.body.notes,
        metadata: req.body.metadata || {},
      });

      ResponseHandler.created(res, withUiStatus(policy as unknown as AnyRecord), 'Insurance policy created');
    } catch (error) {
      next(error);
    }
  }

  async getInsurancePolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const policy = await InsurancePolicy.findOne({ _id: req.params.policyId, isActive: true });
      if (!policy) throw new AppError('Insurance policy not found', 404, 'NOT_FOUND');

      this.assertAccess(req, policy.createdBy.toString(), policy.organization?.toString());
      ResponseHandler.success(res, withUiStatus(policy as unknown as AnyRecord), 'Insurance policy retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateInsurancePolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const policy = await InsurancePolicy.findOne({ _id: req.params.policyId, isActive: true });
      if (!policy) throw new AppError('Insurance policy not found', 404, 'NOT_FOUND');

      this.assertAccess(req, policy.createdBy.toString(), policy.organization?.toString());

      if (typeof req.body.status === 'string') {
        const nextStatus = req.body.status as InsurancePolicyStatus;
        this.assertTransition(policy.status, nextStatus, POLICY_TRANSITIONS, 'insurance policy status');
        policy.status = nextStatus;
      }

      if (req.body.insuredEntityId !== undefined) policy.insuredEntityId = req.body.insuredEntityId;
      if (req.body.insuredEntityName !== undefined) policy.insuredEntityName = req.body.insuredEntityName;
      if (req.body.providerName !== undefined) policy.providerName = req.body.providerName;
      if (req.body.coverageType !== undefined) policy.coverageType = req.body.coverageType;
      if (req.body.premiumAmount !== undefined) policy.premiumAmount = Number(req.body.premiumAmount);
      if (req.body.coverageAmount !== undefined) policy.coverageAmount = Number(req.body.coverageAmount);
      if (req.body.startDate !== undefined) policy.startDate = new Date(req.body.startDate);
      if (req.body.endDate !== undefined) policy.endDate = new Date(req.body.endDate);
      if (req.body.notes !== undefined) policy.notes = req.body.notes;
      if (req.body.metadata !== undefined) policy.metadata = req.body.metadata;

      await policy.save();
      ResponseHandler.success(res, withUiStatus(policy as unknown as AnyRecord), 'Insurance policy updated');
    } catch (error) {
      next(error);
    }
  }

  async deleteInsurancePolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const policy = await InsurancePolicy.findOne({ _id: req.params.policyId, isActive: true });
      if (!policy) throw new AppError('Insurance policy not found', 404, 'NOT_FOUND');

      this.assertAccess(req, policy.createdBy.toString(), policy.organization?.toString());
      policy.isActive = false;
      await policy.save();

      ResponseHandler.success(res, null, 'Insurance policy deleted');
    } catch (error) {
      next(error);
    }
  }

  async createInsuranceClaim(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = this.getUserId(req);
      const policy = await InsurancePolicy.findOne({ _id: req.params.policyId, isActive: true });
      if (!policy) throw new AppError('Insurance policy not found', 404, 'NOT_FOUND');

      this.assertAccess(req, policy.createdBy.toString(), policy.organization?.toString());

      const claim = await InsuranceClaim.create({
        policyId: policy._id,
        organization: policy.organization,
        createdBy: actorId,
        amountClaimed: Number(req.body.amountClaimed),
        reason: req.body.reason,
        status: (req.body.status as InsuranceClaimStatus | undefined) || 'open',
        metadata: req.body.metadata || {},
      });

      if (policy.status !== 'claim_open') {
        this.assertTransition(policy.status, 'claim_open', POLICY_TRANSITIONS, 'insurance policy status');
        policy.status = 'claim_open';
        await policy.save();
      }

      ResponseHandler.created(res, withUiStatus(claim as unknown as AnyRecord), 'Insurance claim created');
    } catch (error) {
      next(error);
    }
  }

  async updateInsuranceClaim(req: Request, res: Response, next: NextFunction) {
    try {
      const claim = await InsuranceClaim.findOne({ _id: req.params.claimId, isActive: true });
      if (!claim) throw new AppError('Insurance claim not found', 404, 'NOT_FOUND');

      const policy = await InsurancePolicy.findOne({ _id: claim.policyId, isActive: true });
      if (!policy) throw new AppError('Insurance policy not found', 404, 'NOT_FOUND');

      this.assertAccess(req, policy.createdBy.toString(), policy.organization?.toString());

      if (typeof req.body.status === 'string') {
        const nextStatus = req.body.status as InsuranceClaimStatus;
        this.assertTransition(claim.status, nextStatus, CLAIM_TRANSITIONS, 'insurance claim status');
        claim.status = nextStatus;

        if (nextStatus === 'under_review') {
          claim.reviewedBy = this.getUserId(req) as any;
        }

        if (nextStatus === 'resolved' || nextStatus === 'rejected') {
          claim.reviewedBy = this.getUserId(req) as any;
          claim.resolvedAt = new Date();

          if (policy.status !== 'claim_resolved') {
            this.assertTransition(policy.status, 'claim_resolved', POLICY_TRANSITIONS, 'insurance policy status');
            policy.status = 'claim_resolved';
          }
        } else if (nextStatus === 'open' || nextStatus === 'under_review') {
          if (policy.status !== 'claim_open') {
            if ((POLICY_TRANSITIONS[policy.status] || []).includes('claim_open')) {
              policy.status = 'claim_open';
            }
          }
        }
      }

      if (req.body.amountApproved !== undefined) claim.amountApproved = Number(req.body.amountApproved);
      if (req.body.resolutionNote !== undefined) claim.resolutionNote = req.body.resolutionNote;
      if (req.body.reason !== undefined) claim.reason = req.body.reason;
      if (req.body.metadata !== undefined) claim.metadata = req.body.metadata;

      await claim.save();
      await policy.save();

      ResponseHandler.success(
        res,
        {
          claim: withUiStatus(claim as unknown as AnyRecord),
          policy: withUiStatus(policy as unknown as AnyRecord),
        },
        'Insurance claim updated'
      );
    } catch (error) {
      next(error);
    }
  }
}

export default new FinanceController();
