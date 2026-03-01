import { NextFunction, Request, Response } from 'express';
import PlatformControlService from './platformControl.service';
import { BadRequestError } from '../../common/errors/AppError';
import { ResponseHandler } from '../../common/utils/response';

class PlatformControlController {
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
}

export default new PlatformControlController();

