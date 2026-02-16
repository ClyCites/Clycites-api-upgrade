import { Request, Response, NextFunction } from 'express';
import AuditService from './audit.service';
import { successResponse } from '../../common/utils/response';

class AuditController {
  /**
   * Get user audit logs
   */
  async getUserLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const logs = await AuditService.getUserLogs(req.user!.id, {
        limit: parseInt(req.query.limit as string) || 50,
        skip: parseInt(req.query.skip as string) || 0,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        action: req.query.action as string,
        resource: req.query.resource as string,
      });

      return successResponse(res, logs);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get organization audit logs
   */
  async getOrganizationLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const logs = await AuditService.getOrganizationLogs(req.params.organizationId, {
        limit: parseInt(req.query.limit as string) || 50,
        skip: parseInt(req.query.skip as string) || 0,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        action: req.query.action as string,
        resource: req.query.resource as string,
        userId: req.query.userId as string,
      });

      return successResponse(res, logs);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get resource audit logs
   */
  async getResourceLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const logs = await AuditService.getResourceLogs(
        req.params.resource,
        req.params.resourceId,
        {
          limit: parseInt(req.query.limit as string) || 50,
          skip: parseInt(req.query.skip as string) || 0,
        }
      );

      return successResponse(res, logs);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get suspicious activities
   */
  async getSuspiciousActivities(req: Request, res: Response, next: NextFunction) {
    try {
      const logs = await AuditService.getSuspiciousActivities({
        userId: req.query.userId as string,
        organizationId: req.query.organizationId as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        limit: parseInt(req.query.limit as string) || 100,
      });

      return successResponse(res, logs);
    } catch (error) {
      return next(error);
    }
  }
}

export default new AuditController();
