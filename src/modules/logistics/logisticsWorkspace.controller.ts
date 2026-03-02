import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import Shipment from './shipment.model';
import LogisticsRoute, { LogisticsRouteStatus } from './route.model';
import LogisticsVehicle, { LogisticsVehicleStatus } from './vehicle.model';
import LogisticsDriver, { LogisticsDriverStatus } from './driver.model';
import LogisticsTrackingEvent, { LogisticsTrackingEventStatus } from './trackingEvent.model';
import LogisticsColdChainLog, { LogisticsColdChainStatus } from './coldChainLog.model';
import { ResponseHandler } from '../../common/utils/response';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../common/errors/AppError';
import { isSuperAdminRole } from '../../common/middleware/superAdmin';
import AuditService from '../audit/audit.service';
import { getClientIp } from '../../common/middleware/rateLimiter';

const ROUTE_STATUS_TRANSITIONS: Record<LogisticsRouteStatus, LogisticsRouteStatus[]> = {
  draft: ['draft', 'active', 'archived'],
  active: ['active', 'archived'],
  archived: ['archived'],
};

const VEHICLE_STATUS_TRANSITIONS: Record<LogisticsVehicleStatus, LogisticsVehicleStatus[]> = {
  available: ['available', 'assigned', 'maintenance', 'inactive'],
  assigned: ['assigned', 'available', 'maintenance', 'inactive'],
  maintenance: ['maintenance', 'available', 'inactive'],
  inactive: ['inactive', 'available'],
};

const DRIVER_STATUS_TRANSITIONS: Record<LogisticsDriverStatus, LogisticsDriverStatus[]> = {
  available: ['available', 'assigned', 'inactive'],
  assigned: ['assigned', 'available', 'inactive'],
  inactive: ['inactive', 'available'],
};

const TRACKING_EVENT_STATUS_TRANSITIONS: Record<LogisticsTrackingEventStatus, LogisticsTrackingEventStatus[]> = {
  created: ['created', 'verified', 'closed'],
  verified: ['verified', 'closed'],
  closed: ['closed'],
};

const COLD_CHAIN_STATUS_TRANSITIONS: Record<LogisticsColdChainStatus, LogisticsColdChainStatus[]> = {
  normal: ['normal', 'violation'],
  violation: ['violation', 'resolved'],
  resolved: ['resolved', 'violation'],
};

const isPrivilegedLogisticsRole = (role?: string): boolean => {
  return role === 'admin' || role === 'platform_admin' || isSuperAdminRole(role);
};

const toObjectId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toSort = (sortBy: unknown, sortOrder: unknown, allowedFields: string[]) => {
  const resolvedSortBy = typeof sortBy === 'string' && allowedFields.includes(sortBy) ? sortBy : 'createdAt';
  const resolvedSortOrder = sortOrder === 'asc' ? 1 : -1;
  return { [resolvedSortBy]: resolvedSortOrder } as Record<string, 1 | -1>;
};

const toPositiveInt = (value: unknown, fallback: number, max?: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  if (typeof max === 'number') return Math.min(parsed, max);
  return parsed;
};

const toBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return undefined;
};

const getActorId = (req: Request): string => {
  if (!req.user?.id) {
    throw new BadRequestError('User ID not found');
  }
  return req.user.id;
};

const toObjectIdValue = (value: string): mongoose.Types.ObjectId => {
  return new mongoose.Types.ObjectId(value);
};

const getOrgContext = (req: Request): string | undefined => {
  const headerOrg = toObjectId(req.headers['x-organization-id']);
  const queryOrg = toObjectId(req.query.organizationId);
  const bodyOrg = typeof req.body === 'object' && req.body
    ? toObjectId((req.body as Record<string, unknown>).organizationId)
    : undefined;
  return queryOrg || bodyOrg || headerOrg;
};

const resolveScopedOrganizationId = (req: Request): string | undefined => {
  const requestedOrg = getOrgContext(req);
  const actorOrg = req.user?.orgId;

  if (isSuperAdminRole(req.user?.role)) {
    return requestedOrg || actorOrg;
  }

  if (actorOrg) {
    if (requestedOrg && requestedOrg !== actorOrg) {
      throw new ForbiddenError('Cannot access logistics resources outside your organization context');
    }
    return actorOrg;
  }

  return requestedOrg;
};

const assertEntityAccess = (
  req: Request,
  organizationId: string | undefined,
  createdBy: string
): void => {
  if (isSuperAdminRole(req.user?.role)) return;

  const actorId = getActorId(req);
  const actorOrg = req.user?.orgId;

  if (isPrivilegedLogisticsRole(req.user?.role)) {
    if (organizationId && actorOrg && organizationId !== actorOrg) {
      throw new ForbiddenError('Cannot access logistics resources outside your organization context');
    }
    return;
  }

  if (createdBy !== actorId) {
    throw new ForbiddenError('You can only access your own logistics resources');
  }

  if (organizationId && actorOrg && organizationId !== actorOrg) {
    throw new ForbiddenError('Cannot access logistics resources outside your organization context');
  }
};

const buildPagination = (page: number, limit: number, total: number) => {
  const totalPages = Math.ceil(total / limit) || 1;
  return { page, limit, total, totalPages };
};

const toPlainObject = <T>(value: T): T => {
  if (value && typeof (value as { toObject?: () => T }).toObject === 'function') {
    return (value as { toObject: () => T }).toObject();
  }
  return value;
};

const withUiStatus = <T extends Record<string, unknown>>(entity: T): T & { uiStatus: unknown } => {
  const plain = toPlainObject(entity);
  return {
    ...plain,
    uiStatus: plain.status,
  };
};

const assertTransition = <T extends string>(
  current: T,
  next: T,
  transitions: Record<T, T[]>,
  label: string
): void => {
  const allowed = transitions[current] || [];
  if (!allowed.includes(next)) {
    throw new BadRequestError(`Invalid ${label} transition: ${current} -> ${next}`);
  }
};

const resolveVehicleState = (
  requestedStatus: LogisticsVehicleStatus | undefined,
  requestedAvailable: boolean | undefined
): { status: LogisticsVehicleStatus; available: boolean } => {
  const status = requestedStatus || (requestedAvailable === false ? 'assigned' : 'available');
  if (status === 'available') {
    return {
      status: requestedAvailable === false ? 'assigned' : 'available',
      available: requestedAvailable !== false,
    };
  }
  return { status, available: false };
};

const resolveDriverState = (
  requestedStatus: LogisticsDriverStatus | undefined,
  requestedAvailable: boolean | undefined
): { status: LogisticsDriverStatus; available: boolean } => {
  const status = requestedStatus || (requestedAvailable === false ? 'assigned' : 'available');
  if (status === 'available') {
    return {
      status: requestedAvailable === false ? 'assigned' : 'available',
      available: requestedAvailable !== false,
    };
  }
  return { status, available: false };
};

const logAudit = async (req: Request, payload: {
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  risk?: 'low' | 'medium' | 'high' | 'critical';
}) => {
  await AuditService.log({
    action: payload.action,
    resource: payload.resource,
    resourceId: payload.resourceId,
    userId: req.user?.id,
    organizationId: req.user?.orgId,
    ipAddress: getClientIp(req),
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    risk: payload.risk || 'medium',
    details: {
      metadata: {
        ...payload.metadata,
        requestId: req.requestId,
      },
    },
  });
};

class LogisticsWorkspaceController {
  listRoutes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = toPositiveInt(req.query.page, 1, 10000);
      const limit = toPositiveInt(req.query.limit, 20, 100);
      const skip = (page - 1) * limit;
      const organizationId = resolveScopedOrganizationId(req);
      const filter: Record<string, unknown> = { isActive: true };

      if (organizationId) filter.organization = organizationId;
      if (typeof req.query.status === 'string') filter.status = req.query.status;
      if (typeof req.query.origin === 'string') filter.origin = { $regex: req.query.origin.trim(), $options: 'i' };
      if (typeof req.query.destination === 'string') filter.destination = { $regex: req.query.destination.trim(), $options: 'i' };
      if (!isPrivilegedLogisticsRole(req.user?.role) && !isSuperAdminRole(req.user?.role)) filter.createdBy = req.user?.id;

      const [items, total] = await Promise.all([
        LogisticsRoute.find(filter)
          .sort(toSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'origin', 'destination', 'distanceKm', 'status']))
          .skip(skip)
          .limit(limit),
        LogisticsRoute.countDocuments(filter),
      ]);

      ResponseHandler.success(res, items.map((item) => withUiStatus(item)), 'Routes retrieved', 200, {
        pagination: buildPagination(page, limit, total),
      });
    } catch (error) {
      next(error);
    }
  };

  createRoute = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = getActorId(req);
      const organizationId = resolveScopedOrganizationId(req);
      const status = (req.body.status as LogisticsRouteStatus | undefined) || 'draft';

      const created = await LogisticsRoute.create({
        organization: organizationId,
        createdBy: actorId,
        origin: req.body.origin,
        destination: req.body.destination,
        distanceKm: req.body.distanceKm,
        waypoints: req.body.waypoints || [],
        status,
        notes: req.body.notes,
        isActive: true,
      });

      await logAudit(req, {
        action: 'logistics.route_created',
        resource: 'route',
        resourceId: created._id.toString(),
      });

      ResponseHandler.created(res, withUiStatus(created), 'Route created');
    } catch (error) {
      next(error);
    }
  };

  getRoute = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const route = await LogisticsRoute.findOne({ _id: req.params.routeId, isActive: true });
      if (!route) throw new NotFoundError('Route not found');

      assertEntityAccess(req, route.organization?.toString(), route.createdBy.toString());
      ResponseHandler.success(res, withUiStatus(route), 'Route retrieved');
    } catch (error) {
      next(error);
    }
  };

  updateRoute = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const route = await LogisticsRoute.findOne({ _id: req.params.routeId, isActive: true });
      if (!route) throw new NotFoundError('Route not found');

      assertEntityAccess(req, route.organization?.toString(), route.createdBy.toString());

      if (typeof req.body.status === 'string') {
        const nextStatus = req.body.status as LogisticsRouteStatus;
        assertTransition(route.status, nextStatus, ROUTE_STATUS_TRANSITIONS, 'route status');
        route.status = nextStatus;
      }

      const allowedUpdates = ['origin', 'destination', 'distanceKm', 'waypoints', 'notes'] as const;
      for (const field of allowedUpdates) {
        if (req.body[field] !== undefined) {
          (route as unknown as Record<string, unknown>)[field] = req.body[field];
        }
      }

      await route.save();

      await logAudit(req, {
        action: 'logistics.route_updated',
        resource: 'route',
        resourceId: route._id.toString(),
      });

      ResponseHandler.success(res, withUiStatus(route), 'Route updated');
    } catch (error) {
      next(error);
    }
  };

  deleteRoute = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const route = await LogisticsRoute.findOne({ _id: req.params.routeId, isActive: true });
      if (!route) throw new NotFoundError('Route not found');

      assertEntityAccess(req, route.organization?.toString(), route.createdBy.toString());
      route.isActive = false;
      route.status = 'archived';
      await route.save();

      await logAudit(req, {
        action: 'logistics.route_deleted',
        resource: 'route',
        resourceId: route._id.toString(),
        risk: 'medium',
      });

      ResponseHandler.success(res, null, 'Route deleted');
    } catch (error) {
      next(error);
    }
  };

  listVehicles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = toPositiveInt(req.query.page, 1, 10000);
      const limit = toPositiveInt(req.query.limit, 20, 100);
      const skip = (page - 1) * limit;
      const organizationId = resolveScopedOrganizationId(req);
      const filter: Record<string, unknown> = { isActive: true };

      if (organizationId) filter.organization = organizationId;
      if (typeof req.query.status === 'string') filter.status = req.query.status;
      const available = toBoolean(req.query.available);
      if (typeof available === 'boolean') filter.available = available;
      if (typeof req.query.registration === 'string') filter.registration = { $regex: req.query.registration.trim(), $options: 'i' };
      if (!isPrivilegedLogisticsRole(req.user?.role) && !isSuperAdminRole(req.user?.role)) filter.createdBy = req.user?.id;

      const [items, total] = await Promise.all([
        LogisticsVehicle.find(filter)
          .sort(toSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'registration', 'capacityKg', 'status']))
          .skip(skip)
          .limit(limit),
        LogisticsVehicle.countDocuments(filter),
      ]);

      ResponseHandler.success(res, items.map((item) => withUiStatus(item)), 'Vehicles retrieved', 200, {
        pagination: buildPagination(page, limit, total),
      });
    } catch (error) {
      next(error);
    }
  };

  createVehicle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = getActorId(req);
      const organizationId = resolveScopedOrganizationId(req);
      const { status, available } = resolveVehicleState(
        req.body.status as LogisticsVehicleStatus | undefined,
        toBoolean(req.body.available)
      );

      const created = await LogisticsVehicle.create({
        organization: organizationId,
        createdBy: actorId,
        registration: req.body.registration,
        capacityKg: req.body.capacityKg,
        coldChainEnabled: req.body.coldChainEnabled || false,
        status,
        available,
        notes: req.body.notes,
        isActive: true,
      });

      await logAudit(req, {
        action: 'logistics.vehicle_created',
        resource: 'vehicle',
        resourceId: created._id.toString(),
      });

      ResponseHandler.created(res, withUiStatus(created), 'Vehicle created');
    } catch (error) {
      next(error);
    }
  };

  getVehicle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vehicle = await LogisticsVehicle.findOne({ _id: req.params.vehicleId, isActive: true });
      if (!vehicle) throw new NotFoundError('Vehicle not found');
      assertEntityAccess(req, vehicle.organization?.toString(), vehicle.createdBy.toString());
      ResponseHandler.success(res, withUiStatus(vehicle), 'Vehicle retrieved');
    } catch (error) {
      next(error);
    }
  };

  updateVehicle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vehicle = await LogisticsVehicle.findOne({ _id: req.params.vehicleId, isActive: true });
      if (!vehicle) throw new NotFoundError('Vehicle not found');
      assertEntityAccess(req, vehicle.organization?.toString(), vehicle.createdBy.toString());

      const requestedStatus = req.body.status as LogisticsVehicleStatus | undefined;
      if (requestedStatus) assertTransition(vehicle.status, requestedStatus, VEHICLE_STATUS_TRANSITIONS, 'vehicle status');

      const nextState = resolveVehicleState(requestedStatus || vehicle.status, toBoolean(req.body.available));
      vehicle.status = nextState.status;
      vehicle.available = nextState.available;

      const allowedUpdates = ['registration', 'capacityKg', 'coldChainEnabled', 'notes'] as const;
      for (const field of allowedUpdates) {
        if (req.body[field] !== undefined) {
          (vehicle as unknown as Record<string, unknown>)[field] = req.body[field];
        }
      }

      await vehicle.save();

      await logAudit(req, {
        action: 'logistics.vehicle_updated',
        resource: 'vehicle',
        resourceId: vehicle._id.toString(),
      });

      ResponseHandler.success(res, withUiStatus(vehicle), 'Vehicle updated');
    } catch (error) {
      next(error);
    }
  };

  deleteVehicle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vehicle = await LogisticsVehicle.findOne({ _id: req.params.vehicleId, isActive: true });
      if (!vehicle) throw new NotFoundError('Vehicle not found');
      assertEntityAccess(req, vehicle.organization?.toString(), vehicle.createdBy.toString());

      vehicle.isActive = false;
      vehicle.status = 'inactive';
      vehicle.available = false;
      await vehicle.save();

      await logAudit(req, {
        action: 'logistics.vehicle_deleted',
        resource: 'vehicle',
        resourceId: vehicle._id.toString(),
        risk: 'medium',
      });

      ResponseHandler.success(res, null, 'Vehicle deleted');
    } catch (error) {
      next(error);
    }
  };

  listDrivers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = toPositiveInt(req.query.page, 1, 10000);
      const limit = toPositiveInt(req.query.limit, 20, 100);
      const skip = (page - 1) * limit;
      const organizationId = resolveScopedOrganizationId(req);
      const filter: Record<string, unknown> = { isActive: true };

      if (organizationId) filter.organization = organizationId;
      if (typeof req.query.status === 'string') filter.status = req.query.status;
      const available = toBoolean(req.query.available);
      if (typeof available === 'boolean') filter.available = available;
      if (typeof req.query.name === 'string') filter.name = { $regex: req.query.name.trim(), $options: 'i' };
      if (typeof req.query.licenseNumber === 'string') filter.licenseNumber = { $regex: req.query.licenseNumber.trim(), $options: 'i' };
      if (!isPrivilegedLogisticsRole(req.user?.role) && !isSuperAdminRole(req.user?.role)) filter.createdBy = req.user?.id;

      const [items, total] = await Promise.all([
        LogisticsDriver.find(filter)
          .sort(toSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'name', 'licenseNumber', 'status']))
          .skip(skip)
          .limit(limit),
        LogisticsDriver.countDocuments(filter),
      ]);

      ResponseHandler.success(res, items.map((item) => withUiStatus(item)), 'Drivers retrieved', 200, {
        pagination: buildPagination(page, limit, total),
      });
    } catch (error) {
      next(error);
    }
  };

  createDriver = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = getActorId(req);
      const organizationId = resolveScopedOrganizationId(req);
      const { status, available } = resolveDriverState(
        req.body.status as LogisticsDriverStatus | undefined,
        toBoolean(req.body.available)
      );

      const created = await LogisticsDriver.create({
        organization: organizationId,
        createdBy: actorId,
        name: req.body.name,
        phone: req.body.phone,
        licenseNumber: req.body.licenseNumber,
        status,
        available,
        notes: req.body.notes,
        isActive: true,
      });

      await logAudit(req, {
        action: 'logistics.driver_created',
        resource: 'driver',
        resourceId: created._id.toString(),
      });

      ResponseHandler.created(res, withUiStatus(created), 'Driver created');
    } catch (error) {
      next(error);
    }
  };

  getDriver = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const driver = await LogisticsDriver.findOne({ _id: req.params.driverId, isActive: true });
      if (!driver) throw new NotFoundError('Driver not found');
      assertEntityAccess(req, driver.organization?.toString(), driver.createdBy.toString());
      ResponseHandler.success(res, withUiStatus(driver), 'Driver retrieved');
    } catch (error) {
      next(error);
    }
  };

  updateDriver = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const driver = await LogisticsDriver.findOne({ _id: req.params.driverId, isActive: true });
      if (!driver) throw new NotFoundError('Driver not found');
      assertEntityAccess(req, driver.organization?.toString(), driver.createdBy.toString());

      const requestedStatus = req.body.status as LogisticsDriverStatus | undefined;
      if (requestedStatus) assertTransition(driver.status, requestedStatus, DRIVER_STATUS_TRANSITIONS, 'driver status');

      const nextState = resolveDriverState(requestedStatus || driver.status, toBoolean(req.body.available));
      driver.status = nextState.status;
      driver.available = nextState.available;

      const allowedUpdates = ['name', 'phone', 'licenseNumber', 'notes'] as const;
      for (const field of allowedUpdates) {
        if (req.body[field] !== undefined) {
          (driver as unknown as Record<string, unknown>)[field] = req.body[field];
        }
      }

      await driver.save();

      await logAudit(req, {
        action: 'logistics.driver_updated',
        resource: 'driver',
        resourceId: driver._id.toString(),
      });

      ResponseHandler.success(res, withUiStatus(driver), 'Driver updated');
    } catch (error) {
      next(error);
    }
  };

  deleteDriver = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const driver = await LogisticsDriver.findOne({ _id: req.params.driverId, isActive: true });
      if (!driver) throw new NotFoundError('Driver not found');
      assertEntityAccess(req, driver.organization?.toString(), driver.createdBy.toString());

      driver.isActive = false;
      driver.status = 'inactive';
      driver.available = false;
      await driver.save();

      await logAudit(req, {
        action: 'logistics.driver_deleted',
        resource: 'driver',
        resourceId: driver._id.toString(),
        risk: 'medium',
      });

      ResponseHandler.success(res, null, 'Driver deleted');
    } catch (error) {
      next(error);
    }
  };

  listTrackingEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = toPositiveInt(req.query.page, 1, 10000);
      const limit = toPositiveInt(req.query.limit, 20, 100);
      const skip = (page - 1) * limit;
      const organizationId = resolveScopedOrganizationId(req);
      const filter: Record<string, unknown> = { isActive: true };

      if (organizationId) filter.organization = organizationId;
      if (typeof req.query.shipmentId === 'string') filter.shipmentId = req.query.shipmentId;
      if (typeof req.query.status === 'string') filter.status = req.query.status;
      if (typeof req.query.eventType === 'string') filter.eventType = req.query.eventType;
      if (!isPrivilegedLogisticsRole(req.user?.role) && !isSuperAdminRole(req.user?.role)) filter.createdBy = req.user?.id;

      const [items, total] = await Promise.all([
        LogisticsTrackingEvent.find(filter)
          .sort(toSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'recordedAt', 'status', 'eventType']))
          .skip(skip)
          .limit(limit),
        LogisticsTrackingEvent.countDocuments(filter),
      ]);

      ResponseHandler.success(res, items.map((item) => withUiStatus(item)), 'Tracking events retrieved', 200, {
        pagination: buildPagination(page, limit, total),
      });
    } catch (error) {
      next(error);
    }
  };

  createTrackingEventResource = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = getActorId(req);
      const shipment = await Shipment.findById(req.body.shipmentId);
      if (!shipment) throw new NotFoundError('Shipment not found');
      assertEntityAccess(req, shipment.organization?.toString(), shipment.createdBy.toString());

      const created = await LogisticsTrackingEvent.create({
        shipmentId: shipment._id,
        organization: shipment.organization,
        createdBy: actorId,
        location: req.body.location,
        note: req.body.note,
        eventType: req.body.eventType,
        recordedAt: req.body.recordedAt ? new Date(req.body.recordedAt) : new Date(),
        status: (req.body.status as LogisticsTrackingEventStatus | undefined) || 'created',
        metadata: req.body.metadata,
      });

      shipment.trackingEvents.push({
        status: shipment.status,
        note: req.body.note || `Tracking event recorded: ${created.eventType}`,
        location: req.body.location,
        updatedBy: toObjectIdValue(actorId),
        timestamp: created.recordedAt,
      });
      await shipment.save();

      await logAudit(req, {
        action: 'logistics.tracking_event_created',
        resource: 'tracking_event',
        resourceId: created._id.toString(),
        metadata: {
          shipmentId: shipment._id.toString(),
          eventType: created.eventType,
        },
      });

      ResponseHandler.created(res, withUiStatus(created), 'Tracking event created');
    } catch (error) {
      next(error);
    }
  };

  getTrackingEventResource = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = await LogisticsTrackingEvent.findOne({ _id: req.params.eventId, isActive: true });
      if (!event) throw new NotFoundError('Tracking event not found');
      assertEntityAccess(req, event.organization?.toString(), event.createdBy.toString());
      ResponseHandler.success(res, withUiStatus(event), 'Tracking event retrieved');
    } catch (error) {
      next(error);
    }
  };

  updateTrackingEventResource = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = await LogisticsTrackingEvent.findOne({ _id: req.params.eventId, isActive: true });
      if (!event) throw new NotFoundError('Tracking event not found');
      assertEntityAccess(req, event.organization?.toString(), event.createdBy.toString());

      if (typeof req.body.status === 'string') {
        const nextStatus = req.body.status as LogisticsTrackingEventStatus;
        assertTransition(event.status, nextStatus, TRACKING_EVENT_STATUS_TRANSITIONS, 'tracking event status');
        event.status = nextStatus;
      }

      if (req.body.location !== undefined) event.location = req.body.location;
      if (req.body.note !== undefined) event.note = req.body.note;
      if (req.body.eventType !== undefined) event.eventType = req.body.eventType;
      if (req.body.recordedAt !== undefined) event.recordedAt = new Date(req.body.recordedAt);
      if (req.body.metadata !== undefined) event.metadata = req.body.metadata;
      await event.save();

      const shipment = await Shipment.findById(event.shipmentId);
      if (shipment) {
        shipment.trackingEvents.push({
          status: shipment.status,
          note: event.note || `Tracking event updated: ${event.eventType}`,
          location: event.location,
          updatedBy: toObjectIdValue(getActorId(req)),
          timestamp: new Date(),
        });
        await shipment.save();
      }

      await logAudit(req, {
        action: 'logistics.tracking_event_updated',
        resource: 'tracking_event',
        resourceId: event._id.toString(),
      });

      ResponseHandler.success(res, withUiStatus(event), 'Tracking event updated');
    } catch (error) {
      next(error);
    }
  };

  deleteTrackingEventResource = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = await LogisticsTrackingEvent.findOne({ _id: req.params.eventId, isActive: true });
      if (!event) throw new NotFoundError('Tracking event not found');
      assertEntityAccess(req, event.organization?.toString(), event.createdBy.toString());

      event.isActive = false;
      event.status = 'closed';
      await event.save();

      await logAudit(req, {
        action: 'logistics.tracking_event_deleted',
        resource: 'tracking_event',
        resourceId: event._id.toString(),
        risk: 'medium',
      });

      ResponseHandler.success(res, null, 'Tracking event deleted');
    } catch (error) {
      next(error);
    }
  };

  listColdChainLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = toPositiveInt(req.query.page, 1, 10000);
      const limit = toPositiveInt(req.query.limit, 20, 100);
      const skip = (page - 1) * limit;
      const organizationId = resolveScopedOrganizationId(req);
      const filter: Record<string, unknown> = { isActive: true };

      if (organizationId) filter.organization = organizationId;
      if (typeof req.query.shipmentId === 'string') filter.shipmentId = req.query.shipmentId;
      if (typeof req.query.status === 'string') filter.status = req.query.status;
      const violation = toBoolean(req.query.violation);
      if (typeof violation === 'boolean') filter.violation = violation;
      if (!isPrivilegedLogisticsRole(req.user?.role) && !isSuperAdminRole(req.user?.role)) filter.createdBy = req.user?.id;

      const [items, total] = await Promise.all([
        LogisticsColdChainLog.find(filter)
          .sort(toSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'capturedAt', 'temperatureC', 'thresholdC', 'status']))
          .skip(skip)
          .limit(limit),
        LogisticsColdChainLog.countDocuments(filter),
      ]);

      ResponseHandler.success(res, items.map((item) => withUiStatus(item)), 'Cold-chain logs retrieved', 200, {
        pagination: buildPagination(page, limit, total),
      });
    } catch (error) {
      next(error);
    }
  };

  createColdChainLog = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = getActorId(req);
      const shipment = await Shipment.findById(req.body.shipmentId);
      if (!shipment) throw new NotFoundError('Shipment not found');
      assertEntityAccess(req, shipment.organization?.toString(), shipment.createdBy.toString());

      const temperatureC = Number(req.body.temperatureC);
      const thresholdC = Number(req.body.thresholdC);
      const computedViolation = temperatureC > thresholdC;
      let violation = typeof req.body.violation === 'boolean' ? req.body.violation : computedViolation;
      let status = (req.body.status as LogisticsColdChainStatus | undefined) || (violation ? 'violation' : 'normal');
      if (status === 'violation') violation = true;
      if (status === 'resolved') violation = false;
      if (status === 'normal' && violation) status = 'violation';

      const created = await LogisticsColdChainLog.create({
        shipmentId: shipment._id,
        organization: shipment.organization,
        createdBy: actorId,
        temperatureC,
        thresholdC,
        violation,
        capturedAt: req.body.capturedAt ? new Date(req.body.capturedAt) : new Date(),
        status,
        notes: req.body.notes,
      });

      if (created.status === 'violation') {
        shipment.trackingEvents.push({
          status: shipment.status,
          note: 'Cold-chain violation detected',
          updatedBy: toObjectIdValue(actorId),
          timestamp: created.capturedAt,
        });
        await shipment.save();
      }

      await logAudit(req, {
        action: 'logistics.cold_chain_log_created',
        resource: 'cold_chain_log',
        resourceId: created._id.toString(),
        metadata: {
          shipmentId: shipment._id.toString(),
          status: created.status,
          violation: created.violation,
        },
        risk: created.status === 'violation' ? 'high' : 'medium',
      });

      ResponseHandler.created(res, withUiStatus(created), 'Cold-chain log created');
    } catch (error) {
      next(error);
    }
  };

  getColdChainLog = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const log = await LogisticsColdChainLog.findOne({ _id: req.params.logId, isActive: true });
      if (!log) throw new NotFoundError('Cold-chain log not found');
      assertEntityAccess(req, log.organization?.toString(), log.createdBy.toString());
      ResponseHandler.success(res, withUiStatus(log), 'Cold-chain log retrieved');
    } catch (error) {
      next(error);
    }
  };

  updateColdChainLog = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const log = await LogisticsColdChainLog.findOne({ _id: req.params.logId, isActive: true });
      if (!log) throw new NotFoundError('Cold-chain log not found');
      assertEntityAccess(req, log.organization?.toString(), log.createdBy.toString());

      const nextTemperature = req.body.temperatureC !== undefined ? Number(req.body.temperatureC) : log.temperatureC;
      const nextThreshold = req.body.thresholdC !== undefined ? Number(req.body.thresholdC) : log.thresholdC;
      let nextViolation = log.violation;

      if (typeof req.body.violation === 'boolean') {
        nextViolation = req.body.violation;
      } else if (req.body.temperatureC !== undefined || req.body.thresholdC !== undefined) {
        nextViolation = nextTemperature > nextThreshold;
      }

      if (typeof req.body.status === 'string') {
        const requestedStatus = req.body.status as LogisticsColdChainStatus;
        assertTransition(log.status, requestedStatus, COLD_CHAIN_STATUS_TRANSITIONS, 'cold-chain status');
        log.status = requestedStatus;
      }

      if (log.status === 'violation') nextViolation = true;
      if (log.status === 'resolved') nextViolation = false;
      if (log.status === 'normal' && nextViolation) log.status = 'violation';

      log.temperatureC = nextTemperature;
      log.thresholdC = nextThreshold;
      log.violation = nextViolation;
      if (req.body.notes !== undefined) log.notes = req.body.notes;
      if (req.body.capturedAt !== undefined) log.capturedAt = new Date(req.body.capturedAt);
      await log.save();

      await logAudit(req, {
        action: 'logistics.cold_chain_log_updated',
        resource: 'cold_chain_log',
        resourceId: log._id.toString(),
        metadata: {
          status: log.status,
          violation: log.violation,
        },
        risk: log.status === 'violation' ? 'high' : 'medium',
      });

      ResponseHandler.success(res, withUiStatus(log), 'Cold-chain log updated');
    } catch (error) {
      next(error);
    }
  };

  deleteColdChainLog = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const log = await LogisticsColdChainLog.findOne({ _id: req.params.logId, isActive: true });
      if (!log) throw new NotFoundError('Cold-chain log not found');
      assertEntityAccess(req, log.organization?.toString(), log.createdBy.toString());

      log.isActive = false;
      await log.save();

      await logAudit(req, {
        action: 'logistics.cold_chain_log_deleted',
        resource: 'cold_chain_log',
        resourceId: log._id.toString(),
        risk: 'medium',
      });

      ResponseHandler.success(res, null, 'Cold-chain log deleted');
    } catch (error) {
      next(error);
    }
  };

  flagColdChainViolations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = resolveScopedOrganizationId(req);
      const filter: Record<string, unknown> = { isActive: true };
      if (organizationId) filter.organization = organizationId;
      if (typeof req.body.shipmentId === 'string') filter.shipmentId = req.body.shipmentId;

      const logs = await LogisticsColdChainLog.find(filter).sort({ capturedAt: -1 });
      const flagged: Array<Record<string, unknown>> = [];

      for (const log of logs) {
        const shouldFlag = log.temperatureC > log.thresholdC;
        if (shouldFlag && (log.status !== 'violation' || !log.violation)) {
          log.status = 'violation';
          log.violation = true;
          await log.save();
          flagged.push(withUiStatus(log));
        }
      }

      await logAudit(req, {
        action: 'logistics.cold_chain_violations_flagged',
        resource: 'cold_chain_log',
        metadata: {
          scannedCount: logs.length,
          flaggedCount: flagged.length,
        },
        risk: flagged.length > 0 ? 'high' : 'low',
      });

      ResponseHandler.success(res, {
        flaggedCount: flagged.length,
        scannedCount: logs.length,
        logs: flagged,
      }, 'Cold-chain violations flagged');
    } catch (error) {
      next(error);
    }
  };
}

export default new LogisticsWorkspaceController();
