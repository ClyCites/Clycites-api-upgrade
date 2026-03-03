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
import { sendSuccess, ResponseHandler } from '../../common/utils/response';
import auditService from '../audit/audit.service';
import { AppError } from '../../common/errors/AppError';

import FarmWeatherProfile from './farmWeatherProfile.model';
import WeatherSnapshot from './weatherSnapshot.model';
import WeatherRule from './weatherRule.model';
import Forecast from './forecast.model';

import weatherIngestService from './weatherIngest.service';
import weatherAlertService from './weatherAlert.service';
import weatherForecastService from './weatherForecast.service';
import weatherRulesService from './weatherRules.service';
import weatherProviderService from './weatherProvider.service';

import {
  AlertSeverity,
  AlertStatus,
  AlertUiStatus,
  AlertType,
  ForecastHorizon,
  ICreateProfileInput,
  IUpdateProfileInput,
  ICreateRuleInput,
  IUpdateRuleInput,
  WeatherUnit,
  DeliveryChannel,
  SensorReadingStatus,
  IFarmWeatherProfileDocument,
  IWeatherAlertDocument,
  IWeatherReading,
  RuleLifecycleStatus,
} from './weather.types';
import { PaginationUtil } from '../../common/utils/pagination';

const privilegedRoles = new Set(['super_admin', 'platform_admin', 'admin', 'org:manager', 'trader']);

const ruleStatusTransitions: Record<RuleLifecycleStatus, RuleLifecycleStatus[]> = {
  [RuleLifecycleStatus.DRAFT]: [RuleLifecycleStatus.DRAFT, RuleLifecycleStatus.ACTIVE, RuleLifecycleStatus.DISABLED],
  [RuleLifecycleStatus.ACTIVE]: [RuleLifecycleStatus.ACTIVE, RuleLifecycleStatus.DISABLED],
  [RuleLifecycleStatus.DISABLED]: [RuleLifecycleStatus.DISABLED, RuleLifecycleStatus.ACTIVE],
};

const hasPrivilegedRole = (role?: string): boolean => !!role && privilegedRoles.has(role);

const canAccessAcrossOrganizations = (role?: string): boolean =>
  role === 'super_admin' || role === 'platform_admin';

const toPlainObject = <T>(value: T): T => {
  if (value && typeof (value as { toObject?: () => unknown }).toObject === 'function') {
    return (value as unknown as { toObject: () => T }).toObject();
  }
  return value;
};

const toNullableString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const buildPagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

const assertCanAccessProfile = (req: AuthRequest, profile: IFarmWeatherProfileDocument): void => {
  if (hasPrivilegedRole(req.user?.role)) {
    return;
  }

  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  const profileOwnerId = profile.farmerId?.toString();
  const profileOrgId = profile.organizationId?.toString();
  const userOrgId = req.user?.orgId;

  if (profileOwnerId === userId) {
    return;
  }

  if (profileOrgId && userOrgId && profileOrgId === userOrgId) {
    return;
  }

  throw new AppError('Access denied to weather profile', 403, 'FORBIDDEN');
};

const assertOrgScopeAccess = (req: AuthRequest, organizationId: string): void => {
  if (canAccessAcrossOrganizations(req.user?.role)) return;

  const actorOrgId = req.user?.orgId;
  if (!actorOrgId || actorOrgId !== organizationId) {
    throw new AppError('Access denied outside your organization scope', 403, 'FORBIDDEN');
  }
};

const alertUiStatus = (alert: Pick<IWeatherAlertDocument, 'status' | 'triggeredBy' | 'resolvedAt'>): AlertUiStatus => {
  if (alert.status === AlertStatus.ACKNOWLEDGED) return AlertUiStatus.ACKNOWLEDGED;
  if (alert.status === AlertStatus.DISMISSED || alert.status === AlertStatus.EXPIRED || !!alert.resolvedAt) {
    return AlertUiStatus.RESOLVED;
  }
  if (alert.triggeredBy === 'manual') return AlertUiStatus.ESCALATED;
  return AlertUiStatus.NEW;
};

const withAlertStatus = <T extends Record<string, any>>(alert: T): T & {
  uiStatus: AlertUiStatus;
  resolvedBy?: string;
  resolvedAt?: Date | string;
  reason?: string;
} => {
  const plain = toPlainObject(alert);
  const uiStatus = alertUiStatus(plain as unknown as IWeatherAlertDocument);
  return {
    ...plain,
    uiStatus,
    resolvedBy: plain.resolvedBy?.toString?.() ?? plain.resolvedBy,
    resolvedAt: plain.resolvedAt,
    reason: plain.resolutionReason,
  };
};

const resolveRuleStatus = (rule: Record<string, any>): RuleLifecycleStatus => {
  const explicit = rule.workflowState as RuleLifecycleStatus | undefined;
  if (explicit && Object.values(RuleLifecycleStatus).includes(explicit)) {
    return explicit;
  }

  if (rule.isActive) return RuleLifecycleStatus.ACTIVE;
  return RuleLifecycleStatus.DISABLED;
};

const withRuleStatus = <T extends Record<string, any>>(rule: T): T & {
  status: RuleLifecycleStatus;
  uiStatus: RuleLifecycleStatus;
} => {
  const plain = toPlainObject(rule);
  const status = resolveRuleStatus(plain);
  return {
    ...plain,
    status,
    uiStatus: status,
  };
};

const assertCanAccessAlert = (req: AuthRequest, alert: IWeatherAlertDocument): void => {
  if (canAccessAcrossOrganizations(req.user?.role)) return;

  const actorId = req.user?.id;
  if (!actorId) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  const alertOwnerId = alert.farmerId?.toString();
  const alertOrgId = alert.organizationId?.toString();
  const actorOrgId = req.user?.orgId;

  if (hasPrivilegedRole(req.user?.role)) {
    if (alertOrgId && actorOrgId && alertOrgId !== actorOrgId) {
      throw new AppError('Access denied to weather alert outside your organization scope', 403, 'FORBIDDEN');
    }
    return;
  }

  if (alertOwnerId !== actorId) {
    throw new AppError('Access denied to weather alert', 403, 'FORBIDDEN');
  }

  if (alertOrgId && actorOrgId && alertOrgId !== actorOrgId) {
    throw new AppError('Access denied to weather alert outside your organization scope', 403, 'FORBIDDEN');
  }
};

const resolveRequestedRuleStatus = (
  payload: Record<string, unknown>,
  fallback: RuleLifecycleStatus
): RuleLifecycleStatus => {
  const explicitStatus = toNullableString(payload.status) ?? toNullableString(payload.uiStatus);
  if (explicitStatus && Object.values(RuleLifecycleStatus).includes(explicitStatus as RuleLifecycleStatus)) {
    return explicitStatus as RuleLifecycleStatus;
  }

  const active = payload.active ?? payload.isActive;
  if (typeof active === 'boolean') {
    return active ? RuleLifecycleStatus.ACTIVE : RuleLifecycleStatus.DISABLED;
  }

  return fallback;
};

const assertRuleStatusTransition = (
  currentStatus: RuleLifecycleStatus,
  nextStatus: RuleLifecycleStatus
): void => {
  if (!ruleStatusTransitions[currentStatus].includes(nextStatus)) {
    throw new AppError(
      `Invalid weather rule status transition: ${currentStatus} -> ${nextStatus}`,
      400,
      'BAD_REQUEST'
    );
  }
};

const validateSensorStatusTransition = (
  current: SensorReadingStatus,
  next: SensorReadingStatus
): void => {
  const transitions: Record<SensorReadingStatus, SensorReadingStatus[]> = {
    [SensorReadingStatus.CAPTURED]: [SensorReadingStatus.CAPTURED, SensorReadingStatus.FLAGGED, SensorReadingStatus.VERIFIED],
    [SensorReadingStatus.FLAGGED]: [SensorReadingStatus.FLAGGED, SensorReadingStatus.CAPTURED, SensorReadingStatus.VERIFIED],
    [SensorReadingStatus.VERIFIED]: [SensorReadingStatus.VERIFIED],
  };

  if (!transitions[current].includes(next)) {
    throw new AppError(
      `Invalid sensor status transition: ${current} -> ${next}`,
      400,
      'BAD_REQUEST'
    );
  }
};

// ============================================================================
// Profiles
// ============================================================================

export async function createProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const input: ICreateProfileInput = req.body;
    const actorOrgId = req.user?.orgId;

    const requestedOrgId = toNullableString(input.organizationId);
    if (requestedOrgId && !canAccessAcrossOrganizations(req.user?.role)) {
      if (!actorOrgId || requestedOrgId !== actorOrgId) {
        throw new AppError('Cannot create weather profile outside your organization context', 403, 'FORBIDDEN');
      }
    }
    const scopedOrganizationId = requestedOrgId ?? actorOrgId;

    const profile = await FarmWeatherProfile.create({
      farmId:         new mongoose.Types.ObjectId(input.farmId),
      farmerId:       new mongoose.Types.ObjectId(userId),
      organizationId: scopedOrganizationId ? new mongoose.Types.ObjectId(scopedOrganizationId) : null,
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

export async function listProfiles(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.id) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { page, limit, sortBy, sortOrder } = PaginationUtil.getPaginationParams(req.query);
    const skip = PaginationUtil.getSkip(page, limit);
    const allowedSortFields = new Set(['createdAt', 'updatedAt', 'farmName', 'timezone']);
    const resolvedSortBy = allowedSortFields.has(sortBy) ? sortBy : 'createdAt';
    const sort = PaginationUtil.getSortObject(resolvedSortBy, sortOrder);

    const actorRole = req.user.role;
    const actorId = req.user.id;
    const actorOrgId = req.user.orgId;
    const requestedOrgId = toNullableString(req.query.organizationId);

    const filter: Record<string, unknown> = { isActive: true };

    if (requestedOrgId) {
      if (!canAccessAcrossOrganizations(actorRole) && (!actorOrgId || requestedOrgId !== actorOrgId)) {
        throw new AppError('Cannot list weather profiles outside your organization context', 403, 'FORBIDDEN');
      }
      filter.organizationId = new mongoose.Types.ObjectId(requestedOrgId);
    } else if (!canAccessAcrossOrganizations(actorRole) && actorOrgId) {
      filter.organizationId = new mongoose.Types.ObjectId(actorOrgId);
    }

    if (hasPrivilegedRole(actorRole)) {
      const requestedFarmerId = toNullableString(req.query.farmerId);
      if (requestedFarmerId) {
        filter.farmerId = new mongoose.Types.ObjectId(requestedFarmerId);
      }
    } else {
      filter.farmerId = new mongoose.Types.ObjectId(actorId);
    }

    const requestedFarmId = toNullableString(req.query.farmId);
    if (requestedFarmId) {
      filter.farmId = new mongoose.Types.ObjectId(requestedFarmId);
    }

    const search = toNullableString(req.query.search);
    if (search) {
      filter.farmName = { $regex: search, $options: 'i' };
    }

    const [profiles, total] = await Promise.all([
      FarmWeatherProfile.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      FarmWeatherProfile.countDocuments(filter),
    ]);

    ResponseHandler.success(res, profiles, 'Profiles retrieved', 200, {
      pagination: buildPagination(page, limit, total),
    });
  } catch (error) {
    next(error);
  }
}

export async function getProfileById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await FarmWeatherProfile.findById(req.params.id);
    if (!profile) throw new AppError('Profile not found', 404);
    assertCanAccessProfile(req, profile);
    sendSuccess(res, profile);
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const input: IUpdateProfileInput = req.body;

    const profile = await FarmWeatherProfile.findById(req.params.id);
    if (!profile) throw new AppError('Profile not found', 404);
    assertCanAccessProfile(req, profile);

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

    profile.set(update);
    await profile.save();

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
    const profile = await FarmWeatherProfile.findById(req.params.id);
    if (!profile) throw new AppError('Profile not found', 404);
    assertCanAccessProfile(req, profile);
    profile.isActive = false;
    profile.deletedAt = new Date();
    await profile.save();

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
    assertCanAccessProfile(req, profile);

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
    assertCanAccessProfile(req, profile);

    const { page, limit, sortBy, sortOrder } = PaginationUtil.getPaginationParams(req.query);
    const skip = PaginationUtil.getSkip(page, limit);
    const sort = PaginationUtil.getSortObject(sortBy || 'timestamp', sortOrder || 'desc');
    const [data, total] = await Promise.all([
      WeatherSnapshot.find({ farmId: profile.farmId }).sort(sort).skip(skip).limit(limit).lean(),
      WeatherSnapshot.countDocuments({ farmId: profile.farmId }),
    ]);
    ResponseHandler.paginated(
      res,
      data,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      'Snapshot history'
    );
  } catch (error) {
    next(error);
  }
}

export async function createCondition(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await FarmWeatherProfile.findById(req.params.profileId);
    if (!profile) throw new AppError('Profile not found', 404);
    assertCanAccessProfile(req, profile);

    const payload = req.body as {
      timestamp?: string;
      reading: Record<string, unknown>;
      status?: SensorReadingStatus;
      statusReason?: string;
      qualityFlags?: string[];
    };

    const snapshot = await WeatherSnapshot.create({
      farmId: profile.farmId,
      profileId: profile._id,
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      reading: payload.reading,
      status: payload.status ?? SensorReadingStatus.CAPTURED,
      statusReason: payload.statusReason,
      qualityFlags: payload.qualityFlags ?? [],
      dataSource: 'manual',
      confidenceScore: 1,
    });

    sendSuccess(res, snapshot, 'Condition captured successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function getConditionById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const snapshot = await WeatherSnapshot.findById(req.params.readingId);
    if (!snapshot) throw new AppError('Sensor reading not found', 404);

    const profile = await FarmWeatherProfile.findById(snapshot.profileId);
    if (!profile) throw new AppError('Profile not found', 404);
    assertCanAccessProfile(req, profile);

    sendSuccess(res, snapshot, 'Sensor reading retrieved');
  } catch (error) {
    next(error);
  }
}

export async function updateConditionById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const snapshot = await WeatherSnapshot.findById(req.params.readingId);
    if (!snapshot) throw new AppError('Sensor reading not found', 404);

    const profile = await FarmWeatherProfile.findById(snapshot.profileId);
    if (!profile) throw new AppError('Profile not found', 404);
    assertCanAccessProfile(req, profile);

    const requestedStatus = req.body.status as SensorReadingStatus | undefined;
    if (requestedStatus) {
      validateSensorStatusTransition(snapshot.status, requestedStatus);
      snapshot.status = requestedStatus;
    }

    if (req.body.statusReason !== undefined) {
      snapshot.statusReason = req.body.statusReason;
    }

    if (Array.isArray(req.body.qualityFlags)) {
      snapshot.qualityFlags = req.body.qualityFlags;
    }

    if (snapshot.status === SensorReadingStatus.FLAGGED) {
      snapshot.flaggedAt = new Date();
      snapshot.flaggedBy = new mongoose.Types.ObjectId(req.user!.id);
      snapshot.verifiedAt = undefined;
      snapshot.verifiedBy = undefined;
    } else if (snapshot.status === SensorReadingStatus.VERIFIED) {
      snapshot.verifiedAt = new Date();
      snapshot.verifiedBy = new mongoose.Types.ObjectId(req.user!.id);
      if (!snapshot.flaggedAt) snapshot.flaggedAt = undefined;
      if (!snapshot.flaggedBy) snapshot.flaggedBy = undefined;
    } else if (snapshot.status === SensorReadingStatus.CAPTURED) {
      snapshot.flaggedAt = undefined;
      snapshot.flaggedBy = undefined;
      snapshot.verifiedAt = undefined;
      snapshot.verifiedBy = undefined;
    }

    await snapshot.save();
    sendSuccess(res, snapshot, 'Sensor reading updated');
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
    assertCanAccessProfile(req, profile);

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
    assertCanAccessProfile(req, profile);

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
    assertCanAccessProfile(req, profile);

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
    assertCanAccessProfile(req, profile);

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
    assertCanAccessProfile(req, profile);

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

export async function refreshForecast(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await FarmWeatherProfile.findById(req.params.profileId);
    if (!profile) throw new AppError('Profile not found', 404);
    assertCanAccessProfile(req, profile);

    const result = await weatherIngestService.manualRefresh(req.params.profileId);
    sendSuccess(res, result, 'Profile forecast refresh triggered');
  } catch (error) {
    next(error);
  }
}

export async function getForecastHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await FarmWeatherProfile.findById(req.params.profileId);
    if (!profile) throw new AppError('Profile not found', 404);
    assertCanAccessProfile(req, profile);

    const { page, limit, sortBy, sortOrder } = PaginationUtil.getPaginationParams(req.query);
    const skip = PaginationUtil.getSkip(page, limit);
    const allowedSortFields = new Set(['createdAt', 'fetchedAt', 'expiresAt', 'forecastPeriodStart']);
    const resolvedSortBy = allowedSortFields.has(sortBy) ? sortBy : 'fetchedAt';
    const sort = PaginationUtil.getSortObject(resolvedSortBy, sortOrder);

    const filter: Record<string, unknown> = { farmId: profile.farmId };
    const horizon = toNullableString(req.query.horizon);
    if (horizon && Object.values(ForecastHorizon).includes(horizon as ForecastHorizon)) {
      filter.horizon = horizon;
    }
    if (req.query.includeSuperseded === 'false') {
      filter.isSuperseded = false;
    }

    const [history, total] = await Promise.all([
      Forecast.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Forecast.countDocuments(filter),
    ]);

    ResponseHandler.success(res, history, 'Forecast history', 200, {
      pagination: buildPagination(page, limit, total),
    });
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
    assertCanAccessProfile(req, profile);

    const uiStatusQuery = toNullableString(req.query.uiStatus);
    const uiStatuses = Object.values(AlertUiStatus);
    const requestedUiStatus = uiStatusQuery && uiStatuses.includes(uiStatusQuery as AlertUiStatus)
      ? (uiStatusQuery as AlertUiStatus)
      : undefined;
    const requestedStatus = toNullableString(req.query.status) as AlertStatus | undefined;

    const result = await weatherAlertService.listAlerts(profile.farmId.toString(), {
      status:    requestedStatus,
      uiStatus:  requestedUiStatus,
      severity:  req.query.severity  as AlertSeverity,
      alertType: req.query.alertType as AlertType,
      page:      parseInt(req.query.page  as string ?? '1', 10),
      limit:     parseInt(req.query.limit as string ?? '20', 10),
    });
    const alerts = result.data.map((alert) => withAlertStatus(alert));
    ResponseHandler.success(res, alerts, 'Alerts retrieved', 200, {
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAlert(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const alert = await weatherAlertService.getAlert(req.params.id);
    assertCanAccessAlert(req, alert);
    sendSuccess(res, withAlertStatus(alert), 'Alert retrieved');
  } catch (error) {
    next(error);
  }
}

export async function acknowledgeAlert(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const existing = await weatherAlertService.getAlert(req.params.id);
    assertCanAccessAlert(req, existing);
    const alert = await weatherAlertService.acknowledgeAlert(req.params.id, userId);
    sendSuccess(res, withAlertStatus(alert), 'Alert acknowledged');
  } catch (error) {
    next(error);
  }
}

export async function dismissAlert(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const existing = await weatherAlertService.getAlert(req.params.id);
    assertCanAccessAlert(req, existing);
    const reason = toNullableString(req.body.reason);
    const alert = await weatherAlertService.dismissAlert(req.params.id, userId, reason);
    sendSuccess(res, withAlertStatus(alert), 'Alert dismissed');
  } catch (error) {
    next(error);
  }
}

export async function escalateAlert(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const existing = await weatherAlertService.getAlert(req.params.id);
    assertCanAccessAlert(req, existing);
    const alert = await weatherAlertService.escalateAlert(
      req.params.id,
      userId,
      req.body.reason,
      req.body.severity as AlertSeverity | undefined
    );
    const mappedAlert = withAlertStatus(alert);
    sendSuccess(res, { ...mappedAlert, reason: req.body.reason ?? mappedAlert.reason }, 'Alert escalated');
  } catch (error) {
    next(error);
  }
}

export async function getOrgAlerts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.params.orgId;
    assertOrgScopeAccess(req, orgId);

    const uiStatusQuery = toNullableString(req.query.uiStatus);
    const uiStatuses = Object.values(AlertUiStatus);
    const requestedUiStatus = uiStatusQuery && uiStatuses.includes(uiStatusQuery as AlertUiStatus)
      ? (uiStatusQuery as AlertUiStatus)
      : undefined;
    const requestedStatus = toNullableString(req.query.status) as AlertStatus | undefined;

    const result = await weatherAlertService.listOrgAlerts(orgId, {
      status:   requestedStatus,
      uiStatus: requestedUiStatus,
      severity: req.query.severity as AlertSeverity,
      page:     parseInt(req.query.page  as string ?? '1', 10),
      limit:    parseInt(req.query.limit as string ?? '50', 10),
    });
    const alerts = result.data.map((alert) => withAlertStatus(alert));
    ResponseHandler.success(res, alerts, 'Organisation alerts', 200, {
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAlertStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.query.orgId as string | undefined;
    if (orgId) {
      assertOrgScopeAccess(req, orgId);
    }
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
    const allowedSortFields = new Set(['priority', 'createdAt', 'updatedAt', 'name', 'severity']);
    const resolvedSortBy = allowedSortFields.has(sortBy) ? sortBy : 'priority';
    const sort = PaginationUtil.getSortObject(resolvedSortBy, sortOrder || 'desc');

    const actorRole = req.user?.role;
    const actorOrgId = req.user?.orgId;
    const requestedOrgId = toNullableString(req.query.organizationId);
    if (requestedOrgId && !canAccessAcrossOrganizations(actorRole) && (!actorOrgId || requestedOrgId !== actorOrgId)) {
      throw new AppError('Cannot list weather rules outside your organization context', 403, 'FORBIDDEN');
    }

    const statusFilter = toNullableString(req.query.status) ?? RuleLifecycleStatus.ACTIVE;
    const filter: Record<string, unknown> = {};

    if (statusFilter !== 'all') {
      if (!Object.values(RuleLifecycleStatus).includes(statusFilter as RuleLifecycleStatus)) {
        throw new AppError('Invalid weather rule status filter', 400, 'BAD_REQUEST');
      }

      if (statusFilter === RuleLifecycleStatus.ACTIVE) {
        filter.$or = [
          { workflowState: RuleLifecycleStatus.ACTIVE },
          { workflowState: { $exists: false }, isActive: true },
        ];
      } else if (statusFilter === RuleLifecycleStatus.DISABLED) {
        filter.$or = [
          { workflowState: RuleLifecycleStatus.DISABLED },
          { workflowState: { $exists: false }, isActive: false },
        ];
      } else {
        filter.workflowState = RuleLifecycleStatus.DRAFT;
      }
    }

    if (requestedOrgId) {
      filter.organizationId = new mongoose.Types.ObjectId(requestedOrgId);
    } else if (!canAccessAcrossOrganizations(actorRole) && actorOrgId) {
      filter.$and = [
        ...(Array.isArray(filter.$and) ? filter.$and : []),
        {
          $or: [
            { organizationId: null },
            { organizationId: new mongoose.Types.ObjectId(actorOrgId) },
          ],
        },
      ];
    }

    const severityFilter = toNullableString(req.query.severity);
    if (severityFilter) {
      filter.severity = severityFilter;
    }

    const [data, total] = await Promise.all([
      WeatherRule.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      WeatherRule.countDocuments(filter),
    ]);

    ResponseHandler.success(
      res,
      data.map((rule) => withRuleStatus(rule)),
      'Rules retrieved',
      200,
      {
        pagination: buildPagination(page, limit, total),
      }
    );
  } catch (error) {
    next(error);
  }
}

export async function getRuleById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const rule = await WeatherRule.findById(req.params.id);
    if (!rule) throw new AppError('Rule not found', 404);
    const actorOrgId = req.user?.orgId;
    const role = req.user?.role;
    const ruleOrgId = rule.organizationId?.toString();

    if (!canAccessAcrossOrganizations(role)) {
      if (ruleOrgId && actorOrgId && ruleOrgId !== actorOrgId) {
        throw new AppError('Access denied to weather rule', 403, 'FORBIDDEN');
      }
      if (ruleOrgId && !actorOrgId) {
        throw new AppError('Access denied to organization weather rule', 403, 'FORBIDDEN');
      }
    }

    sendSuccess(res, withRuleStatus(rule), 'Rule retrieved');
  } catch (error) {
    next(error);
  }
}

export async function createRule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const input: ICreateRuleInput = req.body;
    const payload = req.body as Record<string, unknown>;
    const workflowState = resolveRequestedRuleStatus(payload, RuleLifecycleStatus.ACTIVE);
    const requestedOrgId = toNullableString(payload.organizationId) ?? req.user?.orgId;

    if (requestedOrgId && !canAccessAcrossOrganizations(req.user?.role) && (!req.user?.orgId || requestedOrgId !== req.user.orgId)) {
      throw new AppError('Cannot create weather rule outside your organization context', 403, 'FORBIDDEN');
    }

    const rule = await WeatherRule.create({
      ...input,
      organizationId: requestedOrgId ? new mongoose.Types.ObjectId(requestedOrgId) : null,
      createdBy: new mongoose.Types.ObjectId(userId),
      version:   1,
      workflowState,
      isActive: workflowState === RuleLifecycleStatus.ACTIVE,
      priority:  input.priority ?? 50,
    });

    await auditService.log({
      userId,
      action:     'create',
      resource:   'WeatherRule',
      resourceId: (rule._id as mongoose.Types.ObjectId).toString(),
      status:     'success',
    });

    sendSuccess(res, withRuleStatus(rule), 'Weather rule created', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateRule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const input: IUpdateRuleInput = req.body;
    const payload = req.body as Record<string, unknown>;
    const rule = await WeatherRule.findById(req.params.id);
    if (!rule) throw new AppError('Rule not found', 404);

    const actorOrgId = req.user?.orgId;
    const role = req.user?.role;
    const ruleOrgId = rule.organizationId?.toString();

    if (!canAccessAcrossOrganizations(role)) {
      if (ruleOrgId && actorOrgId && ruleOrgId !== actorOrgId) {
        throw new AppError('Access denied to weather rule', 403, 'FORBIDDEN');
      }
      if (ruleOrgId && !actorOrgId) {
        throw new AppError('Access denied to organization weather rule', 403, 'FORBIDDEN');
      }
    }

    const currentStatus = resolveRuleStatus(rule as unknown as Record<string, unknown>);
    const requestedStatus = resolveRequestedRuleStatus(payload, currentStatus);
    assertRuleStatusTransition(currentStatus, requestedStatus);

    const update: Record<string, unknown> = {
      ...input,
      updatedBy: new mongoose.Types.ObjectId(userId),
    };

    delete update.status;
    delete update.uiStatus;
    delete update.active;

    rule.set(update);
    rule.workflowState = requestedStatus;
    rule.isActive = requestedStatus === RuleLifecycleStatus.ACTIVE;
    if (requestedStatus !== RuleLifecycleStatus.DISABLED) {
      rule.deletedAt = undefined;
    }
    rule.version += 1;
    await rule.save();

    await auditService.log({
      userId,
      action:     'update',
      resource:   'WeatherRule',
      resourceId: req.params.id,
      status:     'success',
    });

    sendSuccess(res, withRuleStatus(rule), 'Rule updated');
  } catch (error) {
    next(error);
  }
}

export async function deleteRule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const rule = await WeatherRule.findById(req.params.id);
    if (!rule) throw new AppError('Rule not found', 404);

    const actorOrgId = req.user?.orgId;
    const role = req.user?.role;
    const ruleOrgId = rule.organizationId?.toString();
    if (!canAccessAcrossOrganizations(role)) {
      if (ruleOrgId && actorOrgId && ruleOrgId !== actorOrgId) {
        throw new AppError('Access denied to weather rule', 403, 'FORBIDDEN');
      }
      if (ruleOrgId && !actorOrgId) {
        throw new AppError('Access denied to organization weather rule', 403, 'FORBIDDEN');
      }
    }

    rule.isActive = false;
    rule.workflowState = RuleLifecycleStatus.DISABLED;
    rule.deletedAt = new Date();
    rule.updatedBy = new mongoose.Types.ObjectId(userId);
    rule.version += 1;
    await rule.save();

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

export async function testRule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const rule = await WeatherRule.findById(req.params.id);
    if (!rule) throw new AppError('Rule not found', 404);

    const actorOrgId = req.user?.orgId;
    if (!canAccessAcrossOrganizations(req.user?.role)) {
      const ruleOrgId = rule.organizationId?.toString();
      if (ruleOrgId && actorOrgId && ruleOrgId !== actorOrgId) {
        throw new AppError('Access denied to weather rule', 403, 'FORBIDDEN');
      }
      if (ruleOrgId && !actorOrgId) {
        throw new AppError('Access denied to organization weather rule', 403, 'FORBIDDEN');
      }
    }

    let reading: IWeatherReading | undefined;
    let readingSource: 'payload' | 'latest_snapshot' = 'payload';
    let profileId: string | undefined;

    if (req.body.reading && typeof req.body.reading === 'object') {
      reading = req.body.reading as IWeatherReading;
    } else {
      const requestedProfileId = toNullableString(req.body.profileId) ?? toNullableString(req.query.profileId);
      if (!requestedProfileId) {
        throw new AppError('Provide reading payload or profileId when testing weather rules', 400, 'BAD_REQUEST');
      }

      const profile = await FarmWeatherProfile.findById(requestedProfileId);
      if (!profile) throw new AppError('Profile not found', 404);
      assertCanAccessProfile(req, profile);
      profileId = profile._id.toString();

      const latestSnapshot = await WeatherSnapshot.findOne({ farmId: profile.farmId }).sort({ timestamp: -1 }).lean();
      if (!latestSnapshot) {
        throw new AppError('No weather snapshot available for selected profile', 400, 'BAD_REQUEST');
      }

      reading = latestSnapshot.reading as IWeatherReading;
      readingSource = 'latest_snapshot';
    }

    const matched = weatherRulesService.evaluateRule(rule, reading);

    sendSuccess(
      res,
      {
        rule: withRuleStatus(rule),
        matched,
        readingSource,
        profileId,
        reading,
        evaluatedAt: new Date().toISOString(),
      },
      matched ? 'Weather rule matched reading' : 'Weather rule test completed'
    );
  } catch (error) {
    next(error);
  }
}

export async function simulateAlert(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const alert = await weatherAlertService.simulateAlert(req.body, userId);
    sendSuccess(res, alert, 'Weather alert simulated', 201);
  } catch (error) {
    next(error);
  }
}
