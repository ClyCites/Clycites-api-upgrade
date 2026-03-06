/**
 * Weather Alert Model
 *
 * Persists rule-triggered risk alerts for farms/farmers.
 * Captures full delivery audit trail, acknowledgement state,
 * and the rule condition context that caused the alert.
 */

import mongoose, { Schema } from 'mongoose';
import {
  IWeatherAlertDocument,
  AlertType,
  AlertSeverity,
  AlertStatus,
  DeliveryChannel,
  DeliveryStatus,
} from './weather.types';

const triggerRuleSchema = new Schema(
  {
    ruleId:       { type: Schema.Types.ObjectId, default: null },
    ruleName:     { type: String, required: true },
    thresholds:   { type: Schema.Types.Mixed, default: {} },
    actualValues: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const deliveryAttemptSchema = new Schema(
  {
    channel: {
      type: String,
      enum: Object.values(DeliveryChannel),
      required: true,
    },
    timestamp:   { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: Object.values(DeliveryStatus),
      required: true,
    },
    externalRef: { type: String, default: null },
    error:       { type: String, default: null },
  },
  { _id: false }
);

const cropContextSchema = new Schema(
  {
    cropType:    { type: String, required: true },
    growthStage: { type: String, default: null },
  },
  { _id: false }
);

const weatherAlertSchema = new Schema<IWeatherAlertDocument>(
  {
    farmId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    farmerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
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
      index: true,
    },
    triggerRule:        { type: triggerRuleSchema, required: true },
    advisoryMessage:    { type: String, required: true, maxlength: 2000 },
    recommendedActions: { type: [String], default: [] },
    cropContext:        { type: cropContextSchema, default: null },
    status: {
      type: String,
      enum: Object.values(AlertStatus),
      default: AlertStatus.NEW,
      index: true,
    },
    deliveryAttempts:    { type: [deliveryAttemptSchema], default: [] },
    acknowledgedAt:      { type: Date, default: null },
    acknowledgedBy:      { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt:          { type: Date, default: null },
    resolvedBy:          { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolutionReason:    { type: String, default: null, maxlength: 1000 },
    expiresAt:           { type: Date, required: true, index: true },
    triggeredBy:         { type: String, enum: ['system', 'manual'], default: 'system' },
    triggeredByUserId:   { type: Schema.Types.ObjectId, ref: 'User', default: null },
    snapshotId:          { type: Schema.Types.ObjectId, ref: 'WeatherSnapshot', default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Most common query: active alerts for a farm
weatherAlertSchema.index({ farmId: 1, status: 1, createdAt: -1 });

// Dashboard: alerts by severity for an org
weatherAlertSchema.index({ organizationId: 1, severity: 1, status: 1 });

// Farmer notification feed
weatherAlertSchema.index({ farmerId: 1, status: 1, createdAt: -1 });

// TTL: auto-remove expired/dismissed alerts after 30 days
weatherAlertSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30 }
);

const WeatherAlert = mongoose.model<IWeatherAlertDocument>(
  'WeatherAlert',
  weatherAlertSchema
);

export default WeatherAlert;
