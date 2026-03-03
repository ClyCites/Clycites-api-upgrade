const auth = [{ BearerAuth: [] }];
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };
const roleIdParam = {
  name: 'roleId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};
const permissionIdParam = {
  name: 'permissionId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};

export const adminPaths: Record<string, unknown> = {
  '/api/v1/admin/organizations': {
    get: {
      tags: ['Admin'],
      summary: 'List organizations (admin workspace)',
      description: 'Super admins can list all organizations. Org-scoped admins receive only their own organization.',
      operationId: 'adminListOrganizations',
      security: auth,
      parameters: [
        pageParam,
        limitParam,
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'pending', 'suspended', 'archived'] } },
        { name: 'uiStatus', in: 'query', schema: { type: 'string', enum: ['active', 'disabled'] } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Organizations retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/admin/roles': {
    get: {
      tags: ['Admin'],
      summary: 'List roles',
      operationId: 'adminListRoles',
      security: auth,
      parameters: [
        pageParam,
        limitParam,
        { name: 'organizationId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'scope', in: 'query', schema: { type: 'string', enum: ['global', 'organization'] } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'deprecated'] } },
        { name: 'uiStatus', in: 'query', schema: { type: 'string', enum: ['active', 'deprecated'] } },
      ],
      responses: {
        200: { description: 'Roles retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
    post: {
      tags: ['Admin'],
      summary: 'Create role',
      operationId: 'adminCreateRole',
      security: auth,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'description'],
              properties: {
                name: { type: 'string' },
                slug: { type: 'string' },
                description: { type: 'string' },
                scope: { type: 'string', enum: ['global', 'organization'] },
                organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
                permissions: { type: 'array', items: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
                level: { type: 'integer', minimum: 0, maximum: 1000 },
                isDefault: { type: 'boolean' },
                maxMembers: { type: 'integer', minimum: 1 },
                status: { type: 'string', enum: ['active', 'deprecated'] },
                uiStatus: { type: 'string', enum: ['active', 'deprecated'] },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Role created.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/admin/roles/{roleId}': {
    get: {
      tags: ['Admin'],
      summary: 'Get role',
      operationId: 'adminGetRole',
      security: auth,
      parameters: [roleIdParam],
      responses: {
        200: { description: 'Role retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Admin'],
      summary: 'Update role',
      description: 'Validates role `status/uiStatus` transitions. Invalid transitions return `400`.',
      operationId: 'adminUpdateRole',
      security: auth,
      parameters: [roleIdParam],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                slug: { type: 'string' },
                description: { type: 'string' },
                permissions: { type: 'array', items: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
                level: { type: 'integer', minimum: 0, maximum: 1000 },
                isDefault: { type: 'boolean' },
                maxMembers: { type: 'integer', minimum: 1 },
                status: { type: 'string', enum: ['active', 'deprecated'] },
                uiStatus: { type: 'string', enum: ['active', 'deprecated'] },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Role updated.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    delete: {
      tags: ['Admin'],
      summary: 'Delete role',
      operationId: 'adminDeleteRole',
      security: auth,
      parameters: [roleIdParam],
      responses: {
        200: { description: 'Role deleted.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/admin/permissions': {
    get: {
      tags: ['Admin'],
      summary: 'List permissions catalog',
      operationId: 'adminListPermissions',
      security: auth,
      parameters: [
        pageParam,
        limitParam,
        { name: 'resource', in: 'query', schema: { type: 'string' } },
        { name: 'action', in: 'query', schema: { type: 'string' } },
        { name: 'scope', in: 'query', schema: { type: 'string', enum: ['global', 'organization', 'own'] } },
        { name: 'category', in: 'query', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'deprecated'] } },
        { name: 'uiStatus', in: 'query', schema: { type: 'string', enum: ['active', 'deprecated'] } },
      ],
      responses: {
        200: { description: 'Permissions retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
    post: {
      tags: ['Admin'],
      summary: 'Create permission',
      description: 'Super Admin only.',
      operationId: 'adminCreatePermission',
      security: auth,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['resource', 'action', 'scope', 'description', 'category'],
              properties: {
                resource: { type: 'string' },
                action: { type: 'string' },
                scope: { type: 'string', enum: ['global', 'organization', 'own'] },
                name: { type: 'string' },
                description: { type: 'string' },
                category: { type: 'string' },
                isSystem: { type: 'boolean' },
                status: { type: 'string', enum: ['active', 'deprecated'] },
                uiStatus: { type: 'string', enum: ['active', 'deprecated'] },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Permission created.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/admin/permissions/{permissionId}': {
    get: {
      tags: ['Admin'],
      summary: 'Get permission',
      operationId: 'adminGetPermission',
      security: auth,
      parameters: [permissionIdParam],
      responses: {
        200: { description: 'Permission retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Admin'],
      summary: 'Update permission',
      description: 'Super Admin only. Validates permission status transitions and returns `400` on invalid transition.',
      operationId: 'adminUpdatePermission',
      security: auth,
      parameters: [permissionIdParam],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                resource: { type: 'string' },
                action: { type: 'string' },
                scope: { type: 'string', enum: ['global', 'organization', 'own'] },
                name: { type: 'string' },
                description: { type: 'string' },
                category: { type: 'string' },
                isSystem: { type: 'boolean' },
                status: { type: 'string', enum: ['active', 'deprecated'] },
                uiStatus: { type: 'string', enum: ['active', 'deprecated'] },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Permission updated.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    delete: {
      tags: ['Admin'],
      summary: 'Delete permission',
      description: 'Super Admin only.',
      operationId: 'adminDeletePermission',
      security: auth,
      parameters: [permissionIdParam],
      responses: {
        200: { description: 'Permission deleted.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

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
      description: 'Super Admin only. Returns system-wide feature flags keyed by workspace/module identifier.',
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

  '/api/v1/admin/system/feature-flags/{workspaceId}': {
    get: {
      tags: ['Admin'],
      summary: 'Get workspace feature flag',
      description: 'Super Admin only. Returns a single workspace/module toggle with deterministic `enabled|disabled` status.',
      operationId: 'getWorkspaceFeatureFlag',
      security: auth,
      parameters: [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Workspace feature flag retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
    patch: {
      tags: ['Admin'],
      summary: 'Update workspace feature flag',
      description: 'Super Admin only. Updates one workspace/module toggle.',
      operationId: 'updateWorkspaceFeatureFlag',
      security: auth,
      parameters: [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['enabled', 'reason'],
              properties: {
                enabled: { type: 'boolean' },
                reason: { type: 'string', minLength: 3, maxLength: 1000 },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Workspace feature flag updated.' },
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
