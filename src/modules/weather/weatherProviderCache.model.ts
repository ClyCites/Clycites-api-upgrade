/**
 * Weather Provider Cache Model
 *
 * Durable cache for provider-normalised payloads keyed by rounded location and
 * forecast horizon. This complements the in-memory provider cache so the API
 * can survive restarts without immediately re-hitting upstream providers.
 */

import mongoose, { Schema } from 'mongoose';
import {
  IWeatherProviderCacheDocument,
  ForecastHorizon,
  DataSource,
} from './weather.types';

const weatherProviderCacheSchema = new Schema<IWeatherProviderCacheDocument>(
  {
    kind: {
      type: String,
      enum: ['current', 'forecast'],
      required: true,
    },
    cacheKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    locationKey: {
      type: String,
      required: true,
      index: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    horizon: {
      type: String,
      enum: Object.values(ForecastHorizon),
      default: null,
    },
    source: {
      type: String,
      enum: Object.values(DataSource),
      required: true,
    },
    fetchedAt: {
      type: Date,
      required: true,
    },
    freshUntil: {
      type: Date,
      required: true,
      index: true,
    },
    staleUntil: {
      type: Date,
      required: true,
      index: true,
    },
    providerExpiresAt: {
      type: Date,
      default: null,
    },
    providerRef: {
      type: String,
      default: null,
    },
    modelVersion: {
      type: String,
      default: null,
    },
    reading: {
      type: Schema.Types.Mixed,
      default: null,
    },
    predictions: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    rawPayload: {
      type: Schema.Types.Mixed,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

weatherProviderCacheSchema.index({ kind: 1, locationKey: 1, horizon: 1 });
weatherProviderCacheSchema.index({ staleUntil: 1 }, { expireAfterSeconds: 0 });

const WeatherProviderCache = mongoose.model<IWeatherProviderCacheDocument>(
  'WeatherProviderCache',
  weatherProviderCacheSchema
);

export default WeatherProviderCache;
