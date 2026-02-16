import User from '../users/user.model';
import RefreshToken from './refreshToken.model';
import DeviceService from '../security/device.service';
import SecurityEvent from '../security/securityEvent.model';
import { AuditService } from '../audit';
import { PasswordUtil } from '../../common/utils/password';
import { TokenUtil } from '../../common/utils/token';
import EmailService from '../../common/utils/email';
import { UnauthorizedError } from '../../common/errors/AppError';

interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
  deviceInfo: {
    userAgent: string;
    ipAddress: string;
    deviceFingerprint?: string;
  };
}

interface LoginResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isEmailVerified: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  requiresMfa: boolean;
  mfaSessionToken?: string;
  deviceTrusted: boolean;
  securityFlags?: string[];
}

class EnhancedAuthService {
  /**
   * Enhanced login with device tracking and security monitoring
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    const { email, password, mfaCode, deviceInfo } = request;

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      // Log failed attempt
      await this.logFailedLogin(email, deviceInfo.ipAddress, 'user_not_found');
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if account is locked
    if (user.isLocked && user.isLocked()) {
      await this.logFailedLogin(email, deviceInfo.ipAddress, 'account_locked');
      throw new UnauthorizedError('Account is locked. Please try again later or contact support.');
    }

    // Check if user is active
    if (!user.isActive) {
      await this.logFailedLogin(email, deviceInfo.ipAddress, 'account_inactive');
      throw new UnauthorizedError('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await PasswordUtil.compare(password, user.password);

    if (!isPasswordValid) {
      // Increment failed login attempts
      user.failedLoginAttempts += 1;
      user.lastFailedLoginAt = new Date();

      // Lock account after 5 failed attempts
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        await user.save();

        await this.logFailedLogin(email, deviceInfo.ipAddress, 'max_attempts_exceeded');
        throw new UnauthorizedError('Account locked due to multiple failed login attempts');
      }

      await user.save();
      await this.logFailedLogin(email, deviceInfo.ipAddress, 'invalid_password');
      throw new UnauthorizedError('Invalid email or password');
    }

    // Register/update device
    const device = await DeviceService.registerDevice(user._id.toString(), deviceInfo);

    // Detect suspicious activity
    const suspiciousFlags = await DeviceService.detectSuspiciousActivity(
      user._id.toString(),
      deviceInfo
    );

    if (suspiciousFlags.length > 0) {
      // Log security event
      await SecurityEvent.create({
        user: user._id,
        eventType: 'suspicious_login',
        severity: 'high',
        description: 'Suspicious login attempt detected',
        metadata: {
          flags: suspiciousFlags,
          device: device._id,
          ipAddress: deviceInfo.ipAddress,
        },
      });

      // Send security alert email
      await EmailService.sendSecurityAlert(user.email, {
        eventType: 'Suspicious Login Attempt',
        location: deviceInfo.ipAddress,
        device: deviceInfo.userAgent,
        timestamp: new Date(),
      });

      user.suspiciousActivityDetected = true;
      await user.save();
    }

    // Check if MFA is required
    const requiresMfa = user.isMfaEnabled;

    if (requiresMfa && !mfaCode) {
      // Generate temporary MFA session token
      const mfaSessionToken = TokenUtil.generateMfaSessionToken({
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        deviceId: device.deviceId,
      });

      return {
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
        tokens: {
          accessToken: '',
          refreshToken: '',
        },
        requiresMfa: true,
        mfaSessionToken,
        deviceTrusted: device.isTrusted,
        securityFlags: suspiciousFlags,
      };
    }

    // TODO: Verify MFA code if provided and required

    // Check if password needs rehashing (migration from bcrypt to argon2)
    if (PasswordUtil.needsRehash(user.password)) {
      user.password = await PasswordUtil.hash(password);
      user.passwordChangedAt = new Date();
    }

    // Reset failed login attempts on successful login
    user.failedLoginAttempts = 0;
    user.lastLogin = new Date();
    user.lastLoginIp = deviceInfo.ipAddress;
    user.loginCount += 1;
    await user.save();

    // Generate tokens with rotation
    const tokens = await this.generateTokensWithRotation(user._id.toString(), device._id.toString());

    // Audit log
    await AuditService.log({
      action: 'auth.login',
      resource: 'user',
      resourceId: user._id.toString(),
      userId: user._id.toString(),
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      details: {
        metadata: {
          deviceId: device._id,
          deviceTrusted: device.isTrusted,
          suspiciousFlags,
        },
      },
      risk: suspiciousFlags.length > 0 ? 'high' : 'low',
    });

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      tokens,
      requiresMfa: false,
      deviceTrusted: device.isTrusted,
      securityFlags: suspiciousFlags.length > 0 ? suspiciousFlags : undefined,
    };
  }

  /**
   * Refresh token with rotation
   */
  async refreshAccessToken(refreshToken: string, deviceInfo: { ipAddress: string; userAgent: string }): Promise<{ accessToken: string; refreshToken: string }> {
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
      // Potential token reuse attack
      await this.handleTokenReuseAttack(refreshToken);
      throw new UnauthorizedError('Invalid or revoked refresh token');
    }

    // Check if token is expired
    if (tokenDoc.expiresAt < new Date()) {
      tokenDoc.isRevoked = true;
      await tokenDoc.save();
      throw new UnauthorizedError('Refresh token expired');
    }

    // Find user
    const user = await User.findById(payload.id);

    if (!user || !user.isActive) {
      tokenDoc.isRevoked = true;
      await tokenDoc.save();
      throw new UnauthorizedError('User not found or inactive');
    }

    // Revoke old refresh token
    tokenDoc.isRevoked = true;
    tokenDoc.revokedAt = new Date();
    await tokenDoc.save();

    // Generate new token pair
    const tokens = TokenUtil.generateTokenPair({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Save new refresh token
    await RefreshToken.create({
      user: user._id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      deviceId: tokenDoc.deviceId, // Link to same device
    });

    // Audit log
    await AuditService.log({
      action: 'auth.token_refreshed',
      resource: 'refresh_token',
      userId: user._id.toString(),
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
    });

    return tokens;
  }

  /**
   * Logout - revoke refresh token
   */
  async logout(userId: string, refreshToken: string): Promise<void> {
    // Revoke the refresh token
    await RefreshToken.updateOne(
      { token: refreshToken, user: userId },
      { isRevoked: true, revokedAt: new Date() }
    );

    // Audit log
    await AuditService.log({
      action: 'auth.logout',
      resource: 'user',
      userId,
    });
  }

  /**
   * Logout from all devices
   */
  async logoutAllDevices(userId: string): Promise<void> {
    // Revoke all refresh tokens
    await RefreshToken.updateMany(
      { user: userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() }
    );

    // Audit log
    await AuditService.log({
      action: 'auth.logout_all_devices',
      resource: 'user',
      userId,
      risk: 'medium',
    });
  }

  /**
   * Generate tokens with rotation support
   */
  private async generateTokensWithRotation(userId: string, deviceId: string): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

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
      deviceId,
    });

    return tokens;
  }

  /**
   * Log failed login attempt
   */
  private async logFailedLogin(email: string, ipAddress: string, reason: string): Promise<void> {
    await SecurityEvent.create({
      eventType: 'failed_login',
      severity: 'medium',
      description: `Failed login attempt for ${email}`,
      metadata: {
        email,
        ipAddress,
        reason,
      },
    });

    await AuditService.log({
      action: 'auth.login_failed',
      resource: 'user',
      ipAddress,
      details: {
        metadata: { email, reason },
      },
      status: 'failure',
      risk: 'medium',
    });
  }

  /**
   * Handle token reuse attack (refresh token used after revocation)
   */
  private async handleTokenReuseAttack(refreshToken: string): Promise<void> {
    const token = await RefreshToken.findOne({ token: refreshToken });

    if (token) {
      // Revoke all tokens for this user (security measure)
      await RefreshToken.updateMany(
        { user: token.user, isRevoked: false },
        { isRevoked: true, revokedAt: new Date() }
      );

      // Log security event
      await SecurityEvent.create({
        user: token.user,
        eventType: 'token_reuse_detected',
        severity: 'critical',
        description: 'Refresh token reuse detected - potential security breach',
        metadata: {
          tokenId: token._id,
        },
      });

      // Send security alert
      const user = await User.findById(token.user);
      if (user) {
        await EmailService.sendSecurityAlert(user.email, {
          eventType: 'Token Reuse Detected',
          location: 'Unknown',
          device: 'Unknown',
          timestamp: new Date(),
        });
      }

      await AuditService.log({
        action: 'security.token_reuse_detected',
        resource: 'refresh_token',
        resourceId: token._id.toString(),
        userId: token.user.toString(),
        risk: 'critical',
        isSuspicious: true,
      });
    }
  }
}

export default new EnhancedAuthService();
