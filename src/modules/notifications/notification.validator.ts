import { param, query } from 'express-validator';

export const notificationIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid notification ID'),
];

export const notificationQueryValidator = [
  query('type')
    .optional()
    .isIn(['order', 'payment', 'listing', 'message', 'system', 'marketing'])
    .withMessage('Invalid notification type'),
  query('read')
    .optional()
    .isBoolean()
    .withMessage('Read must be a boolean'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];
