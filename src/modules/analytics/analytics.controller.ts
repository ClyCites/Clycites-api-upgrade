import { Request, Response, NextFunction } from 'express';
import AnalyticsService from './analytics.service';
import { ResponseHandler } from '../../common/utils/response';
import { AuthRequest } from '../../common/middleware/auth';

export class AnalyticsController {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  getMarketOverview = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const overview = await this.analyticsService.getMarketOverview();
      ResponseHandler.success(res, overview, 'Market overview retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getPriceTrends = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const trends = await this.analyticsService.getPriceTrends(req.query);
      ResponseHandler.success(res, trends, 'Price trends retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getProductDemand = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const demand = await this.analyticsService.getProductDemand(req.query);
      ResponseHandler.success(res, demand, 'Product demand retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getSupplyAnalysis = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const supply = await this.analyticsService.getSupplyAnalysis(req.query);
      ResponseHandler.success(res, supply, 'Supply analysis retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getFarmerPerformance = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { farmerId } = req.params;
      const resolvedFarmerId = farmerId ?? req.user?.farmerId;
      if (!resolvedFarmerId) {
        return ResponseHandler.error(res, 'Farmer profile not found', 404);
      }
      const performance = await this.analyticsService.getFarmerPerformance(
        resolvedFarmerId,
        req.query
      );
      ResponseHandler.success(res, performance, 'Farmer performance retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getMyPerformance = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const resolvedFarmerId = req.user?.farmerId;
      if (!resolvedFarmerId) {
        return ResponseHandler.error(res, 'Farmer profile not found', 404);
      }
      const performance = await this.analyticsService.getFarmerPerformance(
        resolvedFarmerId,
        req.query
      );
      ResponseHandler.success(res, performance, 'Performance metrics retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getRegionalAnalysis = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const analysis = await this.analyticsService.getRegionalAnalysis();
      ResponseHandler.success(res, analysis, 'Regional analysis retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getMarketHealth = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const health = await this.analyticsService.getMarketHealth();
      ResponseHandler.success(res, health, 'Market health retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}

export default new AnalyticsController();
