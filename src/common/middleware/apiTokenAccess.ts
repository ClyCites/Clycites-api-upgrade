import { NextFunction, Request, Response } from 'express';
import ApiTokenService from '../../modules/auth/apiToken.service';
import ApiToken from '../../modules/auth/apiToken.model';
import { getClientIp } from './rateLimiter';

export const apiTokenAccessLogger = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    if (!req.user || req.user.authType !== 'api_token' || !req.apiToken) {
      return;
    }

    const userAgentHeader = req.headers['user-agent'];
    const userAgent = typeof userAgentHeader === 'string' ? userAgentHeader : undefined;

    void ApiToken.findById(req.apiToken.id)
      .then((token) => {
        if (!token) {
          return;
        }

        return ApiTokenService.recordUsage({
          token,
          requestId: req.requestId,
          method: req.method,
          endpoint: req.originalUrl,
          statusCode: res.statusCode,
          ipAddress: getClientIp(req),
          userAgent,
          responseTimeMs: Date.now() - startedAt,
        });
      })
      .catch(() => {
        // Non-blocking by design.
      });
  });

  next();
};
