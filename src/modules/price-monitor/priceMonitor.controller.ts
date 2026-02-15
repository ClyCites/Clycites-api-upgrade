import { Request, Response, NextFunction } from 'express';
import PriceMonitorService from './priceMonitor.service';
import { ResponseHandler } from '../../common/utils/response';

export class PriceMonitorController {
  private priceMonitorService: PriceMonitorService;

  constructor() {
    this.priceMonitorService = new PriceMonitorService();
  }

  predict = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceMonitorService.predictPrice(req.body);
      ResponseHandler.success(res, result, 'Price prediction completed');
    } catch (error) {
      next(error);
    }
  };

  train = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceMonitorService.trainModel();
      ResponseHandler.success(res, result, 'Model training triggered');
    } catch (error) {
      next(error);
    }
  };
}

export default new PriceMonitorController();
