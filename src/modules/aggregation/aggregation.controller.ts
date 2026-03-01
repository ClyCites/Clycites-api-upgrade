import mongoose from 'mongoose';
import { NextFunction, Response } from 'express';
import { AuthRequest } from '../../common/middleware/auth';
import { isSuperAdminRole } from '../../common/middleware/superAdmin';
import { BadRequestError, ForbiddenError } from '../../common/errors/AppError';
import { ResponseHandler } from '../../common/utils/response';
import AggregationService, {
  StockMovementStatus,
} from './aggregation.service';
import {
  AggregationBatchStatus,
} from './batch.model';
import {
  QualityGradeStatus,
} from './qualityGrade.model';
import {
  SpoilageReportStatus,
} from './spoilageReport.model';
import {
  StorageBinStatus,
} from './storageBin.model';

class AggregationController {
  private toObjectId(value: string, fieldName: string): mongoose.Types.ObjectId {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new BadRequestError(`${fieldName} must be a valid MongoDB ObjectId`);
    }

    return new mongoose.Types.ObjectId(value);
  }

  private getActor(req: AuthRequest): {
    userId: mongoose.Types.ObjectId;
    role?: string;
    orgId?: string;
  } {
    if (!req.user?.id) {
      throw new BadRequestError('Authentication context is missing user id');
    }

    return {
      userId: this.toObjectId(req.user.id, 'userId'),
      role: req.user.role,
      orgId: req.user.orgId,
    };
  }

  private parsePagination(req: AuthRequest): { page: number; limit: number } {
    const pageValue = Number(req.query.page ?? 1);
    const limitValue = Number(req.query.limit ?? 20);

    return {
      page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1,
      limit: Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 20,
    };
  }

  private getRequestedOrganizationId(req: AuthRequest): string | undefined {
    const headerOrg = typeof req.headers['x-organization-id'] === 'string'
      ? req.headers['x-organization-id'].trim()
      : undefined;
    const queryOrg = typeof req.query.organizationId === 'string'
      ? req.query.organizationId.trim()
      : undefined;
    const bodyOrg = req.body && typeof req.body.organizationId === 'string'
      ? req.body.organizationId.trim()
      : undefined;

    return queryOrg || bodyOrg || headerOrg;
  }

  private resolveOrganizationId(req: AuthRequest): mongoose.Types.ObjectId {
    const requestedOrg = this.getRequestedOrganizationId(req);
    const actorOrg = req.user?.orgId;

    if (isSuperAdminRole(req.user?.role)) {
      const resolved = requestedOrg || actorOrg;
      if (!resolved) {
        throw new BadRequestError('organizationId is required for super admin aggregation requests');
      }
      return this.toObjectId(resolved, 'organizationId');
    }

    if (actorOrg) {
      if (requestedOrg && requestedOrg !== actorOrg) {
        throw new ForbiddenError('Cannot access aggregation resources outside your organization');
      }
      return this.toObjectId(actorOrg, 'organizationId');
    }

    throw new ForbiddenError('Organization context is required for aggregation requests');
  }

  listStorageBins = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const warehouseId = this.toObjectId(req.params.warehouseId, 'warehouseId');
      const organizationId = this.resolveOrganizationId(req);
      const { page, limit } = this.parsePagination(req);

      const result = await AggregationService.listStorageBins(
        warehouseId,
        organizationId,
        actor,
        {
          page,
          limit,
          status: req.query.status as StorageBinStatus | undefined,
          search: typeof req.query.search === 'string' ? req.query.search : undefined,
        }
      );

      ResponseHandler.success(
        res,
        result.data,
        'Storage bins retrieved successfully',
        200,
        {
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages,
          },
        }
      );
    } catch (error) {
      next(error);
    }
  };

  createStorageBin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const warehouseId = this.toObjectId(req.params.warehouseId, 'warehouseId');
      const organizationId = this.resolveOrganizationId(req);

      const bin = await AggregationService.createStorageBin(
        warehouseId,
        organizationId,
        actor,
        req.body
      );

      ResponseHandler.created(res, bin, 'Storage bin created successfully');
    } catch (error) {
      next(error);
    }
  };

  getStorageBin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const binId = this.toObjectId(req.params.binId, 'binId');
      const bin = await AggregationService.getStorageBin(binId, actor);

      ResponseHandler.success(res, bin, 'Storage bin retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  updateStorageBin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const binId = this.toObjectId(req.params.binId, 'binId');
      const bin = await AggregationService.updateStorageBin(binId, actor, req.body);

      ResponseHandler.success(res, bin, 'Storage bin updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteStorageBin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const binId = this.toObjectId(req.params.binId, 'binId');
      await AggregationService.deleteStorageBin(binId, actor);

      ResponseHandler.success(res, null, 'Storage bin deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  listBatches = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const organizationId = this.resolveOrganizationId(req);
      const { page, limit } = this.parsePagination(req);

      const result = await AggregationService.listBatches(
        organizationId,
        actor,
        {
          page,
          limit,
          status: req.query.status as AggregationBatchStatus | undefined,
          commodity: typeof req.query.commodity === 'string' ? req.query.commodity : undefined,
          warehouseId: typeof req.query.warehouseId === 'string' ? req.query.warehouseId : undefined,
          binId: typeof req.query.binId === 'string' ? req.query.binId : undefined,
        }
      );

      ResponseHandler.success(
        res,
        result.data,
        'Batches retrieved successfully',
        200,
        {
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages,
          },
        }
      );
    } catch (error) {
      next(error);
    }
  };

  createBatch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const organizationId = this.resolveOrganizationId(req);
      const batch = await AggregationService.createBatch(organizationId, actor, req.body);

      ResponseHandler.created(res, batch, 'Batch created successfully');
    } catch (error) {
      next(error);
    }
  };

  getBatch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const batchId = this.toObjectId(req.params.batchId, 'batchId');
      const batch = await AggregationService.getBatch(batchId, actor);

      ResponseHandler.success(res, batch, 'Batch retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  updateBatch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const batchId = this.toObjectId(req.params.batchId, 'batchId');
      const batch = await AggregationService.updateBatch(batchId, actor, req.body);

      ResponseHandler.success(res, batch, 'Batch updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteBatch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const batchId = this.toObjectId(req.params.batchId, 'batchId');
      await AggregationService.deleteBatch(batchId, actor);

      ResponseHandler.success(res, null, 'Batch deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  listQualityGrades = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const organizationId = this.resolveOrganizationId(req);
      const { page, limit } = this.parsePagination(req);

      const result = await AggregationService.listQualityGrades(
        organizationId,
        actor,
        {
          page,
          limit,
          batchId: typeof req.query.batchId === 'string' ? req.query.batchId : undefined,
          status: req.query.status as QualityGradeStatus | undefined,
          grade: typeof req.query.grade === 'string' ? req.query.grade : undefined,
        }
      );

      ResponseHandler.success(
        res,
        result.data,
        'Quality grades retrieved successfully',
        200,
        {
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages,
          },
        }
      );
    } catch (error) {
      next(error);
    }
  };

  createQualityGrade = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const organizationId = this.resolveOrganizationId(req);
      const grade = await AggregationService.createQualityGrade(organizationId, actor, req.body);

      ResponseHandler.created(res, grade, 'Quality grade created successfully');
    } catch (error) {
      next(error);
    }
  };

  getQualityGrade = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const gradeId = this.toObjectId(req.params.gradeId, 'gradeId');
      const grade = await AggregationService.getQualityGrade(gradeId, actor);

      ResponseHandler.success(res, grade, 'Quality grade retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  updateQualityGrade = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const gradeId = this.toObjectId(req.params.gradeId, 'gradeId');
      const grade = await AggregationService.updateQualityGrade(gradeId, actor, req.body);

      ResponseHandler.success(res, grade, 'Quality grade updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteQualityGrade = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const gradeId = this.toObjectId(req.params.gradeId, 'gradeId');
      await AggregationService.deleteQualityGrade(gradeId, actor);

      ResponseHandler.success(res, null, 'Quality grade deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  getStockMovement = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const movementId = this.toObjectId(req.params.movementId, 'movementId');
      const movement = await AggregationService.getStockMovement(movementId, actor);

      ResponseHandler.success(res, movement, 'Stock movement retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  updateStockMovement = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const movementId = this.toObjectId(req.params.movementId, 'movementId');
      const movement = await AggregationService.updateStockMovement(movementId, actor, {
        status: req.body.status as StockMovementStatus | undefined,
        note: req.body.note,
        location: req.body.location,
        quantity: req.body.quantity,
      });

      ResponseHandler.success(res, movement, 'Stock movement updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteStockMovement = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const movementId = this.toObjectId(req.params.movementId, 'movementId');
      await AggregationService.deleteStockMovement(movementId, actor);

      ResponseHandler.success(res, null, 'Stock movement deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  listSpoilageReports = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const organizationId = this.resolveOrganizationId(req);
      const { page, limit } = this.parsePagination(req);

      const result = await AggregationService.listSpoilageReports(
        organizationId,
        actor,
        {
          page,
          limit,
          batchId: typeof req.query.batchId === 'string' ? req.query.batchId : undefined,
          status: req.query.status as SpoilageReportStatus | undefined,
        }
      );

      ResponseHandler.success(
        res,
        result.data,
        'Spoilage reports retrieved successfully',
        200,
        {
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages,
          },
        }
      );
    } catch (error) {
      next(error);
    }
  };

  createSpoilageReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const organizationId = this.resolveOrganizationId(req);
      const report = await AggregationService.createSpoilageReport(organizationId, actor, req.body);

      ResponseHandler.created(res, report, 'Spoilage report created successfully');
    } catch (error) {
      next(error);
    }
  };

  getSpoilageReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const reportId = this.toObjectId(req.params.reportId, 'reportId');
      const report = await AggregationService.getSpoilageReport(reportId, actor);

      ResponseHandler.success(res, report, 'Spoilage report retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  updateSpoilageReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const reportId = this.toObjectId(req.params.reportId, 'reportId');
      const report = await AggregationService.updateSpoilageReport(reportId, actor, req.body);

      ResponseHandler.success(res, report, 'Spoilage report updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteSpoilageReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const reportId = this.toObjectId(req.params.reportId, 'reportId');
      await AggregationService.deleteSpoilageReport(reportId, actor);

      ResponseHandler.success(res, null, 'Spoilage report deleted successfully');
    } catch (error) {
      next(error);
    }
  };
}

export default new AggregationController();
