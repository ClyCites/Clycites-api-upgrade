/**
 * Weather Rule Model
 *
 * Configurable rules engine entries. Each rule specifies a set of
 * threshold conditions that, when met by incoming weather data,
 * trigger an alert of a given type and severity.
 *
 * Rules can be scoped globally, by crop type, by region/season,
 * or by organisation (policy overrides).
 */

import mongoose, { Schema } from 'mongoose';
import {
  IWeatherRuleDocument,
  AlertType,
  AlertSeverity,
  RuleOperator,
  RuleLifecycleStatus,
} from './weather.types';

const ruleConditionSchema = new Schema(
  {
    field: {
      type: String,
      required: true,
      comment: 'Dot-path into IWeatherReading, e.g. "temperatureCelsius"',
    },
    operator: {
      type: String,
      enum: Object.values(RuleOperator),
      required: true,
    },
    value:   { type: Number, required: true },
    valueTo: { type: Number, default: null }, // upper bound for BETWEEN
    unit:    { type: String, default: null }, // display only
  },
  { _id: false }
);

const weatherRuleSchema = new Schema<IWeatherRuleDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: { type: String, maxlength: 1000, default: null },
    alertType: {
      type: String,
      enum: Object.values(AlertType),
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: Object.values(AlertSeverity),
      required: true,
    },
    conditions:         { type: [ruleConditionSchema], required: true },
    cropTypes:          { type: [String], default: null },  // null = all crops
    regions:            { type: [String], default: [] },
    seasons:            { type: [String], default: [] },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    workflowState: {
      type: String,
      enum: Object.values(RuleLifecycleStatus),
      default: RuleLifecycleStatus.ACTIVE,
      index: true,
    },
    isActive:           { type: Boolean, default: true, index: true },
    priority:           { type: Number, default: 50, index: true },
    advisoryTemplate: {
      type: String,
      required: true,
      maxlength: 2000,
      comment: 'Supports {{variable}} interpolation',
    },
    recommendedActions: { type: [String], default: [] },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    version:   { type: Number, default: 1 },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Active rules evaluation: highest priority first
weatherRuleSchema.index({ isActive: 1, priority: -1 });

// Org-scoped policy lookup
weatherRuleSchema.index({ organizationId: 1, isActive: 1, alertType: 1 });

// Soft-delete filter
weatherRuleSchema.pre(['find', 'findOne', 'findOneAndUpdate'], function () {
  if (!(this.getFilter() as Record<string, unknown>)['deletedAt']) {
    this.where({ deletedAt: null });
  }
});

const WeatherRule = mongoose.model<IWeatherRuleDocument>(
  'WeatherRule',
  weatherRuleSchema
);

export default WeatherRule;
