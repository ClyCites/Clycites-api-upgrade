import { Router } from 'express';
import FarmersController from './farmersEnterprise.controller';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import * as validators from './farmersEnterprise.validator';

/**
 * Enterprise Farmers Module Routes
 * Comprehensive API endpoints for farmer management
 */

const router = Router();

// ==================== FARMER PROFILE ROUTES ====================

/**
 * @route   POST /api/farmers/profiles
 * @desc    Create a new farmer profile
 * @access  Private (Authenticated users)
 */
router.post(
  '/profiles',
  authenticate,
  validate(validators.createProfileValidator),
  FarmersController.createProfile.bind(FarmersController)
);

/**
 * @route   GET /api/farmers/profiles/me
 * @desc    Get current user's farmer profile
 * @access  Private
 */
router.get(
  '/profiles/me',
  authenticate,
  FarmersController.getMyProfile.bind(FarmersController)
);

/**
 * @route   GET /api/farmers/profiles
 * @desc    List farmers with filters and pagination
 * @access  Private (Admin, Organization Managers)
 */
router.get(
  '/profiles',
  authenticate,
  authorize('platform_admin', 'org:manager'),
  validate(validators.listProfilesValidator),
  FarmersController.listProfiles.bind(FarmersController)
);

/**
 * @route   GET /api/farmers/profiles/:id
 * @desc    Get farmer profile by ID
 * @access  Private
 */
router.get(
  '/profiles/:id',
  authenticate,
  validate(validators.profileIdValidator),
  FarmersController.getProfile.bind(FarmersController)
);

/**
 * @route   PATCH /api/farmers/profiles/:id
 * @desc    Update farmer profile
 * @access  Private (Owner or Admin)
 */
router.patch(
  '/profiles/:id',
  authenticate,
  validate(validators.updateProfileValidator),
  FarmersController.updateProfile.bind(FarmersController)
);

/**
 * @route   POST /api/farmers/profiles/:id/verify/submit
 * @desc    Submit profile for verification
 * @access  Private (Profile owner)
 */
router.post(
  '/profiles/:id/verify/submit',
  authenticate,
  validate(validators.submitVerificationValidator),
  FarmersController.submitForVerification.bind(FarmersController)
);

/**
 * @route   POST /api/farmers/profiles/:id/verify
 * @desc    Verify or reject farmer profile
 * @access  Private (Admin only)
 */
router.post(
  '/profiles/:id/verify',
  authenticate,
  authorize('platform_admin', 'verifier'),
  validate(validators.verifyProfileValidator),
  FarmersController.verifyProfile.bind(FarmersController)
);

/**
 * @route   DELETE /api/farmers/profiles/:id
 * @desc    Soft delete farmer profile
 * @access  Private (Owner or Admin)
 */
router.delete(
  '/profiles/:id',
  authenticate,
  authorize('platform_admin'),
  validate(validators.profileIdValidator),
  FarmersController.deleteProfile.bind(FarmersController)
);

// ==================== FARM MANAGEMENT ROUTES ====================

/**
 * @route   POST /api/farmers/:farmerId/farms
 * @desc    Create a new farm for a farmer
 * @access  Private (Farmer owner or Admin)
 */
router.post(
  '/:farmerId/farms',
  authenticate,
  validate(validators.createFarmValidator),
  FarmersController.createFarm.bind(FarmersController)
);

/**
 * @route   GET /api/farmers/:farmerId/farms
 * @desc    Get all farms for a farmer
 * @access  Private
 */
router.get(
  '/:farmerId/farms',
  authenticate,
  validate(validators.farmerIdValidator),
  FarmersController.getFarmerFarms.bind(FarmersController)
);

/**
 * @route   PATCH /api/farmers/farms/:farmId
 * @desc    Update farm details
 * @access  Private (Farm owner or Admin)
 */
router.patch(
  '/farms/:farmId',
  authenticate,
  validate(validators.updateFarmValidator),
  FarmersController.updateFarm.bind(FarmersController)
);

// ==================== PRODUCTION MANAGEMENT ROUTES ====================

/**
 * @route   POST /api/farmers/:farmerId/production/crops
 * @desc    Record crop production
 * @access  Private (Farmer owner)
 */
router.post(
  '/:farmerId/production/crops',
  authenticate,
  validate(validators.recordCropProductionValidator),
  FarmersController.recordCropProduction.bind(FarmersController)
);

/**
 * @route   POST /api/farmers/:farmerId/production/livestock
 * @desc    Record livestock production
 * @access  Private (Farmer owner)
 */
router.post(
  '/:farmerId/production/livestock',
  authenticate,
  validate(validators.recordLivestockProductionValidator),
  FarmersController.recordLivestockProduction.bind(FarmersController)
);

/**
 * @route   GET /api/farmers/:farmerId/production
 * @desc    Get production history for a farmer
 * @access  Private
 */
router.get(
  '/:farmerId/production',
  authenticate,
  validate(validators.farmerIdValidator),
  FarmersController.getProduction.bind(FarmersController)
);

// ==================== MEMBERSHIP MANAGEMENT ROUTES ====================

/**
 * @route   POST /api/farmers/:farmerId/membership/join-organization
 * @desc    Join an organization/cooperative
 * @access  Private (Farmer owner)
 */
router.post(
  '/:farmerId/membership/join-organization',
  authenticate,
  validate(validators.joinOrganizationValidator),
  FarmersController.joinOrganization.bind(FarmersController)
);

/**
 * @route   POST /api/farmers/:farmerId/membership/leave-organization
 * @desc    Leave current organization
 * @access  Private (Farmer owner)
 */
router.post(
  '/:farmerId/membership/leave-organization',
  authenticate,
  validate(validators.leaveOrganizationValidator),
  FarmersController.leaveOrganization.bind(FarmersController)
);

/**
 * @route   PATCH /api/farmers/:farmerId/membership/eligibility
 * @desc    Update service eligibility (Admin only)
 * @access  Private (Admin, Organization Managers)
 */
router.patch(
  '/:farmerId/membership/eligibility',
  authenticate,
  authorize('platform_admin', 'org:manager'),
  validate(validators.updateEligibilityValidator),
  FarmersController.updateEligibility.bind(FarmersController)
);

// ==================== ANALYTICS & REPORTING ROUTES ====================

/**
 * @route   GET /api/farmers/stats
 * @desc    Get farmer statistics and analytics
 * @access  Private (Admin, Managers)
 */
router.get(
  '/stats',
  authenticate,
  authorize('platform_admin', 'org:manager', 'analyst'),
  FarmersController.getFarmerStats.bind(FarmersController)
);

export default router;
