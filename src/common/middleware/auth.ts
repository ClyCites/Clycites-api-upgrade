import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { UnauthorizedError } from '../errors/AppError';
import DeviceService from '../../modules/security/device.service';
import MFAService from '../../modules/security/mfa.service';
import AuditService from '../../modules/audit/audit.service';
import { getClientIp } from './rateLimiter';

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  farmerId?: string;
  permissions?: string[];
  deviceId?: string;
  mfaVerified?: boolean;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
  device?: any;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload;
    device?: any;
  }
}

/**
 * Main authentication middleware with device tracking
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // Attach user to request
    req.user = decoded;

    // Track device activity
    try {
      const deviceInfo = {
        userAgent: req.headers['user-agent'] || 'unknown',
        ipAddress: getClientIp(req),
      };

      const device = await DeviceService.registerDevice(decoded.id, deviceInfo);
      req.device = device;

      // Update device activity
      device.lastActiveAt = new Date();
      await device.save();
    } catch (deviceError) {
      console.error('Device tracking error:', deviceError);
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
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      req.user = decoded;

      // Track device if authenticated
      try {
        const deviceInfo = {
          userAgent: req.headers['user-agent'] || 'unknown',
          ipAddress: getClientIp(req),
        };
        req.device = await DeviceService.registerDevice(decoded.id, deviceInfo);
      } catch {
        // Ignore device tracking errors for optional auth
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
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
