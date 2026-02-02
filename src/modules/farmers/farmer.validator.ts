import { body, param } from 'express-validator';

export const createFarmerProfileValidator = [
  body('location.region')
    .notEmpty()
    .withMessage('Region is required'),
  body('location.district')
    .notEmpty()
    .withMessage('District is required'),
  body('businessName')
    .optional()
    .trim(),
  body('farmSize')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Farm size must be a positive number'),
  body('farmSizeUnit')
    .optional()
    .isIn(['acres', 'hectares'])
    .withMessage('Farm size unit must be acres or hectares'),
  body('farmingType')
    .optional()
    .isArray()
    .withMessage('Farming type must be an array'),
  body('farmingType.*')
    .optional()
    .isIn(['crop', 'livestock', 'mixed', 'aquaculture'])
    .withMessage('Invalid farming type'),
];

export const updateFarmerProfileValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid farmer ID'),
  body('location.region')
    .optional()
    .notEmpty()
    .withMessage('Region cannot be empty'),
  body('location.district')
    .optional()
    .notEmpty()
    .withMessage('District cannot be empty'),
  body('farmSize')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Farm size must be a positive number'),
];

export const createFarmValidator = [
  body('farmerId')
    .notEmpty()
    .withMessage('Farmer ID is required')
    .isMongoId()
    .withMessage('Invalid farmer ID'),
  body('name')
    .notEmpty()
    .withMessage('Farm name is required')
    .trim(),
  body('size')
    .notEmpty()
    .withMessage('Farm size is required')
    .isFloat({ min: 0 })
    .withMessage('Farm size must be a positive number'),
  body('sizeUnit')
    .notEmpty()
    .withMessage('Size unit is required')
    .isIn(['acres', 'hectares'])
    .withMessage('Size unit must be acres or hectares'),
  body('location.region')
    .notEmpty()
    .withMessage('Region is required'),
  body('location.district')
    .notEmpty()
    .withMessage('District is required'),
];

export const updateFarmValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid farm ID'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Farm name cannot be empty'),
  body('size')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Farm size must be a positive number'),
];

export const farmerIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid farmer ID'),
];

export const farmIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid farm ID'),
];
