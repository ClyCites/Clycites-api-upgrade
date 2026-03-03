import { Request, Response, NextFunction } from 'express';
import PriceService from './price.service';
import { ResponseHandler } from '../../common/utils/response';
import { AuthRequest } from '../../common/middleware/auth';
import { AppError, ForbiddenError } from '../../common/errors/AppError';
import { isSuperAdminRole } from '../../common/middleware/superAdmin';
import PricePrediction, { PricePredictionStatus } from './pricePrediction.model';

type AnyRecord = Record<string, unknown>;
type MarketPriceStatus = 'captured' | 'validated' | 'published';

const MARKET_PRICE_STATUSES: MarketPriceStatus[] = ['captured', 'validated', 'published'];

const PRICE_PREDICTION_STATUS_TRANSITIONS: Record<PricePredictionStatus, PricePredictionStatus[]> = {
  generated: ['generated', 'compared', 'archived'],
  compared: ['compared', 'archived'],
  archived: ['archived'],
};

const normalizeMarketPriceStatus = (value: unknown): MarketPriceStatus | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  return MARKET_PRICE_STATUSES.includes(normalized as MarketPriceStatus)
    ? normalized as MarketPriceStatus
    : undefined;
};

const toPositiveInt = (value: unknown, fallback: number, max?: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  if (typeof max === 'number') return Math.min(parsed, max);
  return parsed;
};

const toPlainObject = <T>(value: T): T => {
  if (value && typeof (value as { toObject?: () => unknown }).toObject === 'function') {
    return (value as unknown as { toObject: () => T }).toObject();
  }
  return value;
};

const toOrgId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const deriveMarketPriceStatus = (entity: AnyRecord): MarketPriceStatus => {
  const explicitStatus = normalizeMarketPriceStatus(entity.status);
  if (explicitStatus) return explicitStatus;
  return entity.isValid === false ? 'captured' : 'validated';
};

const withMarketPriceStatus = <T extends AnyRecord>(entity: T): T & {
  status: MarketPriceStatus;
  uiStatus: MarketPriceStatus;
} => {
  const plain = toPlainObject(entity);
  const status = deriveMarketPriceStatus(plain);
  return {
    ...plain,
    status,
    uiStatus: status,
  };
};

const withPredictionUiStatus = <T extends AnyRecord>(entity: T): T & { uiStatus: unknown } => {
  const plain = toPlainObject(entity);
  return {
    ...plain,
    uiStatus: plain.status,
  };
};

export class PriceController {
  private priceService: PriceService;

  constructor() {
    this.priceService = new PriceService();
  }

  private getUserId(req: Request): string {
    const userId = req.user?.id;
    if (!userId || typeof userId !== 'string') {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }
    return userId;
  }

  private isPrivileged(role?: string): boolean {
    return role === 'admin' || role === 'platform_admin' || role === 'trader' || isSuperAdminRole(role);
  }

  private resolveOrgId(req: Request): string | undefined {
    const fromQuery = toOrgId(req.query.organizationId);
    const fromHeader = toOrgId(req.headers['x-organization-id']);
    const fromBody = typeof req.body === 'object' && req.body
      ? toOrgId((req.body as AnyRecord).organizationId)
      : undefined;
    const requested = fromQuery || fromBody || fromHeader;
    const actorOrg = toOrgId(req.user?.orgId);

    if (isSuperAdminRole(req.user?.role)) {
      return requested || actorOrg;
    }

    if (actorOrg) {
      if (requested && requested !== actorOrg) {
        throw new ForbiddenError('Cannot access price resources outside your organization context');
      }
      return actorOrg;
    }

    return requested;
  }

  private assertAccess(req: Request, ownerId: string, organizationId?: string): void {
    if (isSuperAdminRole(req.user?.role)) return;

    const actorId = this.getUserId(req);
    const actorOrg = toOrgId(req.user?.orgId);

    if (this.isPrivileged(req.user?.role)) {
      if (organizationId && actorOrg && organizationId !== actorOrg) {
        throw new ForbiddenError('Cannot access price resources outside your organization context');
      }
      return;
    }

    if (ownerId !== actorId) {
      throw new ForbiddenError('You can only access your own price resources');
    }

    if (organizationId && actorOrg && organizationId !== actorOrg) {
      throw new ForbiddenError('Cannot access price resources outside your organization context');
    }
  }

  private assertPredictionStatusTransition(currentStatus: PricePredictionStatus, nextStatus: PricePredictionStatus): void {
    if (!(PRICE_PREDICTION_STATUS_TRANSITIONS[currentStatus] || []).includes(nextStatus)) {
      throw new AppError(`Invalid prediction status transition: ${currentStatus} -> ${nextStatus}`, 400, 'BAD_REQUEST');
    }
  }

  addPrice = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.addPrice(req.body, {
        id: req.user?.id,
        role: req.user?.role,
        orgId: req.user?.orgId,
      });
      const payload = {
        ...result,
        price: result && typeof result === 'object' && 'price' in result && result.price
          ? withMarketPriceStatus(result.price as unknown as AnyRecord)
          : result,
      };
      ResponseHandler.created(res, payload, result.message || 'Price added successfully');
    } catch (error) {
      next(error);
    }
  };

  getPrices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.getPrices(req.query);
      const prices = Array.isArray(result)
        ? result.map((item) => withMarketPriceStatus(item as unknown as AnyRecord))
        : [];
      const page = toPositiveInt(req.query.page, 1, 10000);
      const requestedLimit = toPositiveInt(req.query.limit, prices.length || 20, 1000);
      ResponseHandler.success(
        res,
        prices,
        'Prices retrieved successfully',
        200,
        {
          pagination: {
            page,
            limit: requestedLimit,
            total: prices.length,
            totalPages: 1,
          },
        }
      );
    } catch (error) {
      next(error);
    }
  };

  getPriceById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.getPriceById(req.params.id);
      ResponseHandler.success(res, withMarketPriceStatus(result as unknown as AnyRecord), 'Price retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  updatePrice = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.priceService.updatePrice(req.params.id, req.body, {
        id: req.user?.id,
        role: req.user?.role,
        orgId: req.user?.orgId,
      });
      const payload = {
        ...result,
        price: result && typeof result === 'object' && 'price' in result && result.price
          ? withMarketPriceStatus(result.price as unknown as AnyRecord)
          : result,
      };
      ResponseHandler.success(res, payload, 'Price updated successfully');
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

  createPrediction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = this.getUserId(req);
      const organizationId = this.resolveOrgId(req);
      const status = (req.body.status as PricePredictionStatus | undefined) || 'generated';

      if (!['generated', 'compared', 'archived'].includes(status)) {
        throw new AppError('status must be one of generated, compared, archived', 400, 'BAD_REQUEST');
      }

      const prediction = await PricePrediction.create({
        organization: organizationId,
        createdBy: actorId,
        productId: req.body.productId,
        marketId: req.body.marketId,
        horizonDays: req.body.horizonDays !== undefined ? Number(req.body.horizonDays) : 7,
        predictedPrice: Number(req.body.predictedPrice),
        currency: req.body.currency || 'UGX',
        lowerBound: req.body.lowerBound !== undefined ? Number(req.body.lowerBound) : undefined,
        upperBound: req.body.upperBound !== undefined ? Number(req.body.upperBound) : undefined,
        confidence: req.body.confidence !== undefined ? Number(req.body.confidence) : undefined,
        modelVersion: req.body.modelVersion,
        status,
        generatedAt: req.body.generatedAt ? new Date(req.body.generatedAt) : new Date(),
        notes: req.body.notes,
        metadata: req.body.metadata || {},
        isActive: true,
      });

      ResponseHandler.created(res, withPredictionUiStatus(prediction as unknown as AnyRecord), 'Price prediction created');
    } catch (error) {
      next(error);
    }
  };

  listPredictions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = toPositiveInt(req.query.page, 1, 10000);
      const limit = toPositiveInt(req.query.limit, 20, 100);
      const skip = (page - 1) * limit;
      const organizationId = this.resolveOrgId(req);
      const filter: Record<string, unknown> = { isActive: true };

      if (organizationId) filter.organization = organizationId;
      if (typeof req.query.status === 'string') filter.status = req.query.status;
      if (typeof req.query.productId === 'string') filter.productId = req.query.productId;
      if (typeof req.query.marketId === 'string') filter.marketId = req.query.marketId;

      if (!this.isPrivileged(req.user?.role) && !isSuperAdminRole(req.user?.role)) {
        filter.createdBy = this.getUserId(req);
      }

      const [rows, total] = await Promise.all([
        PricePrediction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        PricePrediction.countDocuments(filter),
      ]);

      ResponseHandler.success(
        res,
        rows.map((item) => withPredictionUiStatus(item as unknown as AnyRecord)),
        'Price predictions retrieved',
        200,
        {
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
          },
        }
      );
    } catch (error) {
      next(error);
    }
  };

  getPrediction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prediction = await PricePrediction.findOne({ _id: req.params.predictionId, isActive: true });
      if (!prediction) {
        throw new AppError('Price prediction not found', 404, 'NOT_FOUND');
      }

      this.assertAccess(req, prediction.createdBy.toString(), prediction.organization?.toString());
      ResponseHandler.success(res, withPredictionUiStatus(prediction as unknown as AnyRecord), 'Price prediction retrieved');
    } catch (error) {
      next(error);
    }
  };

  updatePrediction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prediction = await PricePrediction.findOne({ _id: req.params.predictionId, isActive: true });
      if (!prediction) {
        throw new AppError('Price prediction not found', 404, 'NOT_FOUND');
      }

      this.assertAccess(req, prediction.createdBy.toString(), prediction.organization?.toString());

      if (typeof req.body.status === 'string') {
        const nextStatus = req.body.status as PricePredictionStatus;
        if (!['generated', 'compared', 'archived'].includes(nextStatus)) {
          throw new AppError('status must be one of generated, compared, archived', 400, 'BAD_REQUEST');
        }
        this.assertPredictionStatusTransition(prediction.status, nextStatus);
        prediction.status = nextStatus;
        if (nextStatus === 'compared') prediction.comparedAt = new Date();
        if (nextStatus === 'archived') prediction.archivedAt = new Date();
      }

      if (req.body.horizonDays !== undefined) prediction.horizonDays = Number(req.body.horizonDays);
      if (req.body.predictedPrice !== undefined) prediction.predictedPrice = Number(req.body.predictedPrice);
      if (req.body.currency !== undefined) prediction.currency = req.body.currency;
      if (req.body.lowerBound !== undefined) prediction.lowerBound = Number(req.body.lowerBound);
      if (req.body.upperBound !== undefined) prediction.upperBound = Number(req.body.upperBound);
      if (req.body.confidence !== undefined) prediction.confidence = Number(req.body.confidence);
      if (req.body.modelVersion !== undefined) prediction.modelVersion = req.body.modelVersion;
      if (req.body.notes !== undefined) prediction.notes = req.body.notes;
      if (req.body.metadata !== undefined) prediction.metadata = req.body.metadata;

      await prediction.save();
      ResponseHandler.success(res, withPredictionUiStatus(prediction as unknown as AnyRecord), 'Price prediction updated');
    } catch (error) {
      next(error);
    }
  };

  deletePrediction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prediction = await PricePrediction.findOne({ _id: req.params.predictionId, isActive: true });
      if (!prediction) {
        throw new AppError('Price prediction not found', 404, 'NOT_FOUND');
      }

      this.assertAccess(req, prediction.createdBy.toString(), prediction.organization?.toString());
      prediction.isActive = false;
      prediction.status = 'archived';
      prediction.archivedAt = prediction.archivedAt || new Date();
      await prediction.save();

      ResponseHandler.success(res, null, 'Price prediction deleted');
    } catch (error) {
      next(error);
    }
  };

  regeneratePrediction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prediction = await PricePrediction.findOne({ _id: req.params.predictionId, isActive: true });
      if (!prediction) {
        throw new AppError('Price prediction not found', 404, 'NOT_FOUND');
      }

      this.assertAccess(req, prediction.createdBy.toString(), prediction.organization?.toString());

      prediction.status = 'generated';
      prediction.generatedAt = new Date();
      prediction.comparedAt = undefined;
      prediction.archivedAt = undefined;
      if (req.body.predictedPrice !== undefined) prediction.predictedPrice = Number(req.body.predictedPrice);
      if (req.body.lowerBound !== undefined) prediction.lowerBound = Number(req.body.lowerBound);
      if (req.body.upperBound !== undefined) prediction.upperBound = Number(req.body.upperBound);
      if (req.body.confidence !== undefined) prediction.confidence = Number(req.body.confidence);
      if (req.body.modelVersion !== undefined) prediction.modelVersion = req.body.modelVersion;
      if (req.body.notes !== undefined) prediction.notes = req.body.notes;
      if (req.body.metadata !== undefined) prediction.metadata = req.body.metadata;

      await prediction.save();
      ResponseHandler.success(res, withPredictionUiStatus(prediction as unknown as AnyRecord), 'Price prediction regenerated');
    } catch (error) {
      next(error);
    }
  };
}

export default new PriceController();
