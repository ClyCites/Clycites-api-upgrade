/**
 * Analytics Dataset Registry Service
 *
 * Provides the semantic analytics layer: a controlled, safe catalogue of
 * approved datasets with RBAC, tenant isolation rules, and privacy thresholds.
 * Users build charts only from datasets listed here — never raw DB access.
 */

import {
  DatasetId,
  MetricType,
  DimensionType,
  IDatasetDefinition,
  IQueryContext,
  AccessScope,
} from './analytics.types';
import { ForbiddenError, BadRequestError } from '../../common/errors/AppError';

// ═══════════════════════════════════════════════════════════════════════════
// DATASET REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

const ALL_TIME_DIMENSIONS = [
  DimensionType.TIME_DAY,
  DimensionType.TIME_WEEK,
  DimensionType.TIME_MONTH,
  DimensionType.TIME_QUARTER,
  DimensionType.TIME_YEAR,
];

const ALL_GEO_DIMENSIONS = [
  DimensionType.REGION,
  DimensionType.DISTRICT,
  DimensionType.COUNTRY,
];

const SCALAR_METRICS = [
  MetricType.COUNT,
  MetricType.SUM,
  MetricType.AVG,
  MetricType.MIN,
  MetricType.MAX,
  MetricType.PERCENT_CHANGE,
  MetricType.ROLLING_AVG_7D,
  MetricType.ROLLING_AVG_30D,
  MetricType.DISTINCT_COUNT,
];

const DATASET_REGISTRY: Record<DatasetId, IDatasetDefinition> = {
  // ── e-Market ──────────────────────────────────────────────────────────────
  [DatasetId.MARKET_SALES_DAILY]: {
    id:          DatasetId.MARKET_SALES_DAILY,
    label:       'Market Sales (Daily)',
    description: 'Daily order completions with revenue, quantity, and product info',
    domain:      'market' as any,
    collection:  'orders',
    fields: [
      { name: 'finalAmount',          type: 'number', description: 'Final order amount',      filterable: true,  sortable: true  },
      { name: 'quantity',             type: 'number', description: 'Quantity ordered',        filterable: true,  sortable: true  },
      { name: 'unitPrice',            type: 'number', description: 'Unit price at purchase',  filterable: false, sortable: true  },
      { name: 'status',               type: 'string', description: 'Order status',            filterable: true,  sortable: false },
      { name: 'deliveryAddress.region', type: 'string', description: 'Buyer region',          filterable: true,  sortable: false },
      { name: 'createdAt',            type: 'date',   description: 'Order date',              filterable: true,  sortable: true  },
    ],
    metrics:    SCALAR_METRICS,
    dimensions: [...ALL_TIME_DIMENSIONS, ...ALL_GEO_DIMENSIONS, DimensionType.PRODUCT, DimensionType.CATEGORY, DimensionType.STATUS],
    permissions: { allowedRoles: ['farmer', 'buyer', 'admin', 'platform_admin', 'super_admin', 'org_admin'], requiresOrgId: false, requiresFarmerId: false, allowGlobal: true, privacyThreshold: 0 },
  },

  [DatasetId.MARKET_LISTINGS_ACTIVITY]: {
    id:          DatasetId.MARKET_LISTINGS_ACTIVITY,
    label:       'Listings Activity',
    description: 'Listing volume, status transitions, and time-to-sell',
    domain:      'market' as any,
    collection:  'listings',
    fields: [
      { name: 'status',        type: 'string',  description: 'Listing status',   filterable: true,  sortable: false },
      { name: 'price',         type: 'number',  description: 'Listing price',    filterable: true,  sortable: true  },
      { name: 'quantity',      type: 'number',  description: 'Listed quantity',  filterable: false, sortable: true  },
      { name: 'location.region', type: 'string', description: 'Listing region', filterable: true,  sortable: false },
      { name: 'createdAt',     type: 'date',    description: 'Listed date',      filterable: true,  sortable: true  },
    ],
    metrics:    SCALAR_METRICS,
    dimensions: [...ALL_TIME_DIMENSIONS, DimensionType.REGION, DimensionType.STATUS, DimensionType.PRODUCT, DimensionType.CATEGORY],
    permissions: { allowedRoles: ['farmer', 'admin', 'platform_admin', 'super_admin', 'org_admin'], requiresOrgId: false, requiresFarmerId: false, allowGlobal: true, privacyThreshold: 0 },
  },

  [DatasetId.MARKET_PRICE_TRENDS]: {
    id:          DatasetId.MARKET_PRICE_TRENDS,
    label:       'Price Trends',
    description: 'Price volatility and trend analysis across products and regions',
    domain:      'market' as any,
    collection:  'listings',
    fields: [
      { name: 'price',           type: 'number', description: 'Price',   filterable: true, sortable: true },
      { name: 'location.region', type: 'string', description: 'Region',  filterable: true, sortable: false },
      { name: 'createdAt',       type: 'date',   description: 'Date',    filterable: true, sortable: true },
    ],
    metrics:    [MetricType.AVG, MetricType.MIN, MetricType.MAX, MetricType.PERCENT_CHANGE, MetricType.ROLLING_AVG_7D, MetricType.ROLLING_AVG_30D],
    dimensions: [...ALL_TIME_DIMENSIONS, DimensionType.REGION, DimensionType.PRODUCT, DimensionType.CATEGORY],
    permissions: { allowedRoles: ['farmer', 'buyer', 'admin', 'platform_admin', 'super_admin', 'org_admin', 'expert'], requiresOrgId: false, requiresFarmerId: false, allowGlobal: true, privacyThreshold: 0 },
  },

  [DatasetId.MARKET_DEMAND_SUPPLY]: {
    id:          DatasetId.MARKET_DEMAND_SUPPLY,
    label:       'Demand vs Supply',
    description: 'Comparative demand (orders) vs supply (listings) signals per product/region',
    domain:      'market' as any,
    collection:  'orders',
    fields: [
      { name: 'quantity', type: 'number', description: 'Quantity', filterable: false, sortable: true },
      { name: 'deliveryAddress.region', type: 'string', description: 'Region', filterable: true, sortable: false },
    ],
    metrics:    [MetricType.COUNT, MetricType.SUM, MetricType.AVG],
    dimensions: [...ALL_TIME_DIMENSIONS, DimensionType.REGION, DimensionType.PRODUCT],
    permissions: { allowedRoles: ['farmer', 'admin', 'platform_admin', 'super_admin', 'org_admin'], requiresOrgId: false, requiresFarmerId: false, allowGlobal: true, privacyThreshold: 5 },
  },

  // ── Farmers & Adoption ────────────────────────────────────────────────────
  [DatasetId.FARMER_ADOPTION]: {
    id:          DatasetId.FARMER_ADOPTION,
    label:       'Farmer Adoption Funnel',
    description: 'Farmer registration, verification, and platform activation rates',
    domain:      'farmer' as any,
    collection:  'farmers',
    fields: [
      { name: 'verified',         type: 'boolean', description: 'Verification status', filterable: true, sortable: false },
      { name: 'location.region',  type: 'string',  description: 'Region',             filterable: true, sortable: false },
      { name: 'location.district',type: 'string',  description: 'District',           filterable: true, sortable: false },
      { name: 'farmingType',      type: 'string',  description: 'Farming type',       filterable: true, sortable: false },
      { name: 'createdAt',        type: 'date',    description: 'Registration date',  filterable: true, sortable: true  },
    ],
    metrics:    [MetricType.COUNT, MetricType.DISTINCT_COUNT],
    dimensions: [...ALL_TIME_DIMENSIONS, DimensionType.REGION, DimensionType.DISTRICT, DimensionType.STATUS],
    permissions: { allowedRoles: ['admin', 'platform_admin', 'super_admin', 'org_admin'], requiresOrgId: false, requiresFarmerId: false, allowGlobal: true, privacyThreshold: 5 },
  },

  [DatasetId.FARMER_PROFILES]: {
    id:         DatasetId.FARMER_PROFILES,
    label:      'Farmer Profiles',
    description: 'Farm distribution by type, size, and location',
    domain:     'farmer' as any,
    collection: 'farmers',
    fields: [
      { name: 'farmSize',         type: 'number', description: 'Farm size',     filterable: true, sortable: true  },
      { name: 'farmingType',      type: 'string', description: 'Farming type',  filterable: true, sortable: false },
      { name: 'location.region',  type: 'string', description: 'Region',       filterable: true, sortable: false },
      { name: 'createdAt',        type: 'date',   description: 'Profile date',  filterable: true, sortable: true  },
    ],
    metrics:    [MetricType.COUNT, MetricType.AVG, MetricType.SUM],
    dimensions: [...ALL_TIME_DIMENSIONS, DimensionType.REGION, DimensionType.DISTRICT],
    permissions: { allowedRoles: ['admin', 'platform_admin', 'super_admin', 'org_admin'], requiresOrgId: false, requiresFarmerId: false, allowGlobal: true, privacyThreshold: 5 },
  },

  [DatasetId.FARM_PRODUCTION]: {
    id:          DatasetId.FARM_PRODUCTION,
    label:       'Farm Production Logs',
    description: 'Crop/livestock production records',
    domain:      'farmer' as any,
    collection:  'farmproductions',
    fields: [
      { name: 'quantityProduced', type: 'number', description: 'Production volume', filterable: false, sortable: true },
      { name: 'cropType',         type: 'string', description: 'Crop type',         filterable: true,  sortable: false },
      { name: 'season',           type: 'string', description: 'Season',            filterable: true,  sortable: false },
      { name: 'recordedAt',       type: 'date',   description: 'Record date',       filterable: true,  sortable: true },
    ],
    metrics:    [MetricType.COUNT, MetricType.SUM, MetricType.AVG],
    dimensions: [...ALL_TIME_DIMENSIONS, DimensionType.REGION, DimensionType.CROP_TYPE],
    permissions: { allowedRoles: ['farmer', 'admin', 'platform_admin', 'super_admin', 'org_admin'], requiresOrgId: false, requiresFarmerId: true, allowGlobal: false, privacyThreshold: 0 },
  },

  // ── Pest & Disease ─────────────────────────────────────────────────────────
  [DatasetId.DISEASE_CASES_WEEKLY]: {
    id:          DatasetId.DISEASE_CASES_WEEKLY,
    label:       'Disease Cases (Weekly)',
    description: 'Pest and disease detection cases aggregated weekly by region and crop',
    domain:      'disease' as any,
    collection:  'pestdiseasereports',
    fields: [
      { name: 'detection.name',          type: 'string',  description: 'Disease/pest name',    filterable: true,  sortable: false },
      { name: 'detection.type',          type: 'string',  description: 'Detection type',       filterable: true,  sortable: false },
      { name: 'detection.severity',      type: 'string',  description: 'Severity',             filterable: true,  sortable: false },
      { name: 'detection.confidence',    type: 'number',  description: 'AI confidence score',  filterable: true,  sortable: true  },
      { name: 'fieldContext.cropType',   type: 'string',  description: 'Crop type',            filterable: true,  sortable: false },
      { name: 'location.region',         type: 'string',  description: 'Region',               filterable: true,  sortable: false },
      { name: 'location.district',       type: 'string',  description: 'District',             filterable: true,  sortable: false },
      { name: 'status',                  type: 'string',  description: 'Report status',        filterable: true,  sortable: false },
      { name: 'createdAt',               type: 'date',    description: 'Detection date',       filterable: true,  sortable: true  },
    ],
    metrics:    [MetricType.COUNT, MetricType.DISTINCT_COUNT, MetricType.RATE],
    dimensions: [...ALL_TIME_DIMENSIONS, DimensionType.REGION, DimensionType.DISTRICT, DimensionType.CROP_TYPE, DimensionType.STATUS, DimensionType.SEVERITY],
    permissions: { allowedRoles: ['farmer', 'expert', 'admin', 'platform_admin', 'super_admin', 'org_admin'], requiresOrgId: false, requiresFarmerId: false, allowGlobal: true, privacyThreshold: 3 },
  },

  [DatasetId.DISEASE_AI_PERFORMANCE]: {
    id:          DatasetId.DISEASE_AI_PERFORMANCE,
    label:       'AI Detection Performance',
    description: 'AI confidence distribution, expert correction rates, model accuracy',
    domain:      'disease' as any,
    collection:  'pestdiseasereports',
    fields: [
      { name: 'detection.confidence',  type: 'number', description: 'AI confidence', filterable: true, sortable: true },
      { name: 'expertReview.decision', type: 'string', description: 'Expert verdict', filterable: true, sortable: false },
      { name: 'createdAt',             type: 'date',   description: 'Detection date', filterable: true, sortable: true },
    ],
    metrics:    [MetricType.COUNT, MetricType.AVG, MetricType.MIN, MetricType.MAX, MetricType.RATE],
    dimensions: [...ALL_TIME_DIMENSIONS, DimensionType.STATUS],
    permissions: { allowedRoles: ['expert', 'admin', 'platform_admin', 'super_admin'], requiresOrgId: false, requiresFarmerId: false, allowGlobal: true, privacyThreshold: 0 },
  },

  [DatasetId.DISEASE_OUTBREAKS]: {
    id:          DatasetId.DISEASE_OUTBREAKS,
    label:       'Outbreak Intelligence',
    description: 'Regional outbreak trends, heatmaps, and severity distribution',
    domain:      'disease' as any,
    collection:  'regionaloutbreaks',
    fields: [
      { name: 'diseaseName',  type: 'string', description: 'Disease',       filterable: true, sortable: false },
      { name: 'region',       type: 'string', description: 'Region',        filterable: true, sortable: false },
      { name: 'severity',     type: 'string', description: 'Severity',      filterable: true, sortable: false },
      { name: 'caseCount',    type: 'number', description: 'Case count',    filterable: false, sortable: true },
      { name: 'reportedAt',   type: 'date',   description: 'Report date',   filterable: true, sortable: true },
    ],
    metrics:    [MetricType.COUNT, MetricType.SUM, MetricType.AVG, MetricType.RATE],
    dimensions: [...ALL_TIME_DIMENSIONS, DimensionType.REGION, DimensionType.CROP_TYPE, DimensionType.SEVERITY],
    permissions: { allowedRoles: ['farmer', 'expert', 'admin', 'platform_admin', 'super_admin', 'org_admin'], requiresOrgId: false, requiresFarmerId: false, allowGlobal: true, privacyThreshold: 0 },
  },

  // ── Weather & Risk ─────────────────────────────────────────────────────────
  [DatasetId.WEATHER_ALERTS_DAILY]: {
    id:          DatasetId.WEATHER_ALERTS_DAILY,
    label:       'Weather Alerts (Daily)',
    description: 'Weather risk alerts triggered per farm/region per day',
    domain:      'weather' as any,
    collection:  'weatheralerts',
    fields: [
      { name: 'alertType',  type: 'string', description: 'Alert type',  filterable: true, sortable: false },
      { name: 'severity',   type: 'string', description: 'Severity',    filterable: true, sortable: false },
      { name: 'region',     type: 'string', description: 'Region',      filterable: true, sortable: false },
      { name: 'cropContext.cropType', type: 'string', description: 'Crop type', filterable: true, sortable: false },
      { name: 'createdAt',  type: 'date',   description: 'Alert date',  filterable: true, sortable: true },
    ],
    metrics:    [MetricType.COUNT, MetricType.RATE, MetricType.DISTINCT_COUNT],
    dimensions: [...ALL_TIME_DIMENSIONS, DimensionType.REGION, DimensionType.ALERT_TYPE, DimensionType.SEVERITY, DimensionType.CROP_TYPE],
    permissions: { allowedRoles: ['farmer', 'expert', 'admin', 'platform_admin', 'super_admin', 'org_admin'], requiresOrgId: false, requiresFarmerId: false, allowGlobal: true, privacyThreshold: 0 },
  },

  [DatasetId.WEATHER_RISK_TRENDS]: {
    id:          DatasetId.WEATHER_RISK_TRENDS,
    label:       'Weather Risk Trends',
    description: 'Drought, flood, heatwave risk scoring trends by region over time',
    domain:      'weather' as any,
    collection:  'weathersnapshots',
    fields: [
      { name: 'riskScore',   type: 'number', description: 'Risk score',  filterable: true, sortable: true },
      { name: 'riskType',    type: 'string', description: 'Risk type',   filterable: true, sortable: false },
      { name: 'region',      type: 'string', description: 'Region',      filterable: true, sortable: false },
      { name: 'recordedAt',  type: 'date',   description: 'Record date', filterable: true, sortable: true },
    ],
    metrics:    [MetricType.AVG, MetricType.MAX, MetricType.COUNT, MetricType.ROLLING_AVG_7D],
    dimensions: [...ALL_TIME_DIMENSIONS, DimensionType.REGION, DimensionType.ALERT_TYPE],
    permissions: { allowedRoles: ['farmer', 'expert', 'admin', 'platform_admin', 'super_admin'], requiresOrgId: false, requiresFarmerId: false, allowGlobal: true, privacyThreshold: 0 },
  },

  // ── Orders & Disputes ──────────────────────────────────────────────────────
  [DatasetId.ORDERS_PERFORMANCE]: {
    id:          DatasetId.ORDERS_PERFORMANCE,
    label:       'Orders Performance',
    description: 'Order volumes, delivery timelines, and fulfilment rates',
    domain:      'order' as any,
    collection:  'orders',
    fields: [
      { name: 'status',                type: 'string',  description: 'Status',         filterable: true, sortable: false },
      { name: 'finalAmount',           type: 'number',  description: 'Order value',    filterable: true, sortable: true  },
      { name: 'deliveryAddress.region',type: 'string',  description: 'Region',         filterable: true, sortable: false },
      { name: 'deliveryOption',        type: 'string',  description: 'Delivery type',  filterable: true, sortable: false },
      { name: 'createdAt',             type: 'date',    description: 'Order date',     filterable: true, sortable: true  },
    ],
    metrics:    SCALAR_METRICS,
    dimensions: [...ALL_TIME_DIMENSIONS, DimensionType.REGION, DimensionType.STATUS],
    permissions: { allowedRoles: ['farmer', 'admin', 'platform_admin', 'super_admin', 'org_admin'], requiresOrgId: false, requiresFarmerId: false, allowGlobal: true, privacyThreshold: 0 },
  },

  [DatasetId.ORDERS_DISPUTES]: {
    id:          DatasetId.ORDERS_DISPUTES,
    label:       'Disputes & Resolution',
    description: 'Dispute rate, reasons, resolution outcomes, and time-to-resolution',
    domain:      'dispute' as any,
    collection:  'disputes',
    fields: [
      { name: 'reason',    type: 'string', description: 'Dispute reason',     filterable: true, sortable: false },
      { name: 'status',    type: 'string', description: 'Dispute status',     filterable: true, sortable: false },
      { name: 'createdAt', type: 'date',   description: 'Dispute date',       filterable: true, sortable: true  },
      { name: 'closedAt',  type: 'date',   description: 'Resolution date',    filterable: true, sortable: true  },
    ],
    metrics:    [MetricType.COUNT, MetricType.RATE, MetricType.AVG],
    dimensions: [...ALL_TIME_DIMENSIONS, DimensionType.REGION, DimensionType.STATUS],
    permissions: { allowedRoles: ['admin', 'platform_admin', 'super_admin', 'org_admin'], requiresOrgId: false, requiresFarmerId: false, allowGlobal: true, privacyThreshold: 0 },
  },

  // ── Expert & Advisory ──────────────────────────────────────────────────────
  [DatasetId.EXPERT_ACTIVITY]: {
    id:          DatasetId.EXPERT_ACTIVITY,
    label:       'Expert Activity',
    description: 'Case review throughput, response times, and expert engagement metrics',
    domain:      'expert' as any,
    collection:  'caseassignments',
    fields: [
      { name: 'status',      type: 'string', description: 'Case status',       filterable: true, sortable: false },
      { name: 'createdAt',   type: 'date',   description: 'Assignment date',   filterable: true, sortable: true  },
    ],
    metrics:    [MetricType.COUNT, MetricType.AVG, MetricType.RATE, MetricType.DISTINCT_COUNT],
    dimensions: [...ALL_TIME_DIMENSIONS, DimensionType.STATUS, DimensionType.EXPERT],
    permissions: { allowedRoles: ['expert', 'admin', 'platform_admin', 'super_admin'], requiresOrgId: false, requiresFarmerId: false, allowGlobal: true, privacyThreshold: 0 },
  },

  [DatasetId.ADVISORY_ENGAGEMENT]: {
    id:          DatasetId.ADVISORY_ENGAGEMENT,
    label:       'Advisory Engagement',
    description: 'Advisory reach, read rates, and farmer inquiry volumes',
    domain:      'advisory' as any,
    collection:  'advisories',
    fields: [
      { name: 'type',           type: 'string', description: 'Advisory type', filterable: true, sortable: false },
      { name: 'urgency',        type: 'string', description: 'Urgency level', filterable: true, sortable: false },
      { name: 'targetRegions',  type: 'string', description: 'Target region', filterable: true, sortable: false },
      { name: 'createdAt',      type: 'date',   description: 'Published date', filterable: true, sortable: true },
    ],
    metrics:    [MetricType.COUNT, MetricType.RATE, MetricType.DISTINCT_COUNT],
    dimensions: [...ALL_TIME_DIMENSIONS, DimensionType.REGION, DimensionType.STATUS],
    permissions: { allowedRoles: ['expert', 'admin', 'platform_admin', 'super_admin', 'org_admin', 'farmer'], requiresOrgId: false, requiresFarmerId: false, allowGlobal: true, privacyThreshold: 0 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════

export class AnalyticsDatasetService {

  /** Return all datasets the caller is allowed to see */
  getAccessibleDatasets(ctx: IQueryContext): IDatasetDefinition[] {
    return Object.values(DATASET_REGISTRY).filter(ds =>
      ds.permissions.allowedRoles.includes(ctx.userRole) ||
      ctx.scope === AccessScope.PLATFORM_ADMIN
    );
  }

  /** Get one dataset and enforce access */
  getDataset(datasetId: DatasetId, ctx: IQueryContext): IDatasetDefinition {
    const ds = DATASET_REGISTRY[datasetId];
    if (!ds) throw new BadRequestError(`Unknown dataset: ${datasetId}`);
    if (
      !ds.permissions.allowedRoles.includes(ctx.userRole) &&
      ctx.scope !== AccessScope.PLATFORM_ADMIN
    ) {
      throw new ForbiddenError(`Access denied to dataset: ${datasetId}`);
    }
    return ds;
  }

  /** Fully validate a chart definition against registry rules */
  validateDefinition(
    definition: { datasetId: DatasetId; metrics: { type: MetricType; field: string }[]; dimensions: { type: DimensionType; field: string }[] },
    ctx: IQueryContext
  ): IDatasetDefinition {
    const ds = this.getDataset(definition.datasetId, ctx);

    // Validate metrics
    for (const m of definition.metrics) {
      if (!ds.metrics.includes(m.type)) {
        throw new BadRequestError(
          `Metric '${m.type}' is not allowed for dataset '${definition.datasetId}'. ` +
          `Allowed: ${ds.metrics.join(', ')}`
        );
      }
      const fieldDef = ds.fields.find(f => f.name === m.field);
      if (!fieldDef) {
        throw new BadRequestError(`Field '${m.field}' is not in dataset '${definition.datasetId}'`);
      }
    }

    // Validate dimensions
    for (const d of definition.dimensions) {
      if (!ds.dimensions.includes(d.type)) {
        throw new BadRequestError(
          `Dimension '${d.type}' is not allowed for dataset '${definition.datasetId}'`
        );
      }
    }

    // FARMER scope: requiresFarmerId — must filter to own data
    if (ds.permissions.requiresFarmerId && !ctx.farmerId) {
      if (ctx.scope !== AccessScope.PLATFORM_ADMIN) {
        throw new ForbiddenError(`Dataset '${definition.datasetId}' requires farmer context`);
      }
    }

    return ds;
  }

  getRegistry(): Record<DatasetId, IDatasetDefinition> {
    return DATASET_REGISTRY;
  }
}

export const analyticsDatasetService = new AnalyticsDatasetService();
export default analyticsDatasetService;
