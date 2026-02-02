import { Request, Response, NextFunction } from 'express';
import FarmerService from './farmer.service';
import { ResponseHandler } from '../../common/utils/response';

export class FarmerController {
  private farmerService: FarmerService;

  constructor() {
    this.farmerService = new FarmerService();
  }

  // Farmer Profile Management
  createProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      const farmer = await this.farmerService.createFarmerProfile({
        ...req.body,
        userId,
      });

      ResponseHandler.created(res, farmer, 'Farmer profile created successfully');
    } catch (error) {
      next(error);
    }
  };

  getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const farmer = await this.farmerService.getFarmerByUserId(userId!);

      ResponseHandler.success(res, farmer, 'Farmer profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getFarmerById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const farmer = await this.farmerService.getFarmerById(id);

      ResponseHandler.success(res, farmer, 'Farmer retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const farmer = await this.farmerService.updateFarmerProfile(id, req.body);

      ResponseHandler.success(res, farmer, 'Farmer profile updated successfully');
    } catch (error) {
      next(error);
    }
  };

  getAllFarmers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.farmerService.getAllFarmers(req.query);

      ResponseHandler.paginated(
        res,
        result.data,
        result.pagination,
        'Farmers retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  // Farm Management
  createFarm = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const farm = await this.farmerService.createFarm(req.body);

      ResponseHandler.created(res, farm, 'Farm created successfully');
    } catch (error) {
      next(error);
    }
  };

  getMyFarms = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { farmerId } = req.params;
      const farms = await this.farmerService.getFarmsByFarmer(farmerId);

      ResponseHandler.success(res, farms, 'Farms retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getFarmById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const farm = await this.farmerService.getFarmById(id);

      ResponseHandler.success(res, farm, 'Farm retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  updateFarm = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const farm = await this.farmerService.updateFarm(id, req.body);

      ResponseHandler.success(res, farm, 'Farm updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteFarm = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.farmerService.deleteFarm(id);

      ResponseHandler.success(res, null, 'Farm deleted successfully');
    } catch (error) {
      next(error);
    }
  };
}

export default new FarmerController();
