/**
 * Expert Identity & Verification Service
 *
 * Manages expert registration, credential verification, profile management,
 * availability, and performance tracking.
 */

import mongoose from 'mongoose';
import ExpertProfile from './expertProfile.model';
import CaseAssignment from './caseAssignment.model';
import User from '../users/user.model';
import AuditService from '../audit/audit.service';
import { AppError } from '../../common/errors/AppError';
import logger from '../../common/utils/logger';
import {
  IExpertProfile,
  ExpertSpecialization,
  ExpertRole,
  ExpertStatus,
  CredentialType,
} from './expert.types';

interface RegisterExpertDTO {
  userId: string;
  displayName: string;
  title?: string;
  specializations: ExpertSpecialization[];
  primarySpecialization: ExpertSpecialization;
  subjectAreas?: string[];
  regions: string[];
  districts?: string[];
  nationalCoverage?: boolean;
  languages?: string[];
  credentials: Array<{
    type: CredentialType;
    title: string;
    institution: string;
    year: number;
    verificationUrl?: string;
  }>;
  yearsOfExperience: number;
  institutionAffiliation?: string;
  institutionType?: string;
  bio?: string;
  role?: ExpertRole;
}

interface UpdateExpertDTO {
  displayName?: string;
  title?: string;
  specializations?: ExpertSpecialization[];
  subjectAreas?: string[];
  regions?: string[];
  districts?: string[];
  nationalCoverage?: boolean;
  languages?: string[];
  yearsOfExperience?: number;
  institutionAffiliation?: string;
  bio?: string;
  isAvailableForReview?: boolean;
  maxDailyReviews?: number;
  workingHours?: {
    start: string;
    end: string;
    timezone: string;
  };
}

interface ExpertFilterDTO {
  specialization?: ExpertSpecialization;
  region?: string;
  status?: ExpertStatus;
  role?: ExpertRole;
  isAvailable?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ExpertIdentityService {
  /**
   * Register a new expert profile
   */
  async registerExpert(data: RegisterExpertDTO, requesterId: string): Promise<IExpertProfile> {
    const user = await User.findById(data.userId);
    if (!user) throw new AppError('User not found', 404);

    const existing = await ExpertProfile.findOne({ user: data.userId });
    if (existing) throw new AppError('Expert profile already exists for this user', 409);

    const expert = await ExpertProfile.create({
      user: data.userId,
      displayName: data.displayName,
      title: data.title,
      specializations: data.specializations,
      primarySpecialization: data.primarySpecialization,
      subjectAreas: data.subjectAreas || [],
      regions: data.regions,
      districts: data.districts || [],
      nationalCoverage: data.nationalCoverage || false,
      languages: data.languages || ['en'],
      credentials: data.credentials,
      yearsOfExperience: data.yearsOfExperience,
      institutionAffiliation: data.institutionAffiliation,
      institutionType: data.institutionType,
      bio: data.bio,
      role: data.role || ExpertRole.ADVISOR,
      status: ExpertStatus.PENDING_VERIFICATION,
    });

    await AuditService.log({
      userId: requesterId,
      action: 'EXPERT_REGISTERED',
      resource: 'ExpertProfile',
      resourceId: expert._id.toString(),
      details: { metadata: { targetUser: data.userId } },
      status: 'success',
    });

    logger.info(`Expert profile created for user ${data.userId}`);
    return expert;
  }

  /**
   * Verify an expert (admin action)
   */
  async verifyExpert(
    expertId: string,
    adminId: string,
    approved: boolean,
    notes?: string
  ): Promise<IExpertProfile> {
    const expert = await ExpertProfile.findById(expertId);
    if (!expert) throw new AppError('Expert profile not found', 404);

    expert.status = approved ? ExpertStatus.ACTIVE : ExpertStatus.REJECTED;
    expert.verifiedBy = new mongoose.Types.ObjectId(adminId);
    expert.verifiedAt = new Date();
    expert.verificationNotes = notes;
    await expert.save();

    await AuditService.log({
      userId: adminId,
      action: approved ? 'EXPERT_APPROVED' : 'EXPERT_REJECTED',
      resource: 'ExpertProfile',
      resourceId: expertId,
      details: { metadata: { notes } },
      status: 'success',
    });

    logger.info(`Expert ${expertId} ${approved ? 'approved' : 'rejected'} by admin ${adminId}`);
    return expert;
  }

  /**
   * Update expert profile
   */
  async updateProfile(
    expertId: string,
    data: UpdateExpertDTO,
    requesterId: string
  ): Promise<IExpertProfile> {
    const expert = await ExpertProfile.findById(expertId);
    if (!expert) throw new AppError('Expert profile not found', 404);

    Object.assign(expert, data);
    await expert.save();

    await AuditService.log({
      userId: requesterId,
      action: 'EXPERT_PROFILE_UPDATED',
      resource: 'ExpertProfile',
      resourceId: expertId,
      details: { after: data },
      status: 'success',
    });

    return expert;
  }

  /**
   * Get expert by ID
   */
  async getExpertById(expertId: string): Promise<IExpertProfile> {
    const expert = await ExpertProfile.findById(expertId)
      .populate('user', 'firstName lastName email')
      .populate('verifiedBy', 'firstName lastName');
    if (!expert) throw new AppError('Expert profile not found', 404);
    return expert;
  }

  /**
   * Get expert by user ID
   */
  async getExpertByUserId(userId: string): Promise<IExpertProfile | null> {
    return ExpertProfile.findOne({ user: userId, deletedAt: { $exists: false } })
      .populate('user', 'firstName lastName email');
  }

  /**
   * List experts with filters
   */
  async listExperts(filters: ExpertFilterDTO): Promise<{
    experts: IExpertProfile[];
    total: number;
    page: number;
    pages: number;
  }> {
    const {
      specialization,
      region,
      status = ExpertStatus.ACTIVE,
      role,
      isAvailable,
      page = 1,
      limit = 20,
      sortBy = 'performance.farmerRating',
      sortOrder = 'desc',
    } = filters;

    const query: Record<string, unknown> = {
      status,
      deletedAt: { $exists: false },
    };

    if (specialization) {
      query.$or = [
        { primarySpecialization: specialization },
        { specializations: specialization },
      ];
    }
    if (region) query.regions = region;
    if (role) query.role = role;
    if (isAvailable !== undefined) query.isAvailableForReview = isAvailable;

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    const [experts, total] = await Promise.all([
      ExpertProfile.find(query)
        .populate('user', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      ExpertProfile.countDocuments(query),
    ]);

    return { experts, total, page, pages: Math.ceil(total / limit) };
  }

  /**
   * Find available expert for auto-assignment based on specialization and region
   */
  async findAvailableExpert(
    specialization: ExpertSpecialization,
    region?: string
  ): Promise<IExpertProfile | null> {
    const query: Record<string, unknown> = {
      status: ExpertStatus.ACTIVE,
      isAvailableForReview: true,
      $or: [
        { primarySpecialization: specialization },
        { specializations: specialization },
      ],
    };

    if (region) {
      query.$or = [
        { regions: region },
        { nationalCoverage: true },
      ];
    }

    // Prefer expert with fewest pending cases (lower load)
    return ExpertProfile.findOne(query)
      .sort({ 'performance.totalReviews': 1, 'performance.farmerRating': -1 });
  }

  /**
   * Update expert performance metrics
   */
  async updatePerformance(
    expertId: string,
    updates: Partial<IExpertProfile['performance']>
  ): Promise<void> {
    await ExpertProfile.findByIdAndUpdate(expertId, {
      $set: Object.fromEntries(
        Object.entries(updates).map(([k, v]) => [`performance.${k}`, v])
      ),
    });
  }

  /**
   * Suspend an expert
   */
  async suspendExpert(expertId: string, adminId: string, reason: string): Promise<IExpertProfile> {
    const expert = await ExpertProfile.findById(expertId);
    if (!expert) throw new AppError('Expert profile not found', 404);

    expert.status = ExpertStatus.SUSPENDED;
    await expert.save();

    await AuditService.log({
      userId: adminId,
      action: 'EXPERT_SUSPENDED',
      resource: 'ExpertProfile',
      resourceId: expertId,
      details: { metadata: { reason } },
      status: 'success',
      risk: 'medium',
    });

    return expert;
  }

  /**
   * Get expert performance dashboard
   */
  async getPerformanceDashboard(expertId: string): Promise<{
    expert: IExpertProfile;
    stats: {
      pendingCases: number;
      resolvedThisMonth: number;
      avgResponseTimeHours: number;
      accuracyRate: number;
      farmerRating: number;
    };
  }> {
    const expert = await this.getExpertById(expertId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [pendingCases, resolvedThisMonth] = await Promise.all([
      CaseAssignment.countDocuments({
        assignedExpert: expertId,
        status: { $in: ['pending', 'in_review'] },
      }),
      CaseAssignment.countDocuments({
        assignedExpert: expertId,
        status: 'reviewed',
        reviewedAt: { $gte: startOfMonth },
      }),
    ]);

    return {
      expert,
      stats: {
        pendingCases,
        resolvedThisMonth,
        avgResponseTimeHours: expert.performance.averageResponseTime,
        accuracyRate: expert.performance.accuracyScore,
        farmerRating: expert.performance.farmerRating,
      },
    };
  }
}

export default new ExpertIdentityService();
