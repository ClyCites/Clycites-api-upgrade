/**
 * Case Review & Diagnosis Validation Service
 *
 * Human-in-the-loop AI validation. Experts review AI pest/disease diagnoses,
 * approve/modify/reject findings, issue treatment recommendations,
 * and submit feedback for AI model retraining.
 */

import mongoose from 'mongoose';
import CaseAssignment from './caseAssignment.model';
import ExpertProfile from './expertProfile.model';
import expertIdentityService from './expertIdentity.service';
import AuditService from '../audit/audit.service';
import { AppError } from '../../common/errors/AppError';
import logger from '../../common/utils/logger';
import {
  ICaseAssignment,
  CaseReviewStatus,
  CaseReviewDecision,
  UrgencyLevel,
  ExpertSpecialization,
  IExpertTreatmentRec,
  ICaseAuditEntry,
} from './expert.types';

interface AssignCaseDTO {
  reportId: string;
  expertId?: string; // if not provided, auto-assign
  priority?: UrgencyLevel;
  specialization?: ExpertSpecialization;
  region?: string;
  assignedBy: string;
}

interface SubmitReviewDTO {
  decision: CaseReviewDecision;
  confirmedDiagnosis?: string;
  modifiedDiagnosis?: string;
  confidenceLevel?: number;
  expertNotes?: string;
  isOutbreak?: boolean;
  outbreakNotes?: string;
  treatmentRecommendations?: IExpertTreatmentRec[];
  preventionGuidance?: string;
  followUpRequired?: boolean;
  followUpDate?: Date;
  aiFeedback?: {
    modelId: string;
    originalPrediction: string;
    originalConfidence: number;
    expertAgreement: boolean;
    feedbackNotes?: string;
  };
}

interface CaseFilterDTO {
  expertId?: string;
  status?: CaseReviewStatus;
  priority?: UrgencyLevel;
  isOutbreak?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export class CaseReviewService {
  /**
   * Assign a pest/disease report to an expert for review
   */
  async assignCase(data: AssignCaseDTO): Promise<ICaseAssignment> {
    // Prevent duplicate assignment for the same report
    const existing = await CaseAssignment.findOne({
      report: data.reportId,
      status: { $in: [CaseReviewStatus.PENDING, CaseReviewStatus.IN_REVIEW] },
    });
    if (existing) throw new AppError('Case is already assigned and pending review', 409);

    let expertId = data.expertId;

    if (!expertId) {
      // Auto-assign to available expert
      const expert = await expertIdentityService.findAvailableExpert(
        data.specialization || ExpertSpecialization.PLANT_PATHOLOGY,
        data.region
      );
      if (!expert) throw new AppError('No available expert found for this case', 503);
      expertId = expert._id.toString();
    }

    const expert = await ExpertProfile.findById(expertId);
    if (!expert) throw new AppError('Expert not found', 404);

    const auditEntry: ICaseAuditEntry = {
      action: 'CASE_ASSIGNED',
      performedBy: new mongoose.Types.ObjectId(data.assignedBy),
      timestamp: new Date(),
      notes: `Assigned to ${expert.displayName}`,
    };

    const assignment = await CaseAssignment.create({
      report: data.reportId,
      assignedExpert: expertId,
      assignedBy: data.assignedBy,
      assignedAt: new Date(),
      status: CaseReviewStatus.PENDING,
      priority: data.priority || UrgencyLevel.MEDIUM,
      auditTrail: [auditEntry],
    });

    await AuditService.log({
      userId: data.assignedBy,
      action: 'CASE_ASSIGNED',
      resource: 'CaseAssignment',
      resourceId: assignment._id.toString(),
      details: { metadata: { expertId, reportId: data.reportId } },
      status: 'success',
    });

    logger.info(`Case ${data.reportId} assigned to expert ${expertId}`);
    return assignment.populate([
      { path: 'report' },
      { path: 'assignedExpert', select: 'displayName specializations' },
    ]);
  }

  /**
   * Expert starts reviewing a case
   */
  async startReview(assignmentId: string, expertUserId: string): Promise<ICaseAssignment> {
    const assignment = await this.getAssignmentForExpert(assignmentId, expertUserId);

    if (assignment.status !== CaseReviewStatus.PENDING) {
      throw new AppError('Case is not in pending status', 400);
    }

    assignment.status = CaseReviewStatus.IN_REVIEW;
    assignment.auditTrail.push({
      action: 'REVIEW_STARTED',
      performedBy: new mongoose.Types.ObjectId(expertUserId),
      timestamp: new Date(),
    });
    await assignment.save();

    logger.info(`Expert ${expertUserId} started reviewing case ${assignmentId}`);
    return assignment;
  }

  /**
   * Expert submits their review decision
   */
  async submitReview(
    assignmentId: string,
    expertUserId: string,
    data: SubmitReviewDTO
  ): Promise<ICaseAssignment> {
    const assignment = await this.getAssignmentForExpert(assignmentId, expertUserId);

    if (assignment.status === CaseReviewStatus.CLOSED) {
      throw new AppError('Case is already closed', 400);
    }

    const startTime = assignment.auditTrail
      .find((e) => e.action === 'REVIEW_STARTED')?.timestamp;
    const reviewDuration = startTime
      ? Math.round((Date.now() - startTime.getTime()) / 60000)
      : undefined;

    assignment.decision = data.decision;
    assignment.confirmedDiagnosis = data.confirmedDiagnosis;
    assignment.modifiedDiagnosis = data.modifiedDiagnosis;
    assignment.confidenceLevel = data.confidenceLevel;
    assignment.expertNotes = data.expertNotes;
    assignment.isOutbreak = data.isOutbreak || false;
    assignment.outbreakNotes = data.outbreakNotes;
    assignment.treatmentRecommendations = data.treatmentRecommendations || [];
    assignment.preventionGuidance = data.preventionGuidance;
    assignment.followUpRequired = data.followUpRequired || false;
    assignment.followUpDate = data.followUpDate;
    assignment.reviewedAt = new Date();
    assignment.reviewDuration = reviewDuration;
    assignment.status =
      data.decision === CaseReviewDecision.ESCALATED
        ? CaseReviewStatus.ESCALATED
        : CaseReviewStatus.REVIEWED;

    // Attach AI feedback for model retraining
    if (data.aiFeedback) {
      assignment.aiFeedback = {
        ...data.aiFeedback,
        submittedAt: new Date(),
      };
    }

    assignment.auditTrail.push({
      action: `REVIEW_SUBMITTED:${data.decision}`,
      performedBy: new mongoose.Types.ObjectId(expertUserId),
      timestamp: new Date(),
      notes: data.expertNotes?.substring(0, 200),
    });

    await assignment.save();

    // Update expert performance
    const expert = await ExpertProfile.findOne({ user: expertUserId });
    if (expert) {
      expert.performance.totalReviews += 1;
      if (data.decision === CaseReviewDecision.APPROVED) {
        expert.performance.approvedReviews += 1;
      }
      if (reviewDuration) {
        const prevAvg = expert.performance.averageResponseTime;
        const count = expert.performance.totalReviews;
        expert.performance.averageResponseTime =
          (prevAvg * (count - 1) + reviewDuration / 60) / count;
      }
      expert.performance.lastActiveAt = new Date();
      await expert.save();
    }

    await AuditService.log({
      userId: expertUserId,
      action: 'CASE_REVIEWED',
      resource: 'CaseAssignment',
      resourceId: assignmentId,
      details: {
        after: {
          decision: data.decision,
          isOutbreak: data.isOutbreak,
          confidenceLevel: data.confidenceLevel,
        },
      },
      status: 'success',
    });

    logger.info(`Case ${assignmentId} reviewed by expert ${expertUserId}: ${data.decision}`);
    return assignment.populate([
      { path: 'report' },
      { path: 'assignedExpert', select: 'displayName' },
    ]);
  }

  /**
   * Escalate a case to a senior expert
   */
  async escalateCase(
    assignmentId: string,
    expertUserId: string,
    escalateTo: string,
    reason: string
  ): Promise<ICaseAssignment> {
    const assignment = await this.getAssignmentForExpert(assignmentId, expertUserId);

    const seniorExpert = await ExpertProfile.findById(escalateTo);
    if (!seniorExpert) throw new AppError('Target expert not found', 404);

    assignment.escalatedTo = new mongoose.Types.ObjectId(escalateTo);
    assignment.escalationReason = reason;
    assignment.escalatedAt = new Date();
    assignment.status = CaseReviewStatus.ESCALATED;
    assignment.decision = CaseReviewDecision.ESCALATED;

    assignment.auditTrail.push({
      action: 'CASE_ESCALATED',
      performedBy: new mongoose.Types.ObjectId(expertUserId),
      timestamp: new Date(),
      notes: `Escalated to ${seniorExpert.displayName}: ${reason}`,
    });

    await assignment.save();

    // Create new assignment for senior expert
    await this.assignCase({
      reportId: assignment.report.toString(),
      expertId: escalateTo,
      priority: UrgencyLevel.HIGH,
      assignedBy: expertUserId,
    });

    logger.info(`Case ${assignmentId} escalated to ${escalateTo}`);
    return assignment;
  }

  /**
   * Get cases assigned to an expert with filtering
   */
  async getExpertCases(
    expertUserId: string,
    filters: CaseFilterDTO
  ): Promise<{
    cases: ICaseAssignment[];
    total: number;
    page: number;
    pages: number;
  }> {
    const expert = await ExpertProfile.findOne({ user: expertUserId });
    if (!expert) throw new AppError('Expert profile not found', 404);

    const {
      status,
      priority,
      isOutbreak,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = filters;

    const query: Record<string, unknown> = { assignedExpert: expert._id };
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (isOutbreak !== undefined) query.isOutbreak = isOutbreak;
    if (dateFrom || dateTo) {
      query.assignedAt = {};
      if (dateFrom) (query.assignedAt as Record<string, unknown>).$gte = dateFrom;
      if (dateTo) (query.assignedAt as Record<string, unknown>).$lte = dateTo;
    }

    const skip = (page - 1) * limit;
    const [cases, total] = await Promise.all([
      CaseAssignment.find(query)
        .populate('report', 'fieldContext aiDetection status createdAt')
        .sort({ priority: -1, assignedAt: -1 })
        .skip(skip)
        .limit(limit),
      CaseAssignment.countDocuments(query),
    ]);

    return { cases, total, page, pages: Math.ceil(total / limit) };
  }

  /**
   * Get all outbreak cases (admin/analyst view)
   */
  async getOutbreakCases(filters: {
    region?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ cases: ICaseAssignment[]; total: number }> {
    const { region: _region, dateFrom, dateTo, page = 1, limit = 50 } = filters;
    void _region; // region filtering is applied at report level in future iteration
    const query: Record<string, unknown> = { isOutbreak: true };

    if (dateFrom || dateTo) {
      query.reviewedAt = {};
      if (dateFrom) (query.reviewedAt as Record<string, unknown>).$gte = dateFrom;
      if (dateTo) (query.reviewedAt as Record<string, unknown>).$lte = dateTo;
    }

    const skip = (page - 1) * limit;
    const [cases, total] = await Promise.all([
      CaseAssignment.find(query)
        .populate('report', 'fieldContext aiDetection images createdAt')
        .populate('assignedExpert', 'displayName specializations')
        .sort({ reviewedAt: -1 })
        .skip(skip)
        .limit(limit),
      CaseAssignment.countDocuments(query),
    ]);

    return { cases, total };
  }

  /**
   * Get a single case with full details
   */
  async getCaseById(assignmentId: string): Promise<ICaseAssignment> {
    const assignment = await CaseAssignment.findById(assignmentId)
      .populate('report')
      .populate('assignedExpert', 'displayName specializations performance')
      .populate('escalatedTo', 'displayName')
      .populate('assignedBy', 'firstName lastName');
    if (!assignment) throw new AppError('Case assignment not found', 404);
    return assignment;
  }

  /**
   * Admin: get all cases with filters
   */
  async getAllCases(filters: CaseFilterDTO): Promise<{
    cases: ICaseAssignment[];
    total: number;
    page: number;
    pages: number;
  }> {
    const { expertId, status, priority, isOutbreak, page = 1, limit = 20 } = filters;

    const query: Record<string, unknown> = {};
    if (expertId) query.assignedExpert = expertId;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (isOutbreak !== undefined) query.isOutbreak = isOutbreak;

    const skip = (page - 1) * limit;
    const [cases, total] = await Promise.all([
      CaseAssignment.find(query)
        .populate('report', 'fieldContext aiDetection status')
        .populate('assignedExpert', 'displayName primarySpecialization')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CaseAssignment.countDocuments(query),
    ]);

    return { cases, total, page, pages: Math.ceil(total / limit) };
  }

  /**
   * Get AI feedback submissions for model retraining pipeline
   */
  async getAIFeedbackData(
    modelId?: string,
    limit = 100
  ): Promise<Array<{
    reportId: string;
    originalPrediction: string;
    originalConfidence: number;
    expertDecision: string;
    expertAgreement: boolean;
    confirmedDiagnosis?: string;
    feedbackNotes?: string;
  }>> {
    const query: Record<string, unknown> = {
      'aiFeedback': { $exists: true },
      status: CaseReviewStatus.REVIEWED,
    };
    if (modelId) query['aiFeedback.modelId'] = modelId;

    const cases = await CaseAssignment.find(query)
      .select('report decision confirmedDiagnosis aiFeedback')
      .limit(limit)
      .lean();

    return cases.map((c) => ({
      reportId: c.report.toString(),
      originalPrediction: c.aiFeedback!.originalPrediction,
      originalConfidence: c.aiFeedback!.originalConfidence,
      expertDecision: c.decision ?? '',
      expertAgreement: c.aiFeedback!.expertAgreement,
      confirmedDiagnosis: c.confirmedDiagnosis,
      feedbackNotes: c.aiFeedback?.feedbackNotes,
    }));
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async getAssignmentForExpert(
    assignmentId: string,
    expertUserId: string
  ): Promise<ICaseAssignment> {
    const expert = await ExpertProfile.findOne({ user: expertUserId });
    if (!expert) throw new AppError('Expert profile not found', 404);

    const assignment = await CaseAssignment.findOne({
      _id: assignmentId,
      assignedExpert: expert._id,
    });
    if (!assignment) throw new AppError('Case assignment not found or not authorized', 404);
    return assignment;
  }
}

export default new CaseReviewService();
