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
    .isIn(['unverified', 'pending', 'verified', 'rejected', 'suspended'])
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
  
  body('verificationLevel')
    .isIn(['basic', 'intermediate', 'advanced'])
    .withMessage('Invalid verification level'),
];

export const verifyProfileValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid farmer ID'),
  
  body('approved')
    .isBoolean()
    .withMessage('Approved must be a boolean'),
  
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string'),
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
    .isIn(['unverified', 'pending', 'verified', 'rejected', 'suspended'])
    .withMessage('Invalid verification status'),
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
