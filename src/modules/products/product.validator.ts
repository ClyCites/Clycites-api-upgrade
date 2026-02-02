import { body, param } from 'express-validator';

export const createProductValidator = [
  body('name')
    .notEmpty()
    .withMessage('Product name is required')
    .trim(),
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['grains', 'vegetables', 'fruits', 'livestock', 'dairy', 'other'])
    .withMessage('Invalid category'),
  body('unit')
    .notEmpty()
    .withMessage('Unit is required')
    .isIn(['kg', 'ton', 'bag', 'piece', 'liter', 'crate'])
    .withMessage('Invalid unit'),
  body('variety')
    .optional()
    .trim(),
  body('description')
    .optional()
    .trim(),
  body('minOrderQuantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Minimum order quantity must be at least 1'),
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
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
    .isIn(['grains', 'vegetables', 'fruits', 'livestock', 'dairy', 'other'])
    .withMessage('Invalid category'),
  body('unit')
    .optional()
    .isIn(['kg', 'ton', 'bag', 'piece', 'liter', 'crate'])
    .withMessage('Invalid unit'),
  body('minOrderQuantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Minimum order quantity must be at least 1'),
];

export const productIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid product ID'),
];

export const categoryValidator = [
  param('category')
    .isIn(['grains', 'vegetables', 'fruits', 'livestock', 'dairy', 'other'])
    .withMessage('Invalid category'),
];
