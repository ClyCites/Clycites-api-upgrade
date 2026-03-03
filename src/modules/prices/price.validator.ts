import { body, param, query } from 'express-validator';

const predictionStatuses = ['generated', 'compared', 'archived'];

export const predictionIdValidator = [
  param('predictionId').isMongoId().withMessage('predictionId must be a valid prediction ID'),
];

export const listPredictionsValidator = [
  query('organizationId').optional().isMongoId(),
  query('productId').optional().isMongoId(),
  query('marketId').optional().isMongoId(),
  query('status').optional().isIn(predictionStatuses),
  query('page').optional().isInt({ min: 1, max: 10000 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const createPredictionValidator = [
  body('organizationId').optional().isMongoId(),
  body('productId').isMongoId().withMessage('productId is required'),
  body('marketId').optional().isMongoId(),
  body('horizonDays').optional().isInt({ min: 1, max: 365 }).toInt(),
  body('predictedPrice').isFloat({ min: 0 }).withMessage('predictedPrice is required').toFloat(),
  body('currency').optional().trim().isLength({ min: 2, max: 8 }),
  body('lowerBound').optional().isFloat({ min: 0 }).toFloat(),
  body('upperBound').optional().isFloat({ min: 0 }).toFloat(),
  body('confidence').optional().isFloat({ min: 0, max: 1 }).toFloat(),
  body('modelVersion').optional().trim().isLength({ max: 64 }),
  body('status').optional().isIn(predictionStatuses),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('metadata').optional().isObject(),
];

export const updatePredictionValidator = [
  ...predictionIdValidator,
  body('horizonDays').optional().isInt({ min: 1, max: 365 }).toInt(),
  body('predictedPrice').optional().isFloat({ min: 0 }).toFloat(),
  body('currency').optional().trim().isLength({ min: 2, max: 8 }),
  body('lowerBound').optional().isFloat({ min: 0 }).toFloat(),
  body('upperBound').optional().isFloat({ min: 0 }).toFloat(),
  body('confidence').optional().isFloat({ min: 0, max: 1 }).toFloat(),
  body('modelVersion').optional().trim().isLength({ max: 64 }),
  body('status').optional().isIn(predictionStatuses),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('metadata').optional().isObject(),
];

export const regeneratePredictionValidator = [
  ...predictionIdValidator,
  body('predictedPrice').optional().isFloat({ min: 0 }).toFloat(),
  body('lowerBound').optional().isFloat({ min: 0 }).toFloat(),
  body('upperBound').optional().isFloat({ min: 0 }).toFloat(),
  body('confidence').optional().isFloat({ min: 0, max: 1 }).toFloat(),
  body('modelVersion').optional().trim().isLength({ max: 64 }),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('metadata').optional().isObject(),
];
