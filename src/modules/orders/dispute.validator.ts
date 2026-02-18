import { body, param, query } from 'express-validator';
import { DisputeReason, ResolutionType, MediatorType } from './dispute.types';

const isMongoId = (field: string) =>
  param(field).isMongoId().withMessage(`${field} must be a valid MongoDB ObjectId`);

export const disputeIdValidator = [isMongoId('id')];

// ── Create dispute ────────────────────────────────────────────────────────────

export const createDisputeValidator = [
  body('orderId')
    .notEmpty()
    .withMessage('orderId is required')
    .isMongoId()
    .withMessage('orderId must be a valid MongoDB ObjectId'),

  body('reason')
    .notEmpty()
    .withMessage('reason is required')
    .isIn(Object.values(DisputeReason))
    .withMessage(`reason must be one of: ${Object.values(DisputeReason).join(', ')}`),

  body('description')
    .notEmpty()
    .withMessage('description is required')
    .isString()
    .isLength({ min: 10, max: 3000 })
    .withMessage('description must be between 10 and 3000 characters'),

  body('mediaFiles')
    .optional()
    .isArray({ max: 20 })
    .withMessage('mediaFiles must be an array of up to 20 items'),

  body('mediaFiles.*')
    .optional()
    .isMongoId()
    .withMessage('Each mediaFile must be a valid MongoDB ObjectId'),
];

// ── Submit evidence ───────────────────────────────────────────────────────────

export const submitEvidenceValidator = [
  isMongoId('id'),

  body('description')
    .notEmpty()
    .withMessage('description is required')
    .isString()
    .isLength({ min: 5, max: 2000 })
    .withMessage('description must be between 5 and 2000 characters'),

  body('mediaFiles')
    .optional()
    .isArray({ max: 20 })
    .withMessage('mediaFiles must be an array of up to 20 items'),

  body('mediaFiles.*')
    .optional()
    .isMongoId()
    .withMessage('Each mediaFile must be a valid MongoDB ObjectId'),
];

// ── Assign mediator ───────────────────────────────────────────────────────────

export const assignMediatorValidator = [
  isMongoId('id'),

  body('mediatorId')
    .notEmpty()
    .withMessage('mediatorId is required')
    .isMongoId()
    .withMessage('mediatorId must be a valid MongoDB ObjectId'),

  body('mediatorType')
    .notEmpty()
    .withMessage('mediatorType is required')
    .isIn(Object.values(MediatorType))
    .withMessage(`mediatorType must be one of: ${Object.values(MediatorType).join(', ')}`),
];

// ── Resolve dispute ───────────────────────────────────────────────────────────

export const resolveDisputeValidator = [
  isMongoId('id'),

  body('type')
    .notEmpty()
    .withMessage('type is required')
    .isIn(Object.values(ResolutionType))
    .withMessage(`type must be one of: ${Object.values(ResolutionType).join(', ')}`),

  body('refundAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('refundAmount must be a non-negative number'),

  body('note')
    .optional()
    .isString()
    .isLength({ max: 2000 })
    .withMessage('note must be under 2000 characters'),
];

// ── Note-only actions (escalate, close, review) ───────────────────────────────

export const noteActionValidator = [
  isMongoId('id'),

  body('note')
    .optional()
    .isString()
    .isLength({ max: 2000 })
    .withMessage('note must be under 2000 characters'),
];

// ── List disputes ─────────────────────────────────────────────────────────────

export const listDisputesValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1–100'),
  query('status')
    .optional()
    .isString()
    .withMessage('status must be a string'),
  query('reason')
    .optional()
    .isIn(Object.values(DisputeReason))
    .withMessage(`reason must be one of: ${Object.values(DisputeReason).join(', ')}`),
];

// ── Confirm delivery (order route) ────────────────────────────────────────────

export const confirmDeliveryValidator = [
  param('id').isMongoId().withMessage('id must be a valid MongoDB ObjectId'),

  body('quantityDelivered')
    .notEmpty()
    .withMessage('quantityDelivered is required')
    .isFloat({ min: 0 })
    .withMessage('quantityDelivered must be a non-negative number'),

  body('deliveryPhotos')
    .optional()
    .isArray({ max: 10 })
    .withMessage('deliveryPhotos must be an array of up to 10 items'),

  body('deliveryPhotos.*')
    .optional()
    .isMongoId()
    .withMessage('Each deliveryPhoto must be a valid MongoDB ObjectId'),
];
