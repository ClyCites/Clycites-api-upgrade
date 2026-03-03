import { body, param, query } from 'express-validator';

export const predictPriceValidator = [
  body('feature_1')
    .isFloat()
    .withMessage('feature_1 must be a number'),
  body('feature_2')
    .isFloat()
    .withMessage('feature_2 must be a number'),
];

const estimationStatuses = ['draft', 'submitted', 'approved'];

export const estimationIdValidator = [
  param('estimationId').isMongoId().withMessage('estimationId must be a valid estimation ID'),
];

export const listEstimationsValidator = [
  query('organizationId').optional().isMongoId(),
  query('productId').optional().isMongoId(),
  query('marketId').optional().isMongoId(),
  query('status').optional().isIn(estimationStatuses),
  query('page').optional().isInt({ min: 1, max: 10000 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const createEstimationValidator = [
  body('organizationId').optional().isMongoId(),
  body('productId').isMongoId().withMessage('productId is required'),
  body('marketId').optional().isMongoId(),
  body('estimatedPrice').isFloat({ min: 0 }).withMessage('estimatedPrice is required').toFloat(),
  body('currency').optional().trim().isLength({ min: 2, max: 8 }),
  body('basis').optional().trim().isLength({ max: 1000 }),
  body('confidence').optional().isFloat({ min: 0, max: 1 }).toFloat(),
  body('status').optional().isIn(estimationStatuses),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('metadata').optional().isObject(),
];

export const updateEstimationValidator = [
  ...estimationIdValidator,
  body('estimatedPrice').optional().isFloat({ min: 0 }).toFloat(),
  body('currency').optional().trim().isLength({ min: 2, max: 8 }),
  body('basis').optional().trim().isLength({ max: 1000 }),
  body('confidence').optional().isFloat({ min: 0, max: 1 }).toFloat(),
  body('status').optional().isIn(estimationStatuses),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('metadata').optional().isObject(),
];
