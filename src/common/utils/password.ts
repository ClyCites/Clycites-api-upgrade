import argon2 from 'argon2';
import bcrypt from 'bcryptjs';

export class PasswordUtil {
  /**
   * Hash password using Argon2id (enterprise-grade security)
   */
  static async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });
  }

  /**
   * Compare password with hash (supports both Argon2 and bcrypt for migration)
   */
  static async compare(password: string, hashedPassword: string): Promise<boolean> {
    try {
      // Check if it's an Argon2 hash
      if (hashedPassword.startsWith('$argon2')) {
        return await argon2.verify(hashedPassword, password);
      }
      
      // Fallback to bcrypt for legacy passwords
      if (hashedPassword.startsWith('$2a$') || hashedPassword.startsWith('$2b$')) {
        return await bcrypt.compare(password, hashedPassword);
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check if password needs rehashing (for migration from bcrypt to argon2)
   */
  static needsRehash(hashedPassword: string): boolean {
    return !hashedPassword.startsWith('$argon2');
  }

  /**
   * Validate password strength (enterprise requirements)
   */
  static validate(password: string, options?: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
    checkCommonPasswords?: boolean;
  }): { valid: boolean; errors: string[]; strength: 'weak' | 'fair' | 'good' | 'strong' } {
    const opts = {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      checkCommonPasswords: true,
      ...options,
    };

    const errors: string[] = [];
    let score = 0;

    // Length check
    if (password.length < opts.minLength) {
      errors.push(`Password must be at least ${opts.minLength} characters long`);
    } else {
      score += Math.min(password.length, 20); // Max 20 points for length
    }

    // Complexity checks
    if (opts.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else if (/[A-Z]/.test(password)) {
      score += 10;
    }

    if (opts.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else if (/[a-z]/.test(password)) {
      score += 10;
    }

    if (opts.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    } else if (/[0-9]/.test(password)) {
      score += 10;
    }

    if (opts.requireSpecialChars && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    } else if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      score += 15;
    }

    // Check for common passwords
    if (opts.checkCommonPasswords && this.isCommonPassword(password)) {
      errors.push('This password is too common. Please choose a more unique password');
      score = Math.max(score - 30, 0);
    }

    // Check for sequential characters
    if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmno|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
      score -= 10;
    }

    // Check for repeated characters
    if (/(.)\1{2,}/.test(password)) {
      score -= 10;
    }

    // Determine strength
    let strength: 'weak' | 'fair' | 'good' | 'strong';
    if (score >= 60) strength = 'strong';
    else if (score >= 45) strength = 'good';
    else if (score >= 30) strength = 'fair';
    else strength = 'weak';

    return {
      valid: errors.length === 0,
      errors,
      strength,
    };
  }

  /**
   * Check if password is in common password list
   */
  private static isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', 'password123', '12345678', 'qwerty', 'abc123',
      'monkey', '1234567', 'letmein', 'trustno1', 'dragon',
      'baseball', 'iloveyou', 'master', 'sunshine', 'ashley',
      'bailey', 'passw0rd', 'shadow', '123123', '654321',
      'superman', 'qazwsx', 'michael', 'football', 'welcome',
    ];

    return commonPasswords.includes(password.toLowerCase());
  }

  /**
   * Generate a strong random password
   */
  static generate(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const all = uppercase + lowercase + numbers + special;
    
    let password = '';
    
    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    // Fill the rest
    for (let i = password.length; i < length; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }
    
    // Shuffle
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}
