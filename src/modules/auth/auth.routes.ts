import { Router } from 'express';
import authController from './auth.controller';
import { authenticate } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import { authLimiter } from '../../common/middleware/rateLimiter';
import {
  registerValidator,
  loginValidator,
  verifyOTPValidator,
  resendOTPValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  refreshTokenValidator,
} from './auth.validator';

const router = Router();

// Public routes
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
  validate(refreshTokenValidator),
  authController.refreshToken
);

router.post(
  '/logout',
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
router.get(
  '/me',
  authenticate,
  authController.getMe
);

export default router;
