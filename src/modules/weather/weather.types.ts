/**
 * Weather Detection, Forecasting & Alerts Module — TypeScript Type Definitions
 *
 * Enterprise-grade agricultural weather intelligence:
 * - Multi-tenant (independent farmers + organisations/co-operatives)
 * - Geo-aware, farm-level risk detection
 * - Provider-agnostic data ingestion with caching & fallback
 * - Configurable rules engine for threshold-based alerts
 * - Low-connectivity environment support
 */

import { Document, Types } from 'mongoose';

// ============================================================================
// ENUMS
// ============================================================================

/** Weather alert categories relevant to agriculture */
export enum AlertType {
  HEAVY_RAIN       = 'heavy_rain',
  DROUGHT_RISK     = 'drought_risk',
  HEAT_WAVE        = 'heat_wave',
  FROST            = 'frost',
  STORM            = 'storm',
  STRONG_WIND      = 'strong_wind',
  FLOOD_RISK       = 'flood_risk',
  HIGH_HUMIDITY    = 'high_humidity',
  LOW_HUMIDITY     = 'low_humidity',
  UV_HAZARD        = 'uv_hazard',
  COLD_SNAP        = 'cold_snap',
  HAIL             = 'hail',
}

/** Risk severity — drives notification priority and delivery urgency */
export enum AlertSeverity {
  LOW      = 'low',
  MEDIUM   = 'medium',
  HIGH     = 'high',
  CRITICAL = 'critical',
}

/** Alert lifecycle state */
export enum AlertStatus {
  NEW          = 'new',
  SENT         = 'sent',
  ACKNOWLEDGED = 'acknowledged',
  EXPIRED      = 'expired',
  DISMISSED    = 'dismissed',
}

/** Forecast resolution */
export enum ForecastHorizon {
  HOURLY = 'hourly',
  DAILY  = 'daily',
  WEEKLY = 'weekly',
}

/** Measurement unit system */
export enum WeatherUnit {
  METRIC   = 'metric',
  IMPERIAL = 'imperial',
}

/** Logical operators for rules engine conditions */
export enum RuleOperator {
  GT      = 'gt',
  GTE     = 'gte',
  LT      = 'lt',
  LTE     = 'lte',
  EQ      = 'eq',
  BETWEEN = 'between',
}

/** Supported external data sources */
export enum DataSource {
  OPEN_WEATHER_MAP = 'open_weather_map',
  TOMORROW_IO      = 'tomorrow_io',
  WEATHERAPI       = 'weatherapi',
  METEOMATICS      = 'meteomatics',
  MANUAL           = 'manual',
  CACHED           = 'cached',
  IOT_DEVICE       = 'iot_device',
}

/** Background ingest job lifecycle */
export enum IngestJobStatus {
  PENDING   = 'pending',
  RUNNING   = 'running',
  COMPLETED = 'completed',
  FAILED    = 'failed',
  SKIPPED   = 'skipped',
}

/** Delivery channels for weather alerts */
export enum DeliveryChannel {
  IN_APP    = 'in_app',
  EMAIL     = 'email',
  SMS       = 'sms',
  WHATSAPP  = 'whatsapp',
  PUSH      = 'push',
}

/** Delivery attempt outcome */
export enum DeliveryStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED  = 'failed',
  SKIPPED = 'skipped',   // e.g. quiet hours
}

// ============================================================================
// GEOLOCATION
// ============================================================================

export interface IGeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface ILatLng {
  lat: number;
  lng: number;
}

// ============================================================================
// FARM WEATHER PROFILE
// ============================================================================

export interface IAlertThresholds {
  tempHighCelsius?: number;       // e.g. 38 — triggers heat_wave
  tempLowCelsius?: number;        // e.g. 2  — triggers frost
  rainfallMmPerHour?: number;     // e.g. 15 — triggers heavy_rain
  windSpeedKph?: number;          // e.g. 60 — triggers strong_wind
  humidityHighPct?: number;       // e.g. 90 — triggers high_humidity
  humidityLowPct?: number;        // e.g. 30 — triggers low_humidity
  uvIndexHigh?: number;           // e.g. 10 — triggers uv_hazard
}

export interface IAlertPreferences {
  channels: DeliveryChannel[];
  quietHoursStart?: number;   // 0-23 hour (local)
  quietHoursEnd?: number;     // 0-23 hour (local)
  thresholds: IAlertThresholds;
  enabledAlertTypes?: AlertType[];   // null = all
  minimumSeverity?: AlertSeverity;   // ignore below this level
}

export interface IFarmWeatherProfile {
  farmId: Types.ObjectId;
  farmerId: Types.ObjectId;
  organizationId?: Types.ObjectId;   // null for independent farmers
  farmName?: string;
  geoLocation: IGeoPoint;            // GeoJSON Point
  altitude?: number;                 // metres above sea level
  timezone: string;                  // IANA tz, e.g. 'Africa/Kampala'
  preferredUnits: WeatherUnit;
  alertPreferences: IAlertPreferences;
  primaryCropTypes?: string[];       // influences rule matching
  isActive: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFarmWeatherProfileDocument extends IFarmWeatherProfile, Document {}

// ============================================================================
// WEATHER SNAPSHOT (point-in-time reading)
// ============================================================================

export interface IWeatherReading {
  temperatureCelsius: number;
  feelsLikeCelsius?: number;
  humidity: number;                  // percentage 0-100
  windSpeedKph?: number;
  windDirectionDeg?: number;         // 0-360
  windGustKph?: number;
  rainfallMm?: number;               // mm in the measurement window
  rainfallMmPerHour?: number;
  cloudCoverPct?: number;
  pressureHPa?: number;
  uvIndex?: number;
  visibilityKm?: number;
  dewPointCelsius?: number;
}

export interface IWeatherSnapshot {
  farmId: Types.ObjectId;
  profileId: Types.ObjectId;
  timestamp: Date;
  reading: IWeatherReading;
  dataSource: DataSource;
  providerRef?: string;              // provider's own ID for dedup
  confidenceScore?: number;          // 0-1
  qualityFlags?: string[];           // e.g. ['interpolated', 'stale_cache']
  rawPayload?: Record<string, unknown>; // original provider response
  createdAt: Date;
}

export interface IWeatherSnapshotDocument extends IWeatherSnapshot, Document {}

// ============================================================================
// FORECAST
// ============================================================================

export interface IForecastPrediction {
  timestamp: Date;
  temperatureCelsius?: number;
  tempMinCelsius?: number;
  tempMaxCelsius?: number;
  humidity?: number;
  rainfallMm?: number;
  precipitationProbabilityPct?: number;
  windSpeedKph?: number;
  windDirectionDeg?: number;
  cloudCoverPct?: number;
  uvIndex?: number;
}

export interface IForecast {
  farmId: Types.ObjectId;
  profileId: Types.ObjectId;
  horizon: ForecastHorizon;
  forecastPeriodStart: Date;
  forecastPeriodEnd: Date;
  predictions: IForecastPrediction[];
  provider: DataSource;
  modelVersion?: string;
  fetchedAt: Date;
  expiresAt: Date;
  isSuperseded: boolean;            // true when newer forecast is available
  createdAt: Date;
}

export interface IForecastDocument extends IForecast, Document {}

// ============================================================================
// WEATHER ALERT
// ============================================================================

export interface ITriggerRule {
  ruleId?: Types.ObjectId;
  ruleName: string;
  thresholds: Record<string, number>;
  actualValues: Record<string, number>;
}

export interface IDeliveryAttempt {
  channel: DeliveryChannel;
  timestamp: Date;
  status: DeliveryStatus;
  externalRef?: string;             // e.g. notification ID or message SID
  error?: string;
}

export interface ICropContext {
  cropType: string;
  growthStage?: string;
}

export interface IWeatherAlert {
  farmId: Types.ObjectId;
  farmerId: Types.ObjectId;
  organizationId?: Types.ObjectId;
  alertType: AlertType;
  severity: AlertSeverity;
  triggerRule: ITriggerRule;
  advisoryMessage: string;           // farmer-friendly, may be localised
  recommendedActions: string[];
  cropContext?: ICropContext;
  status: AlertStatus;
  deliveryAttempts: IDeliveryAttempt[];
  acknowledgedAt?: Date;
  acknowledgedBy?: Types.ObjectId;
  expiresAt: Date;
  triggeredBy: 'system' | 'manual';
  triggeredByUserId?: Types.ObjectId; // only for manual triggers
  snapshotId?: Types.ObjectId;        // weather reading that caused the alert
  createdAt: Date;
  updatedAt: Date;
}

export interface IWeatherAlertDocument extends IWeatherAlert, Document {}

// ============================================================================
// WEATHER RULE (configurable rules engine)
// ============================================================================

export interface IRuleCondition {
  field: string;         // e.g. 'reading.temperatureCelsius'
  operator: RuleOperator;
  value: number;         // primary threshold
  valueTo?: number;      // upper bound for BETWEEN
  unit?: string;         // display-only, e.g. '°C'
}

export interface IWeatherRule {
  name: string;
  description?: string;
  alertType: AlertType;
  severity: AlertSeverity;
  conditions: IRuleCondition[];    // logical AND across conditions
  cropTypes?: string[];            // null = applies to all crops
  regions?: string[];              // ISO 3166 or custom region codes
  seasons?: string[];              // 'dry' | 'wet' | 'Q1' | etc.
  organizationId?: Types.ObjectId; // org-specific policy override; null = global
  isActive: boolean;
  priority: number;                // higher = evaluated first; used for dedup
  advisoryTemplate: string;        // e.g. 'Temperatures above {{value}}°C expected…'
  recommendedActions: string[];
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  version: number;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWeatherRuleDocument extends IWeatherRule, Document {}

// ============================================================================
// PROVIDER LAYER
// ============================================================================

/** Normalised response returned by any weather provider adapter */
export interface IProviderCurrentResponse {
  source: DataSource;
  fetchedAt: Date;
  reading: IWeatherReading;
  providerRef?: string;
  raw?: Record<string, unknown>;
}

export interface IProviderForecastResponse {
  source: DataSource;
  fetchedAt: Date;
  horizon: ForecastHorizon;
  predictions: IForecastPrediction[];
  modelVersion?: string;
  expiresAt: Date;
  raw?: Record<string, unknown>;
}

/** Contract every provider adapter must fulfil */
export interface IWeatherProvider {
  name: DataSource;
  fetchCurrent(lat: number, lng: number): Promise<IProviderCurrentResponse>;
  fetchForecast(lat: number, lng: number, horizon: ForecastHorizon): Promise<IProviderForecastResponse>;
}

// ============================================================================
// SERVICE INPUT / OUTPUT DTOs
// ============================================================================

export interface ICreateProfileInput {
  farmId: string;
  farmName?: string;
  lat: number;
  lng: number;
  altitude?: number;
  timezone?: string;
  preferredUnits?: WeatherUnit;
  alertPreferences?: Partial<IAlertPreferences>;
  primaryCropTypes?: string[];
  organizationId?: string;
}

export interface IUpdateProfileInput {
  farmName?: string;
  lat?: number;
  lng?: number;
  altitude?: number;
  timezone?: string;
  preferredUnits?: WeatherUnit;
  alertPreferences?: Partial<IAlertPreferences>;
  primaryCropTypes?: string[];
}

export interface ICreateRuleInput {
  name: string;
  description?: string;
  alertType: AlertType;
  severity: AlertSeverity;
  conditions: IRuleCondition[];
  cropTypes?: string[];
  regions?: string[];
  seasons?: string[];
  organizationId?: string;
  priority?: number;
  advisoryTemplate: string;
  recommendedActions: string[];
}

export interface IUpdateRuleInput {
  name?: string;
  description?: string;
  severity?: AlertSeverity;
  conditions?: IRuleCondition[];
  cropTypes?: string[];
  regions?: string[];
  seasons?: string[];
  isActive?: boolean;
  priority?: number;
  advisoryTemplate?: string;
  recommendedActions?: string[];
}

export interface IRiskForecastSummary {
  farmId: string;
  horizon: ForecastHorizon;
  rainProbabilityPct: number;
  maxTemperatureCelsius: number;
  minTemperatureCelsius: number;
  heatStressRisk: boolean;
  frostRisk: boolean;
  heavyRainRisk: boolean;
  windRisk: boolean;
  highUvRisk: boolean;
  overallRiskScore: number;   // 0-100
  riskSignals: string[];
  generatedAt: Date;
}

export interface IWeatherDashboard {
  profile: IFarmWeatherProfile;
  currentConditions?: IWeatherReading;
  lastUpdated?: Date;
  activeAlerts: IWeatherAlert[];
  alertCounts: { low: number; medium: number; high: number; critical: number };
  todayForecast?: IForecast;
  riskSummary?: IRiskForecastSummary;
}

export interface IIngestResult {
  profileId: string;
  farmId: string;
  status: IngestJobStatus;
  snapshotId?: string;
  forecastIds?: string[];
  alertsGenerated?: number;
  error?: string;
  durationMs: number;
}
