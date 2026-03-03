import { NextFunction, Request, Response } from 'express';
import PlatformControlService from './platformControl.service';
import { BadRequestError } from '../../common/errors/AppError';
import { ResponseHandler } from '../../common/utils/response';

class PlatformControlController {
  private normalizeWorkspaceId(value: string): string {
    return value.trim().toLowerCase();
  }

  getMaintenance = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const state = await PlatformControlService.getMaintenanceState();
      ResponseHandler.success(res, state, 'Maintenance state retrieved');
    } catch (error) {
      next(error);
    }
  };

  updateMaintenance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = req.user?.id;
      if (!actorId) {
        throw new BadRequestError('User ID not found');
      }

      const { enabled, message, reason } = req.body;
      if (typeof enabled !== 'boolean') {
        throw new BadRequestError('enabled must be a boolean');
      }

      const state = await PlatformControlService.setMaintenanceState({
        actorId,
        enabled,
        message,
        reason,
        requestId: req.requestId,
      });

      ResponseHandler.success(res, state, 'Maintenance state updated');
    } catch (error) {
      next(error);
    }
  };

  getFeatureFlags = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const flags = await PlatformControlService.getFeatureFlags();
      ResponseHandler.success(res, flags, 'Feature flags retrieved');
    } catch (error) {
      next(error);
    }
  };

  updateFeatureFlags = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = req.user?.id;
      if (!actorId) {
        throw new BadRequestError('User ID not found');
      }

      const { flags, reason } = req.body;
      if (!flags || typeof flags !== 'object' || Array.isArray(flags)) {
        throw new BadRequestError('flags must be an object with boolean values');
      }

      const updated = await PlatformControlService.setFeatureFlags({
        actorId,
        reason,
        flags,
        requestId: req.requestId,
      });

      ResponseHandler.success(res, updated, 'Feature flags updated');
    } catch (error) {
      next(error);
    }
  };

  getWorkspaceFeatureFlag = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workspaceId = this.normalizeWorkspaceId(req.params.workspaceId || '');
      if (!workspaceId) {
        throw new BadRequestError('workspaceId is required');
      }

      const flags = await PlatformControlService.getFeatureFlags();
      const enabled = Boolean(flags[workspaceId]);

      ResponseHandler.success(
        res,
        {
          workspaceId,
          enabled,
          status: enabled ? 'enabled' : 'disabled',
          uiStatus: enabled ? 'enabled' : 'disabled',
        },
        'Workspace feature flag retrieved'
      );
    } catch (error) {
      next(error);
    }
  };

  updateWorkspaceFeatureFlag = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = req.user?.id;
      if (!actorId) {
        throw new BadRequestError('User ID not found');
      }

      const workspaceId = this.normalizeWorkspaceId(req.params.workspaceId || '');
      if (!workspaceId) {
        throw new BadRequestError('workspaceId is required');
      }

      if (typeof req.body.enabled !== 'boolean') {
        throw new BadRequestError('enabled must be a boolean');
      }

      if (typeof req.body.reason !== 'string' || req.body.reason.trim().length < 3) {
        throw new BadRequestError('reason must be at least 3 characters');
      }

      const currentFlags = await PlatformControlService.getFeatureFlags();
      const updatedFlags = {
        ...currentFlags,
        [workspaceId]: req.body.enabled,
      };

      await PlatformControlService.setFeatureFlags({
        actorId,
        reason: req.body.reason,
        flags: updatedFlags,
        requestId: req.requestId,
      });

      ResponseHandler.success(
        res,
        {
          workspaceId,
          enabled: req.body.enabled,
          status: req.body.enabled ? 'enabled' : 'disabled',
          uiStatus: req.body.enabled ? 'enabled' : 'disabled',
        },
        'Workspace feature flag updated'
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new PlatformControlController();
