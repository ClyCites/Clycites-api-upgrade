import mongoose from 'mongoose';
import Dispute from './dispute.model';
import Order from './order.model';
import {
  IDisputeDocument,
  DisputeStatus,
  ResolutionType,
  MediatorType,
  ICreateDisputeInput,
  ISubmitEvidenceInput,
  IResolveDisputeInput,
} from './dispute.types';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../common/errors/AppError';
import { PaginationUtil } from '../../common/utils/pagination';
import logger from '../../common/utils/logger';

class DisputeService {
  // ── Timeline helper ──────────────────────────────────────────────────────────

  private async addTimelineEntry(
    dispute: IDisputeDocument,
    status: DisputeStatus,
    userId: string,
    note?: string
  ): Promise<void> {
    dispute.timeline.push({
      status,
      changedBy: new mongoose.Types.ObjectId(userId),
      changedAt: new Date(),
      note,
    } as any);
    dispute.status = status;
  }

  // ── Create dispute ───────────────────────────────────────────────────────────

  async createDispute(input: ICreateDisputeInput, userId: string): Promise<IDisputeDocument> {
    const { orderId, reason, description, mediaFiles } = input;

    const order = await Order.findById(orderId).lean();
    if (!order) throw new NotFoundError('Order not found');

    // Buyer can only raise dispute on their own order
    if (order.buyer.toString() !== userId) {
      throw new ForbiddenError('Only the buyer can raise a dispute on this order');
    }

    // Check no existing open dispute
    const existing = await Dispute.findOne({ orderId, status: { $ne: DisputeStatus.CLOSED } });
    if (existing) {
      throw new BadRequestError(`An active dispute already exists for this order (${existing.disputeNumber})`);
    }

    // Enforce dispute window
    if (order.disputeWindowExpiresAt && new Date() > order.disputeWindowExpiresAt) {
      throw new BadRequestError(
        'The 48-hour dispute window for this order has closed. Contact support if this is urgent.'
      );
    }

    // Status must allow disputes
    const disputableStatuses = ['delivered', 'completed'];
    if (!disputableStatuses.includes(order.status as string)) {
      throw new BadRequestError(
        `Disputes can only be raised on delivered or completed orders. Current status: ${order.status}`
      );
    }

    const evidenceDeadline = new Date();
    evidenceDeadline.setHours(evidenceDeadline.getHours() + 72); // 72h to submit evidence

    const dispute = await Dispute.create({
      orderId: new mongoose.Types.ObjectId(orderId),
      raisedBy: new mongoose.Types.ObjectId(userId),
      respondent: order.farmer,
      reason,
      description,
      status: DisputeStatus.OPEN,
      evidenceDeadline,
      timeline: [
        {
          status:    DisputeStatus.OPEN,
          changedBy: new mongoose.Types.ObjectId(userId),
          changedAt: new Date(),
          note:      'Dispute opened by buyer',
        },
      ],
      evidence: mediaFiles?.length
        ? [
            {
              submittedBy:  new mongoose.Types.ObjectId(userId),
              description:  'Initial evidence submitted with dispute',
              mediaFiles:   mediaFiles.map((id) => new mongoose.Types.ObjectId(id)),
              submittedAt:  new Date(),
            },
          ]
        : [],
    });

    // Link dispute to order
    await Order.findByIdAndUpdate(orderId, { disputeId: dispute._id });

    logger.info(`Dispute ${dispute.disputeNumber} created for order ${orderId}`);
    return dispute;
  }

  // ── Submit evidence ──────────────────────────────────────────────────────────

  async submitEvidence(disputeId: string, userId: string, input: ISubmitEvidenceInput): Promise<IDisputeDocument> {
    const dispute = await Dispute.findById(disputeId);
    if (!dispute) throw new NotFoundError('Dispute not found');

    const isParticipant =
      dispute.raisedBy.toString() === userId ||
      dispute.respondent.toString() === userId;
    if (!isParticipant) throw new ForbiddenError('Only dispute participants can submit evidence');

    if ([DisputeStatus.RESOLVED, DisputeStatus.CLOSED].includes(dispute.status)) {
      throw new BadRequestError('Cannot submit evidence on a closed dispute');
    }

    if (dispute.evidenceDeadline && new Date() > dispute.evidenceDeadline) {
      throw new BadRequestError('The evidence submission deadline has passed');
    }

    dispute.evidence.push({
      submittedBy:  new mongoose.Types.ObjectId(userId),
      description:  input.description,
      mediaFiles:   (input.mediaFiles ?? []).map((id) => new mongoose.Types.ObjectId(id)),
      submittedAt:  new Date(),
    } as any);

    // Auto-transition to awaiting_evidence if still open
    if (dispute.status === DisputeStatus.OPEN) {
      await this.addTimelineEntry(dispute, DisputeStatus.AWAITING_EVIDENCE, userId, 'Evidence submitted');
    }

    await dispute.save();
    return dispute;
  }

  // ── Move to under review ─────────────────────────────────────────────────────

  async reviewDispute(disputeId: string, adminId: string, note?: string): Promise<IDisputeDocument> {
    const dispute = await this.findAndCheckAdmin(disputeId);

    if (dispute.status !== DisputeStatus.OPEN && dispute.status !== DisputeStatus.AWAITING_EVIDENCE) {
      throw new BadRequestError(`Cannot move to review from status: ${dispute.status}`);
    }

    await this.addTimelineEntry(dispute, DisputeStatus.UNDER_REVIEW, adminId, note ?? 'Under review by platform team');
    await dispute.save();
    return dispute;
  }

  // ── Assign mediator ──────────────────────────────────────────────────────────

  async assignMediator(
    disputeId:    string,
    mediatorId:   string,
    mediatorType: MediatorType,
    adminId:      string
  ): Promise<IDisputeDocument> {
    const dispute = await this.findAndCheckAdmin(disputeId);

    if ([DisputeStatus.RESOLVED, DisputeStatus.CLOSED].includes(dispute.status)) {
      throw new BadRequestError('Cannot assign mediator to a closed dispute');
    }

    dispute.mediator     = new mongoose.Types.ObjectId(mediatorId) as any;
    dispute.mediatorType = mediatorType;

    await this.addTimelineEntry(
      dispute,
      DisputeStatus.IN_MEDIATION,
      adminId,
      `Mediator assigned (${mediatorType})`
    );
    await dispute.save();
    return dispute;
  }

  // ── Resolve dispute ──────────────────────────────────────────────────────────

  async resolveDispute(
    disputeId: string,
    input:     IResolveDisputeInput,
    resolverId: string
  ): Promise<IDisputeDocument> {
    const dispute = await Dispute.findById(disputeId);
    if (!dispute) throw new NotFoundError('Dispute not found');

    if ([DisputeStatus.RESOLVED, DisputeStatus.CLOSED].includes(dispute.status)) {
      throw new BadRequestError('Dispute is already resolved or closed');
    }

    if (input.type === ResolutionType.ESCALATE_TO_ADMIN) {
      return this.escalateDispute(disputeId, input.note ?? '', resolverId);
    }

    const mediatorType = dispute.mediatorType ?? MediatorType.PLATFORM_ADMIN;

    dispute.resolution = {
      type:         input.type,
      resolvedBy:   new mongoose.Types.ObjectId(resolverId),
      resolvedAt:   new Date(),
      refundAmount: input.refundAmount,
      note:         input.note ?? 'Dispute resolved',
      mediatorType,
    } as any;

    await this.addTimelineEntry(
      dispute,
      DisputeStatus.RESOLVED,
      resolverId,
      `${input.type}: ${input.note ?? ''}`
    );
    dispute.closedAt = new Date();

    // Reflect on order
    const orderUpdateFields: Record<string, unknown> = {};
    if ([ResolutionType.FULL_REFUND, ResolutionType.CANCEL_NO_CHARGE].includes(input.type)) {
      orderUpdateFields['status'] = 'cancelled';
    } else if (input.type === ResolutionType.DISMISS) {
      orderUpdateFields['status'] = 'completed';
    }
    if (Object.keys(orderUpdateFields).length) {
      await Order.findByIdAndUpdate(dispute.orderId, orderUpdateFields);
    }

    await dispute.save();
    logger.info(`Dispute ${dispute.disputeNumber} resolved: ${input.type}`);
    return dispute;
  }

  // ── Escalate dispute ─────────────────────────────────────────────────────────

  async escalateDispute(disputeId: string, note: string, adminId: string): Promise<IDisputeDocument> {
    const dispute = await this.findAndCheckAdmin(disputeId);

    if ([DisputeStatus.RESOLVED, DisputeStatus.CLOSED].includes(dispute.status)) {
      throw new BadRequestError('Dispute is already resolved or closed');
    }

    await this.addTimelineEntry(dispute, DisputeStatus.ESCALATED, adminId, note || 'Escalated to senior review');
    await dispute.save();
    return dispute;
  }

  // ── Close dispute ────────────────────────────────────────────────────────────

  async closeDispute(disputeId: string, note: string, adminId: string): Promise<IDisputeDocument> {
    const dispute = await this.findAndCheckAdmin(disputeId);

    await this.addTimelineEntry(dispute, DisputeStatus.CLOSED, adminId, note || 'Closed by administrator');
    dispute.closedAt = new Date();
    await dispute.save();
    return dispute;
  }

  // ── Read operations ──────────────────────────────────────────────────────────

  async getDisputeById(disputeId: string, userId: string, userRole: string): Promise<IDisputeDocument> {
    const dispute = await Dispute.findById(disputeId)
      .populate('raisedBy', '-password')
      .populate('respondent', '-password')
      .populate('mediator', '-password')
      .populate('orderId');

    if (!dispute) throw new NotFoundError('Dispute not found');

    const isAdmin    = ['platform_admin', 'super_admin', 'admin'].includes(userRole);
    const isInvolved =
      dispute.raisedBy._id.toString() === userId ||
      dispute.respondent._id.toString() === userId ||
      (dispute.mediator && dispute.mediator._id.toString() === userId);

    if (!isAdmin && !isInvolved) {
      throw new ForbiddenError('Access denied to this dispute');
    }

    return dispute;
  }

  async getMyDisputes(userId: string, query: any) {
    const { page, limit, sortBy, sortOrder } = PaginationUtil.getPaginationParams(query);
    const skip  = PaginationUtil.getSkip(page, limit);
    const sort  = PaginationUtil.getSortObject(sortBy, sortOrder);

    const filter: Record<string, unknown> = {
      $or: [{ raisedBy: userId }, { respondent: userId }],
    };
    if (query.status) filter['status'] = query.status;
    if (query.reason) filter['reason'] = query.reason;

    const [disputes, total] = await Promise.all([
      Dispute.find(filter)
        .populate('raisedBy', '-password')
        .populate('respondent', '-password')
        .populate('orderId')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Dispute.countDocuments(filter),
    ]);

    return PaginationUtil.buildPaginationResult(disputes, total, page, limit);
  }

  async getAdminDisputes(query: any) {
    const { page, limit, sortBy, sortOrder } = PaginationUtil.getPaginationParams(query);
    const skip  = PaginationUtil.getSkip(page, limit);
    const sort  = PaginationUtil.getSortObject(sortBy, sortOrder);

    const filter: Record<string, unknown> = {};
    if (query.status) filter['status']  = query.status;
    if (query.reason) filter['reason']  = query.reason;
    if (query.orderId) filter['orderId'] = query.orderId;

    const [disputes, total] = await Promise.all([
      Dispute.find(filter)
        .populate('raisedBy', '-password')
        .populate('respondent', '-password')
        .populate('mediator', '-password')
        .populate('orderId')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Dispute.countDocuments(filter),
    ]);

    return PaginationUtil.buildPaginationResult(disputes, total, page, limit);
  }

  async getDisputeStats() {
    const [byStatus, byReason, avgResolutionMs] = await Promise.all([
      Dispute.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { status: '$_id', count: 1, _id: 0 } },
      ]),
      Dispute.aggregate([
        { $group: { _id: '$reason', count: { $sum: 1 } } },
        { $project: { reason: '$_id', count: 1, _id: 0 } },
      ]),
      Dispute.aggregate([
        { $match: { status: DisputeStatus.RESOLVED, closedAt: { $exists: true } } },
        {
          $project: {
            resolutionMs: { $subtract: ['$closedAt', '$createdAt'] },
          },
        },
        { $group: { _id: null, avg: { $avg: '$resolutionMs' } } },
      ]),
    ]);

    const avgDays = avgResolutionMs[0]
      ? Math.round(avgResolutionMs[0].avg / 1000 / 60 / 60 / 24)
      : null;

    return { byStatus, byReason, avgResolutionDays: avgDays };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async findAndCheckAdmin(disputeId: string): Promise<IDisputeDocument> {
    const dispute = await Dispute.findById(disputeId);
    if (!dispute) throw new NotFoundError('Dispute not found');
    return dispute;
  }
}

export const disputeService = new DisputeService();
export default disputeService;
