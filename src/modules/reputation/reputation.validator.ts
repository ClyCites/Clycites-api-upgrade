import { body, param, query } from 'express-validator';

export const createRatingValidator = [
  body('order')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),
  
  body('overallRating')
    .notEmpty()
    .withMessage('Overall rating is required')
    .isFloat({ min: 1, max: 5 })
    .withMessage('Overall rating must be between 1 and 5'),
  
  body('categoryRatings')
    .optional()
    .isObject()
    .withMessage('Category ratings must be an object'),
  
  body('categoryRatings.productQuality')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Product quality rating must be between 1 and 5'),
  
  body('categoryRatings.communication')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Communication rating must be between 1 and 5'),
  
  body('categoryRatings.packaging')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Packaging rating must be between 1 and 5'),
  
  body('categoryRatings.delivery')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Delivery rating must be between 1 and 5'),
  
  body('categoryRatings.pricing')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Pricing rating must be between 1 and 5'),
  
  body('review')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Review must be between 10 and 2000 characters'),
  
  body('pros')
    .optional()
    .isArray()
    .withMessage('Pros must be an array'),
  
  body('cons')
    .optional()
    .isArray()
    .withMessage('Cons must be an array'),
  
  body('wouldRecommend')
    .notEmpty()
    .withMessage('Would recommend field is required')
    .isBoolean()
    .withMessage('Would recommend must be a boolean'),
  
  body('wouldBuyAgain')
    .optional()
    .isBoolean()
    .withMessage('Would buy again must be a boolean'),
  
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
];

export const addSellerResponseValidator = [
  param('ratingId')
    .notEmpty()
    .withMessage('Rating ID is required')
    .isMongoId()
    .withMessage('Invalid rating ID'),
  
  body('message')
    .notEmpty()
    .withMessage('Response message is required')
    .isString()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters'),
];

export const markHelpfulValidator = [
  param('ratingId')
    .notEmpty()
    .withMessage('Rating ID is required')
    .isMongoId()
    .withMessage('Invalid rating ID'),
  
  body('helpful')
    .notEmpty()
    .withMessage('Helpful field is required')
    .isBoolean()
    .withMessage('Helpful must be a boolean'),
];

export const getUserRatingsValidator = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID'),
  
  query('role')
    .optional()
    .isIn(['buyer', 'seller'])
    .withMessage('Role must be either buyer or seller'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

export const getReputationScoreValidator = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID'),
];
