const auth = [{ BearerAuth: [] }];
const r = (schema: object) => ({ required: true, content: { 'application/json': { schema } } });
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };
const idParam = { $ref: '#/components/parameters/mongoIdPath' };
const memberIdParam = {
  name: 'memberId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};

export const organizationsPaths: Record<string, unknown> = {
  '/api/v1/organizations': {
    post: {
      tags: ['Organizations'],
      summary: 'Create organization',
      operationId: 'createOrganization',
      security: auth,
      requestBody: r({
        type: 'object',
        required: ['name', 'type', 'industry', 'email', 'address'],
        properties: {
          name: { type: 'string' },
          slug: { type: 'string' },
          type: { type: 'string', enum: ['enterprise', 'cooperative', 'government', 'individual'] },
          industry: { type: 'string' },
          description: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          address: {
            type: 'object',
            required: ['city', 'state', 'country'],
            properties: {
              city: { type: 'string' },
              state: { type: 'string' },
              country: { type: 'string' },
            },
          },
        },
      }),
      responses: {
        201: {
          description: 'Organization created.',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { type: 'object', properties: { data: { $ref: '#/components/schemas/Organization' } } },
                ],
              },
            },
          },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/organizations/me': {
    get: {
      tags: ['Organizations'],
      summary: 'List current user organizations',
      operationId: 'getMyOrganizations',
      security: auth,
      responses: {
        200: {
          description: 'Organizations for current user.',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            organization: { $ref: '#/components/schemas/Organization' },
                            role: { type: 'object', additionalProperties: true },
                            joinedAt: { type: 'string', format: 'date-time' },
                            department: { type: 'string' },
                            title: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/organizations/invitations/accept': {
    post: {
      tags: ['Organizations'],
      summary: 'Accept organization invitation',
      operationId: 'acceptOrganizationInvitation',
      security: auth,
      requestBody: r({
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string' },
        },
      }),
      responses: {
        200: { description: 'Invitation accepted.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/organizations/{id}': {
    get: {
      tags: ['Organizations'],
      summary: 'Get organization by ID',
      operationId: 'getOrganization',
      security: auth,
      parameters: [idParam],
      responses: {
        200: {
          description: 'Organization details.',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { type: 'object', properties: { data: { $ref: '#/components/schemas/Organization' } } },
                ],
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Organizations'],
      summary: 'Update organization',
      operationId: 'updateOrganization',
      security: auth,
      parameters: [idParam],
      requestBody: r({
        type: 'object',
        properties: {
          name: { type: 'string' },
          industry: { type: 'string' },
          description: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          website: { type: 'string', format: 'uri' },
          status: { type: 'string', enum: ['active', 'pending', 'suspended', 'archived'] },
        },
      }),
      responses: {
        200: { description: 'Organization updated.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/organizations/{id}/disable': {
    post: {
      tags: ['Organizations'],
      summary: 'Disable organization',
      description: 'Sets organization status to suspended and returns `uiStatus=disabled`.',
      operationId: 'disableOrganization',
      security: auth,
      parameters: [idParam],
      requestBody: r({
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string', minLength: 3, maxLength: 1000 },
        },
      }),
      responses: {
        200: { description: 'Organization disabled.' },
        400: { description: 'Invalid status transition.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/organizations/{id}/enable': {
    post: {
      tags: ['Organizations'],
      summary: 'Enable organization',
      description: 'Transitions organization to active and returns `uiStatus=active`.',
      operationId: 'enableOrganization',
      security: auth,
      parameters: [idParam],
      requestBody: r({
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string', minLength: 3, maxLength: 1000 },
        },
      }),
      responses: {
        200: { description: 'Organization enabled.' },
        400: { description: 'Invalid status transition.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/organizations/{id}/members': {
    get: {
      tags: ['Organizations'],
      summary: 'List organization members',
      operationId: 'listOrganizationMembers',
      security: auth,
      parameters: [
        idParam,
        pageParam,
        limitParam,
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'invited', 'suspended', 'removed'] } },
        { name: 'uiStatus', in: 'query', schema: { type: 'string', enum: ['active', 'disabled'] } },
      ],
      responses: {
        200: {
          description: 'Organization members.',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/OrganizationMember' } } } },
                ],
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/organizations/{id}/members/invite': {
    post: {
      tags: ['Organizations'],
      summary: 'Invite member',
      operationId: 'inviteOrganizationMember',
      security: auth,
      parameters: [idParam],
      requestBody: r({
        type: 'object',
        required: ['email', 'roleId'],
        properties: {
          email: { type: 'string', format: 'email' },
          roleId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          department: { type: 'string' },
          title: { type: 'string' },
        },
      }),
      responses: {
        200: { description: 'Member invited.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/organizations/{id}/members/{memberId}': {
    delete: {
      tags: ['Organizations'],
      summary: 'Remove member',
      operationId: 'removeOrganizationMember',
      security: auth,
      parameters: [idParam, memberIdParam],
      requestBody: r({
        type: 'object',
        properties: {
          reason: { type: 'string', maxLength: 1000 },
        },
      }),
      responses: {
        200: { description: 'Member removed.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/organizations/{id}/members/{memberId}/role': {
    patch: {
      tags: ['Organizations'],
      summary: 'Update member role',
      operationId: 'updateOrganizationMemberRole',
      security: auth,
      parameters: [idParam, memberIdParam],
      requestBody: r({
        type: 'object',
        required: ['roleId'],
        properties: {
          roleId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
        },
      }),
      responses: {
        200: { description: 'Member role updated.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/organizations/{id}/members/{memberId}/disable': {
    post: {
      tags: ['Organizations'],
      summary: 'Disable organization member',
      description: 'Transitions member status to suspended and sets `uiStatus=disabled`.',
      operationId: 'disableOrganizationMember',
      security: auth,
      parameters: [idParam, memberIdParam],
      requestBody: r({
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string', minLength: 3, maxLength: 1000 },
        },
      }),
      responses: {
        200: { description: 'Member disabled.' },
        400: { description: 'Invalid member status transition.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/organizations/{id}/members/{memberId}/enable': {
    post: {
      tags: ['Organizations'],
      summary: 'Enable organization member',
      description: 'Transitions member status to active and sets `uiStatus=active`.',
      operationId: 'enableOrganizationMember',
      security: auth,
      parameters: [idParam, memberIdParam],
      requestBody: r({
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string', minLength: 3, maxLength: 1000 },
        },
      }),
      responses: {
        200: { description: 'Member enabled.' },
        400: { description: 'Invalid member status transition.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
};
