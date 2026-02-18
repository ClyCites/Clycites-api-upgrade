import { body, param, query } from 'express-validator';
import { NotificationType, NotificationChannel, ConversationType, MessageContentType } from './notification.types';

// ── Shared helpers ────────────────────────────────────────────────────────────

const paginationValidators = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

// ── Notifications ─────────────────────────────────────────────────────────────

export const notificationIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid notification ID'),
];

export const notificationQueryValidator = [
  query('type')
    .optional()
    .isIn(Object.values(NotificationType))
    .withMessage('Invalid notification type'),
  query('status')
    .optional()
    .isIn(['unread', 'read', 'archived'])
    .withMessage('Invalid status filter'),
  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid priority filter'),
  ...paginationValidators,
];

export const bulkNotificationValidator = [
  body('userIds')
    .isArray({ min: 1 })
    .withMessage('userIds must be a non-empty array'),
  body('userIds.*')
    .isMongoId()
    .withMessage('Each userId must be a valid MongoId'),
  body('type')
    .isIn(Object.values(NotificationType))
    .withMessage('Invalid notification type'),
  body('title')
    .isString()
    .notEmpty()
    .withMessage('Title is required'),
  body('message')
    .isString()
    .notEmpty()
    .withMessage('Message body is required'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid priority'),
  body('channels')
    .optional()
    .isArray()
    .withMessage('Channels must be an array'),
  body('channels.*')
    .optional()
    .isIn(Object.values(NotificationChannel))
    .withMessage('Invalid channel value'),
];

// ── Templates ─────────────────────────────────────────────────────────────────

export const templateIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid template ID'),
];

export const createTemplateValidator = [
  body('code')
    .isString()
    .trim()
    .notEmpty()
    .matches(/^[a-z0-9_]+$/)
    .withMessage('Template code must be lowercase alphanumeric with underscores'),
  body('type')
    .isIn(Object.values(NotificationType))
    .withMessage('Invalid notification type'),
  body('defaultLocale')
    .optional()
    .isIn(['en', 'fr', 'sw', 'rw', 'am', 'ha', 'yo', 'ig', 'pt'])
    .withMessage('Invalid locale'),
  body('translations')
    .isArray({ min: 1 })
    .withMessage('At least one translation is required'),
  body('translations.*.locale')
    .isIn(['en', 'fr', 'sw', 'rw', 'am', 'ha', 'yo', 'ig', 'pt'])
    .withMessage('Invalid locale in translation'),
  body('translations.*.title')
    .isString()
    .notEmpty()
    .withMessage('Translation title is required'),
  body('translations.*.body')
    .isString()
    .notEmpty()
    .withMessage('Translation body is required'),
];

export const updateTemplateValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid template ID'),
  body('translations')
    .optional()
    .isArray()
    .withMessage('Translations must be an array'),
  body('defaultLocale')
    .optional()
    .isIn(['en', 'fr', 'sw', 'rw', 'am', 'ha', 'yo', 'ig', 'pt'])
    .withMessage('Invalid locale'),
];

// ── Preferences ───────────────────────────────────────────────────────────────

export const updatePreferencesValidator = [
  body('channels')
    .optional()
    .isArray()
    .withMessage('Channels must be an array'),
  body('channels.*.channel')
    .optional()
    .isIn(Object.values(NotificationChannel))
    .withMessage('Invalid channel'),
  body('channels.*.enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be a boolean'),
  body('typePreferences')
    .optional()
    .isArray()
    .withMessage('typePreferences must be an array'),
  body('typePreferences.*.type')
    .optional()
    .isIn(Object.values(NotificationType))
    .withMessage('Invalid notification type'),
  body('typePreferences.*.enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be a boolean'),
  body('quietHours.startTime')
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('quietHours.startTime must be HH:mm'),
  body('quietHours.endTime')
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('quietHours.endTime must be HH:mm'),
  body('marketingEnabled')
    .optional()
    .isBoolean()
    .withMessage('marketingEnabled must be a boolean'),
];

export const fcmTokenValidator = [
  body('token')
    .isString()
    .notEmpty()
    .withMessage('FCM token is required'),
];

// ── Messaging: Conversations ──────────────────────────────────────────────────

export const conversationIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid conversation ID'),
];

export const createConversationValidator = [
  body('type')
    .isIn(Object.values(ConversationType))
    .withMessage('Invalid conversation type'),
  body('participantIds')
    .isArray({ min: 1 })
    .withMessage('participantIds must be a non-empty array'),
  body('participantIds.*')
    .isMongoId()
    .withMessage('Each participantId must be a valid MongoId'),
  body('title')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title must be ≤200 characters'),
  body('contextType')
    .optional()
    .isIn(['order', 'listing', 'consultation', 'support'])
    .withMessage('Invalid contextType'),
  body('contextId')
    .optional()
    .isMongoId()
    .withMessage('contextId must be a valid MongoId'),
];

export const conversationQueryValidator = [
  query('type')
    .optional()
    .isIn(Object.values(ConversationType))
    .withMessage('Invalid conversation type'),
  ...paginationValidators,
];

// ── Messaging: Messages ───────────────────────────────────────────────────────

export const messageIdValidator = [
  param('messageId')
    .isMongoId()
    .withMessage('Invalid message ID'),
];

export const sendMessageValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid conversation ID'),
  body('body')
    .isString()
    .notEmpty()
    .isLength({ max: 4000 })
    .withMessage('Message body must be 1–4000 characters'),
  body('contentType')
    .optional()
    .isIn(Object.values(MessageContentType))
    .withMessage('Invalid content type'),
  body('replyToId')
    .optional()
    .isMongoId()
    .withMessage('replyToId must be a valid MongoId'),
];

export const editMessageValidator = [
  param('messageId')
    .isMongoId()
    .withMessage('Invalid message ID'),
  body('body')
    .isString()
    .notEmpty()
    .isLength({ max: 4000 })
    .withMessage('Message body must be 1–4000 characters'),
];

export const addReactionValidator = [
  param('messageId')
    .isMongoId()
    .withMessage('Invalid message ID'),
  body('emoji')
    .isString()
    .notEmpty()
    .isLength({ max: 10 })
    .withMessage('Emoji is required'),
];

export const lockConversationValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid conversation ID'),
  body('reason')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Reason must be ≤500 characters'),
];
