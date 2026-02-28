import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import FarmersService from './farmersEnterprise.service';
import { sendSuccess, sendError, ResponseHandler } from '../../common/utils/response';
import { AuthRequest } from '../../common/middleware/auth';
import { ForbiddenError } from '../../common/errors/AppError';

/**
 * Enterprise Farmers Controller
 * Handles HTTP requests for farmer workspace management.
 */

class FarmersController {
  private readonly privilegedRoles = new Set([
    'super_admin',
    'platform_admin',
    'admin',
    'org:manager',
  ]);

  private isPrivilegedRole(role?: string): boolean {
    return !!role && this.privilegedRoles.has(role);
  }

  private async assertCanAccessFarmer(req: AuthRequest, farmerId: mongoose.Types.ObjectId): Promise<void> {
    if (this.isPrivilegedRole(req.user?.role)) {
      return;
    }

    const farmer = await FarmersService.getFarmerProfile(farmerId);
    const farmerUserId = (farmer.userId as { _id?: mongoose.Types.ObjectId })?._id?.toString()
      ?? farmer.userId.toString();

    if (farmerUserId !== req.user!.id) {
      throw new ForbiddenError('Access denied: farmer profile does not belong to the current user');
    }
  }

  private async assertCanAccessFarm(req: AuthRequest, farmId: mongoose.Types.ObjectId): Promise<void> {
    if (this.isPrivilegedRole(req.user?.role)) {
      return;
    }

    const farm = await FarmersService.getFarmById(farmId);
    await this.assertCanAccessFarmer(req, farm.farmerId as mongoose.Types.ObjectId);
  }

  private async assertCanAccessPlot(req: AuthRequest, plotId: mongoose.Types.ObjectId): Promise<void> {
    if (this.isPrivilegedRole(req.user?.role)) {
      return;
    }

    const plot = await FarmersService.getPlot(plotId);
    await this.assertCanAccessFarmer(req, plot.farmerId as mongoose.Types.ObjectId);
  }

  private async assertCanAccessCrop(req: AuthRequest, cropId: mongoose.Types.ObjectId): Promise<void> {
    if (this.isPrivilegedRole(req.user?.role)) {
      return;
    }

    const crop = await FarmersService.getCropProduction(cropId);
    await this.assertCanAccessFarmer(req, crop.farmerId as mongoose.Types.ObjectId);
  }

  private async assertCanAccessInput(req: AuthRequest, inputId: mongoose.Types.ObjectId): Promise<void> {
    if (this.isPrivilegedRole(req.user?.role)) {
      return;
    }

    const input = await FarmersService.getInput(inputId);
    await this.assertCanAccessFarmer(req, input.farmerId as mongoose.Types.ObjectId);
  }

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
  async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = new mongoose.Types.ObjectId(req.params.id);
      await this.assertCanAccessFarmer(req, id);

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
      await this.assertCanAccessFarmer(req, id);

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
      await this.assertCanAccessFarmer(req, id);

      const { notes, verificationLevel } = req.body;
      const farmer = await FarmersService.submitForVerification(id, notes, verificationLevel);

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
      const status = req.body.status ?? (req.body.approved === true ? 'verified' : 'rejected');
      const reason = req.body.reason ?? req.body.notes;

      const farmer = await FarmersService.verifyFarmer(id, verifiedBy, status, reason);
      sendSuccess(
        res,
        farmer,
        status === 'verified' ? 'Farmer verified' : 'Farmer verification rejected'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/farmers/profiles
   * List farmers with filters and pagination
   */
  async listProfiles(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const options: {
        page: number;
        limit: number;
        farmerType?: string;
        verificationStatus?: string;
        verified?: boolean;
        region?: string;
        district?: string;
        organizationId?: string;
        searchQuery?: string;
      } = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        farmerType: req.query.farmerType as string,
        verificationStatus: req.query.verificationStatus as string,
        verified: req.query.verified === undefined
          ? undefined
          : String(req.query.verified).toLowerCase() === 'true',
        region: req.query.region as string,
        district: req.query.district as string,
        organizationId: req.query.organizationId as string,
        searchQuery: req.query.search as string,
      };

      if (!this.isPrivilegedRole(req.user?.role)) {
        options.organizationId = req.user?.orgId;
      }

      const result = await FarmersService.listFarmers(options);

      ResponseHandler.paginated(
        res,
        result.farmers,
        {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
        'Farmer profiles retrieved successfully'
      );
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
      await this.assertCanAccessFarmer(req, id);

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
      await this.assertCanAccessFarmer(req, farmerId);

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
  async getFarmerFarms(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = new mongoose.Types.ObjectId(req.params.farmerId);
      await this.assertCanAccessFarmer(req, farmerId);

      const farms = await FarmersService.getFarmerFarms(farmerId);
      sendSuccess(res, farms);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/farmers/farms/:farmId
   * Get farm by ID
   */
  async getFarm(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmId = new mongoose.Types.ObjectId(req.params.farmId);
      await this.assertCanAccessFarm(req, farmId);

      const farm = await FarmersService.getFarmById(farmId);
      sendSuccess(res, farm);
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
      await this.assertCanAccessFarm(req, farmId);

      const modifiedBy = new mongoose.Types.ObjectId(req.user!.id);
      const updatedFarm = await FarmersService.updateFarm(farmId, req.body, modifiedBy);

      sendSuccess(res, updatedFarm, 'Farm updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/farmers/farms/:farmId
   * Soft delete farm
   */
  async deleteFarm(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmId = new mongoose.Types.ObjectId(req.params.farmId);
      await this.assertCanAccessFarm(req, farmId);

      const deletedBy = new mongoose.Types.ObjectId(req.user!.id);
      await FarmersService.deleteFarm(farmId, deletedBy);

      sendSuccess(res, null, 'Farm deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // ==================== PLOTS MANAGEMENT ENDPOINTS ====================

  /**
   * GET /api/farmers/:farmerId/plots
   * List plots for a farmer
   */
  async getFarmerPlots(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = new mongoose.Types.ObjectId(req.params.farmerId);
      await this.assertCanAccessFarmer(req, farmerId);

      const plots = await FarmersService.getFarmerPlots(farmerId);
      sendSuccess(res, plots);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/farmers/:farmerId/plots
   * Create plot for farmer
   */
  async createPlot(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = new mongoose.Types.ObjectId(req.params.farmerId);
      await this.assertCanAccessFarmer(req, farmerId);

      const createdBy = new mongoose.Types.ObjectId(req.user!.id);
      const plot = await FarmersService.createPlot(farmerId, req.body, createdBy);

      sendSuccess(res, plot, 'Plot created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/farmers/plots/:plotId
   * Get plot by ID
   */
  async getPlot(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const plotId = new mongoose.Types.ObjectId(req.params.plotId);
      await this.assertCanAccessPlot(req, plotId);

      const plot = await FarmersService.getPlot(plotId);
      sendSuccess(res, plot);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/farmers/plots/:plotId
   * Update plot
   */
  async updatePlot(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const plotId = new mongoose.Types.ObjectId(req.params.plotId);
      await this.assertCanAccessPlot(req, plotId);

      const modifiedBy = new mongoose.Types.ObjectId(req.user!.id);
      const plot = await FarmersService.updatePlot(plotId, req.body, modifiedBy);
      sendSuccess(res, plot, 'Plot updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/farmers/plots/:plotId
   * Soft delete plot
   */
  async deletePlot(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const plotId = new mongoose.Types.ObjectId(req.params.plotId);
      await this.assertCanAccessPlot(req, plotId);

      const deletedBy = new mongoose.Types.ObjectId(req.user!.id);
      await FarmersService.deletePlot(plotId, deletedBy);
      sendSuccess(res, null, 'Plot deleted successfully');
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
      await this.assertCanAccessFarmer(req, farmerId);

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
   * GET /api/farmers/:farmerId/production/crops
   * List crop production records for a farmer
   */
  async getFarmerCrops(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = new mongoose.Types.ObjectId(req.params.farmerId);
      await this.assertCanAccessFarmer(req, farmerId);

      const crops = await FarmersService.getFarmerCrops(farmerId, {
        year: req.query.year ? parseInt(req.query.year as string, 10) : undefined,
        season: req.query.season as string,
        cropName: req.query.cropName as string,
      });

      sendSuccess(res, crops);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/farmers/production/crops/:cropId
   * Get crop production by ID
   */
  async getCropProduction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cropId = new mongoose.Types.ObjectId(req.params.cropId);
      await this.assertCanAccessCrop(req, cropId);

      const crop = await FarmersService.getCropProduction(cropId);
      sendSuccess(res, crop);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/farmers/production/crops/:cropId
   * Update crop production
   */
  async updateCropProduction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cropId = new mongoose.Types.ObjectId(req.params.cropId);
      await this.assertCanAccessCrop(req, cropId);

      const modifiedBy = new mongoose.Types.ObjectId(req.user!.id);
      const crop = await FarmersService.updateCropProduction(cropId, req.body, modifiedBy);
      sendSuccess(res, crop, 'Crop production updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/farmers/production/crops/:cropId
   * Soft delete crop production
   */
  async deleteCropProduction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cropId = new mongoose.Types.ObjectId(req.params.cropId);
      await this.assertCanAccessCrop(req, cropId);

      const deletedBy = new mongoose.Types.ObjectId(req.user!.id);
      await FarmersService.deleteCropProduction(cropId, deletedBy);
      sendSuccess(res, null, 'Crop production deleted successfully');
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
      await this.assertCanAccessFarmer(req, farmerId);

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
  async getProduction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = new mongoose.Types.ObjectId(req.params.farmerId);
      await this.assertCanAccessFarmer(req, farmerId);

      const options = {
        year: req.query.year ? parseInt(req.query.year as string, 10) : undefined,
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

  // ==================== INPUTS MANAGEMENT ENDPOINTS ====================

  /**
   * GET /api/farmers/:farmerId/inputs
   * List input records for a farmer
   */
  async getFarmerInputs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = new mongoose.Types.ObjectId(req.params.farmerId);
      await this.assertCanAccessFarmer(req, farmerId);

      const inputs = await FarmersService.getFarmerInputs(farmerId);
      sendSuccess(res, inputs);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/farmers/:farmerId/inputs
   * Create input record
   */
  async createInput(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = new mongoose.Types.ObjectId(req.params.farmerId);
      await this.assertCanAccessFarmer(req, farmerId);

      const createdBy = new mongoose.Types.ObjectId(req.user!.id);
      const input = await FarmersService.createInput(farmerId, req.body, createdBy);
      sendSuccess(res, input, 'Input created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/farmers/inputs/:inputId
   * Get input by ID
   */
  async getInput(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const inputId = new mongoose.Types.ObjectId(req.params.inputId);
      await this.assertCanAccessInput(req, inputId);

      const input = await FarmersService.getInput(inputId);
      sendSuccess(res, input);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/farmers/inputs/:inputId
   * Update input
   */
  async updateInput(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const inputId = new mongoose.Types.ObjectId(req.params.inputId);
      await this.assertCanAccessInput(req, inputId);

      const modifiedBy = new mongoose.Types.ObjectId(req.user!.id);
      const input = await FarmersService.updateInput(inputId, req.body, modifiedBy);
      sendSuccess(res, input, 'Input updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/farmers/inputs/:inputId
   * Soft delete input
   */
  async deleteInput(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const inputId = new mongoose.Types.ObjectId(req.params.inputId);
      await this.assertCanAccessInput(req, inputId);

      const deletedBy = new mongoose.Types.ObjectId(req.user!.id);
      await FarmersService.deleteInput(inputId, deletedBy);
      sendSuccess(res, null, 'Input deleted successfully');
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
      await this.assertCanAccessFarmer(req, farmerId);

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
      await this.assertCanAccessFarmer(req, farmerId);

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
  async getFarmerStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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
