import { Request, Response, NextFunction } from 'express';
import MarketService from './market.service';
import { ResponseHandler } from '../../common/utils/response';

export class MarketController {
  private marketService: MarketService;

  constructor() {
    this.marketService = new MarketService();
  }

  createMarket = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const market = await this.marketService.createMarket(req.body);
      ResponseHandler.created(res, { market }, 'Market created successfully');
    } catch (error) {
      next(error);
    }
  };

  getMarkets = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const markets = await this.marketService.getMarkets();
      ResponseHandler.success(res, markets, 'Markets retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getMarketById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const market = await this.marketService.getMarketById(req.params.id);
      ResponseHandler.success(res, market, 'Market retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  updateMarket = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const market = await this.marketService.updateMarket(req.params.id, req.body);
      ResponseHandler.success(res, { market }, 'Market updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteMarket = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.marketService.deleteMarket(req.params.id);
      ResponseHandler.success(res, null, 'Market deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  getPricesForMarket = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.marketService.getPricesForMarket(req.params.marketId);
      ResponseHandler.success(res, result, 'Market prices retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}

export default new MarketController();
