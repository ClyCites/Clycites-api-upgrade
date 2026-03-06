const auth = [{ BearerAuth: [] }];
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };

const idParam = {
  name: 'id',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};

const routeIdParam = {
  name: 'routeId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};

const vehicleIdParam = {
  name: 'vehicleId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};

const driverIdParam = {
  name: 'driverId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};

const eventIdParam = {
  name: 'eventId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};

const logIdParam = {
  name: 'logId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};

const jsonBody = (schema: object) => ({
  required: true,
  content: {
    'application/json': { schema },
  },
});

export const logisticsPaths: Record<string, unknown> = {
  '/api/v1/logistics/collection-points': {
    get: {
      tags: ['Logistics'],
      summary: 'List collection points and warehouses',
      security: auth,
      parameters: [
        { name: 'organizationId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'type', in: 'query', schema: { type: 'string', enum: ['collection_point', 'warehouse'] } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'maintenance', 'inactive'] } },
        { name: 'district', in: 'query', schema: { type: 'string' } },
        { name: 'includeInactive', in: 'query', schema: { type: 'boolean' } },
        pageParam,
        limitParam,
      ],
      responses: {
        200: { description: 'Collection points retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    post: {
      tags: ['Logistics'],
      summary: 'Create collection point or warehouse',
      security: auth,
      requestBody: jsonBody({
        type: 'object',
        required: ['name', 'address'],
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['collection_point', 'warehouse'] },
          status: { type: 'string', enum: ['active', 'maintenance', 'inactive'] },
          organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          address: {
            type: 'object',
            required: ['country', 'district'],
            properties: {
              country: { type: 'string' },
              district: { type: 'string' },
              subCounty: { type: 'string' },
              parish: { type: 'string' },
              village: { type: 'string' },
              line1: { type: 'string' },
              line2: { type: 'string' },
            },
          },
        },
      }),
      responses: {
        201: { description: 'Collection point created.' },
        400: { $ref: '#/components/responses/ValidationError' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/logistics/collection-points/{id}': {
    get: {
      tags: ['Logistics'],
      summary: 'Get collection point',
      security: auth,
      parameters: [idParam],
      responses: {
        200: { description: 'Collection point retrieved.' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Logistics'],
      summary: 'Update collection point',
      security: auth,
      parameters: [idParam],
      requestBody: jsonBody({
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['collection_point', 'warehouse'] },
          status: { type: 'string', enum: ['active', 'maintenance', 'inactive'] },
          isActive: { type: 'boolean' },
          address: { type: 'object', additionalProperties: true },
          coordinates: { type: 'object', properties: { lat: { type: 'number' }, lng: { type: 'number' } } },
          contactName: { type: 'string' },
          contactPhone: { type: 'string' },
          capacityTons: { type: 'number', minimum: 0 },
          features: { type: 'array', items: { type: 'string' } },
        },
      }),
      responses: {
        200: { description: 'Collection point updated.' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
    delete: {
      tags: ['Logistics'],
      summary: 'Deactivate collection point',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Collection point deactivated.' } },
    },
  },

  '/api/v1/logistics/shipments': {
    get: {
      tags: ['Logistics'],
      summary: 'List shipments',
      description: 'Supports both native `status` and frontend-aligned `uiStatus` filters.',
      security: auth,
      parameters: [
        { name: 'organizationId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['created', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'returned', 'planned'] } },
        { name: 'uiStatus', in: 'query', schema: { type: 'string', enum: ['planned', 'in_transit', 'delivered', 'cancelled'] } },
        { name: 'shipmentNumber', in: 'query', schema: { type: 'string' } },
        pageParam,
        limitParam,
      ],
      responses: {
        200: { description: 'Shipments retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    post: {
      tags: ['Logistics'],
      summary: 'Create shipment',
      security: auth,
      requestBody: jsonBody({
        type: 'object',
        required: ['from', 'to'],
        properties: {
          organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          orderId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          from: { type: 'object', additionalProperties: true },
          to: { type: 'object', additionalProperties: true },
          expectedDeliveryAt: { type: 'string', format: 'date-time' },
        },
      }),
      responses: {
        201: { description: 'Shipment created.' },
        400: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },

  '/api/v1/logistics/shipments/{id}': {
    get: {
      tags: ['Logistics'],
      summary: 'Get shipment details',
      security: auth,
      parameters: [idParam],
      responses: {
        200: { description: 'Shipment retrieved.' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/logistics/shipments/{id}/status': {
    patch: {
      tags: ['Logistics'],
      summary: 'Update shipment status',
      description: 'Validates status transitions. Supports both native `status` and frontend `uiStatus` values.',
      security: auth,
      parameters: [idParam],
      requestBody: jsonBody({
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['created', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'returned', 'planned'] },
          uiStatus: { type: 'string', enum: ['planned', 'in_transit', 'delivered', 'cancelled'] },
          note: { type: 'string' },
          location: { type: 'string' },
        },
      }),
      responses: {
        200: { description: 'Shipment status updated.' },
        400: { $ref: '#/components/responses/ValidationError' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/logistics/shipments/{id}/tracking': {
    post: {
      tags: ['Logistics'],
      summary: 'Add shipment tracking event',
      description: 'Adds a tracking event to shipment timeline. Supports native status and uiStatus values.',
      security: auth,
      parameters: [idParam],
      requestBody: jsonBody({
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['created', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'returned', 'planned'] },
          uiStatus: { type: 'string', enum: ['planned', 'in_transit', 'delivered', 'cancelled'] },
          note: { type: 'string' },
          location: { type: 'string' },
          recordedAt: { type: 'string', format: 'date-time' },
        },
      }),
      responses: { 200: { description: 'Tracking event added.' } },
    },
  },

  '/api/v1/logistics/shipments/{id}/proof-of-delivery': {
    post: {
      tags: ['Logistics'],
      summary: 'Upload proof of delivery',
      description: 'Accepts multipart/form-data with `proof` file (max 5MB; jpeg/png/webp/pdf) or metadata URL payload.',
      security: auth,
      parameters: [idParam],
      responses: {
        200: { description: 'Proof of delivery uploaded.' },
        400: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },

  '/api/v1/logistics/routes': {
    get: {
      tags: ['Logistics'],
      summary: 'List routes',
      security: auth,
      parameters: [
        { name: 'organizationId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'active', 'archived'] } },
        { name: 'origin', in: 'query', schema: { type: 'string' } },
        { name: 'destination', in: 'query', schema: { type: 'string' } },
        pageParam,
        limitParam,
      ],
      responses: { 200: { description: 'Routes retrieved.' } },
    },
    post: {
      tags: ['Logistics'],
      summary: 'Create route',
      security: auth,
      requestBody: jsonBody({
        type: 'object',
        required: ['origin', 'destination', 'distanceKm'],
        properties: {
          organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          origin: { type: 'string' },
          destination: { type: 'string' },
          distanceKm: { type: 'number', minimum: 0 },
          waypoints: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['draft', 'active', 'archived'] },
          notes: { type: 'string' },
        },
      }),
      responses: { 201: { description: 'Route created.' } },
    },
  },

  '/api/v1/logistics/routes/{routeId}': {
    get: {
      tags: ['Logistics'],
      summary: 'Get route',
      security: auth,
      parameters: [routeIdParam],
      responses: { 200: { description: 'Route retrieved.' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Logistics'],
      summary: 'Update route',
      description: 'Allowed transitions: draft -> active|archived, active -> archived.',
      security: auth,
      parameters: [routeIdParam],
      requestBody: jsonBody({
        type: 'object',
        properties: {
          origin: { type: 'string' },
          destination: { type: 'string' },
          distanceKm: { type: 'number', minimum: 0 },
          waypoints: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['draft', 'active', 'archived'] },
          notes: { type: 'string' },
        },
      }),
      responses: { 200: { description: 'Route updated.' }, 400: { $ref: '#/components/responses/ValidationError' } },
    },
    delete: {
      tags: ['Logistics'],
      summary: 'Delete route',
      security: auth,
      parameters: [routeIdParam],
      responses: { 200: { description: 'Route deleted.' } },
    },
  },

  '/api/v1/logistics/vehicles': {
    get: {
      tags: ['Logistics'],
      summary: 'List vehicles',
      security: auth,
      parameters: [
        { name: 'organizationId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['available', 'assigned', 'maintenance', 'inactive'] } },
        { name: 'available', in: 'query', schema: { type: 'boolean' } },
        { name: 'registration', in: 'query', schema: { type: 'string' } },
        pageParam,
        limitParam,
      ],
      responses: { 200: { description: 'Vehicles retrieved.' } },
    },
    post: {
      tags: ['Logistics'],
      summary: 'Create vehicle',
      security: auth,
      requestBody: jsonBody({
        type: 'object',
        required: ['registration', 'capacityKg'],
        properties: {
          organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          registration: { type: 'string' },
          capacityKg: { type: 'number', minimum: 0 },
          coldChainEnabled: { type: 'boolean' },
          available: { type: 'boolean' },
          status: { type: 'string', enum: ['available', 'assigned', 'maintenance', 'inactive'] },
          notes: { type: 'string' },
        },
      }),
      responses: { 201: { description: 'Vehicle created.' } },
    },
  },

  '/api/v1/logistics/vehicles/{vehicleId}': {
    get: {
      tags: ['Logistics'],
      summary: 'Get vehicle',
      security: auth,
      parameters: [vehicleIdParam],
      responses: { 200: { description: 'Vehicle retrieved.' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Logistics'],
      summary: 'Update vehicle',
      description: 'Validates status transitions.',
      security: auth,
      parameters: [vehicleIdParam],
      requestBody: jsonBody({
        type: 'object',
        properties: {
          registration: { type: 'string' },
          capacityKg: { type: 'number', minimum: 0 },
          coldChainEnabled: { type: 'boolean' },
          available: { type: 'boolean' },
          status: { type: 'string', enum: ['available', 'assigned', 'maintenance', 'inactive'] },
          notes: { type: 'string' },
        },
      }),
      responses: { 200: { description: 'Vehicle updated.' }, 400: { $ref: '#/components/responses/ValidationError' } },
    },
    delete: {
      tags: ['Logistics'],
      summary: 'Delete vehicle',
      security: auth,
      parameters: [vehicleIdParam],
      responses: { 200: { description: 'Vehicle deleted.' } },
    },
  },

  '/api/v1/logistics/drivers': {
    get: {
      tags: ['Logistics'],
      summary: 'List drivers',
      security: auth,
      parameters: [
        { name: 'organizationId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['available', 'assigned', 'inactive'] } },
        { name: 'available', in: 'query', schema: { type: 'boolean' } },
        { name: 'name', in: 'query', schema: { type: 'string' } },
        { name: 'licenseNumber', in: 'query', schema: { type: 'string' } },
        pageParam,
        limitParam,
      ],
      responses: { 200: { description: 'Drivers retrieved.' } },
    },
    post: {
      tags: ['Logistics'],
      summary: 'Create driver',
      security: auth,
      requestBody: jsonBody({
        type: 'object',
        required: ['name', 'phone', 'licenseNumber'],
        properties: {
          organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          name: { type: 'string' },
          phone: { type: 'string' },
          licenseNumber: { type: 'string' },
          available: { type: 'boolean' },
          status: { type: 'string', enum: ['available', 'assigned', 'inactive'] },
          notes: { type: 'string' },
        },
      }),
      responses: { 201: { description: 'Driver created.' } },
    },
  },

  '/api/v1/logistics/drivers/{driverId}': {
    get: {
      tags: ['Logistics'],
      summary: 'Get driver',
      security: auth,
      parameters: [driverIdParam],
      responses: { 200: { description: 'Driver retrieved.' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Logistics'],
      summary: 'Update driver',
      description: 'Validates status transitions.',
      security: auth,
      parameters: [driverIdParam],
      requestBody: jsonBody({
        type: 'object',
        properties: {
          name: { type: 'string' },
          phone: { type: 'string' },
          licenseNumber: { type: 'string' },
          available: { type: 'boolean' },
          status: { type: 'string', enum: ['available', 'assigned', 'inactive'] },
          notes: { type: 'string' },
        },
      }),
      responses: { 200: { description: 'Driver updated.' }, 400: { $ref: '#/components/responses/ValidationError' } },
    },
    delete: {
      tags: ['Logistics'],
      summary: 'Delete driver',
      security: auth,
      parameters: [driverIdParam],
      responses: { 200: { description: 'Driver deleted.' } },
    },
  },

  '/api/v1/logistics/tracking-events': {
    get: {
      tags: ['Logistics'],
      summary: 'List tracking events',
      security: auth,
      parameters: [
        { name: 'organizationId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'shipmentId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['created', 'verified', 'closed'] } },
        { name: 'eventType', in: 'query', schema: { type: 'string' } },
        pageParam,
        limitParam,
      ],
      responses: { 200: { description: 'Tracking events retrieved.' } },
    },
    post: {
      tags: ['Logistics'],
      summary: 'Create tracking event resource',
      security: auth,
      requestBody: jsonBody({
        type: 'object',
        required: ['shipmentId', 'eventType'],
        properties: {
          shipmentId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          location: { type: 'string' },
          note: { type: 'string' },
          eventType: { type: 'string' },
          recordedAt: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['created', 'verified', 'closed'] },
          metadata: { type: 'object', additionalProperties: true },
        },
      }),
      responses: { 201: { description: 'Tracking event created.' } },
    },
  },

  '/api/v1/logistics/tracking-events/{eventId}': {
    get: {
      tags: ['Logistics'],
      summary: 'Get tracking event',
      security: auth,
      parameters: [eventIdParam],
      responses: { 200: { description: 'Tracking event retrieved.' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Logistics'],
      summary: 'Update tracking event',
      description: 'Allowed transitions: created -> verified|closed, verified -> closed.',
      security: auth,
      parameters: [eventIdParam],
      requestBody: jsonBody({
        type: 'object',
        properties: {
          location: { type: 'string' },
          note: { type: 'string' },
          eventType: { type: 'string' },
          recordedAt: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['created', 'verified', 'closed'] },
          metadata: { type: 'object', additionalProperties: true },
        },
      }),
      responses: { 200: { description: 'Tracking event updated.' }, 400: { $ref: '#/components/responses/ValidationError' } },
    },
    delete: {
      tags: ['Logistics'],
      summary: 'Delete tracking event',
      security: auth,
      parameters: [eventIdParam],
      responses: { 200: { description: 'Tracking event deleted.' } },
    },
  },

  '/api/v1/logistics/cold-chain-logs': {
    get: {
      tags: ['Logistics'],
      summary: 'List cold-chain logs',
      security: auth,
      parameters: [
        { name: 'organizationId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'shipmentId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['normal', 'violation', 'resolved'] } },
        { name: 'violation', in: 'query', schema: { type: 'boolean' } },
        pageParam,
        limitParam,
      ],
      responses: { 200: { description: 'Cold-chain logs retrieved.' } },
    },
    post: {
      tags: ['Logistics'],
      summary: 'Create cold-chain log',
      security: auth,
      requestBody: jsonBody({
        type: 'object',
        required: ['shipmentId', 'temperatureC', 'thresholdC'],
        properties: {
          shipmentId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          temperatureC: { type: 'number' },
          thresholdC: { type: 'number' },
          violation: { type: 'boolean' },
          capturedAt: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['normal', 'violation', 'resolved'] },
          notes: { type: 'string' },
        },
      }),
      responses: { 201: { description: 'Cold-chain log created.' } },
    },
  },

  '/api/v1/logistics/cold-chain-logs/{logId}': {
    get: {
      tags: ['Logistics'],
      summary: 'Get cold-chain log',
      security: auth,
      parameters: [logIdParam],
      responses: { 200: { description: 'Cold-chain log retrieved.' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Logistics'],
      summary: 'Update cold-chain log',
      description: 'Allowed transitions: normal -> violation, violation -> resolved, resolved -> violation.',
      security: auth,
      parameters: [logIdParam],
      requestBody: jsonBody({
        type: 'object',
        properties: {
          temperatureC: { type: 'number' },
          thresholdC: { type: 'number' },
          violation: { type: 'boolean' },
          capturedAt: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['normal', 'violation', 'resolved'] },
          notes: { type: 'string' },
        },
      }),
      responses: { 200: { description: 'Cold-chain log updated.' }, 400: { $ref: '#/components/responses/ValidationError' } },
    },
    delete: {
      tags: ['Logistics'],
      summary: 'Delete cold-chain log',
      security: auth,
      parameters: [logIdParam],
      responses: { 200: { description: 'Cold-chain log deleted.' } },
    },
  },

  '/api/v1/logistics/cold-chain-logs/flag-violations': {
    post: {
      tags: ['Logistics'],
      summary: 'Flag cold-chain violations',
      description: 'Scans logs and updates status to `violation` where `temperatureC > thresholdC`.',
      security: auth,
      requestBody: jsonBody({
        type: 'object',
        properties: {
          organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          shipmentId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
        },
      }),
      responses: { 200: { description: 'Violations flagged.' } },
    },
  },
};
