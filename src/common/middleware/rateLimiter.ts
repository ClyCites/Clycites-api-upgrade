import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
// import RedisStore from 'rate-limit-redis'; // Uncomment when Redis is configured
import { Request, Response } from 'express';
import config from '../config';
import SecurityEvent from '../../modules/security/securityEvent.model';

// Helper to get client IP
const getClientIp = (req: Request): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    '0.0.0.0'
  );
};

// Helper to log rate limit violation
const logRateLimitViolation = async (req: Request) => {
  try {
    await SecurityEvent.create({
      user: req.user?.id,
      type: 'system',
      category: 'rate_limit_exceeded',
      severity: 'warning',
      title: 'Rate Limit Exceeded',
      description: `IP ${getClientIp(req)} exceeded rate limit on ${req.path}`,
      context: {
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        endpoint: req.path,
        method: req.method,
      },
      riskScore: 30,
      isSuspicious: false,
      isBlocked: true,
      responseStatus: 'open',
      timestamp: new Date(),
    });
  } catch (error) {
    // Silent fail - don't break rate limiting if logging fails
  }
};

// General API rate limiter
export const apiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Rate limit per user if authenticated, otherwise per IP
    return req.user?.id || getClientIp(req);
  },
  handler: async (req: Request, res: Response) => {
    await logRateLimitViolation(req);
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please try again later',
      },
    });
  },
});

// Strict limiter for authentication routes (brute force protection)
export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_AUTH_ATTEMPTS',
      message: 'Too many authentication attempts, please try again later',
    },
  },
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) => {
    // Rate limit per IP for auth endpoints
    const email = req.body.email || '';
    return `auth:${getClientIp(req)}:${email}`;
  },
  handler: async (req: Request, res: Response) => {
    await logRateLimitViolation(req);
    
    // Create high-severity security event for auth brute force
    try {
      await SecurityEvent.create({
        type: 'auth',
        category: 'brute_force_detected',
        severity: 'error',
        title: 'Brute Force Attack Detected',
        description: `Multiple failed authentication attempts from IP ${getClientIp(req)}`,
        context: {
          ipAddress: getClientIp(req),
          userAgent: req.headers['user-agent'] || 'unknown',
          endpoint: req.path,
          method: req.method,
        },
        riskScore: 75,
        isSuspicious: true,
        isBlocked: true,
        responseStatus: 'open',
        timestamp: new Date(),
      });
    } catch (error) {
      // Silent fail - don't break rate limiting if logging fails
    }

    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_AUTH_ATTEMPTS',
        message: 'Too many authentication attempts. Your account has been temporarily locked for security reasons.',
      },
    });
  },
});

// IP-based rate limiter (stricter limits per IP)
export const ipLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per IP
  keyGenerator: (req: Request) => `ip:${getClientIp(req)}`,
  message: {
    success: false,
    error: {
      code: 'IP_RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP address',
    },
  },
  handler: async (req: Request, res: Response) => {
    await logRateLimitViolation(req);
    res.status(429).json({
      success: false,
      error: {
        code: 'IP_RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP address. Please try again later.',
      },
    });
  },
});

// Limiter for creating resources
export const createLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many creation requests, please try again later',
    },
  },
  keyGenerator: (req: Request) => {
    return req.user?.id || getClientIp(req);
  },
});

// Limiter for sensitive operations
export const sensitiveLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Only 10 sensitive operations per hour
  message: {
    success: false,
    error: {
      code: 'SENSITIVE_OPERATION_LIMIT',
      message: 'Too many sensitive operations. Please try again later.',
    },
  },
  keyGenerator: (req: Request) => {
    return `sensitive:${req.user?.id || getClientIp(req)}`;
  },
  handler: async (req: Request, res: Response) => {
    await logRateLimitViolation(req);

    // Log as high-risk event
    try {
      await SecurityEvent.create({
        user: req.user?.id,
        type: 'system',
        category: 'excessive_sensitive_operations',
        severity: 'error',
        title: 'Excessive Sensitive Operations',
        description: `User exceeded limit for sensitive operations`,
        context: {
          ipAddress: getClientIp(req),
          userAgent: req.headers['user-agent'] || 'unknown',
          endpoint: req.path,
          method: req.method,
        },
        riskScore: 70,
        isSuspicious: true,
        isBlocked: true,
        responseStatus: 'open',
        timestamp: new Date(),
      });
    } catch (error) {
      // Silent fail
    }

    res.status(429).json({
      success: false,
      error: {
        code: 'SENSITIVE_OPERATION_LIMIT',
        message: 'Too many sensitive operations. Please try again later.',
      },
    });
  },
});

// Export IP getter for use in other modules
export { getClientIp };

