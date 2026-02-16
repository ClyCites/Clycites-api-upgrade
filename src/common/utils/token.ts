import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import config from '../config';
import { JwtPayload } from '../middleware/auth';

export class TokenUtil {
  static generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.secret as Secret, {
      expiresIn: config.jwt.expire as SignOptions['expiresIn'],
    });
  }

  static generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.refreshSecret as Secret, {
      expiresIn: config.jwt.refreshExpire as SignOptions['expiresIn'],
    });
  }

  static verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwt.secret) as JwtPayload;
  }

  static verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
  }

  static generateTokenPair(payload: JwtPayload) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
      expiresIn: config.jwt.expire,
    };
  }

  static generateMfaSessionToken(payload: JwtPayload): string {
    // MFA session token valid for 5 minutes
    return jwt.sign(
      { ...payload, mfaSession: true },
      config.jwt.secret as Secret,
      { expiresIn: '5m' }
    );
  }
}
