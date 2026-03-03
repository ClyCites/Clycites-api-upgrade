import argon2 from 'argon2';
import { randomBytes, randomUUID } from 'crypto';
import mongoose from 'mongoose';
import ApiToken, { ApiTokenStatus, ApiTokenType, IApiToken } from './apiToken.model';
import ApiAccessLog from './apiAccessLog.model';
import User from '../users/user.model';
import Organization from '../organizations/organization.model';
import OrganizationMember from '../organizations/organizationMember.model';
import AuditService from '../audit/audit.service';
import { getClientIp } from '../../common/middleware/rateLimiter';
import { isSuperAdminRole } from '../../common/middleware/superAdmin';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
} from '../../common/errors/AppError';

const DEFAULT_TOKEN_RATE_LIMIT = 120;
const DEFAULT_TOKEN_BURST = 240;
const MAX_SUPER_ADMIN_TOKEN_TTL_MINUTES = 60;
const MIN_REASON_LENGTH = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const tokenRateWindow = new Map<string, { windowStart: number; count: number }>();
const orgRateWindow = new Map<string, { windowStart: number; count: number }>();

export interface ApiTokenRateLimitInput {
  requestsPerMinute: number;
  burst?: number;
}

export interface CreateApiTokenInput {
  actorId: string;
  tokenType: ApiTokenType;
  name: string;
  description?: string;
  orgId?: string;
  scopes: string[];
  rateLimit?: ApiTokenRateLimitInput;
  expiresAt?: string;
  allowedIps?: string[];
  reason?: string;
}

export interface UpdateApiTokenInput {
  actorId: string;
  tokenId: string;
  name?: string;
  description?: string;
  scopes?: string[];
  rateLimit?: ApiTokenRateLimitInput;
  allowedIps?: string[];
  expiresAt?: string | null;
  reason?: string;
}

export interface RevokeApiTokenInput {
  actorId: string;
  tokenId: string;
  reason: string;
}

export interface RotateApiTokenInput {
  actorId: string;
  tokenId: string;
  reason: string;
}

interface AuthenticatedTokenContext {
  rawToken: string;
  ipAddress: string;
  userAgent?: string;
}

interface TokenActor {
  id: string;
  email: string;
  role: string;
}

export interface ApiTokenIdentity {
  id: string;
  email: string;
  role: string;
  authType: 'api_token';
  tokenId: string;
  tokenType: ApiTokenType;
  tokenScopes: string[];
  permissions: string[];
  orgId?: string;
  superAdminScopes?: string[];
}

export interface AuthenticatedApiToken {
  identity: ApiTokenIdentity;
  token: IApiToken;
}

const sanitizeScope = (scope: string): string => scope.trim().toLowerCase();

const normalizeScopes = (scopes: string[]): string[] => {
  const normalized = new Set<string>();

  for (const scope of scopes) {
    const value = sanitizeScope(scope || '');
    if (value.length >= 3 && value.length <= 120) {
      normalized.add(value);
    }
  }

  return Array.from(normalized);
};

const normalizeAllowedIps = (allowedIps: string[] = []): string[] => {
  const values = new Set<string>();
  for (const ip of allowedIps) {
    const value = String(ip || '').trim();
    if (value.length > 0 && value.length <= 80) {
      values.add(value);
    }
  }

  return Array.from(values);
};

const buildTokenSecret = (): { tokenPrefix: string; rawToken: string } => {
  const tokenPrefix = `ct_${randomBytes(4).toString('hex')}`;
  const secret = randomBytes(24).toString('hex');
  return {
    tokenPrefix,
    rawToken: `${tokenPrefix}.${secret}`,
  };
};

const parsePrefix = (rawToken: string): string => {
  const separatorIndex = rawToken.indexOf('.');
  if (separatorIndex < 0) {
    return '';
  }

  return rawToken.slice(0, separatorIndex).trim();
};

const normalizeRateLimit = (rateLimit?: ApiTokenRateLimitInput): Required<ApiTokenRateLimitInput> => {
  const requestsPerMinute = Number(rateLimit?.requestsPerMinute || DEFAULT_TOKEN_RATE_LIMIT);
  const burst = Number(rateLimit?.burst || DEFAULT_TOKEN_BURST);

  if (!Number.isFinite(requestsPerMinute) || requestsPerMinute < 1 || requestsPerMinute > 5000) {
    throw new BadRequestError('rateLimit.requestsPerMinute must be between 1 and 5000');
  }

  if (!Number.isFinite(burst) || burst < requestsPerMinute || burst > 10000) {
    throw new BadRequestError('rateLimit.burst must be between requestsPerMinute and 10000');
  }

  return {
    requestsPerMinute,
    burst,
  };
};

const hasTokenScope = (scopes: string[], requiredScope: string): boolean => {
  if (scopes.includes('*') || scopes.includes('admin:*') || scopes.includes('super_admin:*')) {
    return true;
  }

  if (scopes.includes(requiredScope)) {
    return true;
  }

  const [resource, action] = requiredScope.split(':');
  if (resource && action) {
    return scopes.includes(`${resource}:*`);
  }

  return false;
};

class ApiTokenService {
  private enforceInMemoryRateLimit(key: string, limit: number, store: Map<string, { windowStart: number; count: number }>): void {
    const now = Date.now();
    const existing = store.get(key);

    if (!existing || now - existing.windowStart >= RATE_LIMIT_WINDOW_MS) {
      store.set(key, { windowStart: now, count: 1 });
      return;
    }

    if (existing.count >= limit) {
      throw new TooManyRequestsError('API token rate limit exceeded');
    }

    existing.count += 1;
    store.set(key, existing);
  }

  private async getActor(actorId: string): Promise<TokenActor> {
    const user = await User.findOne({ _id: actorId, deletedAt: null }).select('email role isActive');
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Actor not found or inactive');
    }

    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };
  }

  private async assertOrgTokenAllowed(actor: TokenActor, orgId?: string): Promise<void> {
    if (!orgId) {
      throw new BadRequestError('orgId is required for organization tokens');
    }

    const org = await Organization.findById(orgId).select('_id owner status');
    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    if (org.status !== 'active' && !isSuperAdminRole(actor.role)) {
      throw new ForbiddenError('Organization token can only be created for active organizations');
    }

    if (isSuperAdminRole(actor.role) || org.owner.toString() === actor.id) {
      return;
    }

    const membership = await OrganizationMember.findOne({
      organization: orgId,
      user: actor.id,
      status: 'active',
    }).populate('role', 'level');

    const level = Number((membership?.role as { level?: number } | undefined)?.level ?? 999);
    if (!membership || level > 20) {
      throw new ForbiddenError('Only organization admins can create organization API tokens');
    }
  }

  private assertSuperAdminTokenPolicy(actor: TokenActor, scopes: string[], expiresAt?: Date): void {
    if (!isSuperAdminRole(actor.role)) {
      throw new ForbiddenError('Only Super Admin users can create super admin API tokens');
    }

    const hasInvalidScope = scopes.some((scope) => !scope.startsWith('super_admin:') && scope !== '*');
    if (hasInvalidScope) {
      throw new BadRequestError('super_admin token scopes must use the super_admin:* namespace');
    }

    if (!expiresAt) {
      throw new BadRequestError('super_admin tokens must have expiresAt set');
    }

    const ttlMs = expiresAt.getTime() - Date.now();
    const ttlMinutes = ttlMs / (60 * 1000);
    if (ttlMinutes <= 0 || ttlMinutes > MAX_SUPER_ADMIN_TOKEN_TTL_MINUTES) {
      throw new BadRequestError(
        `super_admin tokens must expire within ${MAX_SUPER_ADMIN_TOKEN_TTL_MINUTES} minutes`
      );
    }
  }

  private parseExpiry(expiresAt?: string | null): Date | undefined {
    if (!expiresAt) {
      return undefined;
    }

    const parsed = new Date(expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestError('expiresAt must be a valid ISO date-time');
    }

    if (parsed <= new Date()) {
      throw new BadRequestError('expiresAt must be in the future');
    }

    return parsed;
  }

  private toTokenMetadata(token: IApiToken) {
    const now = new Date();
    const effectiveStatus: ApiTokenStatus =
      token.status === 'active' && token.expiresAt && token.expiresAt <= now ? 'expired' : token.status;

    return {
      id: token._id.toString(),
      tokenId: token.tokenId,
      tokenType: token.tokenType,
      name: token.name,
      description: token.description,
      tokenPrefix: token.tokenPrefix,
      createdBy: token.createdBy.toString(),
      orgId: token.organization ? token.organization.toString() : undefined,
      scopes: token.scopes,
      rateLimit: token.rateLimit,
      status: effectiveStatus,
      uiStatus: effectiveStatus,
      expiresAt: token.expiresAt,
      allowedIps: token.allowedIps,
      lastUsedAt: token.lastUsedAt,
      lastUsedIp: token.lastUsedIp,
      revokedAt: token.revokedAt,
      revokeReason: token.revokeReason,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt,
    };
  }

  private async assertCanManageToken(actor: TokenActor, token: IApiToken): Promise<void> {
    if (isSuperAdminRole(actor.role)) {
      return;
    }

    if (token.createdBy.toString() === actor.id) {
      return;
    }

    if (token.organization) {
      await this.assertOrgTokenAllowed(actor, token.organization.toString());
      return;
    }

    throw new ForbiddenError('You are not allowed to manage this token');
  }

  async createToken(input: CreateApiTokenInput, context: { ipAddress?: string; userAgent?: string }) {
    const actor = await this.getActor(input.actorId);
    const scopes = normalizeScopes(input.scopes || []);

    if (scopes.length === 0) {
      throw new BadRequestError('At least one valid scope is required');
    }

    const tokenType = input.tokenType || 'personal';
    const expiresAt = this.parseExpiry(input.expiresAt);
    const allowedIps = normalizeAllowedIps(input.allowedIps || []);
    const rateLimit = normalizeRateLimit(input.rateLimit);

    if (tokenType === 'organization') {
      await this.assertOrgTokenAllowed(actor, input.orgId);
    }

    if (tokenType === 'super_admin') {
      this.assertSuperAdminTokenPolicy(actor, scopes, expiresAt);
    }

    const { tokenPrefix, rawToken } = buildTokenSecret();
    const tokenHash = await argon2.hash(rawToken);

    const token = await ApiToken.create({
      tokenId: randomUUID(),
      tokenType,
      name: input.name.trim(),
      description: input.description?.trim(),
      tokenPrefix,
      tokenHash,
      createdBy: actor.id,
      organization: input.orgId,
      scopes,
      rateLimit,
      status: 'active',
      expiresAt,
      allowedIps,
    });

    await AuditService.log({
      action: 'auth.api_token_created',
      resource: 'api_token',
      resourceId: token._id.toString(),
      userId: actor.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      risk: tokenType === 'super_admin' ? 'critical' : 'high',
      details: {
        metadata: {
          actorId: actor.id,
          targetId: token.tokenId,
          action: 'auth.api_token_created',
          reason: input.reason,
          timestamp: new Date().toISOString(),
          tokenType,
          scopes,
          orgId: input.orgId,
        },
      },
    });

    return {
      token: this.toTokenMetadata(token),
      secret: rawToken,
      secretShown: true,
    };
  }

  async listTokens(actorId: string, filters: { tokenType?: ApiTokenType; status?: ApiTokenStatus; orgId?: string }) {
    const actor = await this.getActor(actorId);

    const query: Record<string, unknown> = {};
    if (filters.tokenType) {
      query.tokenType = filters.tokenType;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.orgId) {
      query.organization = filters.orgId;
    }

    if (!isSuperAdminRole(actor.role)) {
      if (filters.orgId) {
        await this.assertOrgTokenAllowed(actor, filters.orgId);
      } else {
        query.createdBy = actor.id;
      }
    }

    const tokens = await ApiToken.find(query).sort({ createdAt: -1 }).limit(200);
    return tokens.map((token) => this.toTokenMetadata(token));
  }

  async getTokenById(actorId: string, tokenId: string) {
    const actor = await this.getActor(actorId);
    const token = await ApiToken.findById(tokenId);

    if (!token) {
      throw new NotFoundError('API token not found');
    }

    await this.assertCanManageToken(actor, token);
    return this.toTokenMetadata(token);
  }

  async updateToken(input: UpdateApiTokenInput, context: { ipAddress?: string; userAgent?: string }) {
    const actor = await this.getActor(input.actorId);
    const token = await ApiToken.findById(input.tokenId);

    if (!token) {
      throw new NotFoundError('API token not found');
    }

    await this.assertCanManageToken(actor, token);

    if (input.name !== undefined) {
      token.name = input.name.trim();
    }

    if (input.description !== undefined) {
      token.description = input.description.trim();
    }

    if (input.scopes !== undefined) {
      const scopes = normalizeScopes(input.scopes);
      if (scopes.length === 0) {
        throw new BadRequestError('At least one valid scope is required');
      }

      if (token.tokenType === 'super_admin') {
        const expiresAt = input.expiresAt !== undefined ? this.parseExpiry(input.expiresAt || undefined) : token.expiresAt;
        this.assertSuperAdminTokenPolicy(actor, scopes, expiresAt);
      }

      token.scopes = scopes;
    }

    if (input.rateLimit !== undefined) {
      token.rateLimit = normalizeRateLimit(input.rateLimit);
    }

    if (input.allowedIps !== undefined) {
      token.allowedIps = normalizeAllowedIps(input.allowedIps);
    }

    if (input.expiresAt !== undefined) {
      token.expiresAt = this.parseExpiry(input.expiresAt);
    }

    await token.save();

    await AuditService.log({
      action: 'auth.api_token_updated',
      resource: 'api_token',
      resourceId: token._id.toString(),
      userId: actor.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      risk: token.tokenType === 'super_admin' ? 'critical' : 'high',
      details: {
        metadata: {
          actorId: actor.id,
          targetId: token.tokenId,
          action: 'auth.api_token_updated',
          reason: input.reason,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return this.toTokenMetadata(token);
  }

  async rotateToken(input: RotateApiTokenInput, context: { ipAddress?: string; userAgent?: string }) {
    if ((input.reason || '').trim().length < MIN_REASON_LENGTH) {
      throw new BadRequestError('reason must be at least 3 characters');
    }

    const actor = await this.getActor(input.actorId);
    const token = await ApiToken.findById(input.tokenId).select('+tokenHash');

    if (!token) {
      throw new NotFoundError('API token not found');
    }

    await this.assertCanManageToken(actor, token);

    const { tokenPrefix, rawToken } = buildTokenSecret();
    const tokenHash = await argon2.hash(rawToken);

    token.tokenPrefix = tokenPrefix;
    token.tokenHash = tokenHash;
    token.status = 'active';
    token.revokedAt = undefined;
    token.revokedBy = undefined;
    token.revokeReason = undefined;

    await token.save();

    await AuditService.log({
      action: 'auth.api_token_rotated',
      resource: 'api_token',
      resourceId: token._id.toString(),
      userId: actor.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      risk: token.tokenType === 'super_admin' ? 'critical' : 'high',
      details: {
        metadata: {
          actorId: actor.id,
          targetId: token.tokenId,
          action: 'auth.api_token_rotated',
          reason: input.reason,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return {
      token: this.toTokenMetadata(token),
      secret: rawToken,
      secretShown: true,
    };
  }

  async revokeToken(input: RevokeApiTokenInput, context: { ipAddress?: string; userAgent?: string }) {
    if ((input.reason || '').trim().length < MIN_REASON_LENGTH) {
      throw new BadRequestError('reason must be at least 3 characters');
    }

    const actor = await this.getActor(input.actorId);
    const token = await ApiToken.findById(input.tokenId);

    if (!token) {
      throw new NotFoundError('API token not found');
    }

    await this.assertCanManageToken(actor, token);

    token.status = 'revoked';
    token.revokedAt = new Date();
    token.revokedBy = new mongoose.Types.ObjectId(actor.id);
    token.revokeReason = input.reason.trim();
    await token.save();

    await AuditService.log({
      action: 'auth.api_token_revoked',
      resource: 'api_token',
      resourceId: token._id.toString(),
      userId: actor.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      risk: token.tokenType === 'super_admin' ? 'critical' : 'high',
      details: {
        metadata: {
          actorId: actor.id,
          targetId: token.tokenId,
          action: 'auth.api_token_revoked',
          reason: input.reason,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return this.toTokenMetadata(token);
  }

  async getTokenUsage(actorId: string, tokenId: string, options: { sinceDays?: number } = {}) {
    const actor = await this.getActor(actorId);
    const token = await ApiToken.findById(tokenId);

    if (!token) {
      throw new NotFoundError('API token not found');
    }

    await this.assertCanManageToken(actor, token);

    const sinceDays = Math.max(1, Math.min(90, options.sinceDays || 7));
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

    const [summary] = await ApiAccessLog.aggregate([
      { $match: { token: token._id, createdAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          successResponses: {
            $sum: {
              $cond: [{ $and: [{ $gte: ['$statusCode', 200] }, { $lt: ['$statusCode', 400] }] }, 1, 0],
            },
          },
          clientErrors: {
            $sum: {
              $cond: [{ $and: [{ $gte: ['$statusCode', 400] }, { $lt: ['$statusCode', 500] }] }, 1, 0],
            },
          },
          serverErrors: {
            $sum: {
              $cond: [{ $gte: ['$statusCode', 500] }, 1, 0],
            },
          },
        },
      },
    ]);

    const requestSeries = await ApiAccessLog.aggregate([
      { $match: { token: token._id, createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            y: { $year: '$createdAt' },
            m: { $month: '$createdAt' },
            d: { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } },
    ]);

    return {
      token: this.toTokenMetadata(token),
      summary: {
        totalRequests: Number(summary?.totalRequests || 0),
        successResponses: Number(summary?.successResponses || 0),
        clientErrors: Number(summary?.clientErrors || 0),
        serverErrors: Number(summary?.serverErrors || 0),
      },
      since,
      days: sinceDays,
      requestsByDay: requestSeries.map((entry) => ({
        date: `${entry._id.y}-${String(entry._id.m).padStart(2, '0')}-${String(entry._id.d).padStart(2, '0')}`,
        count: entry.count,
      })),
      lastUsedAt: token.lastUsedAt,
      lastUsedIp: token.lastUsedIp,
    };
  }

  async authenticateApiToken(context: AuthenticatedTokenContext): Promise<AuthenticatedApiToken> {
    const tokenPrefix = parsePrefix(context.rawToken);
    if (!tokenPrefix || !tokenPrefix.startsWith('ct_')) {
      throw new UnauthorizedError('Invalid API token format');
    }

    const token = await ApiToken.findOne({
      tokenPrefix,
      status: 'active',
    }).select('+tokenHash');

    if (!token) {
      throw new UnauthorizedError('Invalid API token');
    }

    if (token.expiresAt && token.expiresAt <= new Date()) {
      token.status = 'expired';
      await token.save();
      throw new UnauthorizedError('API token has expired');
    }

    if (token.allowedIps.length > 0 && !token.allowedIps.includes(context.ipAddress)) {
      throw new ForbiddenError('API token is not allowed from this IP address');
    }

    const isValid = await argon2.verify(token.tokenHash, context.rawToken);
    if (!isValid) {
      throw new UnauthorizedError('Invalid API token');
    }

    const actor = await User.findOne({ _id: token.createdBy, deletedAt: null }).select('email role isActive');
    if (!actor || !actor.isActive) {
      throw new UnauthorizedError('API token owner is inactive');
    }

    if (token.tokenType === 'super_admin' && !isSuperAdminRole(actor.role)) {
      throw new UnauthorizedError('Invalid super admin token owner');
    }

    token.lastUsedAt = new Date();
    token.lastUsedIp = context.ipAddress;
    await token.save();

    const scopes = normalizeScopes(token.scopes);
    this.enforceInMemoryRateLimit(
      `token:${token.tokenId}`,
      token.rateLimit.requestsPerMinute,
      tokenRateWindow
    );
    if (token.organization) {
      this.enforceInMemoryRateLimit(
        `org:${token.organization.toString()}`,
        token.rateLimit.burst || token.rateLimit.requestsPerMinute,
        orgRateWindow
      );
    }

    return {
      token,
      identity: {
        id: actor._id.toString(),
        email: actor.email,
        role: actor.role,
        authType: 'api_token',
        tokenId: token.tokenId,
        tokenType: token.tokenType,
        tokenScopes: scopes,
        permissions: scopes,
        orgId: token.organization ? token.organization.toString() : undefined,
        superAdminScopes: token.tokenType === 'super_admin' ? scopes : undefined,
      },
    };
  }

  async recordUsage(params: {
    token: IApiToken;
    requestId?: string;
    method: string;
    endpoint: string;
    statusCode: number;
    ipAddress: string;
    userAgent?: string;
    responseTimeMs?: number;
  }): Promise<void> {
    await ApiAccessLog.create({
      token: params.token._id,
      tokenId: params.token.tokenId,
      tokenPrefix: params.token.tokenPrefix,
      actorUser: params.token.createdBy,
      organization: params.token.organization,
      method: params.method.toUpperCase(),
      endpoint: params.endpoint,
      statusCode: params.statusCode,
      requestId: params.requestId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      responseTimeMs: params.responseTimeMs,
    });
  }

  inferRequiredScopes(method: string, originalUrl: string): string[] {
    const path = originalUrl.split('?')[0] || '';
    const segments = path.split('/').filter(Boolean);

    let resource = segments[2] || 'platform';
    if (resource === 'auth' && segments[3] === 'tokens') {
      resource = 'tokens';
    }

    const action = method.toUpperCase() === 'GET' || method.toUpperCase() === 'HEAD' ? 'read' : 'write';

    return [`${resource}:${action}`, `${resource}:*`];
  }

  enforceTokenScopes(scopes: string[], method: string, originalUrl: string): void {
    const requiredScopes = this.inferRequiredScopes(method, originalUrl);
    const hasScope = requiredScopes.some((scope) => hasTokenScope(scopes, scope));

    if (!hasScope) {
      throw new ForbiddenError(`API token scope is insufficient for this endpoint. Required one of: ${requiredScopes.join(', ')}`);
    }
  }

  enforceOrgBoundary(identity: ApiTokenIdentity, req: { headers: Record<string, unknown>; body?: unknown; params?: Record<string, unknown> }): void {
    const headerOrgId = String(req.headers['x-organization-id'] || '').trim();
    const bodyOrgId = typeof req.body === 'object' && req.body !== null
      ? String((req.body as Record<string, unknown>).organizationId || '')
      : '';
    const paramOrgId = String(req.params?.organizationId || '').trim();

    const requestedOrgIds = [headerOrgId, bodyOrgId.trim(), paramOrgId].filter(Boolean);

    if (identity.orgId) {
      const hasMismatch = requestedOrgIds.some((orgId) => orgId !== identity.orgId);
      if (hasMismatch) {
        throw new ForbiddenError('API token cannot access resources outside its organization');
      }

      if (!headerOrgId) {
        req.headers['x-organization-id'] = identity.orgId;
      }
    } else if (requestedOrgIds.length > 0 && !isSuperAdminRole(identity.role)) {
      throw new ForbiddenError('Personal API tokens cannot act on organization-scoped resources');
    }
  }

  getRateLimitForIdentity(tokenId?: string): Promise<ApiTokenRateLimitInput | undefined> {
    if (!tokenId) {
      return Promise.resolve(undefined);
    }

    return ApiToken.findOne({ tokenId, status: 'active' })
      .select('rateLimit')
      .lean()
      .then((token) => {
        if (!token?.rateLimit) {
          return undefined;
        }

        return {
          requestsPerMinute: token.rateLimit.requestsPerMinute,
          burst: token.rateLimit.burst,
        };
      });
  }

  getRequestContext(req: { headers: Record<string, unknown>; socket?: { remoteAddress?: string | undefined } }) {
    const ipAddress = getClientIp(req as never);
    const userAgentRaw = req.headers['user-agent'];

    return {
      ipAddress,
      userAgent: typeof userAgentRaw === 'string' ? userAgentRaw : undefined,
    };
  }
}

export default new ApiTokenService();
