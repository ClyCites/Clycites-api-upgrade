import { Router } from 'express';
import authController from './auth.controller';
import { authenticate } from '../../common/middleware/auth';
import { requireSuperAdmin } from '../../common/middleware/superAdmin';
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
  createSuperAdminTokenValidator,
  revokeSuperAdminTokenValidator,
  startImpersonationValidator,
  revokeImpersonationValidator,
  createApiTokenValidator,
  listApiTokensValidator,
  updateApiTokenValidator,
  tokenIdParamValidator,
  rotateOrRevokeApiTokenValidator,
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

// Super Admin controls
router.post(
  '/super-admin/tokens',
  authenticate,
  requireSuperAdmin(),
  sensitiveLimiter,
  validate(createSuperAdminTokenValidator),
  authController.createScopedSuperAdminToken
);

router.get(
  '/super-admin/tokens',
  authenticate,
  requireSuperAdmin(),
  authController.listScopedSuperAdminTokens
);

router.delete(
  '/super-admin/tokens/:grantId',
  authenticate,
  requireSuperAdmin(),
  sensitiveLimiter,
  validate(revokeSuperAdminTokenValidator),
  authController.revokeScopedSuperAdminToken
);

router.post(
  '/super-admin/impersonation',
  authenticate,
  requireSuperAdmin(),
  sensitiveLimiter,
  validate(startImpersonationValidator),
  authController.startImpersonation
);

router.get(
  '/super-admin/impersonation',
  authenticate,
  requireSuperAdmin(),
  authController.listImpersonationSessions
);

router.delete(
  '/super-admin/impersonation/:sessionId',
  authenticate,
  requireSuperAdmin(),
  sensitiveLimiter,
  validate(revokeImpersonationValidator),
  authController.revokeImpersonation
);

// API token lifecycle
router.post(
  '/tokens',
  authenticate,
  sensitiveLimiter,
  validate(createApiTokenValidator),
  authController.createApiToken
);

router.get(
  '/tokens',
  authenticate,
  validate(listApiTokensValidator),
  authController.listApiTokens
);

router.get(
  '/tokens/:id',
  authenticate,
  validate(tokenIdParamValidator),
  authController.getApiTokenById
);

router.patch(
  '/tokens/:id',
  authenticate,
  sensitiveLimiter,
  validate(updateApiTokenValidator),
  authController.updateApiToken
);

router.post(
  '/tokens/:id/rotate',
  authenticate,
  sensitiveLimiter,
  validate(rotateOrRevokeApiTokenValidator),
  authController.rotateApiToken
);

router.post(
  '/tokens/:id/revoke',
  authenticate,
  sensitiveLimiter,
  validate(rotateOrRevokeApiTokenValidator),
  authController.revokeApiToken
);

router.get(
  '/tokens/:id/usage',
  authenticate,
  validate(tokenIdParamValidator),
  authController.getApiTokenUsage
);

export default router;
