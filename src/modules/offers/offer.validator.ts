import { body, param, query } from 'express-validator';

export const createOfferValidator = [
  body('listing')
    .notEmpty()
    .withMessage('Listing ID is required')
    .isMongoId()
    .withMessage('Invalid listing ID'),
  
  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be greater than 0'),
  
  body('unitPrice')
    .notEmpty()
    .withMessage('Unit price is required')
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a positive number'),
  
  body('deliveryOption')
    .notEmpty()
    .withMessage('Delivery option is required')
    .isIn(['pickup', 'seller_delivery', 'third_party'])
    .withMessage('Invalid delivery option'),
  
  body('deliveryAddress')
    .optional()
    .isObject()
    .withMessage('Delivery address must be an object'),
  
  body('deliveryAddress.region')
    .if(body('deliveryOption').equals('seller_delivery'))
    .notEmpty()
    .withMessage('Region is required for delivery'),
  
  body('deliveryAddress.district')
    .if(body('deliveryOption').equals('seller_delivery'))
    .notEmpty()
    .withMessage('District is required for delivery'),
  
  body('deliveryAddress.phone')
    .if(body('deliveryOption').equals('seller_delivery'))
    .notEmpty()
    .withMessage('Phone is required for delivery')
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('Invalid phone number format'),
  
  body('deliveryAddress.recipientName')
    .if(body('deliveryOption').equals('seller_delivery'))
    .notEmpty()
    .withMessage('Recipient name is required for delivery'),
  
  body('deliveryDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid delivery date format')
    .custom((value) => {
      const date = new Date(value);
      if (date < new Date()) {
        throw new Error('Delivery date cannot be in the past');
      }
      return true;
    }),
  
  body('terms.paymentTerms')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Payment terms must not exceed 500 characters'),
  
  body('terms.deliveryTerms')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Delivery terms must not exceed 500 characters'),
  
  body('terms.qualityRequirements')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Quality requirements must not exceed 500 characters'),
  
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),
  
  body('expiresIn')
    .optional()
    .isInt({ min: 1, max: 168 })
    .withMessage('Expiration time must be between 1 and 168 hours (7 days)'),
];

export const counterOfferValidator = [
  param('offerId')
    .notEmpty()
    .withMessage('Offer ID is required')
    .isMongoId()
    .withMessage('Invalid offer ID'),
  
  body('quantity')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be greater than 0'),
  
  body('unitPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a positive number'),
  
  body('deliveryOption')
    .optional()
    .isIn(['pickup', 'seller_delivery', 'third_party'])
    .withMessage('Invalid delivery option'),
  
  body('deliveryDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid delivery date format')
    .custom((value) => {
      const date = new Date(value);
      if (date < new Date()) {
        throw new Error('Delivery date cannot be in the past');
      }
      return true;
    }),
  
  body('terms')
    .optional()
    .isObject()
    .withMessage('Terms must be an object'),
  
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),
  
  body('expiresIn')
    .optional()
    .isInt({ min: 1, max: 168 })
    .withMessage('Expiration time must be between 1 and 168 hours'),
];

export const acceptOfferValidator = [
  param('offerId')
    .notEmpty()
    .withMessage('Offer ID is required')
    .isMongoId()
    .withMessage('Invalid offer ID'),
  
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters'),
];

export const rejectOfferValidator = [
  param('offerId')
    .notEmpty()
    .withMessage('Offer ID is required')
    .isMongoId()
    .withMessage('Invalid offer ID'),
  
  body('reason')
    .notEmpty()
    .withMessage('Rejection reason is required')
    .isString()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10 and 500 characters'),
];

export const withdrawOfferValidator = [
  param('offerId')
    .notEmpty()
    .withMessage('Offer ID is required')
    .isMongoId()
    .withMessage('Invalid offer ID'),
  
  body('reason')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters'),
];

export const addMessageValidator = [
  param('offerId')
    .notEmpty()
    .withMessage('Offer ID is required')
    .isMongoId()
    .withMessage('Invalid offer ID'),
  
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isString()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
];

export const getOffersQueryValidator = [
  query('uiStatus')
    .optional()
    .isIn(['open', 'responded', 'shortlisted', 'closed'])
    .withMessage('uiStatus must be one of: open, responded, shortlisted, closed'),

  query('status')
    .optional()
    .isIn(['pending', 'countered', 'accepted', 'rejected', 'expired', 'withdrawn', 'superseded'])
    .withMessage('Invalid status'),
  
  query('listing')
    .optional()
    .isMongoId()
    .withMessage('Invalid listing ID'),
  
  query('type')
    .optional()
    .isIn(['sent', 'received'])
    .withMessage('Type must be either "sent" or "received"'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'expiresAt', 'totalAmount'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be "asc" or "desc"'),
];

export const getOfferByIdValidator = [
  param('offerId')
    .notEmpty()
    .withMessage('Offer ID is required')
    .isMongoId()
    .withMessage('Invalid offer ID'),
];

export const markMessagesReadValidator = [
  param('offerId')
    .notEmpty()
    .withMessage('Offer ID is required')
    .isMongoId()
    .withMessage('Invalid offer ID'),
];
