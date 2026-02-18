/**
 * Weather Forecast Service
 *
 * High-level forecast access layer:
 * - Retrieves the latest non-superseded forecast for a farm
 * - Generates a concise today/tomorrow/weekly summary
 * - Produces a risk forecast breakdown per hazard type
 * - Compares forecast vs actuals for accuracy reporting
 */

import mongoose from 'mongoose';
import Forecast from './forecast.model';
import WeatherSnapshot from './weatherSnapshot.model';
import FarmWeatherProfile from './farmWeatherProfile.model';
import { AppError } from '../../common/errors/AppError';
import {
  IForecastDocument,
  ForecastHorizon,
  IRiskForecastSummary,
  IForecastPrediction,
} from './weather.types';

// ============================================================================
// Forecast Service
// ============================================================================

class WeatherForecastService {

  // ---- Latest Forecast -----------------------------------------------------

  async getLatestForecast(farmId: string, horizon: ForecastHorizon): Promise<IForecastDocument> {
    const forecast = await Forecast.findOne({
      farmId:      new mongoose.Types.ObjectId(farmId),
      horizon,
      isSuperseded: false,
      expiresAt:   { $gt: new Date() },
    }).sort({ fetchedAt: -1 });

    if (!forecast) {
      throw new AppError(
        `No active ${horizon} forecast found for this farm. A fresh fetch may be in progress.`,
        404
      );
    }

    return forecast;
  }

  // ---- Summary (today / tomorrow / weekly) ---------------------------------

  async getForecastSummary(farmId: string): Promise<{
    today:   IForecastDocument | null;
    tomorrow: IForecastDocument | null;
    weekly:  IForecastDocument | null;
  }> {
    const farmObjectId = new mongoose.Types.ObjectId(farmId);

    const [hourly, daily, weekly] = await Promise.allSettled([
      Forecast.findOne({ farmId: farmObjectId, horizon: ForecastHorizon.HOURLY, isSuperseded: false, expiresAt: { $gt: new Date() } }).sort({ fetchedAt: -1 }),
      Forecast.findOne({ farmId: farmObjectId, horizon: ForecastHorizon.DAILY,  isSuperseded: false, expiresAt: { $gt: new Date() } }).sort({ fetchedAt: -1 }),
      Forecast.findOne({ farmId: farmObjectId, horizon: ForecastHorizon.WEEKLY, isSuperseded: false, expiresAt: { $gt: new Date() } }).sort({ fetchedAt: -1 }),
    ]);

    return {
      today:   hourly.status  === 'fulfilled' ? hourly.value  : null,
      tomorrow: daily.status  === 'fulfilled' ? daily.value   : null,
      weekly:  weekly.status  === 'fulfilled' ? weekly.value  : null,
    };
  }

  // ---- Risk Forecast -------------------------------------------------------

  async getRiskForecast(farmId: string, horizon: ForecastHorizon = ForecastHorizon.DAILY): Promise<IRiskForecastSummary> {
    let forecast: IForecastDocument | undefined;
    try {
      forecast = await this.getLatestForecast(farmId, horizon);
    } catch {
      // Return a neutral summary if no forecast exists
      return this.neutralRiskSummary(farmId, horizon);
    }

    const predictions = forecast.predictions;
    if (!predictions || predictions.length === 0) {
      return this.neutralRiskSummary(farmId, horizon);
    }

    const maxTemp = Math.max(...predictions.map((p) => p.tempMaxCelsius ?? p.temperatureCelsius ?? -Infinity));
    const minTemp = Math.min(...predictions.map((p) => p.tempMinCelsius ?? p.temperatureCelsius ?? Infinity));
    const maxRainProb = Math.max(...predictions.map((p) => p.precipitationProbabilityPct ?? 0));
    const maxWind = Math.max(...predictions.map((p) => p.windSpeedKph ?? 0));
    const maxUV   = Math.max(...predictions.map((p) => p.uvIndex ?? 0));

    const heatStressRisk = maxTemp >= 35;
    const frostRisk      = minTemp <= 2;
    const heavyRainRisk  = maxRainProb >= 70;
    const windRisk       = maxWind >= 55;
    const highUvRisk     = maxUV >= 9;

    const signals: string[] = [];
    let score = 0;

    if (heatStressRisk) { signals.push(`heat_stress (max ${maxTemp.toFixed(1)}°C)`);     score += 25; }
    if (frostRisk)      { signals.push(`frost_risk (min ${minTemp.toFixed(1)}°C)`);       score += 30; }
    if (heavyRainRisk)  { signals.push(`heavy_rain (${maxRainProb}% probability)`);      score += 20; }
    if (windRisk)       { signals.push(`strong_wind (${maxWind.toFixed(0)} km/h)`);       score += 15; }
    if (highUvRisk)     { signals.push(`high_uv (index ${maxUV.toFixed(1)})`);            score += 10; }

    return {
      farmId,
      horizon,
      rainProbabilityPct:    maxRainProb,
      maxTemperatureCelsius: maxTemp === -Infinity ? 0 : maxTemp,
      minTemperatureCelsius: minTemp === Infinity  ? 0 : minTemp,
      heatStressRisk,
      frostRisk,
      heavyRainRisk,
      windRisk,
      highUvRisk,
      overallRiskScore: Math.min(100, score),
      riskSignals:      signals,
      generatedAt:      new Date(),
    };
  }

  // ---- Forecast vs Actual Accuracy -----------------------------------------

  async compareForecastVsActual(farmId: string, date: Date): Promise<{
    date: string;
    forecastTemp?: number;
    actualTemp?: number;
    forecastRainMm?: number;
    actualRainMm?: number;
    tempErrorCelsius?: number;
    available: boolean;
  }> {
    const farmObjectId = new mongoose.Types.ObjectId(farmId);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const [forecast, snapshots] = await Promise.all([
      Forecast.findOne({
        farmId: farmObjectId,
        horizon: ForecastHorizon.DAILY,
        forecastPeriodStart: { $lte: dayEnd },
        forecastPeriodEnd:   { $gte: dayStart },
      }).sort({ fetchedAt: -1 }),
      WeatherSnapshot.find({
        farmId: farmObjectId,
        timestamp: { $gte: dayStart, $lte: dayEnd },
      }).lean(),
    ]);

    if (!forecast || snapshots.length === 0) {
      return { date: date.toISOString().substring(0, 10), available: false };
    }

    const forecastPrediction = forecast.predictions.find(
      (p: IForecastPrediction) => p.timestamp >= dayStart && p.timestamp <= dayEnd
    );

    const avgActualTemp = snapshots.reduce((sum, s) => sum + s.reading.temperatureCelsius, 0) / snapshots.length;
    const totalRainMm   = snapshots.reduce((sum, s) => sum + (s.reading.rainfallMm ?? 0), 0);

    const forecastTemp   = forecastPrediction?.temperatureCelsius ?? forecastPrediction?.tempMaxCelsius;
    const forecastRainMm = forecastPrediction?.rainfallMm;

    return {
      date:               date.toISOString().substring(0, 10),
      forecastTemp,
      actualTemp:         +avgActualTemp.toFixed(2),
      forecastRainMm,
      actualRainMm:       +totalRainMm.toFixed(2),
      tempErrorCelsius:   forecastTemp != null ? +(Math.abs(forecastTemp - avgActualTemp)).toFixed(2) : undefined,
      available:          true,
    };
  }

  // ---- Per-farm Dashboard Data ---------------------------------------------

  async getDashboardData(farmId: string) {
    const farmObjectId = new mongoose.Types.ObjectId(farmId);

    const [profile, latestSnapshot, riskSummary, forecastSummary] = await Promise.allSettled([
      FarmWeatherProfile.findOne({ farmId: farmObjectId }).lean(),
      WeatherSnapshot.findOne({ farmId: farmObjectId }).sort({ timestamp: -1 }).lean(),
      this.getRiskForecast(farmId, ForecastHorizon.DAILY),
      this.getForecastSummary(farmId),
    ]);

    return {
      profile:         profile.status         === 'fulfilled' ? profile.value         : null,
      latestSnapshot:  latestSnapshot.status  === 'fulfilled' ? latestSnapshot.value  : null,
      riskSummary:     riskSummary.status     === 'fulfilled' ? riskSummary.value     : null,
      forecastSummary: forecastSummary.status === 'fulfilled' ? forecastSummary.value : null,
    };
  }

  // ---- Helpers -------------------------------------------------------------

  private neutralRiskSummary(farmId: string, horizon: ForecastHorizon): IRiskForecastSummary {
    return {
      farmId,
      horizon,
      rainProbabilityPct:    0,
      maxTemperatureCelsius: 0,
      minTemperatureCelsius: 0,
      heatStressRisk:  false,
      frostRisk:       false,
      heavyRainRisk:   false,
      windRisk:        false,
      highUvRisk:      false,
      overallRiskScore: 0,
      riskSignals:     [],
      generatedAt:     new Date(),
    };
  }
}

export const weatherForecastService = new WeatherForecastService();
export default weatherForecastService;
