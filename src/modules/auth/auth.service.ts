import User, { IUser, IUserProfile, UserRole } from '../users/user.model';
import OTP from './otp.model';
import RefreshToken from './refreshToken.model';
import ImpersonationSession from './impersonationSession.model';
import SuperAdminGrant from './superAdminGrant.model';
import { randomUUID } from 'crypto';
import { PasswordUtil } from '../../common/utils/password';
import { TokenUtil } from '../../common/utils/token';
import { OTPUtil } from '../../common/utils/otp';
import EmailService from '../../common/utils/email';
import logger from '../../common/utils/logger';
import notificationService from '../notifications/notification.service';
import { NotificationType, NotificationChannel, NotificationPriority } from '../notifications/notification.types';
import PersonalWorkspaceService from '../users/personalWorkspace.service';
import { AuditService } from '../audit';
import Farmer from '../farmers/farmer.model';
import OrganizationMember from '../organizations/organizationMember.model';
import OrganizationService from '../organizations/organization.service';
import { isSuperAdminRole } from '../../common/middleware/superAdmin';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../../common/errors/AppError';

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: 'farmer' | 'buyer' | 'expert' | 'trader';
  timezone?: string;
  language?: string;
  profileImage?: string;
  bio?: string;
  profile?: Partial<IUserProfile>;
}

interface LoginContext {
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
}

interface AuthUserResponse {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  profileImage?: string;
  bio?: string;
  timezone?: string;
  language?: string;
  profile?: IUserProfile;
  lastLogin?: Date;
  lastActiveAt?: Date;
  loginCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthSecurityState {
  isMfaEnabled: boolean;
  passwordResetRequired: boolean;
  requiresIdentityVerification: boolean;
  suspiciousActivityDetected: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  isLocked: boolean;
}

interface LoginResponse {
  user: AuthUserResponse;
  security: AuthSecurityState;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  };
}

interface UpdateMyProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  timezone?: string;
  language?: string;
  profileImage?: string;
  bio?: string;
  profile?: Partial<IUserProfile>;
}

interface CreateSuperAdminTokenInput {
  actorId: string;
  scopes: string[];
  reason: string;
  expiresInMinutes?: number;
}

interface RevokeSuperAdminTokenInput {
  actorId: string;
  grantId: string;
  reason: string;
}

interface StartImpersonationInput {
  actorId: string;
  targetUserId: string;
  reason: string;
  scopes?: string[];
  ttlMinutes?: number;
  context?: LoginContext;
}

interface RevokeImpersonationInput {
  actorId: string;
  sessionId: string;
  reason: string;
}

class AuthService {
  private readonly MAX_FAILED_LOGIN_ATTEMPTS = 5;
  private readonly ACCOUNT_LOCK_DURATION_MS = 30 * 60 * 1000;
  private readonly MAX_ACTIVE_REFRESH_TOKENS = 10;
  private readonly MAX_IMPERSONATION_TTL_MINUTES = 60;
  private readonly DEFAULT_IMPERSONATION_TTL_MINUTES = 15;
  private readonly MAX_SUPER_ADMIN_TOKEN_TTL_MINUTES = 30;
  private readonly DEFAULT_SUPER_ADMIN_TOKEN_TTL_MINUTES = 10;

  async register(data: RegisterData, context: LoginContext = {}) {
    const normalizedEmail = this.normalizeEmail(data.email);

    // Check if user exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Validate password
    const passwordValidation = PasswordUtil.validate(data.password);
    if (!passwordValidation.valid) {
      throw new BadRequestError('Password validation failed', passwordValidation.errors);
    }

    // Hash password
    const hashedPassword = await PasswordUtil.hash(data.password);

    // Create user
    const role: UserRole = data.role || 'farmer';

    const profile = this.mergeProfile(undefined, data.profile || {});
    profile.displayName = profile.displayName || `${data.firstName} ${data.lastName}`.trim();
    this.ensureComplianceDates(profile);
    profile.completionScore = this.calculateProfileCompletion(
      {
        email: normalizedEmail,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      },
      profile
    );
    profile.lastProfileUpdateAt = new Date();

    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phone: data.phone,
      role,
      timezone: data.timezone || 'UTC',
      language: data.language || 'en',
      profileImage: data.profileImage,
      bio: data.bio,
      profile,
      lastActiveAt: new Date(),
    });

    // Every user must belong to an organization; default to "clycites"
    await OrganizationService.ensureDefaultOrganizationMembership(user._id.toString());

    // Create personal workspace for individual user
    try {
      await PersonalWorkspaceService.create({
        userId: user._id.toString(),
        displayName: `${user.firstName}'s Workspace`,
      });
    } catch (error) {
      // Log but don't fail registration
      logger.warn(`Failed to create personal workspace: ${error}`);
    }

    // Fire-and-forget — send a welcome in-app notification; non-fatal
    notificationService.createNotification({
      user:     user._id.toString(),
      type:     NotificationType.SYSTEM_ANNOUNCEMENT,
      title:    'Welcome to ClyCites!',
      message:  `Hi ${user.firstName}, your account has been created. Please verify your email to get started.`,
      priority: NotificationPriority.MEDIUM,
      channels: [NotificationChannel.IN_APP],
      sourceService: 'auth',
    }).catch(err => logger.warn(`[AuthService] Welcome notification failed: ${err}`));

    // Generate OTP for email verification
    const otpCode = OTPUtil.generate();
    await OTP.create({
      user: user._id,
      code: otpCode,
      type: 'email',
      purpose: 'verification',
      expiresAt: OTPUtil.getExpiryDate(),
    });

    // Send verification email — non-fatal: registration succeeds even if email delivery fails
    try {
      await EmailService.sendOTP(user.email, otpCode);
    } catch (emailError) {
      logger.warn(`Verification email could not be sent to ${user.email}: ${emailError}`);
    }

    // Generate tokens
    const tokens = await this.generateAndStoreTokenPair(user, context.deviceId);

    // Audit log
    await AuditService.log({
      action: 'auth.register',
      resource: 'user',
      resourceId: user._id.toString(),
      userId: user._id.toString(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      details: {
        after: {
          email: user.email,
          role: user.role,
          profileCompletionScore: user.profile?.completionScore || 0,
        },
      },
    });

    return {
      user: this.buildAuthUser(user),
      security: this.buildSecurityState(user),
      onboarding: {
        profileCompletionScore: user.profile?.completionScore || 0,
        requiresEmailVerification: !user.isEmailVerified,
      },
      tokens,
    };
  }

  async login(email: string, password: string, context: LoginContext = {}): Promise<LoginResponse> {
    const normalizedEmail = this.normalizeEmail(email);

    // Find user with password field
    const user = await User.findOne({ email: normalizedEmail, deletedAt: null }).select('+password');

    if (!user) {
      await AuditService.log({
        action: 'auth.login_failed',
        resource: 'user',
        status: 'failure',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        details: {
          metadata: {
            email: normalizedEmail,
            reason: 'user_not_found',
          },
        },
        risk: 'medium',
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.isLocked()) {
      throw new UnauthorizedError('Account is temporarily locked due to failed login attempts');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await PasswordUtil.compare(password, user.password);

    if (!isPasswordValid) {
      const isNowLocked = await this.recordFailedLogin(user, context);

      if (isNowLocked) {
        throw new UnauthorizedError('Account locked due to multiple failed login attempts');
      }

      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.passwordResetRequired) {
      throw new UnauthorizedError('Password reset required. Please reset your password to continue');
    }

    if (PasswordUtil.needsRehash(user.password)) {
      user.password = await PasswordUtil.hash(password);
      user.passwordChangedAt = new Date();
    }

    // Update login security state
    user.failedLoginAttempts = 0;
    user.lastFailedLoginAt = undefined;
    user.lockedUntil = undefined;
    user.lastLoginIp = context.ipAddress;
    user.lastLogin = new Date();
    user.lastActiveAt = new Date();
    user.loginCount += 1;
    await user.save();

    const tokens = await this.generateAndStoreTokenPair(user, context.deviceId);

    await AuditService.log({
      action: 'auth.login',
      resource: 'user',
      resourceId: user._id.toString(),
      userId: user._id.toString(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      details: {
        metadata: {
          loginCount: user.loginCount,
        },
      },
      risk: 'low',
    });

    return {
      user: this.buildAuthUser(user),
      security: this.buildSecurityState(user),
      tokens,
    };
  }

  async refreshToken(refreshToken: string, context: LoginContext = {}) {
    // Verify refresh token
    let payload;
    try {
      payload = TokenUtil.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if token exists and is not revoked
    const tokenDoc = await RefreshToken.findOne({
      token: refreshToken,
      isRevoked: false,
    });

    if (!tokenDoc) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (tokenDoc.expiresAt < new Date()) {
      tokenDoc.isRevoked = true;
      tokenDoc.revokedAt = new Date();
      await tokenDoc.save();
      throw new UnauthorizedError('Refresh token expired');
    }

    // Find user
    const user = await User.findOne({ _id: payload.id, deletedAt: null });

    if (!user || !user.isActive) {
      tokenDoc.isRevoked = true;
      tokenDoc.revokedAt = new Date();
      await tokenDoc.save();
      throw new UnauthorizedError('User not found or inactive');
    }

    // Revoke old refresh token and save new one
    tokenDoc.isRevoked = true;
    tokenDoc.revokedAt = new Date();
    await tokenDoc.save();

    const tokens = await this.generateAndStoreTokenPair(user, tokenDoc.deviceId || context.deviceId);

    await AuditService.log({
      action: 'auth.token_refreshed',
      resource: 'refresh_token',
      resourceId: tokenDoc._id.toString(),
      userId: user._id.toString(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return tokens;
  }

  async logout(refreshToken: string, context: LoginContext = {}) {
    const tokenDoc = await RefreshToken.findOneAndUpdate(
      { token: refreshToken },
      { isRevoked: true, revokedAt: new Date() },
      { new: true }
    );

    if (tokenDoc) {
      await AuditService.log({
        action: 'auth.logout',
        resource: 'refresh_token',
        resourceId: tokenDoc._id.toString(),
        userId: tokenDoc.user.toString(),
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    }
  }

  async verifyOTP(email: string, code: string, purpose: string) {
    const user = await User.findOne({ email: this.normalizeEmail(email), deletedAt: null });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Find valid OTP
    const otp = await OTP.findOne({
      user: user._id,
      code,
      purpose,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otp) {
      await this.incrementOtpAttempts(user._id.toString(), purpose);
      throw new BadRequestError('Invalid or expired OTP');
    }

    // Check max attempts
    if (otp.attempts >= 5) {
      throw new BadRequestError('Maximum OTP attempts exceeded');
    }

    // Mark OTP as used
    otp.isUsed = true;
    await otp.save();

    // Update user verification status
    if (purpose === 'verification') {
      user.isEmailVerified = true;
      user.emailVerifiedAt = new Date();
      await user.save();

      // Send welcome email (non-fatal)
      try {
        await EmailService.sendWelcome(user.email, user.firstName);
      } catch (emailError) {
        logger.warn(`Welcome email could not be sent to ${user.email}: ${emailError}`);
      }

      // In-app account-verified notification (fire-and-forget)
      notificationService.createNotification({
        user:     user._id.toString(),
        type:     NotificationType.ACCOUNT_VERIFIED,
        title:    'Email Verified',
        message:  'Your email address has been successfully verified. You now have full access to ClyCites.',
        priority: NotificationPriority.MEDIUM,
        channels: [NotificationChannel.IN_APP],
        sourceService: 'auth',
      }).catch(err => logger.warn(`[AuthService] Account-verified notification failed: ${err}`));
    }

    return {
      verified: true,
      user: this.buildAuthUser(user),
      security: this.buildSecurityState(user),
    };
  }

  async resendOTP(email: string, purpose: string) {
    const user = await User.findOne({ email: this.normalizeEmail(email), deletedAt: null });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Invalidate previous OTPs
    await OTP.updateMany(
      {
        user: user._id,
        purpose,
        isUsed: false,
      },
      { isUsed: true }
    );

    // Generate new OTP
    const otpCode = OTPUtil.generate();
    await OTP.create({
      user: user._id,
      code: otpCode,
      type: 'email',
      purpose,
      expiresAt: OTPUtil.getExpiryDate(),
    });

    // Send OTP
    try {
      await EmailService.sendOTP(user.email, otpCode);
    } catch (emailError) {
      logger.warn(`OTP email could not be sent to ${user.email}: ${emailError}`);
      throw new AppError('Email service is temporarily unavailable. Please try again later.', 503, 'EMAIL_UNAVAILABLE');
    }
  }

  async forgotPassword(email: string) {
    const user = await User.findOne({ email: this.normalizeEmail(email), deletedAt: null });

    if (!user) {
      // Don't reveal if user exists
      return;
    }

    // Generate OTP
    const otpCode = OTPUtil.generate();
    await OTP.create({
      user: user._id,
      code: otpCode,
      type: 'email',
      purpose: 'password_reset',
      expiresAt: OTPUtil.getExpiryDate(),
    });

    // Send password reset email (non-fatal — don't reveal delivery status for security)
    try {
      await EmailService.sendOTP(user.email, otpCode);
    } catch (emailError) {
      logger.warn(`Password reset email could not be sent to ${user.email}: ${emailError}`);
    }
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await User.findOne({ email: this.normalizeEmail(email), deletedAt: null }).select('+password');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify OTP
    const otp = await OTP.findOne({
      user: user._id,
      code,
      purpose: 'password_reset',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otp) {
      await this.incrementOtpAttempts(user._id.toString(), 'password_reset');
      throw new BadRequestError('Invalid or expired OTP');
    }

    // Validate new password
    const passwordValidation = PasswordUtil.validate(newPassword);
    if (!passwordValidation.valid) {
      throw new BadRequestError('Password validation failed', passwordValidation.errors);
    }

    if (await PasswordUtil.compare(newPassword, user.password)) {
      throw new BadRequestError('New password must be different from the current password');
    }

    // Hash and update password
    user.password = await PasswordUtil.hash(newPassword);
    user.passwordChangedAt = new Date();
    user.passwordResetRequired = false;
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    await user.save();

    // Mark OTP as used
    otp.isUsed = true;
    await otp.save();

    // Revoke all refresh tokens
    await RefreshToken.updateMany(
      { user: user._id, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() }
    );

    await AuditService.log({
      action: 'auth.password_reset',
      resource: 'user',
      resourceId: user._id.toString(),
      userId: user._id.toString(),
      risk: 'high',
    });

    // Notify user of password change (fire-and-forget)
    notificationService.createNotification({
      user:     user._id.toString(),
      type:     NotificationType.PASSWORD_CHANGED,
      title:    'Password Changed',
      message:  'Your password has been successfully reset. If you did not do this, please contact support immediately.',
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      sourceService: 'auth',
    }).catch(err => logger.warn(`[AuthService] Password-changed notification failed: ${err}`));
  }

  async getUserById(userId: string) {
    const user = await User.findOne({ _id: userId, deletedAt: null });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      user: this.buildAuthUser(user),
      security: this.buildSecurityState(user),
    };
  }

  async updateMyProfile(userId: string, data: UpdateMyProfileData, context: LoginContext = {}) {
    const user = await User.findOne({ _id: userId, deletedAt: null });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const beforeState = this.toAuditSnapshot(user);
    const changedFields: string[] = [];

    if (data.firstName !== undefined) {
      user.firstName = data.firstName.trim();
      changedFields.push('firstName');
    }

    if (data.lastName !== undefined) {
      user.lastName = data.lastName.trim();
      changedFields.push('lastName');
    }

    if (data.phone !== undefined && data.phone !== user.phone) {
      user.phone = data.phone;
      user.isPhoneVerified = false;
      user.phoneVerifiedAt = undefined;
      changedFields.push('phone', 'isPhoneVerified');
    }

    if (data.timezone !== undefined) {
      user.timezone = data.timezone;
      changedFields.push('timezone');
    }

    if (data.language !== undefined) {
      user.language = data.language;
      changedFields.push('language');
    }

    if (data.profileImage !== undefined) {
      user.profileImage = data.profileImage;
      changedFields.push('profileImage');
    }

    if (data.bio !== undefined) {
      user.bio = data.bio;
      changedFields.push('bio');
    }

    if (data.profile) {
      const mergedProfile = this.mergeProfile(user.profile, data.profile);
      if (!mergedProfile.displayName) {
        mergedProfile.displayName = `${user.firstName} ${user.lastName}`.trim();
      }
      this.ensureComplianceDates(mergedProfile);
      mergedProfile.completionScore = this.calculateProfileCompletion(user, mergedProfile);
      mergedProfile.lastProfileUpdateAt = new Date();

      user.profile = mergedProfile;
      changedFields.push('profile');
    } else if (changedFields.some(field => ['firstName', 'lastName', 'phone'].includes(field))) {
      const mergedProfile = this.mergeProfile(user.profile, {});
      if (!mergedProfile.displayName) {
        mergedProfile.displayName = `${user.firstName} ${user.lastName}`.trim();
      }
      mergedProfile.completionScore = this.calculateProfileCompletion(user, mergedProfile);
      mergedProfile.lastProfileUpdateAt = new Date();
      user.profile = mergedProfile;
      changedFields.push('profile');
    }

    if (changedFields.length === 0) {
      throw new BadRequestError('No valid fields provided for profile update');
    }

    await user.save();

    await AuditService.log({
      action: 'auth.profile_updated',
      resource: 'user',
      resourceId: user._id.toString(),
      userId: user._id.toString(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      details: {
        before: beforeState,
        after: this.toAuditSnapshot(user),
        metadata: { changedFields },
      },
      risk: 'low',
    });

    return {
      user: this.buildAuthUser(user),
      security: this.buildSecurityState(user),
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    context: LoginContext = {}
  ): Promise<void> {
    const user = await User.findOne({ _id: userId, deletedAt: null }).select('+password');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isCurrentPasswordValid = await PasswordUtil.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const passwordValidation = PasswordUtil.validate(newPassword);
    if (!passwordValidation.valid) {
      throw new BadRequestError('Password validation failed', passwordValidation.errors);
    }

    if (await PasswordUtil.compare(newPassword, user.password)) {
      throw new BadRequestError('New password must be different from the current password');
    }

    user.password = await PasswordUtil.hash(newPassword);
    user.passwordChangedAt = new Date();
    user.passwordResetRequired = false;
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    await user.save();

    // Revoke all existing sessions after password change
    await RefreshToken.updateMany(
      { user: user._id, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() }
    );

    await AuditService.log({
      action: 'auth.password_changed',
      resource: 'user',
      resourceId: user._id.toString(),
      userId: user._id.toString(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      risk: 'high',
    });

    // Notify user of password change (fire-and-forget)
    notificationService.createNotification({
      user:     user._id.toString(),
      type:     NotificationType.PASSWORD_CHANGED,
      title:    'Password Changed',
      message:  'Your password has been changed successfully. If you did not initiate this action, contact support immediately.',
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      sourceService: 'auth',
    }).catch(err => logger.warn(`[AuthService] Password-changed notification failed: ${err}`));
  }

  async createScopedSuperAdminToken(
    input: CreateSuperAdminTokenInput,
    context: LoginContext = {}
  ) {
    const actor = await this.assertSuperAdminActor(input.actorId);
    const reason = input.reason.trim();
    if (reason.length < 3) {
      throw new BadRequestError('A clear reason is required to create a Super Admin scoped token');
    }

    const scopes = Array.from(new Set(input.scopes.map((scope) => scope.trim()).filter(Boolean)));
    if (scopes.length === 0) {
      throw new BadRequestError('At least one scope is required');
    }

    const ttlMinutes = Math.min(
      this.MAX_SUPER_ADMIN_TOKEN_TTL_MINUTES,
      Math.max(1, input.expiresInMinutes || this.DEFAULT_SUPER_ADMIN_TOKEN_TTL_MINUTES)
    );

    const grantId = randomUUID();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await SuperAdminGrant.create({
      grantId,
      actorUser: actor._id,
      scopes,
      reason,
      expiresAt,
      isActive: true,
    });

    const token = TokenUtil.generateScopedSuperAdminToken(
      {
        id: actor._id.toString(),
        email: actor.email,
        role: actor.role,
        superAdminGrantId: grantId,
        superAdminScopes: scopes,
      },
      `${ttlMinutes}m`
    );

    await AuditService.log({
      action: 'super_admin.token_created',
      resource: 'super_admin_grant',
      resourceId: grantId,
      userId: actor._id.toString(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      risk: 'critical',
      details: {
        metadata: {
          actorId: actor._id.toString(),
          targetId: actor._id.toString(),
          action: 'super_admin.token_created',
          reason,
          timestamp: new Date().toISOString(),
          scopes,
          expiresAt: expiresAt.toISOString(),
        },
      },
    });

    return {
      grantId,
      token,
      scopes,
      expiresAt: expiresAt.toISOString(),
      ttlMinutes,
    };
  }

  async revokeScopedSuperAdminToken(
    input: RevokeSuperAdminTokenInput,
    context: LoginContext = {}
  ): Promise<void> {
    const actor = await this.assertSuperAdminActor(input.actorId);
    const reason = input.reason.trim();
    if (reason.length < 3) {
      throw new BadRequestError('A clear reason is required to revoke a Super Admin scoped token');
    }

    const grant = await SuperAdminGrant.findOne({
      grantId: input.grantId,
      isActive: true,
    });

    if (!grant) {
      throw new NotFoundError('Super Admin scoped token not found or already revoked');
    }

    grant.isActive = false;
    grant.revokedAt = new Date();
    grant.revokedBy = actor._id;
    grant.revokeReason = reason;
    await grant.save();

    await AuditService.log({
      action: 'super_admin.token_revoked',
      resource: 'super_admin_grant',
      resourceId: grant.grantId,
      userId: actor._id.toString(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      risk: 'critical',
      details: {
        metadata: {
          actorId: actor._id.toString(),
          targetId: grant.grantId,
          action: 'super_admin.token_revoked',
          reason,
          timestamp: new Date().toISOString(),
          scopes: grant.scopes,
        },
      },
    });
  }

  async listScopedSuperAdminTokens(actorId: string) {
    const actor = await this.assertSuperAdminActor(actorId);

    const grants = await SuperAdminGrant.find({
      actorUser: actor._id,
    }).sort({ createdAt: -1 });

    return grants.map((grant) => ({
      grantId: grant.grantId,
      scopes: grant.scopes,
      reason: grant.reason,
      isActive: grant.isActive && !grant.revokedAt && grant.expiresAt > new Date(),
      expiresAt: grant.expiresAt,
      revokedAt: grant.revokedAt,
      revokeReason: grant.revokeReason,
      createdAt: grant.createdAt,
    }));
  }

  async startImpersonationSession(input: StartImpersonationInput) {
    const actor = await this.assertSuperAdminActor(input.actorId);
    const reason = input.reason.trim();
    if (reason.length < 3) {
      throw new BadRequestError('A clear reason is required to start impersonation');
    }

    if (input.actorId === input.targetUserId) {
      throw new BadRequestError('Super Admin cannot impersonate themselves');
    }

    const targetUser = await User.findOne({ _id: input.targetUserId, deletedAt: null });
    if (!targetUser || !targetUser.isActive) {
      throw new NotFoundError('Target user not found or inactive');
    }

    const ttlMinutes = Math.min(
      this.MAX_IMPERSONATION_TTL_MINUTES,
      Math.max(1, input.ttlMinutes || this.DEFAULT_IMPERSONATION_TTL_MINUTES)
    );

    const scopes = Array.from(new Set((input.scopes || []).map((scope) => scope.trim()).filter(Boolean)));
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    const farmerId = await this.resolveFarmerId(targetUser._id.toString());

    await ImpersonationSession.create({
      sessionId,
      actorUser: actor._id,
      targetUser: targetUser._id,
      reason,
      scopes,
      startedAt: new Date(),
      expiresAt,
      isActive: true,
      metadata: {
        ipAddress: input.context?.ipAddress,
        userAgent: input.context?.userAgent,
      },
    });

    const accessToken = TokenUtil.generateImpersonationToken(
      {
        id: targetUser._id.toString(),
        email: targetUser.email,
        role: targetUser.role,
        farmerId,
        impersonationSessionId: sessionId,
        impersonatedBy: actor._id.toString(),
        impersonationReason: reason,
        impersonationExpiresAt: expiresAt.toISOString(),
        superAdminScopes: scopes,
      },
      `${ttlMinutes}m`
    );

    await AuditService.log({
      action: 'super_admin.impersonation_started',
      resource: 'user',
      resourceId: targetUser._id.toString(),
      userId: actor._id.toString(),
      ipAddress: input.context?.ipAddress,
      userAgent: input.context?.userAgent,
      risk: 'critical',
      details: {
        metadata: {
          actorId: actor._id.toString(),
          targetId: targetUser._id.toString(),
          action: 'super_admin.impersonation_started',
          reason,
          timestamp: new Date().toISOString(),
          sessionId,
          scopes,
          expiresAt: expiresAt.toISOString(),
        },
      },
    });

    return {
      sessionId,
      accessToken,
      expiresAt: expiresAt.toISOString(),
      ttlMinutes,
      impersonatedUser: {
        id: targetUser._id.toString(),
        email: targetUser.email,
        role: targetUser.role,
      },
    };
  }

  async revokeImpersonationSession(
    input: RevokeImpersonationInput,
    context: LoginContext = {}
  ): Promise<void> {
    const actor = await this.assertSuperAdminActor(input.actorId);
    const reason = input.reason.trim();
    if (reason.length < 3) {
      throw new BadRequestError('A clear reason is required to revoke impersonation');
    }

    const session = await ImpersonationSession.findOne({
      sessionId: input.sessionId,
      isActive: true,
    });

    if (!session) {
      throw new NotFoundError('Impersonation session not found or already revoked');
    }

    session.isActive = false;
    session.revokedAt = new Date();
    session.revokedBy = actor._id;
    session.revokeReason = reason;
    await session.save();

    await AuditService.log({
      action: 'super_admin.impersonation_revoked',
      resource: 'impersonation_session',
      resourceId: session.sessionId,
      userId: actor._id.toString(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      risk: 'critical',
      details: {
        metadata: {
          actorId: actor._id.toString(),
          targetId: session.targetUser.toString(),
          action: 'super_admin.impersonation_revoked',
          reason,
          timestamp: new Date().toISOString(),
          sessionId: session.sessionId,
        },
      },
    });
  }

  async listImpersonationSessions(actorId: string) {
    const actor = await this.assertSuperAdminActor(actorId);

    const sessions = await ImpersonationSession.find({
      actorUser: actor._id,
    })
      .populate('targetUser', 'email firstName lastName role')
      .sort({ createdAt: -1 })
      .limit(100);

    return sessions.map((session) => ({
      sessionId: session.sessionId,
      reason: session.reason,
      scopes: session.scopes,
      startedAt: session.startedAt,
      expiresAt: session.expiresAt,
      isActive: session.isActive && !session.revokedAt && session.expiresAt > new Date(),
      revokedAt: session.revokedAt,
      revokeReason: session.revokeReason,
      targetUser: session.targetUser,
    }));
  }

  private async generateAndStoreTokenPair(user: IUser, deviceId?: string) {
    const farmerId = await this.resolveFarmerId(user._id.toString());
    const orgId = await this.resolvePrimaryOrganizationId(user._id.toString());

    const tokens = TokenUtil.generateTokenPair({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      farmerId,
      orgId,
    });

    await RefreshToken.create({
      user: user._id,
      token: tokens.refreshToken,
      expiresAt: TokenUtil.getRefreshTokenExpiryDate(tokens.refreshToken),
      deviceId,
    });

    await this.pruneRefreshTokens(user._id.toString());

    return tokens;
  }

  private async pruneRefreshTokens(userId: string): Promise<void> {
    const activeTokens = await RefreshToken.find({
      user: userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (activeTokens.length <= this.MAX_ACTIVE_REFRESH_TOKENS) {
      return;
    }

    const staleTokenIds = activeTokens
      .slice(this.MAX_ACTIVE_REFRESH_TOKENS)
      .map(token => token._id);

    await RefreshToken.updateMany(
      { _id: { $in: staleTokenIds } },
      { isRevoked: true, revokedAt: new Date() }
    );
  }

  private async assertSuperAdminActor(actorId: string): Promise<IUser> {
    const actor = await User.findOne({ _id: actorId, deletedAt: null });
    if (!actor || !actor.isActive) {
      throw new UnauthorizedError('Actor not found or inactive');
    }

    if (!isSuperAdminRole(actor.role)) {
      throw new ForbiddenError('Only Super Admin users can perform this action');
    }

    return actor;
  }

  private async resolveFarmerId(userId: string): Promise<string | undefined> {
    const farmer = await Farmer.findOne({ user: userId }).select('_id').lean();
    return farmer?._id ? farmer._id.toString() : undefined;
  }

  private async resolvePrimaryOrganizationId(userId: string): Promise<string | undefined> {
    const existingMembership = await OrganizationMember.findOne({
      user: userId,
      status: 'active',
    })
      .sort({ joinedAt: 1, createdAt: 1 })
      .select('organization')
      .lean<{ organization?: { toString: () => string } }>();

    if (existingMembership?.organization) {
      return existingMembership.organization.toString();
    }

    const ensured = await OrganizationService.ensureDefaultOrganizationMembership(userId);
    return ensured.organization._id.toString();
  }

  private async recordFailedLogin(user: IUser, context: LoginContext): Promise<boolean> {
    user.failedLoginAttempts += 1;
    user.lastFailedLoginAt = new Date();

    let isNowLocked = false;
    if (user.failedLoginAttempts >= this.MAX_FAILED_LOGIN_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + this.ACCOUNT_LOCK_DURATION_MS);
      user.suspiciousActivityDetected = true;
      isNowLocked = true;
    }

    await user.save();

    await AuditService.log({
      action: 'auth.login_failed',
      resource: 'user',
      resourceId: user._id.toString(),
      userId: user._id.toString(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      status: 'failure',
      details: {
        metadata: {
          failedLoginAttempts: user.failedLoginAttempts,
          isNowLocked,
        },
      },
      risk: isNowLocked ? 'high' : 'medium',
      isSuspicious: isNowLocked,
    });

    return isNowLocked;
  }

  private buildAuthUser(user: IUser): AuthUserResponse {
    return {
      id: user._id.toString(),
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      profileImage: user.profileImage,
      bio: user.bio,
      timezone: user.timezone,
      language: user.language,
      profile: user.profile,
      lastLogin: user.lastLogin,
      lastActiveAt: user.lastActiveAt,
      loginCount: user.loginCount,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private buildSecurityState(user: IUser): AuthSecurityState {
    return {
      isMfaEnabled: user.isMfaEnabled,
      passwordResetRequired: user.passwordResetRequired,
      requiresIdentityVerification: user.requiresIdentityVerification,
      suspiciousActivityDetected: user.suspiciousActivityDetected,
      failedLoginAttempts: user.failedLoginAttempts,
      lockedUntil: user.lockedUntil,
      isLocked: user.isLocked(),
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private mergeProfile(
    currentProfile: IUserProfile | undefined,
    updates: Partial<IUserProfile>
  ): IUserProfile {
    const base = this.toPlainProfile(currentProfile);

    return {
      ...base,
      ...updates,
      address: {
        ...(base.address || {}),
        ...(updates.address || {}),
      },
      billingAddress: {
        ...(base.billingAddress || {}),
        ...(updates.billingAddress || {}),
      },
      identity: {
        ...(base.identity || {}),
        ...(updates.identity || {}),
      },
      professional: {
        ...(base.professional || {}),
        ...(updates.professional || {}),
      },
      social: {
        ...(base.social || {}),
        ...(updates.social || {}),
      },
      emergencyContact: {
        ...(base.emergencyContact || {}),
        ...(updates.emergencyContact || {}),
      },
      preferences: {
        ...(base.preferences || {}),
        ...(updates.preferences || {}),
        notifications: {
          ...(base.preferences?.notifications || {}),
          ...(updates.preferences?.notifications || {}),
        },
      },
      compliance: {
        ...(base.compliance || {}),
        ...(updates.compliance || {}),
      },
      tags: updates.tags !== undefined ? updates.tags : base.tags,
      customAttributes:
        updates.customAttributes !== undefined
          ? updates.customAttributes
          : base.customAttributes,
    };
  }

  private ensureComplianceDates(profile: IUserProfile): void {
    if (!profile.compliance) {
      return;
    }

    const now = new Date();
    const compliance = profile.compliance;

    if (compliance.termsAccepted && !compliance.termsAcceptedAt) {
      compliance.termsAcceptedAt = now;
    }
    if (compliance.privacyPolicyAccepted && !compliance.privacyPolicyAcceptedAt) {
      compliance.privacyPolicyAcceptedAt = now;
    }
    if (compliance.dataProcessingConsent && !compliance.dataProcessingConsentAt) {
      compliance.dataProcessingConsentAt = now;
    }
    if (compliance.gdprConsent && !compliance.gdprConsentAt) {
      compliance.gdprConsentAt = now;
    }

    compliance.lastConsentUpdateAt = now;
  }

  private calculateProfileCompletion(
    user: Pick<IUser, 'email' | 'firstName' | 'lastName' | 'phone'>,
    profile: IUserProfile
  ): number {
    const checks = [
      !!user.firstName,
      !!user.lastName,
      !!user.email,
      !!user.phone,
      !!profile.displayName,
      !!profile.dateOfBirth,
      !!profile.address?.country,
      !!profile.address?.city,
      !!profile.identity?.documentType,
      !!profile.identity?.documentNumber,
      profile.identity?.kycStatus === 'verified',
      !!profile.professional?.jobTitle,
      !!profile.emergencyContact?.name,
      !!profile.emergencyContact?.phone,
      !!profile.preferences?.preferredContactMethod,
      !!profile.compliance?.termsAccepted,
      !!profile.compliance?.privacyPolicyAccepted,
    ];

    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }

  private toPlainProfile(profile?: IUserProfile): IUserProfile {
    if (!profile) {
      return {};
    }

    return JSON.parse(JSON.stringify(profile)) as IUserProfile;
  }

  private toAuditSnapshot(user: IUser): Record<string, unknown> {
    return {
      id: user._id.toString(),
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      profileImage: user.profileImage,
      bio: user.bio,
      timezone: user.timezone,
      language: user.language,
      profile: user.profile,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      updatedAt: user.updatedAt,
    };
  }

  private async incrementOtpAttempts(userId: string, purpose: string): Promise<void> {
    const otp = await OTP.findOne({
      user: userId,
      purpose,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otp) {
      return;
    }

    otp.attempts += 1;
    if (otp.attempts >= 5) {
      otp.isUsed = true;
    }

    await otp.save();
  }
}

export default AuthService;
