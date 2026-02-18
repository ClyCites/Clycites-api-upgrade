import type { OpenAPIV3_1 } from 'openapi-types';

const auth = [{ BearerAuth: [] }];
const r = (schema: object) => ({ required: true, content: { 'application/json': { schema } } });
const ok = (desc: string, data?: object) => ({
  200: { description: desc, content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, ...(data ? [{ type: 'object', properties: { data } }] : [])] } } } },
  400: { $ref: '#/components/responses/ValidationError' },
  401: { $ref: '#/components/responses/Unauthorized' },
  500: { $ref: '#/components/responses/InternalError' },
});
const paged = (desc: string, itemRef: string) => ok(desc, { type: 'array', items: { $ref: itemRef } });
const idParam = { $ref: '#/components/parameters/mongoIdPath' };

export const farmersPaths: OpenAPIV3_1.PathsObject = {

  // ── Enterprise Farmers ──────────────────────────────────────────────────────

  '/api/v1/farmers': {
    get: {
      tags: ['Farmers'],
      summary: 'List farmers',
      description: 'Public endpoint. Returns paginated farmer profiles.',
      operationId: 'listFarmers',
      parameters: [{ $ref: '#/components/parameters/pageParam' }, { $ref: '#/components/parameters/limitParam' }, { name: 'region', in: 'query', schema: { type: 'string' } }, { name: 'verified', in: 'query', schema: { type: 'boolean' } }],
      responses: { ...paged('Farmers list.', '#/components/schemas/FarmerProfile') },
    },
    post: {
      tags: ['Farmers'],
      summary: 'Create farmer profile',
      description: 'Create a farmer profile for the authenticated user.',
      operationId: 'createFarmer',
      security: auth,
      requestBody: r({ $ref: '#/components/schemas/FarmerCreateRequest' }),
      responses: { 201: { description: 'Farmer profile created.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' }, 409: { description: 'Farmer profile already exists.' } },
    },
  },

  '/api/v1/farmers/me': {
    get: {
      tags: ['Farmers'],
      summary: 'Get my farmer profile',
      operationId: 'getMyFarmerProfile',
      security: auth,
      responses: { ...ok('My farmer profile.', { $ref: '#/components/schemas/FarmerProfile' }), 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Farmers'],
      summary: 'Update my farmer profile',
      operationId: 'updateMyFarmerProfile',
      security: auth,
      requestBody: r({ $ref: '#/components/schemas/FarmerCreateRequest' }),
      responses: { ...ok('Updated farmer profile.', { $ref: '#/components/schemas/FarmerProfile' }) },
    },
  },

  '/api/v1/farmers/{id}': {
    get: {
      tags: ['Farmers'],
      summary: 'Get farmer by ID',
      operationId: 'getFarmerById',
      parameters: [idParam],
      responses: { ...ok('Farmer profile.', { $ref: '#/components/schemas/FarmerProfile' }), 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  '/api/v1/farmers/{id}/certifications': {
    post: {
      tags: ['Farmers'],
      summary: 'Add certification',
      operationId: 'addFarmerCertification',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['name', 'issuer'], properties: { name: { type: 'string' }, issuer: { type: 'string' }, issuedDate: { type: 'string', format: 'date' }, expiryDate: { type: 'string', format: 'date' } } }),
      responses: { ...ok('Certification added.') },
    },
  },

  '/api/v1/farmers/{id}/verify': {
    post: {
      tags: ['Farmers', 'Admin'],
      summary: 'Verify farmer profile',
      description: 'Admin only. Marks a farmer profile as verified.',
      operationId: 'verifyFarmer',
      security: auth,
      parameters: [idParam],
      responses: { ...ok('Farmer verified.'), 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  // ── Farm Enterprises ───────────────────────────────────────────────────────

  '/api/v1/farmers/{id}/enterprises': {
    get: {
      tags: ['Farmers', 'Farm Enterprises'],
      summary: 'List farm enterprises',
      operationId: 'listFarmEnterprises',
      security: auth,
      parameters: [idParam],
      responses: { ...ok('Enterprise list.') },
    },
    post: {
      tags: ['Farmers', 'Farm Enterprises'],
      summary: 'Create farm enterprise',
      operationId: 'createFarmEnterprise',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['name', 'type'], properties: { name: { type: 'string' }, type: { type: 'string', enum: ['crop', 'livestock', 'aquaculture', 'agroforestry'] }, cropTypes: { type: 'array', items: { type: 'string' } }, acreage: { type: 'number' } } }),
      responses: { 201: { description: 'Enterprise created.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  // ── Organizations (Cooperatives) ───────────────────────────────────────────

  '/api/v1/farmers/organizations': {
    get: {
      tags: ['Organizations'],
      summary: 'List organizations',
      operationId: 'listOrganizations',
      security: auth,
      parameters: [{ $ref: '#/components/parameters/pageParam' }, { $ref: '#/components/parameters/limitParam' }],
      responses: { ...paged('Organizations list.', '#/components/schemas/Organization') },
    },
    post: {
      tags: ['Organizations'],
      summary: 'Create organization',
      operationId: 'createOrganization',
      security: auth,
      requestBody: r({ type: 'object', required: ['name', 'type'], properties: { name: { type: 'string', example: 'Buganda Farmers Coop' }, type: { type: 'string', enum: ['cooperative', 'association', 'company', 'ngo'] }, region: { type: 'string' }, description: { type: 'string' } } }),
      responses: { 201: { description: 'Organization created.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/farmers/organizations/{id}': {
    get: {
      tags: ['Organizations'],
      summary: 'Get organization by ID',
      operationId: 'getOrganization',
      security: auth,
      parameters: [idParam],
      responses: { ...ok('Organization.', { $ref: '#/components/schemas/Organization' }), 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Organizations'],
      summary: 'Update organization',
      operationId: 'updateOrganization',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, status: { type: 'string', enum: ['active', 'inactive'] } } }),
      responses: { ...ok('Updated organization.', { $ref: '#/components/schemas/Organization' }), 403: { $ref: '#/components/responses/Forbidden' } },
    },
    delete: {
      tags: ['Organizations'],
      summary: 'Delete organization',
      operationId: 'deleteOrganization',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Organization deleted.' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  '/api/v1/farmers/organizations/{id}/members': {
    get: {
      tags: ['Organizations'],
      summary: 'List organization members',
      operationId: 'listOrgMembers',
      security: auth,
      parameters: [idParam, { $ref: '#/components/parameters/pageParam' }],
      responses: { ...ok('Members list.') },
    },
    post: {
      tags: ['Organizations'],
      summary: 'Add member to organization',
      operationId: 'addOrgMember',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['farmerId'], properties: { farmerId: { type: 'string', pattern: '^[a-f0-9]{24}$' }, role: { type: 'string', enum: ['member', 'officer', 'treasurer', 'secretary'] } } }),
      responses: { 200: { description: 'Member added.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },
};
