/**
 * Weather Module — express-validator Chains
 *
 * All validators follow the codebase convention:
 *   - Export named arrays of ValidationChain
 *   - Consumed by the validate() middleware
 *   - No Zod — express-validator only
 */

import { body, param, query } from 'express-validator';
import { WeatherUnit, AlertSeverity, AlertType, ForecastHorizon, RuleOperator, DeliveryChannel } from './weather.types';

// ============================================================================
// Helper utilities
// ============================================================================

const isObjectId = (fieldPath: string) =>
  param(fieldPath).isMongoId().withMessage(`${fieldPath} must be a valid MongoDB ObjectId`);

const isOptionalObjectId = (fieldPath: string) =>
  body(fieldPath)
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage(`${fieldPath} must be a valid MongoDB ObjectId`);

// ============================================================================
// Farm Weather Profile
// ============================================================================

export const createProfileValidator = [
  body('farmId')
    .notEmpty().withMessage('farmId is required')
    .isMongoId().withMessage('farmId must be a valid MongoDB ObjectId'),

  body('lat')
    .notEmpty().withMessage('lat is required')
    .isFloat({ min: -90, max: 90 }).withMessage('lat must be between -90 and 90'),

  body('lng')
    .notEmpty().withMessage('lng is required')
    .isFloat({ min: -180, max: 180 }).withMessage('lng must be between -180 and 180'),

  body('farmName')
    .optional()
    .isString().withMessage('farmName must be a string')
    .trim()
    .isLength({ max: 200 }).withMessage('farmName must be at most 200 characters'),

  body('altitude')
    .optional({ nullable: true })
    .isFloat({ min: -500, max: 9000 }).withMessage('altitude must be between -500 and 9000 metres'),

  body('timezone')
    .optional()
    .isString().withMessage('timezone must be a string')
    .isLength({ max: 60 }).withMessage('timezone too long'),

  body('preferredUnits')
    .optional()
    .isIn(Object.values(WeatherUnit))
    .withMessage(`preferredUnits must be one of: ${Object.values(WeatherUnit).join(', ')}`),

  body('primaryCropTypes')
    .optional()
    .isArray().withMessage('primaryCropTypes must be an array'),
  body('primaryCropTypes.*')
    .optional()
    .isString().withMessage('Each crop type must be a string'),

  isOptionalObjectId('organizationId'),

  body('alertPreferences.channels')
    .optional()
    .isArray().withMessage('alertPreferences.channels must be an array'),
  body('alertPreferences.channels.*')
    .optional()
    .isIn(Object.values(DeliveryChannel))
    .withMessage(`Each channel must be one of: ${Object.values(DeliveryChannel).join(', ')}`),

  body('alertPreferences.minimumSeverity')
    .optional()
    .isIn(Object.values(AlertSeverity))
    .withMessage(`minimumSeverity must be one of: ${Object.values(AlertSeverity).join(', ')}`),

  body('alertPreferences.quietHoursStart')
    .optional({ nullable: true })
    .isInt({ min: 0, max: 23 }).withMessage('quietHoursStart must be 0-23'),

  body('alertPreferences.quietHoursEnd')
    .optional({ nullable: true })
    .isInt({ min: 0, max: 23 }).withMessage('quietHoursEnd must be 0-23'),
];

export const updateProfileValidator = [
  isObjectId('id'),

  body('lat')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('lat must be between -90 and 90'),

  body('lng')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('lng must be between -180 and 180'),

  body('farmName')
    .optional()
    .isString().withMessage('farmName must be a string')
    .trim()
    .isLength({ max: 200 }).withMessage('farmName must be at most 200 characters'),

  body('altitude')
    .optional({ nullable: true })
    .isFloat({ min: -500, max: 9000 }).withMessage('altitude out of range'),

  body('timezone')
    .optional()
    .isString()
    .isLength({ max: 60 }),

  body('preferredUnits')
    .optional()
    .isIn(Object.values(WeatherUnit)),

  body('primaryCropTypes')
    .optional()
    .isArray(),

  body('alertPreferences.channels')
    .optional()
    .isArray(),
  body('alertPreferences.channels.*')
    .optional()
    .isIn(Object.values(DeliveryChannel)),

  body('alertPreferences.minimumSeverity')
    .optional()
    .isIn(Object.values(AlertSeverity)),

  body('alertPreferences.quietHoursStart')
    .optional({ nullable: true })
    .isInt({ min: 0, max: 23 }),

  body('alertPreferences.quietHoursEnd')
    .optional({ nullable: true })
    .isInt({ min: 0, max: 23 }),
];

// ============================================================================
// Profile ID param
// ============================================================================

export const profileIdValidator = [
  isObjectId('id'),
];

// ============================================================================
// Weather Rule
// ============================================================================

export const createRuleValidator = [
  body('name')
    .notEmpty().withMessage('name is required')
    .isString()
    .trim()
    .isLength({ max: 200 }).withMessage('name must be at most 200 characters'),

  body('description')
    .optional()
    .isString()
    .isLength({ max: 1000 }),

  body('alertType')
    .notEmpty().withMessage('alertType is required')
    .isIn(Object.values(AlertType))
    .withMessage(`alertType must be one of: ${Object.values(AlertType).join(', ')}`),

  body('severity')
    .notEmpty().withMessage('severity is required')
    .isIn(Object.values(AlertSeverity))
    .withMessage(`severity must be one of: ${Object.values(AlertSeverity).join(', ')}`),

  body('conditions')
    .isArray({ min: 1 }).withMessage('conditions must be a non-empty array'),

  body('conditions.*.field')
    .notEmpty().withMessage('Each condition must have a field')
    .isString(),

  body('conditions.*.operator')
    .notEmpty().withMessage('Each condition must have an operator')
    .isIn(Object.values(RuleOperator))
    .withMessage(`operator must be one of: ${Object.values(RuleOperator).join(', ')}`),

  body('conditions.*.value')
    .notEmpty().withMessage('Each condition must have a value')
    .isNumeric().withMessage('condition.value must be a number'),

  body('conditions.*.valueTo')
    .optional({ nullable: true })
    .isNumeric().withMessage('condition.valueTo must be a number'),

  body('advisoryTemplate')
    .notEmpty().withMessage('advisoryTemplate is required')
    .isString()
    .isLength({ max: 2000 }),

  body('recommendedActions')
    .optional()
    .isArray(),
  body('recommendedActions.*')
    .optional()
    .isString(),

  body('cropTypes')
    .optional()
    .isArray(),
  body('cropTypes.*')
    .optional()
    .isString(),

  body('priority')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('priority must be 1-100'),

  isOptionalObjectId('organizationId'),
];

export const updateRuleValidator = [
  isObjectId('id'),

  body('name')
    .optional()
    .isString().trim()
    .isLength({ max: 200 }),

  body('severity')
    .optional()
    .isIn(Object.values(AlertSeverity)),

  body('conditions')
    .optional()
    .isArray({ min: 1 }),

  body('conditions.*.field')
    .optional()
    .isString(),

  body('conditions.*.operator')
    .optional()
    .isIn(Object.values(RuleOperator)),

  body('conditions.*.value')
    .optional()
    .isNumeric(),

  body('advisoryTemplate')
    .optional()
    .isString()
    .isLength({ max: 2000 }),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),

  body('priority')
    .optional()
    .isInt({ min: 1, max: 100 }),
];

export const ruleIdValidator = [
  isObjectId('id'),
];

// ============================================================================
// Alert queries
// ============================================================================

export const listAlertsValidator = [
  query('status')
    .optional()
    .isIn(Object.values(AlertSeverity /* repurposed */))
    .optional()
    .isIn(['new', 'sent', 'acknowledged', 'expired', 'dismissed'])
    .withMessage('Invalid status'),

  query('severity')
    .optional()
    .isIn(Object.values(AlertSeverity)),

  query('alertType')
    .optional()
    .isIn(Object.values(AlertType)),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be >= 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be 1-100'),
];

export const alertIdValidator = [
  isObjectId('id'),
];

// ============================================================================
// Forecast horizon query
// ============================================================================

export const forecastQueryValidator = [
  query('horizon')
    .optional()
    .isIn(Object.values(ForecastHorizon))
    .withMessage(`horizon must be one of: ${Object.values(ForecastHorizon).join(', ')}`),
];

// ============================================================================
// Manual refresh (farmId param)
// ============================================================================

export const farmIdParamValidator = [
  param('farmId')
    .isMongoId().withMessage('farmId must be a valid MongoDB ObjectId'),
];

export const profileIdParamValidator = [
  param('profileId')
    .isMongoId().withMessage('profileId must be a valid MongoDB ObjectId'),
];
