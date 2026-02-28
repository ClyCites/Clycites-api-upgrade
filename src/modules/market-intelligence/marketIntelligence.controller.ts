import { Request, Response, NextFunction } from 'express';
import { marketIntelligenceService } from './marketIntelligence.service';
import { AppError } from '../../common/errors/AppError';
import PriceAlert from './priceAlert.model';
import MarketInsight from './marketInsight.model';
import { ResponseHandler, sendSuccess } from '../../common/utils/response';

type AlertCondition = {
  operator: 'below' | 'above' | 'equals' | 'changes_by';
  threshold: number;
  percentage?: number;
};

class MarketIntelligenceController {
  private normalizeAlertCondition(input: unknown): AlertCondition {
    if (
      input &&
      typeof input === 'object' &&
      'operator' in input &&
      'threshold' in input
    ) {
      const condition = input as AlertCondition;
      if (!['below', 'above', 'equals', 'changes_by'].includes(condition.operator)) {
        throw new AppError('Invalid condition.operator value', 400);
      }

      if (typeof condition.threshold !== 'number') {
        throw new AppError('condition.threshold must be a number', 400);
      }

      return condition;
    }

    if (input && typeof input === 'object') {
      const legacy = input as Record<string, unknown>;
      if (typeof legacy.priceBelow === 'number') {
        return { operator: 'below', threshold: legacy.priceBelow };
      }
      if (typeof legacy.priceAbove === 'number') {
        return { operator: 'above', threshold: legacy.priceAbove };
      }
      if (typeof legacy.targetPrice === 'number') {
        return { operator: 'equals', threshold: legacy.targetPrice };
      }
      if (typeof legacy.changePercent === 'number') {
        return {
          operator: 'changes_by',
          threshold: 0,
          percentage: legacy.changePercent,
        };
      }
    }

    throw new AppError(
      'Alert condition is required. Provide condition { operator, threshold } or legacy priceAbove/priceBelow/targetPrice',
      400
    );
  }

  private normalizeNotificationChannels(channels: unknown): string[] {
    const defaults = ['in_app'];
    if (!Array.isArray(channels) || !channels.length) {
      return defaults;
    }

    const mapped = channels
      .filter((channel): channel is string => typeof channel === 'string')
      .map((channel) => {
        if (channel === 'inApp') return 'in_app';
        return channel;
      })
      .filter((channel) => ['email', 'sms', 'push', 'in_app'].includes(channel));

    return mapped.length ? mapped : defaults;
  }

  private parseBooleanQuery(value: unknown): boolean | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    const normalized = String(value).toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return undefined;
  }

  /**
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

      sendSuccess(res, { insight });
    } catch (error) {
      next(error);
    }
  }

  /**
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
        parseInt(quantity as string, 10),
        (quality as string) || 'standard',
        region as string,
        undefined
      );

      sendSuccess(res, { recommendation });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/market-intelligence/alerts
   */
  async createPriceAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Authentication required', 401);
      }

      const { product, region, district, condition, conditions, notificationChannels, active, isActive, alertType, frequency } = req.body;

      if (!product) {
        throw new AppError('Product is required', 400);
      }

      const normalizedCondition = this.normalizeAlertCondition(condition ?? conditions);
      const normalizedChannels = this.normalizeNotificationChannels(notificationChannels);
      const normalizedActive = typeof active === 'boolean'
        ? active
        : (typeof isActive === 'boolean' ? isActive : true);

      const alert = await PriceAlert.create({
        user: userId,
        product,
        region,
        district,
        alertType: alertType || 'target_price',
        condition: normalizedCondition,
        notificationChannels: normalizedChannels,
        frequency: frequency || 'instant',
        active: normalizedActive,
      });

      sendSuccess(res, alert, 'Price alert created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/market-intelligence/alerts
   */
  async getUserAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Authentication required', 401);
      }

      const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 100);
      const skip = (page - 1) * limit;

      const activeFilter = this.parseBooleanQuery(req.query.active);
      const status = req.query.status ? String(req.query.status).toLowerCase() : undefined;

      const query: Record<string, unknown> = { user: userId };

      // status takes precedence over active when both are provided
      if (status) {
        if (status === 'active') query.active = true;
        if (status === 'inactive') query.active = false;
      } else if (activeFilter !== undefined) {
        query.active = activeFilter;
      }

      if (req.query.region) query.region = String(req.query.region);
      if (req.query.district) query.district = String(req.query.district);
      if (req.query.product) query.product = String(req.query.product);

      const [alerts, total] = await Promise.all([
        PriceAlert.find(query)
          .populate('product', 'name category variety')
          .sort('-createdAt')
          .skip(skip)
          .limit(limit),
        PriceAlert.countDocuments(query),
      ]);

      ResponseHandler.paginated(
        res,
        alerts,
        {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        'Price alerts retrieved'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/market-intelligence/alerts/:alertId
   */
  async updatePriceAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const { alertId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('Authentication required', 401);
      }

      const alert = await PriceAlert.findOne({
        _id: alertId,
        user: userId,
      });

      if (!alert) {
        throw new AppError('Price alert not found', 404);
      }

      const updatePayload: Record<string, unknown> = { ...req.body };

      if (req.body.condition !== undefined || req.body.conditions !== undefined) {
        updatePayload.condition = this.normalizeAlertCondition(
          req.body.condition ?? req.body.conditions
        );
      }

      if (req.body.notificationChannels !== undefined) {
        updatePayload.notificationChannels = this.normalizeNotificationChannels(
          req.body.notificationChannels
        );
      }

      if (typeof req.body.isActive === 'boolean' && req.body.active === undefined) {
        updatePayload.active = req.body.isActive;
      }

      delete updatePayload.conditions;
      delete updatePayload.isActive;

      const updatedAlert = await PriceAlert.findByIdAndUpdate(
        alertId,
        { $set: updatePayload },
        { new: true, runValidators: true }
      ).populate('product', 'name category variety');

      sendSuccess(res, updatedAlert, 'Price alert updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/market-intelligence/alerts/:alertId
   */
  async deletePriceAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const { alertId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('Authentication required', 401);
      }

      const alert = await PriceAlert.findOneAndDelete({
        _id: alertId,
        user: userId,
      });

      if (!alert) {
        throw new AppError('Price alert not found', 404);
      }

      sendSuccess(res, null, 'Price alert deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/market-intelligence/alerts/check
   */
  async checkPriceAlerts(_req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(
        res,
        { status: 'scheduled' },
        'Price alert check scheduled. Insights will be regenerated in background.'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
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

      sendSuccess(res, {
        product: productId,
        comparisons,
        analysisDate: new Date(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/market-intelligence/trends
   */
  async getMarketTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, period = '30' } = req.query;

      if (!productId) {
        throw new AppError('Product ID is required', 400);
      }

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(period as string, 10));

      const trends = await MarketInsight.find({
        product: productId,
        'period.start': { $gte: daysAgo },
      })
        .sort('period.start')
        .select('period priceStatistics supplyMetrics prediction');

      sendSuccess(res, {
        trends,
        period: `Last ${period} days`,
        dataPoints: trends.length,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const marketIntelligenceController = new MarketIntelligenceController();
