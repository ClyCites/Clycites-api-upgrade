/**
 * Expert Portal — Validation Chains
 *
 * Uses express-validator (consistent with the rest of the codebase).
 */

import { body, param, query } from 'express-validator';
import {
  ExpertSpecialization,
  ExpertRole,
  CaseReviewDecision,
  KnowledgeCategory,
  AdvisoryType,
  UrgencyLevel,
} from './expert.types';

// ── Common helpers ──────────────────────────────────────────────────────────

const mongoId = (field: string) =>
  param(field).isMongoId().withMessage(`${field} must be a valid MongoDB ObjectId`);

// ── Expert Profile ──────────────────────────────────────────────────────────

export const registerExpertSchema = [
  body('displayName').notEmpty().trim().isLength({ min: 2, max: 100 })
    .withMessage('displayName must be 2–100 characters'),
  body('title').notEmpty().trim().isLength({ min: 2, max: 150 })
    .withMessage('title must be 2–150 characters'),
  body('bio').optional().trim().isLength({ max: 2000 }),
  body('specializations').isArray({ min: 1, max: 5 })
    .withMessage('Provide 1–5 specializations'),
  body('specializations.*').isIn(Object.values(ExpertSpecialization))
    .withMessage('Invalid specialization value'),
  body('role').isIn(Object.values(ExpertRole))
    .withMessage('Invalid expert role'),
  body('regionsOfExpertise').isArray({ min: 1 })
    .withMessage('At least one region of expertise required'),
  body('credentials').optional().isArray(),
  body('credentials.*.type').optional().notEmpty(),
  body('credentials.*.name').optional().notEmpty(),
  body('credentials.*.issuingOrganization').optional().notEmpty(),
  body('credentials.*.yearObtained').optional().isInt({ min: 1900 }),
  body('contactEmail').optional().isEmail().withMessage('Invalid contact email'),
  body('phoneNumber').optional().isMobilePhone('any'),
  body('linkedInUrl').optional().isURL().withMessage('Invalid LinkedIn URL'),
  body('website').optional().isURL().withMessage('Invalid website URL'),
];

export const updateExpertProfileSchema = [
  mongoId('id'),
  body('displayName').optional().trim().isLength({ min: 2, max: 100 }),
  body('title').optional().trim().isLength({ min: 2, max: 150 }),
  body('bio').optional().trim().isLength({ max: 2000 }),
  body('specializations').optional().isArray(),
  body('regionsOfExpertise').optional().isArray(),
  body('contactEmail').optional().isEmail(),
  body('phoneNumber').optional().isMobilePhone('any'),
  body('linkedInUrl').optional().isURL(),
  body('website').optional().isURL(),
];

export const verifyExpertSchema = [
  mongoId('id'),
  body('approve').isBoolean().withMessage('approve must be a boolean'),
  body('reason').optional().trim().isLength({ max: 500 }),
];

// ── Case Review ──────────────────────────────────────────────────────────────

export const submitCaseReviewSchema = [
  mongoId('id'),
  body('decision').isIn(Object.values(CaseReviewDecision))
    .withMessage('Invalid review decision'),
  body('reviewNotes').notEmpty().trim().isLength({ min: 10, max: 3000 })
    .withMessage('reviewNotes must be 10–3000 characters'),
  body('confirmedDiagnosis').optional().trim(),
  body('modifiedDiagnosis').optional().trim(),
  body('isOutbreak').optional().isBoolean(),
  body('treatmentRecommendations').optional().isArray(),
  body('preventionGuidance').optional().trim(),
  body('followUpRequired').optional().isBoolean(),
  body('followUpDate').optional().isISO8601(),
];

export const escalateCaseSchema = [
  mongoId('id'),
  body('reason').notEmpty().trim().isLength({ min: 10, max: 1000 })
    .withMessage('Escalation reason must be 10–1000 characters'),
  body('escalateToExpertId').optional().isMongoId(),
];

export const aiFeedbackSchema = [
  mongoId('id'),
  body('feedbackType')
    .isIn(['false_positive', 'false_negative', 'correct', 'partial'])
    .withMessage('Invalid feedback type'),
  body('confidenceScore').isFloat({ min: 0, max: 1 })
    .withMessage('confidenceScore must be 0–1'),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

// ── Knowledge Base ───────────────────────────────────────────────────────────

export const createArticleSchema = [
  body('title').notEmpty().trim().isLength({ min: 5, max: 250 }),
  body('summary').notEmpty().trim().isLength({ min: 20, max: 1000 }),
  body('content').notEmpty().isLength({ min: 100 })
    .withMessage('content must be at least 100 characters'),
  body('category').isIn(Object.values(KnowledgeCategory))
    .withMessage('Invalid knowledge category'),
  body('tags').isArray({ min: 1 }).withMessage('At least one tag required'),
  body('crops').optional().isArray(),
  body('regions').optional().isArray(),
  body('language').optional().isLength({ min: 2, max: 5 }),
  body('references').optional().isArray(),
];

export const updateArticleSchema = [
  mongoId('id'),
  body('title').optional().trim().isLength({ min: 5, max: 250 }),
  body('summary').optional().trim().isLength({ min: 20, max: 1000 }),
  body('content').optional().isLength({ min: 100 }),
  body('category').optional().isIn(Object.values(KnowledgeCategory)),
  body('tags').optional().isArray(),
  body('crops').optional().isArray(),
  body('regions').optional().isArray(),
];

export const reviewArticleSchema = [
  mongoId('id'),
  body('approve').isBoolean().withMessage('approve must be a boolean'),
  body('reviewNotes').optional().trim().isLength({ max: 2000 }),
];

export const rateArticleSchema = [
  mongoId('id'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5'),
];

export const addTranslationSchema = [
  mongoId('id'),
  body('language').isLength({ min: 2, max: 5 }).withMessage('Invalid language code'),
  body('title').notEmpty(),
  body('summary').notEmpty(),
  body('content').notEmpty(),
];

// ── Advisories ───────────────────────────────────────────────────────────────

export const createAdvisorySchema = [
  body('title').notEmpty().trim().isLength({ min: 5, max: 250 }),
  body('message').notEmpty().trim().isLength({ min: 20, max: 5000 }),
  body('type').isIn(Object.values(AdvisoryType)).withMessage('Invalid advisory type'),
  body('urgency').optional().isIn(Object.values(UrgencyLevel)),
  body('targetCrops').optional().isArray(),
  body('targetRegions').optional().isArray(),
  body('targetDistricts').optional().isArray(),
  body('targetSeasons').optional().isArray(),
  body('targetUserRoles').optional().isArray(),
  body('specificFarmer').optional().isMongoId(),
  body('scheduledAt').optional().isISO8601(),
  body('expiresAt').optional().isISO8601(),
  body('channels.inApp').optional().isBoolean(),
  body('channels.email').optional().isBoolean(),
  body('channels.sms').optional().isBoolean(),
  body('channels.push').optional().isBoolean(),
];

export const emergencyAlertSchema = [
  body('title').notEmpty().trim().isLength({ min: 5, max: 250 }),
  body('message').notEmpty().trim().isLength({ min: 20, max: 5000 }),
  body('targetRegions').isArray({ min: 1 }).withMessage('At least one region required'),
  body('targetCrops').optional().isArray(),
  body('relatedReport').optional().isMongoId(),
];

// ── Farmer Inquiries ─────────────────────────────────────────────────────────

export const createInquirySchema = [
  body('subject').notEmpty().trim().isLength({ min: 5, max: 250 }),
  body('description').notEmpty().trim().isLength({ min: 20, max: 5000 }),
  body('cropType').optional().trim(),
  body('region').optional().trim(),
  body('urgency').optional().isIn(Object.values(UrgencyLevel)),
  body('category').isIn(Object.values(KnowledgeCategory))
    .withMessage('Invalid inquiry category'),
  body('relatedReport').optional().isMongoId(),
];

export const respondToInquirySchema = [
  mongoId('id'),
  body('expertResponse').notEmpty().trim().isLength({ min: 20, max: 5000 }),
  body('responseAttachments').optional().isArray(),
  body('closeAfterResponse').optional().isBoolean(),
];

export const followUpMessageSchema = [
  mongoId('id'),
  body('message').notEmpty().trim().isLength({ min: 1, max: 2000 }),
];

export const rateResponseSchema = [
  mongoId('id'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5'),
  body('feedback').optional().trim().isLength({ max: 1000 }),
];

// ── Analytics ─────────────────────────────────────────────────────────────────

export const analyticsDateRangeSchema = [
  query('from').isISO8601().withMessage('from must be a valid ISO 8601 date'),
  query('to').isISO8601().withMessage('to must be a valid ISO 8601 date'),
  query('period').optional().isIn(['day', 'week', 'month']),
  query('region').optional().trim(),
];
