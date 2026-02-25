import { NextFunction, Request, Response } from 'express';
import userService, {
  AdminListUsersOptions,
  AdminUpdateUserPayload,
  AdminUpdateUserStatusPayload,
} from './user.service';
import { ResponseHandler } from '../../common/utils/response';
import { UnauthorizedError } from '../../common/errors/AppError';

class UserController {
  listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const options: AdminListUsersOptions = {
        page: this.toNumber(req.query.page),
        limit: this.toNumber(req.query.limit),
        search: this.toString(req.query.search),
        role: this.toString(req.query.role) as AdminListUsersOptions['role'],
        isActive: this.toBoolean(req.query.isActive),
        isEmailVerified: this.toBoolean(req.query.isEmailVerified),
        requiresIdentityVerification: this.toBoolean(req.query.requiresIdentityVerification),
        includeDeleted: this.toBoolean(req.query.includeDeleted),
        sortBy: this.toString(req.query.sortBy),
        sortOrder: this.toString(req.query.sortOrder) as AdminListUsersOptions['sortOrder'],
      };

      const result = await userService.listUsers(options);

      ResponseHandler.paginated(
        res,
        result.data,
        result.pagination,
        'Users retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const includeDeleted = this.toBoolean(req.query.includeDeleted) || false;
      const user = await userService.getUserByIdForAdmin(req.params.id, includeDeleted);
      ResponseHandler.success(res, user, 'User retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  updateUserByAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actorId = this.getActorId(req);
      const payload = req.body as AdminUpdateUserPayload;
      const user = await userService.updateUserByAdmin(req.params.id, payload, actorId);
      ResponseHandler.success(res, user, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  };

  updateUserStatusByAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actorId = this.getActorId(req);
      const payload = req.body as AdminUpdateUserStatusPayload;
      const user = await userService.updateUserStatusByAdmin(req.params.id, payload, actorId);
      ResponseHandler.success(res, user, 'User status updated successfully');
    } catch (error) {
      next(error);
    }
  };

  unlockUserByAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actorId = this.getActorId(req);
      const user = await userService.unlockUserByAdmin(req.params.id, actorId);
      ResponseHandler.success(res, user, 'User account unlocked successfully');
    } catch (error) {
      next(error);
    }
  };

  softDeleteUserByAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actorId = this.getActorId(req);
      const reason = this.toString(req.body?.reason);
      await userService.softDeleteUserByAdmin(req.params.id, actorId, reason);
      ResponseHandler.success(res, null, 'User deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  restoreUserByAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actorId = this.getActorId(req);
      const user = await userService.restoreUserByAdmin(req.params.id, actorId);
      ResponseHandler.success(res, user, 'User restored successfully');
    } catch (error) {
      next(error);
    }
  };

  private getActorId(req: Request): string {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    return req.user.id;
  }

  private toString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private toNumber(value: unknown): number | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  private toBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value !== 'string') {
      return undefined;
    }

    if (value.toLowerCase() === 'true') {
      return true;
    }

    if (value.toLowerCase() === 'false') {
      return false;
    }

    return undefined;
  }
}

export default new UserController();
