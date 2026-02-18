/**
 * Weather Snapshot Model
 *
 * Point-in-time weather observation for a specific farm.
 * Stores normalised readings alongside the raw provider payload
 * for auditability and future reprocessing.
 *
 * TTL index: snapshots older than 90 days are auto-removed to
 * control collection growth in low-resource deployments.
 */

import mongoose, { Schema } from 'mongoose';
import { IWeatherSnapshotDocument, DataSource } from './weather.types';

const weatherReadingSchema = new Schema(
  {
    temperatureCelsius: { type: Number, required: true },
    feelsLikeCelsius:   { type: Number, default: null },
    humidity:           { type: Number, required: true, min: 0, max: 100 },
    windSpeedKph:       { type: Number, default: null },
    windDirectionDeg:   { type: Number, default: null, min: 0, max: 360 },
    windGustKph:        { type: Number, default: null },
    rainfallMm:         { type: Number, default: null },
    rainfallMmPerHour:  { type: Number, default: null },
    cloudCoverPct:      { type: Number, default: null, min: 0, max: 100 },
    pressureHPa:        { type: Number, default: null },
    uvIndex:            { type: Number, default: null, min: 0 },
    visibilityKm:       { type: Number, default: null },
    dewPointCelsius:    { type: Number, default: null },
  },
  { _id: false }
);

const weatherSnapshotSchema = new Schema<IWeatherSnapshotDocument>(
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
    timestamp: { type: Date, required: true },
    reading: { type: weatherReadingSchema, required: true },
    dataSource: {
      type: String,
      enum: Object.values(DataSource),
      required: true,
    },
    providerRef:     { type: String, default: null },
    confidenceScore: { type: Number, default: null, min: 0, max: 1 },
    qualityFlags:    { type: [String], default: [] },
    rawPayload:      { type: Schema.Types.Mixed, default: null, select: false },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Primary query pattern: latest readings for a farm
weatherSnapshotSchema.index({ farmId: 1, timestamp: -1 });

// Deduplication: unique reading per farm/provider per timestamp
weatherSnapshotSchema.index(
  { farmId: 1, providerRef: 1, timestamp: 1 },
  { unique: true, sparse: true }
);

// TTL: auto-purge readings older than 90 days (keeps collection lean)
weatherSnapshotSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 90 }
);

const WeatherSnapshot = mongoose.model<IWeatherSnapshotDocument>(
  'WeatherSnapshot',
  weatherSnapshotSchema
);

export default WeatherSnapshot;
