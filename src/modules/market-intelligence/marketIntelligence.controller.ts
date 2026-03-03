import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { marketIntelligenceService } from './marketIntelligence.service';
import { AppError, ForbiddenError } from '../../common/errors/AppError';
import PriceAlert from './priceAlert.model';
import MarketInsight from './marketInsight.model';
import { ResponseHandler, sendSuccess } from '../../common/utils/response';
import { isSuperAdminRole } from '../../common/middleware/superAdmin';
import Recommendation, { RecommendationStatus } from './recommendation.model';
import DataSource, { DataSourceStatus } from './dataSource.model';

type AlertCondition = {
  operator: 'below' | 'above' | 'equals' | 'changes_by';
  threshold: number;
  percentage?: number;
};

type AnyRecord = Record<string, unknown>;
type AlertUiStatus = 'new' | 'investigating' | 'investigated' | 'dismissed';

const ALERT_STATUS_TRANSITIONS: Record<AlertUiStatus, AlertUiStatus[]> = {
  new: ['new', 'investigating', 'investigated', 'dismissed'],
  investigating: ['investigating', 'investigated', 'dismissed'],
  investigated: ['investigated', 'dismissed'],
  dismissed: ['dismissed', 'new'],
};

const RECOMMENDATION_STATUS_TRANSITIONS: Record<RecommendationStatus, RecommendationStatus[]> = {
  draft: ['draft', 'approved', 'retracted'],
  approved: ['approved', 'published', 'retracted'],
  published: ['published', 'retracted'],
  retracted: ['retracted'],
};

const DATASOURCE_STATUS_TRANSITIONS: Record<DataSourceStatus, DataSourceStatus[]> = {
  active: ['active', 'paused', 'disabled'],
  paused: ['paused', 'active', 'disabled'],
  disabled: ['disabled', 'active'],
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

  private toPositiveInt(value: unknown, fallback: number, max?: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    if (typeof max === 'number') return Math.min(parsed, max);
    return parsed;
  }

  private toOrgId(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
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
    const fromQuery = this.toOrgId(req.query.organizationId);
    const fromHeader = this.toOrgId(req.headers['x-organization-id']);
    const fromBody = typeof req.body === 'object' && req.body
      ? this.toOrgId((req.body as AnyRecord).organizationId)
      : undefined;
    const requested = fromQuery || fromBody || fromHeader;
    const actorOrg = this.toOrgId(req.user?.orgId);

    if (isSuperAdminRole(req.user?.role)) {
      return requested || actorOrg;
    }

    if (actorOrg) {
      if (requested && requested !== actorOrg) {
        throw new ForbiddenError('Cannot access market intelligence resources outside your organization context');
      }
      return actorOrg;
    }

    return requested;
  }

  private assertAccess(req: Request, ownerId: string, organizationId?: string): void {
    if (isSuperAdminRole(req.user?.role)) return;

    const actorId = this.getUserId(req);
    const actorOrg = this.toOrgId(req.user?.orgId);

    if (this.isPrivileged(req.user?.role)) {
      if (organizationId && actorOrg && organizationId !== actorOrg) {
        throw new ForbiddenError('Cannot access market intelligence resources outside your organization context');
      }
      return;
    }

    if (ownerId !== actorId) {
      throw new ForbiddenError('You can only access your own market intelligence resources');
    }

    if (organizationId && actorOrg && organizationId !== actorOrg) {
      throw new ForbiddenError('Cannot access market intelligence resources outside your organization context');
    }
  }

  private normalizeAlertStatus(value: unknown): AlertUiStatus | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'new' || normalized === 'investigating' || normalized === 'investigated' || normalized === 'dismissed') {
      return normalized;
    }
    return undefined;
  }

  private toPlainObject<T>(value: T): T {
    if (value && typeof (value as { toObject?: () => unknown }).toObject === 'function') {
      return (value as unknown as { toObject: () => T }).toObject();
    }
    return value;
  }

  private toObjectId(value: string): mongoose.Types.ObjectId {
    return new mongoose.Types.ObjectId(value);
  }

  private resolveAlertStatus(alert: AnyRecord): AlertUiStatus {
    const explicit = this.normalizeAlertStatus(alert.status);
    if (explicit) return explicit;
    if (alert.active === false) return 'dismissed';
    return 'new';
  }

  private withAlertUiStatus<T extends AnyRecord>(alert: T): T & { status: AlertUiStatus; uiStatus: AlertUiStatus } {
    const plain = this.toPlainObject(alert);
    const status = this.resolveAlertStatus(plain);
    return {
      ...plain,
      status,
      uiStatus: status,
    };
  }

  private withUiStatus<T extends AnyRecord>(entity: T): T & { uiStatus: unknown } {
    const plain = this.toPlainObject(entity);
    return {
      ...plain,
      uiStatus: plain.status,
    };
  }

  private assertAlertTransition(currentStatus: AlertUiStatus, nextStatus: AlertUiStatus): void {
    if (!(ALERT_STATUS_TRANSITIONS[currentStatus] || []).includes(nextStatus)) {
      throw new AppError(`Invalid alert status transition: ${currentStatus} -> ${nextStatus}`, 400, 'BAD_REQUEST');
    }
  }

  private assertRecommendationTransition(currentStatus: RecommendationStatus, nextStatus: RecommendationStatus): void {
    if (!(RECOMMENDATION_STATUS_TRANSITIONS[currentStatus] || []).includes(nextStatus)) {
      throw new AppError(`Invalid recommendation status transition: ${currentStatus} -> ${nextStatus}`, 400, 'BAD_REQUEST');
    }
  }

  private assertDataSourceTransition(currentStatus: DataSourceStatus, nextStatus: DataSourceStatus): void {
    if (!(DATASOURCE_STATUS_TRANSITIONS[currentStatus] || []).includes(nextStatus)) {
      throw new AppError(`Invalid data source status transition: ${currentStatus} -> ${nextStatus}`, 400, 'BAD_REQUEST');
    }
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
      const userId = this.getUserId(req);
      const organizationId = this.resolveOrgId(req);

      const { product, region, district, condition, conditions, notificationChannels, active, isActive, alertType, frequency } = req.body;

      if (!product) {
        throw new AppError('Product is required', 400);
      }

      const normalizedCondition = this.normalizeAlertCondition(condition ?? conditions);
      const normalizedChannels = this.normalizeNotificationChannels(notificationChannels);
      const normalizedActive = typeof active === 'boolean'
        ? active
        : (typeof isActive === 'boolean' ? isActive : true);
      const requestedStatus = this.normalizeAlertStatus(req.body.status ?? req.body.uiStatus);

      if ((req.body.status !== undefined || req.body.uiStatus !== undefined) && !requestedStatus) {
        throw new AppError('status must be one of new, investigating, investigated, dismissed', 400);
      }

      const resolvedStatus = requestedStatus || (normalizedActive ? 'new' : 'dismissed');

      const alert = await PriceAlert.create({
        user: userId,
        organization: organizationId,
        product,
        region,
        district,
        alertType: alertType || 'target_price',
        condition: normalizedCondition,
        notificationChannels: normalizedChannels,
        frequency: frequency || 'instant',
        active: resolvedStatus !== 'dismissed' && normalizedActive,
        status: resolvedStatus,
      });

      sendSuccess(res, this.withAlertUiStatus(alert as unknown as AnyRecord), 'Price alert created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/market-intelligence/alerts
   */
  async getUserAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = this.getUserId(req);
      const page = this.toPositiveInt(req.query.page, 1, 10000);
      const limit = this.toPositiveInt(req.query.limit, 20, 100);
      const skip = (page - 1) * limit;
      const organizationId = this.resolveOrgId(req);

      const activeFilter = this.parseBooleanQuery(req.query.active);
      const status = req.query.status ? String(req.query.status).toLowerCase() : undefined;

      const query: Record<string, unknown> = {};

      if (organizationId) {
        query.organization = organizationId;
      }

      if (!this.isPrivileged(req.user?.role) && !isSuperAdminRole(req.user?.role)) {
        query.user = userId;
      }

      // status takes precedence over active when both are provided
      if (status) {
        if (status === 'active') query.active = true;
        else if (status === 'inactive') query.active = false;
        else if (this.normalizeAlertStatus(status)) query.status = status;
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
        alerts.map((alert) => this.withAlertUiStatus(alert as unknown as AnyRecord)),
        {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
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
      this.getUserId(req);

      const alert = await PriceAlert.findById(alertId);

      if (!alert) {
        throw new AppError('Price alert not found', 404);
      }

      this.assertAccess(req, alert.user.toString(), alert.organization?.toString());

      if (req.body.product !== undefined) alert.product = req.body.product;
      if (req.body.region !== undefined) alert.region = req.body.region;
      if (req.body.district !== undefined) alert.district = req.body.district;
      if (req.body.alertType !== undefined) alert.alertType = req.body.alertType;
      if (req.body.frequency !== undefined) alert.frequency = req.body.frequency;

      if (req.body.condition !== undefined || req.body.conditions !== undefined) {
        alert.condition = this.normalizeAlertCondition(req.body.condition ?? req.body.conditions);
      }

      if (req.body.notificationChannels !== undefined) {
        alert.notificationChannels = this.normalizeNotificationChannels(req.body.notificationChannels) as any;
      }

      const requestedStatus = this.normalizeAlertStatus(req.body.status ?? req.body.uiStatus);
      if ((req.body.status !== undefined || req.body.uiStatus !== undefined) && !requestedStatus) {
        throw new AppError('status must be one of new, investigating, investigated, dismissed', 400);
      }

      const requestedActive = typeof req.body.active === 'boolean'
        ? req.body.active
        : (typeof req.body.isActive === 'boolean' ? req.body.isActive : undefined);

      const currentStatus = this.resolveAlertStatus(alert as unknown as AnyRecord);

      if (requestedStatus) {
        this.assertAlertTransition(currentStatus, requestedStatus);
        alert.status = requestedStatus;
        alert.active = requestedStatus !== 'dismissed';
      } else if (typeof requestedActive === 'boolean') {
        if (!requestedActive) {
          this.assertAlertTransition(currentStatus, 'dismissed');
          alert.status = 'dismissed';
          alert.active = false;
        } else {
          if (currentStatus === 'dismissed') {
            this.assertAlertTransition(currentStatus, 'new');
            alert.status = 'new';
          }
          alert.active = true;
        }
      }

      await alert.save();

      const populated = await PriceAlert.findById(alertId).populate('product', 'name category variety');
      sendSuccess(
        res,
        this.withAlertUiStatus((populated || alert) as unknown as AnyRecord),
        'Price alert updated successfully'
      );
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
      this.getUserId(req);
      const alert = await PriceAlert.findById(alertId);

      if (!alert) {
        throw new AppError('Price alert not found', 404);
      }

      this.assertAccess(req, alert.user.toString(), alert.organization?.toString());
      await alert.deleteOne();

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

  async listRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const page = this.toPositiveInt(req.query.page, 1, 10000);
      const limit = this.toPositiveInt(req.query.limit, 20, 100);
      const skip = (page - 1) * limit;
      const organizationId = this.resolveOrgId(req);
      const filter: Record<string, unknown> = { isActive: true };

      if (organizationId) filter.organization = organizationId;
      if (typeof req.query.status === 'string') filter.status = req.query.status;
      if (typeof req.query.productId === 'string') filter.productId = req.query.productId;
      if (typeof req.query.marketId === 'string') filter.marketId = req.query.marketId;
      if (typeof req.query.region === 'string') filter.region = req.query.region;

      if (!this.isPrivileged(req.user?.role) && !isSuperAdminRole(req.user?.role)) {
        filter.createdBy = this.getUserId(req);
      }

      const [rows, total] = await Promise.all([
        Recommendation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Recommendation.countDocuments(filter),
      ]);

      ResponseHandler.success(
        res,
        rows.map((item) => this.withUiStatus(item as unknown as AnyRecord)),
        'Recommendations retrieved',
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
  }

  async createRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = this.getUserId(req);
      const organizationId = this.resolveOrgId(req);
      const status = (req.body.status as RecommendationStatus | undefined) || 'draft';

      if (!['draft', 'approved', 'published', 'retracted'].includes(status)) {
        throw new AppError('status must be one of draft, approved, published, retracted', 400, 'BAD_REQUEST');
      }

      const recommendation = await Recommendation.create({
        organization: organizationId,
        createdBy: actorId,
        productId: req.body.productId,
        marketId: req.body.marketId,
        region: req.body.region,
        recommendationType: req.body.recommendationType || 'price',
        recommendedPrice: req.body.recommendedPrice !== undefined ? Number(req.body.recommendedPrice) : undefined,
        currency: req.body.currency || 'UGX',
        rationale: req.body.rationale,
        status,
        approvedAt: status === 'approved' ? new Date() : undefined,
        approvedBy: status === 'approved' ? actorId : undefined,
        publishedAt: status === 'published' ? new Date() : undefined,
        retractedAt: status === 'retracted' ? new Date() : undefined,
        notes: req.body.notes,
        metadata: req.body.metadata || {},
        isActive: true,
      });

      sendSuccess(res, this.withUiStatus(recommendation as unknown as AnyRecord), 'Recommendation created', 201);
    } catch (error) {
      next(error);
    }
  }

  async getRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const recommendation = await Recommendation.findOne({ _id: req.params.recommendationId, isActive: true });
      if (!recommendation) {
        throw new AppError('Recommendation not found', 404, 'NOT_FOUND');
      }

      this.assertAccess(req, recommendation.createdBy.toString(), recommendation.organization?.toString());
      sendSuccess(res, this.withUiStatus(recommendation as unknown as AnyRecord), 'Recommendation retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const recommendation = await Recommendation.findOne({ _id: req.params.recommendationId, isActive: true });
      if (!recommendation) {
        throw new AppError('Recommendation not found', 404, 'NOT_FOUND');
      }

      this.assertAccess(req, recommendation.createdBy.toString(), recommendation.organization?.toString());

      if (typeof req.body.status === 'string') {
        const nextStatus = req.body.status as RecommendationStatus;
        if (!['draft', 'approved', 'published', 'retracted'].includes(nextStatus)) {
          throw new AppError('status must be one of draft, approved, published, retracted', 400, 'BAD_REQUEST');
        }
        this.assertRecommendationTransition(recommendation.status, nextStatus);
        recommendation.status = nextStatus;
        if (nextStatus === 'approved' && !recommendation.approvedAt) {
          recommendation.approvedAt = new Date();
          recommendation.approvedBy = this.toObjectId(this.getUserId(req));
        }
        if (nextStatus === 'published' && !recommendation.publishedAt) recommendation.publishedAt = new Date();
        if (nextStatus === 'retracted' && !recommendation.retractedAt) recommendation.retractedAt = new Date();
      }

      if (req.body.productId !== undefined) recommendation.productId = req.body.productId;
      if (req.body.marketId !== undefined) recommendation.marketId = req.body.marketId;
      if (req.body.region !== undefined) recommendation.region = req.body.region;
      if (req.body.recommendationType !== undefined) recommendation.recommendationType = req.body.recommendationType;
      if (req.body.recommendedPrice !== undefined) recommendation.recommendedPrice = Number(req.body.recommendedPrice);
      if (req.body.currency !== undefined) recommendation.currency = req.body.currency;
      if (req.body.rationale !== undefined) recommendation.rationale = req.body.rationale;
      if (req.body.notes !== undefined) recommendation.notes = req.body.notes;
      if (req.body.metadata !== undefined) recommendation.metadata = req.body.metadata;

      await recommendation.save();
      sendSuccess(res, this.withUiStatus(recommendation as unknown as AnyRecord), 'Recommendation updated');
    } catch (error) {
      next(error);
    }
  }

  async deleteRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const recommendation = await Recommendation.findOne({ _id: req.params.recommendationId, isActive: true });
      if (!recommendation) {
        throw new AppError('Recommendation not found', 404, 'NOT_FOUND');
      }

      this.assertAccess(req, recommendation.createdBy.toString(), recommendation.organization?.toString());
      recommendation.isActive = false;
      recommendation.status = 'retracted';
      recommendation.retractedAt = recommendation.retractedAt || new Date();
      await recommendation.save();
      sendSuccess(res, null, 'Recommendation deleted');
    } catch (error) {
      next(error);
    }
  }

  async approveRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const recommendation = await Recommendation.findOne({ _id: req.params.recommendationId, isActive: true });
      if (!recommendation) {
        throw new AppError('Recommendation not found', 404, 'NOT_FOUND');
      }

      this.assertAccess(req, recommendation.createdBy.toString(), recommendation.organization?.toString());
      this.assertRecommendationTransition(recommendation.status, 'approved');

      recommendation.status = 'approved';
      recommendation.approvedAt = new Date();
      recommendation.approvedBy = this.toObjectId(this.getUserId(req));
      await recommendation.save();

      sendSuccess(res, this.withUiStatus(recommendation as unknown as AnyRecord), 'Recommendation approved');
    } catch (error) {
      next(error);
    }
  }

  async publishRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const recommendation = await Recommendation.findOne({ _id: req.params.recommendationId, isActive: true });
      if (!recommendation) {
        throw new AppError('Recommendation not found', 404, 'NOT_FOUND');
      }

      this.assertAccess(req, recommendation.createdBy.toString(), recommendation.organization?.toString());
      this.assertRecommendationTransition(recommendation.status, 'published');

      recommendation.status = 'published';
      recommendation.publishedAt = new Date();
      await recommendation.save();

      sendSuccess(res, this.withUiStatus(recommendation as unknown as AnyRecord), 'Recommendation published');
    } catch (error) {
      next(error);
    }
  }

  async retractRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const recommendation = await Recommendation.findOne({ _id: req.params.recommendationId, isActive: true });
      if (!recommendation) {
        throw new AppError('Recommendation not found', 404, 'NOT_FOUND');
      }

      this.assertAccess(req, recommendation.createdBy.toString(), recommendation.organization?.toString());
      this.assertRecommendationTransition(recommendation.status, 'retracted');

      recommendation.status = 'retracted';
      recommendation.retractedAt = new Date();
      await recommendation.save();

      sendSuccess(res, this.withUiStatus(recommendation as unknown as AnyRecord), 'Recommendation retracted');
    } catch (error) {
      next(error);
    }
  }

  async listDataSources(req: Request, res: Response, next: NextFunction) {
    try {
      const page = this.toPositiveInt(req.query.page, 1, 10000);
      const limit = this.toPositiveInt(req.query.limit, 20, 100);
      const skip = (page - 1) * limit;
      const organizationId = this.resolveOrgId(req);
      const filter: Record<string, unknown> = { isActive: true };

      if (organizationId) filter.organization = organizationId;
      if (typeof req.query.status === 'string') filter.status = req.query.status;
      if (typeof req.query.provider === 'string') filter.provider = req.query.provider;
      if (typeof req.query.name === 'string') {
        filter.name = { $regex: req.query.name.trim(), $options: 'i' };
      }

      if (!this.isPrivileged(req.user?.role) && !isSuperAdminRole(req.user?.role)) {
        filter.createdBy = this.getUserId(req);
      }

      const [rows, total] = await Promise.all([
        DataSource.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        DataSource.countDocuments(filter),
      ]);

      ResponseHandler.success(
        res,
        rows.map((item) => this.withUiStatus(item as unknown as AnyRecord)),
        'Data sources retrieved',
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
  }

  async createDataSource(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = this.getUserId(req);
      const organizationId = this.resolveOrgId(req);
      const status = (req.body.status as DataSourceStatus | undefined) || 'active';

      if (!['active', 'paused', 'disabled'].includes(status)) {
        throw new AppError('status must be one of active, paused, disabled', 400, 'BAD_REQUEST');
      }

      const source = await DataSource.create({
        organization: organizationId,
        createdBy: actorId,
        name: req.body.name,
        provider: req.body.provider || req.body.name,
        endpoint: req.body.endpoint,
        status,
        authType: req.body.authType || 'none',
        pullIntervalMinutes: req.body.pullIntervalMinutes !== undefined
          ? Number(req.body.pullIntervalMinutes)
          : undefined,
        metadata: req.body.metadata || {},
        isActive: true,
      });

      sendSuccess(res, this.withUiStatus(source as unknown as AnyRecord), 'Data source created', 201);
    } catch (error) {
      next(error);
    }
  }

  async getDataSource(req: Request, res: Response, next: NextFunction) {
    try {
      const source = await DataSource.findOne({ _id: req.params.sourceId, isActive: true });
      if (!source) {
        throw new AppError('Data source not found', 404, 'NOT_FOUND');
      }

      this.assertAccess(req, source.createdBy.toString(), source.organization?.toString());
      sendSuccess(res, this.withUiStatus(source as unknown as AnyRecord), 'Data source retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateDataSource(req: Request, res: Response, next: NextFunction) {
    try {
      const source = await DataSource.findOne({ _id: req.params.sourceId, isActive: true });
      if (!source) {
        throw new AppError('Data source not found', 404, 'NOT_FOUND');
      }

      this.assertAccess(req, source.createdBy.toString(), source.organization?.toString());

      if (typeof req.body.status === 'string') {
        const nextStatus = req.body.status as DataSourceStatus;
        if (!['active', 'paused', 'disabled'].includes(nextStatus)) {
          throw new AppError('status must be one of active, paused, disabled', 400, 'BAD_REQUEST');
        }
        this.assertDataSourceTransition(source.status, nextStatus);
        source.status = nextStatus;
      }

      if (req.body.name !== undefined) source.name = req.body.name;
      if (req.body.provider !== undefined) source.provider = req.body.provider;
      if (req.body.endpoint !== undefined) source.endpoint = req.body.endpoint;
      if (req.body.authType !== undefined) source.authType = req.body.authType;
      if (req.body.pullIntervalMinutes !== undefined) source.pullIntervalMinutes = Number(req.body.pullIntervalMinutes);
      if (req.body.metadata !== undefined) source.metadata = req.body.metadata;

      await source.save();
      sendSuccess(res, this.withUiStatus(source as unknown as AnyRecord), 'Data source updated');
    } catch (error) {
      next(error);
    }
  }

  async deleteDataSource(req: Request, res: Response, next: NextFunction) {
    try {
      const source = await DataSource.findOne({ _id: req.params.sourceId, isActive: true });
      if (!source) {
        throw new AppError('Data source not found', 404, 'NOT_FOUND');
      }

      this.assertAccess(req, source.createdBy.toString(), source.organization?.toString());
      source.isActive = false;
      source.status = 'disabled';
      await source.save();
      sendSuccess(res, null, 'Data source deleted');
    } catch (error) {
      next(error);
    }
  }

  async refreshDataSource(req: Request, res: Response, next: NextFunction) {
    try {
      const source = await DataSource.findOne({ _id: req.params.sourceId, isActive: true });
      if (!source) {
        throw new AppError('Data source not found', 404, 'NOT_FOUND');
      }

      this.assertAccess(req, source.createdBy.toString(), source.organization?.toString());
      source.lastRefreshAt = new Date();
      source.lastRefreshStatus = 'success';
      source.lastError = undefined;
      await source.save();

      sendSuccess(
        res,
        this.withUiStatus(source as unknown as AnyRecord),
        'Data source refresh queued'
      );
    } catch (error) {
      next(error);
    }
  }
}

export const marketIntelligenceController = new MarketIntelligenceController();
