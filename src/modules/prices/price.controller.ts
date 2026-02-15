import { Request, Response, NextFunction } from 'express';
import PriceService from './price.service';
import { ResponseHandler } from '../../common/utils/response';
import { AuthRequest } from '../../common/middleware/auth';

export class PriceController {
  private priceService: PriceService;

  constructor() {
    this.priceService = new PriceService();
  }

  addPrice = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.addPrice(req.body, { id: req.user?.id, role: req.user?.role });
      ResponseHandler.created(res, result, result.message || 'Price added successfully');
    } catch (error) {
      next(error);
    }
  };

  getPrices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.getPrices(req.query);
      ResponseHandler.success(res, result, 'Prices retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getPriceById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.getPriceById(req.params.id);
      ResponseHandler.success(res, result, 'Price retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  updatePrice = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.updatePrice(req.params.id, req.body, { id: req.user?.id, role: req.user?.role });
      ResponseHandler.success(res, result, 'Price updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deletePrice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.deletePrice(req.params.id);
      ResponseHandler.success(res, result, 'Price deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  getPriceTrends = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.getPriceTrends(req.query);
      ResponseHandler.success(res, result, 'Price trends retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  predictPrice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.predictPrice(req.body);
      ResponseHandler.success(res, result, 'Price prediction completed');
    } catch (error) {
      next(error);
    }
  };

  bulkImportPrices = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.bulkImportPrices(req.body, { id: req.user?.id, role: req.user?.role });
      ResponseHandler.created(res, result, 'Prices imported successfully');
    } catch (error) {
      next(error);
    }
  };

  getHistoricalPrices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.getHistoricalPrices(req.query);
      ResponseHandler.success(res, result, 'Historical prices retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getTopMarketsForProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.getTopMarketsForProduct(req.query);
      ResponseHandler.success(res, result, 'Top markets retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  setUserPriceAlerts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.setUserPriceAlerts(req.body);
      ResponseHandler.created(res, result, 'Price alert set successfully');
    } catch (error) {
      next(error);
    }
  };

  checkPriceAlerts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.query.userId as string;
      const result = await this.priceService.checkPriceAlerts(userId);
      ResponseHandler.success(res, result, 'Price alerts checked');
    } catch (error) {
      next(error);
    }
  };

  deletePriceAlert = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.deletePriceAlert(req.params.id);
      ResponseHandler.success(res, result, 'Price alert deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  detectPriceAnomalies = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.detectPriceAnomalies(req.query);
      ResponseHandler.success(res, result, 'Anomaly detection completed');
    } catch (error) {
      next(error);
    }
  };

  getAveragePricePerMarket = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.getAveragePricePerMarket(req.query);
      ResponseHandler.success(res, result, 'Average prices retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  compareMarketPrices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.compareMarketPrices(req.query);
      ResponseHandler.success(res, result, 'Market comparison retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getPriceVolatility = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.getPriceVolatility(req.query);
      ResponseHandler.success(res, result, 'Price volatility retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getTrendingProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.getTrendingProducts(req.query);
      ResponseHandler.success(res, result, 'Trending products retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getProductTrend = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.getProductTrend(req.query);
      ResponseHandler.success(res, result, 'Product trend retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getPriceSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.getPriceSummary(req.params.productId);
      ResponseHandler.success(res, result, 'Price summary retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  analyzeSeasonalPrices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.analyzeSeasonalPrices(req.query);
      ResponseHandler.success(res, result, 'Seasonality analysis completed');
    } catch (error) {
      next(error);
    }
  };

  analyzeCorrelations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.analyzeCorrelations(req.query);
      ResponseHandler.success(res, result, 'Correlation analysis completed');
    } catch (error) {
      next(error);
    }
  };

  analyzeRegionalPrices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.analyzeRegionalPrices(req.query);
      ResponseHandler.success(res, result, 'Regional analysis completed');
    } catch (error) {
      next(error);
    }
  };

  generateMarketReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.generateMarketReport(req.query);
      ResponseHandler.success(res, result, 'Market report generated');
    } catch (error) {
      next(error);
    }
  };

  scheduleReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.scheduleReport(req.body);
      ResponseHandler.success(res, result, 'Report scheduled successfully');
    } catch (error) {
      next(error);
    }
  };
}

export default new PriceController();
