import User from '../users/user.model';
import OTP from './otp.model';
import RefreshToken from './refreshToken.model';
import { PasswordUtil } from '../../common/utils/password';
import { TokenUtil } from '../../common/utils/token';
import { OTPUtil } from '../../common/utils/otp';
import EmailService from '../../common/utils/email';
import logger from '../../common/utils/logger';
import notificationService from '../notifications/notification.service';
import { NotificationType, NotificationChannel, NotificationPriority } from '../notifications/notification.types';
import PersonalWorkspaceService from '../users/personalWorkspace.service';
import { AuditService } from '../audit';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
} from '../../common/errors/AppError';

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: string;
}

class AuthService {
  async register(data: RegisterData) {
    // Check if user exists
    const existingUser = await User.findOne({ email: data.email });
    
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
    const user = await User.create({
      ...data,
      password: hashedPassword,
    });

    // Create personal workspace for individual user
    try {
      await PersonalWorkspaceService.create({
        userId: user._id.toString(),
        displayName: `${user.firstName}'s Workspace`,
      });
    } catch (error) {
      // Log but don't fail registration
      console.error('Failed to create personal workspace:', error);
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
    const tokens = TokenUtil.generateTokenPair({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Save refresh token
    await RefreshToken.create({
      user: user._id,
      token: tokens.refreshToken,
      expiresAt: TokenUtil.getRefreshTokenExpiryDate(tokens.refreshToken),
    });

    // Audit log
    await AuditService.log({
      action: 'auth.register',
      resource: 'user',
      resourceId: user._id.toString(),
      userId: user._id.toString(),
      details: {
        after: {
          email: user.email,
          role: user.role,
        },
      },
    });

    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      tokens,
    };
  }

  async login(email: string, password: string) {
    // Find user with password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await PasswordUtil.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const tokens = TokenUtil.generateTokenPair({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Save refresh token
    await RefreshToken.create({
      user: user._id,
      token: tokens.refreshToken,
      expiresAt: TokenUtil.getRefreshTokenExpiryDate(tokens.refreshToken),
    });

    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    // Verify refresh token
    const payload = TokenUtil.verifyRefreshToken(refreshToken);

    // Check if token exists and is not revoked
    const tokenDoc = await RefreshToken.findOne({
      token: refreshToken,
      isRevoked: false,
    });

    if (!tokenDoc) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Find user
    const user = await User.findById(payload.id);

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }

    // Generate new tokens
    const tokens = TokenUtil.generateTokenPair({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Revoke old refresh token and save new one
    tokenDoc.isRevoked = true;
    await tokenDoc.save();

    await RefreshToken.create({
      user: user._id,
      token: tokens.refreshToken,
      expiresAt: TokenUtil.getRefreshTokenExpiryDate(tokens.refreshToken),
    });

    return tokens;
  }

  async logout(refreshToken: string) {
    await RefreshToken.updateOne(
      { token: refreshToken },
      { isRevoked: true }
    );
  }

  async verifyOTP(email: string, code: string, purpose: string) {
    const user = await User.findOne({ email });

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
      user: {
        id: user._id,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  async resendOTP(email: string, purpose: string) {
    const user = await User.findOne({ email });

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
    const user = await User.findOne({ email });

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
    const user = await User.findOne({ email });

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

    // Hash and update password
    user.password = await PasswordUtil.hash(newPassword);
    await user.save();

    // Mark OTP as used
    otp.isUsed = true;
    await otp.save();

    // Revoke all refresh tokens
    await RefreshToken.updateMany(
      { user: user._id, isRevoked: false },
      { isRevoked: true }
    );

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
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
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
