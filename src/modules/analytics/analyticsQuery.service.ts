/**
 * Analytics Query Engine
 *
 * Translates a validated IChartDefinition into a safe MongoDB aggregation,
 * enforces tenant isolation and privacy thresholds, handles caching,
 * and returns normalized IQueryResult objects.
 *
 * Redis caching: keys are SHA-256 of (definition + context).
 * Cache TTL: 5 min for real-time queries, 30 min for aggregated.
 */

import crypto from 'crypto';
import mongoose from 'mongoose';
import {
  IChartDefinition,
  IQueryContext,
  IQueryResult,
  DatasetId,
  MetricType,
  DimensionType,
  FilterOperator,
  AccessScope,
  AggregationWindow,
} from './analytics.types';
import { analyticsDatasetService } from './analyticsDataset.service';
import AggregatedMetric from './analyticsMetric.model';
import logger from '../../common/utils/logger';
import { BadRequestError } from '../../common/errors/AppError';

// ── Inlined simple cache (Redis-ready interface) ───────────────────────────
// Replace with ioredis when Redis is available; interface stays the same.
const memCache = new Map<string, { value: unknown; expiresAt: number }>();

function cacheGet(key: string): unknown | null {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { memCache.delete(key); return null; }
  return entry.value;
}

function cacheSet(key: string, value: unknown, ttlSeconds: number): void {
  memCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

// Clean up expired cache entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of memCache.entries()) {
    if (now > v.expiresAt) memCache.delete(k);
  }
}, 10 * 60 * 1000).unref();

// ── Dimension → MongoDB field mapping ─────────────────────────────────────
const DIMENSION_FIELD_MAP: Partial<Record<DimensionType, string>> = {
  [DimensionType.REGION]:        'location.region',
  [DimensionType.DISTRICT]:      'location.district',
  [DimensionType.COUNTRY]:       'location.country',
  [DimensionType.CROP_TYPE]:     'fieldContext.cropType',
  [DimensionType.STATUS]:        'status',
  [DimensionType.SEVERITY]:      'detection.severity',
  [DimensionType.ALERT_TYPE]:    'alertType',
  [DimensionType.PRODUCT]:       'product',
  [DimensionType.CATEGORY]:      'category',
  [DimensionType.ORGANIZATION]:  'orgId',
  [DimensionType.FARMER]:        'farmerId',
  [DimensionType.EXPERT]:        'expertId',
  [DimensionType.MARKET]:        'market',
};

// ── Privacy threshold ─────────────────────────────────────────────────────
const PRIVACY_K = 5; // minimum group size — groups smaller than this are redacted

// ═══════════════════════════════════════════════════════════════════════════
// QUERY ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export class AnalyticsQueryEngine {

  /**
   * Execute a chart definition query with full safety and caching.
   */
  async execute(def: IChartDefinition, ctx: IQueryContext): Promise<IQueryResult> {
    const start = Date.now();

    // 1. Validate definition against registry
    const dataset = analyticsDatasetService.validateDefinition(def, ctx);

    // 2. Build cache key
    const cacheKey = this.buildCacheKey(def, ctx);
    const cached = cacheGet(cacheKey);
    if (cached) {
      return {
        data:         cached as Record<string, unknown>[],
        fromCache:    true,
        executedInMs: Date.now() - start,
        truncated:    false,
        cacheKey,
      };
    }

    // 3. Determine if we can serve from pre-aggregated store
    const canUseAggregated = this.canServeFromAggregated(def);

    let data: Record<string, unknown>[];
    if (canUseAggregated) {
      data = await this.queryAggregatedStore(def, ctx);
    } else {
      data = await this.queryLiveCollection(def, dataset, ctx);
    }

    // 4. Apply privacy threshold (k-anonymity-style)
    const { filtered, truncated } = this.applyPrivacyThreshold(
      data,
      dataset.permissions.privacyThreshold || PRIVACY_K,
      ctx
    );

    // 5. Cache result
    const ttl = canUseAggregated ? 1800 : 300;
    cacheSet(cacheKey, filtered, ttl);

    return {
      data:         filtered,
      total:        filtered.length,
      fromCache:    false,
      executedInMs: Date.now() - start,
      truncated,
      cacheKey,
    };
  }

  // ── Live collection query (MongoDB aggregation) ──────────────────────────

  private async queryLiveCollection(
    def:     IChartDefinition,
    dataset: { collection: string; permissions: { requiresFarmerId: boolean; requiresOrgId: boolean; allowGlobal: boolean; privacyThreshold: number } },
    ctx:     IQueryContext
  ): Promise<Record<string, unknown>[]> {
    const pipeline: mongoose.PipelineStage[] = [];

    // --- $match: tenant isolation + filters + time range ---
    const matchStage: Record<string, unknown> = {};

    // Tenant isolation
    if (ctx.scope === AccessScope.PERSONAL && ctx.farmerId) {
      matchStage['farmerId'] = new mongoose.Types.ObjectId(ctx.farmerId);
    } else if (ctx.scope === AccessScope.ORGANIZATION && ctx.orgId) {
      matchStage['orgId'] = new mongoose.Types.ObjectId(ctx.orgId);
    }
    // PLATFORM_ADMIN: no tenant filter

    // Time range
    if (def.timeRange) {
      matchStage['createdAt'] = {
        $gte: def.timeRange.from,
        $lte: def.timeRange.to,
      };
    }

    // Explicit filters
    for (const f of def.filters) {
      matchStage[f.field] = this.buildFilterExpression(f.operator, f.value as never, f.field);
    }

    pipeline.push({ $match: matchStage });

    // --- $group: dimensions + metrics ---
    const groupId: Record<string, unknown> = {};
    for (const dim of def.dimensions) {
      const fieldPath = DIMENSION_FIELD_MAP[dim.type] ?? dim.field;
      if ([
        DimensionType.TIME_HOUR, DimensionType.TIME_DAY, DimensionType.TIME_WEEK,
        DimensionType.TIME_MONTH, DimensionType.TIME_QUARTER, DimensionType.TIME_YEAR,
      ].includes(dim.type)) {
        groupId['_time'] = this.buildDateGroupExpr(dim.type, dim.field);
      } else {
        groupId[dim.type] = `$${fieldPath}`;
      }
    }

    const groupAccumulators: Record<string, unknown> = {};
    for (const metric of def.metrics) {
      const alias = metric.alias ?? `${metric.type}_${metric.field}`.replace(/\./g, '_');
      groupAccumulators[alias] = this.buildAccumulator(metric.type, metric.field);
    }

    pipeline.push({ $group: { _id: groupId, ...groupAccumulators } });

    // --- $sort ---
    const sortStage: Record<string, 1 | -1> = {};
    for (const s of (def.sort ?? [])) {
      sortStage[s.field] = s.direction === 'asc' ? 1 : -1;
    }
    if (Object.keys(sortStage).length) {
      pipeline.push({ $sort: sortStage });
    }

    // --- $limit ---
    const limit = def.vizOptions?.limit ?? 500;
    pipeline.push({ $limit: Math.min(limit, 1000) }); // hard cap

    // --- Execute ---
    const collection = mongoose.connection.collection(dataset.collection);
    const results = await collection.aggregate(pipeline, { allowDiskUse: true }).toArray();
    return results as Record<string, unknown>[];
  }

  // ── Pre-aggregated store query ─────────────────────────────────────────────

  private async queryAggregatedStore(
    def: IChartDefinition,
    ctx: IQueryContext
  ): Promise<Record<string, unknown>[]> {
    const filter: Record<string, unknown> = { dataset: def.datasetId };

    if (def.dimensions.length) {
      const primaryDim = def.dimensions[0];
      filter['dimension'] = primaryDim.type;
    }

    const window = this.inferAggregationWindow(def);
    filter['window'] = window;

    if (def.timeRange) {
      filter['windowStart'] = { $gte: def.timeRange.from };
      filter['windowEnd']   = { $lte: def.timeRange.to };
    }

    if (ctx.orgId)    filter['orgId']    = new mongoose.Types.ObjectId(ctx.orgId);
    if (ctx.farmerId) filter['farmerId'] = new mongoose.Types.ObjectId(ctx.farmerId);

    const rows = await AggregatedMetric.find(filter)
      .sort({ windowStart: 1 })
      .limit(1000)
      .lean();

    return rows as unknown as Record<string, unknown>[];
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private buildFilterExpression(op: FilterOperator, value: unknown, _field: string): unknown {
    switch (op) {
      case FilterOperator.EQ:       return value;
      case FilterOperator.NEQ:      return { $ne: value };
      case FilterOperator.GT:       return { $gt: value };
      case FilterOperator.GTE:      return { $gte: value };
      case FilterOperator.LT:       return { $lt: value };
      case FilterOperator.LTE:      return { $lte: value };
      case FilterOperator.IN:       return { $in: value };
      case FilterOperator.NOT_IN:   return { $nin: value };
      case FilterOperator.BETWEEN: {
        const [lo, hi] = value as [unknown, unknown];
        return { $gte: lo, $lte: hi };
      }
      case FilterOperator.CONTAINS: return { $regex: value, $options: 'i' };
      default:
        throw new BadRequestError(`Unknown filter operator: ${op}`);
    }
  }

  private buildDateGroupExpr(dim: DimensionType, field: string): unknown {
    const f = `$${field}`;
    switch (dim) {
      case DimensionType.TIME_HOUR:    return { $dateToString: { format: '%Y-%m-%dT%H:00', date: f } };
      case DimensionType.TIME_DAY:     return { $dateToString: { format: '%Y-%m-%d', date: f } };
      case DimensionType.TIME_WEEK:    return { $dateToString: { format: '%G-W%V', date: f } };
      case DimensionType.TIME_MONTH:   return { $dateToString: { format: '%Y-%m', date: f } };
      case DimensionType.TIME_QUARTER: return {
        $concat: [
          { $toString: { $year: f } }, '-Q',
          { $toString: { $ceil: { $divide: [{ $month: f }, 3] } } },
        ],
      };
      case DimensionType.TIME_YEAR:    return { $dateToString: { format: '%Y', date: f } };
      default:                         return f;
    }
  }

  private buildAccumulator(metric: MetricType, field: string): unknown {
    const f = `$${field}`;
    switch (metric) {
      case MetricType.COUNT:           return { $sum: 1 };
      case MetricType.SUM:             return { $sum: f };
      case MetricType.AVG:             return { $avg: f };
      case MetricType.MIN:             return { $min: f };
      case MetricType.MAX:             return { $max: f };
      case MetricType.DISTINCT_COUNT:  return { $addToSet: f }; // post-process .length
      default:                         return { $sum: 1 };
    }
  }

  private canServeFromAggregated(def: IChartDefinition): boolean {
    // Only simple time-series with single dimension + single metric can use pre-aggregated store
    if (def.metrics.length !== 1 || def.dimensions.length !== 1) return false;
    const isTimeDim = [
      DimensionType.TIME_DAY, DimensionType.TIME_WEEK,
      DimensionType.TIME_MONTH, DimensionType.TIME_YEAR,
    ].includes(def.dimensions[0].type);
    const isSimpleMetric = [MetricType.COUNT, MetricType.SUM, MetricType.AVG].includes(def.metrics[0].type);
    return isTimeDim && isSimpleMetric;
  }

  private inferAggregationWindow(def: IChartDefinition): AggregationWindow {
    if (!def.dimensions.length) return AggregationWindow.DAILY;
    switch (def.dimensions[0].type) {
      case DimensionType.TIME_HOUR:    return AggregationWindow.HOURLY;
      case DimensionType.TIME_DAY:     return AggregationWindow.DAILY;
      case DimensionType.TIME_WEEK:    return AggregationWindow.WEEKLY;
      case DimensionType.TIME_MONTH:
      case DimensionType.TIME_QUARTER:
      case DimensionType.TIME_YEAR:    return AggregationWindow.MONTHLY;
      default:                         return AggregationWindow.DAILY;
    }
  }

  private applyPrivacyThreshold(
    data: Record<string, unknown>[],
    threshold: number,
    ctx: IQueryContext
  ): { filtered: Record<string, unknown>[]; truncated: boolean } {
    // Admins bypass privacy threshold
    if (ctx.scope === AccessScope.PLATFORM_ADMIN || threshold === 0) {
      return { filtered: data, truncated: false };
    }
    // Find the first numeric count-like field to evaluate group size
    const filtered = data.filter(row => {
      const countField = Object.keys(row).find(k => k.startsWith('count_') || k === 'count');
      if (!countField) return true; // can't determine — allow
      return (row[countField] as number) >= threshold;
    });
    return { filtered, truncated: filtered.length < data.length };
  }

  private buildCacheKey(def: IChartDefinition, ctx: IQueryContext): string {
    const payload = JSON.stringify({
      def,
      userId:   ctx.userId,
      orgId:    ctx.orgId ?? null,
      farmerId: ctx.farmerId ?? null,
      scope:    ctx.scope,
    });
    return 'aq:' + crypto.createHash('sha256').update(payload).digest('hex').slice(0, 32);
  }

  /** Invalidate all cache entries for a given dataset (call after data updates) */
  invalidateDataset(datasetId: DatasetId): void {
    // With Redis: SCAN + DEL by pattern `aq:*${datasetId}*`
    // With memCache: full scan
    logger.debug(`Cache invalidation triggered for dataset: ${datasetId}`);
    memCache.clear(); // simple approach — fine for small memcache
  }
}

export const analyticsQueryEngine = new AnalyticsQueryEngine();
export default analyticsQueryEngine;
