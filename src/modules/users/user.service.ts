import mongoose, { FilterQuery } from 'mongoose';
import User, { IUser, IUserProfile, UserRole } from './user.model';
import { AuditService } from '../audit';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../common/errors/AppError';
import { PaginationResult, PaginationUtil } from '../../common/utils/pagination';

const ADMIN_SORT_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'lastLogin',
  'email',
  'firstName',
  'lastName',
  'role',
  'isActive',
  'loginCount',
  'profile.completionScore',
]);

export interface AdminListUsersOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  isEmailVerified?: boolean;
  requiresIdentityVerification?: boolean;
  includeDeleted?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminUpdateUserPayload {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isMfaEnabled?: boolean;
  passwordResetRequired?: boolean;
  requiresIdentityVerification?: boolean;
  suspiciousActivityDetected?: boolean;
  profileImage?: string;
  bio?: string;
  timezone?: string;
  language?: string;
  profile?: Partial<IUserProfile>;
}

export interface AdminUpdateUserStatusPayload {
  isActive?: boolean;
  lockUntilHours?: number;
  requiresIdentityVerification?: boolean;
  suspiciousActivityDetected?: boolean;
  passwordResetRequired?: boolean;
  reason?: string;
}

class UserService {
  async listUsers(options: AdminListUsersOptions): Promise<PaginationResult<IUser>> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = PaginationUtil.getSkip(page, limit);

    const sortBy = ADMIN_SORT_FIELDS.has(options.sortBy || '')
      ? (options.sortBy as string)
      : 'createdAt';
    const sortOrder = options.sortOrder === 'asc' ? 1 : -1;

    const filter = this.buildAdminListFilter(options);

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return PaginationUtil.buildPaginationResult(users, total, page, limit);
  }

  async getUserByIdForAdmin(userId: string, includeDeleted = false): Promise<IUser> {
    const filter: FilterQuery<IUser> = { _id: new mongoose.Types.ObjectId(userId) };
    if (!includeDeleted) {
      filter.deletedAt = null;
    }

    const user = await User.findOne(filter);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  async updateUserByAdmin(
    userId: string,
    payload: AdminUpdateUserPayload,
    actorId: string
  ): Promise<IUser> {
    const user = await this.getUserByIdForAdmin(userId, false);

    if (payload.role && actorId === userId && payload.role !== user.role) {
      throw new ForbiddenError('You cannot change your own role');
    }

    const beforeState = this.toAuditSnapshot(user);
    const changedFields: string[] = [];

    if (payload.email && payload.email !== user.email) {
      const normalizedEmail = payload.email.toLowerCase().trim();
      const existing = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: user._id },
      });

      if (existing) {
        throw new ConflictError('Email is already in use');
      }

      user.email = normalizedEmail;
      user.isEmailVerified = false;
      user.emailVerifiedAt = undefined;
      changedFields.push('email', 'isEmailVerified');
    }

    if (payload.phone !== undefined) {
      user.phone = payload.phone;
      changedFields.push('phone');
    }

    if (payload.firstName !== undefined) {
      user.firstName = payload.firstName;
      changedFields.push('firstName');
    }

    if (payload.lastName !== undefined) {
      user.lastName = payload.lastName;
      changedFields.push('lastName');
    }

    if (payload.role !== undefined) {
      user.role = payload.role;
      changedFields.push('role');
    }

    if (payload.isActive !== undefined) {
      user.isActive = payload.isActive;
      changedFields.push('isActive');
    }

    if (payload.isEmailVerified !== undefined) {
      user.isEmailVerified = payload.isEmailVerified;
      user.emailVerifiedAt = payload.isEmailVerified ? new Date() : undefined;
      changedFields.push('isEmailVerified');
    }

    if (payload.isPhoneVerified !== undefined) {
      user.isPhoneVerified = payload.isPhoneVerified;
      user.phoneVerifiedAt = payload.isPhoneVerified ? new Date() : undefined;
      changedFields.push('isPhoneVerified');
    }

    if (payload.isMfaEnabled !== undefined) {
      user.isMfaEnabled = payload.isMfaEnabled;
      changedFields.push('isMfaEnabled');
    }

    if (payload.passwordResetRequired !== undefined) {
      user.passwordResetRequired = payload.passwordResetRequired;
      changedFields.push('passwordResetRequired');
    }

    if (payload.requiresIdentityVerification !== undefined) {
      user.requiresIdentityVerification = payload.requiresIdentityVerification;
      changedFields.push('requiresIdentityVerification');
    }

    if (payload.suspiciousActivityDetected !== undefined) {
      user.suspiciousActivityDetected = payload.suspiciousActivityDetected;
      changedFields.push('suspiciousActivityDetected');
    }

    if (payload.profileImage !== undefined) {
      user.profileImage = payload.profileImage;
      changedFields.push('profileImage');
    }

    if (payload.bio !== undefined) {
      user.bio = payload.bio;
      changedFields.push('bio');
    }

    if (payload.timezone !== undefined) {
      user.timezone = payload.timezone;
      changedFields.push('timezone');
    }

    if (payload.language !== undefined) {
      user.language = payload.language;
      changedFields.push('language');
    }

    if (payload.profile) {
      const mergedProfile = this.mergeProfile(user.profile, payload.profile);
      mergedProfile.completionScore = this.calculateProfileCompletion(user, mergedProfile);
      mergedProfile.lastProfileUpdateAt = new Date();

      user.profile = mergedProfile;
      changedFields.push('profile');
    }

    if (changedFields.length === 0) {
      throw new BadRequestError('No valid fields provided for update');
    }

    await user.save();

    await AuditService.log({
      action: 'admin.user_updated',
      resource: 'user',
      resourceId: user._id.toString(),
      userId: actorId,
      details: {
        before: beforeState,
        after: this.toAuditSnapshot(user),
        metadata: {
          changedFields,
        },
      },
      risk: changedFields.includes('role') || changedFields.includes('isActive') ? 'high' : 'medium',
    });

    return user;
  }

  async updateUserStatusByAdmin(
    userId: string,
    payload: AdminUpdateUserStatusPayload,
    actorId: string
  ): Promise<IUser> {
    const user = await this.getUserByIdForAdmin(userId, true);

    if (actorId === userId && payload.isActive === false) {
      throw new ForbiddenError('You cannot deactivate your own account');
    }

    const beforeState = this.toAuditSnapshot(user);
    const changedFields: string[] = [];

    if (payload.isActive !== undefined) {
      user.isActive = payload.isActive;
      changedFields.push('isActive');
    }

    if (payload.lockUntilHours !== undefined) {
      if (payload.lockUntilHours === 0) {
        user.lockedUntil = undefined;
        user.failedLoginAttempts = 0;
      } else {
        const lockMs = payload.lockUntilHours * 60 * 60 * 1000;
        user.lockedUntil = new Date(Date.now() + lockMs);
      }
      changedFields.push('lockedUntil');
    }

    if (payload.requiresIdentityVerification !== undefined) {
      user.requiresIdentityVerification = payload.requiresIdentityVerification;
      changedFields.push('requiresIdentityVerification');
    }

    if (payload.suspiciousActivityDetected !== undefined) {
      user.suspiciousActivityDetected = payload.suspiciousActivityDetected;
      changedFields.push('suspiciousActivityDetected');
    }

    if (payload.passwordResetRequired !== undefined) {
      user.passwordResetRequired = payload.passwordResetRequired;
      changedFields.push('passwordResetRequired');
    }

    if (changedFields.length === 0) {
      throw new BadRequestError('No status fields provided');
    }

    await user.save();

    await AuditService.log({
      action: 'admin.user_status_updated',
      resource: 'user',
      resourceId: user._id.toString(),
      userId: actorId,
      details: {
        before: beforeState,
        after: this.toAuditSnapshot(user),
        metadata: {
          changedFields,
          reason: payload.reason,
        },
      },
      risk: 'high',
    });

    return user;
  }

  async unlockUserByAdmin(userId: string, actorId: string): Promise<IUser> {
    const user = await this.getUserByIdForAdmin(userId, true);
    const beforeState = this.toAuditSnapshot(user);

    user.lockedUntil = undefined;
    user.failedLoginAttempts = 0;
    user.lastFailedLoginAt = undefined;
    user.suspiciousActivityDetected = false;

    await user.save();

    await AuditService.log({
      action: 'admin.user_unlocked',
      resource: 'user',
      resourceId: user._id.toString(),
      userId: actorId,
      details: {
        before: beforeState,
        after: this.toAuditSnapshot(user),
      },
      risk: 'medium',
    });

    return user;
  }

  async softDeleteUserByAdmin(userId: string, actorId: string, reason?: string): Promise<void> {
    if (actorId === userId) {
      throw new ForbiddenError('You cannot delete your own account');
    }

    const user = await this.getUserByIdForAdmin(userId, true);

    if (user.deletedAt) {
      throw new BadRequestError('User is already deleted');
    }

    const beforeState = this.toAuditSnapshot(user);

    user.deletedAt = new Date();
    user.isActive = false;
    await user.save();

    await AuditService.log({
      action: 'admin.user_deleted',
      resource: 'user',
      resourceId: user._id.toString(),
      userId: actorId,
      details: {
        before: beforeState,
        after: this.toAuditSnapshot(user),
        metadata: { reason },
      },
      risk: 'high',
    });
  }

  async restoreUserByAdmin(userId: string, actorId: string): Promise<IUser> {
    const user = await this.getUserByIdForAdmin(userId, true);

    if (!user.deletedAt) {
      throw new BadRequestError('User is not deleted');
    }

    const beforeState = this.toAuditSnapshot(user);

    user.deletedAt = undefined;
    user.isActive = true;
    await user.save();

    await AuditService.log({
      action: 'admin.user_restored',
      resource: 'user',
      resourceId: user._id.toString(),
      userId: actorId,
      details: {
        before: beforeState,
        after: this.toAuditSnapshot(user),
      },
      risk: 'medium',
    });

    return user;
  }

  private buildAdminListFilter(options: AdminListUsersOptions): FilterQuery<IUser> {
    const filter: FilterQuery<IUser> = {};

    if (!options.includeDeleted) {
      filter.deletedAt = null;
    }

    if (options.role) {
      filter.role = options.role;
    }

    if (options.isActive !== undefined) {
      filter.isActive = options.isActive;
    }

    if (options.isEmailVerified !== undefined) {
      filter.isEmailVerified = options.isEmailVerified;
    }

    if (options.requiresIdentityVerification !== undefined) {
      filter.requiresIdentityVerification = options.requiresIdentityVerification;
    }

    if (options.search) {
      const searchRegex = new RegExp(options.search.trim(), 'i');
      filter.$or = [
        { email: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { phone: searchRegex },
        { 'profile.displayName': searchRegex },
      ];
    }

    return filter;
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

  private calculateProfileCompletion(user: IUser, profile: IUserProfile): number {
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
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      isMfaEnabled: user.isMfaEnabled,
      requiresIdentityVerification: user.requiresIdentityVerification,
      suspiciousActivityDetected: user.suspiciousActivityDetected,
      deletedAt: user.deletedAt,
      profile: user.profile,
    };
  }
}

export default new UserService();
