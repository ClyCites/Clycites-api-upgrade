import { body, param, query } from 'express-validator';

export const createOrderValidator = [
  body('listing')
    .notEmpty()
    .withMessage('Listing is required')
    .isMongoId()
    .withMessage('Invalid listing ID'),
  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be greater than 0'),
  body('deliveryAddress.region')
    .notEmpty()
    .withMessage('Region is required'),
  body('deliveryAddress.district')
    .notEmpty()
    .withMessage('District is required'),
  body('deliveryAddress.phone')
    .notEmpty()
    .withMessage('Phone is required')
    .matches(/^(\+256|0)[0-9]{9}$/)
    .withMessage('Invalid phone number format'),
  body('deliveryAddress.recipientName')
    .notEmpty()
    .withMessage('Recipient name is required'),
  body('deliveryOption')
    .notEmpty()
    .withMessage('Delivery option is required')
    .isIn(['pickup', 'local_delivery', 'regional_delivery', 'national_delivery'])
    .withMessage('Invalid delivery option'),
];

export const updateStatusValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid order ID'),
  body('status')
    .optional()
    .isIn([
      'pending',
      'confirmed',
      'processing',
      'in_transit',
      'delivered',
      'completed',
      'cancelled',
      'created',
      'accepted',
      'rejected',
      'fulfilled',
    ])
    .withMessage('Invalid status'),
  body('uiStatus')
    .optional()
    .isIn(['created', 'accepted', 'rejected', 'fulfilled', 'cancelled'])
    .withMessage('Invalid uiStatus'),
  body('reason')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('reason must be between 3 and 500 characters'),
  body()
    .custom((value) => {
      if (!value.status && !value.uiStatus) {
        throw new Error('Either status or uiStatus is required');
      }
      return true;
    }),
];

export const cancelOrderValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid order ID'),
  body('reason')
    .notEmpty()
    .withMessage('Cancellation reason is required')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Reason must be at least 10 characters'),
];

export const orderIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid order ID'),
];

export const orderQueryValidator = [
  query('status')
    .optional()
    .isIn([
      'pending',
      'confirmed',
      'processing',
      'in_transit',
      'delivered',
      'completed',
      'cancelled',
      'created',
      'accepted',
      'rejected',
      'fulfilled',
    ])
    .withMessage('Invalid status'),
  query('uiStatus')
    .optional()
    .isIn(['created', 'accepted', 'rejected', 'fulfilled', 'cancelled'])
    .withMessage('Invalid uiStatus'),
  query('paymentStatus')
    .optional()
    .isIn(['pending', 'paid', 'refunded', 'failed'])
    .withMessage('Invalid payment status'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];
