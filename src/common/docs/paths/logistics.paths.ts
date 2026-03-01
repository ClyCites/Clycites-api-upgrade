export const logisticsPaths: Record<string, unknown> = {
  '/api/v1/logistics/collection-points': {
    get: {
      tags: ['Logistics'],
      summary: 'List collection points and warehouses',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'organizationId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'type', in: 'query', schema: { type: 'string', enum: ['collection_point', 'warehouse'] } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'maintenance', 'inactive'] } },
        { name: 'district', in: 'query', schema: { type: 'string' } },
        { name: 'includeInactive', in: 'query', schema: { type: 'boolean' } },
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
      ],
      responses: {
        200: { description: 'Collection points retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    post: {
      tags: ['Logistics'],
      summary: 'Create collection point or warehouse',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
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
            },
          },
        },
      },
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
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      responses: {
        200: { description: 'Collection point retrieved.' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Logistics'],
      summary: 'Update collection point',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string', enum: ['collection_point', 'warehouse'] },
                status: { type: 'string', enum: ['active', 'maintenance', 'inactive'] },
                isActive: { type: 'boolean' },
                address: {
                  type: 'object',
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
                coordinates: {
                  type: 'object',
                  properties: {
                    lat: { type: 'number' },
                    lng: { type: 'number' },
                  },
                },
                contactName: { type: 'string' },
                contactPhone: { type: 'string' },
                capacityTons: { type: 'number', minimum: 0 },
                features: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Collection point updated.' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
    delete: {
      tags: ['Logistics'],
      summary: 'Deactivate collection point',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      responses: {
        200: { description: 'Collection point deactivated.' },
      },
    },
  },

  '/api/v1/logistics/shipments': {
    get: {
      tags: ['Logistics'],
      summary: 'List shipments',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Shipments retrieved.' },
      },
    },
    post: {
      tags: ['Logistics'],
      summary: 'Create shipment',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['from', 'to'],
              properties: {
                organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
                orderId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
                from: { type: 'object', additionalProperties: true },
                to: { type: 'object', additionalProperties: true },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Shipment created.' },
      },
    },
  },

  '/api/v1/logistics/shipments/{id}': {
    get: {
      tags: ['Logistics'],
      summary: 'Get shipment details',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      responses: {
        200: { description: 'Shipment retrieved.' },
      },
    },
  },

  '/api/v1/logistics/shipments/{id}/status': {
    patch: {
      tags: ['Logistics'],
      summary: 'Update shipment status',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                status: {
                  type: 'string',
                  enum: ['created', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'returned'],
                },
                note: { type: 'string' },
                location: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Shipment status updated.' },
      },
    },
  },

  '/api/v1/logistics/shipments/{id}/tracking': {
    post: {
      tags: ['Logistics'],
      summary: 'Add shipment tracking event',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      responses: {
        200: { description: 'Tracking event added.' },
      },
    },
  },

  '/api/v1/logistics/shipments/{id}/proof-of-delivery': {
    post: {
      tags: ['Logistics'],
      summary: 'Upload proof of delivery',
      description: 'Accepts multipart/form-data with file field `proof` (max 5MB; jpeg/png/webp/pdf) or metadata URL payload.',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      responses: {
        200: { description: 'Proof of delivery uploaded.' },
        400: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
};
