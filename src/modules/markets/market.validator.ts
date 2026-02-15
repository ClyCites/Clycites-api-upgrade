import { body, param } from 'express-validator';

export const createMarketValidator = [
  body('name').notEmpty().withMessage('Name is required').trim(),
  body('location').notEmpty().withMessage('Location is required').trim(),
  body('region').notEmpty().withMessage('Region is required').trim(),
  body('country').optional().trim(),
];

export const updateMarketValidator = [
  param('id').isMongoId().withMessage('Invalid market ID'),
  body('name').optional().trim(),
  body('location').optional().trim(),
  body('region').optional().trim(),
  body('country').optional().trim(),
];

export const marketIdValidator = [
  param('id').isMongoId().withMessage('Invalid market ID'),
];

export const marketIdParamValidator = [
  param('marketId').isMongoId().withMessage('Invalid market ID'),
];
