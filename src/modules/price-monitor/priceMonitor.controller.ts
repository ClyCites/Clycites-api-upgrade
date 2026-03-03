import { Request, Response, NextFunction } from 'express';
import PriceMonitorService from './priceMonitor.service';
import { ResponseHandler } from '../../common/utils/response';
import { AppError, ForbiddenError } from '../../common/errors/AppError';
import { isSuperAdminRole } from '../../common/middleware/superAdmin';
import PriceEstimation, { PriceEstimationStatus } from './priceEstimation.model';

type AnyRecord = Record<string, unknown>;

const ESTIMATION_STATUS_TRANSITIONS: Record<PriceEstimationStatus, PriceEstimationStatus[]> = {
  draft: ['draft', 'submitted', 'approved'],
  submitted: ['submitted', 'approved'],
  approved: ['approved'],
};

const toPositiveInt = (value: unknown, fallback: number, max?: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  if (typeof max === 'number') return Math.min(parsed, max);
  return parsed;
};

const toOrgId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toPlainObject = <T>(value: T): T => {
  if (value && typeof (value as { toObject?: () => T }).toObject === 'function') {
    return (value as { toObject: () => T }).toObject();
  }
  return value;
};

const withUiStatus = <T extends AnyRecord>(entity: T): T & { uiStatus: unknown } => {
  const plain = toPlainObject(entity);
  return {
    ...plain,
    uiStatus: plain.status,
  };
};

export class PriceMonitorController {
  private priceMonitorService: PriceMonitorService;

  constructor() {
    this.priceMonitorService = new PriceMonitorService();
  }

  private getUserId(req: Request): string {
    const userId = req.user?.id;
    if (!userId || typeof userId !== 'string') {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }
    return userId;
  }

  private isPrivileged(role?: string): boolean {
    return role === 'admin' || role === 'platform_admin' || role === 'trader' || isSuperAdminRole(role);
  }

  private resolveOrgId(req: Request): string | undefined {
    const fromQuery = toOrgId(req.query.organizationId);
    const fromHeader = toOrgId(req.headers['x-organization-id']);
    const fromBody = typeof req.body === 'object' && req.body
      ? toOrgId((req.body as AnyRecord).organizationId)
      : undefined;
    const requested = fromQuery || fromBody || fromHeader;
    const actorOrg = toOrgId(req.user?.orgId);

    if (isSuperAdminRole(req.user?.role)) {
      return requested || actorOrg;
    }

    if (actorOrg) {
      if (requested && requested !== actorOrg) {
        throw new ForbiddenError('Cannot access pricing resources outside your organization context');
      }
      return actorOrg;
    }

    return requested;
  }

  private assertAccess(req: Request, ownerId: string, organizationId?: string): void {
    if (isSuperAdminRole(req.user?.role)) return;

    const actorId = this.getUserId(req);
    const actorOrg = toOrgId(req.user?.orgId);

    if (this.isPrivileged(req.user?.role)) {
      if (organizationId && actorOrg && organizationId !== actorOrg) {
        throw new ForbiddenError('Cannot access pricing resources outside your organization context');
      }
      return;
    }

    if (ownerId !== actorId) {
      throw new ForbiddenError('You can only access your own pricing resources');
    }

    if (organizationId && actorOrg && organizationId !== actorOrg) {
      throw new ForbiddenError('Cannot access pricing resources outside your organization context');
    }
  }

  private assertTransition(currentStatus: PriceEstimationStatus, nextStatus: PriceEstimationStatus): void {
    if (!(ESTIMATION_STATUS_TRANSITIONS[currentStatus] || []).includes(nextStatus)) {
      throw new AppError(
        `Invalid estimation status transition: ${currentStatus} -> ${nextStatus}`,
        400,
        'BAD_REQUEST'
      );
    }
  }

  predict = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceMonitorService.predictPrice(req.body);
      ResponseHandler.success(res, result, 'Price prediction completed');
    } catch (error) {
      next(error);
    }
  };

  train = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceMonitorService.trainModel();
      ResponseHandler.success(res, result, 'Model training triggered');
    } catch (error) {
      next(error);
    }
  };

  listEstimations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = toPositiveInt(req.query.page, 1, 10000);
      const limit = toPositiveInt(req.query.limit, 20, 100);
      const skip = (page - 1) * limit;
      const organizationId = this.resolveOrgId(req);
      const filter: Record<string, unknown> = { isActive: true };

      if (organizationId) filter.organization = organizationId;
      if (typeof req.query.status === 'string') filter.status = req.query.status;
      if (typeof req.query.productId === 'string') filter.productId = req.query.productId;
      if (typeof req.query.marketId === 'string') filter.marketId = req.query.marketId;

      if (!this.isPrivileged(req.user?.role) && !isSuperAdminRole(req.user?.role)) {
        filter.createdBy = this.getUserId(req);
      }

      const [rows, total] = await Promise.all([
        PriceEstimation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        PriceEstimation.countDocuments(filter),
      ]);

      ResponseHandler.success(
        res,
        rows.map((item) => withUiStatus(item as unknown as AnyRecord)),
        'Price estimations retrieved',
        200,
        {
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
          },
        }
      );
    } catch (error) {
      next(error);
    }
  };

  createEstimation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = this.getUserId(req);
      const organizationId = this.resolveOrgId(req);
      const status = (req.body.status as PriceEstimationStatus | undefined) || 'draft';

      if (!['draft', 'submitted', 'approved'].includes(status)) {
        throw new AppError('status must be one of draft, submitted, approved', 400, 'BAD_REQUEST');
      }

      const estimation = await PriceEstimation.create({
        organization: organizationId,
        createdBy: actorId,
        productId: req.body.productId,
        marketId: req.body.marketId,
        estimatedPrice: Number(req.body.estimatedPrice),
        currency: req.body.currency || 'UGX',
        basis: req.body.basis,
        confidence: req.body.confidence !== undefined ? Number(req.body.confidence) : undefined,
        status,
        submittedAt: status === 'submitted' ? new Date() : undefined,
        approvedAt: status === 'approved' ? new Date() : undefined,
        approvedBy: status === 'approved' ? actorId : undefined,
        notes: req.body.notes,
        metadata: req.body.metadata || {},
        isActive: true,
      });

      ResponseHandler.created(res, withUiStatus(estimation as unknown as AnyRecord), 'Price estimation created');
    } catch (error) {
      next(error);
    }
  };

  getEstimation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const estimation = await PriceEstimation.findOne({ _id: req.params.estimationId, isActive: true });
      if (!estimation) {
        throw new AppError('Price estimation not found', 404, 'NOT_FOUND');
      }

      this.assertAccess(req, estimation.createdBy.toString(), estimation.organization?.toString());
      ResponseHandler.success(res, withUiStatus(estimation as unknown as AnyRecord), 'Price estimation retrieved');
    } catch (error) {
      next(error);
    }
  };

  updateEstimation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const estimation = await PriceEstimation.findOne({ _id: req.params.estimationId, isActive: true });
      if (!estimation) {
        throw new AppError('Price estimation not found', 404, 'NOT_FOUND');
      }

      this.assertAccess(req, estimation.createdBy.toString(), estimation.organization?.toString());

      if (typeof req.body.status === 'string') {
        const nextStatus = req.body.status as PriceEstimationStatus;
        if (!['draft', 'submitted', 'approved'].includes(nextStatus)) {
          throw new AppError('status must be one of draft, submitted, approved', 400, 'BAD_REQUEST');
        }
        this.assertTransition(estimation.status, nextStatus);
        estimation.status = nextStatus;
        if (nextStatus === 'submitted' && !estimation.submittedAt) estimation.submittedAt = new Date();
        if (nextStatus === 'approved' && !estimation.approvedAt) {
          estimation.approvedAt = new Date();
          estimation.approvedBy = this.getUserId(req);
        }
      }

      if (req.body.estimatedPrice !== undefined) estimation.estimatedPrice = Number(req.body.estimatedPrice);
      if (req.body.currency !== undefined) estimation.currency = req.body.currency;
      if (req.body.basis !== undefined) estimation.basis = req.body.basis;
      if (req.body.confidence !== undefined) estimation.confidence = Number(req.body.confidence);
      if (req.body.notes !== undefined) estimation.notes = req.body.notes;
      if (req.body.metadata !== undefined) estimation.metadata = req.body.metadata;

      await estimation.save();
      ResponseHandler.success(res, withUiStatus(estimation as unknown as AnyRecord), 'Price estimation updated');
    } catch (error) {
      next(error);
    }
  };

  deleteEstimation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const estimation = await PriceEstimation.findOne({ _id: req.params.estimationId, isActive: true });
      if (!estimation) {
        throw new AppError('Price estimation not found', 404, 'NOT_FOUND');
      }

      this.assertAccess(req, estimation.createdBy.toString(), estimation.organization?.toString());
      estimation.isActive = false;
      await estimation.save();
      ResponseHandler.success(res, null, 'Price estimation deleted');
    } catch (error) {
      next(error);
    }
  };
}

export default new PriceMonitorController();
