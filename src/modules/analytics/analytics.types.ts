/**
 * Analytics & Reporting Module — Types
 *
 * Central type system for the semantic analytics layer, chart builder,
 * dashboard engine, event store, and multi-tenant access control.
 */

import { Types } from 'mongoose';

// ═══════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════

/** Curated, safe datasets exposed through the semantic layer */
export enum DatasetId {
  // e-Market
  MARKET_SALES_DAILY       = 'market_sales_daily',
  MARKET_LISTINGS_ACTIVITY = 'market_listings_activity',
  MARKET_PRICE_TRENDS      = 'market_price_trends',
  MARKET_DEMAND_SUPPLY     = 'market_demand_supply',
  // Farmers & Adoption
  FARMER_ADOPTION          = 'farmer_adoption',
  FARMER_PROFILES          = 'farmer_profiles',
  FARM_PRODUCTION          = 'farm_production',
  // Pest & Disease
  DISEASE_CASES_WEEKLY     = 'disease_cases_weekly',
  DISEASE_AI_PERFORMANCE   = 'disease_ai_performance',
  DISEASE_OUTBREAKS        = 'disease_outbreaks',
  // Weather & Risk
  WEATHER_ALERTS_DAILY     = 'weather_alerts_daily',
  WEATHER_RISK_TRENDS      = 'weather_risk_trends',
  // Orders & Logistics
  ORDERS_PERFORMANCE       = 'orders_performance',
  ORDERS_DISPUTES          = 'orders_disputes',
  // Advisory & Expert
  EXPERT_ACTIVITY          = 'expert_activity',
  ADVISORY_ENGAGEMENT      = 'advisory_engagement',
}

/** Supported metric aggregation functions */
export enum MetricType {
  COUNT           = 'count',
  SUM             = 'sum',
  AVG             = 'avg',
  MIN             = 'min',
  MAX             = 'max',
  PERCENT_CHANGE  = 'percent_change',
  ROLLING_AVG_7D  = 'rolling_avg_7d',
  ROLLING_AVG_30D = 'rolling_avg_30d',
  DISTINCT_COUNT  = 'distinct_count',
  RATE            = 'rate',
}

/** Dimensions users can slice data by */
export enum DimensionType {
  // Time
  TIME_HOUR    = 'time_hour',
  TIME_DAY     = 'time_day',
  TIME_WEEK    = 'time_week',
  TIME_MONTH   = 'time_month',
  TIME_QUARTER = 'time_quarter',
  TIME_YEAR    = 'time_year',
  // Geography
  REGION       = 'region',
  DISTRICT     = 'district',
  COUNTRY      = 'country',
  // Domain
  CROP_TYPE    = 'cropType',
  PRODUCT      = 'product',
  CATEGORY     = 'category',
  MARKET       = 'market',
  FARMER       = 'farmerId',
  ORGANIZATION = 'organizationId',
  STATUS       = 'status',
  SEVERITY     = 'severity',
  ALERT_TYPE   = 'alertType',
  EXPERT       = 'expertId',
}

/** Chart visualization types */
export enum ChartType {
  LINE         = 'line',
  BAR          = 'bar',
  STACKED_BAR  = 'stacked_bar',
  AREA         = 'area',
  PIE          = 'pie',
  DONUT        = 'donut',
  SCATTER      = 'scatter',
  MAP          = 'map',
  TABLE        = 'table',
  METRIC_CARD  = 'metric_card',
  HEATMAP      = 'heatmap',
  FUNNEL       = 'funnel',
}

/** Comparison operators for filters */
export enum FilterOperator {
  EQ           = 'eq',
  NEQ          = 'neq',
  GT           = 'gt',
  GTE          = 'gte',
  LT           = 'lt',
  LTE          = 'lte',
  IN           = 'in',
  NOT_IN       = 'not_in',
  BETWEEN      = 'between',
  CONTAINS     = 'contains',
}

/** Who can see a dashboard or chart */
export enum ShareScope {
  OWNER_ONLY       = 'owner_only',
  ORG_MEMBERS      = 'org_members',
  SPECIFIC_ROLES   = 'specific_roles',
  SPECIFIC_USERS   = 'specific_users',
  PUBLIC           = 'public',
}

/** Access scope for tenant isolation */
export enum AccessScope {
  PERSONAL       = 'personal',
  ORGANIZATION   = 'organization',
  PLATFORM_ADMIN = 'platform_admin',
}

/** Analytics event domains */
export enum EventDomain {
  FARMER     = 'farmer',
  FARM       = 'farm',
  MARKET     = 'market',
  ORDER      = 'order',
  DISPUTE    = 'dispute',
  DISEASE    = 'disease',
  WEATHER    = 'weather',
  EXPERT     = 'expert',
  ADVISORY   = 'advisory',
  USER       = 'user',
  PAYMENT    = 'payment',
}

/** Concrete event types */
export enum AnalyticsEventType {
  // Farmer
  FARMER_CREATED              = 'farmer.created',
  FARMER_VERIFIED             = 'farmer.verified',
  FARMER_UPDATED              = 'farmer.updated',
  FARM_CREATED                = 'farm.created',
  // Market
  LISTING_PUBLISHED           = 'listing.published',
  LISTING_SOLD                = 'listing.sold',
  OFFER_SENT                  = 'offer.sent',
  OFFER_ACCEPTED              = 'offer.accepted',
  // Orders
  ORDER_PLACED                = 'order.placed',
  ORDER_CONFIRMED             = 'order.confirmed',
  ORDER_DELIVERED             = 'order.delivered',
  ORDER_COMPLETED             = 'order.completed',
  ORDER_CANCELLED             = 'order.cancelled',
  DELIVERY_CONFIRMED          = 'delivery.confirmed',
  // Disputes
  DISPUTE_OPENED              = 'dispute.opened',
  DISPUTE_RESOLVED            = 'dispute.resolved',
  // Disease
  DISEASE_DETECTED            = 'disease.detected',
  DISEASE_REVIEWED            = 'disease.reviewed',
  DISEASE_CONFIRMED           = 'disease.confirmed',
  OUTBREAK_FLAGGED            = 'outbreak.flagged',
  // Weather
  WEATHER_ALERT_TRIGGERED     = 'weather.alert.triggered',
  WEATHER_ALERT_ACKNOWLEDGED  = 'weather.alert.acknowledged',
  // Advisory
  ADVISORY_PUBLISHED          = 'advisory.published',
  INQUIRY_SUBMITTED           = 'inquiry.submitted',
  INQUIRY_RESOLVED            = 'inquiry.resolved',
  // User
  USER_REGISTERED             = 'user.registered',
  USER_ACTIVATED              = 'user.activated',
}

/** Pre-aggregation time window keys */
export enum AggregationWindow {
  HOURLY    = 'hourly',
  DAILY     = 'daily',
  WEEKLY    = 'weekly',
  MONTHLY   = 'monthly',
}

// ═══════════════════════════════════════════════════════════════════════════
// DATASET REGISTRY TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface IDatasetField {
  name:        string;
  type:        'string' | 'number' | 'date' | 'boolean' | 'objectId';
  description: string;
  filterable:  boolean;
  sortable:    boolean;
}

export interface IDatasetPermission {
  allowedRoles:   string[];
  requiresOrgId:  boolean;    // must pass orgId filter
  requiresFarmerId: boolean;  // scoped to requesting farmer only
  allowGlobal:    boolean;    // platform admins can see all
  privacyThreshold: number;   // k-anonymity min group size (0 = disabled)
}

export interface IDatasetDefinition {
  id:          DatasetId;
  label:       string;
  description: string;
  domain:      EventDomain;
  collection:  string;            // MongoDB collection name
  fields:      IDatasetField[];
  metrics:     MetricType[];      // allowed metrics for this dataset
  dimensions:  DimensionType[];   // allowed dimensions
  permissions: IDatasetPermission;
}

// ═══════════════════════════════════════════════════════════════════════════
// CHART BUILDER TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface IChartFilter {
  field:    string;
  operator: FilterOperator;
  value:    unknown;             // string | number | string[] | [number, number]
}

export interface IChartMetric {
  type:    MetricType;
  field:   string;              // field name in collection
  alias?:  string;              // display label
}

export interface IChartDimension {
  type:        DimensionType;
  field:       string;
  granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year'; // for time dims
}

export interface IChartSort {
  field:     string;
  direction: 'asc' | 'desc';
}

export interface IChartVisualizationOptions {
  title?:           string;
  subtitle?:        string;
  xAxisLabel?:      string;
  yAxisLabel?:      string;
  showLegend?:      boolean;
  showDataLabels?:  boolean;
  colorScheme?:     string;
  timezone?:        string;       // IANA timezone
  dateFormat?:      string;
  seriesGroupBy?:   string;       // field to split into series
  stackBy?:         string;
  limit?:           number;       // top-N results
}

export interface IChartDefinition {
  datasetId:   DatasetId;
  metrics:     IChartMetric[];
  dimensions:  IChartDimension[];
  filters:     IChartFilter[];
  sort?:       IChartSort[];
  vizOptions?: IChartVisualizationOptions;
  chartType:   ChartType;
  timeRange?: {
    from: Date;
    to:   Date;
  };
}

export interface IChartVersion {
  version:     number;
  definition:  IChartDefinition;
  updatedAt:   Date;
  updatedBy:   Types.ObjectId;
}

// ═══════════════════════════════════════════════════════════════════════════
// CHART & DASHBOARD DOCUMENT INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface IChartDocument {
  _id:          Types.ObjectId;
  name:         string;
  description?: string;
  ownerId:      Types.ObjectId;
  orgId?:       Types.ObjectId;
  definition:   IChartDefinition;
  versions:     IChartVersion[];
  currentVersion: number;
  shareScope:   ShareScope;
  sharedWithRoles?: string[];
  sharedWithUsers?: Types.ObjectId[];
  tags:         string[];
  status:       'draft' | 'published' | 'archived';
  isTemplate:   boolean;
  lastRunAt?:   Date;
  lastRunDurationMs?: number;
  createdAt:    Date;
  updatedAt:    Date;
}

export interface IDashboardItem {
  chartId:    Types.ObjectId;
  position:   { col: number; row: number };
  size:       { w: number; h: number };
  title?:     string;            // override chart title on dashboard
}

export interface IDashboardSharingRule {
  scope:            ShareScope;
  roles?:           string[];
  userIds?:         Types.ObjectId[];
}

export interface IDashboardDocument {
  _id:          Types.ObjectId;
  name:         string;
  description?: string;
  ownerId:      Types.ObjectId;
  orgId?:       Types.ObjectId;
  items:        IDashboardItem[];
  sharing:      IDashboardSharingRule;
  isTemplate:   boolean;
  templateCategory?: 'farmer' | 'organization' | 'expert' | 'admin' | 'outbreak' | 'market';
  tags:         string[];
  status:       'draft' | 'published' | 'archived';
  isDefault:    boolean;         // pinned as default for owner/org
  createdAt:    Date;
  updatedAt:    Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS EVENT STORE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface IAnalyticsEventPayload {
  [key: string]: unknown;
}

export interface IAnalyticsEvent {
  eventType:    AnalyticsEventType;
  domain:       EventDomain;
  actorId?:     Types.ObjectId;    // userId who triggered
  farmerId?:    Types.ObjectId;
  orgId?:       Types.ObjectId;
  region?:      string;
  district?:    string;
  cropType?:    string[];
  refId?:       Types.ObjectId;    // ID of the referenced document
  refModel?:    string;            // collection name
  payload:      IAnalyticsEventPayload;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    source?:    string;
  };
  createdAt:    Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRE-AGGREGATED METRIC TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface IAggregatedMetric {
  dataset:      DatasetId;
  window:       AggregationWindow;
  windowStart:  Date;
  windowEnd:    Date;
  dimension:    DimensionType;
  dimensionValue: string;
  metric:       MetricType;
  field:        string;
  value:        number;
  count:        number;           // number of records aggregated
  orgId?:       Types.ObjectId;
  farmerId?:    Types.ObjectId;
  region?:      string;
  cropType?:    string;
  createdAt:    Date;
  updatedAt:    Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERY ENGINE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface IQueryContext {
  userId:     string;
  userRole:   string;
  orgId?:     string;
  farmerId?:  string;
  scope:      AccessScope;
}

export interface IQueryResult {
  data:         Record<string, unknown>[];
  total?:       number;
  fromCache:    boolean;
  executedInMs: number;
  truncated:    boolean;          // true if privacy threshold trimmed rows
  cacheKey?:    string;
}

// ═══════════════════════════════════════════════════════════════════════════
// DOMAIN DASHBOARD RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface IFarmerDashboard {
  summary: {
    totalOrders: number;
    totalRevenue: number;
    activeListings: number;
    avgRating: number;
    verifiedStatus: boolean;
  };
  recentOrders:      unknown[];
  salesTrend:        unknown[];
  topProducts:       unknown[];
  diseaseAlerts:     unknown[];
  weatherRisks:      unknown[];
  advisoryEngagement: { sent: number; read: number; rate: number };
}

export interface IOrgDashboard {
  summary: {
    memberFarmers: number;
    totalOrders: number;
    totalRevenue: number;
    disputeRate: number;
    diseaseDetections: number;
  };
  memberActivity:    unknown[];
  regionDistribution: unknown[];
  cropDistribution:  unknown[];
  marketPerformance: unknown[];
  outbreakHeatmap:   unknown[];
}

export interface IAdminDashboard {
  platform: {
    totalFarmers:       number;
    totalOrders:        number;
    totalRevenue:       number;
    activeOrgs:         number;
    aiDetections:       number;
    openDisputes:       number;
    weatherAlertsToday: number;
  };
  adoption:    unknown[];
  healthScore: number;
  systemAlerts: unknown[];
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export enum ExportFormat {
  CSV  = 'csv',
  JSON = 'json',
}

export interface IExportRequest {
  chartId?:    string;
  definition?: IChartDefinition;   // inline definition (for preview exports)
  format:      ExportFormat;
  filename?:   string;
}

export interface IAuditLogAction {
  action:     'chart.created' | 'chart.updated' | 'chart.deleted' | 'chart.previewed' |
              'dashboard.created' | 'dashboard.updated' | 'dashboard.deleted' |
              'dashboard.shared' | 'export.generated' | 'admin.accessed';
  resourceId?: string;
  resourceType?: string;
  userId:     string;
  orgId?:     string;
  meta?:      Record<string, unknown>;
}
