/**
 * Expert Portal — Routes
 *
 * Base: /api/v1/expert-portal
 *
 * Route Groups:
 *   /experts          Expert identity, verification, profiles
 *   /cases            AI case review lifecycle
 *   /knowledge        Knowledge base articles
 *   /advisories       Expert advisories & emergency alerts
 *   /inquiries        Farmer consultation requests
 *   /analytics        Regional intelligence & dashboard
 */

import express from 'express';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';

import {
  // Expert identity
  registerExpert,
  listExperts,
  getExpert,
  getMyExpertProfile,
  updateExpertProfile,
  verifyExpert,
  suspendExpert,
  getExpertDashboard,
  // Case review
  listCases,
  getMyCases,
  getOutbreakCases,
  assignCase,
  startCaseReview,
  submitCaseReview,
  escalateCase,
  submitAIFeedback,
  getAIFeedbackData,
  // Knowledge base
  createArticle,
  updateArticle,
  submitArticleForReview,
  reviewArticle,
  publishArticle,
  searchArticles,
  getArticle,
  rateArticle,
  addArticleTranslation,
  // Advisories
  createAdvisory,
  sendAdvisory,
  issueEmergencyAlert,
  listAdvisories,
  getFarmerAdvisoryFeed,
  acknowledgeAdvisory,
  // Inquiries
  createInquiry,
  getMyInquiries,
  getAssignedInquiries,
  getUnassignedInquiries,
  assignInquiry,
  respondToInquiry,
  addFollowUp,
  rateExpertResponse,
  // Analytics
  getDiseaseSpread,
  getOutbreakHeatmap,
  getAIAccuracy,
  getKnowledgeBaseStats,
  getExpertPerformanceReport,
  getPolicyDashboard,
  getAdvisoryEngagement,
} from './expert.controller';

import {
  registerExpertSchema,
  updateExpertProfileSchema,
  verifyExpertSchema,
  submitCaseReviewSchema,
  escalateCaseSchema,
  aiFeedbackSchema,
  createArticleSchema,
  updateArticleSchema,
  reviewArticleSchema,
  rateArticleSchema,
  addTranslationSchema,
  createAdvisorySchema,
  emergencyAlertSchema,
  createInquirySchema,
  respondToInquirySchema,
  followUpMessageSchema,
  rateResponseSchema,
} from './expert.validator';

const router = express.Router();

// ===========================================================================
// EXPERT IDENTITY  /experts
// ===========================================================================

/**
 * @route   POST /api/v1/expert-portal/experts
 * @desc    Register as an expert (any authenticated user)
 * @access  Private
 */
router.post(
  '/experts',
  authenticate,
  validate(registerExpertSchema),
  registerExpert
);

/**
 * @route   GET /api/v1/expert-portal/experts
 * @desc    List all experts (filterable)
 * @access  Private (all roles)
 */
router.get('/experts', authenticate, listExperts);

/**
 * @route   GET /api/v1/expert-portal/experts/me
 * @desc    Get own expert profile
 * @access  Private
 */
router.get('/experts/me', authenticate, getMyExpertProfile);

/**
 * @route   GET /api/v1/expert-portal/experts/:id
 * @desc    Get expert by ID
 * @access  Private
 */
router.get('/experts/:id', authenticate, getExpert);

/**
 * @route   PATCH /api/v1/expert-portal/experts/:id
 * @desc    Update expert profile
 * @access  Private (own profile or admin)
 */
router.patch(
  '/experts/:id',
  authenticate,
  validate(updateExpertProfileSchema),
  updateExpertProfile
);

/**
 * @route   POST /api/v1/expert-portal/experts/:id/verify
 * @desc    Verify or reject an expert application
 * @access  Private (admin only)
 */
router.post(
  '/experts/:id/verify',
  authenticate,
  authorize('platform_admin'),
  validate(verifyExpertSchema),
  verifyExpert
);

/**
 * @route   POST /api/v1/expert-portal/experts/:id/suspend
 * @desc    Suspend an expert
 * @access  Private (admin only)
 */
router.post(
  '/experts/:id/suspend',
  authenticate,
  authorize('platform_admin'),
  suspendExpert
);

/**
 * @route   GET /api/v1/expert-portal/experts/:id/dashboard
 * @desc    Get expert performance dashboard
 * @access  Private (own or admin)
 */
router.get('/experts/:id/dashboard', authenticate, getExpertDashboard);

// ===========================================================================
// CASE REVIEW  /cases
// ===========================================================================

/**
 * @route   GET /api/v1/expert-portal/cases
 * @desc    List all cases (admin / senior expert)
 * @access  Private (expert, platform_admin)
 */
router.get(
  '/cases',
  authenticate,
  authorize('expert', 'platform_admin'),
  listCases
);

/**
 * @route   GET /api/v1/expert-portal/cases/my
 * @desc    Get cases assigned to current expert
 * @access  Private (expert)
 */
router.get('/cases/my', authenticate, authorize('expert'), getMyCases);

/**
 * @route   GET /api/v1/expert-portal/cases/outbreaks
 * @desc    Get confirmed outbreak cases
 * @access  Private (expert, admin)
 */
router.get(
  '/cases/outbreaks',
  authenticate,
  authorize('expert', 'platform_admin'),
  getOutbreakCases
);

/**
 * @route   GET /api/v1/expert-portal/cases/ai-feedback
 * @desc    Get AI model feedback data (ML pipeline)
 * @access  Private (admin only)
 */
router.get(
  '/cases/ai-feedback',
  authenticate,
  authorize('platform_admin'),
  getAIFeedbackData
);

/**
 * @route   POST /api/v1/expert-portal/cases/:id/assign
 * @desc    Assign a case to an expert (admin)
 * @access  Private (admin)
 */
router.post(
  '/cases/:id/assign',
  authenticate,
  authorize('platform_admin'),
  assignCase
);

/**
 * @route   POST /api/v1/expert-portal/cases/:id/start
 * @desc    Expert starts reviewing a case
 * @access  Private (expert)
 */
router.post('/cases/:id/start', authenticate, authorize('expert'), startCaseReview);

/**
 * @route   POST /api/v1/expert-portal/cases/:id/submit
 * @desc    Expert submits case review decision
 * @access  Private (expert)
 */
router.post(
  '/cases/:id/submit',
  authenticate,
  authorize('expert'),
  validate(submitCaseReviewSchema),
  submitCaseReview
);

/**
 * @route   POST /api/v1/expert-portal/cases/:id/escalate
 * @desc    Escalate a case to a senior expert
 * @access  Private (expert)
 */
router.post(
  '/cases/:id/escalate',
  authenticate,
  authorize('expert'),
  validate(escalateCaseSchema),
  escalateCase
);

/**
 * @route   POST /api/v1/expert-portal/cases/:id/ai-feedback
 * @desc    Submit AI detection feedback
 * @access  Private (expert, admin)
 */
router.post(
  '/cases/:id/ai-feedback',
  authenticate,
  authorize('expert', 'platform_admin'),
  validate(aiFeedbackSchema),
  submitAIFeedback
);

// ===========================================================================
// KNOWLEDGE BASE  /knowledge
// ===========================================================================

/**
 * @route   POST /api/v1/expert-portal/knowledge
 * @desc    Create a knowledge article
 * @access  Private (expert, admin)
 */
router.post(
  '/knowledge',
  authenticate,
  authorize('expert', 'platform_admin'),
  validate(createArticleSchema),
  createArticle
);

/**
 * @route   GET /api/v1/expert-portal/knowledge
 * @desc    Search / list published articles
 * @access  Public (no auth for read)
 */
router.get('/knowledge', searchArticles);

/**
 * @route   GET /api/v1/expert-portal/knowledge/:id
 * @desc    Get a specific article
 * @access  Public
 */
router.get('/knowledge/:id', getArticle);

/**
 * @route   PATCH /api/v1/expert-portal/knowledge/:id
 * @desc    Update an article
 * @access  Private (author expert or admin)
 */
router.patch(
  '/knowledge/:id',
  authenticate,
  authorize('expert', 'platform_admin'),
  validate(updateArticleSchema),
  updateArticle
);

/**
 * @route   POST /api/v1/expert-portal/knowledge/:id/submit
 * @desc    Submit article for editorial review
 * @access  Private (expert)
 */
router.post(
  '/knowledge/:id/submit',
  authenticate,
  authorize('expert', 'platform_admin'),
  submitArticleForReview
);

/**
 * @route   POST /api/v1/expert-portal/knowledge/:id/review
 * @desc    Reviewer approves/rejects article
 * @access  Private (admin / senior expert)
 */
router.post(
  '/knowledge/:id/review',
  authenticate,
  authorize('platform_admin'),
  validate(reviewArticleSchema),
  reviewArticle
);

/**
 * @route   POST /api/v1/expert-portal/knowledge/:id/publish
 * @desc    Publish an approved article
 * @access  Private (admin)
 */
router.post(
  '/knowledge/:id/publish',
  authenticate,
  authorize('platform_admin'),
  publishArticle
);

/**
 * @route   POST /api/v1/expert-portal/knowledge/:id/rate
 * @desc    Rate a knowledge article
 * @access  Private (any role)
 */
router.post(
  '/knowledge/:id/rate',
  authenticate,
  validate(rateArticleSchema),
  rateArticle
);

/**
 * @route   POST /api/v1/expert-portal/knowledge/:id/translate
 * @desc    Add a translation for an article
 * @access  Private (expert, admin)
 */
router.post(
  '/knowledge/:id/translate',
  authenticate,
  authorize('expert', 'platform_admin'),
  validate(addTranslationSchema),
  addArticleTranslation
);

// ===========================================================================
// ADVISORIES  /advisories
// ===========================================================================

/**
 * @route   GET /api/v1/expert-portal/advisories/feed
 * @desc    Farmer's personalised advisory feed
 * @access  Private (farmer, any authenticated)
 */
router.get('/advisories/feed', authenticate, getFarmerAdvisoryFeed);

/**
 * @route   POST /api/v1/expert-portal/advisories/emergency
 * @desc    Issue an immediate emergency alert
 * @access  Private (expert, admin)
 */
router.post(
  '/advisories/emergency',
  authenticate,
  authorize('expert', 'platform_admin'),
  validate(emergencyAlertSchema),
  issueEmergencyAlert
);

/**
 * @route   POST /api/v1/expert-portal/advisories
 * @desc    Create an advisory (draft or scheduled)
 * @access  Private (expert, admin)
 */
router.post(
  '/advisories',
  authenticate,
  authorize('expert', 'platform_admin'),
  validate(createAdvisorySchema),
  createAdvisory
);

/**
 * @route   GET /api/v1/expert-portal/advisories
 * @desc    List advisories with filters
 * @access  Private (expert, admin)
 */
router.get(
  '/advisories',
  authenticate,
  authorize('expert', 'platform_admin'),
  listAdvisories
);

/**
 * @route   POST /api/v1/expert-portal/advisories/:id/send
 * @desc    Send / broadcast an advisory
 * @access  Private (expert, admin)
 */
router.post(
  '/advisories/:id/send',
  authenticate,
  authorize('expert', 'platform_admin'),
  sendAdvisory
);

/**
 * @route   POST /api/v1/expert-portal/advisories/:id/acknowledge
 * @desc    Acknowledge receipt of an advisory
 * @access  Private (authenticated)
 */
router.post('/advisories/:id/acknowledge', authenticate, acknowledgeAdvisory);

// ===========================================================================
// FARMER INQUIRIES  /inquiries
// ===========================================================================

/**
 * @route   POST /api/v1/expert-portal/inquiries
 * @desc    Farmer submits a consultation inquiry
 * @access  Private (farmer)
 */
router.post(
  '/inquiries',
  authenticate,
  authorize('farmer'),
  validate(createInquirySchema),
  createInquiry
);

/**
 * @route   GET /api/v1/expert-portal/inquiries/my
 * @desc    Get farmer's own inquiries
 * @access  Private (farmer)
 */
router.get('/inquiries/my', authenticate, authorize('farmer'), getMyInquiries);

/**
 * @route   GET /api/v1/expert-portal/inquiries/assigned
 * @desc    Get inquiries assigned to the current expert
 * @access  Private (expert)
 */
router.get(
  '/inquiries/assigned',
  authenticate,
  authorize('expert'),
  getAssignedInquiries
);

/**
 * @route   GET /api/v1/expert-portal/inquiries/unassigned
 * @desc    Get open unassigned inquiries (admin triage)
 * @access  Private (admin)
 */
router.get(
  '/inquiries/unassigned',
  authenticate,
  authorize('platform_admin'),
  getUnassignedInquiries
);

/**
 * @route   POST /api/v1/expert-portal/inquiries/:id/assign
 * @desc    Admin assigns inquiry to an expert
 * @access  Private (admin)
 */
router.post(
  '/inquiries/:id/assign',
  authenticate,
  authorize('platform_admin'),
  assignInquiry
);

/**
 * @route   POST /api/v1/expert-portal/inquiries/:id/respond
 * @desc    Expert responds to an inquiry
 * @access  Private (expert)
 */
router.post(
  '/inquiries/:id/respond',
  authenticate,
  authorize('expert'),
  validate(respondToInquirySchema),
  respondToInquiry
);

/**
 * @route   POST /api/v1/expert-portal/inquiries/:id/followup
 * @desc    Add a follow-up message (farmer or expert)
 * @access  Private
 */
router.post(
  '/inquiries/:id/followup',
  authenticate,
  validate(followUpMessageSchema),
  addFollowUp
);

/**
 * @route   POST /api/v1/expert-portal/inquiries/:id/rate
 * @desc    Farmer rates the expert response
 * @access  Private (farmer)
 */
router.post(
  '/inquiries/:id/rate',
  authenticate,
  authorize('farmer'),
  validate(rateResponseSchema),
  rateExpertResponse
);

// ===========================================================================
// ANALYTICS  /analytics
// ===========================================================================

/**
 * Policy-maker level analytics — require admin or expert role.
 */
router.get(
  '/analytics/disease-spread',
  authenticate,
  authorize('expert', 'platform_admin'),
  getDiseaseSpread
);

router.get(
  '/analytics/outbreaks/heatmap',
  authenticate,
  authorize('expert', 'platform_admin'),
  getOutbreakHeatmap
);

router.get(
  '/analytics/ai-accuracy',
  authenticate,
  authorize('expert', 'platform_admin'),
  getAIAccuracy
);

router.get(
  '/analytics/knowledge-base',
  authenticate,
  authorize('expert', 'platform_admin'),
  getKnowledgeBaseStats
);

router.get(
  '/analytics/experts',
  authenticate,
  authorize('platform_admin'),
  getExpertPerformanceReport
);

router.get(
  '/analytics/advisory-engagement',
  authenticate,
  authorize('expert', 'platform_admin'),
  getAdvisoryEngagement
);

/**
 * @route   GET /api/v1/expert-portal/analytics/dashboard
 * @desc    High-level policy dashboard (directors, government stakeholders)
 * @access  Private (admin)
 */
router.get(
  '/analytics/dashboard',
  authenticate,
  authorize('platform_admin'),
  getPolicyDashboard
);

export default router;
