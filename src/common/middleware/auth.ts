import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError';
import DeviceService from '../../modules/security/device.service';
import MFAService from '../../modules/security/mfa.service';
import AuditService from '../../modules/audit/audit.service';
import { getClientIp } from './rateLimiter';
import SuperAdminGrant from '../../modules/auth/superAdminGrant.model';
import ImpersonationSession from '../../modules/auth/impersonationSession.model';
import ApiTokenService from '../../modules/auth/apiToken.service';
import { ApiTokenType, IApiTokenRateLimit } from '../../modules/auth/apiToken.model';

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  authType?: 'jwt' | 'api_token';
  farmerId?: string;
  permissions?: string[];
  deviceId?: string;
  tokenId?: string;
  tokenType?: ApiTokenType;
  tokenScopes?: string[];
  orgId?: string;
  apiTokenRateLimit?: IApiTokenRateLimit;
  mfaVerified?: boolean;
  superAdminGrantId?: string;
  superAdminScopes?: string[];
  impersonationSessionId?: string;
  impersonatedBy?: string;
  impersonationReason?: string;
  impersonationExpiresAt?: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
  device?: any;
  requestId?: string;
  apiToken?: {
    id: string;
    tokenId: string;
    tokenType: ApiTokenType;
    tokenPrefix: string;
    scopes: string[];
    orgId?: string;
    rateLimit: IApiTokenRateLimit;
  };
  impersonation?: {
    sessionId: string;
    actorId: string;
    reason: string;
    expiresAt?: string;
  };
  superAdminGrant?: {
    grantId: string;
    scopes: string[];
    expiresAt: string;
  };
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload;
    device?: any;
    requestId?: string;
    apiToken?: {
      id: string;
      tokenId: string;
      tokenType: ApiTokenType;
      tokenPrefix: string;
      scopes: string[];
      orgId?: string;
      rateLimit: IApiTokenRateLimit;
    };
    impersonation?: {
      sessionId: string;
      actorId: string;
      reason: string;
      expiresAt?: string;
    };
    superAdminGrant?: {
      grantId: string;
      scopes: string[];
      expiresAt: string;
    };
  }
}

const isJwtLikeToken = (token: string): boolean => token.split('.').length === 3;

const getBearerToken = (req: Request): string | undefined => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return undefined;
  }

  return authHeader.substring(7);
};

const validateSuperAdminGrant = async (decoded: JwtPayload, req: Request): Promise<void> => {
  if (!decoded.superAdminGrantId) {
    return;
  }

  const grant = await SuperAdminGrant.findOne({
    grantId: decoded.superAdminGrantId,
    isActive: true,
  });

  if (!grant || grant.revokedAt || grant.expiresAt <= new Date()) {
    throw new UnauthorizedError('Super Admin token is revoked or expired');
  }

  const actorId = decoded.impersonatedBy || decoded.id;
  if (grant.actorUser.toString() !== actorId) {
    throw new UnauthorizedError('Super Admin token does not match the authenticated actor');
  }

  decoded.superAdminScopes = grant.scopes;
  req.superAdminGrant = {
    grantId: grant.grantId,
    scopes: grant.scopes,
    expiresAt: grant.expiresAt.toISOString(),
  };
};

const validateImpersonationSession = async (decoded: JwtPayload, req: Request): Promise<void> => {
  if (!decoded.impersonationSessionId) {
    return;
  }

  const session = await ImpersonationSession.findOne({
    sessionId: decoded.impersonationSessionId,
    isActive: true,
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    throw new UnauthorizedError('Impersonation session is revoked or expired');
  }

  if (session.targetUser.toString() !== decoded.id) {
    throw new UnauthorizedError('Invalid impersonation token target');
  }

  const actorId = session.actorUser.toString();
  decoded.impersonatedBy = actorId;
  decoded.impersonationReason = session.reason;
  decoded.impersonationExpiresAt = session.expiresAt.toISOString();

  req.impersonation = {
    sessionId: session.sessionId,
    actorId,
    reason: session.reason,
    expiresAt: session.expiresAt.toISOString(),
  };
};

const decodeAndValidateToken = async (token: string, req: Request): Promise<JwtPayload> => {
  const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

  await validateImpersonationSession(decoded, req);
  await validateSuperAdminGrant(decoded, req);
  decoded.authType = 'jwt';

  return decoded;
};

const authenticateApiToken = async (token: string, req: Request): Promise<JwtPayload> => {
  const context = ApiTokenService.getRequestContext(req);
  const authenticated = await ApiTokenService.authenticateApiToken({
    rawToken: token,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  ApiTokenService.enforceOrgBoundary(authenticated.identity, {
    headers: req.headers as Record<string, unknown>,
    body: req.body,
    params: req.params as Record<string, unknown>,
  });
  ApiTokenService.enforceTokenScopes(
    authenticated.identity.tokenScopes,
    req.method,
    req.originalUrl
  );

  req.apiToken = {
    id: authenticated.token._id.toString(),
    tokenId: authenticated.token.tokenId,
    tokenType: authenticated.token.tokenType,
    tokenPrefix: authenticated.token.tokenPrefix,
    scopes: authenticated.identity.tokenScopes,
    orgId: authenticated.identity.orgId,
    rateLimit: authenticated.token.rateLimit,
  };

  return {
    id: authenticated.identity.id,
    email: authenticated.identity.email,
    role: authenticated.identity.role,
    authType: 'api_token',
    permissions: authenticated.identity.permissions,
    tokenId: authenticated.identity.tokenId,
    tokenType: authenticated.identity.tokenType,
    tokenScopes: authenticated.identity.tokenScopes,
    orgId: authenticated.identity.orgId,
    apiTokenRateLimit: authenticated.token.rateLimit,
    superAdminScopes: authenticated.identity.superAdminScopes,
  };
};

const resolveAuthenticatedIdentity = async (token: string, req: Request): Promise<JwtPayload> => {
  if (isJwtLikeToken(token)) {
    try {
      return await decodeAndValidateToken(token, req);
    } catch (error) {
      if (
        error instanceof jwt.JsonWebTokenError ||
        error instanceof jwt.TokenExpiredError ||
        error instanceof UnauthorizedError
      ) {
        // Fall through to API token authentication if JWT validation fails.
      } else {
        throw error;
      }
    }
  }

  return authenticateApiToken(token, req);
};

const trackDeviceActivity = async (req: Request, userId: string): Promise<void> => {
  try {
    const deviceInfo = {
      userAgent: req.headers['user-agent'] || 'unknown',
      ipAddress: getClientIp(req),
    };

    const device = await DeviceService.registerDevice(userId, deviceInfo);
    req.device = device;
    device.lastActiveAt = new Date();
    await device.save();
  } catch (deviceError) {
    // Device tracking is non-blocking.
    console.error('Device tracking error:', deviceError);
  }
};

/**
 * Main authentication middleware with device tracking
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const decoded = await resolveAuthenticatedIdentity(token, req);
    req.user = decoded;

    if (decoded.authType !== 'api_token') {
      await trackDeviceActivity(req, decoded.id);
    }

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
};

/**
 * Optional authentication (doesn't fail if no token)
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = getBearerToken(req);
    if (token) {
      const decoded = await resolveAuthenticatedIdentity(token, req);
      req.user = decoded;
      if (decoded.authType !== 'api_token') {
        await trackDeviceActivity(req, decoded.id);
      }
    }

    next();
  } catch (error) {
    // Continue without authentication when token is invalid or absent
    next();
  }
};

/**
 * Require MFA verification middleware
 */
export const requireMFA = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (req.user.authType === 'api_token') {
      throw new ForbiddenError('MFA verification is only available for session-based authentication');
    }

    // Check if MFA is verified in token
    if (req.user.mfaVerified) {
      return next();
    }

    // Check if MFA is required
    const organizationId = req.headers['x-organization-id'] as string;
    const mfaRequired = await MFAService.isMFARequired(req.user.id, organizationId);

    if (!mfaRequired) {
      return next();
    }

    // Check if device is trusted (can skip MFA)
    if (req.device?.isTrusted) {
      return next();
    }

    throw new UnauthorizedError('MFA verification required');
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to detect and handle suspicious activity
 */
export const detectSuspiciousActivity = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next();
    }

    const deviceInfo = {
      userAgent: req.headers['user-agent'] || 'unknown',
      ipAddress: getClientIp(req),
    };

    // Detect suspicious patterns
    const flags = await DeviceService.detectSuspiciousActivity(
      req.user.id,
      deviceInfo
    );

    if (flags.length > 0) {
      // Log suspicious activity
      await AuditService.log({
        action: 'auth.suspicious_activity',
        resource: 'user',
        userId: req.user.id,
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent,
        details: {
          metadata: { flags },
        },
        risk: 'high',
        isSuspicious: true,
        securityFlags: flags,
      });

      // If critical flags, require additional verification
      const criticalFlags = ['blocked_device', 'excessive_failed_logins'];
      const hasCriticalFlag = flags.some(f => criticalFlags.includes(f));

      if (hasCriticalFlag) {
        throw new UnauthorizedError('Additional verification required due to suspicious activity');
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
