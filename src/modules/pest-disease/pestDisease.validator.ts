/**
 * Pest & Disease Validators
 * 
 * Request validation middleware using express-validator.
 */

import { body, param, query } from 'express-validator';
import {
  GrowthStage,
  DetectionType,
  SeverityLevel,
  ReportStatus,
  WorkspaceIncidentStatus,
} from './pestDisease.types';

/**
 * Validate detection submission
 */
export const validateDetectionSubmission = [
  body('farmerId')
    .notEmpty().withMessage('Farmer ID is required')
    .isMongoId().withMessage('Invalid farmer ID format'),

  body('farmId')
    .notEmpty().withMessage('Farm ID is required')
    .isMongoId().withMessage('Invalid farm ID format'),

  // Field context validation
  body('fieldContext.cropType')
    .notEmpty().withMessage('Crop type is required')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Crop type must be 2-100 characters'),

  body('fieldContext.cropVariety')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Crop variety must not exceed 100 characters'),

  body('fieldContext.growthStage')
    .notEmpty().withMessage('Growth stage is required')
    .isIn(Object.values(GrowthStage)).withMessage('Invalid growth stage'),

  body('fieldContext.plantingDate')
    .optional()
    .isISO8601().withMessage('Invalid planting date format'),

  body('fieldContext.longitude')
    .notEmpty().withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),

  body('fieldContext.latitude')
    .notEmpty().withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),

  body('fieldContext.farmSize')
    .optional()
    .isFloat({ min: 0 }).withMessage('Farm size must be positive'),

  body('fieldContext.soilType')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Soil type must not exceed 100 characters'),

  body('fieldContext.irrigationType')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Irrigation type must not exceed 100 characters'),

  // Consent validation
  body('consent.agreedToAIAnalysis')
    .notEmpty().withMessage('AI analysis consent is required')
    .isBoolean().withMessage('AI analysis consent must be boolean')
    .custom((value) => {
      if (value !== true && value !== 'true') {
        throw new Error('Must agree to AI analysis to proceed');
      }
      return true;
    }),

  body('consent.agreedToDataSharing')
    .notEmpty().withMessage('Data sharing consent is required')
    .isBoolean().withMessage('Data sharing consent must be boolean'),

  body('consent.consentVersion')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('Consent version must not exceed 20 characters'),

  // Optional farmer notes
  body('farmerNotes')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Farmer notes must not exceed 2000 characters')
];

/**
 * Validate expert review submission
 */
export const validateExpertReview = [
  param('reportId')
    .isMongoId().withMessage('Invalid report ID format'),

  body('decision')
    .notEmpty().withMessage('Review decision is required')
    .isIn(['confirm', 'reject', 'reclassify']).withMessage('Invalid decision'),

  body('correctedDiagnosis')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('Corrected diagnosis must be 2-200 characters'),

  body('correctedSeverity')
    .optional()
    .isIn(Object.values(SeverityLevel)).withMessage('Invalid severity level'),

  body('notes')
    .notEmpty().withMessage('Review notes are required')
    .trim()
    .isLength({ min: 10, max: 2000 }).withMessage('Notes must be 10-2000 characters'),

  body('confidence')
    .notEmpty().withMessage('Confidence score is required')
    .isFloat({ min: 0, max: 100 }).withMessage('Confidence must be between 0 and 100')
];

/**
 * Validate feedback submission
 */
export const validateFeedback = [
  param('reportId')
    .isMongoId().withMessage('Invalid report ID format'),

  body('isCorrect')
    .notEmpty().withMessage('Correctness indication is required')
    .isBoolean().withMessage('isCorrect must be boolean'),

  body('actualDiagnosis')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('Actual diagnosis must be 2-200 characters'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Notes must not exceed 2000 characters')
];

/**
 * Validate report ID parameter
 */
export const validateReportId = [
  param('reportId')
    .isMongoId().withMessage('Invalid report ID format')
];

/**
 * Validate farmer ID parameter
 */
export const validateFarmerId = [
  param('farmerId')
    .isMongoId().withMessage('Invalid farmer ID format')
];

/**
 * Validate JSON report creation
 */
export const validateCreateReportJson = [
  param('farmerId')
    .isMongoId().withMessage('Invalid farmer ID format'),

  body('farmId')
    .notEmpty().withMessage('farmId is required')
    .isMongoId().withMessage('Invalid farm ID format'),

  body('fieldContext.cropType')
    .notEmpty().withMessage('fieldContext.cropType is required')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Crop type must be 2-100 characters'),

  body('fieldContext.growthStage')
    .optional()
    .isIn(Object.values(GrowthStage)).withMessage('Invalid growth stage'),

  body('growthStage')
    .optional()
    .isIn(Object.values(GrowthStage)).withMessage('Invalid growth stage'),

  body()
    .custom((value) => {
      const longitude = value?.fieldContext?.farmLocation?.coordinates?.[0]
        ?? value?.fieldContext?.longitude
        ?? value?.longitude;
      const latitude = value?.fieldContext?.farmLocation?.coordinates?.[1]
        ?? value?.fieldContext?.latitude
        ?? value?.latitude;

      if (longitude === undefined || latitude === undefined) {
        throw new Error('Field context longitude and latitude are required');
      }

      if (Number(longitude) < -180 || Number(longitude) > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }

      if (Number(latitude) < -90 || Number(latitude) > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }

      return true;
    }),

  body('farmerNotes')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('farmerNotes must not exceed 2000 characters'),
];

/**
 * Validate JSON report update
 */
export const validateUpdateReportJson = [
  param('reportId')
    .isMongoId().withMessage('Invalid report ID format'),

  body('farmerNotes')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('farmerNotes must not exceed 2000 characters'),

  body('actionTaken')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('actionTaken must not exceed 2000 characters'),

  body('assignmentNotes')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('assignmentNotes must not exceed 2000 characters'),

  body('reportStatus')
    .optional()
    .isIn(Object.values(ReportStatus)).withMessage('Invalid reportStatus'),

  body('uiStatus')
    .optional()
    .isIn(Object.values(WorkspaceIncidentStatus)).withMessage('Invalid uiStatus'),

  body('outcome.isResolved')
    .optional()
    .isBoolean().withMessage('outcome.isResolved must be boolean'),

  body('outcome.effectiveness')
    .optional()
    .isIn(['poor', 'fair', 'good', 'excellent']).withMessage('Invalid outcome.effectiveness'),

  body('outcome.notes')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('outcome.notes must not exceed 2000 characters'),
];

/**
 * Validate report assignment
 */
export const validateAssignReport = [
  param('reportId')
    .isMongoId().withMessage('Invalid report ID format'),

  body('assigneeId')
    .optional()
    .isMongoId().withMessage('Invalid assignee ID format'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('notes must not exceed 2000 characters'),
];

/**
 * Validate report close payload
 */
export const validateCloseReport = [
  param('reportId')
    .isMongoId().withMessage('Invalid report ID format'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('reason must not exceed 2000 characters'),

  body('resolutionNotes')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('resolutionNotes must not exceed 2000 characters'),
];

/**
 * Validate outbreak query parameters
 */
export const validateOutbreakQuery = [
  query('region')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Region name must be 2-100 characters'),

  query('pestOrDisease')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Pest/disease name must be 2-100 characters'),

  query('status')
    .optional()
    .isIn(['active', 'contained', 'resolved']).withMessage('Invalid status'),

  query('severity')
    .optional()
    .isIn(['sporadic', 'localized', 'widespread', 'epidemic', 'pandemic']).withMessage('Invalid severity'),

  query('cropType')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Crop type must be 2-100 characters')
];

/**
 * Validate hotspot query parameters
 */
export const validateHotspotQuery = [
  query('detectionType')
    .optional()
    .isIn(Object.values(DetectionType)).withMessage('Invalid detection type'),

  query('days')
    .optional()
    .isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),

  query('radius')
    .optional()
    .isInt({ min: 1, max: 500 }).withMessage('Radius must be between 1 and 500 km')
];

/**
 * Validate analytics query parameters
 */
export const validateAnalyticsQuery = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),

  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format')
    .custom((endDate, { req }) => {
      if (req.query?.startDate && endDate) {
        const start = new Date(req.query.startDate as string);
        const end = new Date(endDate);
        if (end < start) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    })
];

/**
 * Validate treatment search query
 */
export const validateTreatmentSearch = [
  query('q')
    .notEmpty().withMessage('Search query is required')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Search query must be 2-100 characters')
];

/**
 * Validate treatment knowledge creation
 */
export const validateTreatmentKnowledgeCreation = [
  body('pestOrDiseaseName')
    .notEmpty().withMessage('Pest/disease name is required')
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('Name must be 2-200 characters'),

  body('detectionType')
    .notEmpty().withMessage('Detection type is required')
    .isIn(Object.values(DetectionType)).withMessage('Invalid detection type'),

  body('scientificName')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Scientific name must not exceed 200 characters'),

  body('commonNames')
    .optional()
    .isArray().withMessage('Common names must be an array'),

  body('commonNames.*')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Each common name must not exceed 100 characters'),

  body('category')
    .notEmpty().withMessage('Category is required')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Category must be 2-100 characters'),

  body('affectedCrops')
    .notEmpty().withMessage('Affected crops are required')
    .isArray({ min: 1 }).withMessage('At least one affected crop must be specified'),

  body('affectedCrops.*')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Each crop name must be 2-100 characters'),

  body('symptoms.description')
    .notEmpty().withMessage('Symptom description is required')
    .trim()
    .isLength({ min: 10, max: 5000 }).withMessage('Description must be 10-5000 characters'),

  body('symptoms.visual')
    .optional()
    .isArray().withMessage('Visual symptoms must be an array'),

  body('treatment.chemical')
    .optional()
    .isArray().withMessage('Chemical treatments must be an array'),

  body('treatment.organic')
    .optional()
    .isArray().withMessage('Organic treatments must be an array'),

  body('preventiveMeasures')
    .optional()
    .isArray().withMessage('Preventive measures must be an array')
];

/**
 * Validate pagination parameters
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];
