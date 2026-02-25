import { Request, Response, NextFunction } from 'express';
import AuthService from './auth.service';
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

  private getRequestContext(req: Request) {
    const userAgentHeader = req.headers['user-agent'];
    const userAgent = typeof userAgentHeader === 'string' ? userAgentHeader : 'unknown';

    return {
      ipAddress: getClientIp(req),
      userAgent,
      deviceId: req.headers['x-device-id'] as string | undefined,
    };
  }
}

export default new AuthController();
