import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError';
import { canBypassAuthorization, isSuperAdminRole } from './superAdmin';

type AuthorizedUser = {
  id: string;
  role: string;
  permissions: string[];
};

const getAuthorizedUser = (req: Request): AuthorizedUser => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const id = typeof req.user.id === 'string' ? req.user.id : '';
  const role = typeof req.user.role === 'string' ? req.user.role : '';
  const permissions = Array.isArray(req.user.permissions)
    ? req.user.permissions.filter((permission): permission is string => typeof permission === 'string')
    : [];

  if (!id || !role) {
    throw new UnauthorizedError('Authentication required');
  }

  return { id, role, permissions };
};

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
      const user = getAuthorizedUser(req);

      if (canBypassAuthorization(req, ['super_admin:rbac:override'])) {
        return next();
      }

      if (!roleMatched(roles, user.role)) {
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
      const user = getAuthorizedUser(req);

      if (canBypassAuthorization(req, ['super_admin:rbac:override'])) {
        return next();
      }

      const hasPermission = permissions.some(permission =>
        user.permissions.includes(permission)
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
      const user = getAuthorizedUser(req);

      if (canBypassAuthorization(req, ['super_admin:ownership:override'])) {
        return next();
      }

      // Allow platform-level admins to access any resource
      if (user.role === 'admin' || isSuperAdminRole(user.role)) {
        return next();
      }

      const resourceUserId = req.body[resourceField] || req.params[resourceField];
      if (resourceUserId && resourceUserId !== user.id) {
        return next(new ForbiddenError('You can only access your own resources'));
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};
