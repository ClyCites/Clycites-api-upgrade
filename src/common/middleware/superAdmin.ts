import { NextFunction, Request, Response } from 'express';
import { BadRequestError, ForbiddenError, UnauthorizedError } from '../errors/AppError';

export const SUPER_ADMIN_ROLES = ['super_admin'] as const;
export const SUPER_ADMIN_MODE_HEADER = 'x-super-admin-mode';
export const SUPER_ADMIN_REASON_HEADER = 'x-super-admin-reason';

const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);

export const isSuperAdminRole = (role?: string): boolean => {
  if (!role) {
    return false;
  }

  return SUPER_ADMIN_ROLES.includes(role as (typeof SUPER_ADMIN_ROLES)[number]);
};

export const isImpersonating = (req: Request): boolean => {
  return Boolean(req.user?.impersonatedBy || req.user?.impersonationSessionId);
};

export const isSuperAdminUser = (req: Request): boolean => {
  return isSuperAdminRole(req.user?.role);
};

export const isSuperAdminModeRequested = (req: Request): boolean => {
  const modeHeader = req.headers[SUPER_ADMIN_MODE_HEADER];
  if (typeof modeHeader !== 'string') {
    return false;
  }

  return TRUTHY_VALUES.has(modeHeader.toLowerCase().trim());
};

export const getSuperAdminReason = (req: Request): string | undefined => {
  const reasonHeader = req.headers[SUPER_ADMIN_REASON_HEADER];
  if (typeof reasonHeader !== 'string') {
    return undefined;
  }

  const reason = reasonHeader.trim();
  return reason.length > 0 ? reason : undefined;
};

export const assertSuperAdminMode = (req: Request): { active: boolean; reason?: string } => {
  if (!isSuperAdminModeRequested(req)) {
    return { active: false };
  }

  if (!isSuperAdminUser(req)) {
    throw new ForbiddenError('Super Admin mode is only available to Super Admin users');
  }

  const reason = getSuperAdminReason(req);
  if (!reason) {
    throw new BadRequestError('X-Super-Admin-Reason is required when X-Super-Admin-Mode is enabled');
  }

  return { active: true, reason };
};

export const hasRequiredSuperAdminScope = (req: Request, requiredScope: string): boolean => {
  const user = req.user;
  if (!user || !isSuperAdminRole(user.role)) {
    return false;
  }

  const scopes = user.superAdminScopes || [];
  return scopes.includes('*') || scopes.includes('super_admin:all') || scopes.includes(requiredScope);
};

export const canBypassAuthorization = (
  req: Request,
  requiredScopes: string[] = []
): boolean => {
  const { active } = assertSuperAdminMode(req);
  if (!active || isImpersonating(req)) {
    return false;
  }

  if (requiredScopes.length === 0) {
    return true;
  }

  return requiredScopes.some((scope) => hasRequiredSuperAdminScope(req, scope));
};

export const requireSuperAdmin = (requiredScopes: string[] = []) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      if (!isSuperAdminRole(req.user.role)) {
        throw new ForbiddenError('Super Admin access required');
      }

      const { active } = assertSuperAdminMode(req);
      if (!active) {
        throw new BadRequestError(
          'X-Super-Admin-Mode and X-Super-Admin-Reason are required for Super Admin actions'
        );
      }

      if (requiredScopes.length > 0) {
        const hasScope = requiredScopes.some((scope) => hasRequiredSuperAdminScope(req, scope));
        if (!hasScope) {
          throw new ForbiddenError('Insufficient Super Admin scope for this action');
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
