import { NextFunction, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import mongoose from 'mongoose';
import CollectionPoint from './collectionPoint.model';
import Shipment, { ShipmentStatus } from './shipment.model';
import { ResponseHandler } from '../../common/utils/response';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../common/errors/AppError';
import { isSuperAdminRole } from '../../common/middleware/superAdmin';
import AuditService from '../audit/audit.service';
import { getClientIp } from '../../common/middleware/rateLimiter';

const POD_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'logistics-pod');
const ALLOWED_POD_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_POD_FILE_BYTES = 5 * 1024 * 1024;
type ShipmentUiStatus = 'planned' | 'in_transit' | 'delivered' | 'cancelled';

const SHIPMENT_STATUSES: ShipmentStatus[] = ['created', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'returned'];
const SHIPMENT_UI_STATUSES: ShipmentUiStatus[] = ['planned', 'in_transit', 'delivered', 'cancelled'];
const SHIPMENT_UI_TO_NATIVE: Record<ShipmentUiStatus, ShipmentStatus> = {
  planned: 'created',
  in_transit: 'in_transit',
  delivered: 'delivered',
  cancelled: 'cancelled',
};
const SHIPMENT_UI_FILTER_TO_NATIVE: Record<ShipmentUiStatus, ShipmentStatus[]> = {
  planned: ['created', 'assigned'],
  in_transit: ['picked_up', 'in_transit'],
  delivered: ['delivered'],
  cancelled: ['cancelled', 'returned'],
};
const SHIPMENT_STATUS_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  created: ['created', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
  assigned: ['assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
  picked_up: ['picked_up', 'in_transit', 'delivered', 'cancelled', 'returned'],
  in_transit: ['in_transit', 'delivered', 'cancelled', 'returned'],
  delivered: ['delivered', 'returned'],
  cancelled: ['cancelled'],
  returned: ['returned'],
};

const ensurePodUploadDir = () => {
  if (!fs.existsSync(POD_UPLOAD_DIR)) {
    fs.mkdirSync(POD_UPLOAD_DIR, { recursive: true });
  }
};

const podStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensurePodUploadDir();
    cb(null, POD_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const sanitizedExt = ext.length > 0 && ext.length <= 10 ? ext : '.bin';
    cb(null, `pod_${Date.now()}_${Math.round(Math.random() * 1e9)}${sanitizedExt}`);
  },
});

export const proofOfDeliveryUpload = multer({
  storage: podStorage,
  limits: {
    fileSize: MAX_POD_FILE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_POD_MIME_TYPES.has(file.mimetype)) {
      cb(new BadRequestError('Unsupported proof-of-delivery file type'));
      return;
    }

    cb(null, true);
  },
});

const isPrivilegedLogisticsRole = (role?: string): boolean => {
  return role === 'admin' || role === 'platform_admin' || isSuperAdminRole(role);
};

const toObjectId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toSort = (sortBy: unknown, sortOrder: unknown, allowedFields: string[]) => {
  const resolvedSortBy = typeof sortBy === 'string' && allowedFields.includes(sortBy) ? sortBy : 'createdAt';
  const resolvedSortOrder = sortOrder === 'asc' ? 1 : -1;
  return { [resolvedSortBy]: resolvedSortOrder } as Record<string, 1 | -1>;
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
  if (isSuperAdminRole(req.user?.role)) {
    return;
  }

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

const toShipmentUiStatus = (status: ShipmentStatus): ShipmentUiStatus => {
  if (status === 'created' || status === 'assigned') {
    return 'planned';
  }
  if (status === 'picked_up' || status === 'in_transit') {
    return 'in_transit';
  }
  if (status === 'delivered') {
    return 'delivered';
  }
  return 'cancelled';
};

const mapShipmentForUi = <T extends { status: ShipmentStatus }>(shipment: T): T & { uiStatus: ShipmentUiStatus } => {
  const plain = toPlainObject(shipment);
  return {
    ...plain,
    uiStatus: toShipmentUiStatus(plain.status),
  };
};

const toShipmentStatus = (value: unknown): ShipmentStatus | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (SHIPMENT_UI_STATUSES.includes(normalized as ShipmentUiStatus)) {
    return SHIPMENT_UI_TO_NATIVE[normalized as ShipmentUiStatus];
  }

  if (SHIPMENT_STATUSES.includes(normalized as ShipmentStatus)) {
    return normalized as ShipmentStatus;
  }

  return undefined;
};

const resolveShipmentStatusesForFilter = (statusParam: unknown, uiStatusParam: unknown): ShipmentStatus[] | undefined => {
  const source = typeof uiStatusParam === 'string' ? uiStatusParam : statusParam;
  if (typeof source !== 'string') {
    return undefined;
  }

  const normalized = source.trim().toLowerCase();

  if (SHIPMENT_UI_STATUSES.includes(normalized as ShipmentUiStatus)) {
    return SHIPMENT_UI_FILTER_TO_NATIVE[normalized as ShipmentUiStatus];
  }

  if (SHIPMENT_STATUSES.includes(normalized as ShipmentStatus)) {
    return [normalized as ShipmentStatus];
  }

  return undefined;
};

const assertShipmentTransition = (current: ShipmentStatus, next: ShipmentStatus): void => {
  const allowed = SHIPMENT_STATUS_TRANSITIONS[current] || [];
  if (!allowed.includes(next)) {
    throw new BadRequestError(`Invalid shipment status transition: ${current} -> ${next}`);
  }
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

class LogisticsController {
  createCollectionPoint = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = getActorId(req);
      const organizationId = resolveScopedOrganizationId(req);
      const requestedStatus = req.body.status as 'active' | 'maintenance' | 'inactive' | undefined;
      const derivedStatus = requestedStatus || (req.body.isActive === false ? 'inactive' : 'active');

      const created = await CollectionPoint.create({
        name: req.body.name,
        type: req.body.type || 'collection_point',
        status: derivedStatus,
        organization: organizationId,
        createdBy: actorId,
        address: req.body.address,
        coordinates: req.body.coordinates,
        contactName: req.body.contactName,
        contactPhone: req.body.contactPhone,
        capacityTons: req.body.capacityTons,
        features: req.body.features || [],
        isActive: derivedStatus !== 'inactive',
      });

      await logAudit(req, {
        action: 'logistics.collection_point_created',
        resource: 'collection_point',
        resourceId: created._id.toString(),
        metadata: {
          organizationId,
          type: created.type,
        },
      });

      ResponseHandler.created(res, created, 'Collection point created');
    } catch (error) {
      next(error);
    }
  };

  listCollectionPoints = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 20);
      const skip = (page - 1) * limit;
      const organizationId = resolveScopedOrganizationId(req);
      const district = typeof req.query.district === 'string' ? req.query.district.trim() : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status.trim() : undefined;
      const includeInactive = req.query.includeInactive === 'true';

      const filter: Record<string, unknown> = {
        isActive: includeInactive ? { $in: [true, false] } : true,
      };

      if (organizationId) {
        filter.organization = organizationId;
      }

      if (typeof req.query.type === 'string') {
        filter.type = req.query.type;
      }

      if (status) {
        filter.status = status;

        if (status === 'inactive') {
          filter.isActive = { $in: [true, false] };
        }
      }

      if (district) {
        filter['address.district'] = district;
      }

      if (!isPrivilegedLogisticsRole(req.user?.role) && !isSuperAdminRole(req.user?.role)) {
        filter.createdBy = req.user?.id;
      }

      const [items, total] = await Promise.all([
        CollectionPoint.find(filter)
          .sort(toSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'name', 'capacityTons']))
          .skip(skip)
          .limit(limit),
        CollectionPoint.countDocuments(filter),
      ]);

      ResponseHandler.success(
        res,
        items,
        'Collection points retrieved',
        200,
        { pagination: buildPagination(page, limit, total) }
      );
    } catch (error) {
      next(error);
    }
  };

  getCollectionPoint = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const point = await CollectionPoint.findById(req.params.id);
      if (!point) {
        throw new NotFoundError('Collection point not found');
      }

      assertEntityAccess(req, point.organization?.toString(), point.createdBy.toString());
      ResponseHandler.success(res, point, 'Collection point retrieved');
    } catch (error) {
      next(error);
    }
  };

  updateCollectionPoint = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const point = await CollectionPoint.findById(req.params.id);
      if (!point) {
        throw new NotFoundError('Collection point not found');
      }

      assertEntityAccess(req, point.organization?.toString(), point.createdBy.toString());

      const allowedUpdates = [
        'name',
        'type',
        'status',
        'address',
        'coordinates',
        'contactName',
        'contactPhone',
        'capacityTons',
        'features',
        'isActive',
      ] as const;

      for (const field of allowedUpdates) {
        if (req.body[field] !== undefined) {
          (point as unknown as Record<string, unknown>)[field] = req.body[field];
        }
      }

      if (typeof req.body.status === 'string') {
        point.isActive = req.body.status !== 'inactive';
      } else if (typeof req.body.isActive === 'boolean') {
        if (!req.body.isActive) {
          point.status = 'inactive';
        } else if (point.status === 'inactive') {
          point.status = 'active';
        }
      }

      await point.save();

      await logAudit(req, {
        action: 'logistics.collection_point_updated',
        resource: 'collection_point',
        resourceId: point._id.toString(),
      });

      ResponseHandler.success(res, point, 'Collection point updated');
    } catch (error) {
      next(error);
    }
  };

  deactivateCollectionPoint = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const point = await CollectionPoint.findById(req.params.id);
      if (!point) {
        throw new NotFoundError('Collection point not found');
      }

      assertEntityAccess(req, point.organization?.toString(), point.createdBy.toString());
      point.isActive = false;
      point.status = 'inactive';
      await point.save();

      await logAudit(req, {
        action: 'logistics.collection_point_deactivated',
        resource: 'collection_point',
        resourceId: point._id.toString(),
        risk: 'high',
      });

      ResponseHandler.success(res, point, 'Collection point deactivated');
    } catch (error) {
      next(error);
    }
  };

  createShipment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = getActorId(req);
      const organizationId = resolveScopedOrganizationId(req);

      const shipment = await Shipment.create({
        shipmentNumber: `SHP-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        order: req.body.orderId,
        organization: organizationId,
        createdBy: actorId,
        from: req.body.from,
        to: req.body.to,
        status: 'created',
        carrierName: req.body.carrierName,
        vehicleNumber: req.body.vehicleNumber,
        driverName: req.body.driverName,
        driverPhone: req.body.driverPhone,
        deliveryWindowStart: req.body.deliveryWindowStart,
        deliveryWindowEnd: req.body.deliveryWindowEnd,
        expectedDeliveryAt: req.body.expectedDeliveryAt,
        metadata: req.body.metadata,
        trackingEvents: [
          {
            status: 'created',
            note: 'Shipment created',
            updatedBy: toObjectIdValue(actorId),
            timestamp: new Date(),
          },
        ],
      });

      await logAudit(req, {
        action: 'logistics.shipment_created',
        resource: 'shipment',
        resourceId: shipment._id.toString(),
        metadata: {
          shipmentNumber: shipment.shipmentNumber,
          organizationId,
        },
      });

      ResponseHandler.created(res, mapShipmentForUi(shipment), 'Shipment created');
    } catch (error) {
      next(error);
    }
  };

  listShipments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 20);
      const skip = (page - 1) * limit;
      const organizationId = resolveScopedOrganizationId(req);

      const filter: Record<string, unknown> = {};
      if (organizationId) {
        filter.organization = organizationId;
      }

      const requestedStatuses = resolveShipmentStatusesForFilter(req.query.status, req.query.uiStatus);
      if (requestedStatuses && requestedStatuses.length > 0) {
        filter.status = requestedStatuses.length === 1 ? requestedStatuses[0] : { $in: requestedStatuses };
      }

      if (typeof req.query.shipmentNumber === 'string') {
        filter.shipmentNumber = { $regex: req.query.shipmentNumber.trim(), $options: 'i' };
      }

      if (!isPrivilegedLogisticsRole(req.user?.role) && !isSuperAdminRole(req.user?.role)) {
        filter.createdBy = req.user?.id;
      }

      const [items, total] = await Promise.all([
        Shipment.find(filter)
          .sort(toSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'shipmentNumber', 'status', 'expectedDeliveryAt']))
          .skip(skip)
          .limit(limit),
        Shipment.countDocuments(filter),
      ]);

      ResponseHandler.success(
        res,
        items.map((item) => mapShipmentForUi(item)),
        'Shipments retrieved',
        200,
        { pagination: buildPagination(page, limit, total) }
      );
    } catch (error) {
      next(error);
    }
  };

  getShipment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const shipment = await Shipment.findById(req.params.id);
      if (!shipment) {
        throw new NotFoundError('Shipment not found');
      }

      assertEntityAccess(req, shipment.organization?.toString(), shipment.createdBy.toString());
      ResponseHandler.success(res, mapShipmentForUi(shipment), 'Shipment retrieved');
    } catch (error) {
      next(error);
    }
  };

  updateShipmentStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const shipment = await Shipment.findById(req.params.id);
      if (!shipment) {
        throw new NotFoundError('Shipment not found');
      }

      assertEntityAccess(req, shipment.organization?.toString(), shipment.createdBy.toString());

      const requestedStatus = req.body.uiStatus || req.body.status;
      const status = toShipmentStatus(requestedStatus);
      if (!status) {
        throw new BadRequestError('Invalid shipment status');
      }
      assertShipmentTransition(shipment.status, status);
      shipment.status = status;
      shipment.trackingEvents.push({
        status,
        note: req.body.note,
        location: req.body.location,
        updatedBy: toObjectIdValue(getActorId(req)),
        timestamp: new Date(),
      });

      if (status === 'delivered') {
        shipment.actualDeliveredAt = new Date();
      }

      await shipment.save();

      await logAudit(req, {
        action: 'logistics.shipment_status_updated',
        resource: 'shipment',
        resourceId: shipment._id.toString(),
        metadata: {
          status,
          uiStatus: toShipmentUiStatus(status),
        },
        risk: status === 'cancelled' ? 'high' : 'medium',
      });

      ResponseHandler.success(res, mapShipmentForUi(shipment), 'Shipment status updated');
    } catch (error) {
      next(error);
    }
  };

  addTrackingEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const shipment = await Shipment.findById(req.params.id);
      if (!shipment) {
        throw new NotFoundError('Shipment not found');
      }

      assertEntityAccess(req, shipment.organization?.toString(), shipment.createdBy.toString());

      const requestedStatus = req.body.uiStatus || req.body.status;
      const status = toShipmentStatus(requestedStatus);
      if (!status) {
        throw new BadRequestError('Invalid shipment status for tracking event');
      }

      if (shipment.status !== status) {
        assertShipmentTransition(shipment.status, status);
        shipment.status = status;
      }

      shipment.trackingEvents.push({
        status,
        note: req.body.note,
        location: req.body.location,
        updatedBy: toObjectIdValue(getActorId(req)),
        timestamp: new Date(),
      });

      await shipment.save();

      await logAudit(req, {
        action: 'logistics.shipment_tracking_added',
        resource: 'shipment',
        resourceId: shipment._id.toString(),
        metadata: {
          status,
          uiStatus: toShipmentUiStatus(status),
        },
      });

      ResponseHandler.success(res, mapShipmentForUi(shipment), 'Tracking event added');
    } catch (error) {
      next(error);
    }
  };

  uploadProofOfDelivery = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const shipment = await Shipment.findById(req.params.id);
      if (!shipment) {
        throw new NotFoundError('Shipment not found');
      }

      assertEntityAccess(req, shipment.organization?.toString(), shipment.createdBy.toString());

      if (!req.file && !req.body.fileUrl) {
        throw new BadRequestError('Either proof file upload or fileUrl is required');
      }

      if (req.file && req.file.size > MAX_POD_FILE_BYTES) {
        throw new BadRequestError('Proof-of-delivery file exceeds 5MB limit');
      }

      if (req.file && !ALLOWED_POD_MIME_TYPES.has(req.file.mimetype)) {
        throw new BadRequestError('Unsupported proof-of-delivery file type');
      }

      shipment.proofOfDelivery = {
        fileUrl: req.file ? `/uploads/logistics-pod/${req.file.filename}` : req.body.fileUrl,
        mimeType: req.file ? req.file.mimetype : req.body.mimeType,
        sizeBytes: req.file ? req.file.size : Number(req.body.sizeBytes || 0),
        originalFileName: req.file ? req.file.originalname : req.body.originalFileName,
        notes: req.body.notes,
        receivedBy: req.body.receivedBy,
        receivedAt: req.body.receivedAt ? new Date(req.body.receivedAt) : undefined,
        uploadedBy: toObjectIdValue(getActorId(req)),
        uploadedAt: new Date(),
      };

      if (shipment.status !== 'delivered') {
        assertShipmentTransition(shipment.status, 'delivered');
        shipment.status = 'delivered';
      }
      shipment.actualDeliveredAt = new Date();
      shipment.trackingEvents.push({
        status: 'delivered',
        note: 'Proof of delivery uploaded',
        updatedBy: toObjectIdValue(getActorId(req)),
        timestamp: new Date(),
      });

      await shipment.save();

      await logAudit(req, {
        action: 'logistics.proof_of_delivery_uploaded',
        resource: 'shipment',
        resourceId: shipment._id.toString(),
        risk: 'high',
      });

      ResponseHandler.success(res, mapShipmentForUi(shipment), 'Proof of delivery uploaded');
    } catch (error) {
      next(error);
    }
  };
}

export default new LogisticsController();
