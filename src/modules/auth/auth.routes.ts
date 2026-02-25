import { Router } from 'express';
import authController from './auth.controller';
import { authenticate } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import { authLimiter, sensitiveLimiter } from '../../common/middleware/rateLimiter';
import {
  registerValidator,
  loginValidator,
  verifyOTPValidator,
  resendOTPValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  refreshTokenValidator,
  updateMyProfileValidator,
  changePasswordValidator,
} from './auth.validator';

const router = Router();

router.post(
  '/register',
  authLimiter,
  validate(registerValidator),
  authController.register
);

router.post(
  '/login',
  authLimiter,
  validate(loginValidator),
  authController.login
);

router.post(
  '/refresh-token',
  authLimiter,
  validate(refreshTokenValidator),
  authController.refreshToken
);

router.post(
  '/logout',
  authLimiter,
  authController.logout
);

router.post(
  '/verify-otp',
  authLimiter,
  validate(verifyOTPValidator),
  authController.verifyOTP
);

router.post(
  '/resend-otp',
  authLimiter,
  validate(resendOTPValidator),
  authController.resendOTP
);

router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordValidator),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordValidator),
  authController.resetPassword
);

// Protected routes
router.patch(
  '/me/profile',
  authenticate,
  validate(updateMyProfileValidator),
  authController.updateMyProfile
);

router.post(
  '/change-password',
  authenticate,
  sensitiveLimiter,
  validate(changePasswordValidator),
  authController.changePassword
);

router.get(
  '/me',
  authenticate,
  authController.getMe
);

export default router;
