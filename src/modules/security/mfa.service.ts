import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import MFASecret from './mfaSecret.model';
import User from '../users/user.model';
import Organization from '../organizations/organization.model';
import OTP from '../auth/otp.model';
import { OTPUtil } from '../../common/utils/otp';
import { PasswordUtil } from '../../common/utils/password';
import EmailService from '../../common/utils/email';
import AuditService from '../audit/audit.service';
import {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} from '../../common/errors/AppError';

class MFAService {
  /**
   * Setup TOTP (Authenticator app)
   */
  async setupTOTP(userId: string): Promise<{ secret: string; qrCode: string }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `ClyCites (${user.email})`,
      issuer: 'ClyCites',
      length: 32,
    });

    // Get or create MFA record
    let mfaSecret = await MFASecret.findOne({ user: userId }).select('+totpSecret');
    
    if (!mfaSecret) {
      mfaSecret = new MFASecret({
        user: userId,
        totpSecret: secret.base32,
        totpEnabled: false,
      });
    } else {
      mfaSecret.totpSecret = secret.base32;
      mfaSecret.totpEnabled = false;
    }

    await mfaSecret.save();

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    // Audit log
    await AuditService.log({
      action: 'mfa.totp.setup',
      resource: 'mfa',
      userId,
      details: {
        metadata: { type: 'totp' },
      },
      risk: 'medium',
    });

    return {
      secret: secret.base32,
      qrCode,
    };
  }

  /**
   * Verify and enable TOTP
   */
  async verifyAndEnableTOTP(userId: string, token: string): Promise<{ backupCodes: string[] }> {
    const mfaSecret = await MFASecret.findOne({ user: userId }).select('+totpSecret +backupCodes');
    
    if (!mfaSecret || !mfaSecret.totpSecret) {
      throw new BadRequestError('MFA not set up. Please set up MFA first.');
    }

    // Verify token
    const isValid = speakeasy.totp.verify({
      secret: mfaSecret.totpSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!isValid) {
      throw new UnauthorizedError('Invalid verification code');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedCodes = await Promise.all(
      backupCodes.map(code => this.hashBackupCode(code))
    );

    // Enable TOTP
    mfaSecret.totpEnabled = true;
    mfaSecret.totpVerifiedAt = new Date();
    mfaSecret.backupCodes = hashedCodes;
    mfaSecret.isActive = true;
    await mfaSecret.save();

    // Update user
    await User.findByIdAndUpdate(userId, { isMfaEnabled: true });

    // Audit log
    await AuditService.log({
      action: 'mfa.totp.enabled',
      resource: 'mfa',
      userId,
      details: {
        metadata: { type: 'totp', backupCodesGenerated: backupCodes.length },
      },
      risk: 'medium',
    });

    return { backupCodes };
  }

  /**
   * Verify TOTP token
   */
  async verifyTOTP(userId: string, token: string): Promise<boolean> {
    const mfaSecret = await MFASecret.findOne({ 
      user: userId,
      totpEnabled: true,
    }).select('+totpSecret +backupCodes');

    if (!mfaSecret) {
      return false;
    }

    // Try TOTP verification
    if (mfaSecret.totpSecret) {
      const isValid = speakeasy.totp.verify({
        secret: mfaSecret.totpSecret,
        encoding: 'base32',
        token,
        window: 2,
      });

      if (isValid) {
        return true;
      }
    }

    // Try backup code
    if (mfaSecret.backupCodes && mfaSecret.backupCodes.length > 0) {
      for (let i = 0; i < mfaSecret.backupCodes.length; i++) {
        const isMatch = await this.verifyBackupCode(token, mfaSecret.backupCodes[i]);
        if (isMatch) {
          // Remove used backup code
          mfaSecret.backupCodes.splice(i, 1);
          await mfaSecret.save();

          // Audit log
          await AuditService.log({
            action: 'mfa.backup_code.used',
            resource: 'mfa',
            userId,
            details: {
              metadata: { remainingCodes: mfaSecret.backupCodes.length },
            },
            risk: 'medium',
          });

          return true;
        }
      }
    }

    return false;
  }

  /**
   * Enable email OTP
   */
  async enableEmailOTP(userId: string): Promise<void> {
    let mfaSecret = await MFASecret.findOne({ user: userId });

    if (!mfaSecret) {
      mfaSecret = new MFASecret({
        user: userId,
        emailOtpEnabled: true,
        isActive: true,
      });
    } else {
      mfaSecret.emailOtpEnabled = true;
      mfaSecret.isActive = true;
    }

    await mfaSecret.save();

    // Update user
    await User.findByIdAndUpdate(userId, { isMfaEnabled: true });

    // Audit log
    await AuditService.log({
      action: 'mfa.email.enabled',
      resource: 'mfa',
      userId,
      details: {
        metadata: { type: 'email' },
      },
      risk: 'medium',
    });
  }

  /**
   * Send email OTP
   */
  async sendEmailOTP(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const mfaSecret = await MFASecret.findOne({
      user: userId,
      emailOtpEnabled: true,
    });

    if (!mfaSecret) {
      throw new BadRequestError('Email OTP not enabled');
    }

    // Generate OTP
    const otpCode = OTPUtil.generate();

    // Save OTP
    await OTP.create({
      user: userId,
      code: otpCode,
      type: 'email',
      purpose: 'mfa',
      expiresAt: OTPUtil.getExpiryDate('10m'), // 10 minutes
    });

    // Send email
    await EmailService.sendOTP(user.email, otpCode);
  }

  /**
   * Verify email OTP
   */
  async verifyEmailOTP(userId: string, code: string): Promise<boolean> {
    const otp = await OTP.findOne({
      user: userId,
      code,
      type: 'email',
      purpose: 'mfa',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otp) {
      return false;
    }

    // Mark as used
    otp.isUsed = true;
    await otp.save();

    return true;
  }

  /**
   * Disable MFA
   */
  async disableMFA(userId: string): Promise<void> {
    const mfaSecret = await MFASecret.findOne({ user: userId });

    if (mfaSecret) {
      mfaSecret.totpEnabled = false;
      mfaSecret.emailOtpEnabled = false;
      mfaSecret.smsOtpEnabled = false;
      mfaSecret.isActive = false;
      await mfaSecret.save();
    }

    // Update user
    await User.findByIdAndUpdate(userId, { isMfaEnabled: false });

    // Audit log
    await AuditService.log({
      action: 'mfa.disabled',
      resource: 'mfa',
      userId,
      details: {
        metadata: { reason: 'user_requested' },
      },
      risk: 'high',
    });
  }

  /**
   * Check if MFA is required for user
   */
  async isMFARequired(userId: string, organizationId?: string): Promise<boolean> {
    // Check user's MFA setting
    const user = await User.findById(userId);
    if (user?.isMfaEnabled) {
      return true;
    }

    // Check organization's MFA requirement
    if (organizationId) {
      const org = await Organization.findById(organizationId);
      if (org?.settings?.security?.mfaRequired) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code.match(/.{1,4}/g)!.join('-')); // Format: XXXX-XXXX
    }

    return codes;
  }

  /**
   * Hash backup code
   */
  private async hashBackupCode(code: string): Promise<string> {
    return PasswordUtil.hash(code);
  }

  /**
   * Verify backup code
   */
  private async verifyBackupCode(code: string, hashedCode: string): Promise<boolean> {
    return PasswordUtil.compare(code, hashedCode);
  }
}

export default new MFAService();
