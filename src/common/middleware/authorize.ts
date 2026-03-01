import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError';
import { canBypassAuthorization, isSuperAdminRole } from './superAdmin';

const roleMatched = (requiredRoles: string[], actualRole: string): boolean => {
  if (requiredRoles.includes(actualRole)) {
    return true;
  }

  if (!isSuperAdminRole(actualRole)) {
    return false;
  }

  return (
    requiredRoles.includes('super_admin') ||
    requiredRoles.includes('platform_admin') ||
    requiredRoles.includes('admin')
  );
};

export const authorize = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required'));
      }

      if (canBypassAuthorization(req, ['super_admin:rbac:override'])) {
        return next();
      }

      if (!roleMatched(roles, req.user.role)) {
        return next(
          new ForbiddenError(`Access denied. Required roles: ${roles.join(', ')}`)
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

export const checkPermission = (...permissions: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required'));
      }

      if (canBypassAuthorization(req, ['super_admin:rbac:override'])) {
        return next();
      }

      const userPermissions = req.user.permissions || [];
      const hasPermission = permissions.some(permission =>
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        return next(
          new ForbiddenError(`Access denied. Required permissions: ${permissions.join(', ')}`)
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

export const checkOwnership = (resourceField = 'userId') => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required'));
      }

      if (canBypassAuthorization(req, ['super_admin:ownership:override'])) {
        return next();
      }

      // Allow platform-level admins to access any resource
      if (req.user.role === 'admin' || isSuperAdminRole(req.user.role)) {
        return next();
      }

      const resourceUserId = req.body[resourceField] || req.params[resourceField];
      if (resourceUserId && resourceUserId !== req.user.id) {
        return next(new ForbiddenError('You can only access your own resources'));
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};
