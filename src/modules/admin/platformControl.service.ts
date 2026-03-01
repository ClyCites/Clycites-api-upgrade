import { Types } from 'mongoose';
import PlatformSetting from './platformSetting.model';
import AuditService from '../audit/audit.service';
import { BadRequestError } from '../../common/errors/AppError';

const MAINTENANCE_SETTING_KEY = 'system.maintenance';
const FEATURE_FLAGS_SETTING_KEY = 'system.feature_flags';

export interface MaintenanceState {
  enabled: boolean;
  message?: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export type FeatureFlags = Record<string, boolean>;

class PlatformControlService {
  async getMaintenanceState(): Promise<MaintenanceState> {
    const setting = await PlatformSetting.findOne({ key: MAINTENANCE_SETTING_KEY }).lean();
    if (!setting) {
      return { enabled: false };
    }

    return {
      enabled: Boolean(setting.value?.enabled),
      message: typeof setting.value?.message === 'string' ? setting.value.message : undefined,
      updatedAt: setting.updatedAt,
      updatedBy: setting.updatedBy ? setting.updatedBy.toString() : undefined,
    };
  }

  async setMaintenanceState(input: {
    actorId: string;
    reason: string;
    enabled: boolean;
    message?: string;
    requestId?: string;
  }): Promise<MaintenanceState> {
    const reason = input.reason.trim();
    if (reason.length < 3) {
      throw new BadRequestError('reason must be at least 3 characters');
    }

    const updated = await PlatformSetting.findOneAndUpdate(
      { key: MAINTENANCE_SETTING_KEY },
      {
        $set: {
          value: {
            enabled: input.enabled,
            message: input.message,
          },
          updatedBy: new Types.ObjectId(input.actorId),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await AuditService.log({
      action: 'super_admin.maintenance_updated',
      resource: 'platform_setting',
      resourceId: MAINTENANCE_SETTING_KEY,
      userId: input.actorId,
      risk: 'critical',
      details: {
        metadata: {
          actorId: input.actorId,
          targetId: MAINTENANCE_SETTING_KEY,
          action: 'super_admin.maintenance_updated',
          reason,
          timestamp: new Date().toISOString(),
          requestId: input.requestId,
          enabled: input.enabled,
          message: input.message,
        },
      },
    });

    return {
      enabled: Boolean(updated?.value?.enabled),
      message: typeof updated?.value?.message === 'string' ? updated.value.message : undefined,
      updatedAt: updated?.updatedAt,
      updatedBy: updated?.updatedBy ? updated.updatedBy.toString() : undefined,
    };
  }

  async getFeatureFlags(): Promise<FeatureFlags> {
    const setting = await PlatformSetting.findOne({ key: FEATURE_FLAGS_SETTING_KEY }).lean();
    if (!setting || typeof setting.value !== 'object' || !setting.value) {
      return {};
    }

    const flags: FeatureFlags = {};
    for (const [key, value] of Object.entries(setting.value)) {
      if (typeof value === 'boolean') {
        flags[key] = value;
      }
    }

    return flags;
  }

  async setFeatureFlags(input: {
    actorId: string;
    reason: string;
    flags: FeatureFlags;
    requestId?: string;
  }): Promise<FeatureFlags> {
    const reason = input.reason.trim();
    if (reason.length < 3) {
      throw new BadRequestError('reason must be at least 3 characters');
    }

    const sanitizedFlags: FeatureFlags = {};
    for (const [flag, enabled] of Object.entries(input.flags || {})) {
      if (typeof enabled === 'boolean' && flag.trim().length > 0) {
        sanitizedFlags[flag.trim()] = enabled;
      }
    }

    const updated = await PlatformSetting.findOneAndUpdate(
      { key: FEATURE_FLAGS_SETTING_KEY },
      {
        $set: {
          value: sanitizedFlags,
          updatedBy: new Types.ObjectId(input.actorId),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await AuditService.log({
      action: 'super_admin.feature_flags_updated',
      resource: 'platform_setting',
      resourceId: FEATURE_FLAGS_SETTING_KEY,
      userId: input.actorId,
      risk: 'high',
      details: {
        metadata: {
          actorId: input.actorId,
          targetId: FEATURE_FLAGS_SETTING_KEY,
          action: 'super_admin.feature_flags_updated',
          reason,
          timestamp: new Date().toISOString(),
          requestId: input.requestId,
          flagCount: Object.keys(sanitizedFlags).length,
        },
      },
    });

    const value = updated?.value && typeof updated.value === 'object' ? updated.value : {};
    return value as FeatureFlags;
  }
}

export default new PlatformControlService();

