/**
 * Weather Module Controller
 *
 * All handlers follow the codebase pattern:
 *   - Destructure IDs from req.params / req.body
 *   - Delegate to service layer
 *   - Use sendSuccess / sendError for responses
 *   - Pass errors to next() for centralised handling
 */

import { Response, NextFunction, Request } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../../common/middleware/auth';
import { sendSuccess } from '../../common/utils/response';
import auditService from '../audit/audit.service';
import { AppError } from '../../common/errors/AppError';

import FarmWeatherProfile from './farmWeatherProfile.model';
import WeatherSnapshot from './weatherSnapshot.model';
import WeatherRule from './weatherRule.model';

import weatherIngestService from './weatherIngest.service';
import weatherAlertService from './weatherAlert.service';
import weatherForecastService from './weatherForecast.service';
import weatherRulesService from './weatherRules.service';
import weatherProviderService from './weatherProvider.service';

import {
  AlertSeverity,
  AlertStatus,
  AlertType,
  ForecastHorizon,
  ICreateProfileInput,
  IUpdateProfileInput,
  ICreateRuleInput,
  IUpdateRuleInput,
  WeatherUnit,
  DeliveryChannel,
} from './weather.types';
import { PaginationUtil } from '../../common/utils/pagination';

// ============================================================================
// Profiles
// ============================================================================

export async function createProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const input: ICreateProfileInput = req.body;

    const profile = await FarmWeatherProfile.create({
      farmId:         new mongoose.Types.ObjectId(input.farmId),
      farmerId:       new mongoose.Types.ObjectId(userId),
      organizationId: input.organizationId ? new mongoose.Types.ObjectId(input.organizationId) : null,
      farmName:       input.farmName,
      geoLocation:    { type: 'Point', coordinates: [input.lng, input.lat] },
      altitude:       input.altitude ?? null,
      timezone:       input.timezone ?? 'UTC',
      preferredUnits: input.preferredUnits ?? WeatherUnit.METRIC,
      alertPreferences: {
        channels: input.alertPreferences?.channels ?? [DeliveryChannel.IN_APP],
        thresholds: input.alertPreferences?.thresholds ?? {},
        minimumSeverity: input.alertPreferences?.minimumSeverity ?? AlertSeverity.LOW,
        quietHoursStart: input.alertPreferences?.quietHoursStart ?? null,
        quietHoursEnd:   input.alertPreferences?.quietHoursEnd ?? null,
        enabledAlertTypes: input.alertPreferences?.enabledAlertTypes ?? null,
      },
      primaryCropTypes: input.primaryCropTypes ?? [],
      isActive: true,
    });

    await auditService.log({
      userId,
      action:     'create',
      resource:   'FarmWeatherProfile',
      resourceId: (profile._id as mongoose.Types.ObjectId).toString(),
      status:     'success',
    });

    sendSuccess(res, profile, 'Farm weather profile created successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function getMyProfiles(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const profiles = await FarmWeatherProfile.find({ farmerId: userId, isActive: true }).lean();
    sendSuccess(res, profiles, 'Profiles retrieved');
  } catch (error) {
    next(error);
  }
}

export async function getProfileById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await FarmWeatherProfile.findById(req.params.id);
    if (!profile) throw new AppError('Profile not found', 404);
    sendSuccess(res, profile);
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const input: IUpdateProfileInput = req.body;

    const update: Record<string, unknown> = {};
    if (input.farmName          != null) update.farmName      = input.farmName;
    if (input.altitude          != null) update.altitude      = input.altitude;
    if (input.timezone          != null) update.timezone      = input.timezone;
    if (input.preferredUnits    != null) update.preferredUnits = input.preferredUnits;
    if (input.primaryCropTypes  != null) update.primaryCropTypes = input.primaryCropTypes;
    if (input.alertPreferences  != null) update.alertPreferences = input.alertPreferences;
    if (input.lat != null && input.lng != null) {
      update.geoLocation = { type: 'Point', coordinates: [input.lng, input.lat] };
    }

    const profile = await FarmWeatherProfile.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    );
    if (!profile) throw new AppError('Profile not found', 404);

    await auditService.log({
      userId,
      action:     'update',
      resource:   'FarmWeatherProfile',
      resourceId: req.params.id,
      status:     'success',
    });

    // Bust cache for old location
    weatherProviderService.bustCache(
      profile.geoLocation.coordinates[1],
      profile.geoLocation.coordinates[0]
    );

    sendSuccess(res, profile, 'Profile updated');
  } catch (error) {
    next(error);
  }
}

export async function deleteProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const profile = await FarmWeatherProfile.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false, deletedAt: new Date() } },
      { new: true }
    );
    if (!profile) throw new AppError('Profile not found', 404);

    await auditService.log({
      userId,
      action:     'delete',
      resource:   'FarmWeatherProfile',
      resourceId: req.params.id,
      status:     'success',
    });

    sendSuccess(res, null, 'Profile deleted');
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// Current Conditions
// ============================================================================

export async function getCurrentConditions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await FarmWeatherProfile.findById(req.params.profileId);
    if (!profile) throw new AppError('Profile not found', 404);

    const latest = await WeatherSnapshot.findOne({ farmId: profile.farmId }).sort({ timestamp: -1 }).lean();
    sendSuccess(res, latest ?? null, 'Current conditions');
  } catch (error) {
    next(error);
  }
}

export async function getSnapshotHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await FarmWeatherProfile.findById(req.params.profileId);
    if (!profile) throw new AppError('Profile not found', 404);

    const { page, limit, sortBy, sortOrder } = PaginationUtil.getPaginationParams(req.query);
    const skip = PaginationUtil.getSkip(page, limit);
    const sort = PaginationUtil.getSortObject(sortBy || 'timestamp', sortOrder || 'desc');
    const [data, total] = await Promise.all([
      WeatherSnapshot.find({ farmId: profile.farmId }).sort(sort).skip(skip).limit(limit).lean(),
      WeatherSnapshot.countDocuments({ farmId: profile.farmId }),
    ]);
    sendSuccess(res, PaginationUtil.buildPaginationResult(data, total, page, limit), 'Snapshot history');
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// Forecasts
// ============================================================================

export async function getLatestForecast(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await FarmWeatherProfile.findById(req.params.profileId);
    if (!profile) throw new AppError('Profile not found', 404);

    const horizon = (req.query.horizon as ForecastHorizon) ?? ForecastHorizon.DAILY;
    const forecast = await weatherForecastService.getLatestForecast(profile.farmId.toString(), horizon);
    sendSuccess(res, forecast, 'Latest forecast');
  } catch (error) {
    next(error);
  }
}

export async function getForecastSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await FarmWeatherProfile.findById(req.params.profileId);
    if (!profile) throw new AppError('Profile not found', 404);

    const summary = await weatherForecastService.getForecastSummary(profile.farmId.toString());
    sendSuccess(res, summary, 'Forecast summary');
  } catch (error) {
    next(error);
  }
}

export async function getRiskForecast(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await FarmWeatherProfile.findById(req.params.profileId);
    if (!profile) throw new AppError('Profile not found', 404);

    const horizon = (req.query.horizon as ForecastHorizon) ?? ForecastHorizon.DAILY;
    const risk = await weatherForecastService.getRiskForecast(profile.farmId.toString(), horizon);
    sendSuccess(res, risk, 'Risk forecast');
  } catch (error) {
    next(error);
  }
}

export async function getDashboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await FarmWeatherProfile.findById(req.params.profileId);
    if (!profile) throw new AppError('Profile not found', 404);

    const data = await weatherForecastService.getDashboardData(profile.farmId.toString());
    sendSuccess(res, data, 'Weather dashboard');
  } catch (error) {
    next(error);
  }
}

export async function compareForecastVsActual(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await FarmWeatherProfile.findById(req.params.profileId);
    if (!profile) throw new AppError('Profile not found', 404);

    const dateStr = req.query.date as string;
    if (!dateStr) throw new AppError('Query param "date" (YYYY-MM-DD) is required', 400);
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) throw new AppError('Invalid date format. Use YYYY-MM-DD', 400);

    const result = await weatherForecastService.compareForecastVsActual(profile.farmId.toString(), date);
    sendSuccess(res, result, 'Forecast vs actual comparison');
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// Alerts
// ============================================================================

export async function listAlerts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await FarmWeatherProfile.findById(req.params.profileId);
    if (!profile) throw new AppError('Profile not found', 404);

    const result = await weatherAlertService.listAlerts(profile.farmId.toString(), {
      status:    req.query.status    as AlertStatus,
      severity:  req.query.severity  as AlertSeverity,
      alertType: req.query.alertType as AlertType,
      page:      parseInt(req.query.page  as string ?? '1', 10),
      limit:     parseInt(req.query.limit as string ?? '20', 10),
    });
    sendSuccess(res, result, 'Alerts retrieved');
  } catch (error) {
    next(error);
  }
}

export async function getAlert(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const alert = await weatherAlertService.getAlert(req.params.id);
    sendSuccess(res, alert);
  } catch (error) {
    next(error);
  }
}

export async function acknowledgeAlert(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const alert = await weatherAlertService.acknowledgeAlert(req.params.id, userId);
    sendSuccess(res, alert, 'Alert acknowledged');
  } catch (error) {
    next(error);
  }
}

export async function dismissAlert(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const alert = await weatherAlertService.dismissAlert(req.params.id, userId);
    sendSuccess(res, alert, 'Alert dismissed');
  } catch (error) {
    next(error);
  }
}

export async function getOrgAlerts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.params.orgId;
    const result = await weatherAlertService.listOrgAlerts(orgId, {
      status:   req.query.status   as AlertStatus,
      severity: req.query.severity as AlertSeverity,
      page:     parseInt(req.query.page  as string ?? '1', 10),
      limit:    parseInt(req.query.limit as string ?? '50', 10),
    });
    sendSuccess(res, result, 'Organisation alerts');
  } catch (error) {
    next(error);
  }
}

export async function getAlertStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.query.orgId as string | undefined;
    const stats = await weatherAlertService.getAlertStats(orgId);
    sendSuccess(res, stats, 'Alert statistics');
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// Rules Engine
// ============================================================================

export async function listRules(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, sortBy, sortOrder } = PaginationUtil.getPaginationParams(req.query);
    const skip = PaginationUtil.getSkip(page, limit);
    const sort = PaginationUtil.getSortObject(sortBy || 'priority', sortOrder || 'desc');
    const [data, total] = await Promise.all([
      WeatherRule.find({ isActive: true }).sort(sort).skip(skip).limit(limit).lean(),
      WeatherRule.countDocuments({ isActive: true }),
    ]);
    sendSuccess(res, PaginationUtil.buildPaginationResult(data, total, page, limit), 'Rules retrieved');
  } catch (error) {
    next(error);
  }
}

export async function getRuleById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const rule = await WeatherRule.findById(req.params.id);
    if (!rule) throw new AppError('Rule not found', 404);
    sendSuccess(res, rule);
  } catch (error) {
    next(error);
  }
}

export async function createRule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const input: ICreateRuleInput = req.body;

    const rule = await WeatherRule.create({
      ...input,
      organizationId: input.organizationId ? new mongoose.Types.ObjectId(input.organizationId) : null,
      createdBy: new mongoose.Types.ObjectId(userId),
      version:   1,
      isActive:  true,
      priority:  input.priority ?? 50,
    });

    await auditService.log({
      userId,
      action:     'create',
      resource:   'WeatherRule',
      resourceId: (rule._id as mongoose.Types.ObjectId).toString(),
      status:     'success',
    });

    sendSuccess(res, rule, 'Weather rule created', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateRule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const input: IUpdateRuleInput = req.body;

    const rule = await WeatherRule.findByIdAndUpdate(
      req.params.id,
      { $set: { ...input, updatedBy: new mongoose.Types.ObjectId(userId) }, $inc: { version: 1 } },
      { new: true }
    );
    if (!rule) throw new AppError('Rule not found', 404);

    await auditService.log({
      userId,
      action:     'update',
      resource:   'WeatherRule',
      resourceId: req.params.id,
      status:     'success',
    });

    sendSuccess(res, rule, 'Rule updated');
  } catch (error) {
    next(error);
  }
}

export async function deleteRule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const rule = await WeatherRule.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false, deletedAt: new Date(), updatedBy: new mongoose.Types.ObjectId(userId) } },
      { new: true }
    );
    if (!rule) throw new AppError('Rule not found', 404);

    await auditService.log({
      userId,
      action:     'delete',
      resource:   'WeatherRule',
      resourceId: req.params.id,
      status:     'success',
    });

    sendSuccess(res, null, 'Rule deleted');
  } catch (error) {
    next(error);
  }
}

export async function seedDefaultRules(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    await weatherRulesService.seedDefaultRules(userId);
    sendSuccess(res, null, 'Default rules seeded successfully');
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// Ingest / Admin
// ============================================================================

export async function manualRefresh(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { profileId } = req.params;
    const result = await weatherIngestService.manualRefresh(profileId);
    sendSuccess(res, result, 'Manual refresh triggered');
  } catch (error) {
    next(error);
  }
}

export async function refreshAllProfiles(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const results = await weatherIngestService.refreshAllProfiles();
    sendSuccess(res, { count: results.length, results }, 'Refresh cycle completed');
  } catch (error) {
    next(error);
  }
}

export async function retryFailedDeliveries(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = await weatherAlertService.retryFailedDeliveries();
    sendSuccess(res, { retried: count }, 'Retry cycle completed');
  } catch (error) {
    next(error);
  }
}

export async function expireOldAlerts(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = await weatherAlertService.expireOldAlerts();
    sendSuccess(res, { expired: count }, 'Expiry job completed');
  } catch (error) {
    next(error);
  }
}

export async function pruneSnapshots(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const daysOld = parseInt(req.query.daysOld as string ?? '90', 10);
    const count = await weatherIngestService.pruneOldSnapshots(daysOld);
    sendSuccess(res, { pruned: count }, 'Snapshot pruning completed');
  } catch (error) {
    next(error);
  }
}

export async function getProviderStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const providers = weatherProviderService.getProviderNames();
    sendSuccess(res, { providers }, 'Provider status');
  } catch (error) {
    next(error);
  }
}
