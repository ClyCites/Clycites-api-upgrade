/**
 * Analytics Aggregated Metric Model
 *
 * Pre-aggregated, read-optimized store updated incrementally.
 * Supports hourly/daily/weekly/monthly windows for fast dashboard queries.
 * Upserted by the aggregation jobs — never queried raw (use analyticsQuery.service).
 */

import mongoose, { Schema, Document } from 'mongoose';
import {
  IAggregatedMetric,
  DatasetId,
  AggregationWindow,
  DimensionType,
  MetricType,
} from './analytics.types';

export interface IAggregatedMetricDocument extends IAggregatedMetric, Document {}

const aggregatedMetricSchema = new Schema<IAggregatedMetricDocument>(
  {
    dataset:        { type: String, enum: Object.values(DatasetId),          required: true },
    window:         { type: String, enum: Object.values(AggregationWindow),  required: true },
    windowStart:    { type: Date, required: true },
    windowEnd:      { type: Date, required: true },
    dimension:      { type: String, enum: Object.values(DimensionType),      required: true },
    dimensionValue: { type: String, required: true },
    metric:         { type: String, enum: Object.values(MetricType),         required: true },
    field:          { type: String, required: true },
    value:          { type: Number, required: true },
    count:          { type: Number, required: true, default: 1 },
    orgId:          { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    farmerId:       { type: Schema.Types.ObjectId, ref: 'Farmer',       index: true },
    region:         { type: String, index: true },
    cropType:       { type: String, index: true },
  },
  { timestamps: true }
);

// ── Unique constraint: one row per (dataset, window, windowStart, dimension, value, metric, field, tenant) ─
aggregatedMetricSchema.index(
  {
    dataset:        1,
    window:         1,
    windowStart:    1,
    dimension:      1,
    dimensionValue: 1,
    metric:         1,
    field:          1,
    orgId:          1,
    farmerId:       1,
  },
  { unique: true, sparse: true }
);

// ── Query indexes ─────────────────────────────────────────────────────────
aggregatedMetricSchema.index({ dataset: 1, window: 1, windowStart: 1 });
aggregatedMetricSchema.index({ dataset: 1, dimension: 1, windowStart: 1, windowEnd: 1 });
aggregatedMetricSchema.index({ orgId: 1, dataset: 1, window: 1, windowStart: 1 });
aggregatedMetricSchema.index({ farmerId: 1, dataset: 1, window: 1, windowStart: 1 });
aggregatedMetricSchema.index({ region: 1, dataset: 1, window: 1, windowStart: 1 });

// ── 2-year retention on aggregated metrics ────────────────────────────────
aggregatedMetricSchema.index(
  { updatedAt: 1 },
  { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 }
);

const AggregatedMetric = mongoose.model<IAggregatedMetricDocument>(
  'AggregatedMetric',
  aggregatedMetricSchema
);

export default AggregatedMetric;
