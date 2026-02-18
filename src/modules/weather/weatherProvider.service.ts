/**
 * Weather Provider Service
 *
 * Provider-agnostic ingestion layer with:
 * - Pluggable adapter registry (OpenWeatherMap, Tomorrow.io, …)
 * - In-process TTL cache per provider × farm location
 * - Automatic fallback when the primary provider fails
 * - Rate-limit guard per provider
 * - Response normalisation to the internal schema
 *
 * To add a new provider, create a class that implements IWeatherProvider
 * and register it via WeatherProviderService.registerProvider().
 */

import axios from 'axios';
import logger from '../../common/utils/logger';
import {
  IWeatherProvider,
  IProviderCurrentResponse,
  IProviderForecastResponse,
  ForecastHorizon,
  DataSource,
  IWeatherReading,
  IForecastPrediction,
} from './weather.types';

// ============================================================================
// Cache Entry
// ============================================================================

interface ICacheEntry<T> {
  data: T;
  expiresAt: number; // epoch ms
}

// ============================================================================
// Rate-limit Guard
// ============================================================================

interface IRateLimitState {
  remaining: number;
  resetAt: number; // epoch ms
}

// ============================================================================
// OpenWeatherMap Adapter
// ============================================================================

class OpenWeatherMapProvider implements IWeatherProvider {
  readonly name = DataSource.OPEN_WEATHER_MAP;
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.openweathermap.org/data/2.5';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchCurrent(lat: number, lng: number): Promise<IProviderCurrentResponse> {
    const url = `${this.baseUrl}/weather`;
    const res = await axios.get(url, {
      params: { lat, lon: lng, appid: this.apiKey, units: 'metric' },
      timeout: 8000,
    });
    const d = res.data;

    const reading: IWeatherReading = {
      temperatureCelsius: d.main?.temp ?? 0,
      feelsLikeCelsius:   d.main?.feels_like ?? undefined,
      humidity:           d.main?.humidity ?? 0,
      windSpeedKph:       d.wind?.speed != null ? +(d.wind.speed * 3.6).toFixed(2) : undefined,
      windDirectionDeg:   d.wind?.deg ?? undefined,
      windGustKph:        d.wind?.gust != null ? +(d.wind.gust * 3.6).toFixed(2) : undefined,
      rainfallMm:         d.rain?.['1h'] ?? d.rain?.['3h'] ?? undefined,
      cloudCoverPct:      d.clouds?.all ?? undefined,
      pressureHPa:        d.main?.pressure ?? undefined,
      uvIndex:            undefined, // separate OWM endpoint — handled by ingest service
      visibilityKm:       d.visibility != null ? +(d.visibility / 1000).toFixed(2) : undefined,
    };

    return {
      source: DataSource.OPEN_WEATHER_MAP,
      fetchedAt: new Date(),
      reading,
      providerRef: String(d.dt),
      raw: d,
    };
  }

  async fetchForecast(lat: number, lng: number, horizon: ForecastHorizon): Promise<IProviderForecastResponse> {
    // OWM free tier: 5-day hourly (3h slots) via /forecast
    const url = `${this.baseUrl}/forecast`;
    const res = await axios.get(url, {
      params: { lat, lon: lng, appid: this.apiKey, units: 'metric', cnt: horizon === ForecastHorizon.HOURLY ? 24 : 40 },
      timeout: 10000,
    });
    const d = res.data;

    const predictions: IForecastPrediction[] = (d.list ?? []).map((item: Record<string, unknown>) => {
      const main = item.main as Record<string, number> | undefined;
      const wind = item.wind as Record<string, number> | undefined;
      const rain = item.rain as Record<string, number> | undefined;
      const clouds = item.clouds as Record<string, number> | undefined;
      const pop = item.pop as number | undefined;
      return {
        timestamp:                   new Date((item.dt as number) * 1000),
        temperatureCelsius:          main?.temp ?? null,
        tempMinCelsius:              main?.temp_min ?? null,
        tempMaxCelsius:              main?.temp_max ?? null,
        humidity:                    main?.humidity ?? null,
        rainfallMm:                  rain?.['3h'] ?? null,
        precipitationProbabilityPct: pop != null ? +(pop * 100).toFixed(0) : null,
        windSpeedKph:                wind?.speed != null ? +(wind.speed * 3.6).toFixed(2) : null,
        windDirectionDeg:            wind?.deg ?? null,
        cloudCoverPct:               clouds?.all ?? null,
        uvIndex:                     null,
      };
    });

    const now = new Date();

    return {
      source: DataSource.OPEN_WEATHER_MAP,
      fetchedAt: now,
      horizon,
      predictions,
      modelVersion: 'owm-forecast-v2',
      expiresAt: new Date(now.getTime() + 3 * 60 * 60 * 1000), // 3h TTL
      raw: d,
    };
  }
}

// ============================================================================
// Tomorrow.io Adapter
// ============================================================================

class TomorrowIoProvider implements IWeatherProvider {
  readonly name = DataSource.TOMORROW_IO;
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.tomorrow.io/v4';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchCurrent(lat: number, lng: number): Promise<IProviderCurrentResponse> {
    const url = `${this.baseUrl}/weather/realtime`;
    const res = await axios.get(url, {
      params: {
        location: `${lat},${lng}`,
        apikey: this.apiKey,
        units: 'metric',
        fields: 'temperature,humidity,windSpeed,windDirection,precipitationIntensity,cloudCover,pressureSurfaceLevel,uvIndex,visibility,windGust,dewPoint,feelsLike',
      },
      timeout: 8000,
    });
    const v = res.data?.data?.values ?? {};

    const reading: IWeatherReading = {
      temperatureCelsius: v.temperature ?? 0,
      feelsLikeCelsius:   v.feelsLike ?? undefined,
      humidity:           v.humidity ?? 0,
      windSpeedKph:       v.windSpeed != null ? +(v.windSpeed * 3.6).toFixed(2) : undefined,
      windDirectionDeg:   v.windDirection ?? undefined,
      windGustKph:        v.windGust != null ? +(v.windGust * 3.6).toFixed(2) : undefined,
      rainfallMmPerHour:  v.precipitationIntensity ?? undefined,
      cloudCoverPct:      v.cloudCover ?? undefined,
      pressureHPa:        v.pressureSurfaceLevel ?? undefined,
      uvIndex:            v.uvIndex ?? undefined,
      visibilityKm:       v.visibility ?? undefined,
      dewPointCelsius:    v.dewPoint ?? undefined,
    };

    return {
      source: DataSource.TOMORROW_IO,
      fetchedAt: new Date(),
      reading,
      providerRef: res.data?.data?.time ?? undefined,
      raw: res.data,
    };
  }

  async fetchForecast(lat: number, lng: number, horizon: ForecastHorizon): Promise<IProviderForecastResponse> {
    const timestep = horizon === ForecastHorizon.HOURLY ? '1h' : '1d';
    const url = `${this.baseUrl}/weather/forecast`;
    const res = await axios.get(url, {
      params: {
        location: `${lat},${lng}`,
        apikey: this.apiKey,
        units: 'metric',
        timesteps: timestep,
        fields: 'temperature,temperatureMin,temperatureMax,humidity,precipitationProbability,rainAccumulation,windSpeed,windDirection,cloudCover,uvIndex',
      },
      timeout: 10000,
    });

    const timelineKey = horizon === ForecastHorizon.HOURLY ? '1h' : '1d';
    const intervals = res.data?.data?.timelines?.find((t: Record<string, unknown>) => t.timestep === timelineKey)?.intervals ?? [];

    const predictions: IForecastPrediction[] = intervals.map((interval: Record<string, unknown>) => {
      const v = (interval.values as Record<string, number> | undefined) ?? {};
      return {
        timestamp:                   new Date(interval.startTime as string),
        temperatureCelsius:          v.temperature ?? null,
        tempMinCelsius:              v.temperatureMin ?? null,
        tempMaxCelsius:              v.temperatureMax ?? null,
        humidity:                    v.humidity ?? null,
        rainfallMm:                  v.rainAccumulation ?? null,
        precipitationProbabilityPct: v.precipitationProbability ?? null,
        windSpeedKph:                v.windSpeed != null ? +(v.windSpeed * 3.6).toFixed(2) : null,
        windDirectionDeg:            v.windDirection ?? null,
        cloudCoverPct:               v.cloudCover ?? null,
        uvIndex:                     v.uvIndex ?? null,
      };
    });

    const now = new Date();
    const ttlMs = horizon === ForecastHorizon.HOURLY ? 2 * 60 * 60 * 1000 : 6 * 60 * 60 * 1000;

    return {
      source: DataSource.TOMORROW_IO,
      fetchedAt: now,
      horizon,
      predictions,
      modelVersion: 'tomorrow-v4',
      expiresAt: new Date(now.getTime() + ttlMs),
      raw: res.data,
    };
  }
}

// ============================================================================
// Weather Provider Service (Registry + Cache + Fallback)
// ============================================================================

class WeatherProviderService {
  private readonly providers = new Map<DataSource, IWeatherProvider>();
  private readonly fallbackOrder: DataSource[] = [];

  // Cache keyed by "source:lat:lng"
  private readonly currentCache = new Map<string, ICacheEntry<IProviderCurrentResponse>>();
  private readonly forecastCache = new Map<string, ICacheEntry<IProviderForecastResponse>>();

  // Rate-limit tracking per provider
  private readonly rateLimits = new Map<DataSource, IRateLimitState>();

  // Cache TTLs (ms)
  private readonly CURRENT_TTL_MS  = 10 * 60 * 1000;  // 10 min
  private readonly FORECAST_TTL_MS = 60 * 60 * 1000;  // 1 h

  constructor() {
    this.initDefaultProviders();
  }

  // ---- Initialisation -------------------------------------------------------

  private initDefaultProviders(): void {
    const owmKey = process.env.OPENWEATHERMAP_API_KEY;
    const tioKey = process.env.TOMORROWIO_API_KEY;

    if (owmKey) {
      this.registerProvider(new OpenWeatherMapProvider(owmKey), true);
      logger.info('[WeatherProvider] OpenWeatherMap registered as primary');
    }
    if (tioKey) {
      this.registerProvider(new TomorrowIoProvider(tioKey));
      logger.info('[WeatherProvider] Tomorrow.io registered as fallback');
    }

    if (this.fallbackOrder.length === 0) {
      logger.warn('[WeatherProvider] No API keys configured — weather fetching is disabled');
    }
  }

  registerProvider(provider: IWeatherProvider, primary = false): void {
    this.providers.set(provider.name, provider);
    if (primary) {
      this.fallbackOrder.unshift(provider.name);
    } else {
      this.fallbackOrder.push(provider.name);
    }
  }

  // ---- Public API -----------------------------------------------------------

  async fetchCurrent(lat: number, lng: number): Promise<IProviderCurrentResponse> {
    const cacheKey = `current:${lat.toFixed(4)}:${lng.toFixed(4)}`;
    const cached = this.getFromCache(this.currentCache, cacheKey);
    if (cached) return cached;

    for (const sourceName of this.fallbackOrder) {
      if (this.isRateLimited(sourceName)) {
        logger.debug(`[WeatherProvider] ${sourceName} rate-limited; skipping`);
        continue;
      }
      const provider = this.providers.get(sourceName)!;
      try {
        const result = await provider.fetchCurrent(lat, lng);
        this.setCache(this.currentCache, cacheKey, result, this.CURRENT_TTL_MS);
        return result;
      } catch (err) {
        logger.warn(`[WeatherProvider] ${sourceName} fetchCurrent failed: ${(err as Error).message}`);
      }
    }
    throw new Error('All weather providers failed for fetchCurrent. Check API keys and connectivity.');
  }

  async fetchForecast(lat: number, lng: number, horizon: ForecastHorizon): Promise<IProviderForecastResponse> {
    const cacheKey = `forecast:${horizon}:${lat.toFixed(4)}:${lng.toFixed(4)}`;
    const cached = this.getFromCache(this.forecastCache, cacheKey);
    if (cached) return cached;

    for (const sourceName of this.fallbackOrder) {
      if (this.isRateLimited(sourceName)) continue;
      const provider = this.providers.get(sourceName)!;
      try {
        const result = await provider.fetchForecast(lat, lng, horizon);
        this.setCache(this.forecastCache, cacheKey, result, this.FORECAST_TTL_MS);
        return result;
      } catch (err) {
        logger.warn(`[WeatherProvider] ${sourceName} fetchForecast failed: ${(err as Error).message}`);
      }
    }
    throw new Error('All weather providers failed for fetchForecast. Check API keys and connectivity.');
  }

  /** Manually bust cache for a location (e.g. after test or manual trigger) */
  bustCache(lat: number, lng: number): void {
    const prefix4 = `${lat.toFixed(4)}:${lng.toFixed(4)}`;
    for (const key of this.currentCache.keys()) {
      if (key.includes(prefix4)) this.currentCache.delete(key);
    }
    for (const key of this.forecastCache.keys()) {
      if (key.includes(prefix4)) this.forecastCache.delete(key);
    }
  }

  /** Signal that a provider has been rate-limited; backs off for 30 min */
  markRateLimited(source: DataSource, resetInMs = 30 * 60 * 1000): void {
    this.rateLimits.set(source, { remaining: 0, resetAt: Date.now() + resetInMs });
    logger.warn(`[WeatherProvider] ${source} marked rate-limited for ${resetInMs / 60000} min`);
  }

  getProviderNames(): DataSource[] {
    return [...this.fallbackOrder];
  }

  // ---- Cache Helpers --------------------------------------------------------

  private getFromCache<T>(map: Map<string, ICacheEntry<T>>, key: string): T | null {
    const entry = map.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      map.delete(key);
      return null;
    }
    return entry.data;
  }

  private setCache<T>(map: Map<string, ICacheEntry<T>>, key: string, data: T, ttlMs: number): void {
    map.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  private isRateLimited(source: DataSource): boolean {
    const state = this.rateLimits.get(source);
    if (!state) return false;
    if (Date.now() > state.resetAt) {
      this.rateLimits.delete(source);
      return false;
    }
    return state.remaining === 0;
  }
}

// Singleton
export const weatherProviderService = new WeatherProviderService();
export default weatherProviderService;
export { OpenWeatherMapProvider, TomorrowIoProvider };
