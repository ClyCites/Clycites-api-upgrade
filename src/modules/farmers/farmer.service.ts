import Farmer, { IFarmer } from './farmer.model';
import Farm from './farm.model';
import User from '../users/user.model';
import { NotFoundError, BadRequestError } from '../../common/errors/AppError';
import { PaginationUtil } from '../../common/utils/pagination';

interface CreateFarmerData {
  userId: string;
  businessName?: string;
  farmSize?: number;
  farmSizeUnit?: 'acres' | 'hectares';
  location: {
    region: string;
    district: string;
    village?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  farmingType?: ('crop' | 'livestock' | 'mixed' | 'aquaculture')[];
  certifications?: string[];
}

interface CreateFarmData {
  farmerId: string;
  name: string;
  size: number;
  sizeUnit: 'acres' | 'hectares';
  location: {
    region: string;
    district: string;
    village?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  soilType?: string;
  waterSource?: string;
  crops?: string[];
  images?: string[];
}

class FarmerService {
  async createFarmerProfile(data: CreateFarmerData): Promise<IFarmer> {
    // Check if user exists
    const user = await User.findById(data.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if farmer profile already exists
    const existingFarmer = await Farmer.findOne({ user: data.userId });
    if (existingFarmer) {
      throw new BadRequestError('Farmer profile already exists');
    }

    // Create farmer profile
    const farmer = await Farmer.create({
      user: data.userId,
      ...data,
    });

    return farmer.populate('user', 'firstName lastName email phone');
  }

  async getFarmerByUserId(userId: string): Promise<IFarmer> {
    const farmer = await Farmer.findOne({ user: userId }).populate(
      'user',
      'firstName lastName email phone profileImage'
    );

    if (!farmer) {
      throw new NotFoundError('Farmer profile not found');
    }

    return farmer;
  }

  async getFarmerById(farmerId: string): Promise<IFarmer> {
    const farmer = await Farmer.findById(farmerId).populate(
      'user',
      'firstName lastName email phone profileImage'
    );

    if (!farmer) {
      throw new NotFoundError('Farmer not found');
    }

    return farmer;
  }

  async updateFarmerProfile(farmerId: string, updateData: Partial<CreateFarmerData>): Promise<IFarmer> {
    const farmer = await Farmer.findById(farmerId);

    if (!farmer) {
      throw new NotFoundError('Farmer profile not found');
    }

    Object.assign(farmer, updateData);
    await farmer.save();

    return farmer.populate('user', 'firstName lastName email phone');
  }

  async getAllFarmers(query: any) {
    const { page, limit, sortBy, sortOrder } = PaginationUtil.getPaginationParams(query);
    const skip = PaginationUtil.getSkip(page, limit);
    const sort = PaginationUtil.getSortObject(sortBy, sortOrder);

    const filter: any = {};

    if (query.region) {
      filter['location.region'] = query.region;
    }

    if (query.district) {
      filter['location.district'] = query.district;
    }

    if (query.verified !== undefined) {
      filter.verified = query.verified === 'true';
    }

    if (query.farmingType) {
      filter.farmingType = query.farmingType;
    }

    const [farmers, total] = await Promise.all([
      Farmer.find(filter)
        .populate('user', 'firstName lastName email phone profileImage')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Farmer.countDocuments(filter),
    ]);

    return PaginationUtil.buildPaginationResult(farmers, total, page, limit);
  }

  // Farm Management
  async createFarm(data: CreateFarmData) {
    // Verify farmer exists
    const farmer = await Farmer.findById(data.farmerId);
    if (!farmer) {
      throw new NotFoundError('Farmer not found');
    }

    const farm = await Farm.create(data);
    return farm.populate('farmer');
  }

  async getFarmsByFarmer(farmerId: string) {
    const farms = await Farm.find({ farmer: farmerId });
    return farms;
  }

  async getFarmById(farmId: string) {
    const farm = await Farm.findById(farmId).populate('farmer');

    if (!farm) {
      throw new NotFoundError('Farm not found');
    }

    return farm;
  }

  async updateFarm(farmId: string, updateData: Partial<CreateFarmData>) {
    const farm = await Farm.findById(farmId);

    if (!farm) {
      throw new NotFoundError('Farm not found');
    }

    Object.assign(farm, updateData);
    await farm.save();

    return farm.populate('farmer');
  }

  async deleteFarm(farmId: string) {
    const farm = await Farm.findById(farmId);

    if (!farm) {
      throw new NotFoundError('Farm not found');
    }

    await farm.deleteOne();
  }
}

export default FarmerService;
