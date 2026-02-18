/**
 * Advisory & Communication Service
 *
 * Manages expert advisories, broadcast alerts, emergency notifications,
 * and farmer consultation request (inquiry) workflows.
 */

import mongoose from 'mongoose';
import Advisory from './advisory.model';
import FarmerInquiry from './farmerInquiry.model';
import ExpertProfile from './expertProfile.model';
import User from '../users/user.model';
import AuditService from '../audit/audit.service';
import { AppError } from '../../common/errors/AppError';
import logger from '../../common/utils/logger';
import {
  IAdvisory,
  IFarmerInquiry,
  AdvisoryType,
  AdvisoryStatus,
  UrgencyLevel,
  ExpertSpecialization,
  KnowledgeCategory,
  InquiryStatus,
} from './expert.types';

interface CreateAdvisoryDTO {
  title: string;
  message: string;
  type: AdvisoryType;
  targetCrops?: string[];
  targetRegions?: string[];
  targetDistricts?: string[];
  targetSeasons?: string[];
  targetUserRoles?: string[];
  specificFarmer?: string;
  urgency?: UrgencyLevel;
  specialization?: ExpertSpecialization;
  relatedArticle?: string;
  relatedReport?: string;
  scheduledAt?: Date;
  expiresAt?: Date;
  channels?: {
    inApp?: boolean;
    email?: boolean;
    sms?: boolean;
    push?: boolean;
  };
  attachmentUrls?: string[];
}

interface AdvisoryFilterDTO {
  type?: AdvisoryType;
  urgency?: UrgencyLevel;
  region?: string;
  crop?: string;
  status?: AdvisoryStatus;
  authorExpertId?: string;
  page?: number;
  limit?: number;
}

interface CreateInquiryDTO {
  farmerId: string;
  subject: string;
  description: string;
  cropType?: string;
  region?: string;
  urgency?: UrgencyLevel;
  category: KnowledgeCategory;
  attachmentUrls?: string[];
  relatedReport?: string;
}

interface RespondToInquiryDTO {
  expertResponse: string;
  responseAttachments?: string[];
  closeAfterResponse?: boolean;
}

// =========================================================================

export class AdvisoryService {

  // -------------------------------------------------------------------------
  // ADVISORIES
  // -------------------------------------------------------------------------

  /**
   * Create a new advisory (draft or scheduled)
   */
  async createAdvisory(
    expertId: string,
    data: CreateAdvisoryDTO,
    expertUserId: string
  ): Promise<IAdvisory> {
    const expert = await ExpertProfile.findById(expertId);
    if (!expert) throw new AppError('Expert profile not found', 404);

    const advisory = await Advisory.create({
      title: data.title,
      message: data.message,
      type: data.type,
      status: data.scheduledAt ? AdvisoryStatus.SCHEDULED : AdvisoryStatus.DRAFT,
      author: expertId,
      targetCrops: data.targetCrops || [],
      targetRegions: data.targetRegions || [],
      targetDistricts: data.targetDistricts || [],
      targetSeasons: data.targetSeasons || [],
      targetUserRoles: data.targetUserRoles || [],
      specificFarmer: data.specificFarmer,
      urgency: data.urgency || UrgencyLevel.LOW,
      specialization: data.specialization,
      relatedArticle: data.relatedArticle,
      relatedReport: data.relatedReport,
      scheduledAt: data.scheduledAt,
      expiresAt: data.expiresAt,
      channels: {
        inApp: data.channels?.inApp ?? true,
        email: data.channels?.email ?? false,
        sms: data.channels?.sms ?? false,
        push: data.channels?.push ?? false,
      },
      attachmentUrls: data.attachmentUrls || [],
    });

    await AuditService.log({
      userId: expertUserId,
      action: 'ADVISORY_CREATED',
      resource: 'Advisory',
      resourceId: advisory._id.toString(),
      details: {
        metadata: {
          type: data.type,
          urgency: data.urgency,
          targetRegions: data.targetRegions,
        },
      },
      status: 'success',
    });

    logger.info(`Advisory "${data.title}" created by expert ${expertId}`);
    return advisory;
  }

  /**
   * Send/broadcast an advisory
   */
  async sendAdvisory(
    advisoryId: string,
    expertUserId: string
  ): Promise<IAdvisory & { recipientCount: number }> {
    const advisory = await Advisory.findById(advisoryId);
    if (!advisory) throw new AppError('Advisory not found', 404);

    if (advisory.status === AdvisoryStatus.SENT) {
      throw new AppError('Advisory already sent', 400);
    }

    // Resolve recipient count (real delivery delegated to notification service)
    const recipientCount = await this.resolveRecipientCount(advisory);

    advisory.status = AdvisoryStatus.SENT;
    advisory.sentAt = new Date();
    advisory.totalRecipients = recipientCount;
    advisory.deliveredCount = recipientCount; // update when delivery receipts arrive
    await advisory.save();

    // Update expert advisory counter
    await ExpertProfile.findByIdAndUpdate(advisory.author, {
      $inc: { 'performance.advisoriesIssued': 1 },
    });

    await AuditService.log({
      userId: expertUserId,
      action: 'ADVISORY_SENT',
      resource: 'Advisory',
      resourceId: advisoryId,
      details: { metadata: { recipientCount } },
      status: 'success',
    });

    logger.info(`Advisory ${advisoryId} sent to ${recipientCount} recipients`);
    return Object.assign(advisory.toObject(), { recipientCount }) as IAdvisory & {
      recipientCount: number;
    };
  }

  /**
   * Issue an emergency alert (sets urgency to EMERGENCY and sends immediately)
   */
  async issueEmergencyAlert(
    expertId: string,
    expertUserId: string,
    data: {
      title: string;
      message: string;
      targetRegions: string[];
      targetCrops?: string[];
      relatedReport?: string;
    }
  ): Promise<IAdvisory> {
    const advisory = await this.createAdvisory(
      expertId,
      {
        ...data,
        type: AdvisoryType.EMERGENCY_ALERT,
        urgency: UrgencyLevel.EMERGENCY,
        channels: { inApp: true, email: true, sms: true, push: true },
      },
      expertUserId
    );

    return (await this.sendAdvisory(advisory._id.toString(), expertUserId)) as IAdvisory;
  }

  /**
   * List advisories with filters
   */
  async listAdvisories(filters: AdvisoryFilterDTO): Promise<{
    advisories: IAdvisory[];
    total: number;
    page: number;
    pages: number;
  }> {
    const {
      type,
      urgency,
      region,
      crop,
      status,
      authorExpertId,
      page = 1,
      limit = 20,
    } = filters;

    const query: Record<string, unknown> = {};
    if (type) query.type = type;
    if (urgency) query.urgency = urgency;
    if (status) query.status = status;
    if (authorExpertId) query.author = authorExpertId;
    if (region) query.targetRegions = region;
    if (crop) query.targetCrops = crop;

    const skip = (page - 1) * limit;
    const [advisories, total] = await Promise.all([
      Advisory.find(query)
        .populate('author', 'displayName title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Advisory.countDocuments(query),
    ]);

    return { advisories, total, page, pages: Math.ceil(total / limit) };
  }

  /**
   * Get advisories relevant to a farmer (for their feed)
   */
  async getFarmerAdvisories(options: {
    region?: string;
    crops?: string[];
    role?: string;
    page?: number;
    limit?: number;
  }): Promise<IAdvisory[]> {
    const { region, crops, role, page = 1, limit = 20 } = options;

    const query: Record<string, unknown> = {
      status: AdvisoryStatus.SENT,
      $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: { $exists: false } }],
    };

    const conditions: Record<string, unknown>[] = [
      { targetRegions: { $size: 0 } }, // broadcast to all regions
    ];

    if (region) conditions.push({ targetRegions: region });
    if (crops && crops.length) conditions.push({ targetCrops: { $in: crops } });
    if (role) conditions.push({ targetUserRoles: role });

    query.$or = conditions;

    const skip = (page - 1) * limit;
    return Advisory.find(query)
      .populate('author', 'displayName title')
      .sort({ urgency: -1, sentAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  /**
   * Record advisory acknowledgement
   */
  async acknowledgeAdvisory(advisoryId: string): Promise<void> {
    await Advisory.findByIdAndUpdate(advisoryId, { $inc: { acknowledgedCount: 1 } });
  }

  // -------------------------------------------------------------------------
  // FARMER INQUIRIES
  // -------------------------------------------------------------------------

  /**
   * Farmer submits a consultation inquiry
   */
  async createInquiry(data: CreateInquiryDTO): Promise<IFarmerInquiry> {
    const inquiry = await FarmerInquiry.create({
      farmer: data.farmerId,
      subject: data.subject,
      description: data.description,
      cropType: data.cropType,
      region: data.region,
      urgency: data.urgency || UrgencyLevel.LOW,
      category: data.category,
      attachmentUrls: data.attachmentUrls || [],
      relatedReport: data.relatedReport,
      status: InquiryStatus.OPEN,
    });

    logger.info(`Farmer inquiry created: "${data.subject}" from farmer ${data.farmerId}`);
    return inquiry;
  }

  /**
   * Assign an inquiry to an expert
   */
  async assignInquiry(
    inquiryId: string,
    expertId: string,
    assignedByUserId: string
  ): Promise<IFarmerInquiry> {
    const inquiry = await FarmerInquiry.findById(inquiryId);
    if (!inquiry) throw new AppError('Inquiry not found', 404);

    const expert = await ExpertProfile.findById(expertId);
    if (!expert) throw new AppError('Expert not found', 404);

    inquiry.assignedExpert = new mongoose.Types.ObjectId(expertId);
    inquiry.assignedAt = new Date();
    inquiry.status = InquiryStatus.ASSIGNED;
    await inquiry.save();

    await AuditService.log({
      userId: assignedByUserId,
      action: 'INQUIRY_ASSIGNED',
      resource: 'FarmerInquiry',
      resourceId: inquiryId,
      details: { metadata: { expertId } },
      status: 'success',
    });

    return inquiry.populate('assignedExpert', 'displayName title');
  }

  /**
   * Expert responds to a farmer inquiry
   */
  async respondToInquiry(
    inquiryId: string,
    expertUserId: string,
    data: RespondToInquiryDTO
  ): Promise<IFarmerInquiry> {
    const expert = await ExpertProfile.findOne({ user: expertUserId });
    if (!expert) throw new AppError('Expert profile not found', 404);

    const inquiry = await FarmerInquiry.findOne({
      _id: inquiryId,
      assignedExpert: expert._id,
    });
    if (!inquiry) throw new AppError('Inquiry not found or not assigned to you', 404);

    inquiry.expertResponse = data.expertResponse;
    inquiry.respondedAt = new Date();
    inquiry.responseAttachments = data.responseAttachments || [];
    inquiry.status = data.closeAfterResponse ? InquiryStatus.RESOLVED : InquiryStatus.IN_PROGRESS;

    if (data.closeAfterResponse) {
      inquiry.closedAt = new Date();
    }

    await inquiry.save();

    await AuditService.log({
      userId: expertUserId,
      action: 'INQUIRY_RESPONDED',
      resource: 'FarmerInquiry',
      resourceId: inquiryId,
      status: 'success',
    });

    logger.info(`Expert ${expertUserId} responded to inquiry ${inquiryId}`);
    return inquiry;
  }

  /**
   * Farmer adds a follow-up message
   */
  async addFollowUpMessage(
    inquiryId: string,
    fromUserId: string,
    message: string,
    isExpert: boolean
  ): Promise<IFarmerInquiry> {
    const inquiry = await FarmerInquiry.findById(inquiryId);
    if (!inquiry) throw new AppError('Inquiry not found', 404);

    inquiry.followUpMessages.push({
      from: new mongoose.Types.ObjectId(fromUserId),
      message,
      timestamp: new Date(),
      isExpert,
    });

    if (inquiry.status === InquiryStatus.RESOLVED) {
      inquiry.status = InquiryStatus.IN_PROGRESS;
    }

    await inquiry.save();
    return inquiry;
  }

  /**
   * Farmer rates an expert response
   */
  async rateResponse(
    inquiryId: string,
    farmerId: string,
    rating: number,
    feedback?: string
  ): Promise<IFarmerInquiry> {
    if (rating < 1 || rating > 5) throw new AppError('Rating must be between 1 and 5', 400);

    const inquiry = await FarmerInquiry.findOne({
      _id: inquiryId,
      farmer: farmerId,
    });
    if (!inquiry) throw new AppError('Inquiry not found', 404);
    if (!inquiry.expertResponse) throw new AppError('No expert response to rate', 400);

    inquiry.farmerRating = rating;
    inquiry.farmerFeedback = feedback;
    inquiry.ratedAt = new Date();
    inquiry.status = InquiryStatus.CLOSED;
    inquiry.closedAt = new Date();
    await inquiry.save();

    // Update expert rating
    if (inquiry.assignedExpert) {
      const expert = await ExpertProfile.findById(inquiry.assignedExpert);
      if (expert) {
        const count = expert.performance.ratingCount + 1;
        expert.performance.farmerRating =
          (expert.performance.farmerRating * expert.performance.ratingCount + rating) / count;
        expert.performance.ratingCount = count;
        await expert.save();
      }
    }

    return inquiry;
  }

  /**
   * Get inquiries for a farmer
   */
  async getFarmerInquiries(
    farmerId: string,
    status?: InquiryStatus
  ): Promise<IFarmerInquiry[]> {
    const query: Record<string, unknown> = { farmer: farmerId };
    if (status) query.status = status;

    return FarmerInquiry.find(query)
      .populate('assignedExpert', 'displayName title specializations')
      .sort({ createdAt: -1 });
  }

  /**
   * Get inquiries assigned to an expert
   */
  async getExpertInquiries(
    expertUserId: string,
    status?: InquiryStatus,
    page = 1,
    limit = 20
  ): Promise<{ inquiries: IFarmerInquiry[]; total: number }> {
    const expert = await ExpertProfile.findOne({ user: expertUserId });
    if (!expert) throw new AppError('Expert profile not found', 404);

    const query: Record<string, unknown> = { assignedExpert: expert._id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const [inquiries, total] = await Promise.all([
      FarmerInquiry.find(query)
        .populate('farmer', 'firstName lastName')
        .sort({ urgency: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      FarmerInquiry.countDocuments(query),
    ]);

    return { inquiries, total };
  }

  /**
   * Get open unassigned inquiries (for admin auto-assign)
   */
  async getUnassignedInquiries(limit = 50): Promise<IFarmerInquiry[]> {
    return FarmerInquiry.find({
      status: InquiryStatus.OPEN,
      assignedExpert: { $exists: false },
    })
      .sort({ urgency: -1, createdAt: 1 })
      .limit(limit);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async resolveRecipientCount(advisory: IAdvisory): Promise<number> {
    if (advisory.specificFarmer) return 1;
    if (
      !advisory.targetRegions.length &&
      !advisory.targetCrops.length &&
      !advisory.targetUserRoles.length
    ) {
      return User.countDocuments({ isActive: true });
    }

    const roleQuery =
      advisory.targetUserRoles.length
        ? { role: { $in: advisory.targetUserRoles } }
        : {};

    return User.countDocuments({ isActive: true, ...roleQuery });
  }
}

export default new AdvisoryService();
