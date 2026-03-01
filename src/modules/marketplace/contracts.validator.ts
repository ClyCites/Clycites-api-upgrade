import { body, param, query } from 'express-validator';

export const contractIdValidator = [
  param('contractId')
    .isMongoId()
    .withMessage('contractId must be a valid MongoDB ObjectId'),
];

export const listContractsValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['draft', 'under_review', 'active', 'completed', 'terminated'])
    .withMessage('Invalid contract status'),
  query('organizationId')
    .optional()
    .isMongoId()
    .withMessage('organizationId must be a valid MongoDB ObjectId'),
  query('search')
    .optional()
    .isString()
    .withMessage('search must be a string'),
];

export const createContractValidator = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('title must be between 3 and 200 characters'),
  body('terms')
    .trim()
    .isLength({ min: 10, max: 20000 })
    .withMessage('terms must be between 10 and 20000 characters'),
  body('organizationId')
    .optional()
    .isMongoId()
    .withMessage('organizationId must be a valid MongoDB ObjectId'),
  body('listing')
    .optional()
    .isMongoId()
    .withMessage('listing must be a valid MongoDB ObjectId'),
  body('order')
    .optional()
    .isMongoId()
    .withMessage('order must be a valid MongoDB ObjectId'),
  body('offer')
    .optional()
    .isMongoId()
    .withMessage('offer must be a valid MongoDB ObjectId'),
  body('valueAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('valueAmount must be a non-negative number'),
  body('currency')
    .optional()
    .isString()
    .isLength({ min: 2, max: 12 })
    .withMessage('currency must be between 2 and 12 characters'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid date'),
  body('parties')
    .isArray({ min: 1 })
    .withMessage('parties must be a non-empty array'),
  body('parties.*')
    .isMongoId()
    .withMessage('each party must be a valid MongoDB ObjectId'),
  body('status')
    .optional()
    .isIn(['draft', 'under_review', 'active', 'completed', 'terminated'])
    .withMessage('Invalid contract status'),
];

export const updateContractValidator = [
  ...contractIdValidator,
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('title must be between 3 and 200 characters'),
  body('terms')
    .optional()
    .trim()
    .isLength({ min: 10, max: 20000 })
    .withMessage('terms must be between 10 and 20000 characters'),
  body('listing')
    .optional()
    .isMongoId()
    .withMessage('listing must be a valid MongoDB ObjectId'),
  body('order')
    .optional()
    .isMongoId()
    .withMessage('order must be a valid MongoDB ObjectId'),
  body('offer')
    .optional()
    .isMongoId()
    .withMessage('offer must be a valid MongoDB ObjectId'),
  body('valueAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('valueAmount must be a non-negative number'),
  body('currency')
    .optional()
    .isString()
    .isLength({ min: 2, max: 12 })
    .withMessage('currency must be between 2 and 12 characters'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid date'),
  body('parties')
    .optional()
    .isArray({ min: 1 })
    .withMessage('parties must be a non-empty array'),
  body('parties.*')
    .optional()
    .isMongoId()
    .withMessage('each party must be a valid MongoDB ObjectId'),
  body('status')
    .optional()
    .isIn(['draft', 'under_review', 'active', 'completed', 'terminated'])
    .withMessage('Invalid contract status'),
];

export const signContractValidator = [
  ...contractIdValidator,
  body('note')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('note must be at most 1000 characters'),
];
