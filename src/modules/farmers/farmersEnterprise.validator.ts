import { body, param, query } from 'express-validator';

/**
 * Enterprise Farmers Module Validators
 * Comprehensive input validation for all farmer endpoints
 */

// ==================== FARMER PROFILE VALIDATORS ====================

export const createProfileValidator = [
  body('contactDetails.primaryPhone')
    .notEmpty()
    .withMessage('Primary phone number is required')
    .matches(/^\+?[0-9]{10,15}$/)
    .withMessage('Invalid phone number format'),
  
  body('primaryLocation.country')
    .notEmpty()
    .withMessage('Country is required'),
  
  body('primaryLocation.region')
    .notEmpty()
    .withMessage('Region is required'),
  
  body('primaryLocation.district')
    .notEmpty()
    .withMessage('District is required'),
  
  body('farmerType')
    .optional()
    .isIn(['individual', 'cooperative_member', 'enterprise_grower', 'contract_farmer'])
    .withMessage('Invalid farmer type'),
  
  body('farmingExperience')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Farming experience must be a positive number'),
  
  body('kycData.dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Invalid date of birth'),
  
  body('kycData.gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
    .withMessage('Invalid gender value'),
];

export const updateProfileValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid farmer ID'),
  
  body('contactDetails.primaryPhone')
    .optional()
    .matches(/^\+?[0-9]{10,15}$/)
    .withMessage('Invalid phone number format'),
  
  body('verificationStatus')
    .optional()
    .isIn(['draft', 'submitted', 'verified', 'rejected'])
    .withMessage('Invalid verification status'),
  
  body('farmerType')
    .optional()
    .isIn(['individual', 'cooperative_member', 'enterprise_grower', 'contract_farmer'])
    .withMessage('Invalid farmer type'),
];

export const submitVerificationValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid farmer ID'),

  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string'),

  // Legacy compatibility
  body('verificationLevel')
    .optional()
    .isIn(['basic', 'intermediate', 'advanced'])
    .withMessage('Invalid verification level'),
];

export const verifyProfileValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid farmer ID'),

  body('status')
    .optional()
    .isIn(['verified', 'rejected'])
    .withMessage('Status must be either verified or rejected'),

  // Legacy compatibility
  body('approved')
    .optional()
    .isBoolean()
    .withMessage('Approved must be a boolean'),

  body()
    .custom((value) => {
      if (!value || typeof value !== 'object') {
        return false;
      }
      return value.status !== undefined || value.approved !== undefined;
    })
    .withMessage('Either status or approved must be provided'),
  
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string'),

  body('reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string'),
];

export const listProfilesValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('farmerType')
    .optional()
    .isIn(['individual', 'cooperative_member', 'enterprise_grower', 'contract_farmer'])
    .withMessage('Invalid farmer type'),
  
  query('verificationStatus')
    .optional()
    .isIn(['draft', 'submitted', 'verified', 'rejected'])
    .withMessage('Invalid verification status'),

  query('verified')
    .optional()
    .isBoolean()
    .withMessage('Verified must be a boolean'),
];

// ==================== FARM VALIDATORS ====================

export const createFarmValidator = [
  param('farmerId')
    .isMongoId()
    .withMessage('Invalid farmer ID'),
  
  body('farmName')
    .notEmpty()
    .withMessage('Farm name is required')
    .isString()
    .withMessage('Farm name must be a string'),
  
  body('totalSize')
    .isFloat({ min: 0.01 })
    .withMessage('Total size must be a positive number'),
  
  body('sizeUnit')
    .isIn(['acres', 'hectares', 'square_meters'])
    .withMessage('Invalid size unit'),
  
  body('ownershipType')
    .isIn(['owned', 'leased', 'communal', 'family_land', 'rented', 'sharecropping'])
    .withMessage('Invalid ownership type'),
  
  body('location.region')
    .notEmpty()
    .withMessage('Region is required'),
  
  body('location.district')
    .notEmpty()
    .withMessage('District is required'),
  
  body('location.centerPoint.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array of [longitude, latitude]'),
];

export const updateFarmValidator = [
  param('farmId')
    .isMongoId()
    .withMessage('Invalid farm ID'),
  
  body('farmName')
    .optional()
    .isString()
    .withMessage('Farm name must be a string'),
  
  body('totalSize')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Total size must be a positive number'),
  
  body('operationalStatus')
    .optional()
    .isIn(['active', 'inactive', 'fallow', 'under_development', 'abandoned'])
    .withMessage('Invalid operational status'),
];

export const farmIdValidator = [
  param('farmId')
    .isMongoId()
    .withMessage('Invalid farm ID'),
];

// ==================== PLOT VALIDATORS ====================

export const createPlotValidator = [
  param('farmerId')
    .isMongoId()
    .withMessage('Invalid farmer ID'),

  body('farmId')
    .optional()
    .isMongoId()
    .withMessage('Invalid farm ID'),

  body('plotName')
    .notEmpty()
    .withMessage('Plot name is required')
    .isString()
    .withMessage('Plot name must be a string'),

  body('area')
    .isFloat({ min: 0.01 })
    .withMessage('Area must be a positive number'),

  body('areaUnit')
    .optional()
    .isIn(['acres', 'hectares', 'square_meters'])
    .withMessage('Invalid area unit'),

  body('status')
    .optional()
    .isIn(['active', 'fallow', 'inactive'])
    .withMessage('Invalid plot status'),
];

export const updatePlotValidator = [
  param('plotId')
    .isMongoId()
    .withMessage('Invalid plot ID'),

  body('farmId')
    .optional()
    .isMongoId()
    .withMessage('Invalid farm ID'),

  body('plotName')
    .optional()
    .isString()
    .withMessage('Plot name must be a string'),

  body('area')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Area must be a positive number'),

  body('areaUnit')
    .optional()
    .isIn(['acres', 'hectares', 'square_meters'])
    .withMessage('Invalid area unit'),

  body('status')
    .optional()
    .isIn(['active', 'fallow', 'inactive'])
    .withMessage('Invalid plot status'),
];

export const plotIdValidator = [
  param('plotId')
    .isMongoId()
    .withMessage('Invalid plot ID'),
];

// ==================== PRODUCTION VALIDATORS ====================

export const recordCropProductionValidator = [
  param('farmerId')
    .isMongoId()
    .withMessage('Invalid farmer ID'),
  
  body('farmId')
    .isMongoId()
    .withMessage('Invalid farm ID'),
  
  body('cropName')
    .notEmpty()
    .withMessage('Crop name is required'),
  
  body('cropCategory')
    .isIn(['cereals', 'legumes', 'vegetables', 'fruits', 'cash_crops', 'roots_tubers', 'fodder', 'other'])
    .withMessage('Invalid crop category'),
  
  body('season')
    .isIn(['season_a', 'season_b', 'dry_season', 'wet_season', 'year_round'])
    .withMessage('Invalid season'),
  
  body('year')
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Invalid year'),
  
  body('areaPlanted')
    .isFloat({ min: 0.01 })
    .withMessage('Area planted must be a positive number'),
  
  body('areaUnit')
    .isIn(['acres', 'hectares', 'square_meters'])
    .withMessage('Invalid area unit'),
  
  body('estimatedYield')
    .isFloat({ min: 0 })
    .withMessage('Estimated yield must be a positive number'),
  
  body('yieldUnit')
    .isIn(['kg', 'tons', 'bags', 'bunches', 'pieces'])
    .withMessage('Invalid yield unit'),
];

export const recordLivestockProductionValidator = [
  param('farmerId')
    .isMongoId()
    .withMessage('Invalid farmer ID'),
  
  body('farmId')
    .isMongoId()
    .withMessage('Invalid farm ID'),
  
  body('animalType')
    .isIn(['cattle', 'goats', 'sheep', 'pigs', 'poultry', 'rabbits', 'fish', 'bees', 'other'])
    .withMessage('Invalid animal type'),
  
  body('productionSystem')
    .isIn(['intensive', 'semi_intensive', 'extensive', 'free_range', 'battery', 'pond', 'cage'])
    .withMessage('Invalid production system'),
  
  body('totalAnimals')
    .isInt({ min: 1 })
    .withMessage('Total animals must be a positive integer'),
  
  body('primaryPurpose')
    .isIn(['meat', 'milk', 'eggs', 'breeding', 'draft_power', 'honey', 'fish', 'mixed'])
    .withMessage('Invalid primary purpose'),
  
  body('year')
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Invalid year'),
  
  body('startDate')
    .isISO8601()
    .withMessage('Invalid start date'),
];

export const cropIdValidator = [
  param('cropId')
    .isMongoId()
    .withMessage('Invalid crop ID'),
];

export const updateCropProductionValidator = [
  param('cropId')
    .isMongoId()
    .withMessage('Invalid crop ID'),

  body('farmId')
    .optional()
    .isMongoId()
    .withMessage('Invalid farm ID'),

  body('cropName')
    .optional()
    .isString()
    .withMessage('Crop name must be a string'),

  body('productionStatus')
    .optional()
    .isIn(['planned', 'in_progress', 'harvested', 'sold', 'stored', 'failed'])
    .withMessage('Invalid production status'),
];

// ==================== INPUT VALIDATORS ====================

export const createInputValidator = [
  param('farmerId')
    .isMongoId()
    .withMessage('Invalid farmer ID'),

  body('farmId')
    .optional()
    .isMongoId()
    .withMessage('Invalid farm ID'),

  body('plotId')
    .optional()
    .isMongoId()
    .withMessage('Invalid plot ID'),

  body('inputName')
    .notEmpty()
    .withMessage('Input name is required')
    .isString()
    .withMessage('Input name must be a string'),

  body('inputType')
    .isIn(['seed', 'fertilizer', 'pesticide', 'herbicide', 'feed', 'equipment', 'other'])
    .withMessage('Invalid input type'),

  body('quantity')
    .isFloat({ min: 0 })
    .withMessage('Quantity must be a non-negative number'),

  body('unit')
    .notEmpty()
    .withMessage('Unit is required')
    .isString()
    .withMessage('Unit must be a string'),

  body('status')
    .optional()
    .isIn(['planned', 'applied', 'consumed', 'cancelled'])
    .withMessage('Invalid input status'),
];

export const updateInputValidator = [
  param('inputId')
    .isMongoId()
    .withMessage('Invalid input ID'),

  body('farmId')
    .optional()
    .isMongoId()
    .withMessage('Invalid farm ID'),

  body('plotId')
    .optional()
    .isMongoId()
    .withMessage('Invalid plot ID'),

  body('inputName')
    .optional()
    .isString()
    .withMessage('Input name must be a string'),

  body('inputType')
    .optional()
    .isIn(['seed', 'fertilizer', 'pesticide', 'herbicide', 'feed', 'equipment', 'other'])
    .withMessage('Invalid input type'),

  body('quantity')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Quantity must be a non-negative number'),

  body('status')
    .optional()
    .isIn(['planned', 'applied', 'consumed', 'cancelled'])
    .withMessage('Invalid input status'),
];

export const inputIdValidator = [
  param('inputId')
    .isMongoId()
    .withMessage('Invalid input ID'),
];

// ==================== MEMBERSHIP VALIDATORS ====================

export const joinOrganizationValidator = [
  param('farmerId')
    .isMongoId()
    .withMessage('Invalid farmer ID'),
  
  body('organizationId')
    .isMongoId()
    .withMessage('Invalid organization ID'),
  
  body('role')
    .optional()
    .isIn(['member', 'committee_member', 'treasurer', 'secretary', 'chairperson', 'vice_chairperson', 'auditor'])
    .withMessage('Invalid role'),
];

export const leaveOrganizationValidator = [
  param('farmerId')
    .isMongoId()
    .withMessage('Invalid farmer ID'),
  
  body('exitReason')
    .isIn(['voluntary', 'expulsion', 'death', 'relocation', 'inactivity', 'other'])
    .withMessage('Invalid exit reason'),
  
  body('exitNotes')
    .optional()
    .isString()
    .withMessage('Exit notes must be a string'),
];

export const updateEligibilityValidator = [
  param('farmerId')
    .isMongoId()
    .withMessage('Invalid farmer ID'),
  
  body('eligibleForLoans')
    .optional()
    .isBoolean()
    .withMessage('Eligible for loans must be a boolean'),
  
  body('maxLoanAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max loan amount must be a positive number'),
  
  body('eligibleForInsurance')
    .optional()
    .isBoolean()
    .withMessage('Eligible for insurance must be a boolean'),
];

// ==================== COMMON VALIDATORS ====================

export const farmerIdValidator = [
  param('farmerId')
    .isMongoId()
    .withMessage('Invalid farmer ID'),
];

export const profileIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid profile ID'),
];
