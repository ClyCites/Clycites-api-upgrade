import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ResponseHandler } from '../utils/response';
import config from '../config';
import PlatformControlService from '../../modules/admin/platformControl.service';
import { isSuperAdminRole } from './superAdmin';
import { JwtPayload } from './auth';

const EXEMPT_PATH_PREFIXES = [
  '/api/docs',
  '/api/docs.json',
  '/api/v1/health',
  '/api/v1/ready',
  '/api/v1/version',
];

const CACHE_TTL_MS = 15000;

let cachedState: {
  enabled: boolean;
  message?: string;
  fetchedAt: number;
} = {
  enabled: false,
  fetchedAt: 0,
};

const isExemptPath = (path: string): boolean => {
  return EXEMPT_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
};

const getMaintenanceState = async (): Promise<{ enabled: boolean; message?: string }> => {
  const now = Date.now();
  if (now - cachedState.fetchedAt < CACHE_TTL_MS) {
    return cachedState;
  }

  const state = await PlatformControlService.getMaintenanceState();
  cachedState = {
    enabled: Boolean(state.enabled),
    message: state.message,
    fetchedAt: now,
  };

  return cachedState;
};

const isSuperAdminToken = (req: Request): boolean => {
  if (req.user && isSuperAdminRole(req.user.role)) {
    return true;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    return isSuperAdminRole(decoded.role);
  } catch {
    return false;
  }
};

export const maintenanceModeGuard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (isExemptPath(req.path)) {
      return next();
    }

    const state = await getMaintenanceState();
    if (!state.enabled) {
      return next();
    }

    if (isSuperAdminToken(req)) {
      return next();
    }

    return ResponseHandler.error(
      res,
      state.message || 'The platform is temporarily under maintenance',
      503,
      'SERVICE_UNAVAILABLE'
    );
  } catch (error) {
    return next(error);
  }
};

