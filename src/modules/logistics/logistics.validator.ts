import { body, param, query } from 'express-validator';

const shipmentStatuses = ['created', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'returned'];
const shipmentUiStatuses = ['planned', 'in_transit', 'delivered', 'cancelled'];
const shipmentStatusInputs = [...shipmentStatuses, ...shipmentUiStatuses];

const routeStatuses = ['draft', 'active', 'archived'];
const vehicleStatuses = ['available', 'assigned', 'maintenance', 'inactive'];
const driverStatuses = ['available', 'assigned', 'inactive'];
const trackingEventStatuses = ['created', 'verified', 'closed'];
const coldChainStatuses = ['normal', 'violation', 'resolved'];

export const collectionPointIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('id must be a valid collection point ID'),
];

export const shipmentIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('id must be a valid shipment ID'),
];

export const routeIdValidator = [
  param('routeId')
    .isMongoId()
    .withMessage('routeId must be a valid route ID'),
];

export const vehicleIdValidator = [
  param('vehicleId')
    .isMongoId()
    .withMessage('vehicleId must be a valid vehicle ID'),
];

export const driverIdValidator = [
  param('driverId')
    .isMongoId()
    .withMessage('driverId must be a valid driver ID'),
];

export const trackingEventIdValidator = [
  param('eventId')
    .isMongoId()
    .withMessage('eventId must be a valid tracking event ID'),
];

export const coldChainLogIdValidator = [
  param('logId')
    .isMongoId()
    .withMessage('logId must be a valid cold chain log ID'),
];

export const createCollectionPointValidator = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 160 })
    .withMessage('name must be between 2 and 160 characters'),
  body('type')
    .optional()
    .isIn(['collection_point', 'warehouse'])
    .withMessage('type must be collection_point or warehouse'),
  body('status')
    .optional()
    .isIn(['active', 'maintenance', 'inactive'])
    .withMessage('status must be active, maintenance, or inactive'),
  body('organizationId')
    .optional()
    .isMongoId()
    .withMessage('organizationId must be a valid organization ID'),
  body('address')
    .isObject()
    .withMessage('address must be an object'),
  body('address.country')
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('address.country is required'),
  body('address.district')
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('address.district is required'),
  body('address.subCounty').optional().trim().isLength({ max: 80 }),
  body('address.parish').optional().trim().isLength({ max: 80 }),
  body('address.village').optional().trim().isLength({ max: 80 }),
  body('address.line1').optional().trim().isLength({ max: 160 }),
  body('address.line2').optional().trim().isLength({ max: 160 }),
  body('coordinates')
    .optional()
    .isObject()
    .withMessage('coordinates must be an object'),
  body('coordinates.lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('coordinates.lat must be between -90 and 90')
    .toFloat(),
  body('coordinates.lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('coordinates.lng must be between -180 and 180')
    .toFloat(),
  body('contactName').optional().trim().isLength({ max: 120 }),
  body('contactPhone').optional().trim().isLength({ max: 40 }),
  body('capacityTons').optional().isFloat({ min: 0 }).toFloat(),
  body('features')
    .optional()
    .isArray({ max: 30 })
    .withMessage('features must be an array with at most 30 entries'),
  body('features.*').optional().isString().trim().isLength({ min: 2, max: 80 }),
];

export const updateCollectionPointValidator = [
  ...collectionPointIdValidator,
  body('name').optional().trim().isLength({ min: 2, max: 160 }),
  body('type').optional().isIn(['collection_point', 'warehouse']),
  body('status').optional().isIn(['active', 'maintenance', 'inactive']),
  body('address').optional().isObject(),
  body('address.country').optional().trim().isLength({ min: 2, max: 80 }),
  body('address.district').optional().trim().isLength({ min: 2, max: 80 }),
  body('address.subCounty').optional().trim().isLength({ max: 80 }),
  body('address.parish').optional().trim().isLength({ max: 80 }),
  body('address.village').optional().trim().isLength({ max: 80 }),
  body('address.line1').optional().trim().isLength({ max: 160 }),
  body('address.line2').optional().trim().isLength({ max: 160 }),
  body('coordinates').optional().isObject(),
  body('coordinates.lat').optional().isFloat({ min: -90, max: 90 }).toFloat(),
  body('coordinates.lng').optional().isFloat({ min: -180, max: 180 }).toFloat(),
  body('contactName').optional().trim().isLength({ max: 120 }),
  body('contactPhone').optional().trim().isLength({ max: 40 }),
  body('capacityTons').optional().isFloat({ min: 0 }).toFloat(),
  body('features').optional().isArray({ max: 30 }),
  body('features.*').optional().isString().trim().isLength({ min: 2, max: 80 }),
  body('isActive').optional().isBoolean().toBoolean(),
];

export const listCollectionPointsValidator = [
  query('organizationId').optional().isMongoId(),
  query('type').optional().isIn(['collection_point', 'warehouse']),
  query('status').optional().isIn(['active', 'maintenance', 'inactive']),
  query('district').optional().trim().isLength({ min: 2, max: 80 }),
  query('page').optional().isInt({ min: 1, max: 10000 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy').optional().isIn(['createdAt', 'name', 'capacityTons']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

export const createShipmentValidator = [
  body('organizationId')
    .optional()
    .isMongoId()
    .withMessage('organizationId must be a valid organization ID'),
  body('orderId')
    .optional()
    .isMongoId()
    .withMessage('orderId must be a valid order ID'),
  body('from').isObject().withMessage('from is required'),
  body('from.type')
    .isIn(['collection_point', 'warehouse', 'farm', 'address', 'other'])
    .withMessage('from.type is invalid'),
  body('from.refId').optional().isMongoId().withMessage('from.refId must be a valid ID'),
  body('from.label')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('from.label must be between 2 and 200 characters'),
  body('to').isObject().withMessage('to is required'),
  body('to.type')
    .isIn(['collection_point', 'warehouse', 'farm', 'address', 'other'])
    .withMessage('to.type is invalid'),
  body('to.refId').optional().isMongoId().withMessage('to.refId must be a valid ID'),
  body('to.label')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('to.label must be between 2 and 200 characters'),
  body('carrierName').optional().trim().isLength({ max: 120 }),
  body('vehicleNumber').optional().trim().isLength({ max: 40 }),
  body('driverName').optional().trim().isLength({ max: 120 }),
  body('driverPhone').optional().trim().isLength({ max: 40 }),
  body('deliveryWindowStart').optional().isISO8601(),
  body('deliveryWindowEnd').optional().isISO8601(),
  body('expectedDeliveryAt').optional().isISO8601(),
  body('metadata').optional().isObject(),
];

export const listShipmentsValidator = [
  query('status').optional().isIn(shipmentStatusInputs),
  query('uiStatus').optional().isIn(shipmentUiStatuses),
  query('organizationId').optional().isMongoId(),
  query('shipmentNumber').optional().trim().isLength({ min: 3, max: 64 }),
  query('page').optional().isInt({ min: 1, max: 10000 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy').optional().isIn(['createdAt', 'shipmentNumber', 'status', 'expectedDeliveryAt']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

export const updateShipmentStatusValidator = [
  ...shipmentIdValidator,
  body('status').optional().isIn(shipmentStatusInputs),
  body('uiStatus').optional().isIn(shipmentUiStatuses),
  body()
    .custom((value) => {
      if (!value.status && !value.uiStatus) {
        throw new Error('Either status or uiStatus is required');
      }
      return true;
    }),
  body('note').optional().trim().isLength({ max: 500 }),
  body('location').optional().trim().isLength({ max: 200 }),
];

export const addTrackingEventValidator = [
  ...shipmentIdValidator,
  body('status').optional().isIn(shipmentStatusInputs),
  body('uiStatus').optional().isIn(shipmentUiStatuses),
  body()
    .custom((value) => {
      if (!value.status && !value.uiStatus) {
        throw new Error('Either status or uiStatus is required');
      }
      return true;
    }),
  body('note').optional().trim().isLength({ max: 500 }),
  body('location').optional().trim().isLength({ max: 200 }),
];

export const uploadProofOfDeliveryValidator = [
  ...shipmentIdValidator,
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('receivedBy').optional().trim().isLength({ max: 120 }),
  body('receivedAt').optional().isISO8601(),
  body('fileUrl').optional().isURL().withMessage('fileUrl must be a valid URL'),
  body('mimeType').optional().trim().isLength({ max: 120 }),
  body('sizeBytes').optional().isInt({ min: 1, max: 5 * 1024 * 1024 }).toInt(),
  body('originalFileName').optional().trim().isLength({ max: 260 }),
];

export const listRoutesValidator = [
  query('organizationId').optional().isMongoId(),
  query('status').optional().isIn(routeStatuses),
  query('origin').optional().trim().isLength({ min: 2, max: 200 }),
  query('destination').optional().trim().isLength({ min: 2, max: 200 }),
  query('page').optional().isInt({ min: 1, max: 10000 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy').optional().isIn(['createdAt', 'origin', 'destination', 'distanceKm', 'status']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

export const createRouteValidator = [
  body('organizationId').optional().isMongoId(),
  body('origin').trim().isLength({ min: 2, max: 200 }).withMessage('origin is required'),
  body('destination').trim().isLength({ min: 2, max: 200 }).withMessage('destination is required'),
  body('distanceKm').isFloat({ min: 0 }).withMessage('distanceKm must be a non-negative number').toFloat(),
  body('waypoints').optional().isArray({ max: 100 }),
  body('waypoints.*').optional().isString().trim().isLength({ min: 2, max: 200 }),
  body('status').optional().isIn(routeStatuses),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

export const updateRouteValidator = [
  ...routeIdValidator,
  body('origin').optional().trim().isLength({ min: 2, max: 200 }),
  body('destination').optional().trim().isLength({ min: 2, max: 200 }),
  body('distanceKm').optional().isFloat({ min: 0 }).toFloat(),
  body('waypoints').optional().isArray({ max: 100 }),
  body('waypoints.*').optional().isString().trim().isLength({ min: 2, max: 200 }),
  body('status').optional().isIn(routeStatuses),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

export const listVehiclesValidator = [
  query('organizationId').optional().isMongoId(),
  query('status').optional().isIn(vehicleStatuses),
  query('available').optional().isBoolean().toBoolean(),
  query('registration').optional().trim().isLength({ min: 2, max: 40 }),
  query('page').optional().isInt({ min: 1, max: 10000 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy').optional().isIn(['createdAt', 'registration', 'capacityKg', 'status']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

export const createVehicleValidator = [
  body('organizationId').optional().isMongoId(),
  body('registration').trim().isLength({ min: 2, max: 40 }).withMessage('registration is required'),
  body('capacityKg').isFloat({ min: 0 }).withMessage('capacityKg must be a non-negative number').toFloat(),
  body('coldChainEnabled').optional().isBoolean().toBoolean(),
  body('available').optional().isBoolean().toBoolean(),
  body('status').optional().isIn(vehicleStatuses),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

export const updateVehicleValidator = [
  ...vehicleIdValidator,
  body('registration').optional().trim().isLength({ min: 2, max: 40 }),
  body('capacityKg').optional().isFloat({ min: 0 }).toFloat(),
  body('coldChainEnabled').optional().isBoolean().toBoolean(),
  body('available').optional().isBoolean().toBoolean(),
  body('status').optional().isIn(vehicleStatuses),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

export const listDriversValidator = [
  query('organizationId').optional().isMongoId(),
  query('status').optional().isIn(driverStatuses),
  query('available').optional().isBoolean().toBoolean(),
  query('name').optional().trim().isLength({ min: 2, max: 120 }),
  query('licenseNumber').optional().trim().isLength({ min: 2, max: 80 }),
  query('page').optional().isInt({ min: 1, max: 10000 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy').optional().isIn(['createdAt', 'name', 'licenseNumber', 'status']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

export const createDriverValidator = [
  body('organizationId').optional().isMongoId(),
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('name is required'),
  body('phone').trim().isLength({ min: 5, max: 40 }).withMessage('phone is required'),
  body('licenseNumber').trim().isLength({ min: 2, max: 80 }).withMessage('licenseNumber is required'),
  body('available').optional().isBoolean().toBoolean(),
  body('status').optional().isIn(driverStatuses),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

export const updateDriverValidator = [
  ...driverIdValidator,
  body('name').optional().trim().isLength({ min: 2, max: 120 }),
  body('phone').optional().trim().isLength({ min: 5, max: 40 }),
  body('licenseNumber').optional().trim().isLength({ min: 2, max: 80 }),
  body('available').optional().isBoolean().toBoolean(),
  body('status').optional().isIn(driverStatuses),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

export const listTrackingEventsValidator = [
  query('organizationId').optional().isMongoId(),
  query('shipmentId').optional().isMongoId(),
  query('status').optional().isIn(trackingEventStatuses),
  query('eventType').optional().trim().isLength({ min: 2, max: 80 }),
  query('page').optional().isInt({ min: 1, max: 10000 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy').optional().isIn(['createdAt', 'recordedAt', 'status', 'eventType']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

export const createTrackingEventResourceValidator = [
  body('shipmentId').isMongoId().withMessage('shipmentId must be a valid shipment ID'),
  body('location').optional().trim().isLength({ max: 200 }),
  body('note').optional().trim().isLength({ max: 500 }),
  body('eventType').trim().isLength({ min: 2, max: 80 }).withMessage('eventType is required'),
  body('recordedAt').optional().isISO8601(),
  body('status').optional().isIn(trackingEventStatuses),
  body('metadata').optional().isObject(),
];

export const updateTrackingEventResourceValidator = [
  ...trackingEventIdValidator,
  body('location').optional().trim().isLength({ max: 200 }),
  body('note').optional().trim().isLength({ max: 500 }),
  body('eventType').optional().trim().isLength({ min: 2, max: 80 }),
  body('recordedAt').optional().isISO8601(),
  body('status').optional().isIn(trackingEventStatuses),
  body('metadata').optional().isObject(),
];

export const listColdChainLogsValidator = [
  query('organizationId').optional().isMongoId(),
  query('shipmentId').optional().isMongoId(),
  query('status').optional().isIn(coldChainStatuses),
  query('violation').optional().isBoolean().toBoolean(),
  query('page').optional().isInt({ min: 1, max: 10000 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy').optional().isIn(['createdAt', 'capturedAt', 'temperatureC', 'thresholdC', 'status']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

export const createColdChainLogValidator = [
  body('shipmentId').isMongoId().withMessage('shipmentId must be a valid shipment ID'),
  body('temperatureC').isFloat().withMessage('temperatureC must be a number').toFloat(),
  body('thresholdC').isFloat().withMessage('thresholdC must be a number').toFloat(),
  body('violation').optional().isBoolean().toBoolean(),
  body('capturedAt').optional().isISO8601(),
  body('status').optional().isIn(coldChainStatuses),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

export const updateColdChainLogValidator = [
  ...coldChainLogIdValidator,
  body('temperatureC').optional().isFloat().toFloat(),
  body('thresholdC').optional().isFloat().toFloat(),
  body('violation').optional().isBoolean().toBoolean(),
  body('capturedAt').optional().isISO8601(),
  body('status').optional().isIn(coldChainStatuses),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

export const flagColdChainViolationsValidator = [
  body('organizationId').optional().isMongoId(),
  body('shipmentId').optional().isMongoId(),
];
