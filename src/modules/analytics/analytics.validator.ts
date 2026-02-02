import { query, param } from 'express-validator';

export const analyticsQueryValidator = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365'),
  query('product')
    .optional()
    .isMongoId()
    .withMessage('Invalid product ID'),
  query('category')
    .optional()
    .isIn(['grains', 'vegetables', 'fruits', 'livestock', 'dairy', 'other'])
    .withMessage('Invalid category'),
  query('region')
    .optional()
    .trim(),
];

export const farmerIdValidator = [
  param('farmerId')
    .isMongoId()
    .withMessage('Invalid farmer ID'),
];
