import User from '../users/user.model';
import { v4 as uuidv4 } from 'uuid';
import OTP from './otp.model';
import RefreshToken from './refreshToken.model';
import { PasswordUtil } from '../../common/utils/password';
import { TokenUtil } from '../../common/utils/token';
import { OTPUtil } from '../../common/utils/otp';
import EmailService from '../../common/utils/email';
import { publishEvent } from '../../common/broker/kafka';
import PersonalWorkspaceService from '../users/personalWorkspace.service';
import DeviceService from '../security/device.service';
import SecurityEvent from '../security/securityEvent.model';
import { AuditService } from '../audit';
import {
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

    await publishEvent('users.registered', {
      eventId: uuidv4(),
      occurredAt: new Date().toISOString(),
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    });

    // Generate OTP for email verification
    const otpCode = OTPUtil.generate();
    await OTP.create({
      user: user._id,
      code: otpCode,
      type: 'email',
      purpose: 'verification',
      expiresAt: OTPUtil.getExpiryDate(),
    });

    // Send verification email
    await EmailService.sendOTP(user.email, otpCode);

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
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
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
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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

      // Send welcome email
      await EmailService.sendWelcome(user.email, user.firstName);
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
    await EmailService.sendOTP(user.email, otpCode);
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

    // Send password reset email
    await EmailService.sendOTP(user.email, otpCode);
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
  }

  async getUserById(userId: string) {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }
}

export default AuthService;
