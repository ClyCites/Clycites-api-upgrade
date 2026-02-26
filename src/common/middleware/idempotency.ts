import { createHash } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import IdempotencyKey from '../models/idempotencyKey.model';
import { BadRequestError, ConflictError } from '../errors/AppError';
import { getClientIp } from './rateLimiter';

const IDEMPOTENCY_HEADER = 'idempotency-key';

const hashRequestBody = (body: unknown): string => {
  const raw = JSON.stringify(body || {});
  return createHash('sha256').update(raw).digest('hex');
};

const getRouteKey = (req: Request): string => {
  return `${req.method.toUpperCase()}:${req.originalUrl.split('?')[0]}`;
};

const getOwnerKey = (req: Request): string => {
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }

  return `ip:${getClientIp(req)}`;
};

const asReplayPayload = (res: Response, payload: any) => {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const currentRequestId = res.locals?.requestId;
  const meta = payload.meta && typeof payload.meta === 'object' ? payload.meta : {};

  return {
    ...payload,
    meta: {
      ...meta,
      requestId: currentRequestId || meta.requestId,
      idempotencyReplayed: true,
    },
  };
};

interface IdempotencyOptions {
  ttlMinutes?: number;
}

export const enforceIdempotency = (options: IdempotencyOptions = {}) => {
  const ttlMinutes = Math.min(24 * 60, Math.max(1, options.ttlMinutes || 60));

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawKey = req.headers[IDEMPOTENCY_HEADER];
      if (typeof rawKey !== 'string' || rawKey.trim().length < 8 || rawKey.trim().length > 128) {
        throw new BadRequestError('Idempotency-Key header is required and must be 8-128 characters');
      }

      const key = rawKey.trim();
      const ownerKey = getOwnerKey(req);
      const routeKey = getRouteKey(req);
      const requestHash = hashRequestBody(req.body);
      const now = new Date();

      const existing = await IdempotencyKey.findOne({
        key,
        ownerKey,
        method: req.method.toUpperCase(),
        routeKey,
      });

      if (existing) {
        if (existing.requestHash !== requestHash) {
          throw new ConflictError('Idempotency-Key reuse detected with a different request payload');
        }

        if (existing.expiresAt <= now) {
          await existing.deleteOne();
        } else if (existing.status === 'completed' && existing.responseBody !== undefined) {
          const payload = asReplayPayload(res, existing.responseBody);
          return res.status(existing.responseStatus || 200).json(payload);
        } else {
          throw new ConflictError('A request with this Idempotency-Key is already being processed');
        }
      }

      const record = await IdempotencyKey.create({
        key,
        ownerKey,
        method: req.method.toUpperCase(),
        routeKey,
        requestHash,
        status: 'processing',
        expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
      });

      const originalJson = res.json.bind(res);

      res.json = ((body: any) => {
        const statusCode = res.statusCode;
        const safeBody = body && typeof body === 'object'
          ? JSON.parse(JSON.stringify(body))
          : body;

        void IdempotencyKey.findByIdAndUpdate(record._id, {
          status: statusCode >= 500 ? 'failed' : 'completed',
          responseStatus: statusCode,
          responseBody: safeBody,
        }).catch(() => {
          // no-op
        });

        return originalJson(body);
      }) as Response['json'];

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

