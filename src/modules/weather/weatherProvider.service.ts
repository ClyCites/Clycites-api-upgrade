/**
 * Weather Provider Service
 *
 * Provider-agnostic ingestion layer with:
 * - Pluggable adapter registry (Open-Meteo, Tomorrow.io, …)
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
import WeatherProviderCache from './weatherProviderCache.model';
import {
  IWeatherProvider,
  IProviderCurrentResponse,
  IProviderForecastResponse,
  ForecastHorizon,
  DataSource,
  IWeatherReading,
  IForecastPrediction,
  IWeatherFetchOptions,
  ProviderCacheTier,
} from './weather.types';

// ============================================================================
// Cache Entry
// ============================================================================

interface ICacheEntry<T> {
  data: T;
  expiresAt: number; // epoch ms
}

interface ICachePolicy {
  memoryTtlMs: number;
  freshTtlMs: number;
  staleTtlMs: number;
}

// ============================================================================
// Rate-limit Guard
// ============================================================================

interface IRateLimitState {
  remaining: number;
  resetAt: number; // epoch ms
}

// ============================================================================
// Open-Meteo Adapter
// ============================================================================

class OpenMeteoProvider implements IWeatherProvider {
  readonly name = DataSource.OPEN_METEO;
  private readonly baseUrl: string;

  constructor(baseUrl = process.env.OPEN_METEO_API_URL || process.env.WEATHER_API_URL || 'https://api.open-meteo.com/v1') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private getFirstHourlyRecord(hourly: Record<string, unknown> | undefined): Record<string, unknown> {
    if (!hourly) return {};

    const record: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(hourly)) {
      if (key === 'time') continue;
      if (Array.isArray(value)) {
        record[key] = value[0];
      }
    }
    return record;
  }

  async fetchCurrent(lat: number, lng: number, _options?: IWeatherFetchOptions): Promise<IProviderCurrentResponse> {
    const url = `${this.baseUrl}/forecast`;
    const res = await axios.get(url, {
      params: {
        latitude: lat,
        longitude: lng,
        timezone: 'auto',
        wind_speed_unit: 'kmh',
        precipitation_unit: 'mm',
        current: [
          'temperature_2m',
          'apparent_temperature',
          'relative_humidity_2m',
          'precipitation',
          'cloud_cover',
          'pressure_msl',
          'wind_speed_10m',
          'wind_direction_10m',
          'wind_gusts_10m',
          'visibility',
          'dew_point_2m',
          'uv_index',
          'weather_code',
          'is_day',
        ].join(','),
        hourly: [
          'weather_code',
          'is_day',
          'vapour_pressure_deficit',
          'evapotranspiration',
          'et0_fao_evapotranspiration',
          'shortwave_radiation',
          'direct_radiation',
          'diffuse_radiation',
          'direct_normal_irradiance',
          'sunshine_duration',
          'soil_temperature_0cm',
          'soil_temperature_6cm',
          'soil_moisture_0_to_1cm',
          'soil_moisture_1_to_3cm',
          'soil_moisture_3_to_9cm',
        ].join(','),
        forecast_hours: 1,
      },
      timeout: 8000,
    });
    const d = res.data ?? {};
    const current = d.current ?? {};
    const hourlyCurrent = this.getFirstHourlyRecord(d.hourly);
    const fetchedAt = current.time ? new Date(current.time) : new Date();

    const reading: IWeatherReading = {
      temperatureCelsius: current.temperature_2m ?? 0,
      feelsLikeCelsius:   current.apparent_temperature ?? undefined,
      humidity:           current.relative_humidity_2m ?? 0,
      windSpeedKph:       current.wind_speed_10m ?? undefined,
      windDirectionDeg:   current.wind_direction_10m ?? undefined,
      windGustKph:        current.wind_gusts_10m ?? undefined,
      rainfallMm:         current.precipitation ?? undefined,
      rainfallMmPerHour:  current.precipitation ?? undefined,
      cloudCoverPct:      current.cloud_cover ?? undefined,
      pressureHPa:        current.pressure_msl ?? undefined,
      uvIndex:            current.uv_index ?? undefined,
      visibilityKm:       current.visibility != null ? +(current.visibility / 1000).toFixed(2) : undefined,
      dewPointCelsius:    current.dew_point_2m ?? undefined,
      weatherCode:        current.weather_code ?? (hourlyCurrent.weather_code as number | undefined),
      isDay:              current.is_day != null ? Boolean(current.is_day) : (hourlyCurrent.is_day != null ? Boolean(hourlyCurrent.is_day) : undefined),
      vapourPressureDeficitKPa:   hourlyCurrent.vapour_pressure_deficit as number | undefined,
      evapotranspirationMm:       hourlyCurrent.evapotranspiration as number | undefined,
      et0FaoEvapotranspirationMm: hourlyCurrent.et0_fao_evapotranspiration as number | undefined,
      shortwaveRadiationWm2:      hourlyCurrent.shortwave_radiation as number | undefined,
      directRadiationWm2:         hourlyCurrent.direct_radiation as number | undefined,
      diffuseRadiationWm2:        hourlyCurrent.diffuse_radiation as number | undefined,
      directNormalIrradianceWm2:  hourlyCurrent.direct_normal_irradiance as number | undefined,
      sunshineDurationSeconds:    hourlyCurrent.sunshine_duration as number | undefined,
      soilTemperature0cm:         hourlyCurrent.soil_temperature_0cm as number | undefined,
      soilTemperature6cm:         hourlyCurrent.soil_temperature_6cm as number | undefined,
      soilMoisture0To1cm:         hourlyCurrent.soil_moisture_0_to_1cm as number | undefined,
      soilMoisture1To3cm:         hourlyCurrent.soil_moisture_1_to_3cm as number | undefined,
      soilMoisture3To9cm:         hourlyCurrent.soil_moisture_3_to_9cm as number | undefined,
    };

    return {
      source: DataSource.OPEN_METEO,
      fetchedAt,
      reading,
      providerRef: current.time ?? undefined,
      raw: d,
    };
  }

  async fetchForecast(
    lat: number,
    lng: number,
    horizon: ForecastHorizon,
    _options?: IWeatherFetchOptions
  ): Promise<IProviderForecastResponse> {
    const isHourly = horizon === ForecastHorizon.HOURLY;
    const forecastDays = horizon === ForecastHorizon.WEEKLY ? 14 : 7;
    const url = `${this.baseUrl}/forecast`;
    const res = await axios.get(url, {
      params: {
        latitude: lat,
        longitude: lng,
        timezone: 'auto',
        wind_speed_unit: 'kmh',
        precipitation_unit: 'mm',
        ...(isHourly
          ? {
              hourly: [
                'temperature_2m',
                'relative_humidity_2m',
                'precipitation_probability',
                'precipitation',
                'cloud_cover',
                'wind_speed_10m',
                'wind_direction_10m',
                'uv_index',
                'weather_code',
                'is_day',
                'vapour_pressure_deficit',
                'evapotranspiration',
                'et0_fao_evapotranspiration',
                'shortwave_radiation',
                'direct_radiation',
                'diffuse_radiation',
                'direct_normal_irradiance',
                'sunshine_duration',
                'soil_temperature_0cm',
                'soil_temperature_6cm',
                'soil_moisture_0_to_1cm',
                'soil_moisture_1_to_3cm',
                'soil_moisture_3_to_9cm',
              ].join(','),
              forecast_hours: 24,
            }
          : {
              daily: [
                'temperature_2m_max',
                'temperature_2m_min',
                'relative_humidity_2m_mean',
                'precipitation_sum',
                'precipitation_probability_max',
                'wind_speed_10m_max',
                'wind_direction_10m_dominant',
                'cloud_cover_mean',
                'uv_index_max',
                'weather_code',
                'sunrise',
                'sunset',
                'daylight_duration',
                'sunshine_duration',
                'shortwave_radiation_sum',
                'et0_fao_evapotranspiration',
              ].join(','),
              forecast_days: forecastDays,
            }),
      },
      timeout: 10000,
    });
    const d = res.data ?? {};
    const predictions: IForecastPrediction[] = isHourly
      ? (d.hourly?.time ?? []).map((time: string, index: number) => ({
          timestamp:                   new Date(time),
          temperatureCelsius:          d.hourly?.temperature_2m?.[index] ?? null,
          tempMinCelsius:              null,
          tempMaxCelsius:              null,
          humidity:                    d.hourly?.relative_humidity_2m?.[index] ?? null,
          rainfallMm:                  d.hourly?.precipitation?.[index] ?? null,
          precipitationProbabilityPct: d.hourly?.precipitation_probability?.[index] ?? null,
          windSpeedKph:                d.hourly?.wind_speed_10m?.[index] ?? null,
          windDirectionDeg:            d.hourly?.wind_direction_10m?.[index] ?? null,
          cloudCoverPct:               d.hourly?.cloud_cover?.[index] ?? null,
          uvIndex:                     d.hourly?.uv_index?.[index] ?? null,
          weatherCode:                 d.hourly?.weather_code?.[index] ?? null,
          isDay:                       d.hourly?.is_day?.[index] != null ? Boolean(d.hourly?.is_day?.[index]) : null,
          vapourPressureDeficitKPa:    d.hourly?.vapour_pressure_deficit?.[index] ?? null,
          evapotranspirationMm:        d.hourly?.evapotranspiration?.[index] ?? null,
          et0FaoEvapotranspirationMm:  d.hourly?.et0_fao_evapotranspiration?.[index] ?? null,
          shortwaveRadiationWm2:       d.hourly?.shortwave_radiation?.[index] ?? null,
          directRadiationWm2:          d.hourly?.direct_radiation?.[index] ?? null,
          diffuseRadiationWm2:         d.hourly?.diffuse_radiation?.[index] ?? null,
          directNormalIrradianceWm2:   d.hourly?.direct_normal_irradiance?.[index] ?? null,
          sunshineDurationSeconds:     d.hourly?.sunshine_duration?.[index] ?? null,
          soilTemperature0cm:          d.hourly?.soil_temperature_0cm?.[index] ?? null,
          soilTemperature6cm:          d.hourly?.soil_temperature_6cm?.[index] ?? null,
          soilMoisture0To1cm:          d.hourly?.soil_moisture_0_to_1cm?.[index] ?? null,
          soilMoisture1To3cm:          d.hourly?.soil_moisture_1_to_3cm?.[index] ?? null,
          soilMoisture3To9cm:          d.hourly?.soil_moisture_3_to_9cm?.[index] ?? null,
        }))
      : (d.daily?.time ?? []).map((time: string, index: number) => ({
          timestamp:                   new Date(time),
          temperatureCelsius:          d.daily?.temperature_2m_max?.[index] ?? null,
          tempMinCelsius:              d.daily?.temperature_2m_min?.[index] ?? null,
          tempMaxCelsius:              d.daily?.temperature_2m_max?.[index] ?? null,
          humidity:                    d.daily?.relative_humidity_2m_mean?.[index] ?? null,
          rainfallMm:                  d.daily?.precipitation_sum?.[index] ?? null,
          precipitationProbabilityPct: d.daily?.precipitation_probability_max?.[index] ?? null,
          windSpeedKph:                d.daily?.wind_speed_10m_max?.[index] ?? null,
          windDirectionDeg:            d.daily?.wind_direction_10m_dominant?.[index] ?? null,
          cloudCoverPct:               d.daily?.cloud_cover_mean?.[index] ?? null,
          uvIndex:                     d.daily?.uv_index_max?.[index] ?? null,
          weatherCode:                 d.daily?.weather_code?.[index] ?? null,
          et0FaoEvapotranspirationMm:  d.daily?.et0_fao_evapotranspiration?.[index] ?? null,
          shortwaveRadiationSumMjM2:   d.daily?.shortwave_radiation_sum?.[index] ?? null,
          sunshineDurationSeconds:     d.daily?.sunshine_duration?.[index] ?? null,
          daylightDurationSeconds:     d.daily?.daylight_duration?.[index] ?? null,
          sunrise:                     d.daily?.sunrise?.[index] ? new Date(d.daily.sunrise[index]) : null,
          sunset:                      d.daily?.sunset?.[index] ? new Date(d.daily.sunset[index]) : null,
        }));

    const now = new Date();
    const ttlMs = isHourly ? 2 * 60 * 60 * 1000 : 6 * 60 * 60 * 1000;

    return {
      source: DataSource.OPEN_METEO,
      fetchedAt: now,
      horizon,
      predictions,
      modelVersion: 'open-meteo-v1',
      expiresAt: new Date(now.getTime() + ttlMs),
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

  async fetchCurrent(lat: number, lng: number, _options?: IWeatherFetchOptions): Promise<IProviderCurrentResponse> {
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

  async fetchForecast(
    lat: number,
    lng: number,
    horizon: ForecastHorizon,
    _options?: IWeatherFetchOptions
  ): Promise<IProviderForecastResponse> {
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

  // Cache keyed by rounded lat/lng
  private readonly currentCache = new Map<string, ICacheEntry<IProviderCurrentResponse>>();
  private readonly forecastCache = new Map<string, ICacheEntry<IProviderForecastResponse>>();

  // Rate-limit tracking per provider
  private readonly rateLimits = new Map<DataSource, IRateLimitState>();

  // Cache policies
  private readonly CURRENT_POLICY: ICachePolicy = {
    memoryTtlMs: 10 * 60 * 1000,
    freshTtlMs: 10 * 60 * 1000,
    staleTtlMs: 2 * 60 * 60 * 1000,
  };

  private readonly HOURLY_FORECAST_POLICY: ICachePolicy = {
    memoryTtlMs: 60 * 60 * 1000,
    freshTtlMs: 60 * 60 * 1000,
    staleTtlMs: 6 * 60 * 60 * 1000,
  };

  private readonly DAILY_FORECAST_POLICY: ICachePolicy = {
    memoryTtlMs: 6 * 60 * 60 * 1000,
    freshTtlMs: 6 * 60 * 60 * 1000,
    staleTtlMs: 24 * 60 * 60 * 1000,
  };

  constructor() {
    this.initDefaultProviders();
  }

  // ---- Initialisation -------------------------------------------------------

  private initDefaultProviders(): void {
    const tioKey = process.env.TOMORROWIO_API_KEY;

    this.registerProvider(new OpenMeteoProvider(), true);
    logger.info('[WeatherProvider] Open-Meteo registered as primary');

    if (tioKey) {
      this.registerProvider(new TomorrowIoProvider(tioKey));
      logger.info('[WeatherProvider] Tomorrow.io registered as fallback');
    }

    logger.info(`[WeatherProvider] Active providers: ${this.fallbackOrder.join(', ')}`);
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

  async fetchCurrent(
    lat: number,
    lng: number,
    options: IWeatherFetchOptions = {}
  ): Promise<IProviderCurrentResponse> {
    const policy = this.CURRENT_POLICY;
    const cacheKey = this.buildCurrentCacheKey(lat, lng);

    if (!options.forceRefresh) {
      const cached = this.getFromCache(this.currentCache, cacheKey);
      if (cached) {
        return this.withCacheMetadata(cached, 'memory', cached.cache?.stale ?? false, cacheKey);
      }

      const persistent = await this.getPersistentCurrentCache(cacheKey);
      if (persistent) {
        this.setCache(this.currentCache, cacheKey, persistent, policy.memoryTtlMs);
        return persistent;
      }
    }

    for (const sourceName of this.fallbackOrder) {
      if (this.isRateLimited(sourceName)) {
        logger.debug(`[WeatherProvider] ${sourceName} rate-limited; skipping`);
        continue;
      }
      const provider = this.providers.get(sourceName)!;
      try {
        const result = await provider.fetchCurrent(lat, lng, options);
        const freshUntil = new Date(result.fetchedAt.getTime() + policy.freshTtlMs);
        const staleUntil = new Date(result.fetchedAt.getTime() + policy.staleTtlMs);
        const cachedResult = this.withCacheMetadata(result, 'live', false, cacheKey, freshUntil, staleUntil);
        this.setCache(this.currentCache, cacheKey, cachedResult, policy.memoryTtlMs);
        await this.persistCurrentCache(lat, lng, cacheKey, cachedResult, freshUntil, staleUntil);
        return cachedResult;
      } catch (err) {
        logger.warn(`[WeatherProvider] ${sourceName} fetchCurrent failed: ${(err as Error).message}`);
      }
    }

    if (options.allowStale !== false) {
      const stale = await this.getPersistentCurrentCache(cacheKey, true);
      if (stale) {
        this.setCache(this.currentCache, cacheKey, stale, this.getStaleMemoryTtlMs(stale.cache?.staleUntil));
        return stale;
      }
    }

    throw new Error('All weather providers failed for fetchCurrent. Check API keys and connectivity.');
  }

  async fetchForecast(
    lat: number,
    lng: number,
    horizon: ForecastHorizon,
    options: IWeatherFetchOptions = {}
  ): Promise<IProviderForecastResponse> {
    const policy = this.getForecastPolicy(horizon);
    const cacheKey = this.buildForecastCacheKey(lat, lng, horizon);

    if (!options.forceRefresh) {
      const cached = this.getFromCache(this.forecastCache, cacheKey);
      if (cached) {
        return this.withCacheMetadata(cached, 'memory', cached.cache?.stale ?? false, cacheKey);
      }

      const persistent = await this.getPersistentForecastCache(cacheKey);
      if (persistent) {
        this.setCache(this.forecastCache, cacheKey, persistent, policy.memoryTtlMs);
        return persistent;
      }
    }

    for (const sourceName of this.fallbackOrder) {
      if (this.isRateLimited(sourceName)) continue;
      const provider = this.providers.get(sourceName)!;
      try {
        const result = await provider.fetchForecast(lat, lng, horizon, options);
        const freshUntil = new Date(result.fetchedAt.getTime() + policy.freshTtlMs);
        const staleUntil = new Date(result.fetchedAt.getTime() + policy.staleTtlMs);
        const cachedResult = this.withCacheMetadata(result, 'live', false, cacheKey, freshUntil, staleUntil);
        this.setCache(this.forecastCache, cacheKey, cachedResult, policy.memoryTtlMs);
        await this.persistForecastCache(lat, lng, horizon, cacheKey, cachedResult, freshUntil, staleUntil);
        return cachedResult;
      } catch (err) {
        logger.warn(`[WeatherProvider] ${sourceName} fetchForecast failed: ${(err as Error).message}`);
      }
    }

    if (options.allowStale !== false) {
      const stale = await this.getPersistentForecastCache(cacheKey, true);
      if (stale) {
        this.setCache(this.forecastCache, cacheKey, stale, this.getStaleMemoryTtlMs(stale.cache?.staleUntil));
        return stale;
      }
    }

    throw new Error('All weather providers failed for fetchForecast. Check API keys and connectivity.');
  }

  /** Manually bust cache for a location (e.g. after test or manual trigger) */
  bustCache(lat: number, lng: number): void {
    const prefix4 = this.buildLocationKey(lat, lng);
    for (const key of this.currentCache.keys()) {
      if (key.includes(prefix4)) this.currentCache.delete(key);
    }
    for (const key of this.forecastCache.keys()) {
      if (key.includes(prefix4)) this.forecastCache.delete(key);
    }

    WeatherProviderCache.deleteMany({ locationKey: prefix4 }).catch((err) => {
      logger.warn(`[WeatherProvider] Failed to clear persistent cache for ${prefix4}: ${(err as Error).message}`);
    });
  }

  /** Signal that a provider has been rate-limited; backs off for 30 min */
  markRateLimited(source: DataSource, resetInMs = 30 * 60 * 1000): void {
    this.rateLimits.set(source, { remaining: 0, resetAt: Date.now() + resetInMs });
    logger.warn(`[WeatherProvider] ${source} marked rate-limited for ${resetInMs / 60000} min`);
  }

  getProviderNames(): DataSource[] {
    return [...this.fallbackOrder];
  }

  getProviderStatus(): {
    providers: DataSource[];
    cache: {
      current: { memoryMinutes: number; freshMinutes: number; staleMinutes: number };
      forecastHourly: { memoryMinutes: number; freshMinutes: number; staleMinutes: number };
      forecastDaily: { memoryMinutes: number; freshMinutes: number; staleMinutes: number };
    };
  } {
    return {
      providers: this.getProviderNames(),
      cache: {
        current: this.toMinutes(this.CURRENT_POLICY),
        forecastHourly: this.toMinutes(this.HOURLY_FORECAST_POLICY),
        forecastDaily: this.toMinutes(this.DAILY_FORECAST_POLICY),
      },
    };
  }

  // ---- Cache Helpers --------------------------------------------------------

  private buildLocationKey(lat: number, lng: number): string {
    return `${lat.toFixed(4)}:${lng.toFixed(4)}`;
  }

  private buildCurrentCacheKey(lat: number, lng: number): string {
    return `current:${this.buildLocationKey(lat, lng)}`;
  }

  private buildForecastCacheKey(lat: number, lng: number, horizon: ForecastHorizon): string {
    return `forecast:${horizon}:${this.buildLocationKey(lat, lng)}`;
  }

  private getForecastPolicy(horizon: ForecastHorizon): ICachePolicy {
    return horizon === ForecastHorizon.HOURLY
      ? this.HOURLY_FORECAST_POLICY
      : this.DAILY_FORECAST_POLICY;
  }

  private withCacheMetadata<T extends IProviderCurrentResponse | IProviderForecastResponse>(
    data: T,
    tier: ProviderCacheTier,
    stale: boolean,
    cacheKey: string,
    freshUntil?: Date,
    staleUntil?: Date
  ): T {
    return {
      ...data,
      cache: {
        tier,
        stale,
        cacheKey,
        freshUntil: freshUntil ?? data.cache?.freshUntil,
        staleUntil: staleUntil ?? data.cache?.staleUntil,
      },
    };
  }

  private async getPersistentCurrentCache(
    cacheKey: string,
    includeStale = false
  ): Promise<IProviderCurrentResponse | null> {
    const now = new Date();
    const doc = await WeatherProviderCache.findOne({
      kind: 'current',
      cacheKey,
      ...(includeStale ? { staleUntil: { $gt: now } } : { freshUntil: { $gt: now } }),
    })
      .select('+rawPayload')
      .lean();

    if (!doc?.reading) return null;

    const stale = new Date(doc.freshUntil) <= now;
    return this.withCacheMetadata(
      {
        source: doc.source,
        fetchedAt: new Date(doc.fetchedAt),
        reading: doc.reading as IWeatherReading,
        providerRef: doc.providerRef ?? undefined,
        raw: doc.rawPayload ?? undefined,
      },
      'persistent',
      stale,
      cacheKey,
      new Date(doc.freshUntil),
      new Date(doc.staleUntil)
    );
  }

  private async getPersistentForecastCache(
    cacheKey: string,
    includeStale = false
  ): Promise<IProviderForecastResponse | null> {
    const now = new Date();
    const doc = await WeatherProviderCache.findOne({
      kind: 'forecast',
      cacheKey,
      ...(includeStale ? { staleUntil: { $gt: now } } : { freshUntil: { $gt: now } }),
    })
      .select('+rawPayload')
      .lean();

    if (!doc?.horizon || !Array.isArray(doc.predictions)) return null;

    const stale = new Date(doc.freshUntil) <= now;
    return this.withCacheMetadata(
      {
        source: doc.source,
        fetchedAt: new Date(doc.fetchedAt),
        horizon: doc.horizon as ForecastHorizon,
        predictions: doc.predictions as IForecastPrediction[],
        modelVersion: doc.modelVersion ?? undefined,
        expiresAt: doc.providerExpiresAt ? new Date(doc.providerExpiresAt) : new Date(doc.staleUntil),
        raw: doc.rawPayload ?? undefined,
      },
      'persistent',
      stale,
      cacheKey,
      new Date(doc.freshUntil),
      new Date(doc.staleUntil)
    );
  }

  private async persistCurrentCache(
    lat: number,
    lng: number,
    cacheKey: string,
    data: IProviderCurrentResponse,
    freshUntil: Date,
    staleUntil: Date
  ): Promise<void> {
    await WeatherProviderCache.findOneAndUpdate(
      { cacheKey },
      {
        $set: {
          kind: 'current',
          cacheKey,
          locationKey: this.buildLocationKey(lat, lng),
          latitude: lat,
          longitude: lng,
          horizon: null,
          source: data.source,
          fetchedAt: data.fetchedAt,
          freshUntil,
          staleUntil,
          providerExpiresAt: null,
          providerRef: data.providerRef ?? null,
          modelVersion: null,
          reading: data.reading,
          predictions: [],
          rawPayload: data.raw ?? null,
        },
      },
      {
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  private async persistForecastCache(
    lat: number,
    lng: number,
    horizon: ForecastHorizon,
    cacheKey: string,
    data: IProviderForecastResponse,
    freshUntil: Date,
    staleUntil: Date
  ): Promise<void> {
    await WeatherProviderCache.findOneAndUpdate(
      { cacheKey },
      {
        $set: {
          kind: 'forecast',
          cacheKey,
          locationKey: this.buildLocationKey(lat, lng),
          latitude: lat,
          longitude: lng,
          horizon,
          source: data.source,
          fetchedAt: data.fetchedAt,
          freshUntil,
          staleUntil,
          providerExpiresAt: data.expiresAt,
          providerRef: null,
          modelVersion: data.modelVersion ?? null,
          reading: null,
          predictions: data.predictions,
          rawPayload: data.raw ?? null,
        },
      },
      {
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
  }

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

  private getStaleMemoryTtlMs(staleUntil?: Date): number {
    if (!staleUntil) return 60 * 1000;
    return Math.max(1000, Math.min(5 * 60 * 1000, staleUntil.getTime() - Date.now()));
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

  private toMinutes(policy: ICachePolicy): {
    memoryMinutes: number;
    freshMinutes: number;
    staleMinutes: number;
  } {
    return {
      memoryMinutes: Math.round(policy.memoryTtlMs / 60000),
      freshMinutes: Math.round(policy.freshTtlMs / 60000),
      staleMinutes: Math.round(policy.staleTtlMs / 60000),
    };
  }
}

// Singleton
export const weatherProviderService = new WeatherProviderService();
export default weatherProviderService;
export { OpenMeteoProvider, TomorrowIoProvider };
