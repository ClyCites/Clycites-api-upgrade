/**
 * Farm Weather Profile Model
 *
 * Links a farm/farmer to their weather subscription, geo-location,
 * alert preferences and unit settings. Supports both independent
 * farmers (no organizationId) and organisation members.
 */

import mongoose, { Schema } from 'mongoose';
import {
  IFarmWeatherProfileDocument,
  WeatherUnit,
  AlertSeverity,
  AlertType,
  DeliveryChannel,
} from './weather.types';

const alertThresholdsSchema = new Schema(
  {
    tempHighCelsius:    { type: Number, default: null },
    tempLowCelsius:     { type: Number, default: null },
    rainfallMmPerHour:  { type: Number, default: null },
    windSpeedKph:       { type: Number, default: null },
    humidityHighPct:    { type: Number, default: null },
    humidityLowPct:     { type: Number, default: null },
    uvIndexHigh:        { type: Number, default: null },
  },
  { _id: false }
);

const alertPreferencesSchema = new Schema(
  {
    channels: {
      type: [String],
      enum: Object.values(DeliveryChannel),
      default: [DeliveryChannel.IN_APP],
    },
    quietHoursStart:   { type: Number, min: 0, max: 23, default: null },
    quietHoursEnd:     { type: Number, min: 0, max: 23, default: null },
    thresholds:        { type: alertThresholdsSchema, default: () => ({}) },
    enabledAlertTypes: {
      type: [String],
      enum: Object.values(AlertType),
      default: null,
    },
    minimumSeverity: {
      type: String,
      enum: Object.values(AlertSeverity),
      default: AlertSeverity.LOW,
    },
  },
  { _id: false }
);

const geoPointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  { _id: false }
);

const farmWeatherProfileSchema = new Schema<IFarmWeatherProfileDocument>(
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
    farmName: { type: String, trim: true, maxlength: 200 },
    geoLocation: { type: geoPointSchema, required: true },
    altitude: { type: Number, default: null },
    timezone: { type: String, default: 'UTC', maxlength: 60 },
    preferredUnits: {
      type: String,
      enum: Object.values(WeatherUnit),
      default: WeatherUnit.METRIC,
    },
    alertPreferences: {
      type: alertPreferencesSchema,
      default: () => ({
        channels: [DeliveryChannel.IN_APP],
        thresholds: {},
        minimumSeverity: AlertSeverity.LOW,
      }),
    },
    primaryCropTypes: { type: [String], default: [] },
    isActive:  { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// 2dsphere index for geo-proximity queries
farmWeatherProfileSchema.index({ geoLocation: '2dsphere' });

// Compound: active profiles for a farmer
farmWeatherProfileSchema.index({ farmerId: 1, isActive: 1 });

// Compound: active profiles for an organisation
farmWeatherProfileSchema.index({ organizationId: 1, isActive: 1 });

// Soft-delete query helper
farmWeatherProfileSchema.pre(['find', 'findOne', 'findOneAndUpdate'], function () {
  if (!(this.getFilter() as Record<string, unknown>)['deletedAt']) {
    this.where({ deletedAt: null });
  }
});

const FarmWeatherProfile = mongoose.model<IFarmWeatherProfileDocument>(
  'FarmWeatherProfile',
  farmWeatherProfileSchema
);

export default FarmWeatherProfile;
