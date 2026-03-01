import { NextFunction, Request, Response } from 'express';
import { ForbiddenError } from '../errors/AppError';
import PlatformControlService from '../../modules/admin/platformControl.service';
import { canBypassAuthorization } from './superAdmin';

interface FeatureFlagCacheEntry {
  enabled: boolean;
  fetchedAt: number;
}

interface FeatureFlagGuardOptions {
  overrideScope?: string;
  message?: string;
}

const CACHE_TTL_MS = 15000;
const flagCache = new Map<string, FeatureFlagCacheEntry>();

const getFeatureFlagState = async (flag: string): Promise<boolean> => {
  const now = Date.now();
  const cached = flagCache.get(flag);

  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.enabled;
  }

  const flags = await PlatformControlService.getFeatureFlags();
  const enabled = Boolean(flags[flag]);
  flagCache.set(flag, { enabled, fetchedAt: now });

  return enabled;
};

export const blockWhenFeatureFlagEnabled = (
  flag: string,
  options: FeatureFlagGuardOptions = {}
) => {
  const overrideScope = options.overrideScope || 'super_admin:feature_flags:override';

  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const enabled = await getFeatureFlagState(flag);
      if (!enabled) {
        return next();
      }

      if (canBypassAuthorization(req, [overrideScope])) {
        return next();
      }

      return next(
        new ForbiddenError(
          options.message || `Action is temporarily disabled by feature flag: ${flag}`
        )
      );
    } catch (error) {
      return next(error);
    }
  };
};

export const clearFeatureFlagGuardCache = (): void => {
  flagCache.clear();
};
