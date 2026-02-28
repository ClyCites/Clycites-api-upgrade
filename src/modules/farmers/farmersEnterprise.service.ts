import mongoose from 'mongoose';
import FarmerProfile, { IFarmerProfile } from './farmerProfile.model';
import FarmEnterprise, { IFarmEnterprise } from './farmEnterprise.model';
import { CropProduction, LivestockProduction, ICropProduction, ILivestockProduction } from './production.model';
import Plot, { IPlot } from './plot.model';
import FarmerInput, { IFarmerInput } from './input.model';
import FarmerMembership, { IFarmerMembership } from './farmerMembership.model';
import { AuditService } from '../audit';
import { NotFoundError, BadRequestError } from '../../common/errors/AppError';
import logger from '../../common/utils/logger';

type FarmerVerificationStatus = 'draft' | 'submitted' | 'verified' | 'rejected';

const STATUS_VARIANTS: Record<FarmerVerificationStatus, string[]> = {
  draft: ['draft', 'unverified'],
  submitted: ['submitted', 'pending'],
  verified: ['verified'],
  rejected: ['rejected', 'suspended'],
};

/**
 * Enterprise Farmers Service
 * Comprehensive business logic for farmer management
 */

class FarmersService {
  private normalizeVerificationStatus(status?: string): FarmerVerificationStatus {
    switch (status) {
    case 'submitted':
    case 'pending':
      return 'submitted';
    case 'verified':
      return 'verified';
    case 'rejected':
    case 'suspended':
      return 'rejected';
    case 'draft':
    case 'unverified':
    default:
      return 'draft';
    }
  }

  private buildVerificationStatusFilter(verificationStatus?: string, verified?: boolean): Record<string, unknown> | undefined {
    if (verificationStatus) {
      const normalizedStatus = this.normalizeVerificationStatus(verificationStatus);
      return { $in: STATUS_VARIANTS[normalizedStatus] };
    }

    if (verified === undefined) {
      return undefined;
    }

    if (verified) {
      return { $in: STATUS_VARIANTS.verified };
    }

    return {
      $in: [
        ...STATUS_VARIANTS.draft,
        ...STATUS_VARIANTS.submitted,
        ...STATUS_VARIANTS.rejected,
      ],
    };
  }

  private normalizeFarmerVerificationFields(farmer: IFarmerProfile): IFarmerProfile {
    farmer.verificationStatus = this.normalizeVerificationStatus(farmer.verificationStatus);
    farmer.verificationSubmittedAt = farmer.verificationSubmittedAt || undefined;
    farmer.verificationReviewedAt = farmer.verificationReviewedAt || farmer.verifiedAt || undefined;
    farmer.verificationReason = farmer.verificationReason || farmer.rejectionReason || undefined;
    return farmer;
  }

  // ==================== FARMER PROFILE MANAGEMENT ====================
  
  /**
   * Create a new farmer profile
   */
  async createFarmerProfile(
    userId: mongoose.Types.ObjectId,
    data: Partial<IFarmerProfile>,
    createdBy?: mongoose.Types.ObjectId
  ): Promise<IFarmerProfile> {
    try {
      // Check if farmer profile already exists for this user
      const existing = await FarmerProfile.findOne({ userId, isActive: true });
      if (existing) {
        throw new BadRequestError('Farmer profile already exists for this user');
      }
      
      const farmerProfile = new FarmerProfile({
        userId,
        ...data,
        verificationStatus: this.normalizeVerificationStatus(data.verificationStatus),
        createdBy,
        lastModifiedBy: createdBy,
      });
      
      await farmerProfile.save();
      
      // Log audit trail
      await AuditService.log({
        action: 'farmers.profile_created',
        resource: 'farmer_profile',
        resourceId: farmerProfile._id.toString(),
        userId: userId.toString(),
        details: {
          metadata: {
            farmerCode: farmerProfile.farmerCode,
            farmerType: farmerProfile.farmerType,
          }
        },
      });
      
      logger.info(`Farmer profile created: ${farmerProfile.farmerCode}`);
      return this.normalizeFarmerVerificationFields(farmerProfile);
    } catch (error: unknown) {
      logger.error('Error creating farmer profile:', error);
      throw error;
    }
  }
  
  /**
   * Get farmer profile by ID
   */
  async getFarmerProfile(id: mongoose.Types.ObjectId): Promise<IFarmerProfile> {
    const farmer = await FarmerProfile.findOne({ _id: id, isActive: true })
      .populate('userId', 'email firstName lastName')
      .populate('organizationMembership.organizationId', 'name');
    
    if (!farmer) {
      throw new NotFoundError('Farmer profile not found');
    }
    
    return this.normalizeFarmerVerificationFields(farmer);
  }
  
  /**
   * Get farmer profile by user ID
   */
  async getFarmerProfileByUserId(userId: mongoose.Types.ObjectId): Promise<IFarmerProfile | null> {
    const farmer = await FarmerProfile.findOne({ userId, isActive: true })
      .populate('userId', 'email firstName lastName')
      .populate('organizationMembership.organizationId', 'name');

    if (!farmer) {
      return null;
    }

    return this.normalizeFarmerVerificationFields(farmer);
  }
  
  /**
   * Update farmer profile
   */
  async updateFarmerProfile(
    id: mongoose.Types.ObjectId,
    updates: Partial<IFarmerProfile>,
    modifiedBy?: mongoose.Types.ObjectId
  ): Promise<IFarmerProfile> {
    const farmer = await FarmerProfile.findOne({ _id: id, isActive: true });
    
    if (!farmer) {
      throw new NotFoundError('Farmer profile not found');
    }
    
    // Increment version for audit trail
    updates.version = (farmer.version || 1) + 1;
    updates.lastModifiedBy = modifiedBy;
    if (updates.verificationStatus) {
      updates.verificationStatus = this.normalizeVerificationStatus(updates.verificationStatus);
    }
    
    Object.assign(farmer, updates);
    await farmer.save();
    
    await AuditService.log({
      action: 'farmers.profile_updated',
      resource: 'farmer_profile',
      resourceId: farmer._id.toString(),
      userId: farmer.userId.toString(),
      details: {
        metadata: { updates: Object.keys(updates) }
      },
    });
    
    return this.normalizeFarmerVerificationFields(farmer);
  }
  
  /**
   * Submit farmer for verification
   */
  async submitForVerification(
    id: mongoose.Types.ObjectId,
    notes?: string,
    verificationLevel?: 'basic' | 'intermediate' | 'advanced'
  ): Promise<IFarmerProfile> {
    const farmer = await this.getFarmerProfile(id);

    const currentStatus = this.normalizeVerificationStatus(farmer.verificationStatus);
    if (!['draft', 'rejected'].includes(currentStatus)) {
      throw new BadRequestError('Invalid verification transition: only draft or rejected profiles can be submitted');
    }

    farmer.verificationStatus = 'submitted';
    farmer.verificationSubmittedAt = new Date();
    farmer.verificationReviewedAt = undefined;
    farmer.verificationReason = undefined;
    farmer.rejectionReason = undefined;
    if (notes) {
      farmer.verificationNotes = notes;
    }
    if (verificationLevel) {
      farmer.verificationLevel = verificationLevel;
    }

    await farmer.save();
    
    await AuditService.log({
      action: 'farmers.verification_submitted',
      resource: 'farmer_profile',
      resourceId: farmer._id.toString(),
      userId: farmer.userId.toString(),
      details: {
        metadata: { verificationLevel: farmer.verificationLevel, notes }
      },
    });
    
    return this.normalizeFarmerVerificationFields(farmer);
  }
  
  /**
   * Verify farmer profile (Admin action)
   */
  async verifyFarmer(
    id: mongoose.Types.ObjectId,
    verifiedBy: mongoose.Types.ObjectId,
    status: 'verified' | 'rejected',
    reason?: string
  ): Promise<IFarmerProfile> {
    const farmer = await this.getFarmerProfile(id);

    const currentStatus = this.normalizeVerificationStatus(farmer.verificationStatus);
    if (currentStatus !== 'submitted') {
      throw new BadRequestError('Invalid verification transition: only submitted profiles can be verified or rejected');
    }

    farmer.verificationReviewedAt = new Date();
    farmer.verificationReason = reason;
    farmer.verifiedBy = verifiedBy;

    if (status === 'verified') {
      farmer.verificationStatus = 'verified';
      farmer.verifiedAt = farmer.verificationReviewedAt;
      farmer.verificationNotes = reason;
      farmer.rejectionReason = undefined;
    } else {
      farmer.verificationStatus = 'rejected';
      farmer.verifiedAt = undefined;
      farmer.rejectionReason = reason;
    }
    
    await farmer.save();
    
    await AuditService.log({
      action: status === 'verified' ? 'farmers.verification_approved' : 'farmers.verification_rejected',
      resource: 'farmer_profile',
      resourceId: farmer._id.toString(),
      userId: verifiedBy.toString(),
      details: {
        metadata: { reason, status }
      },
      risk: status === 'verified' ? 'low' : 'medium',
    });
    
    return this.normalizeFarmerVerificationFields(farmer);
  }
  
  /**
   * List farmers with filtering and pagination
   */
  async listFarmers(options: {
    page?: number;
    limit?: number;
    farmerType?: string;
    verificationStatus?: string;
    verified?: boolean;
    region?: string;
    district?: string;
    organizationId?: string;
    searchQuery?: string;
  }): Promise<{ farmers: IFarmerProfile[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = { isActive: true };
    
    if (options.farmerType) filter.farmerType = options.farmerType;
    const verificationFilter = this.buildVerificationStatusFilter(options.verificationStatus, options.verified);
    if (verificationFilter) {
      filter.verificationStatus = verificationFilter;
    }
    if (options.region) filter['primaryLocation.region'] = options.region;
    if (options.district) filter['primaryLocation.district'] = options.district;
    if (options.organizationId) filter['organizationMembership.organizationId'] = options.organizationId;
    
    // Text search
    if (options.searchQuery) {
      filter.$text = { $search: options.searchQuery };
    }
    
    const [farmers, total] = await Promise.all([
      FarmerProfile.find(filter)
        .populate('userId', 'firstName lastName email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      FarmerProfile.countDocuments(filter),
    ]);
    
    const normalizedFarmers = farmers.map((farmer) => this.normalizeFarmerVerificationFields(farmer));

    return {
      farmers: normalizedFarmers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
  
  // ==================== FARM MANAGEMENT ====================
  
  /**
   * Create a new farm
   */
  async createFarm(
    farmerId: mongoose.Types.ObjectId,
    data: Partial<IFarmEnterprise>,
    createdBy?: mongoose.Types.ObjectId
  ): Promise<IFarmEnterprise> {
    // Verify farmer exists
    const farmer = await this.getFarmerProfile(farmerId);
    
    const farm = new FarmEnterprise({
      farmerId,
      ...data,
      createdBy,
      lastModifiedBy: createdBy,
    });
    
    await farm.save();
    
    await AuditService.log({
      action: 'farmers.farm_created',
      resource: 'farm',
      resourceId: farm._id.toString(),
      userId: farmer.userId.toString(),
      details: {
        metadata: {
          farmName: farm.farmName,
          farmCode: farm.farmCode,
          size: `${farm.totalSize} ${farm.sizeUnit}`,
        }
      },
    });
    
    return farm;
  }
  
  /**
   * Get farms for a farmer
   */
  async getFarmerFarms(farmerId: mongoose.Types.ObjectId): Promise<IFarmEnterprise[]> {
    return await FarmEnterprise.find({ farmerId, isActive: true })
      .sort({ createdAt: -1 });
  }

  /**
   * Get a farm by ID
   */
  async getFarmById(id: mongoose.Types.ObjectId): Promise<IFarmEnterprise> {
    const farm = await FarmEnterprise.findOne({ _id: id, isActive: true });

    if (!farm) {
      throw new NotFoundError('Farm not found');
    }

    return farm;
  }
  
  /**
   * Update farm
   */
  async updateFarm(
    id: mongoose.Types.ObjectId,
    updates: Partial<IFarmEnterprise>,
    modifiedBy?: mongoose.Types.ObjectId
  ): Promise<IFarmEnterprise> {
    const farm = await FarmEnterprise.findOne({ _id: id, isActive: true });
    
    if (!farm) {
      throw new NotFoundError('Farm not found');
    }
    
    updates.version = (farm.version || 1) + 1;
    updates.lastModifiedBy = modifiedBy;
    
    Object.assign(farm, updates);
    await farm.save();
    
    await AuditService.log({
      action: 'farmers.farm_updated',
      resource: 'farm',
      resourceId: farm._id.toString(),
      userId: modifiedBy?.toString(),
      details: {
        metadata: { updates: Object.keys(updates) }
      },
    });
    
    return farm;
  }

  /**
   * Soft delete farm
   */
  async deleteFarm(
    id: mongoose.Types.ObjectId,
    deletedBy?: mongoose.Types.ObjectId
  ): Promise<void> {
    const farm = await this.getFarmById(id);

    await farm.softDelete(deletedBy);

    await AuditService.log({
      action: 'farmers.farm_deleted',
      resource: 'farm',
      resourceId: farm._id.toString(),
      userId: deletedBy?.toString(),
      risk: 'medium',
    });
  }

  // ==================== PLOTS MANAGEMENT ====================

  /**
   * Create a plot for a farmer
   */
  async createPlot(
    farmerId: mongoose.Types.ObjectId,
    data: Partial<IPlot>,
    createdBy?: mongoose.Types.ObjectId
  ): Promise<IPlot> {
    await this.getFarmerProfile(farmerId);

    if (data.farmId) {
      const farm = await FarmEnterprise.findOne({
        _id: data.farmId,
        farmerId,
        isActive: true,
      });

      if (!farm) {
        throw new NotFoundError('Farm not found or does not belong to this farmer');
      }
    }

    const plot = new Plot({
      farmerId,
      ...data,
      createdBy,
      lastModifiedBy: createdBy,
    });

    await plot.save();

    await AuditService.log({
      action: 'farmers.plot_created',
      resource: 'plot',
      resourceId: plot._id.toString(),
      userId: createdBy?.toString(),
      details: {
        metadata: {
          plotName: plot.plotName,
          farmId: plot.farmId?.toString(),
        },
      },
    });

    return plot;
  }

  /**
   * List farmer plots
   */
  async getFarmerPlots(farmerId: mongoose.Types.ObjectId): Promise<IPlot[]> {
    return Plot.find({ farmerId, isActive: true }).sort({ createdAt: -1 });
  }

  /**
   * Get plot by ID
   */
  async getPlot(id: mongoose.Types.ObjectId): Promise<IPlot> {
    const plot = await Plot.findOne({ _id: id, isActive: true });

    if (!plot) {
      throw new NotFoundError('Plot not found');
    }

    return plot;
  }

  /**
   * Update plot
   */
  async updatePlot(
    id: mongoose.Types.ObjectId,
    updates: Partial<IPlot>,
    modifiedBy?: mongoose.Types.ObjectId
  ): Promise<IPlot> {
    const plot = await this.getPlot(id);

    if (updates.farmId) {
      const farm = await FarmEnterprise.findOne({
        _id: updates.farmId,
        farmerId: plot.farmerId,
        isActive: true,
      });

      if (!farm) {
        throw new NotFoundError('Farm not found or does not belong to this farmer');
      }
    }

    updates.version = (plot.version || 1) + 1;
    updates.lastModifiedBy = modifiedBy;

    Object.assign(plot, updates);
    await plot.save();

    await AuditService.log({
      action: 'farmers.plot_updated',
      resource: 'plot',
      resourceId: plot._id.toString(),
      userId: modifiedBy?.toString(),
      details: {
        metadata: { updates: Object.keys(updates) },
      },
    });

    return plot;
  }

  /**
   * Soft delete plot
   */
  async deletePlot(
    id: mongoose.Types.ObjectId,
    deletedBy?: mongoose.Types.ObjectId
  ): Promise<void> {
    const plot = await this.getPlot(id);
    await plot.softDelete(deletedBy);

    await AuditService.log({
      action: 'farmers.plot_deleted',
      resource: 'plot',
      resourceId: plot._id.toString(),
      userId: deletedBy?.toString(),
      risk: 'medium',
    });
  }
  
  // ==================== PRODUCTION MANAGEMENT ====================
  
  /**
   * Record crop production
   */
  async recordCropProduction(
    farmerId: mongoose.Types.ObjectId,
    farmId: mongoose.Types.ObjectId,
    data: Partial<ICropProduction>,
    createdBy?: mongoose.Types.ObjectId
  ): Promise<ICropProduction> {
    // Verify farm belongs to farmer
    const farm = await FarmEnterprise.findOne({ _id: farmId, farmerId, isActive: true });
    if (!farm) {
      throw new NotFoundError('Farm not found or does not belong to this farmer');
    }
    
    const production = new CropProduction({
      farmerId,
      farmId,
      ...data,
      createdBy,
      lastModifiedBy: createdBy,
    });
    
    await production.save();
    
    await AuditService.log({
      action: 'farmers.crop_production_recorded',
      resource: 'crop_production',
      resourceId: production._id.toString(),
      userId: createdBy?.toString(),
      details: {
        metadata: {
          cropName: production.cropName,
          season: production.season,
          year: production.year,
        }
      },
    });
    
    return production;
  }
  
  /**
   * Record livestock production
   */
  async recordLivestockProduction(
    farmerId: mongoose.Types.ObjectId,
    farmId: mongoose.Types.ObjectId,
    data: Partial<ILivestockProduction>,
    createdBy?: mongoose.Types.ObjectId
  ): Promise<ILivestockProduction> {
    const farm = await FarmEnterprise.findOne({ _id: farmId, farmerId, isActive: true });
    if (!farm) {
      throw new NotFoundError('Farm not found or does not belong to this farmer');
    }
    
    const production = new LivestockProduction({
      farmerId,
      farmId,
      ...data,
      createdBy,
      lastModifiedBy: createdBy,
    });
    
    await production.save();
    
    await AuditService.log({
      action: 'farmers.livestock_production_recorded',
      resource: 'livestock_production',
      resourceId: production._id.toString(),
      userId: createdBy?.toString(),
      details: {
        metadata: {
          animalType: production.animalType,
          totalAnimals: production.totalAnimals,
          year: production.year,
        }
      },
    });
    
    return production;
  }
  
  /**
   * Get production history for a farmer
   */
  async getFarmerProduction(
    farmerId: mongoose.Types.ObjectId,
    options: {
      year?: number;
      season?: string;
      cropName?: string;
      animalType?: string;
      productionType?: 'crops' | 'livestock' | 'all';
    } = {}
  ): Promise<{
    crops: ICropProduction[];
    livestock: ILivestockProduction[];
  }> {
    const productionType = options.productionType || 'all';
    
    let crops: ICropProduction[] = [];
    let livestock: ILivestockProduction[] = [];
    
    if (productionType === 'crops' || productionType === 'all') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cropFilter: any = { farmerId, isActive: true };
      if (options.year) cropFilter.year = options.year;
      if (options.season) cropFilter.season = options.season;
      if (options.cropName) cropFilter.cropName = options.cropName;
      
      crops = await CropProduction.find(cropFilter).sort({ year: -1, season: -1 });
    }
    
    if (productionType === 'livestock' || productionType === 'all') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const livestockFilter: any = { farmerId, isActive: true };
      if (options.year) livestockFilter.year = options.year;
      if (options.animalType) livestockFilter.animalType = options.animalType;
      
      livestock = await LivestockProduction.find(livestockFilter).sort({ year: -1 });
    }
    
    return { crops, livestock };
  }

  /**
   * Get crop production records for a farmer
   */
  async getFarmerCrops(
    farmerId: mongoose.Types.ObjectId,
    options: {
      year?: number;
      season?: string;
      cropName?: string;
    } = {}
  ): Promise<ICropProduction[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = { farmerId, isActive: true };
    if (options.year) filter.year = options.year;
    if (options.season) filter.season = options.season;
    if (options.cropName) filter.cropName = options.cropName;

    return CropProduction.find(filter).sort({ createdAt: -1 });
  }

  /**
   * Get crop production record by ID
   */
  async getCropProduction(id: mongoose.Types.ObjectId): Promise<ICropProduction> {
    const crop = await CropProduction.findOne({ _id: id, isActive: true });
    if (!crop) {
      throw new NotFoundError('Crop production record not found');
    }
    return crop;
  }

  /**
   * Update crop production record
   */
  async updateCropProduction(
    id: mongoose.Types.ObjectId,
    updates: Partial<ICropProduction>,
    modifiedBy?: mongoose.Types.ObjectId
  ): Promise<ICropProduction> {
    const crop = await this.getCropProduction(id);

    if (updates.farmId) {
      const farm = await FarmEnterprise.findOne({
        _id: updates.farmId,
        farmerId: crop.farmerId,
        isActive: true,
      });
      if (!farm) {
        throw new NotFoundError('Farm not found or does not belong to this farmer');
      }
    }

    updates.version = (crop.version || 1) + 1;
    updates.lastModifiedBy = modifiedBy;

    Object.assign(crop, updates);
    await crop.save();

    await AuditService.log({
      action: 'farmers.crop_production_updated',
      resource: 'crop_production',
      resourceId: crop._id.toString(),
      userId: modifiedBy?.toString(),
      details: {
        metadata: { updates: Object.keys(updates) },
      },
    });

    return crop;
  }

  /**
   * Soft delete crop production record
   */
  async deleteCropProduction(
    id: mongoose.Types.ObjectId,
    deletedBy?: mongoose.Types.ObjectId
  ): Promise<void> {
    const crop = await this.getCropProduction(id);

    crop.isActive = false;
    crop.deletedAt = new Date();
    crop.lastModifiedBy = deletedBy;
    await crop.save();

    await AuditService.log({
      action: 'farmers.crop_production_deleted',
      resource: 'crop_production',
      resourceId: crop._id.toString(),
      userId: deletedBy?.toString(),
      risk: 'medium',
    });
  }

  // ==================== INPUTS MANAGEMENT ====================

  /**
   * Create input record
   */
  async createInput(
    farmerId: mongoose.Types.ObjectId,
    data: Partial<IFarmerInput>,
    createdBy?: mongoose.Types.ObjectId
  ): Promise<IFarmerInput> {
    await this.getFarmerProfile(farmerId);

    if (data.farmId) {
      const farm = await FarmEnterprise.findOne({
        _id: data.farmId,
        farmerId,
        isActive: true,
      });
      if (!farm) {
        throw new NotFoundError('Farm not found or does not belong to this farmer');
      }
    }

    if (data.plotId) {
      const plot = await Plot.findOne({
        _id: data.plotId,
        farmerId,
        isActive: true,
      });
      if (!plot) {
        throw new NotFoundError('Plot not found or does not belong to this farmer');
      }
    }

    const input = new FarmerInput({
      farmerId,
      ...data,
      createdBy,
      lastModifiedBy: createdBy,
    });

    await input.save();

    await AuditService.log({
      action: 'farmers.input_created',
      resource: 'farmer_input',
      resourceId: input._id.toString(),
      userId: createdBy?.toString(),
      details: {
        metadata: {
          inputType: input.inputType,
          inputName: input.inputName,
        },
      },
    });

    return input;
  }

  /**
   * List farmer inputs
   */
  async getFarmerInputs(farmerId: mongoose.Types.ObjectId): Promise<IFarmerInput[]> {
    return FarmerInput.find({ farmerId, isActive: true }).sort({ createdAt: -1 });
  }

  /**
   * Get input by ID
   */
  async getInput(id: mongoose.Types.ObjectId): Promise<IFarmerInput> {
    const input = await FarmerInput.findOne({ _id: id, isActive: true });
    if (!input) {
      throw new NotFoundError('Input not found');
    }
    return input;
  }

  /**
   * Update input
   */
  async updateInput(
    id: mongoose.Types.ObjectId,
    updates: Partial<IFarmerInput>,
    modifiedBy?: mongoose.Types.ObjectId
  ): Promise<IFarmerInput> {
    const input = await this.getInput(id);

    if (updates.farmId) {
      const farm = await FarmEnterprise.findOne({
        _id: updates.farmId,
        farmerId: input.farmerId,
        isActive: true,
      });
      if (!farm) {
        throw new NotFoundError('Farm not found or does not belong to this farmer');
      }
    }

    if (updates.plotId) {
      const plot = await Plot.findOne({
        _id: updates.plotId,
        farmerId: input.farmerId,
        isActive: true,
      });
      if (!plot) {
        throw new NotFoundError('Plot not found or does not belong to this farmer');
      }
    }

    updates.version = (input.version || 1) + 1;
    updates.lastModifiedBy = modifiedBy;

    Object.assign(input, updates);
    await input.save();

    await AuditService.log({
      action: 'farmers.input_updated',
      resource: 'farmer_input',
      resourceId: input._id.toString(),
      userId: modifiedBy?.toString(),
      details: {
        metadata: { updates: Object.keys(updates) },
      },
    });

    return input;
  }

  /**
   * Soft delete input
   */
  async deleteInput(
    id: mongoose.Types.ObjectId,
    deletedBy?: mongoose.Types.ObjectId
  ): Promise<void> {
    const input = await this.getInput(id);
    await input.softDelete(deletedBy);

    await AuditService.log({
      action: 'farmers.input_deleted',
      resource: 'farmer_input',
      resourceId: input._id.toString(),
      userId: deletedBy?.toString(),
      risk: 'medium',
    });
  }
  
  // ==================== MEMBERSHIP MANAGEMENT ====================
  
  /**
   * Create membership record (for independent farmer)
   */
  async createMembership(
    farmerId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
    createdBy?: mongoose.Types.ObjectId
  ): Promise<IFarmerMembership> {
    // Check if membership already exists
    const existing = await FarmerMembership.findOne({ farmerId, isActive: true });
    if (existing) {
      throw new BadRequestError('Membership record already exists for this farmer');
    }
    
    const membership = new FarmerMembership({
      farmerId,
      userId,
      membershipType: 'independent',
      membershipStatus: 'active',
      createdBy,
      lastModifiedBy: createdBy,
    });
    
    await membership.save();
    
    await AuditService.log({
      action: 'farmers.membership_created',
      resource: 'farmer_membership',
      resourceId: membership._id.toString(),
      userId: userId.toString(),
      details: {
        metadata: { membershipType: 'independent' }
      },
    });
    
    return membership;
  }
  
  /**
   * Join organization (transition from independent to cooperative member)
   */
  async joinOrganization(
    farmerId: mongoose.Types.ObjectId,
    organizationId: mongoose.Types.ObjectId,
    role: string = 'member',
    modifiedBy?: mongoose.Types.ObjectId
  ): Promise<IFarmerMembership> {
    const membership = await FarmerMembership.findOne({ farmerId, isActive: true });
    
    if (!membership) {
      throw new NotFoundError('Membership record not found');
    }
    
    // Use the transferToOrganization method
    await membership.transferToOrganization(organizationId, role);
    membership.lastModifiedBy = modifiedBy;
    await membership.save();
    
    // Update farmer profile
    const farmer = await FarmerProfile.findById(farmerId);
    if (farmer) {
      farmer.farmerType = 'cooperative_member';
      if (!farmer.organizationMembership) {
        farmer.organizationMembership = {
          organizationId,
          role: role as 'member' | 'committee_member' | 'treasurer' | 'secretary' | 'chairperson' | 'vice_chairperson' | 'auditor',
          joinedAt: new Date(),
          membershipStatus: 'active'
        };
      } else {
        farmer.organizationMembership.organizationId = organizationId;
        farmer.organizationMembership.role = role as 'member' | 'committee_member' | 'treasurer' | 'secretary' | 'chairperson' | 'vice_chairperson' | 'auditor';
        farmer.organizationMembership.joinedAt = new Date();
        farmer.organizationMembership.membershipStatus = 'active';
      }
      await farmer.save();
    }
    
    await AuditService.log({
      action: 'farmers.organization_joined',
      resource: 'farmer_membership',
      resourceId: membership._id.toString(),
      userId: membership.userId.toString(),
      details: {
        metadata: {
          organizationId: organizationId.toString(),
          role,
        }
      },
    });
    
    return membership;
  }
  
  /**
   * Leave organization (transition back to independent)
   */
  async leaveOrganization(
    farmerId: mongoose.Types.ObjectId,
    exitReason: string,
    exitNotes?: string,
    modifiedBy?: mongoose.Types.ObjectId
  ): Promise<IFarmerMembership> {
    const membership = await FarmerMembership.findOne({ farmerId, isActive: true });
    
    if (!membership || !membership.organizationId) {
      throw new BadRequestError('Farmer is not a member of any organization');
    }
    
    // Archive current membership
    membership.membershipHistory.push({
      organizationId: membership.organizationId,
      role: membership.role,
      joinedDate: membership.joinedDate,
      exitDate: new Date(),
      exitReason,
      status: 'completed',
    });
    
    // Reset to independent
    membership.organizationId = undefined;
    membership.membershipType = 'independent';
    membership.role = 'member';
    membership.exitDate = new Date();
    membership.exitReason = exitReason as 'voluntary' | 'expulsion' | 'death' | 'relocation' | 'inactivity' | 'other';
    membership.exitNotes = exitNotes;
    membership.lastModifiedBy = modifiedBy;
    
    await membership.save();
    
    // Update farmer profile
    const farmer = await FarmerProfile.findById(farmerId);
    if (farmer) {
      farmer.farmerType = 'individual';
      if (farmer.organizationMembership) {
        farmer.organizationMembership.membershipStatus = 'inactive';
        farmer.organizationMembership.exitDate = new Date();
        farmer.organizationMembership.exitReason = exitReason;
      }
      await farmer.save();
    }
    
    await AuditService.log({
      action: 'farmers.organization_left',
      resource: 'farmer_membership',
      resourceId: membership._id.toString(),
      userId: membership.userId.toString(),
      details: {
        metadata: { exitReason, exitNotes }
      },
    });
    
    return membership;
  }
  
  /**
   * Update eligibility for services
   */
  async updateEligibility(
    farmerId: mongoose.Types.ObjectId,
    eligibilityUpdates: Partial<IFarmerMembership['eligibility']>,
    modifiedBy?: mongoose.Types.ObjectId
  ): Promise<IFarmerMembership> {
    const membership = await FarmerMembership.findOne({ farmerId, isActive: true });
    
    if (!membership) {
      throw new NotFoundError('Membership record not found');
    }
    
    Object.assign(membership.eligibility, eligibilityUpdates);
    membership.lastModifiedBy = modifiedBy;
    await membership.save();
    
    await AuditService.log({
      action: 'farmers.eligibility_updated',
      resource: 'farmer_membership',
      resourceId: membership._id.toString(),
      userId: modifiedBy?.toString(),
      details: {
        metadata: { eligibilityUpdates }
      },
    });
    
    return membership;
  }
  
  // ==================== ANALYTICS & REPORTING ====================
  
  /**
   * Get farmer statistics
   */
  async getFarmerStats(filters: {
    region?: string;
    district?: string;
    verificationStatus?: string;
    farmerType?: string;
  } = {}): Promise<{
    totalFarmers: number;
    verifiedFarmers: number;
    independentFarmers: number;
    cooperativeMembers: number;
    totalFarmSize: number;
    averageFarmSize: number;
    byRegion: { region: string; count: number }[];
    byVerificationStatus: { status: string; count: number }[];
  }> {
    const matchStage: Record<string, unknown> = { isActive: true };
    if (filters.region) matchStage['primaryLocation.region'] = filters.region;
    if (filters.district) matchStage['primaryLocation.district'] = filters.district;
    const statusFilter = this.buildVerificationStatusFilter(filters.verificationStatus);
    if (statusFilter) {
      matchStage.verificationStatus = statusFilter;
    }
    if (filters.farmerType) matchStage.farmerType = filters.farmerType;
    
    const [totalStats, byRegion, byVerificationStatus] = await Promise.all([
      FarmerProfile.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalFarmers: { $sum: 1 },
            verifiedFarmers: {
              $sum: { $cond: [{ $eq: ['$verificationStatus', 'verified'] }, 1, 0] },
            },
            independentFarmers: {
              $sum: { $cond: [{ $eq: ['$farmerType', 'individual'] }, 1, 0] },
            },
            cooperativeMembers: {
              $sum: { $cond: [{ $eq: ['$farmerType', 'cooperative_member'] }, 1, 0] },
            },
          },
        },
      ]),
      FarmerProfile.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$primaryLocation.region',
            count: { $sum: 1 },
          },
        },
        { $project: { _id: 0, region: '$_id', count: 1 } },
        { $sort: { count: -1 } },
      ]),
      FarmerProfile.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$verificationStatus',
            count: { $sum: 1 },
          },
        },
        { $project: { _id: 0, status: '$_id', count: 1 } },
      ]),
    ]);
    
    // Get farm size statistics
    const farmStats = await FarmEnterprise.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalFarmSize: { $sum: '$totalSize' },
          averageFarmSize: { $avg: '$totalSize' },
        },
      },
    ]);
    
    return {
      ...totalStats[0],
      totalFarmSize: farmStats[0]?.totalFarmSize || 0,
      averageFarmSize: farmStats[0]?.averageFarmSize || 0,
      byRegion,
      byVerificationStatus,
    };
  }
  
  /**
   * Soft delete farmer profile
   */
  async deleteFarmerProfile(
    id: mongoose.Types.ObjectId,
    deletedBy?: mongoose.Types.ObjectId
  ): Promise<void> {
    const farmer = await FarmerProfile.findOne({ _id: id, isActive: true });
    
    if (!farmer) {
      throw new NotFoundError('Farmer profile not found');
    }
    
    await farmer.softDelete(deletedBy);
    
    await AuditService.log({
      action: 'farmers.profile_deleted',
      resource: 'farmer_profile',
      resourceId: farmer._id.toString(),
      userId: deletedBy?.toString(),
      risk: 'medium',
    });
  }
}

export default new FarmersService();
