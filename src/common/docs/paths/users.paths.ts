const auth = [{ BearerAuth: [] }];
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };
const userIdParam = {
  name: 'id',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};

export const usersPaths: Record<string, unknown> = {
  '/api/v1/users/admin': {
    get: {
      tags: ['Admin'],
      summary: 'List users (admin)',
      description: 'Returns paginated users for admin management with optional filters.',
      operationId: 'adminListUsers',
      security: auth,
      parameters: [
        pageParam,
        limitParam,
        { name: 'search', in: 'query', schema: { type: 'string', minLength: 1, maxLength: 120 } },
        {
          name: 'role',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['super_admin', 'platform_admin', 'admin', 'farmer', 'buyer', 'expert', 'trader'],
          },
        },
        { name: 'isActive', in: 'query', schema: { type: 'boolean' } },
        { name: 'isEmailVerified', in: 'query', schema: { type: 'boolean' } },
        { name: 'requiresIdentityVerification', in: 'query', schema: { type: 'boolean' } },
        { name: 'includeDeleted', in: 'query', schema: { type: 'boolean' } },
        {
          name: 'sortBy',
          in: 'query',
          schema: {
            type: 'string',
            enum: [
              'createdAt',
              'updatedAt',
              'lastLogin',
              'email',
              'firstName',
              'lastName',
              'role',
              'isActive',
              'loginCount',
              'profile.completionScore',
            ],
          },
        },
        { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
      ],
      responses: {
        200: { description: 'Users retrieved successfully.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/users/admin/{id}': {
    get: {
      tags: ['Admin'],
      summary: 'Get user by ID (admin)',
      operationId: 'adminGetUserById',
      security: auth,
      parameters: [userIdParam, { name: 'includeDeleted', in: 'query', schema: { type: 'boolean' } }],
      responses: {
        200: { description: 'User retrieved successfully.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Admin'],
      summary: 'Update user (admin)',
      operationId: 'adminUpdateUser',
      security: auth,
      parameters: [userIdParam],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              additionalProperties: true,
              description: 'Admin user update payload. Supports profile and security status fields.',
            },
          },
        },
      },
      responses: {
        200: { description: 'User updated successfully.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    delete: {
      tags: ['Admin'],
      summary: 'Soft delete user (admin)',
      operationId: 'adminSoftDeleteUser',
      security: auth,
      parameters: [userIdParam],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                reason: { type: 'string', maxLength: 300 },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'User deleted successfully.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/users/admin/{id}/status': {
    patch: {
      tags: ['Admin'],
      summary: 'Update user status (admin)',
      operationId: 'adminUpdateUserStatus',
      security: auth,
      parameters: [userIdParam],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                isActive: { type: 'boolean' },
                lockUntilHours: { type: 'integer', minimum: 0, maximum: 720 },
                requiresIdentityVerification: { type: 'boolean' },
                suspiciousActivityDetected: { type: 'boolean' },
                passwordResetRequired: { type: 'boolean' },
                reason: { type: 'string', maxLength: 300 },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'User status updated successfully.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/users/admin/{id}/unlock': {
    post: {
      tags: ['Admin'],
      summary: 'Unlock user account (admin)',
      operationId: 'adminUnlockUser',
      security: auth,
      parameters: [userIdParam],
      responses: {
        200: { description: 'User account unlocked successfully.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/users/admin/{id}/restore': {
    post: {
      tags: ['Admin'],
      summary: 'Restore soft-deleted user (admin)',
      operationId: 'adminRestoreUser',
      security: auth,
      parameters: [userIdParam],
      responses: {
        200: { description: 'User restored successfully.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
};
