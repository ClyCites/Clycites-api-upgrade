import { Request, Response, NextFunction } from 'express';
import MFAService from './mfa.service';
import DeviceService from './device.service';
import { successResponse } from '../../common/utils/response';

class SecurityController {
  /**
   * Setup TOTP
   */
  async setupTOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await MFAService.setupTOTP(req.user!.id);
      return successResponse(res, result, 'TOTP setup initiated');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Verify and enable TOTP
   */
  async verifyTOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await MFAService.verifyAndEnableTOTP(
        req.user!.id,
        req.body.token
      );

      return successResponse(res, result, 'TOTP enabled successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Enable email OTP
   */
  async enableEmailOTP(req: Request, res: Response, next: NextFunction) {
    try {
      await MFAService.enableEmailOTP(req.user!.id);
      return successResponse(res, null, 'Email OTP enabled successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Request email OTP
   */
  async requestEmailOTP(req: Request, res: Response, next: NextFunction) {
    try {
      await MFAService.sendEmailOTP(req.user!.id);
      return successResponse(res, null, 'OTP sent to your email');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Disable MFA
   */
  async disableMFA(req: Request, res: Response, next: NextFunction) {
    try {
      await MFAService.disableMFA(req.user!.id);
      return successResponse(res, null, 'MFA disabled successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get user devices
   */
  async getDevices(req: Request, res: Response, next: NextFunction) {
    try {
      const devices = await DeviceService.getUserDevices(req.user!.id);
      return successResponse(res, devices);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Verify device
   */
  async verifyDevice(req: Request, res: Response, next: NextFunction) {
    try {
      await DeviceService.verifyDevice(req.user!.id, req.params.deviceId);
      return successResponse(res, null, 'Device verified successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Block device
   */
  async blockDevice(req: Request, res: Response, next: NextFunction) {
    try {
      await DeviceService.blockDevice(
        req.user!.id,
        req.params.deviceId,
        req.body.reason
      );

      return successResponse(res, null, 'Device blocked successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Revoke device
   */
  async revokeDevice(req: Request, res: Response, next: NextFunction) {
    try {
      await DeviceService.revokeDevice(req.user!.id, req.params.deviceId);
      return successResponse(res, null, 'Device revoked successfully');
    } catch (error) {
      return next(error);
    }
  }
}

export default new SecurityController();
