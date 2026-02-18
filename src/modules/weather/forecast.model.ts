/**
 * Forecast Model
 *
 * Stores provider-sourced forecast data for a farm.
 * Each refresh creates a new document; the previous one
 * is marked isSuperseded = true. Only the latest non-superseded
 * document per (farmId + horizon) is the "live" forecast.
 */

import mongoose, { Schema } from 'mongoose';
import { IForecastDocument, ForecastHorizon, DataSource } from './weather.types';

const forecastPredictionSchema = new Schema(
  {
    timestamp:                    { type: Date, required: true },
    temperatureCelsius:           { type: Number, default: null },
    tempMinCelsius:               { type: Number, default: null },
    tempMaxCelsius:               { type: Number, default: null },
    humidity:                     { type: Number, default: null, min: 0, max: 100 },
    rainfallMm:                   { type: Number, default: null },
    precipitationProbabilityPct:  { type: Number, default: null, min: 0, max: 100 },
    windSpeedKph:                 { type: Number, default: null },
    windDirectionDeg:             { type: Number, default: null, min: 0, max: 360 },
    cloudCoverPct:                { type: Number, default: null, min: 0, max: 100 },
    uvIndex:                      { type: Number, default: null },
  },
  { _id: false }
);

const forecastSchema = new Schema<IForecastDocument>(
  {
    farmId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'FarmWeatherProfile',
      required: true,
    },
    horizon: {
      type: String,
      enum: Object.values(ForecastHorizon),
      required: true,
    },
    forecastPeriodStart: { type: Date, required: true },
    forecastPeriodEnd:   { type: Date, required: true },
    predictions:         { type: [forecastPredictionSchema], default: [] },
    provider: {
      type: String,
      enum: Object.values(DataSource),
      required: true,
    },
    modelVersion:  { type: String, default: null },
    fetchedAt:     { type: Date, required: true },
    expiresAt:     { type: Date, required: true, index: true },
    isSuperseded:  { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Active forecast lookup per farm + horizon
forecastSchema.index({ farmId: 1, horizon: 1, isSuperseded: 1 });

// TTL: expired and superseded forecasts are purged automatically
forecastSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 7 } // retain for 7 days post-expiry for reporting
);

const Forecast = mongoose.model<IForecastDocument>('Forecast', forecastSchema);

export default Forecast;
