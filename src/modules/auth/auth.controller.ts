import { Request, Response, NextFunction } from 'express';
import AuthService from './auth.service';
import ApiTokenService from './apiToken.service';
import { ResponseHandler } from '../../common/utils/response';
import { BadRequestError } from '../../common/errors/AppError';
import { getClientIp } from '../../common/middleware/rateLimiter';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.register(req.body, this.getRequestContext(req));
      ResponseHandler.created(res, result, 'Registration successful');
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login(email, password, this.getRequestContext(req));
      ResponseHandler.success(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        throw new BadRequestError('Refresh token is required');
      }

      const result = await this.authService.refreshToken(refreshToken, this.getRequestContext(req));
      ResponseHandler.success(res, result, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      
      if (refreshToken) {
        await this.authService.logout(refreshToken, this.getRequestContext(req));
      }

      ResponseHandler.success(res, null, 'Logout successful');
    } catch (error) {
      next(error);
    }
  };

  verifyOTP = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, code, purpose } = req.body;
      const result = await this.authService.verifyOTP(email, code, purpose);
      ResponseHandler.success(res, result, 'OTP verified successfully');
    } catch (error) {
      next(error);
    }
  };

  resendOTP = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, purpose } = req.body;
      await this.authService.resendOTP(email, purpose);
      ResponseHandler.success(res, null, 'OTP sent successfully');
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      await this.authService.forgotPassword(email);
      ResponseHandler.success(res, null, 'Password reset instructions sent');
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, code, newPassword } = req.body;
      await this.authService.resetPassword(email, code, newPassword);
      ResponseHandler.success(res, null, 'Password reset successful');
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const user = await this.authService.getUserById(userId);
      ResponseHandler.success(res, user, 'User retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  updateMyProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const result = await this.authService.updateMyProfile(
        userId,
        req.body,
        this.getRequestContext(req)
      );
      ResponseHandler.success(res, result, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      await this.authService.changePassword(
        userId,
        currentPassword,
        newPassword,
        this.getRequestContext(req)
      );

      ResponseHandler.success(
        res,
        null,
        'Password changed successfully. Please log in again on all devices'
      );
    } catch (error) {
      next(error);
    }
  };

  createScopedSuperAdminToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = this.getActorId(req);
      const { scopes = [], reason, expiresInMinutes } = req.body;
      const parsedScopes = this.toScopes(scopes);

      const result = await this.authService.createScopedSuperAdminToken(
        {
          actorId,
          scopes: parsedScopes,
          reason,
          expiresInMinutes,
        },
        this.getRequestContext(req)
      );

      ResponseHandler.created(res, result, 'Super Admin scoped token created');
    } catch (error) {
      next(error);
    }
  };

  revokeScopedSuperAdminToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = this.getActorId(req);
      const { reason } = req.body;

      await this.authService.revokeScopedSuperAdminToken(
        {
          actorId,
          grantId: req.params.grantId,
          reason,
        },
        this.getRequestContext(req)
      );

      ResponseHandler.success(res, null, 'Super Admin scoped token revoked');
    } catch (error) {
      next(error);
    }
  };

  listScopedSuperAdminTokens = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = this.getActorId(req);
      const grants = await this.authService.listScopedSuperAdminTokens(actorId);
      ResponseHandler.success(res, grants, 'Super Admin scoped tokens retrieved');
    } catch (error) {
      next(error);
    }
  };

  startImpersonation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = this.getActorId(req);
      const { targetUserId, reason, scopes = [], ttlMinutes } = req.body;
      const parsedScopes = this.toScopes(scopes);

      const session = await this.authService.startImpersonationSession({
        actorId,
        targetUserId,
        reason,
        scopes: parsedScopes,
        ttlMinutes,
        context: this.getRequestContext(req),
      });

      ResponseHandler.created(res, session, 'Impersonation session started');
    } catch (error) {
      next(error);
    }
  };

  revokeImpersonation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = this.getActorId(req);
      const { reason } = req.body;

      await this.authService.revokeImpersonationSession(
        {
          actorId,
          sessionId: req.params.sessionId,
          reason,
        },
        this.getRequestContext(req)
      );

      ResponseHandler.success(res, null, 'Impersonation session revoked');
    } catch (error) {
      next(error);
    }
  };

  listImpersonationSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = this.getActorId(req);
      const sessions = await this.authService.listImpersonationSessions(actorId);
      ResponseHandler.success(res, sessions, 'Impersonation sessions retrieved');
    } catch (error) {
      next(error);
    }
  };

  createApiToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = this.getActorId(req);
      const result = await ApiTokenService.createToken(
        {
          actorId,
          tokenType: req.body.tokenType || 'personal',
          name: req.body.name,
          description: req.body.description,
          orgId: req.body.orgId,
          scopes: this.toScopes(req.body.scopes),
          rateLimit: req.body.rateLimit,
          expiresAt: req.body.expiresAt,
          allowedIps: Array.isArray(req.body.allowedIps)
            ? req.body.allowedIps.map((value: unknown) => String(value))
            : undefined,
          reason: req.body.reason,
        },
        this.getRequestContext(req)
      );

      ResponseHandler.created(res, result, 'API token created');
    } catch (error) {
      next(error);
    }
  };

  listApiTokens = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = this.getActorId(req);
      const tokens = await ApiTokenService.listTokens(actorId, {
        tokenType: req.query.tokenType as 'personal' | 'organization' | 'super_admin' | undefined,
        status: req.query.status as 'active' | 'revoked' | 'expired' | undefined,
        orgId: req.query.orgId as string | undefined,
      });

      ResponseHandler.success(res, tokens, 'API tokens retrieved');
    } catch (error) {
      next(error);
    }
  };

  getApiTokenById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = this.getActorId(req);
      const token = await ApiTokenService.getTokenById(actorId, req.params.id);
      ResponseHandler.success(res, token, 'API token retrieved');
    } catch (error) {
      next(error);
    }
  };

  updateApiToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = this.getActorId(req);
      const token = await ApiTokenService.updateToken(
        {
          actorId,
          tokenId: req.params.id,
          name: req.body.name,
          description: req.body.description,
          scopes: Array.isArray(req.body.scopes)
            ? req.body.scopes.map((value: unknown) => String(value))
            : undefined,
          rateLimit: req.body.rateLimit,
          allowedIps: Array.isArray(req.body.allowedIps)
            ? req.body.allowedIps.map((value: unknown) => String(value))
            : undefined,
          expiresAt: req.body.expiresAt,
          reason: req.body.reason,
        },
        this.getRequestContext(req)
      );

      ResponseHandler.success(res, token, 'API token updated');
    } catch (error) {
      next(error);
    }
  };

  rotateApiToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = this.getActorId(req);
      const result = await ApiTokenService.rotateToken(
        {
          actorId,
          tokenId: req.params.id,
          reason: req.body.reason,
        },
        this.getRequestContext(req)
      );

      ResponseHandler.success(res, result, 'API token rotated');
    } catch (error) {
      next(error);
    }
  };

  revokeApiToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = this.getActorId(req);
      const token = await ApiTokenService.revokeToken(
        {
          actorId,
          tokenId: req.params.id,
          reason: req.body.reason,
        },
        this.getRequestContext(req)
      );

      ResponseHandler.success(res, token, 'API token revoked');
    } catch (error) {
      next(error);
    }
  };

  getApiTokenUsage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = this.getActorId(req);
      const usage = await ApiTokenService.getTokenUsage(actorId, req.params.id, {
        sinceDays: req.query.sinceDays ? Number(req.query.sinceDays) : undefined,
      });

      ResponseHandler.success(res, usage, 'API token usage retrieved');
    } catch (error) {
      next(error);
    }
  };

  private getRequestContext(req: Request) {
    const userAgentHeader = req.headers['user-agent'];
    const userAgent = typeof userAgentHeader === 'string' ? userAgentHeader : 'unknown';

    return {
      ipAddress: getClientIp(req),
      userAgent,
      deviceId: req.headers['x-device-id'] as string | undefined,
    };
  }

  private getActorId(req: Request): string {
    if (!req.user?.id) {
      throw new BadRequestError('User ID not found');
    }

    return req.user.id;
  }

  private toScopes(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map((item) => String(item));
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map((scope) => scope.trim())
        .filter(Boolean);
    }

    return [];
  }
}

export default new AuthController();
