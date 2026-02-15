import { body, param } from 'express-validator';

export const createProductValidator = [
  body('name')
    .notEmpty()
    .withMessage('Product name is required')
    .trim(),
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .trim(),
  body('description')
    .optional()
    .trim(),
];

export const updateProductValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Product name cannot be empty'),
  body('category')
    .optional()
    .trim(),
  body('description')
    .optional()
    .trim(),
];

export const productIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid product ID'),
];
