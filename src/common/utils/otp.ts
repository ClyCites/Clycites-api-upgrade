import config from '../config';

export class OTPUtil {
  static generate(length = config.otp.length): string {
    const digits = '0123456789';
    let otp = '';
    
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    
    return otp;
  }

  static isExpired(createdAt: Date, expireTime = config.otp.expire): boolean {
    const expiryMinutes = parseInt(expireTime.replace('m', ''), 10);
    const expiryTime = new Date(createdAt.getTime() + expiryMinutes * 60000);
    return new Date() > expiryTime;
  }

  static getExpiryDate(expireTime = config.otp.expire): Date {
    const expiryMinutes = parseInt(expireTime.replace('m', ''), 10);
    return new Date(Date.now() + expiryMinutes * 60000);
  }
}
