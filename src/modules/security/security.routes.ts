import { Router } from 'express';
import SecurityController from './security.controller';
import { authenticate } from '../../common/middleware/auth';
import { sensitiveLimiter } from '../../common/middleware/rateLimiter';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * MFA Management
 */

/**
 * @route   POST /security/mfa/totp/setup
 * @desc    Setup TOTP (authenticator app)
 * @access  Authenticated users
 */
router.post(
  '/mfa/totp/setup',
  SecurityController.setupTOTP
);

/**
 * @route   POST /security/mfa/totp/verify
 * @desc    Verify and enable TOTP
 * @access  Authenticated users
 */
router.post(
  '/mfa/totp/verify',
  SecurityController.verifyTOTP
);

/**
 * @route   POST /security/mfa/email/enable
 * @desc    Enable email OTP
 * @access  Authenticated users
 */
router.post(
  '/mfa/email/enable',
  SecurityController.enableEmailOTP
);

/**
 * @route   POST /security/mfa/email/request
 * @desc    Request email OTP
 * @access  Authenticated users
 */
router.post(
  '/mfa/email/request',
  SecurityController.requestEmailOTP
);

/**
 * @route   DELETE /security/mfa
 * @desc    Disable MFA
 * @access  Authenticated users
 */
router.delete(
  '/mfa',
  sensitiveLimiter,
  SecurityController.disableMFA
);

/**
 * Device Management
 */

/**
 * @route   GET /security/devices
 * @desc    Get user devices
 * @access  Authenticated users
 */
router.get(
  '/devices',
  SecurityController.getDevices
);

/**
 * @route   POST /security/devices/:deviceId/verify
 * @desc    Verify device as trusted
 * @access  Authenticated users
 */
router.post(
  '/devices/:deviceId/verify',
  SecurityController.verifyDevice
);

/**
 * @route   POST /security/devices/:deviceId/block
 * @desc    Block device
 * @access  Authenticated users
 */
router.post(
  '/devices/:deviceId/block',
  SecurityController.blockDevice
);

/**
 * @route   DELETE /security/devices/:deviceId
 * @desc    Revoke device access
 * @access  Authenticated users
 */
router.delete(
  '/devices/:deviceId',
  SecurityController.revokeDevice
);

export default router;
