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
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['pending', 'confirmed', 'processing', 'in_transit', 'delivered', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
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
    .isIn(['pending', 'confirmed', 'processing', 'in_transit', 'delivered', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
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
