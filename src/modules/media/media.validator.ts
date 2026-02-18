import { body, param, query } from 'express-validator';
import { MediaFileType, MediaAccessLevel, ScanStatus } from './media.types';

// ── Upload ────────────────────────────────────────────────────────────────────

export const uploadValidator = [
  body('fileType')
    .isIn(Object.values(MediaFileType))
    .withMessage('Invalid fileType'),
  body('accessLevel')
    .optional()
    .isIn(Object.values(MediaAccessLevel))
    .withMessage('Invalid accessLevel'),
  body('linkedTo.model')
    .optional()
    .isIn(['Order', 'Listing', 'Farmer', 'Dispute', 'Pest'])
    .withMessage('Invalid linkedTo.model'),
  body('linkedTo.id')
    .optional()
    .isMongoId()
    .withMessage('linkedTo.id must be a MongoId'),
  body('allowedViewers')
    .optional()
    .isArray()
    .withMessage('allowedViewers must be an array'),
  body('allowedViewers.*')
    .optional()
    .isMongoId()
    .withMessage('Each allowedViewer must be a MongoId'),
  body('ttlDays')
    .optional()
    .isInt({ min: 0 })
    .withMessage('ttlDays must be a non-negative integer'),
  body('encrypt')
    .optional()
    .isBoolean()
    .withMessage('encrypt must be boolean'),
];

// ── File param ────────────────────────────────────────────────────────────────

export const fileIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid file ID'),
];

// ── Signed URL TTL ────────────────────────────────────────────────────────────

export const signedUrlValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid file ID'),
  query('ttl')
    .optional()
    .isInt({ min: 60, max: 86400 })
    .withMessage('ttl must be 60–86400 seconds'),
];

// ── List ──────────────────────────────────────────────────────────────────────

export const listFilesValidator = [
  query('fileType')
    .optional()
    .isIn(Object.values(MediaFileType))
    .withMessage('Invalid fileType'),
  query('accessLevel')
    .optional()
    .isIn(Object.values(MediaAccessLevel))
    .withMessage('Invalid accessLevel'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be 1–100'),
];

// ── Linked files ──────────────────────────────────────────────────────────────

export const linkedFilesValidator = [
  param('model')
    .isIn(['Order', 'Listing', 'Farmer', 'Dispute', 'Pest'])
    .withMessage('Invalid model'),
  param('id')
    .isMongoId()
    .withMessage('Invalid entity ID'),
];

// ── Scan update (admin) ───────────────────────────────────────────────────────

export const scanUpdateValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid file ID'),
  body('status')
    .isIn(Object.values(ScanStatus))
    .withMessage('Invalid scan status'),
];
