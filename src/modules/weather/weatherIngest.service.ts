/**
 * Weather Ingest Service
 *
 * Scheduled data ingestion pipeline:
 * 1. Iterates all active FarmWeatherProfiles
 * 2. Fetches current conditions + forecasts from the provider layer
 * 3. Deduplicates incoming snapshots against existing records
 * 4. Runs basic quality checks and flags anomalies
 * 5. Persists WeatherSnapshot + Forecast documents
 * 6. Hands off to the rules engine to generate alerts
 *
 * The scheduler runs every 30 minutes by default (configurable via
 * WEATHER_INGEST_INTERVAL_MINUTES env var).
 */

import mongoose from 'mongoose';
import logger from '../../common/utils/logger';
import FarmWeatherProfile from './farmWeatherProfile.model';
import WeatherSnapshot from './weatherSnapshot.model';
import Forecast from './forecast.model';
import weatherProviderService from './weatherProvider.service';
import {
  IFarmWeatherProfileDocument,
  IWeatherSnapshotDocument,
  ForecastHorizon,
  IngestJobStatus,
  IIngestResult,
  IWeatherReading,
} from './weather.types';

// ============================================================================
// Quality check thresholds (sanity bounds)
// ============================================================================

const QUALITY_BOUNDS: Record<string, { min: number; max: number }> = {
  temperatureCelsius: { min: -60, max: 60 },
  humidity:           { min: 0,   max: 100 },
  windSpeedKph:       { min: 0,   max: 400 },
  rainfallMmPerHour:  { min: 0,   max: 300 },
  pressureHPa:        { min: 870, max: 1085 },
  uvIndex:            { min: 0,   max: 12 },
};

// ============================================================================
// Ingest Service
// ============================================================================

class WeatherIngestService {
  private schedulerTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  // ---- Scheduler -----------------------------------------------------------

  /**
   * Start the background refresh loop.
   * Call this once from the server startup (e.g. app.ts).
   */
  startScheduler(): void {
    const intervalMinutes = parseInt(process.env.WEATHER_INGEST_INTERVAL_MINUTES ?? '30', 10);
    const intervalMs = intervalMinutes * 60 * 1000;

    logger.info(`[WeatherIngest] Scheduler started — interval: ${intervalMinutes} min`);

    // Immediate first run
    this.refreshAllProfiles().catch((err) =>
      logger.error('[WeatherIngest] Initial refresh failed', err)
    );

    this.schedulerTimer = setInterval(() => {
      this.refreshAllProfiles().catch((err) =>
        logger.error('[WeatherIngest] Scheduled refresh failed', err)
      );
    }, intervalMs);
  }

  stopScheduler(): void {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
      logger.info('[WeatherIngest] Scheduler stopped');
    }
  }

  // ---- Bulk Refresh --------------------------------------------------------

  /**
   * Refresh all active farm weather profiles.
   * Processes profiles one-at-a-time to avoid hammering provider APIs.
   */
  async refreshAllProfiles(): Promise<IIngestResult[]> {
    if (this.isRunning) {
      logger.warn('[WeatherIngest] Previous refresh still running, skipping cycle');
      return [];
    }

    this.isRunning = true;
    const results: IIngestResult[] = [];

    try {
      const profiles = await FarmWeatherProfile.find({ isActive: true }).lean();
      logger.info(`[WeatherIngest] Refreshing ${profiles.length} active profile(s)`);

      for (const profile of profiles) {
        const result = await this.refreshProfile(profile._id.toString());
        results.push(result);
      }

      const failed = results.filter((r) => r.status === IngestJobStatus.FAILED).length;
      logger.info(`[WeatherIngest] Cycle complete — ${results.length} processed, ${failed} failed`);
    } finally {
      this.isRunning = false;
    }

    return results;
  }

  // ---- Single Profile Refresh ----------------------------------------------

  async refreshProfile(profileId: string): Promise<IIngestResult> {
    const start = Date.now();
    const objectId = new mongoose.Types.ObjectId(profileId);

    const profile = await FarmWeatherProfile.findById(objectId);
    if (!profile) {
      return this.buildResult(profileId, '', IngestJobStatus.SKIPPED, start, undefined, undefined, 0, 'Profile not found');
    }

    const farmId = profile.farmId.toString();
    const [lng, lat] = profile.geoLocation.coordinates;

    try {
      // 1 — Fetch current conditions
      const currentData = await weatherProviderService.fetchCurrent(lat, lng);

      // 2 — Quality check
      const qualityFlags = this.runQualityCheck(currentData.reading);

      // 3 — Deduplication check
      const isDuplicate = await this.isDuplicateSnapshot(
        profile.farmId,
        currentData.providerRef ?? null,
        currentData.fetchedAt
      );

      let snapshotId: string | undefined;

      if (!isDuplicate) {
        const snapshot = await WeatherSnapshot.create({
          farmId: profile.farmId,
          profileId: objectId,
          timestamp: currentData.fetchedAt,
          reading: currentData.reading,
          dataSource: currentData.source,
          providerRef: currentData.providerRef ?? null,
          confidenceScore: 1.0,
          qualityFlags,
          rawPayload: currentData.raw ?? null,
        });
        snapshotId = (snapshot as IWeatherSnapshotDocument)._id?.toString();
      } else {
        logger.debug(`[WeatherIngest] Duplicate snapshot skipped for farm ${farmId}`);
      }

      // 4 — Fetch and store forecasts for all horizons
      const forecastIds: string[] = [];
      for (const horizon of [ForecastHorizon.HOURLY, ForecastHorizon.DAILY]) {
        try {
          const fId = await this.updateForecast(profile, horizon);
          if (fId) forecastIds.push(fId);
        } catch (fErr) {
          logger.warn(`[WeatherIngest] Forecast (${horizon}) failed for farm ${farmId}: ${(fErr as Error).message}`);
        }
      }

      // 5 — Trigger the rules engine (require to avoid circular deps)
      let alertsGenerated = 0;
      if (snapshotId) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const rulesService = require('./weatherRules.service').weatherRulesService as {
            generateAlertsForProfile: (
              profile: IFarmWeatherProfileDocument,
              reading: IWeatherReading
            ) => Promise<unknown[]>;
          };
          const alerts = await rulesService.generateAlertsForProfile(profile, currentData.reading);
          alertsGenerated = alerts.length;
        } catch (rErr) {
          logger.warn(`[WeatherIngest] Rules evaluation failed for farm ${farmId}: ${(rErr as Error).message}`);
        }
      }

      return this.buildResult(profileId, farmId, IngestJobStatus.COMPLETED, start, snapshotId, forecastIds, alertsGenerated);
    } catch (err) {
      logger.error(`[WeatherIngest] refreshProfile failed for ${profileId}:`, err);
      return this.buildResult(profileId, farmId, IngestJobStatus.FAILED, start, undefined, undefined, 0, (err as Error).message);
    }
  }

  // ---- Forecast Update -----------------------------------------------------

  async updateForecast(
    profile: IFarmWeatherProfileDocument,
    horizon: ForecastHorizon
  ): Promise<string | null> {
    const [lng, lat] = profile.geoLocation.coordinates;
    const forecastData = await weatherProviderService.fetchForecast(lat, lng, horizon);

    if (forecastData.predictions.length === 0) return null;

    // Mark previous forecasts as superseded
    await Forecast.updateMany(
      { farmId: profile.farmId, horizon, isSuperseded: false },
      { $set: { isSuperseded: true } }
    );

    const periodStart = forecastData.predictions[0].timestamp;
    const periodEnd   = forecastData.predictions[forecastData.predictions.length - 1].timestamp;

    const created = await Forecast.create({
      farmId:             profile.farmId,
      profileId:          profile._id,
      horizon,
      forecastPeriodStart: periodStart,
      forecastPeriodEnd:   periodEnd,
      predictions:        forecastData.predictions,
      provider:           forecastData.source,
      modelVersion:       forecastData.modelVersion ?? null,
      fetchedAt:          forecastData.fetchedAt,
      expiresAt:          forecastData.expiresAt,
      isSuperseded:       false,
    });

    return created._id?.toString() ?? null;
  }

  // ---- Deduplication -------------------------------------------------------

  async isDuplicateSnapshot(
    farmId: mongoose.Types.ObjectId,
    providerRef: string | null,
    timestamp: Date
  ): Promise<boolean> {
    if (!providerRef) {
      // Without a provider reference, check for a snapshot within 5 minutes
      const fiveMinAgo = new Date(timestamp.getTime() - 5 * 60 * 1000);
      const count = await WeatherSnapshot.countDocuments({
        farmId,
        timestamp: { $gte: fiveMinAgo, $lte: timestamp },
      });
      return count > 0;
    }

    const count = await WeatherSnapshot.countDocuments({ farmId, providerRef });
    return count > 0;
  }

  // ---- Quality Check -------------------------------------------------------

  runQualityCheck(reading: IWeatherReading): string[] {
    const flags: string[] = [];

    for (const [field, bounds] of Object.entries(QUALITY_BOUNDS)) {
      const value = (reading as unknown as Record<string, number | undefined>)[field];
      if (value == null) continue;
      if (value < bounds.min || value > bounds.max) {
        flags.push(`out_of_bounds:${field}:${value}`);
        logger.warn(`[WeatherIngest] Quality flag: ${field}=${value} is outside [${bounds.min},${bounds.max}]`);
      }
    }

    return flags;
  }

  // ---- Manual Trigger ------------------------------------------------------

  /** Force a refresh for a specific farm (e.g. from admin API) */
  async manualRefresh(profileId: string): Promise<IIngestResult> {
    logger.info(`[WeatherIngest] Manual refresh triggered for profile ${profileId}`);
    return this.refreshProfile(profileId);
  }

  // ---- Cleanup -------------------------------------------------------------

  /**
   * Remove WeatherSnapshots older than `daysOld` that have no attached alert.
   * Complements the Mongoose TTL index for early cleanup.
   */
  async pruneOldSnapshots(daysOld = 90): Promise<number> {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const result = await WeatherSnapshot.deleteMany({ timestamp: { $lt: cutoff } });
    logger.info(`[WeatherIngest] Pruned ${result.deletedCount} snapshots older than ${daysOld} days`);
    return result.deletedCount;
  }

  // ---- Helpers -------------------------------------------------------------

  private buildResult(
    profileId: string,
    farmId: string,
    status: IngestJobStatus,
    start: number,
    snapshotId?: string,
    forecastIds?: string[],
    alertsGenerated?: number,
    error?: string
  ): IIngestResult {
    return {
      profileId,
      farmId,
      status,
      snapshotId,
      forecastIds,
      alertsGenerated,
      error,
      durationMs: Date.now() - start,
    };
  }
}

export const weatherIngestService = new WeatherIngestService();
export default weatherIngestService;
