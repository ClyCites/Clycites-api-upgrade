import { body, param, query } from 'express-validator';

export const createListingValidator = [
  body('product')
    .notEmpty()
    .withMessage('Product is required')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  body('description')
    .optional()
    .trim(),
  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isFloat({ min: 0 })
    .withMessage('Quantity must be a positive number'),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('quality')
    .notEmpty()
    .withMessage('Quality is required')
    .isIn(['premium', 'standard', 'economy'])
    .withMessage('Invalid quality'),
  body('deliveryOptions')
    .notEmpty()
    .withMessage('Delivery options are required')
    .isArray({ min: 1 })
    .withMessage('At least one delivery option is required'),
  body('location.region')
    .notEmpty()
    .withMessage('Region is required'),
  body('location.district')
    .notEmpty()
    .withMessage('District is required'),
  body('harvestDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid harvest date'),
  body('availableFrom')
    .optional()
    .isISO8601()
    .withMessage('Invalid available from date'),
  body('availableUntil')
    .optional()
    .isISO8601()
    .withMessage('Invalid available until date'),
  body('status')
    .optional()
    .isIn(['active', 'pending', 'sold', 'expired', 'cancelled', 'draft', 'published', 'paused', 'closed'])
    .withMessage('Invalid status'),
  body('uiStatus')
    .optional()
    .isIn(['draft', 'published', 'paused', 'closed'])
    .withMessage('Invalid uiStatus'),
];

export const updateListingValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid listing ID'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  body('quantity')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Quantity must be a positive number'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('quality')
    .optional()
    .isIn(['premium', 'standard', 'economy'])
    .withMessage('Invalid quality'),
  body('deliveryOptions')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one delivery option is required'),
  body('status')
    .optional()
    .isIn(['active', 'pending', 'sold', 'expired', 'cancelled', 'draft', 'published', 'paused', 'closed'])
    .withMessage('Invalid status'),
  body('uiStatus')
    .optional()
    .isIn(['draft', 'published', 'paused', 'closed'])
    .withMessage('Invalid uiStatus'),
];

export const updateStatusValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid listing ID'),
  body('status')
    .optional()
    .isIn(['active', 'pending', 'sold', 'expired', 'cancelled', 'draft', 'published', 'paused', 'closed'])
    .withMessage('Invalid status'),
  body('uiStatus')
    .optional()
    .isIn(['draft', 'published', 'paused', 'closed'])
    .withMessage('Invalid uiStatus'),
  body()
    .custom((value) => {
      if (!value.status && !value.uiStatus) {
        throw new Error('Either status or uiStatus is required');
      }
      return true;
    }),
];

export const listingIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid listing ID'),
];

export const searchListingsValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number'),
  query('quality')
    .optional()
    .isIn(['premium', 'standard', 'economy'])
    .withMessage('Invalid quality'),
  query('status')
    .optional()
    .isIn(['active', 'pending', 'sold', 'expired', 'cancelled', 'draft', 'published', 'paused', 'closed'])
    .withMessage('Invalid status'),
  query('uiStatus')
    .optional()
    .isIn(['draft', 'published', 'paused', 'closed'])
    .withMessage('Invalid uiStatus'),
];
