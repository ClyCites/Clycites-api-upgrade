/**
 * Expert Portal — Controller
 *
 * All handlers follow the project pattern:
 *  - successResponse(res, data, message, statusCode)
 *  - req.user!.id  (typed via Express augmentation)
 *  - AppError for domain errors
 */

import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../../common/utils/response';
import { ResponseHandler } from '../../common/utils/response';
import { AppError } from '../../common/errors/AppError';
import expertIdentityService from './expertIdentity.service';
import caseReviewService from './caseReview.service';
import knowledgeBaseService from './knowledgeBase.service';
import advisoryService from './advisory.service';
import analyticsService from './analytics.service';
import { InquiryStatus, KnowledgeCategory, AdvisoryType, UrgencyLevel } from './expert.types';
import { advisoryUiStatus, knowledgeUiStatus, legacyCaseUiStatus } from './expert.status';

const toPlainObject = <T extends Record<string, unknown>>(value: T): T => {
  if (value && typeof (value as { toObject?: () => T }).toObject === 'function') {
    return (value as unknown as { toObject: () => T }).toObject();
  }
  return value;
};

const toOptionalNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;

// ============================================================================
// EXPERT IDENTITY
// ============================================================================

/**
 * POST /expert-portal/experts
 * Register self as an expert (user must be authenticated)
 */
export const registerExpert = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const expert = await expertIdentityService.registerExpert({ ...req.body, userId }, userId);
    successResponse(res, expert, 'Expert profile submitted for verification', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /expert-portal/experts
 * List all experts (admin / public browse)
 */
export const listExperts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { specialization, region, status, page, limit } = req.query as Record<string, string>;
    const result = await expertIdentityService.listExperts({
      specialization: specialization as never,
      region,
      status: status as never,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    successResponse(res, result, 'Experts retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /expert-portal/experts/:id
 * Get expert by MongoDB ID
 */
export const getExpert = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const expert = await expertIdentityService.getExpertById(req.params.id);
    successResponse(res, expert, 'Expert retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /expert-portal/experts/me
 * Get own expert profile
 */
export const getMyExpertProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const expert = await expertIdentityService.getExpertByUserId(req.user!.id);
    successResponse(res, expert, 'Expert profile retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /expert-portal/experts/:id
 * Update expert profile (own profile or admin)
 */
export const updateExpertProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const expert = await expertIdentityService.updateProfile(
      req.params.id,
      req.body,
      req.user!.id
    );
    successResponse(res, expert, 'Expert profile updated');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /expert-portal/experts/:id/verify
 * Approve or reject expert application (admin only)
 */
export const verifyExpert = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { approve, reason } = req.body;
    const expert = await expertIdentityService.verifyExpert(
      req.params.id,
      req.user!.id,
      approve,
      reason
    );
    successResponse(
      res,
      expert,
      approve ? 'Expert verified successfully' : 'Expert application rejected'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /expert-portal/experts/:id/suspend
 * Suspend an expert account (admin only)
 */
export const suspendExpert = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { reason } = req.body;
    const expert = await expertIdentityService.suspendExpert(
      req.params.id,
      req.user!.id,
      reason
    );
    successResponse(res, expert, 'Expert suspended');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /expert-portal/experts/:id/dashboard
 * Expert's own performance dashboard
 */
export const getExpertDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dashboard = await expertIdentityService.getPerformanceDashboard(req.params.id);
    successResponse(res, dashboard, 'Dashboard retrieved');
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CASE REVIEW
// ============================================================================

/**
 * GET /expert-portal/cases
 * List all cases (admin / senior expert)
 */
export const listCases = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, isOutbreak, page, limit } = req.query as Record<string, string>;
    const result = await caseReviewService.getAllCases({
      status: status as never,
      isOutbreak: isOutbreak === 'true' ? true : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    const mappedCases = result.cases.map((item) => {
      const plain = item.toObject();
      return {
        ...plain,
        uiStatus: legacyCaseUiStatus(plain.status as never),
      };
    });

    ResponseHandler.success(
      res,
      {
        ...result,
        cases: mappedCases,
      },
      'Cases retrieved',
      200,
      {
        pagination: {
          page: result.page,
          limit: Number(limit || 20),
          total: result.total,
          totalPages: result.pages,
        },
      }
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /expert-portal/cases/my
 * Get cases assigned to current expert
 */
export const getMyCases = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, page, limit } = req.query as Record<string, string>;
    const result = await caseReviewService.getExpertCases(req.user!.id, {
      status: status as never,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    const mappedCases = result.cases.map((item) => {
      const plain = item.toObject();
      return {
        ...plain,
        uiStatus: legacyCaseUiStatus(plain.status as never),
      };
    });
    ResponseHandler.success(
      res,
      {
        ...result,
        cases: mappedCases,
      },
      'Expert cases retrieved',
      200,
      {
        pagination: {
          page: result.page,
          limit: Number(limit || 20),
          total: result.total,
          totalPages: result.pages,
        },
      }
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /expert-portal/cases/outbreaks
 * Get confirmed outbreak cases
 */
export const getOutbreakCases = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { region, from, to, page, limit } = req.query as Record<string, string>;
    const result = await caseReviewService.getOutbreakCases({
      region,
      dateFrom: from ? new Date(from) : undefined,
      dateTo: to ? new Date(to) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    const mappedCases = result.cases.map((item) => {
      const plain = item.toObject();
      return {
        ...plain,
        uiStatus: legacyCaseUiStatus(plain.status as never),
      };
    });

    ResponseHandler.success(
      res,
      {
        ...result,
        cases: mappedCases,
      },
      'Outbreak cases retrieved',
      200,
      {
        pagination: {
          page: Number(page || 1),
          limit: Number(limit || 50),
          total: result.total,
          totalPages: Math.ceil(result.total / Number(limit || 50)) || 1,
        },
      }
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /expert-portal/cases/:id/assign
 * Manually assign a case to an expert (admin)
 */
export const assignCase = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { expertId } = req.body;
    const caseDoc = await caseReviewService.assignCase({
      reportId: req.params.id,
      expertId,
      assignedBy: req.user!.id,
    });
    const plain = caseDoc.toObject();
    successResponse(res, { ...plain, uiStatus: legacyCaseUiStatus(plain.status as never) }, 'Case assigned');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /expert-portal/cases/:id/start
 * Expert starts reviewing a case
 */
export const startCaseReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const caseDoc = await caseReviewService.startReview(req.params.id, req.user!.id);
    const plain = caseDoc.toObject();
    successResponse(
      res,
      { ...plain, uiStatus: legacyCaseUiStatus(plain.status as never) },
      'Case review started'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /expert-portal/cases/:id/submit
 * Expert submits a case review
 */
export const submitCaseReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const caseDoc = await caseReviewService.submitReview(req.params.id, req.user!.id, req.body);
    const plain = caseDoc.toObject();
    successResponse(
      res,
      { ...plain, uiStatus: legacyCaseUiStatus(plain.status as never) },
      'Case review submitted'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /expert-portal/cases/:id/escalate
 * Escalate a case to a senior expert
 */
export const escalateCase = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { reason, escalateToExpertId } = req.body;
    const caseDoc = await caseReviewService.escalateCase(
      req.params.id,
      req.user!.id,
      escalateToExpertId,
      reason
    );
    successResponse(res, caseDoc, 'Case escalated');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /expert-portal/cases/:id/ai-feedback
 * Submit AI model feedback for a case
 */
export const submitAIFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { feedbackType, confidenceScore, notes } = req.body;
    // AI feedback is embedded in review submission; update via submitReview with aiFeedback field
    const caseDoc = await caseReviewService.submitReview(req.params.id, req.user!.id, {
      aiFeedback: { type: feedbackType, confidence: confidenceScore, notes },
    } as never);
    successResponse(res, caseDoc, 'AI feedback recorded');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /expert-portal/cases/ai-feedback
 * Get all AI feedback data (for model retraining)
 */
export const getAIFeedbackData = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await caseReviewService.getAIFeedbackData();
    successResponse(res, data, 'AI feedback data retrieved');
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// KNOWLEDGE BASE
// ============================================================================

/**
 * POST /expert-portal/knowledge
 * Create a knowledge article
 */
export const createArticle = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const expert = await expertIdentityService.getExpertByUserId(req.user!.id);
    if (!expert) throw new AppError('Expert profile not found', 404);
    const article = await knowledgeBaseService.createArticle(
      expert._id.toString(),
      req.body
    );
    const plain = toPlainObject(article as unknown as Record<string, unknown>);
    successResponse(
      res,
      { ...plain, uiStatus: knowledgeUiStatus(plain.status as never) },
      'Knowledge article created',
      201
    );
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /expert-portal/knowledge/:id
 * Update a knowledge article
 */
export const updateArticle = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const article = await knowledgeBaseService.updateArticle(
      req.params.id,
      req.user!.id,
      req.body
    );
    const plain = toPlainObject(article as unknown as Record<string, unknown>);
    successResponse(
      res,
      { ...plain, uiStatus: knowledgeUiStatus(plain.status as never) },
      'Article updated'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /expert-portal/knowledge/:id
 * Archive (delete) a knowledge article
 */
export const deleteArticle = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await knowledgeBaseService.deleteArticle(req.params.id, req.user!.id, req.user!.role);
    successResponse(res, null, 'Article deleted');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /expert-portal/knowledge/:id/submit
 * Submit article for editorial review
 */
export const submitArticleForReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const article = await knowledgeBaseService.submitForReview(req.params.id, req.user!.id);
    const plain = toPlainObject(article as unknown as Record<string, unknown>);
    successResponse(
      res,
      { ...plain, uiStatus: knowledgeUiStatus(plain.status as never) },
      'Article submitted for review'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /expert-portal/knowledge/:id/review
 * Editor reviews an article
 */
export const reviewArticle = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { approve, reviewNotes } = req.body;
    const article = await knowledgeBaseService.reviewArticle(
      req.params.id,
      req.user!.id,
      approve,
      reviewNotes
    );
    const plain = toPlainObject(article as unknown as Record<string, unknown>);
    successResponse(
      res,
      { ...plain, uiStatus: knowledgeUiStatus(plain.status as never) },
      approve ? 'Article approved' : 'Article needs revision'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /expert-portal/knowledge/:id/publish
 * Publish an article
 */
export const publishArticle = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const article = await knowledgeBaseService.publishArticle(req.params.id, req.user!.id);
    const plain = toPlainObject(article as unknown as Record<string, unknown>);
    successResponse(
      res,
      { ...plain, uiStatus: knowledgeUiStatus(plain.status as never) },
      'Article published'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /expert-portal/knowledge
 * Search / list articles (public)
 */
export const searchArticles = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { q, category, region, crop, page, limit } = req.query as Record<string, string>;

    const result = await knowledgeBaseService.searchArticles({
      query: q,
      category: category as KnowledgeCategory,
      region,
      cropType: crop,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    const rows = result.articles.map((article) => {
      const plain = toPlainObject(article as unknown as Record<string, unknown>);
      return { ...plain, uiStatus: knowledgeUiStatus(plain.status as never) };
    });
    ResponseHandler.success(
      res,
      {
        ...result,
        articles: rows,
      },
      'Articles retrieved',
      200,
      {
        pagination: {
          page: result.page,
          limit: Number(limit || 20),
          total: result.total,
          totalPages: result.pages,
        },
      }
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /expert-portal/knowledge/:id
 * Get article by ID (increments view count)
 */
export const getArticle = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const article = await knowledgeBaseService.getArticle(req.params.id);
    const plain = toPlainObject(article as unknown as Record<string, unknown>);
    successResponse(
      res,
      { ...plain, uiStatus: knowledgeUiStatus(plain.status as never) },
      'Article retrieved'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /expert-portal/knowledge/:id/rate
 * Rate an article
 */
export const rateArticle = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rating } = req.body;
    // service rateArticle(id, helpful: boolean) — rating >= 3 means helpful
    const article = await knowledgeBaseService.rateArticle(req.params.id, rating >= 3);
    successResponse(res, article, 'Rating submitted');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /expert-portal/knowledge/:id/translate
 * Add a translation for an article
 */
export const addArticleTranslation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { language, title, summary, content } = req.body;
    const article = await knowledgeBaseService.addTranslation(
      req.params.id,
      req.user!.id,
      language,
      title,
      summary,
      content
    );
    successResponse(res, article, 'Translation added');
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// ADVISORIES
// ============================================================================

/**
 * POST /expert-portal/advisories
 * Create a new advisory
 */
export const createAdvisory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const expert = await expertIdentityService.getExpertByUserId(req.user!.id);
    if (!expert) throw new AppError('Expert profile not found', 404);
    const advisory = await advisoryService.createAdvisory(
      expert._id.toString(),
      req.body,
      req.user!.id
    );
    const plain = toPlainObject(advisory as unknown as Record<string, unknown>);
    successResponse(
      res,
      {
        ...plain,
        uiStatus: advisoryUiStatus(plain.status as never, toOptionalNumber(plain.acknowledgedCount)),
      },
      'Advisory created',
      201
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /expert-portal/advisories/:id/send
 * Send / broadcast an advisory
 */
export const sendAdvisory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await advisoryService.sendAdvisory(req.params.id, req.user!.id);
    const status = advisoryUiStatus(result.status, result.acknowledgedCount);
    successResponse(res, { ...result, uiStatus: status }, 'Advisory sent successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /expert-portal/advisories/emergency
 * Immediately issue an emergency alert
 */
export const issueEmergencyAlert = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const expert2 = await expertIdentityService.getExpertByUserId(req.user!.id);
    if (!expert2) throw new AppError('Expert profile not found', 404);
    const result = await advisoryService.issueEmergencyAlert(
      expert2._id.toString(),
      req.user!.id,
      req.body
    );
    const plain = typeof (result as { toObject?: () => Record<string, unknown> }).toObject === 'function'
      ? (result as { toObject: () => Record<string, unknown> }).toObject()
      : (result as unknown as Record<string, unknown>);
    successResponse(
      res,
      {
        ...plain,
        uiStatus: advisoryUiStatus(plain.status as never, toOptionalNumber(plain.acknowledgedCount)),
      },
      'Emergency alert issued',
      201
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /expert-portal/advisories
 * List advisories with filters (admin/expert)
 */
export const listAdvisories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { type, urgency, region, crop, status, page, limit } = req.query as Record<
      string,
      string
    >;
    const result = await advisoryService.listAdvisories({
      type: type as AdvisoryType,
      urgency: urgency as UrgencyLevel,
      region,
      crop,
      status: status as never,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    const rows = result.advisories.map((advisory) => {
      const plain = advisory.toObject();
      return {
        ...plain,
        uiStatus: advisoryUiStatus(plain.status as never, plain.acknowledgedCount),
      };
    });
    ResponseHandler.success(
      res,
      {
        ...result,
        advisories: rows,
      },
      'Advisories retrieved',
      200,
      {
        pagination: {
          page: result.page,
          limit: Number(limit || 20),
          total: result.total,
          totalPages: result.pages,
        },
      }
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /expert-portal/advisories/feed
 * Farmer advisory feed
 */
export const getFarmerAdvisoryFeed = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { region, page, limit } = req.query as Record<string, string>;
    const crops = req.query.crops ? String(req.query.crops).split(',') : undefined;
    const advisories = await advisoryService.getFarmerAdvisories({
      region,
      crops,
      role: req.user!.role,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    const rows = advisories.map((advisory) => {
      const plain = advisory.toObject();
      return {
        ...plain,
        uiStatus: advisoryUiStatus(plain.status as never, plain.acknowledgedCount),
      };
    });
    ResponseHandler.success(
      res,
      rows,
      'Advisory feed retrieved',
      200,
      {
        pagination: {
          page: Number(page || 1),
          limit: Number(limit || 20),
          total: rows.length,
          totalPages: 1,
        },
      }
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /expert-portal/advisories/:id/acknowledge
 * Farmer acknowledges an advisory
 */
export const acknowledgeAdvisory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const advisory = await advisoryService.acknowledgeAdvisory(req.params.id);
    const plain = toPlainObject(advisory as unknown as Record<string, unknown>);
    successResponse(
      res,
      {
        ...plain,
        uiStatus: advisoryUiStatus(plain.status as never, toOptionalNumber(plain.acknowledgedCount)),
      },
      'Advisory acknowledged'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /expert-portal/advisories/:id
 * Get advisory by ID
 */
export const getAdvisory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const advisory = await advisoryService.getAdvisoryById(req.params.id);
    const plain = toPlainObject(advisory as unknown as Record<string, unknown>);
    successResponse(
      res,
      {
        ...plain,
        uiStatus: advisoryUiStatus(plain.status as never, toOptionalNumber(plain.acknowledgedCount)),
      },
      'Advisory retrieved'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /expert-portal/advisories/:id
 * Update advisory
 */
export const updateAdvisory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const advisory = await advisoryService.updateAdvisory(
      req.params.id,
      req.user!.id,
      req.user!.role,
      req.body
    );
    const plain = toPlainObject(advisory as unknown as Record<string, unknown>);
    successResponse(
      res,
      {
        ...plain,
        uiStatus: advisoryUiStatus(plain.status as never, toOptionalNumber(plain.acknowledgedCount)),
      },
      'Advisory updated'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /expert-portal/advisories/:id
 * Delete advisory
 */
export const deleteAdvisory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await advisoryService.deleteAdvisory(req.params.id, req.user!.id, req.user!.role);
    successResponse(res, null, 'Advisory deleted');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /expert-portal/advisories/:id/submit
 * Submit advisory for review
 */
export const submitAdvisory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const advisory = await advisoryService.submitAdvisory(req.params.id, req.user!.id);
    const plain = toPlainObject(advisory as unknown as Record<string, unknown>);
    successResponse(
      res,
      {
        ...plain,
        uiStatus: advisoryUiStatus(plain.status as never, toOptionalNumber(plain.acknowledgedCount)),
      },
      'Advisory submitted for review'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /expert-portal/advisories/:id/review
 * Review advisory submission
 */
export const reviewAdvisory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { decision, reason } = req.body;
    const advisory = await advisoryService.reviewAdvisory(
      req.params.id,
      req.user!.id,
      decision,
      reason
    );
    const plain = toPlainObject(advisory as unknown as Record<string, unknown>);
    successResponse(
      res,
      {
        ...plain,
        uiStatus: advisoryUiStatus(plain.status as never, toOptionalNumber(plain.acknowledgedCount)),
      },
      decision === 'approved' ? 'Advisory approved' : 'Advisory rejected'
    );
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// FARMER INQUIRIES
// ============================================================================

/**
 * POST /expert-portal/inquiries
 * Farmer creates an inquiry
 */
export const createInquiry = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const inquiry = await advisoryService.createInquiry({
      farmerId: req.user!.id,
      ...req.body,
    });
    successResponse(res, inquiry, 'Inquiry submitted', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /expert-portal/inquiries/my
 * Get farmer's own inquiries
 */
export const getMyInquiries = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.query as Record<string, string>;
    const inquiries = await advisoryService.getFarmerInquiries(
      req.user!.id,
      status as InquiryStatus
    );
    successResponse(res, inquiries, 'Inquiries retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /expert-portal/inquiries/assigned
 * Get inquiries assigned to current expert
 */
export const getAssignedInquiries = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, page, limit } = req.query as Record<string, string>;
    const result = await advisoryService.getExpertInquiries(
      req.user!.id,
      status as InquiryStatus,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20
    );
    successResponse(res, result, 'Assigned inquiries retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /expert-portal/inquiries/unassigned
 * Get open unassigned inquiries (admin)
 */
export const getUnassignedInquiries = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const inquiries = await advisoryService.getUnassignedInquiries(limit);
    successResponse(res, inquiries, 'Unassigned inquiries retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /expert-portal/inquiries/:id/assign
 * Admin assigns inquiry to expert
 */
export const assignInquiry = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { expertId } = req.body;
    const inquiry = await advisoryService.assignInquiry(
      req.params.id,
      expertId,
      req.user!.id
    );
    successResponse(res, inquiry, 'Inquiry assigned');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /expert-portal/inquiries/:id/respond
 * Expert responds to an inquiry
 */
export const respondToInquiry = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const inquiry = await advisoryService.respondToInquiry(
      req.params.id,
      req.user!.id,
      req.body
    );
    successResponse(res, inquiry, 'Response submitted');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /expert-portal/inquiries/:id/followup
 * Add follow-up message (farmer or expert)
 */
export const addFollowUp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const isExpert = ['expert', 'platform_admin', 'super_admin'].includes(req.user!.role);
    const inquiry = await advisoryService.addFollowUpMessage(
      req.params.id,
      req.user!.id,
      req.body.message,
      isExpert
    );
    successResponse(res, inquiry, 'Follow-up message added');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /expert-portal/inquiries/:id/rate
 * Farmer rates expert's response
 */
export const rateExpertResponse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rating, feedback } = req.body;
    const inquiry = await advisoryService.rateResponse(
      req.params.id,
      req.user!.id,
      rating,
      feedback
    );
    successResponse(res, inquiry, 'Response rated');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /expert-portal/inquiries/:id
 * Get inquiry by ID
 */
export const getInquiry = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const inquiry = await advisoryService.getInquiryById(
      req.params.id,
      req.user!.id,
      req.user!.role
    );
    successResponse(res, inquiry, 'Inquiry retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /expert-portal/inquiries/:id
 * Update inquiry
 */
export const updateInquiry = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const inquiry = await advisoryService.updateInquiry(
      req.params.id,
      req.user!.id,
      req.user!.role,
      req.body
    );
    successResponse(res, inquiry, 'Inquiry updated');
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /expert-portal/inquiries/:id
 * Delete inquiry
 */
export const deleteInquiry = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await advisoryService.deleteInquiry(req.params.id, req.user!.id, req.user!.role);
    successResponse(res, null, 'Inquiry deleted');
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * GET /expert-portal/analytics/disease-spread
 */
export const getDiseaseSpread = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { from, to, region = 'all' } = req.query as Record<string, string>;
    if (!from || !to) throw new AppError('from and to date query params required', 400);
    const data = await analyticsService.getRegionalDiseaseSpread(region, {
      from: new Date(from),
      to: new Date(to),
    });
    successResponse(res, data, 'Disease spread data retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /expert-portal/analytics/outbreaks/heatmap
 */
export const getOutbreakHeatmap = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { from, to } = req.query as Record<string, string>;
    if (!from || !to) throw new AppError('from and to date query params required', 400);
    const data = await analyticsService.getOutbreakHeatmap({
      from: new Date(from),
      to: new Date(to),
    });
    successResponse(res, data, 'Outbreak heatmap retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /expert-portal/analytics/ai-accuracy
 */
export const getAIAccuracy = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { from, to, period = 'week' } = req.query as Record<string, string>;
    if (!from || !to) throw new AppError('from and to date query params required', 400);
    const data = await analyticsService.getAIAccuracyTrend(
      { from: new Date(from), to: new Date(to) },
      period as 'day' | 'week' | 'month'
    );
    successResponse(res, data, 'AI accuracy trend retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /expert-portal/analytics/knowledge-base
 */
export const getKnowledgeBaseStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { from, to } = req.query as Record<string, string>;
    const dateRange = from && to ? { from: new Date(from), to: new Date(to) } : undefined;
    const data = await analyticsService.getKnowledgeBaseStats(dateRange);
    successResponse(res, data, 'Knowledge base stats retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /expert-portal/analytics/experts
 */
export const getExpertPerformanceReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { from, to } = req.query as Record<string, string>;
    if (!from || !to) throw new AppError('from and to date query params required', 400);
    const data = await analyticsService.getExpertPerformanceReport({
      from: new Date(from),
      to: new Date(to),
    });
    successResponse(res, data, 'Expert performance report retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /expert-portal/analytics/dashboard
 * High-level policy dashboard
 */
export const getPolicyDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { from, to } = req.query as Record<string, string>;
    if (!from || !to) throw new AppError('from and to date query params required', 400);
    const data = await analyticsService.getPolicyDashboard({
      from: new Date(from),
      to: new Date(to),
    });
    successResponse(res, data, 'Policy dashboard retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /expert-portal/analytics/advisory-engagement
 */
export const getAdvisoryEngagement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { from, to } = req.query as Record<string, string>;
    if (!from || !to) throw new AppError('from and to date query params required', 400);
    const data = await analyticsService.getAdvisoryEngagement({
      from: new Date(from),
      to: new Date(to),
    });
    successResponse(res, data, 'Advisory engagement retrieved');
  } catch (err) {
    next(err);
  }
};
