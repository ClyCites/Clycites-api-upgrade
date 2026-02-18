/**
 * Chart Model
 *
 * Stores versioned chart definitions built via the chart builder.
 * Each chart references a DatasetId and carries a full IChartDefinition.
 * History of up to 20 versions is kept for rollback.
 */

import mongoose, { Schema, Document } from 'mongoose';
import {
  IChartDocument,
  IChartDefinition,
  IChartVersion,
  ChartType,
  ShareScope,
  DatasetId,
  MetricType,
  DimensionType,
  FilterOperator,
} from './analytics.types';

export interface IChartMongoDocument extends Omit<IChartDocument, '_id'>, Document {}

// ── Sub-schemas ────────────────────────────────────────────────────────────

const chartFilterSchema = new Schema(
  {
    field:    { type: String, required: true },
    operator: { type: String, enum: Object.values(FilterOperator), required: true },
    value:    { type: Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

const chartMetricSchema = new Schema(
  {
    type:  { type: String, enum: Object.values(MetricType), required: true },
    field: { type: String, required: true },
    alias: { type: String },
  },
  { _id: false }
);

const chartDimensionSchema = new Schema(
  {
    type:        { type: String, enum: Object.values(DimensionType), required: true },
    field:       { type: String, required: true },
    granularity: { type: String, enum: ['day', 'week', 'month', 'quarter', 'year'] },
  },
  { _id: false }
);

const chartSortSchema = new Schema(
  {
    field:     { type: String, required: true },
    direction: { type: String, enum: ['asc', 'desc'], default: 'desc' },
  },
  { _id: false }
);

const vizOptionsSchema = new Schema(
  {
    title:          String,
    subtitle:       String,
    xAxisLabel:     String,
    yAxisLabel:     String,
    showLegend:     Boolean,
    showDataLabels: Boolean,
    colorScheme:    String,
    timezone:       String,
    dateFormat:     String,
    seriesGroupBy:  String,
    stackBy:        String,
    limit:          { type: Number, min: 1, max: 1000 },
  },
  { _id: false }
);

const definitionSchema = new Schema<IChartDefinition>(
  {
    datasetId:  { type: String, enum: Object.values(DatasetId), required: true },
    metrics:    { type: [chartMetricSchema], required: true },
    dimensions: { type: [chartDimensionSchema], default: [] },
    filters:    { type: [chartFilterSchema], default: [] },
    sort:       { type: [chartSortSchema], default: [] },
    vizOptions: vizOptionsSchema,
    chartType:  { type: String, enum: Object.values(ChartType), required: true },
    timeRange: {
      from: Date,
      to:   Date,
    },
  },
  { _id: false }
);

const versionSchema = new Schema<IChartVersion>(
  {
    version:    { type: Number, required: true },
    definition: { type: definitionSchema, required: true },
    updatedAt:  { type: Date, default: Date.now },
    updatedBy:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
);

// ── Main chart schema ──────────────────────────────────────────────────────

const chartSchema = new Schema<IChartMongoDocument>(
  {
    name:         { type: String, required: true, maxlength: 120 },
    description:  { type: String, maxlength: 500 },
    ownerId:      { type: Schema.Types.ObjectId, ref: 'User',         required: true, index: true },
    orgId:        { type: Schema.Types.ObjectId, ref: 'Organization',  index: true },
    definition:   { type: definitionSchema, required: true },
    versions:     { type: [versionSchema], default: [] },
    currentVersion: { type: Number, default: 1 },
    shareScope:   { type: String, enum: Object.values(ShareScope), default: ShareScope.OWNER_ONLY },
    sharedWithRoles: [String],
    sharedWithUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    tags:         [String],
    isTemplate:   { type: Boolean, default: false, index: true },
    lastRunAt:    Date,
    lastRunDurationMs: Number,
  },
  { timestamps: true }
);

chartSchema.index({ ownerId: 1, orgId: 1 });
chartSchema.index({ orgId: 1, shareScope: 1 });
chartSchema.index({ isTemplate: 1 });
chartSchema.index({ tags: 1 });

const Chart = mongoose.model<IChartMongoDocument>('Chart', chartSchema);
export default Chart;
