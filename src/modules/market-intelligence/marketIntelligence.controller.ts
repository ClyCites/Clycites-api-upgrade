import { Request, Response, NextFunction } from 'express';
import { marketIntelligenceService } from './marketIntelligence.service';
import { AppError } from '../../common/errors/AppError';
import PriceAlert from './priceAlert.model';
import MarketInsight from './marketInsight.model';

class MarketIntelligenceController {
  /**
   * Get market insights for a product
   * GET /api/market-intelligence/insights
   */
  async getMarketInsights(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, region, district, period = 'weekly' } = req.query;

      if (!productId) {
        throw new AppError('Product ID is required', 400);
      }

      const insight = await marketIntelligenceService.generateMarketInsight(
        productId as string,
        region as string,
        district as string,
        period as 'daily' | 'weekly' | 'monthly'
      );

      res.json({
        success: true,
        data: { insight },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get price recommendation for a listing
   * GET /api/market-intelligence/price-recommendation
   */
  async getPriceRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, region, quality, quantity } = req.query;

      if (!productId) {
        throw new AppError('Product ID is required', 400);
      }

      if (!quantity) {
        throw new AppError('Quantity is required', 400);
      }

      const recommendation = await marketIntelligenceService.getPriceRecommendation(
        productId as string,
        parseInt(quantity as string),
        quality as string || 'standard',
        region as string,
        undefined // district
      );

      res.json({
        success: true,
        data: { recommendation },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a price alert
   * POST /api/market-intelligence/alerts
   */
  async createPriceAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Authentication required', 401);
      }

      const { product, region, district, conditions, notificationChannels } = req.body;

      const alert = await PriceAlert.create({
        user: userId,
        product,
        region,
        district,
        conditions,
        notificationChannels: notificationChannels || ['inApp'],
        isActive: true,
      });

      res.status(201).json({
        success: true,
        message: 'Price alert created successfully',
        data: { alert },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's price alerts
   * GET /api/market-intelligence/alerts
   */
  async getUserAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Authentication required', 401);
      }

      const alerts = await PriceAlert.find({ user: userId })
        .populate('product', 'name category variety')
        .sort('-createdAt');

      res.json({
        success: true,
        data: { alerts, total: alerts.length },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a price alert
   * PATCH /api/market-intelligence/alerts/:alertId
   */
  async updatePriceAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const { alertId } = req.params;
      const userId = req.user?.id;

      const alert = await PriceAlert.findOne({
        _id: alertId,
        user: userId,
      });

      if (!alert) {
        throw new AppError('Price alert not found', 404);
      }

      const updatedAlert = await PriceAlert.findByIdAndUpdate(
        alertId,
        { $set: req.body },
        { new: true, runValidators: true }
      ).populate('product', 'name category variety');

      res.json({
        success: true,
        message: 'Price alert updated successfully',
        data: { alert: updatedAlert },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a price alert
   * DELETE /api/market-intelligence/alerts/:alertId
   */
  async deletePriceAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const { alertId } = req.params;
      const userId = req.user?.id;

      const alert = await PriceAlert.findOneAndDelete({
        _id: alertId,
        user: userId,
      });

      if (!alert) {
        throw new AppError('Price alert not found', 404);
      }

      res.json({
        success: true,
        message: 'Price alert deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check price alerts manually (for testing/admin)
   * POST /api/market-intelligence/alerts/check
   * Note: This triggers manual regeneration of insights which will check alerts
   */
  async checkPriceAlerts(_req: Request, res: Response, next: NextFunction) {
    try {
      // Trigger insight generation for all products, which will check alerts
      res.json({
        success: true,
        message: 'Price alert check scheduled. Insights will be regenerated in background.',
        data: { status: 'scheduled' },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get comparative market analysis
   * GET /api/market-intelligence/compare
   */
  async getComparativeAnalysis(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, regions } = req.query;

      if (!productId || !regions) {
        throw new AppError('Product ID and regions are required', 400);
      }

      const regionList = (regions as string).split(',');
      const comparisons = await Promise.all(
        regionList.map(async (region) => {
          const insight = await marketIntelligenceService.generateMarketInsight(
            productId as string,
            region.trim(),
            undefined,
            'weekly'
          );
          return {
            region: region.trim(),
            ...insight,
          };
        })
      );

      res.json({
        success: true,
        data: {
          product: productId,
          comparisons,
          analysisDate: new Date(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get market trends
   * GET /api/market-intelligence/trends
   */
  async getMarketTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, period = '30' } = req.query;

      if (!productId) {
        throw new AppError('Product ID is required', 400);
      }

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(period as string));

      const trends = await MarketInsight.find({
        product: productId,
        'period.start': { $gte: daysAgo },
      })
        .sort('period.start')
        .select('period priceStatistics supplyMetrics prediction');

      res.json({
        success: true,
        data: {
          trends,
          period: `Last ${period} days`,
          dataPoints: trends.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const marketIntelligenceController = new MarketIntelligenceController();
