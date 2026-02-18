const auth = [{ BearerAuth: [] }];
const r = (s: object) => ({ required: true, content: { 'application/json': { schema: s } } });
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };
const idParam = { $ref: '#/components/parameters/mongoIdPath' };
const memberIdParam = { name: 'memberId', in: 'path' as const, required: true, schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' } };

export const organizationsPaths: Record<string, unknown> = {

  '/api/v1/organizations': {
    post: {
      tags: ['Organizations'],
      summary: 'Create an organization',
      description: 'Creates a new co-operative, agribusiness, or community group. The creator automatically becomes the organization admin.',
      operationId: 'createOrganization',
      security: auth,
      requestBody: r({
        type: 'object',
        required: ['name', 'type'],
        properties: {
          name: { type: 'string', example: 'Kampala Farmers Co-op' },
          type: { type: 'string', enum: ['cooperative', 'agribusiness', 'ngo', 'government', 'community_group', 'other'] },
          description: { type: 'string' },
          registrationNumber: { type: 'string' },
          country: { type: 'string', example: 'Uganda' },
          region: { type: 'string' },
          contactEmail: { type: 'string', format: 'email' },
          contactPhone: { type: 'string' },
          website: { type: 'string', format: 'uri' },
          logo: { type: 'string', format: 'uri' },
        },
      }),
      responses: {
        201: { description: 'Organization created.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Organization' } } }] } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        429: { description: 'Rate limit: max 3 organizations created per hour.' },
      },
    },
  },

  '/api/v1/organizations/me': {
    get: {
      tags: ['Organizations'],
      summary: 'Get organizations I belong to',
      operationId: 'getMyOrganizations',
      security: auth,
      parameters: [pageParam, limitParam, { name: 'role', in: 'query', schema: { type: 'string', enum: ['admin', 'member', 'all'] } }],
      responses: {
        200: { description: 'My organizations.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Organization' } } } }] } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/organizations/invitations/accept': {
    post: {
      tags: ['Organizations'],
      summary: 'Accept an organization invitation',
      operationId: 'acceptOrgInvitation',
      security: auth,
      requestBody: r({ type: 'object', required: ['token'], properties: { token: { type: 'string', description: 'Invitation token received via email.' } } }),
      responses: {
        200: { description: 'Invitation accepted. You are now a member.' },
        400: { description: 'Invalid or expired token.' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/organizations/{id}': {
    get: {
      tags: ['Organizations'],
      summary: 'Get organization details',
      description: 'Requires membership in the organization.',
      operationId: 'getOrganization',
      security: auth,
      parameters: [idParam],
      responses: {
        200: { description: 'Organization.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Organization' } } }] } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Organizations'],
      summary: 'Update organization',
      description: 'Requires organization admin role.',
      operationId: 'updateOrganization',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, contactEmail: { type: 'string', format: 'email' }, contactPhone: { type: 'string' }, website: { type: 'string', format: 'uri' }, logo: { type: 'string', format: 'uri' } } }),
      responses: {
        200: { description: 'Updated.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Organization' } } }] } } } },
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
      description: 'Requires `members:read` permission.',
      operationId: 'getOrgMembers',
      security: auth,
      parameters: [idParam, pageParam, limitParam, { name: 'role', in: 'query', schema: { type: 'string', enum: ['admin', 'member', 'viewer'] } }],
      responses: {
        200: {
          description: 'Member list.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        userId: { type: 'string' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        role: { type: 'string' },
                        joinedAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
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
      summary: 'Invite a user to the organization',
      description: 'Requires `members:invite` permission. Sends an invitation email.',
      operationId: 'inviteOrgMember',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['email', 'role'], properties: { email: { type: 'string', format: 'email' }, role: { type: 'string', enum: ['admin', 'member', 'viewer'] }, message: { type: 'string', description: 'Custom message to include in the invitation email.' } } }),
      responses: {
        200: { description: 'Invitation sent.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/organizations/{id}/members/{memberId}': {
    delete: {
      tags: ['Organizations'],
      summary: 'Remove a member from the organization',
      description: 'Requires `members:remove` permission.',
      operationId: 'removeOrgMember',
      security: auth,
      parameters: [idParam, memberIdParam],
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
      description: 'Requires `members:update` permission.',
      operationId: 'updateOrgMemberRole',
      security: auth,
      parameters: [idParam, memberIdParam],
      requestBody: r({ type: 'object', required: ['role'], properties: { role: { type: 'string', enum: ['admin', 'member', 'viewer'] } } }),
      responses: {
        200: { description: 'Role updated.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
};
