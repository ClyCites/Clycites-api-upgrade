import { body } from 'express-validator';

export const predictPriceValidator = [
  body('feature_1')
    .isFloat()
    .withMessage('feature_1 must be a number'),
  body('feature_2')
    .isFloat()
    .withMessage('feature_2 must be a number'),
];
