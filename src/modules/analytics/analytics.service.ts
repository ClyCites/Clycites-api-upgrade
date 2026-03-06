/**
 * Analytics Service — Enterprise Edition
 */
import mongoose from 'mongoose';
import Order from '../orders/order.model';
import Listing from '../marketplace/listing.model';
import Farmer from '../farmers/farmer.model';
import User from '../users/user.model';
import AnalyticsEvent from './analyticsEvent.model';
import AggregatedMetric from './analyticsMetric.model';
import Chart from './chart.model';
import Dashboard from './dashboard.model';
import AnalyticsDataset, { AnalyticsDatasetStatus, IAnalyticsDatasetDocument } from './analyticsDataset.model';
import AnalyticsReport, { AnalyticsReportStatus, IAnalyticsReportDocument } from './analyticsReport.model';
import { analyticsQueryEngine } from './analyticsQuery.service';
import { analyticsDatasetService } from './analyticsDataset.service';
import {
  IAnalyticsEvent,
  IChartDefinition,
  IQueryContext,
  IQueryResult,
  AccessScope,
  ShareScope,
  DatasetId,
  AggregationWindow,
  MetricType,
  DimensionType,
  IFarmerDashboard,
  IOrgDashboard,
  IAdminDashboard,
} from './analytics.types';
import { IChartMongoDocument } from './chart.model';
import { IDashboardMongoDocument } from './dashboard.model';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../common/errors/AppError';
import { PaginationUtil } from '../../common/utils/pagination';
import logger from '../../common/utils/logger';

type ChartWorkspaceStatus = 'draft' | 'published' | 'archived';
type DashboardWorkspaceStatus = 'draft' | 'published' | 'archived';

const CHART_STATUS_TRANSITIONS: Record<ChartWorkspaceStatus, ChartWorkspaceStatus[]> = {
  draft: ['draft', 'published', 'archived'],
  published: ['published', 'archived'],
  archived: ['archived'],
};

const DASHBOARD_STATUS_TRANSITIONS: Record<DashboardWorkspaceStatus, DashboardWorkspaceStatus[]> = {
  draft: ['draft', 'published', 'archived'],
  published: ['published', 'archived'],
  archived: ['archived'],
};

const DATASET_STATUS_TRANSITIONS: Record<AnalyticsDatasetStatus, AnalyticsDatasetStatus[]> = {
  active: ['active', 'deprecated'],
  deprecated: ['deprecated', 'active'],
};

const REPORT_STATUS_TRANSITIONS: Record<AnalyticsReportStatus, AnalyticsReportStatus[]> = {
  generated: ['generated', 'exported', 'archived'],
  exported: ['exported', 'generated', 'archived'],
  archived: ['archived'],
};

class AnalyticsService {

  // ── A. EVENT INGESTION ───────────────────────────────────────────────────

  async ingestEvent(event: Omit<IAnalyticsEvent, 'createdAt'>): Promise<void> {
    try { await AnalyticsEvent.create(event); }
    catch (err) { logger.warn('Analytics event ingestion failed', { error: err }); }
  }

  fireEvent(event: Omit<IAnalyticsEvent, 'createdAt'>): void {
    setImmediate(() => this.ingestEvent(event));
  }

  // ── B. DOMAIN DASHBOARDS ─────────────────────────────────────────────────

  async getFarmerDashboard(farmerId: string, days = 30): Promise<IFarmerDashboard> {
    const since = new Date(); since.setDate(since.getDate() - days);
    const [orders, listings, revenue, farmer, recentOrders, salesTrend, topProducts] = await Promise.all([
      Order.countDocuments({ farmer: farmerId, createdAt: { $gte: since } }),
      Listing.countDocuments({ farmer: farmerId, status: 'active' }),
      this.calcFarmerRevenue(farmerId, since),
      Farmer.findById(farmerId).lean(),
      Order.find({ farmer: farmerId }).sort({ createdAt: -1 }).limit(5).populate('product', 'name category').lean(),
      this.farmerSalesTrend(farmerId, since),
      this.farmerTopProducts(farmerId, since),
    ]);
    return {
      summary: { totalOrders: orders, totalRevenue: revenue, activeListings: listings, avgRating: (farmer as any)?.rating ?? 0, verifiedStatus: (farmer as any)?.verified ?? false },
      recentOrders, salesTrend, topProducts, diseaseAlerts: [], weatherRisks: [], advisoryEngagement: { sent: 0, read: 0, rate: 0 },
    };
  }

  async getOrgDashboard(orgId: string, days = 30): Promise<IOrgDashboard> {
    const since = new Date(); since.setDate(since.getDate() - days);
    const oid = new mongoose.Types.ObjectId(orgId);
    const [totalOrders, openDisputes, memberFarmers, diseaseDetections, memberActivity, regionDist, cropDist, marketPerf] = await Promise.all([
      Order.countDocuments({ orgId: oid, createdAt: { $gte: since } }),
      mongoose.connection.collection('disputes').countDocuments({ orgId: oid, status: { $nin: ['resolved','closed'] } }),
      Farmer.countDocuments({ organizationId: oid }),
      mongoose.connection.collection('pestdiseasereports').countDocuments({ orgId: oid, createdAt: { $gte: since } }),
      this.orgMemberActivity(orgId, since),
      this.orgRegionDist(orgId),
      this.orgCropDist(orgId),
      this.orgMarketPerf(orgId, since),
    ]);
    const totalRevenue = await this.calcOrgRevenue(orgId, since);
    return {
      summary: { memberFarmers, totalOrders, totalRevenue, disputeRate: totalOrders ? (openDisputes / totalOrders) * 100 : 0, diseaseDetections },
      memberActivity, regionDistribution: regionDist, cropDistribution: cropDist, marketPerformance: marketPerf, outbreakHeatmap: [],
    };
  }

  async getAdminDashboard(): Promise<IAdminDashboard> {
    const today = new Date(); today.setHours(0,0,0,0);
    const [totalFarmers, totalOrders, activeOrgs, aiDetections, openDisputes, weatherAlertsToday, adoption] = await Promise.all([
      Farmer.countDocuments(),
      Order.countDocuments(),
      mongoose.connection.collection('organizations').countDocuments({ status: 'active' }),
      mongoose.connection.collection('pestdiseasereports').countDocuments(),
      mongoose.connection.collection('disputes').countDocuments({ status: { $nin: ['resolved','closed'] } }),
      mongoose.connection.collection('weatheralerts').countDocuments({ createdAt: { $gte: today } }),
      this.platformAdoptionTrend(),
    ]);
    const totalRevenue = await this.calcTotalRevenue();
    const healthScore  = Math.max(0, Math.min(100, Math.round(70 + Math.min(totalFarmers/100,15) + Math.min(totalOrders/500,15) - (totalOrders ? (openDisputes/totalOrders)*100 : 0))));
    return {
      platform: { totalFarmers, totalOrders, totalRevenue, activeOrgs, aiDetections, openDisputes, weatherAlertsToday },
      adoption,
      healthScore,
      systemAlerts: openDisputes > 50 ? [{ type: 'warning', message: `${openDisputes} open disputes require attention` }] : [],
    };
  }

  // ── Original service methods (preserved) ─────────────────────────────────

  async getMarketOverview() {
    const [totalListings, activeListings, totalOrders, totalRevenue, totalFarmers, verifiedFarmers, totalBuyers, avgOrderValue] =
      await Promise.all([
        Listing.countDocuments(), Listing.countDocuments({ status: 'active' }), Order.countDocuments(),
        this.calcTotalRevenue(), Farmer.countDocuments(), Farmer.countDocuments({ verified: true }),
        User.countDocuments({ role: 'buyer' }), this.calcAvgOrderValue(),
      ]);
    return { listings: { total: totalListings, active: activeListings }, orders: { total: totalOrders, avgValue: avgOrderValue }, revenue: { total: totalRevenue }, users: { farmers: totalFarmers, verifiedFarmers, buyers: totalBuyers } };
  }

  async getPriceTrends(query: Record<string,string>) {
    const { product, region, days = '30' } = query;
    const since = new Date(); since.setDate(since.getDate() - parseInt(days));
    const match: Record<string,unknown> = { createdAt: { $gte: since }, status: 'active' };
    if (product) match['product'] = new mongoose.Types.ObjectId(product);
    if (region)  match['location.region'] = region;
    return Listing.aggregate([
      { $match: match },
      { $group: { _id: { date: { $dateToString: { format:'%Y-%m-%d', date:'$createdAt' } }, product:'$product' }, avgPrice:{ $avg:'$price' }, minPrice:{ $min:'$price' }, maxPrice:{ $max:'$price' }, count:{ $sum:1 } } },
      { $lookup: { from:'products', localField:'_id.product', foreignField:'_id', as:'productInfo' } },
      { $unwind: '$productInfo' }, { $sort: { '_id.date':1 } },
    ]);
  }

  async getProductDemand(query: Record<string,string>) {
    const { category, region, days = '30' } = query;
    const since = new Date(); since.setDate(since.getDate() - parseInt(days));
    const match: Record<string,unknown> = { createdAt: { $gte: since } };
    if (region) match['deliveryAddress.region'] = region;
    const pipeline: mongoose.PipelineStage[] = [
      { $match: match },
      { $lookup: { from:'products', localField:'product', foreignField:'_id', as:'productInfo' } },
      { $unwind: '$productInfo' },
      ...(category ? [{ $match: { 'productInfo.category': category } } as mongoose.PipelineStage] : []),
      { $group: { _id:{ product:'$product', name:'$productInfo.name', category:'$productInfo.category' }, totalOrders:{ $sum:1 }, totalQuantity:{ $sum:'$quantity' }, totalRevenue:{ $sum:'$totalAmount' } } },
      { $sort: { totalOrders:-1 } }, { $limit: 20 },
    ];
    return Order.aggregate(pipeline);
  }

  async getSupplyAnalysis(query: Record<string,string>) {
    const { category, region } = query;
    const match: Record<string,unknown> = { status:'active' };
    if (region) match['location.region'] = region;
    const pipeline: mongoose.PipelineStage[] = [
      { $match: match },
      { $lookup: { from:'products', localField:'product', foreignField:'_id', as:'productInfo' } },
      { $unwind: '$productInfo' },
      ...(category ? [{ $match: { 'productInfo.category': category } } as mongoose.PipelineStage] : []),
      { $group: { _id:{ product:'$product', name:'$productInfo.name', category:'$productInfo.category' }, totalListings:{ $sum:1 }, totalQuantity:{ $sum:'$quantity' }, avgPrice:{ $avg:'$price' } } },
      { $sort: { totalQuantity:-1 } },
    ];
    return Listing.aggregate(pipeline);
  }

  async getFarmerPerformance(farmerId: string, query: Record<string,string>) {
    const since = new Date(); since.setDate(since.getDate() - parseInt(query.days ?? '30'));
    const [orders, listings, revenue, farmer] = await Promise.all([
      Order.countDocuments({ farmer: farmerId, createdAt: { $gte: since } }),
      Listing.countDocuments({ farmer: farmerId, createdAt: { $gte: since } }),
      this.calcFarmerRevenue(farmerId, since),
      Farmer.findById(farmerId).lean(),
    ]);
    return { summary: { orders, listings, revenue, avgRating: (farmer as any)?.rating ?? 0 }, salesByProduct: await this.farmerTopProducts(farmerId, since) };
  }

  async getRegionalAnalysis() {
    return Listing.aggregate([
      { $match: { status:'active' } },
      { $group: { _id:'$location.region', totalListings:{ $sum:1 }, totalQuantity:{ $sum:'$quantity' }, avgPrice:{ $avg:'$price' } } },
      { $lookup: { from:'orders', let:{ region:'$_id' }, pipeline:[{ $match:{ $expr:{ $eq:['$deliveryAddress.region','$$region'] } } },{ $group:{ _id:null, totalOrders:{ $sum:1 }, totalRevenue:{ $sum:'$totalAmount' } } }], as:'orderStats' } },
      { $unwind: { path:'$orderStats', preserveNullAndEmptyArrays:true } },
      { $project: { region:'$_id', supply:{ listings:'$totalListings', quantity:'$totalQuantity', avgPrice:'$avgPrice' }, demand:{ orders:{ $ifNull:['$orderStats.totalOrders',0] }, revenue:{ $ifNull:['$orderStats.totalRevenue',0] } } } },
      { $sort: { 'supply.listings':-1 } },
    ]);
  }

  async getMarketHealth() {
    const since = new Date(); since.setDate(since.getDate() - 30);
    const [activeListings, fulfillmentRate, avgTimeToSale, returnBuyerRate] = await Promise.all([
      Listing.countDocuments({ status:'active' }), this.calcFulfillmentRate(since), this.calcAvgTimeToSale(since), this.calcReturnBuyerRate(since),
    ]);
    return { activeListings, fulfillmentRate, avgTimeToSale, returnBuyerRate, healthScore: Math.round(fulfillmentRate*0.4 + returnBuyerRate*0.3 + Math.min((activeListings/100)*30,30)) };
  }

  // ── C. SEMANTIC QUERY ENGINE ─────────────────────────────────────────────

  async executeChartQuery(definition: IChartDefinition, ctx: IQueryContext): Promise<IQueryResult> {
    return analyticsQueryEngine.execute(definition, ctx);
  }

  async previewChart(definition: IChartDefinition, ctx: IQueryContext): Promise<IQueryResult> {
    analyticsDatasetService.validateDefinition(definition, ctx);
    return analyticsQueryEngine.execute({ ...definition, vizOptions: { ...(definition.vizOptions ?? {}), limit: 50 } }, ctx);
  }

  getAccessibleDatasets(ctx: IQueryContext) {
    return analyticsDatasetService.getAccessibleDatasets(ctx);
  }

  getDatasetRegistry() {
    return analyticsDatasetService.getRegistry();
  }

  async listDatasets(ctx: IQueryContext, query: Record<string, string>) {
    const { page, limit, sortBy, sortOrder } = PaginationUtil.getPaginationParams(query);
    const statusFilter = query.status as AnalyticsDatasetStatus | undefined;
    const includeRegistry = query.includeRegistry !== 'false';
    const skip = PaginationUtil.getSkip(page, limit);

    const filter: Record<string, unknown> = { isActive: true };
    if (statusFilter && ['active', 'deprecated'].includes(statusFilter)) {
      filter.status = statusFilter;
    }

    if (ctx.scope !== AccessScope.PLATFORM_ADMIN) {
      const tenantScope: Record<string, unknown>[] = [{ ownerId: this.toObjectIdOrValue(ctx.userId) }];
      if (ctx.orgId) tenantScope.push({ orgId: this.toObjectIdOrValue(ctx.orgId) });
      filter.$or = tenantScope;
    }

    const [customDatasets, registryDefs] = await Promise.all([
      AnalyticsDataset.find(filter)
        .sort(PaginationUtil.getSortObject(sortBy ?? 'createdAt', sortOrder ?? 'desc'))
        .lean(),
      Promise.resolve(includeRegistry ? this.getAccessibleDatasets(ctx) : []),
    ]);

    const registryRows = registryDefs.map((dataset) => this.toRegistryDataset(dataset));
    const customRows = customDatasets.map((dataset) => this.toCustomDataset(dataset as unknown as IAnalyticsDatasetDocument));
    let rows: Array<Record<string, unknown>> = [...customRows, ...registryRows];

    const search = (query.search || '').trim().toLowerCase();
    if (search) {
      rows = rows.filter((row) => {
        const name = typeof row.name === 'string' ? row.name.toLowerCase() : '';
        const description = typeof row.description === 'string' ? row.description.toLowerCase() : '';
        return name.includes(search) || description.includes(search);
      });
    }

    const total = rows.length;
    const pagedRows = rows.slice(skip, skip + limit);
    return PaginationUtil.buildPaginationResult(pagedRows, total, page, limit);
  }

  async createDataset(
    payload: {
      name: string;
      description?: string;
      sourceDatasetId?: string;
      fields?: IAnalyticsDatasetDocument['fields'];
      metadata?: Record<string, unknown>;
      tags?: string[];
      status?: AnalyticsDatasetStatus;
      orgId?: string;
    },
    ctx: IQueryContext
  ) {
    const resolvedOrgId = this.resolveScopedOrgId(payload.orgId, ctx);
    const status = payload.status ?? 'active';
    const dataset = await AnalyticsDataset.create({
      name: payload.name,
      description: payload.description,
      sourceDatasetId: payload.sourceDatasetId,
      fields: payload.fields ?? [],
      metadata: payload.metadata ?? {},
      tags: payload.tags ?? [],
      status,
      ownerId: this.toObjectIdOrValue(ctx.userId),
      orgId: resolvedOrgId ? this.toObjectIdOrValue(resolvedOrgId) : undefined,
    });

    return this.toCustomDataset(dataset);
  }

  async getDataset(datasetId: string, ctx: IQueryContext) {
    if (mongoose.isValidObjectId(datasetId)) {
      const dataset = await AnalyticsDataset.findOne({ _id: datasetId, isActive: true });
      if (!dataset) throw new NotFoundError('Dataset not found');
      this.assertDatasetRead(dataset, ctx);
      return this.toCustomDataset(dataset);
    }

    const registry = this.getDatasetRegistry()[datasetId as DatasetId];
    if (!registry) throw new NotFoundError('Dataset not found');
    analyticsDatasetService.getDataset(datasetId as DatasetId, ctx);
    return this.toRegistryDataset(registry);
  }

  async updateDataset(
    datasetId: string,
    updates: {
      name?: string;
      description?: string;
      sourceDatasetId?: string;
      fields?: IAnalyticsDatasetDocument['fields'];
      metadata?: Record<string, unknown>;
      tags?: string[];
      status?: AnalyticsDatasetStatus;
    },
    ctx: IQueryContext
  ) {
    if (!mongoose.isValidObjectId(datasetId)) {
      throw new BadRequestError('Built-in registry datasets are read-only');
    }

    const dataset = await AnalyticsDataset.findOne({ _id: datasetId, isActive: true });
    if (!dataset) throw new NotFoundError('Dataset not found');
    this.assertDatasetWrite(dataset, ctx);

    if (updates.status) {
      const current = (dataset.status || 'active') as AnalyticsDatasetStatus;
      this.assertStatusTransition(current, updates.status, DATASET_STATUS_TRANSITIONS, 'dataset');
      dataset.status = updates.status;
    }

    if (updates.name) dataset.name = updates.name;
    if (updates.description !== undefined) dataset.description = updates.description;
    if (updates.sourceDatasetId !== undefined) dataset.sourceDatasetId = updates.sourceDatasetId;
    if (updates.fields) dataset.fields = updates.fields;
    if (updates.metadata) dataset.metadata = updates.metadata;
    if (updates.tags) dataset.tags = updates.tags;

    await dataset.save();
    return this.toCustomDataset(dataset);
  }

  async deleteDataset(datasetId: string, ctx: IQueryContext): Promise<void> {
    if (!mongoose.isValidObjectId(datasetId)) {
      throw new BadRequestError('Built-in registry datasets cannot be deleted');
    }

    const dataset = await AnalyticsDataset.findOne({ _id: datasetId, isActive: true });
    if (!dataset) throw new NotFoundError('Dataset not found');
    this.assertDatasetWrite(dataset, ctx);
    dataset.isActive = false;
    await dataset.save();
  }

  // ── D. CHART CRUD ─────────────────────────────────────────────────────────

  async createChart(name: string, description: string|undefined, definition: IChartDefinition, ctx: IQueryContext, tags: string[] = [], shareScope: ShareScope = ShareScope.OWNER_ONLY): Promise<IChartMongoDocument> {
    analyticsDatasetService.validateDefinition(definition, ctx);
    return Chart.create({
      name,
      description,
      ownerId: ctx.userId,
      orgId: ctx.orgId ? new mongoose.Types.ObjectId(ctx.orgId) : undefined,
      definition,
      versions: [{ version:1, definition, updatedAt: new Date(), updatedBy: ctx.userId }],
      currentVersion:1,
      shareScope,
      tags,
      status: 'draft',
    });
  }

  async updateChart(
    chartId: string,
    updates: {
      name?: string;
      description?: string;
      definition?: IChartDefinition;
      shareScope?: ShareScope;
      tags?: string[];
      status?: ChartWorkspaceStatus;
    },
    ctx: IQueryContext
  ): Promise<IChartMongoDocument> {
    const chart = await Chart.findById(chartId);
    if (!chart) throw new NotFoundError('Chart not found');
    if (chart.ownerId.toString() !== ctx.userId && ctx.scope !== AccessScope.PLATFORM_ADMIN) throw new ForbiddenError('Only the chart owner can modify it');
    if (updates.definition) {
      analyticsDatasetService.validateDefinition(updates.definition, ctx);
      const v = chart.currentVersion + 1;
      chart.versions.push({ version:v, definition: updates.definition, updatedAt: new Date(), updatedBy: new mongoose.Types.ObjectId(ctx.userId) });
      if (chart.versions.length > 20) chart.versions.shift();
      chart.currentVersion = v;
      chart.definition = updates.definition;
    }
    if (updates.name) chart.name = updates.name;
    if (updates.description !== undefined) chart.description = updates.description;
    if (updates.shareScope) chart.shareScope = updates.shareScope;
    if (updates.tags) chart.tags = updates.tags;
    if (updates.status) {
      const currentStatus = ((chart as unknown as { status?: ChartWorkspaceStatus }).status ?? 'draft') as ChartWorkspaceStatus;
      this.assertStatusTransition(currentStatus, updates.status, CHART_STATUS_TRANSITIONS, 'chart');
      (chart as unknown as { status: ChartWorkspaceStatus }).status = updates.status;
    }
    await chart.save();
    return chart;
  }

  async deleteChart(chartId: string, ctx: IQueryContext): Promise<void> {
    const chart = await Chart.findById(chartId);
    if (!chart) throw new NotFoundError('Chart not found');
    if (chart.ownerId.toString() !== ctx.userId && ctx.scope !== AccessScope.PLATFORM_ADMIN) throw new ForbiddenError('Only the chart owner can delete it');
    await chart.deleteOne();
    await Dashboard.updateMany({}, { $pull: { items: { chartId: chart._id } } });
  }

  async getChart(chartId: string, ctx: IQueryContext): Promise<IChartMongoDocument> {
    const chart = await Chart.findById(chartId);
    if (!chart) throw new NotFoundError('Chart not found');
    this.assertChartAccess(chart, ctx);
    return chart;
  }

  async listCharts(ctx: IQueryContext, query: Record<string,string>) {
    const { page, limit, sortBy, sortOrder } = PaginationUtil.getPaginationParams(query);
    const skip = PaginationUtil.getSkip(page, limit);
    const sort = PaginationUtil.getSortObject(sortBy ?? 'createdAt', sortOrder ?? 'desc');
    const filter: Record<string,unknown> = { $or: [
      { ownerId: ctx.userId }, { shareScope: ShareScope.PUBLIC }, { isTemplate: true },
      ...(ctx.orgId ? [{ orgId: ctx.orgId, shareScope: { $in:[ShareScope.ORG_MEMBERS, ShareScope.SPECIFIC_ROLES] } }] : []),
    ]};
    if (query.dataset) filter['definition.datasetId'] = query.dataset;
    if (query.tags)    filter['tags'] = { $in: query.tags.split(',') };
    if (query.status)  filter['status'] = query.status;
    if (!query.status && query.uiStatus) filter['status'] = query.uiStatus;
    const [charts, total] = await Promise.all([Chart.find(filter).select('-versions').sort(sort).skip(skip).limit(limit), Chart.countDocuments(filter)]);
    return PaginationUtil.buildPaginationResult(charts, total, page, limit);
  }

  async publishChart(chartId: string, ctx: IQueryContext) {
    return this.updateChart(chartId, { status: 'published' }, ctx);
  }

  async archiveChart(chartId: string, ctx: IQueryContext) {
    return this.updateChart(chartId, { status: 'archived' }, ctx);
  }

  // ── E. DASHBOARD CRUD ─────────────────────────────────────────────────────

  async createDashboard(name: string, description: string|undefined, ctx: IQueryContext, opts: { orgId?:string; shareScope?:ShareScope; templateCategory?: IDashboardMongoDocument['templateCategory']; tags?:string[]; isDefault?:boolean } = {}): Promise<IDashboardMongoDocument> {
    const resolvedOrgId = this.resolveScopedOrgId(opts.orgId, ctx);
    return Dashboard.create({
      name,
      description,
      ownerId: ctx.userId,
      orgId: resolvedOrgId,
      sharing: { scope: opts.shareScope ?? ShareScope.OWNER_ONLY },
      isTemplate: false,
      templateCategory: opts.templateCategory,
      tags: opts.tags ?? [],
      status: 'draft',
      isDefault: opts.isDefault ?? false,
    });
  }

  async updateDashboard(
    dashboardId: string,
    updates: {
      name?: string;
      description?: string;
      tags?: string[];
      isDefault?: boolean;
      status?: DashboardWorkspaceStatus;
    },
    ctx: IQueryContext
  ): Promise<IDashboardMongoDocument> {
    const dashboard = await Dashboard.findById(dashboardId);
    if (!dashboard) throw new NotFoundError('Dashboard not found');
    this.assertDashboardWrite(dashboard, ctx);

    if (updates.status) {
      const currentStatus = ((dashboard as unknown as { status?: DashboardWorkspaceStatus }).status ?? 'draft') as DashboardWorkspaceStatus;
      this.assertStatusTransition(currentStatus, updates.status, DASHBOARD_STATUS_TRANSITIONS, 'dashboard');
      (dashboard as unknown as { status: DashboardWorkspaceStatus }).status = updates.status;
    }

    if (updates.name) dashboard.name = updates.name;
    if (updates.description !== undefined) dashboard.description = updates.description;
    if (updates.tags) dashboard.tags = updates.tags;
    if (typeof updates.isDefault === 'boolean') dashboard.isDefault = updates.isDefault;

    await dashboard.save();
    return dashboard;
  }

  async reorderDashboardCharts(
    dashboardId: string,
    items: Array<{
      chartId: string;
      position: { col: number; row: number };
      size: { w: number; h: number };
      title?: string;
    }>,
    ctx: IQueryContext
  ): Promise<IDashboardMongoDocument> {
    const dashboard = await Dashboard.findById(dashboardId);
    if (!dashboard) throw new NotFoundError('Dashboard not found');
    this.assertDashboardWrite(dashboard, ctx);

    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestError('Reorder payload must include at least one chart item');
    }

    const existingIds = new Set(dashboard.items.map((item) => item.chartId.toString()));
    const seen = new Set<string>();

    for (const item of items) {
      if (!existingIds.has(item.chartId)) {
        throw new BadRequestError(`Chart ${item.chartId} is not attached to this dashboard`);
      }
      if (seen.has(item.chartId)) {
        throw new BadRequestError(`Duplicate chart ${item.chartId} in reorder payload`);
      }
      seen.add(item.chartId);
    }

    dashboard.items = items.map((item) => ({
      chartId: new mongoose.Types.ObjectId(item.chartId),
      position: item.position,
      size: item.size,
      title: item.title,
    })) as typeof dashboard.items;

    await dashboard.save();
    return dashboard;
  }

  async addChartToDashboard(dashboardId: string, chartId: string, position: { col:number; row:number }, size: { w:number; h:number }, ctx: IQueryContext): Promise<IDashboardMongoDocument> {
    const [dashboard, chart] = await Promise.all([Dashboard.findById(dashboardId), Chart.findById(chartId)]);
    if (!dashboard) throw new NotFoundError('Dashboard not found');
    if (!chart)     throw new NotFoundError('Chart not found');
    this.assertDashboardWrite(dashboard, ctx);
    this.assertChartAccess(chart, ctx);
    if (dashboard.items.length >= 50) throw new BadRequestError('Dashboard cannot have more than 50 charts');
    dashboard.items.push({ chartId: chart._id, position, size });
    await dashboard.save();
    return dashboard;
  }

  async removeChartFromDashboard(dashboardId: string, chartId: string, ctx: IQueryContext): Promise<IDashboardMongoDocument> {
    const dashboard = await Dashboard.findById(dashboardId);
    if (!dashboard) throw new NotFoundError('Dashboard not found');
    this.assertDashboardWrite(dashboard, ctx);
    const before = dashboard.items.length;
    dashboard.items = dashboard.items.filter(i => i.chartId.toString() !== chartId);
    if (dashboard.items.length === before) throw new NotFoundError('Chart not on this dashboard');
    await dashboard.save();
    return dashboard;
  }

  async updateDashboardSharing(dashboardId: string, sharing: { scope:ShareScope; roles?:string[]; userIds?:string[] }, ctx: IQueryContext): Promise<IDashboardMongoDocument> {
    const dashboard = await Dashboard.findById(dashboardId);
    if (!dashboard) throw new NotFoundError('Dashboard not found');
    if (dashboard.ownerId.toString() !== ctx.userId && ctx.scope !== AccessScope.PLATFORM_ADMIN) throw new ForbiddenError('Only owner can change sharing');
    dashboard.sharing = { scope: sharing.scope, roles: sharing.roles ?? [], userIds: (sharing.userIds ?? []).map(id => new mongoose.Types.ObjectId(id)) as any };
    await dashboard.save();
    return dashboard;
  }

  async getDashboard(dashboardId: string, ctx: IQueryContext): Promise<IDashboardMongoDocument> {
    const dashboard = await Dashboard.findById(dashboardId).populate('items.chartId');
    if (!dashboard) throw new NotFoundError('Dashboard not found');
    this.assertDashboardRead(dashboard, ctx);
    return dashboard;
  }

  async listDashboards(ctx: IQueryContext, query: Record<string,string>) {
    const { page, limit } = PaginationUtil.getPaginationParams(query);
    const skip = PaginationUtil.getSkip(page, limit);
    const filter: Record<string,unknown> = { $or: [
      { ownerId: ctx.userId }, { isTemplate:true },
      ...(ctx.orgId ? [{ orgId: ctx.orgId, 'sharing.scope': { $in:[ShareScope.ORG_MEMBERS,ShareScope.SPECIFIC_ROLES,ShareScope.PUBLIC] } }] : []),
    ]};
    if (query.status) filter.status = query.status;
    if (!query.status && query.uiStatus) filter.status = query.uiStatus;
    const [dashboards, total] = await Promise.all([Dashboard.find(filter).sort({ isDefault:-1, updatedAt:-1 }).skip(skip).limit(limit), Dashboard.countDocuments(filter)]);
    return PaginationUtil.buildPaginationResult(dashboards, total, page, limit);
  }

  async publishDashboard(dashboardId: string, ctx: IQueryContext) {
    return this.updateDashboard(dashboardId, { status: 'published' }, ctx);
  }

  async archiveDashboard(dashboardId: string, ctx: IQueryContext) {
    return this.updateDashboard(dashboardId, { status: 'archived' }, ctx);
  }

  async deleteDashboard(dashboardId: string, ctx: IQueryContext): Promise<void> {
    const dashboard = await Dashboard.findById(dashboardId);
    if (!dashboard) throw new NotFoundError('Dashboard not found');
    if (dashboard.ownerId.toString() !== ctx.userId && ctx.scope !== AccessScope.PLATFORM_ADMIN) throw new ForbiddenError('Only owner can delete dashboard');
    await dashboard.deleteOne();
  }

  async getDashboardTemplates(category?: string) {
    const filter: Record<string,unknown> = { isTemplate:true };
    if (category) filter['templateCategory'] = category;
    return Dashboard.find(filter).sort({ name:1 }).lean();
  }

  async listDashboardTemplates(query: Record<string, string>, ctx?: IQueryContext) {
    const { page, limit } = PaginationUtil.getPaginationParams(query);
    const skip = PaginationUtil.getSkip(page, limit);
    const filter: Record<string, unknown> = { isTemplate: true };

    if (query.category) filter.templateCategory = query.category;
    if (query.status) filter.status = query.status;
    if (!query.status && query.uiStatus) filter.status = query.uiStatus;

    if (ctx && ctx.scope !== AccessScope.PLATFORM_ADMIN) {
      filter.$or = [
        { ownerId: ctx.userId },
        { 'sharing.scope': ShareScope.PUBLIC },
        ...(ctx.orgId ? [{ orgId: ctx.orgId, 'sharing.scope': { $in: [ShareScope.ORG_MEMBERS, ShareScope.PUBLIC] } }] : []),
      ];
    }

    const [templates, total] = await Promise.all([
      Dashboard.find(filter).sort({ isDefault: -1, updatedAt: -1 }).skip(skip).limit(limit),
      Dashboard.countDocuments(filter),
    ]);
    return PaginationUtil.buildPaginationResult(templates, total, page, limit);
  }

  async createDashboardTemplate(
    name: string,
    description: string | undefined,
    ctx: IQueryContext,
    opts: { orgId?: string; shareScope?: ShareScope; templateCategory?: IDashboardMongoDocument['templateCategory']; tags?: string[]; isDefault?: boolean } = {}
  ) {
    const resolvedOrgId = this.resolveScopedOrgId(opts.orgId, ctx);
    return Dashboard.create({
      name,
      description,
      ownerId: ctx.userId,
      orgId: resolvedOrgId,
      sharing: { scope: opts.shareScope ?? ShareScope.PUBLIC },
      isTemplate: true,
      templateCategory: opts.templateCategory,
      tags: opts.tags ?? [],
      status: 'draft',
      isDefault: opts.isDefault ?? false,
    });
  }

  async getDashboardTemplate(templateId: string, ctx?: IQueryContext) {
    const template = await Dashboard.findOne({ _id: templateId, isTemplate: true }).populate('items.chartId');
    if (!template) throw new NotFoundError('Template not found');
    if (ctx) this.assertDashboardRead(template, ctx);
    return template;
  }

  async updateDashboardTemplate(
    templateId: string,
    updates: {
      name?: string;
      description?: string;
      tags?: string[];
      isDefault?: boolean;
      status?: DashboardWorkspaceStatus;
    },
    ctx: IQueryContext
  ) {
    const template = await Dashboard.findOne({ _id: templateId, isTemplate: true });
    if (!template) throw new NotFoundError('Template not found');
    this.assertDashboardWrite(template, ctx);

    if (updates.status) {
      const currentStatus = ((template as unknown as { status?: DashboardWorkspaceStatus }).status ?? 'draft') as DashboardWorkspaceStatus;
      this.assertStatusTransition(currentStatus, updates.status, DASHBOARD_STATUS_TRANSITIONS, 'template');
      (template as unknown as { status: DashboardWorkspaceStatus }).status = updates.status;
    }

    if (updates.name) template.name = updates.name;
    if (updates.description !== undefined) template.description = updates.description;
    if (updates.tags) template.tags = updates.tags;
    if (typeof updates.isDefault === 'boolean') template.isDefault = updates.isDefault;

    await template.save();
    return template;
  }

  async deleteDashboardTemplate(templateId: string, ctx: IQueryContext): Promise<void> {
    const template = await Dashboard.findOne({ _id: templateId, isTemplate: true });
    if (!template) throw new NotFoundError('Template not found');
    this.assertDashboardWrite(template, ctx);
    await template.deleteOne();
  }

  async publishDashboardTemplate(templateId: string, ctx: IQueryContext) {
    return this.updateDashboardTemplate(templateId, { status: 'published' }, ctx);
  }

  async archiveDashboardTemplate(templateId: string, ctx: IQueryContext) {
    return this.updateDashboardTemplate(templateId, { status: 'archived' }, ctx);
  }

  // ── F. REPORTS ─────────────────────────────────────────────────────────────

  async listReports(ctx: IQueryContext, query: Record<string, string>) {
    const { page, limit, sortBy, sortOrder } = PaginationUtil.getPaginationParams(query);
    const skip = PaginationUtil.getSkip(page, limit);
    const filter: Record<string, unknown> = { isActive: true };

    if (ctx.scope !== AccessScope.PLATFORM_ADMIN) {
      filter.$or = [
        { ownerId: ctx.userId },
        ...(ctx.orgId ? [{ orgId: ctx.orgId }] : []),
      ];
    }

    if (query.status) filter.status = query.status;
    if (!query.status && query.uiStatus) filter.status = query.uiStatus;

    const [reports, total] = await Promise.all([
      AnalyticsReport.find(filter)
        .sort(PaginationUtil.getSortObject(sortBy ?? 'createdAt', sortOrder ?? 'desc'))
        .skip(skip)
        .limit(limit),
      AnalyticsReport.countDocuments(filter),
    ]);

    return PaginationUtil.buildPaginationResult(reports, total, page, limit);
  }

  async createReport(
    payload: {
      name: string;
      description?: string;
      chartIds?: string[];
      dashboardId?: string;
      datasetId?: string;
      filters?: Record<string, unknown>;
      outputFormat?: 'csv' | 'json';
      metadata?: Record<string, unknown>;
      orgId?: string;
    },
    ctx: IQueryContext
  ) {
    const resolvedOrgId = this.resolveScopedOrgId(payload.orgId, ctx);
    const report = await AnalyticsReport.create({
      name: payload.name,
      description: payload.description,
      ownerId: this.toObjectIdOrValue(ctx.userId),
      orgId: resolvedOrgId ? this.toObjectIdOrValue(resolvedOrgId) : undefined,
      chartIds: (payload.chartIds ?? []).map((id) => new mongoose.Types.ObjectId(id)),
      dashboardId: payload.dashboardId ? new mongoose.Types.ObjectId(payload.dashboardId) : undefined,
      datasetId: payload.datasetId,
      filters: payload.filters ?? {},
      outputFormat: payload.outputFormat,
      metadata: payload.metadata ?? {},
      status: 'generated',
      generatedAt: new Date(),
      isActive: true,
    });

    return report;
  }

  async getReport(reportId: string, ctx: IQueryContext) {
    const report = await AnalyticsReport.findOne({ _id: reportId, isActive: true });
    if (!report) throw new NotFoundError('Report not found');
    this.assertReportRead(report, ctx);
    return report;
  }

  async updateReport(
    reportId: string,
    updates: {
      name?: string;
      description?: string;
      chartIds?: string[];
      dashboardId?: string;
      datasetId?: string;
      filters?: Record<string, unknown>;
      outputFormat?: 'csv' | 'json';
      metadata?: Record<string, unknown>;
      status?: AnalyticsReportStatus;
    },
    ctx: IQueryContext
  ) {
    const report = await AnalyticsReport.findOne({ _id: reportId, isActive: true });
    if (!report) throw new NotFoundError('Report not found');
    this.assertReportWrite(report, ctx);

    if (updates.status) {
      const currentStatus = (report.status || 'generated') as AnalyticsReportStatus;
      this.assertStatusTransition(currentStatus, updates.status, REPORT_STATUS_TRANSITIONS, 'report');
      report.status = updates.status;
      if (updates.status === 'generated') report.generatedAt = new Date();
      if (updates.status === 'exported') report.exportedAt = new Date();
      if (updates.status === 'archived') report.archivedAt = new Date();
    }

    if (updates.name) report.name = updates.name;
    if (updates.description !== undefined) report.description = updates.description;
    if (updates.chartIds) report.chartIds = updates.chartIds.map((id) => new mongoose.Types.ObjectId(id));
    if (updates.dashboardId !== undefined) report.dashboardId = updates.dashboardId ? new mongoose.Types.ObjectId(updates.dashboardId) : undefined;
    if (updates.datasetId !== undefined) report.datasetId = updates.datasetId;
    if (updates.filters) report.filters = updates.filters;
    if (updates.outputFormat) report.outputFormat = updates.outputFormat;
    if (updates.metadata) report.metadata = updates.metadata;

    await report.save();
    return report;
  }

  async deleteReport(reportId: string, ctx: IQueryContext): Promise<void> {
    const report = await AnalyticsReport.findOne({ _id: reportId, isActive: true });
    if (!report) throw new NotFoundError('Report not found');
    this.assertReportWrite(report, ctx);
    report.isActive = false;
    report.status = 'archived';
    report.archivedAt = new Date();
    await report.save();
  }

  async generateReport(reportId: string, ctx: IQueryContext, metadata?: Record<string, unknown>) {
    const report = await AnalyticsReport.findOne({ _id: reportId, isActive: true });
    if (!report) throw new NotFoundError('Report not found');
    this.assertReportWrite(report, ctx);

    this.assertStatusTransition(report.status as AnalyticsReportStatus, 'generated', REPORT_STATUS_TRANSITIONS, 'report');
    report.status = 'generated';
    report.generatedAt = new Date();
    if (metadata) {
      report.metadata = { ...(report.metadata || {}), ...metadata };
    }
    await report.save();
    return report;
  }

  async exportReport(
    reportId: string,
    ctx: IQueryContext,
    payload: { format?: 'csv' | 'json'; metadata?: Record<string, unknown> } = {}
  ) {
    const report = await AnalyticsReport.findOne({ _id: reportId, isActive: true });
    if (!report) throw new NotFoundError('Report not found');
    this.assertReportWrite(report, ctx);

    this.assertStatusTransition(report.status as AnalyticsReportStatus, 'exported', REPORT_STATUS_TRANSITIONS, 'report');

    report.status = 'exported';
    report.exportedAt = new Date();
    if (payload.format) report.outputFormat = payload.format;
    if (payload.metadata) {
      report.metadata = { ...(report.metadata || {}), ...payload.metadata };
    }
    await report.save();
    return report;
  }

  // ── G. PRE-AGGREGATION JOBS ───────────────────────────────────────────────

  async runDailyAggregation(dataset: DatasetId, window: AggregationWindow = AggregationWindow.DAILY): Promise<void> {
    const windowEnd = new Date(); const windowStart = new Date(windowEnd); windowStart.setDate(windowStart.getDate()-1);
    logger.info(`Running aggregation: ${dataset}/${window}`);
    if (dataset === DatasetId.MARKET_SALES_DAILY) {
      const rows = await Order.aggregate([{ $match:{ createdAt:{ $gte:windowStart, $lt:windowEnd } } },{ $group:{ _id:'$deliveryAddress.region', count:{ $sum:1 }, revenue:{ $sum:'$finalAmount' } } }]);
      for (const row of rows) await AggregatedMetric.findOneAndUpdate({ dataset, window, windowStart, windowEnd, dimension:DimensionType.REGION, dimensionValue: row._id??'unknown', metric:MetricType.COUNT, field:'status' },{ $set:{ value:row.count, count:row.count, updatedAt:new Date() } },{ upsert:true });
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private resolveScopedOrgId(requestedOrgId: string | undefined, ctx: IQueryContext): string | undefined {
    if (ctx.scope === AccessScope.PLATFORM_ADMIN) {
      return requestedOrgId ?? ctx.orgId;
    }

    if (!ctx.orgId) return requestedOrgId;

    if (requestedOrgId && requestedOrgId !== ctx.orgId) {
      throw new ForbiddenError('Cannot operate outside your organization scope');
    }

    return ctx.orgId;
  }

  private toObjectIdOrValue(value: string): mongoose.Types.ObjectId | string {
    return mongoose.isValidObjectId(value) ? new mongoose.Types.ObjectId(value) : value;
  }

  private assertStatusTransition<T extends string>(
    currentStatus: T,
    nextStatus: T,
    transitions: Record<T, T[]>,
    resourceName: string
  ): void {
    const allowed = transitions[currentStatus] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestError(`Invalid ${resourceName} status transition: ${currentStatus} -> ${nextStatus}`);
    }
  }

  private toRegistryDataset(definition: ReturnType<AnalyticsService['getAccessibleDatasets']>[number]) {
    return {
      id: definition.id,
      datasetId: definition.id,
      name: definition.label,
      label: definition.label,
      description: definition.description,
      domain: definition.domain,
      collection: definition.collection,
      fields: definition.fields,
      metrics: definition.metrics,
      dimensions: definition.dimensions,
      permissions: definition.permissions,
      status: 'active' as const,
      uiStatus: 'active' as const,
      source: 'registry',
      readOnly: true,
      createdAt: null,
      updatedAt: null,
    };
  }

  private toCustomDataset(dataset: IAnalyticsDatasetDocument | Record<string, unknown>) {
    const plain = typeof (dataset as IAnalyticsDatasetDocument).toObject === 'function'
      ? (dataset as IAnalyticsDatasetDocument).toObject()
      : dataset;

    const record = plain as Record<string, unknown>;
    const status = (record.status as AnalyticsDatasetStatus) || 'active';

    return {
      ...record,
      id: record._id ?? record.id,
      uiStatus: status,
      source: 'custom',
      readOnly: false,
    };
  }

  private assertDatasetRead(dataset: IAnalyticsDatasetDocument, ctx: IQueryContext): void {
    if (ctx.scope === AccessScope.PLATFORM_ADMIN) return;
    if (dataset.ownerId.toString() === ctx.userId) return;
    if (ctx.orgId && dataset.orgId?.toString() === ctx.orgId) return;
    throw new ForbiddenError('Access denied to this dataset');
  }

  private assertDatasetWrite(dataset: IAnalyticsDatasetDocument, ctx: IQueryContext): void {
    if (ctx.scope === AccessScope.PLATFORM_ADMIN) return;
    if (dataset.ownerId.toString() === ctx.userId) return;
    throw new ForbiddenError('Only the dataset owner can modify it');
  }

  private assertReportRead(report: IAnalyticsReportDocument, ctx: IQueryContext): void {
    if (ctx.scope === AccessScope.PLATFORM_ADMIN) return;
    if (report.ownerId.toString() === ctx.userId) return;
    if (ctx.orgId && report.orgId?.toString() === ctx.orgId) return;
    throw new ForbiddenError('Access denied to this report');
  }

  private assertReportWrite(report: IAnalyticsReportDocument, ctx: IQueryContext): void {
    if (ctx.scope === AccessScope.PLATFORM_ADMIN) return;
    if (report.ownerId.toString() === ctx.userId) return;
    throw new ForbiddenError('Only the report owner can modify it');
  }

  private async calcTotalRevenue() { const r = await Order.aggregate([{ $match:{ paymentStatus:'paid' } },{ $group:{ _id:null, t:{ $sum:'$finalAmount' } } }]); return r[0]?.t??0; }
  private async calcAvgOrderValue() { const r = await Order.aggregate([{ $group:{ _id:null, a:{ $avg:'$finalAmount' } } }]); return r[0]?.a??0; }
  private async calcFarmerRevenue(fid: string, since: Date) { const r = await Order.aggregate([{ $match:{ farmer: new mongoose.Types.ObjectId(fid), createdAt:{ $gte:since }, paymentStatus:'paid' } },{ $group:{ _id:null, t:{ $sum:'$totalAmount' } } }]); return r[0]?.t??0; }
  private async calcOrgRevenue(oid: string, since: Date) { const r = await Order.aggregate([{ $match:{ orgId: new mongoose.Types.ObjectId(oid), createdAt:{ $gte:since }, paymentStatus:'paid' } },{ $group:{ _id:null, t:{ $sum:'$totalAmount' } } }]); return r[0]?.t??0; }
  private async farmerSalesTrend(fid: string, since: Date) { return Order.aggregate([{ $match:{ farmer: new mongoose.Types.ObjectId(fid), createdAt:{ $gte:since } } },{ $group:{ _id:{ $dateToString:{ format:'%Y-%m-%d', date:'$createdAt' } }, orders:{ $sum:1 }, revenue:{ $sum:'$totalAmount' } } },{ $sort:{ _id:1 } }]); }
  private async farmerTopProducts(fid: string, since: Date) { return Order.aggregate([{ $match:{ farmer: new mongoose.Types.ObjectId(fid), createdAt:{ $gte:since } } },{ $group:{ _id:'$product', sales:{ $sum:'$quantity' }, revenue:{ $sum:'$totalAmount' }, orders:{ $sum:1 } } },{ $lookup:{ from:'products', localField:'_id', foreignField:'_id', as:'product' } },{ $unwind:'$product' },{ $sort:{ revenue:-1 } },{ $limit:5 }]); }
  private async orgMemberActivity(oid: string, since: Date) { return Farmer.aggregate([{ $match:{ organizationId: new mongoose.Types.ObjectId(oid) } },{ $lookup:{ from:'orders', localField:'_id', foreignField:'farmer', as:'orders', pipeline:[{ $match:{ createdAt:{ $gte:since } } }] } },{ $project:{ _id:1, businessName:1, orderCount:{ $size:'$orders' } } },{ $sort:{ orderCount:-1 } },{ $limit:20 }]); }
  private async orgRegionDist(oid: string) { return Farmer.aggregate([{ $match:{ organizationId: new mongoose.Types.ObjectId(oid) } },{ $group:{ _id:'$location.region', count:{ $sum:1 } } },{ $project:{ region:'$_id', count:1, _id:0 } },{ $sort:{ count:-1 } }]); }
  private async orgCropDist(oid: string) { return Listing.aggregate([{ $match:{ orgId: new mongoose.Types.ObjectId(oid), status:'active' } },{ $lookup:{ from:'products', localField:'product', foreignField:'_id', as:'p' } },{ $unwind:'$p' },{ $group:{ _id:'$p.category', count:{ $sum:1 } } },{ $project:{ category:'$_id', count:1, _id:0 } }]); }
  private async orgMarketPerf(oid: string, since: Date) { return Order.aggregate([{ $match:{ orgId: new mongoose.Types.ObjectId(oid), createdAt:{ $gte:since } } },{ $group:{ _id:{ $dateToString:{ format:'%Y-%m-%d', date:'$createdAt' } }, orders:{ $sum:1 }, revenue:{ $sum:'$totalAmount' } } },{ $sort:{ _id:1 } }]); }
  private async platformAdoptionTrend() { const since = new Date(); since.setMonth(since.getMonth()-6); return Farmer.aggregate([{ $match:{ createdAt:{ $gte:since } } },{ $group:{ _id:{ $dateToString:{ format:'%Y-%m', date:'$createdAt' } }, count:{ $sum:1 } } },{ $sort:{ _id:1 } }]); }
  private async calcFulfillmentRate(since: Date) { const [c,t] = await Promise.all([Order.countDocuments({ createdAt:{ $gte:since }, status:{ $in:['completed','delivered'] } }), Order.countDocuments({ createdAt:{ $gte:since } })]); return t>0?(c/t)*100:0; }
  private async calcAvgTimeToSale(since: Date) { const r = await Listing.aggregate([{ $match:{ createdAt:{ $gte:since }, status:'sold' } },{ $lookup:{ from:'orders', localField:'_id', foreignField:'listing', as:'o' } },{ $unwind:'$o' },{ $project:{ days:{ $divide:[{ $subtract:['$o.createdAt','$createdAt'] },86400000] } } },{ $group:{ _id:null, avg:{ $avg:'$days' } } }]); return r[0]?.avg??0; }
  private async calcReturnBuyerRate(since: Date) { const b = await Order.aggregate([{ $match:{ createdAt:{ $gte:since } } },{ $group:{ _id:'$buyer', n:{ $sum:1 } } }]); const ret = b.filter(x=>x.n>1).length; return b.length>0?(ret/b.length)*100:0; }

  private assertChartAccess(chart: IChartMongoDocument, ctx: IQueryContext): void {
    if (ctx.scope===AccessScope.PLATFORM_ADMIN||chart.ownerId.toString()===ctx.userId||chart.shareScope===ShareScope.PUBLIC||chart.isTemplate) return;
    if (chart.shareScope===ShareScope.ORG_MEMBERS&&ctx.orgId&&chart.orgId?.toString()===ctx.orgId) return;
    if (chart.shareScope===ShareScope.SPECIFIC_ROLES&&chart.sharedWithRoles?.includes(ctx.userRole)) return;
    if (chart.shareScope===ShareScope.SPECIFIC_USERS&&chart.sharedWithUsers?.some(u=>u.toString()===ctx.userId)) return;
    throw new ForbiddenError('Access denied to this chart');
  }

  private assertDashboardRead(d: IDashboardMongoDocument, ctx: IQueryContext): void {
    if (ctx.scope===AccessScope.PLATFORM_ADMIN||d.ownerId.toString()===ctx.userId||d.isTemplate||d.sharing.scope===ShareScope.PUBLIC) return;
    if (d.sharing.scope===ShareScope.ORG_MEMBERS&&ctx.orgId&&d.orgId?.toString()===ctx.orgId) return;
    if (d.sharing.scope===ShareScope.SPECIFIC_ROLES&&d.sharing.roles?.includes(ctx.userRole)) return;
    if (d.sharing.scope===ShareScope.SPECIFIC_USERS&&d.sharing.userIds?.some(u=>u.toString()===ctx.userId)) return;
    throw new ForbiddenError('Access denied to this dashboard');
  }

  private assertDashboardWrite(d: IDashboardMongoDocument, ctx: IQueryContext): void {
    if (ctx.scope===AccessScope.PLATFORM_ADMIN||d.ownerId.toString()===ctx.userId) return;
    throw new ForbiddenError('Only the dashboard owner can modify it');
  }
}

export { AnalyticsService };
export default new AnalyticsService();
