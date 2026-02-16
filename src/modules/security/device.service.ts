import Device, { IDevice } from './device.model';
import SecurityEvent from './securityEvent.model';
import User from '../users/user.model';
import AuditService from '../audit/audit.service';
import crypto from 'crypto';
import {
  NotFoundError,
  UnauthorizedError,
} from '../../common/errors/AppError';

interface DeviceInfo {
  userAgent: string;
  ipAddress: string;
  deviceFingerprint?: string;
}

class DeviceService {
  /**
   * Register or update device
   */
  async registerDevice(userId: string, deviceInfo: DeviceInfo): Promise<IDevice> {
    const deviceId = this.generateDeviceId(deviceInfo);
    
    // Check if device exists
    let device = await Device.findOne({
      user: userId,
      deviceId,
    });

    if (device) {
      // Update existing device
      device.lastSeenAt = new Date();
      device.loginCount += 1;
      device.lastLocation = {
        ip: deviceInfo.ipAddress,
      };
      device.deviceInfo.userAgent = deviceInfo.userAgent;

      // Update trust level
      if (device.loginCount > 5) {
        device.trustLevel = 'recognized';
      }
      if (device.isTrusted) {
        device.trustLevel = 'verified';
      }

      await device.save();
    } else {
      // Create new device
      const deviceType = this.detectDeviceType(deviceInfo.userAgent);
      const { os, browser } = this.parseUserAgent(deviceInfo.userAgent);

      device = await Device.create({
        user: userId,
        deviceId,
        deviceInfo: {
          type: deviceType,
          os,
          browser,
          userAgent: deviceInfo.userAgent,
        },
        lastLocation: {
          ip: deviceInfo.ipAddress,
        },
        trustLevel: 'new',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        loginCount: 1,
      });

      // Log new device
      await this.logNewDevice(userId, device);
    }

    return device;
  }

  /**
   * Get user's devices
   */
  async getUserDevices(userId: string): Promise<IDevice[]> {
    return Device.find({
      user: userId,
      status: 'active',
    }).sort({ lastSeenAt: -1 });
  }

  /**
   * Verify device
   */
  async verifyDevice(userId: string, deviceId: string): Promise<void> {
    const device = await Device.findOne({
      user: userId,
      _id: deviceId,
    });

    if (!device) {
      throw new NotFoundError('Device not found');
    }

    device.isTrusted = true;
    device.trustLevel = 'verified';
    await device.save();

    // Audit log
    await AuditService.log({
      action: 'device.verified',
      resource: 'device',
      resourceId: deviceId,
      userId,
      details: {
        after: { trustLevel: 'verified' },
      },
    });
  }

  /**
   * Block device
   */
  async blockDevice(userId: string, deviceId: string, reason?: string): Promise<void> {
    const device = await Device.findOne({
      user: userId,
      _id: deviceId,
    });

    if (!device) {
      throw new NotFoundError('Device not found');
    }

    device.status = 'blocked';
    device.blockedAt = new Date();
    device.blockedReason = reason;
    await device.save();

    // Audit log
    await AuditService.log({
      action: 'device.blocked',
      resource: 'device',
      resourceId: deviceId,
      userId,
      details: {
        after: { status: 'blocked', reason },
      },
      risk: 'high',
    });
  }

  /**
   * Revoke device
   */
  async revokeDevice(userId: string, deviceId: string): Promise<void> {
    const device = await Device.findOne({
      user: userId,
      _id: deviceId,
    });

    if (!device) {
      throw new NotFoundError('Device not found');
    }

    device.status = 'revoked';
    device.refreshToken = undefined;
    await device.save();

    // Audit log
    await AuditService.log({
      action: 'device.revoked',
      resource: 'device',
      resourceId: deviceId,
      userId,
      details: {
        after: { status: 'revoked' },
      },
    });
  }

  /**
   * Check if device is trusted
   */
  async isDeviceTrusted(userId: string, deviceInfo: DeviceInfo): Promise<boolean> {
    const deviceId = this.generateDeviceId(deviceInfo);

    const device = await Device.findOne({
      user: userId,
      deviceId,
      status: 'active',
    });

    return device ? device.isTrusted : false;
  }

  /**
   * Detect suspicious device activity
   */
  async detectSuspiciousActivity(userId: string, deviceInfo: DeviceInfo): Promise<string[]> {
    const flags: string[] = [];
    const deviceId = this.generateDeviceId(deviceInfo);

    const device = await Device.findOne({
      user: userId,
      deviceId,
    });

    // Check for new device from different location
    if (!device) {
      await User.findById(userId);
      const recentDevices = await Device.find({
        user: userId,
        lastSeenAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      });

      if (recentDevices.length > 0) {
        flags.push('new_device');

        // Check if IP is significantly different
        const lastIP = recentDevices[0].lastLocation?.ip;
        if (lastIP && lastIP !== deviceInfo.ipAddress) {
          flags.push('different_location');
        }
      }
    } else {
      // Check for excessive failed login attempts
      if (device.failedLoginAttempts > 5) {
        flags.push('excessive_failed_logins');
      }

      // Check if device is blocked
      if (device.status === 'blocked') {
        flags.push('blocked_device');
        throw new UnauthorizedError('Device is blocked');
      }
    }

    // Check for rapid location changes
    if (device && device.lastLocation?.ip !== deviceInfo.ipAddress) {
      const timeSinceLastSeen = Date.now() - device.lastSeenAt.getTime();
      if (timeSinceLastSeen < 60 * 60 * 1000) {  // Less than 1 hour
        flags.push('rapid_location_change');
      }
    }

    return flags;
  }

  /**
   * Record failed login attempt
   */
  async recordFailedLogin(userId: string, deviceInfo: DeviceInfo): Promise<void> {
    const deviceId = this.generateDeviceId(deviceInfo);

    const device = await Device.findOne({
      user: userId,
      deviceId,
    });

    if (device) {
      device.failedLoginAttempts += 1;
      device.lastSeenAt = new Date();

      // Auto-block after too many failed attempts
      if (device.failedLoginAttempts >= 10) {
        device.status = 'blocked';
        device.blockedAt = new Date();
        device.blockedReason = 'Excessive failed login attempts';
        device.trustLevel = 'suspicious';
      }

      await device.save();
    }
  }

  /**
   * Reset failed login attempts
   */
  async resetFailedLogins(userId: string, deviceInfo: DeviceInfo): Promise<void> {
    const deviceId = this.generateDeviceId(deviceInfo);

    await Device.updateOne(
      { user: userId, deviceId },
      { failedLoginAttempts: 0 }
    );
  }

  /**
   * Generate device ID from device info
   */
  private generateDeviceId(deviceInfo: DeviceInfo): string {
    if (deviceInfo.deviceFingerprint) {
      return deviceInfo.deviceFingerprint;
    }

    // Generate based on user agent and other factors
    const data = `${deviceInfo.userAgent}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Detect device type from user agent
   */
  private detectDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
      return 'tablet';
    }
    if (/mobile|iphone|ipod|blackberry|opera mini|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    if (/windows|macintosh|linux/i.test(userAgent)) {
      return 'desktop';
    }

    return 'unknown';
  }

  /**
   * Parse user agent for OS and browser
   */
  private parseUserAgent(userAgent: string): { os: string; browser: string } {
    let os = 'Unknown';
    let browser = 'Unknown';

    // Detect OS
    if (/Windows/i.test(userAgent)) os = 'Windows';
    else if (/Mac OS X/i.test(userAgent)) os = 'macOS';
    else if (/Linux/i.test(userAgent)) os = 'Linux';
    else if (/Android/i.test(userAgent)) os = 'Android';
    else if (/iOS|iPhone|iPad/i.test(userAgent)) os = 'iOS';

    // Detect Browser
    if (/Chrome/i.test(userAgent)) browser = 'Chrome';
    else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
    else if (/Safari/i.test(userAgent)) browser = 'Safari';
    else if (/Edge/i.test(userAgent)) browser = 'Edge';
    else if (/Opera/i.test(userAgent)) browser = 'Opera';

    return { os, browser };
  }

  /**
   * Log new device detection
   */
  private async logNewDevice(userId: string, device: IDevice): Promise<void> {
    // Create security event
    await SecurityEvent.create({
      user: userId,
      type: 'auth',
      category: 'new_device',
      severity: 'warning',
      title: 'New Device Detected',
      description: `A new device logged into your account: ${device.deviceInfo.type} - ${device.deviceInfo.browser} on ${device.deviceInfo.os}`,
      context: {
        ipAddress: device.lastLocation?.ip || '0.0.0.0',
        userAgent: device.deviceInfo.userAgent,
        deviceId: device.deviceId,
      },
      riskScore: 40,
      isSuspicious: false,
      isBlocked: false,
      responseStatus: 'open',
      timestamp: new Date(),
    });

    // TODO: Send email notification to user
  }
}

export default new DeviceService();
