import { NextFunction, Request, Response } from 'express';
import AuditService from '../../modules/audit/audit.service';
import { getClientIp } from './rateLimiter';
import { getSuperAdminReason, isSuperAdminModeRequested, isSuperAdminUser } from './superAdmin';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const toAuditMethod = (method: string): 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' => {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'POST';
    case 'PUT':
      return 'PUT';
    case 'PATCH':
      return 'PATCH';
    case 'DELETE':
      return 'DELETE';
    default:
      return 'GET';
  }
};

const inferTargetId = (req: Request): string | undefined => {
  const paramCandidates = [
    req.params.id,
    req.params.userId,
    req.params.targetId,
    req.params.organizationId,
    req.params.memberId,
    req.params.orderId,
    req.params.escrowId,
  ];

  for (const candidate of paramCandidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  const bodyCandidate = (req.body && (req.body.targetId || req.body.userId || req.body.organizationId)) as
    | string
    | undefined;

  if (typeof bodyCandidate === 'string' && bodyCandidate.trim().length > 0) {
    return bodyCandidate.trim();
  }

  return undefined;
};

export const superAdminAudit = (req: Request, res: Response, next: NextFunction) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    if (!req.user || !isSuperAdminModeRequested(req) || !isSuperAdminUser(req)) {
      return;
    }

    const reason = getSuperAdminReason(req);
    if (!reason) {
      return;
    }

    const actorId = req.user.impersonatedBy || req.user.id;
    const targetId = inferTargetId(req);
    const status = res.statusCode >= 400 ? 'failure' : 'success';
    const risk = SAFE_METHODS.has(req.method.toUpperCase()) ? 'medium' : 'critical';
    const rawUserAgent = req.headers['user-agent'];
    const userAgent = typeof rawUserAgent === 'string' ? rawUserAgent : 'unknown';

    void AuditService.log({
      action: `super_admin.${req.method.toLowerCase()}`,
      resource: req.baseUrl || 'system',
      resourceId: targetId,
      userId: actorId,
      method: toAuditMethod(req.method),
      endpoint: req.originalUrl,
      status,
      statusCode: res.statusCode,
      ipAddress: getClientIp(req),
      userAgent,
      details: {
        metadata: {
          actorId,
          targetId,
          action: `${req.method.toUpperCase()} ${req.originalUrl}`,
          reason,
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
          durationMs: Date.now() - startedAt,
          impersonatedUserId: req.user.id !== actorId ? req.user.id : undefined,
        },
      },
      risk,
    }).catch(() => {
      // Deliberately swallow audit write failures to avoid impacting responses.
    });
  });

  next();
};

