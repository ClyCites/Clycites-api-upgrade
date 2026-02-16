import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import FarmersService from './farmersEnterprise.service';
import { sendSuccess, sendError } from '../../common/utils/response';
import { AuthRequest } from '../../common/middleware/auth';

/**
 * Enterprise Farmers Controller
 * Handles HTTP requests for farmer management
 */

class FarmersController {
  // ==================== FARMER PROFILE ENDPOINTS ====================
  
  /**
   * POST /api/farmers/profiles
   * Create a new farmer profile
   */
  async createProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!.id);
      const createdBy = new mongoose.Types.ObjectId(req.user!.id);
      
      const farmerProfile = await FarmersService.createFarmerProfile(
        userId,
        req.body,
        createdBy
      );
      
      // Also create membership record
      await FarmersService.createMembership(farmerProfile._id, userId, createdBy);
      
      sendSuccess(res, farmerProfile, 'Farmer profile created successfully', 201);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/farmers/profiles/me
   * Get current user's farmer profile
   */
  async getMyProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!.id);
      const farmerProfile = await FarmersService.getFarmerProfileByUserId(userId);
      
      if (!farmerProfile) {
        sendError(res, 'Farmer profile not found', 404);
        return;
      }
      
      sendSuccess(res, farmerProfile);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/farmers/profiles/:id
   * Get farmer profile by ID
   */
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = new mongoose.Types.ObjectId(req.params.id);
      const farmerProfile = await FarmersService.getFarmerProfile(id);
      
      sendSuccess(res, farmerProfile);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * PATCH /api/farmers/profiles/:id
   * Update farmer profile
   */
  async updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = new mongoose.Types.ObjectId(req.params.id);
      const modifiedBy = new mongoose.Types.ObjectId(req.user!.id);
      
      const updatedProfile = await FarmersService.updateFarmerProfile(
        id,
        req.body,
        modifiedBy
      );
      
      sendSuccess(res, updatedProfile, 'Farmer profile updated successfully');
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * POST /api/farmers/profiles/:id/verify/submit
   * Submit profile for verification
   */
  async submitForVerification(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = new mongoose.Types.ObjectId(req.params.id);
      const { verificationLevel } = req.body;
      
      const farmer = await FarmersService.submitForVerification(id, verificationLevel);
      
      sendSuccess(res, farmer, 'Submitted for verification');
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * POST /api/farmers/profiles/:id/verify
   * Verify farmer profile (Admin only)
   */
  async verifyProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = new mongoose.Types.ObjectId(req.params.id);
      const verifiedBy = new mongoose.Types.ObjectId(req.user!.id);
      const { approved, notes } = req.body;
      
      const farmer = await FarmersService.verifyFarmer(id, verifiedBy, approved, notes);
      
      sendSuccess(res, farmer, approved ? 'Farmer verified' : 'Farmer verification rejected');
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/farmers/profiles
   * List farmers with filters and pagination
   */
  async listProfiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const options = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        farmerType: req.query.farmerType as string,
        verificationStatus: req.query.verificationStatus as string,
        region: req.query.region as string,
        district: req.query.district as string,
        organizationId: req.query.organizationId as string,
        searchQuery: req.query.search as string,
      };
      
      const result = await FarmersService.listFarmers(options);
      
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * DELETE /api/farmers/profiles/:id
   * Soft delete farmer profile
   */
  async deleteProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = new mongoose.Types.ObjectId(req.params.id);
      const deletedBy = new mongoose.Types.ObjectId(req.user!.id);
      
      await FarmersService.deleteFarmerProfile(id, deletedBy);
      
      sendSuccess(res, null, 'Farmer profile deleted successfully');
    } catch (error) {
      next(error);
    }
  }
  
  // ==================== FARM MANAGEMENT ENDPOINTS ====================
  
  /**
   * POST /api/farmers/:farmerId/farms
   * Create a new farm
   */
  async createFarm(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = new mongoose.Types.ObjectId(req.params.farmerId);
      const createdBy = new mongoose.Types.ObjectId(req.user!.id);
      
      const farm = await FarmersService.createFarm(farmerId, req.body, createdBy);
      
      sendSuccess(res, farm, 'Farm created successfully', 201);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/farmers/:farmerId/farms
   * Get all farms for a farmer
   */
  async getFarmerFarms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = new mongoose.Types.ObjectId(req.params.farmerId);
      const farms = await FarmersService.getFarmerFarms(farmerId);
      
      sendSuccess(res, farms);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * PATCH /api/farmers/farms/:farmId
   * Update farm details
   */
  async updateFarm(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmId = new mongoose.Types.ObjectId(req.params.farmId);
      const modifiedBy = new mongoose.Types.ObjectId(req.user!.id);
      
      const updatedFarm = await FarmersService.updateFarm(farmId, req.body, modifiedBy);
      
      sendSuccess(res, updatedFarm, 'Farm updated successfully');
    } catch (error) {
      next(error);
    }
  }
  
  // ==================== PRODUCTION MANAGEMENT ENDPOINTS ====================
  
  /**
   * POST /api/farmers/:farmerId/production/crops
   * Record crop production
   */
  async recordCropProduction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = new mongoose.Types.ObjectId(req.params.farmerId);
      const { farmId, ...productionData } = req.body;
      const createdBy = new mongoose.Types.ObjectId(req.user!.id);
      
      const production = await FarmersService.recordCropProduction(
        farmerId,
        new mongoose.Types.ObjectId(farmId),
        productionData,
        createdBy
      );
      
      sendSuccess(res, production, 'Crop production recorded successfully', 201);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * POST /api/farmers/:farmerId/production/livestock
   * Record livestock production
   */
  async recordLivestockProduction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = new mongoose.Types.ObjectId(req.params.farmerId);
      const { farmId, ...productionData } = req.body;
      const createdBy = new mongoose.Types.ObjectId(req.user!.id);
      
      const production = await FarmersService.recordLivestockProduction(
        farmerId,
        new mongoose.Types.ObjectId(farmId),
        productionData,
        createdBy
      );
      
      sendSuccess(res, production, 'Livestock production recorded successfully', 201);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/farmers/:farmerId/production
   * Get production history
   */
  async getProduction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = new mongoose.Types.ObjectId(req.params.farmerId);
      const options = {
        year: req.query.year ? parseInt(req.query.year as string) : undefined,
        season: req.query.season as string,
        cropName: req.query.cropName as string,
        animalType: req.query.animalType as string,
        productionType: req.query.productionType as 'crops' | 'livestock' | 'all',
      };
      
      const production = await FarmersService.getFarmerProduction(farmerId, options);
      
      sendSuccess(res, production);
    } catch (error) {
      next(error);
    }
  }
  
  // ==================== MEMBERSHIP MANAGEMENT ENDPOINTS ====================
  
  /**
   * POST /api/farmers/:farmerId/membership/join-organization
   * Join an organization
   */
  async joinOrganization(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = new mongoose.Types.ObjectId(req.params.farmerId);
      const { organizationId, role } = req.body;
      const modifiedBy = new mongoose.Types.ObjectId(req.user!.id);
      
      const membership = await FarmersService.joinOrganization(
        farmerId,
        new mongoose.Types.ObjectId(organizationId),
        role,
        modifiedBy
      );
      
      sendSuccess(res, membership, 'Successfully joined organization');
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * POST /api/farmers/:farmerId/membership/leave-organization
   * Leave organization
   */
  async leaveOrganization(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = new mongoose.Types.ObjectId(req.params.farmerId);
      const { exitReason, exitNotes } = req.body;
      const modifiedBy = new mongoose.Types.ObjectId(req.user!.id);
      
      const membership = await FarmersService.leaveOrganization(
        farmerId,
        exitReason,
        exitNotes,
        modifiedBy
      );
      
      sendSuccess(res, membership, 'Successfully left organization');
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * PATCH /api/farmers/:farmerId/membership/eligibility
   * Update service eligibility
   */
  async updateEligibility(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = new mongoose.Types.ObjectId(req.params.farmerId);
      const modifiedBy = new mongoose.Types.ObjectId(req.user!.id);
      
      const membership = await FarmersService.updateEligibility(
        farmerId,
        req.body,
        modifiedBy
      );
      
      sendSuccess(res, membership, 'Eligibility updated successfully');
    } catch (error) {
      next(error);
    }
  }
  
  // ==================== ANALYTICS & REPORTING ENDPOINTS ====================
  
  /**
   * GET /api/farmers/stats
   * Get farmer statistics
   */
  async getFarmerStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        region: req.query.region as string,
        district: req.query.district as string,
        verificationStatus: req.query.verificationStatus as string,
        farmerType: req.query.farmerType as string,
      };
      
      const stats = await FarmersService.getFarmerStats(filters);
      
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }
}

export default new FarmersController();
