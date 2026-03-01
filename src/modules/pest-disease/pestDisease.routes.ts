/**
 * Pest & Disease Routes
 * 
 * RESTful API endpoints for the Pest & Disease Detection Module.
 */

import express from 'express';
import multer from 'multer';
import {
  submitDetection,
  getReport,
  getFarmerReports,
  createReportJson,
  updateReport,
  deleteReport,
  assignReport,
  closeReport,
  submitExpertReview,
  submitFeedback,
  getActiveOutbreaks,
  getHotspots,
  getTrends,
  getDashboardAnalytics,
  searchTreatments,
  createTreatmentKnowledge
} from './pestDisease.controller';
import {
  validateDetectionSubmission,
  validateExpertReview,
  validateFeedback,
  validateReportId,
  validateFarmerId,
  validateCreateReportJson,
  validateUpdateReportJson,
  validateAssignReport,
  validateCloseReport,
  validateOutbreakQuery,
  validateHotspotQuery,
  validateAnalyticsQuery,
  validateTreatmentSearch,
  validateTreatmentKnowledgeCreation,
  validatePagination
} from './pestDisease.validator';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';

const router = express.Router();

// ============================================================================
// MULTER CONFIGURATION (Image Upload)
// ============================================================================

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and HEIC images are allowed.'));
    }
  }
});

// ============================================================================
// DETECTION ROUTES
// ============================================================================

/**
 * @route   POST /api/v1/pest-disease/detect
 * @desc    Submit pest/disease detection request with images
 * @access  Private (Farmers, Extension Officers)
 */
router.post(
  '/detect',
  authenticate,
  authorize('farmer', 'extension_officer', 'agronomist', 'platform_admin'),
  upload.array('images', 10),
  validate(validateDetectionSubmission),
  submitDetection
);

/**
 * @route   GET /api/v1/pest-disease/reports/:reportId
 * @desc    Get detection report by ID
 * @access  Private
 */
router.get(
  '/reports/:reportId',
  authenticate,
  validate(validateReportId),
  getReport
);

/**
 * @route   GET /api/v1/pest-disease/farmers/:farmerId/reports
 * @desc    Get all reports for a specific farmer
 * @access  Private
 */
router.get(
  '/farmers/:farmerId/reports',
  authenticate,
  authorize('farmer', 'extension_officer', 'agronomist', 'platform_admin'),
  validate([...validateFarmerId, ...validatePagination]),
  getFarmerReports
);

/**
 * @route   POST /api/v1/pest-disease/farmers/:farmerId/reports
 * @desc    Create a pest/disease report using JSON payload
 * @access  Private
 */
router.post(
  '/farmers/:farmerId/reports',
  authenticate,
  authorize('farmer', 'extension_officer', 'agronomist', 'platform_admin'),
  validate(validateCreateReportJson),
  createReportJson
);

/**
 * @route   PATCH /api/v1/pest-disease/reports/:reportId
 * @desc    Update JSON-friendly report fields
 * @access  Private
 */
router.patch(
  '/reports/:reportId',
  authenticate,
  authorize('farmer', 'extension_officer', 'agronomist', 'platform_admin'),
  validate(validateUpdateReportJson),
  updateReport
);

/**
 * @route   DELETE /api/v1/pest-disease/reports/:reportId
 * @desc    Soft delete report
 * @access  Private
 */
router.delete(
  '/reports/:reportId',
  authenticate,
  authorize('farmer', 'extension_officer', 'agronomist', 'platform_admin'),
  validate(validateReportId),
  deleteReport
);

/**
 * @route   POST /api/v1/pest-disease/reports/:reportId/assign
 * @desc    Assign report for follow-up
 * @access  Private (Extension Officers, Agronomists, Admins)
 */
router.post(
  '/reports/:reportId/assign',
  authenticate,
  authorize('extension_officer', 'agronomist', 'platform_admin'),
  validate(validateAssignReport),
  assignReport
);

/**
 * @route   POST /api/v1/pest-disease/reports/:reportId/close
 * @desc    Close report
 * @access  Private (Extension Officers, Agronomists, Admins)
 */
router.post(
  '/reports/:reportId/close',
  authenticate,
  authorize('extension_officer', 'agronomist', 'platform_admin'),
  validate(validateCloseReport),
  closeReport
);

// ============================================================================
// EXPERT REVIEW ROUTES
// ============================================================================

/**
  * @route   POST /api/v1/pest-disease/reports/:reportId/review
 * @desc    Submit expert review for a detection report
 * @access  Private (Extension Officers, Agronomists, Admins)
 */
router.post(
  '/reports/:reportId/review',
  authenticate,
  authorize('extension_officer', 'agronomist', 'platform_admin'),
  validate(validateExpertReview),
  submitExpertReview
);

/**
 * @route   POST /api/v1/pest-disease/reports/:reportId/feedback
 * @desc    Submit farmer feedback on detection accuracy
 * @access  Private (Farmers)
 */
router.post(
  '/reports/:reportId/feedback',
  authenticate,
  authorize('farmer', 'extension_officer', 'platform_admin'),
  validate(validateFeedback),
  submitFeedback
);

// ============================================================================
// OUTBREAK ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/pest-disease/outbreaks
 * @desc    Get active pest/disease outbreaks
 * @access  Private
 */
router.get(
  '/outbreaks',
  authenticate,
  validate(validateOutbreakQuery),
  getActiveOutbreaks
);

/**
 * @route   GET /api/v1/pest-disease/outbreaks/hotspots
 * @desc    Identify outbreak hotspots (clustering analysis)
 * @access  Private (Extension Officers, Agronomists, Admins)
 */
router.get(
  '/outbreaks/hotspots',
  authenticate,
  authorize('extension_officer', 'agronomist', 'platform_admin', 'analyst'),
  validate(validateHotspotQuery),
  getHotspots
);

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/pest-disease/analytics/trends
 * @desc    Get trend analysis comparing current vs previous period
 * @access  Private (Analysts, Agronomists, Admins)
 */
router.get(
  '/analytics/trends',
  authenticate,
  authorize('extension_officer', 'agronomist', 'platform_admin', 'analyst'),
  getTrends
);

/**
 * @route   GET /api/v1/pest-disease/analytics/dashboard
 * @desc    Get comprehensive dashboard analytics
 * @access  Private (Extension Officers, Analysts, Admins)
 */
router.get(
  '/analytics/dashboard',
  authenticate,
  authorize('extension_officer', 'agronomist', 'platform_admin', 'analyst'),
  validate(validateAnalyticsQuery),
  getDashboardAnalytics
);

// ============================================================================
// TREATMENT KNOWLEDGE ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/pest-disease/treatments/search
 * @desc    Search treatment knowledge base
 * @access  Private
 */
router.get(
  '/treatments/search',
  authenticate,
  validate(validateTreatmentSearch),
  searchTreatments
);

/**
 * @route   POST /api/v1/pest-disease/treatments
 * @desc    Create new treatment knowledge entry
 * @access  Private (Agronomists, Admins)
 */
router.post(
  '/treatments',
  authenticate,
  authorize('agronomist', 'platform_admin'),
  validate(validateTreatmentKnowledgeCreation),
  createTreatmentKnowledge
);

// ============================================================================
// EXPORT
// ============================================================================

export default router;
