import { Request, Response, NextFunction } from 'express';
import AuthorizationService from '../../modules/permissions/authorization.service';
import { ForbiddenError } from '../errors/AppError';

/**
 * Middleware to check if user has required permission
 */
export const requirePermission = (
  resource: string,
  action: string,
  scope: 'global' | 'organization' | 'own' = 'organization'
) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const organizationId = req.headers['x-organization-id'] as string;
      
      // Get owner ID from request params or body if checking 'own' scope
      let ownerId: string | undefined;
      if (scope === 'own') {
        ownerId = req.params.userId || req.body.userId || req.user.id;
      }

      await AuthorizationService.requirePermission({
        userId: req.user.id,
        organizationId,
        resource,
        action,
        scope,
        ownerId,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user has any of the required permissions
 */
export const requireAnyPermission = (permissions: Array<{
  resource: string;
  action: string;
  scope?: 'global' | 'organization' | 'own';
}>) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const organizationId = req.headers['x-organization-id'] as string;

      // Check if user has any of the permissions
      for (const perm of permissions) {
        const hasPermission = await AuthorizationService.hasPermission({
          userId: req.user.id,
          organizationId,
          resource: perm.resource,
          action: perm.action,
          scope: perm.scope || 'organization',
        });

        if (hasPermission) {
          return next();
        }
      }

      throw new ForbiddenError('Insufficient permissions');
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user is organization admin
 */
export const requireOrganizationAdmin = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ForbiddenError('Authentication required');
    }

    const organizationId = req.params.organizationId || req.headers['x-organization-id'] as string;

    if (!organizationId) {
      throw new ForbiddenError('Organization ID required');
    }

    const isAdmin = await AuthorizationService.isOrganizationAdmin(
      req.user.id,
      organizationId
    );

    if (!isAdmin) {
      throw new ForbiddenError('Organization admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if user is organization owner
 */
export const requireOrganizationOwner = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ForbiddenError('Authentication required');
    }

    const organizationId = req.params.organizationId || req.headers['x-organization-id'] as string;

    if (!organizationId) {
      throw new ForbiddenError('Organization ID required');
    }

    const isOwner = await AuthorizationService.isOrganizationOwner(
      req.user.id,
      organizationId
    );

    if (!isOwner) {
      throw new ForbiddenError('Organization owner access required');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to load user's role in organization
 */
export const loadOrganizationRole = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next();
    }

    const organizationId = req.headers['x-organization-id'] as string;

    if (organizationId) {
      const role = await AuthorizationService.getUserRole(
        req.user.id,
        organizationId
      );

      // Attach role to request
      (req as any).organizationRole = role;
    }

    next();
  } catch (error) {
    next(error);
  }
};
