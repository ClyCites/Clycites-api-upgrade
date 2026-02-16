import mongoose from 'mongoose';
import FarmerProfile, { IFarmerProfile } from './farmerProfile.model';
import FarmEnterprise, { IFarmEnterprise } from './farmEnterprise.model';
import { CropProduction, LivestockProduction, ICropProduction, ILivestockProduction } from './production.model';
import FarmerMembership, { IFarmerMembership } from './farmerMembership.model';
import { AuditService } from '../audit';
import { NotFoundError, BadRequestError } from '../../common/errors/AppError';
import logger from '../../common/utils/logger';

/**
 * Enterprise Farmers Service
 * Comprehensive business logic for farmer management
 */

class FarmersService {
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
      return farmerProfile;
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
    
    return farmer;
  }
  
  /**
   * Get farmer profile by user ID
   */
  async getFarmerProfileByUserId(userId: mongoose.Types.ObjectId): Promise<IFarmerProfile | null> {
    return await FarmerProfile.findOne({ userId, isActive: true })
      .populate('userId', 'email firstName lastName')
      .populate('organizationMembership.organizationId', 'name');
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
    
    return farmer;
  }
  
  /**
   * Submit farmer for verification
   */
  async submitForVerification(
    id: mongoose.Types.ObjectId,
    verificationLevel: 'basic' | 'intermediate' | 'advanced'
  ): Promise<IFarmerProfile> {
    const farmer = await this.getFarmerProfile(id);
    
    // Validate required fields based on verification level
    if (verificationLevel === 'basic') {
      if (!farmer.kycData?.nationalIdNumber || !farmer.contactDetails?.primaryPhone) {
        throw new BadRequestError('Basic verification requires national ID and phone number');
      }
    }
    
    if (verificationLevel === 'intermediate' || verificationLevel === 'advanced') {
      if (!farmer.kycData?.nationalIdDocument || !farmer.primaryLocation?.coordinates) {
        throw new BadRequestError('Higher verification levels require ID document and GPS coordinates');
      }
    }
    
    farmer.verificationStatus = 'pending';
    farmer.verificationLevel = verificationLevel;
    await farmer.save();
    
    await AuditService.log({
      action: 'farmers.verification_submitted',
      resource: 'farmer_profile',
      resourceId: farmer._id.toString(),
      userId: farmer.userId.toString(),
      details: {
        metadata: { verificationLevel }
      },
    });
    
    return farmer;
  }
  
  /**
   * Verify farmer profile (Admin action)
   */
  async verifyFarmer(
    id: mongoose.Types.ObjectId,
    verifiedBy: mongoose.Types.ObjectId,
    approved: boolean,
    notes?: string
  ): Promise<IFarmerProfile> {
    const farmer = await this.getFarmerProfile(id);
    
    if (approved) {
      farmer.verificationStatus = 'verified';
      farmer.verifiedAt = new Date();
      farmer.verifiedBy = verifiedBy;
      farmer.verificationNotes = notes;
    } else {
      farmer.verificationStatus = 'rejected';
      farmer.rejectionReason = notes;
    }
    
    await farmer.save();
    
    await AuditService.log({
      action: approved ? 'farmers.verification_approved' : 'farmers.verification_rejected',
      resource: 'farmer_profile',
      resourceId: farmer._id.toString(),
      userId: verifiedBy.toString(),
      details: {
        metadata: { notes }
      },
      risk: approved ? 'low' : 'medium',
    });
    
    return farmer;
  }
  
  /**
   * List farmers with filtering and pagination
   */
  async listFarmers(options: {
    page?: number;
    limit?: number;
    farmerType?: string;
    verificationStatus?: string;
    region?: string;
    district?: string;
    organizationId?: string;
    searchQuery?: string;
  }): Promise<{ farmers: IFarmerProfile[]; total: number; page: number; pages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = { isActive: true };
    
    if (options.farmerType) filter.farmerType = options.farmerType;
    if (options.verificationStatus) filter.verificationStatus = options.verificationStatus;
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
    
    return {
      farmers,
      total,
      page,
      pages: Math.ceil(total / limit),
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
    if (filters.verificationStatus) matchStage.verificationStatus = filters.verificationStatus;
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
