import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import config from '../config';
import { JwtPayload } from '../middleware/auth';

export class TokenUtil {
  static generateAccessToken(
    payload: JwtPayload,
    expiresIn: SignOptions['expiresIn'] = config.jwt.expire as SignOptions['expiresIn']
  ): string {
    return jwt.sign(payload, config.jwt.secret as Secret, {
      expiresIn,
    });
  }

  static generateRefreshToken(
    payload: JwtPayload,
    expiresIn: SignOptions['expiresIn'] = config.jwt.refreshExpire as SignOptions['expiresIn']
  ): string {
    return jwt.sign(payload, config.jwt.refreshSecret as Secret, {
      expiresIn,
    });
  }

  static verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwt.secret) as JwtPayload;
  }

  static verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
  }

  static generateTokenPair(
    payload: JwtPayload,
    options?: {
      accessExpiresIn?: SignOptions['expiresIn'];
      refreshExpiresIn?: SignOptions['expiresIn'];
    }
  ) {
    return {
      accessToken: this.generateAccessToken(payload, options?.accessExpiresIn),
      refreshToken: this.generateRefreshToken(payload, options?.refreshExpiresIn),
      expiresIn: String(options?.accessExpiresIn || config.jwt.expire),
    };
  }

  static generateImpersonationToken(
    payload: JwtPayload,
    expiresIn: SignOptions['expiresIn'] = '15m'
  ): string {
    return this.generateAccessToken(payload, expiresIn);
  }

  static generateScopedSuperAdminToken(
    payload: JwtPayload,
    expiresIn: SignOptions['expiresIn'] = '10m'
  ): string {
    return this.generateAccessToken(payload, expiresIn);
  }

  static generateMfaSessionToken(payload: JwtPayload): string {
    // MFA session token valid for 5 minutes
    return jwt.sign(
      { ...payload, mfaSession: true },
      config.jwt.secret as Secret,
      { expiresIn: '5m' }
    );
  }

  static getRefreshTokenExpiryDate(refreshToken: string): Date {
    const decoded = jwt.decode(refreshToken);

    if (!decoded || typeof decoded === 'string' || typeof decoded.exp !== 'number') {
      throw new Error('Invalid refresh token payload');
    }

    return new Date(decoded.exp * 1000);
  }
}
