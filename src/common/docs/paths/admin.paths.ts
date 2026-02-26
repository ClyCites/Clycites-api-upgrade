const auth = [{ BearerAuth: [] }];

export const adminPaths: Record<string, unknown> = {
  '/api/v1/admin/system/maintenance': {
    get: {
      tags: ['Admin'],
      summary: 'Get maintenance mode state',
      description: 'Super Admin only. Returns current maintenance mode configuration.',
      operationId: 'getMaintenanceMode',
      security: auth,
      responses: {
        200: { description: 'Maintenance mode state retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
    patch: {
      tags: ['Admin'],
      summary: 'Update maintenance mode',
      description: 'Super Admin only. Enables/disables maintenance mode with mandatory reason.',
      operationId: 'updateMaintenanceMode',
      security: auth,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['enabled', 'reason'],
              properties: {
                enabled: { type: 'boolean' },
                message: { type: 'string', maxLength: 500 },
                reason: { type: 'string', minLength: 3, maxLength: 1000 },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Maintenance mode updated.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/admin/system/feature-flags': {
    get: {
      tags: ['Admin'],
      summary: 'Get feature flags',
      description: 'Super Admin only. Returns system-wide feature flags.',
      operationId: 'getFeatureFlags',
      security: auth,
      responses: {
        200: { description: 'Feature flags retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
    patch: {
      tags: ['Admin'],
      summary: 'Update feature flags',
      description: 'Super Admin only. Upserts system-wide feature flags with mandatory reason.',
      operationId: 'updateFeatureFlags',
      security: auth,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['flags', 'reason'],
              properties: {
                flags: {
                  type: 'object',
                  additionalProperties: { type: 'boolean' },
                },
                reason: { type: 'string', minLength: 3, maxLength: 1000 },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Feature flags updated.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/ready': {
    get: {
      tags: ['Admin'],
      summary: 'Readiness probe',
      description: 'Returns readiness state for orchestrators and load balancers.',
      operationId: 'readinessProbe',
      responses: {
        200: { description: 'Service is ready.' },
        503: { description: 'Service is not ready.' },
      },
    },
  },

  '/api/v1/version': {
    get: {
      tags: ['Admin'],
      summary: 'Version metadata',
      description: 'Returns API version/build metadata.',
      operationId: 'versionMetadata',
      responses: {
        200: { description: 'Version payload.' },
      },
    },
  },
};

