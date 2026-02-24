
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
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };
const farmerIdParam = { name: 'farmerId', in: 'path' as const, required: true, schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' } };
const farmIdParam = { name: 'farmId', in: 'path' as const, required: true, schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' } };
const profileIdParam = { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' } };

export const farmersPaths: Record<string, unknown> = {

  // == Enterprise Farmer Profiles ============================================

  '/api/v1/farmers/profiles': {
    post: {
      tags: ['Farmers'],
      summary: 'Create farmer profile',
      description: 'Create a new farmer profile for the authenticated user.',
      operationId: 'createFarmerProfile',
      security: auth,
      requestBody: r({ $ref: '#/components/schemas/FarmerCreateRequest' }),
      responses: {
        201: { description: 'Farmer profile created.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/FarmerProfile' } } }] } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        409: { description: 'Farmer profile already exists.' },
      },
    },
    get: {
      tags: ['Farmers'],
      summary: 'List farmer profiles',
      description: 'Returns paginated farmer profiles. Requires admin or org:manager role.',
      operationId: 'listFarmerProfiles',
      security: auth,
      parameters: [pageParam, limitParam, { name: 'region', in: 'query', schema: { type: 'string' } }, { name: 'verified', in: 'query', schema: { type: 'boolean' } }, { name: 'search', in: 'query', schema: { type: 'string' } }],
      responses: { ...paged('Farmer profiles list.', '#/components/schemas/FarmerProfile') },
    },
  },

  '/api/v1/farmers/profiles/me': {
    get: {
      tags: ['Farmers'],
      summary: 'Get my farmer profile',
      operationId: 'getMyFarmerProfile',
      security: auth,
      responses: { ...ok('My farmer profile.', { $ref: '#/components/schemas/FarmerProfile' }), 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  '/api/v1/farmers/profiles/{id}': {
    get: {
      tags: ['Farmers'],
      summary: 'Get farmer profile by ID',
      operationId: 'getFarmerProfile',
      security: auth,
      parameters: [profileIdParam],
      responses: { ...ok('Farmer profile.', { $ref: '#/components/schemas/FarmerProfile' }), 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Farmers'],
      summary: 'Update farmer profile',
      description: 'Owner or admin can update the profile.',
      operationId: 'updateFarmerProfile',
      security: auth,
      parameters: [profileIdParam],
      requestBody: r({ $ref: '#/components/schemas/FarmerCreateRequest' }),
      responses: { ...ok('Updated farmer profile.', { $ref: '#/components/schemas/FarmerProfile' }), 403: { $ref: '#/components/responses/Forbidden' } },
    },
    delete: {
      tags: ['Farmers', 'Admin'],
      summary: 'Soft-delete farmer profile',
      description: 'Requires platform_admin role.',
      operationId: 'deleteFarmerProfile',
      security: auth,
      parameters: [profileIdParam],
      responses: { 200: { description: 'Profile deleted.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/farmers/profiles/{id}/verify/submit': {
    post: {
      tags: ['Farmers'],
      summary: 'Submit profile for verification',
      description: 'Profile owner submits their profile for admin verification.',
      operationId: 'submitFarmerProfileForVerification',
      security: auth,
      parameters: [profileIdParam],
      requestBody: r({ type: 'object', properties: { notes: { type: 'string' } } }),
      responses: { 200: { description: 'Submitted for verification.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/farmers/profiles/{id}/verify': {
    post: {
      tags: ['Farmers', 'Admin'],
      summary: 'Verify or reject farmer profile',
      description: 'Requires platform_admin or verifier role.',
      operationId: 'verifyFarmerProfile',
      security: auth,
      parameters: [profileIdParam],
      requestBody: r({ type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['verified', 'rejected'] }, reason: { type: 'string' } } }),
      responses: { 200: { description: 'Verification decision applied.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  // == Farm Management ========================================================

  '/api/v1/farmers/{farmerId}/farms': {
    post: {
      tags: ['Farmers'],
      summary: 'Create a farm for a farmer',
      operationId: 'createFarmerFarm',
      security: auth,
      parameters: [farmerIdParam],
      requestBody: r({ type: 'object', required: ['name', 'location', 'sizeInHectares'], properties: { name: { type: 'string' }, location: { type: 'object', properties: { region: { type: 'string' }, district: { type: 'string' }, coordinates: { type: 'object', properties: { lat: { type: 'number' }, lng: { type: 'number' } } } } }, sizeInHectares: { type: 'number', minimum: 0 }, farmType: { type: 'string', enum: ['crop', 'livestock', 'mixed', 'aquaculture', 'agroforestry'] } } }),
      responses: { 201: { description: 'Farm created.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
    get: {
      tags: ['Farmers'],
      summary: 'Get farms for a farmer',
      operationId: 'getFarmerFarms',
      security: auth,
      parameters: [farmerIdParam, pageParam, limitParam],
      responses: { 200: { description: 'Farm list.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/farmers/farms/{farmId}': {
    patch: {
      tags: ['Farmers'],
      summary: 'Update farm details',
      operationId: 'updateFarm',
      security: auth,
      parameters: [farmIdParam],
      requestBody: r({ type: 'object', properties: { name: { type: 'string' }, sizeInHectares: { type: 'number' }, farmType: { type: 'string' } } }),
      responses: { 200: { description: 'Farm updated.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  // == Production Management ==================================================

  '/api/v1/farmers/{farmerId}/production/crops': {
    post: {
      tags: ['Farmers'],
      summary: 'Record crop production',
      operationId: 'recordCropProduction',
      security: auth,
      parameters: [farmerIdParam],
      requestBody: r({ type: 'object', required: ['cropType', 'season', 'quantityHarvested', 'unit'], properties: { cropType: { type: 'string', example: 'Maize' }, season: { type: 'string', example: '2024A' }, quantityHarvested: { type: 'number' }, unit: { type: 'string', example: 'kg' }, farmId: { type: 'string' }, notes: { type: 'string' } } }),
      responses: { 201: { description: 'Crop production recorded.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/farmers/{farmerId}/production/livestock': {
    post: {
      tags: ['Farmers'],
      summary: 'Record livestock production',
      operationId: 'recordLivestockProduction',
      security: auth,
      parameters: [farmerIdParam],
      requestBody: r({ type: 'object', required: ['animalType', 'quantity'], properties: { animalType: { type: 'string', example: 'Cattle' }, quantity: { type: 'integer', minimum: 1 }, purpose: { type: 'string', enum: ['dairy', 'meat', 'eggs', 'draft', 'breeding', 'other'] }, notes: { type: 'string' } } }),
      responses: { 201: { description: 'Livestock production recorded.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/farmers/{farmerId}/production': {
    get: {
      tags: ['Farmers'],
      summary: 'Get production history',
      operationId: 'getFarmerProduction',
      security: auth,
      parameters: [farmerIdParam, pageParam, limitParam, { name: 'type', in: 'query', schema: { type: 'string', enum: ['crop', 'livestock'] } }],
      responses: { 200: { description: 'Production records.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  // == Membership Management ==================================================

  '/api/v1/farmers/{farmerId}/membership/join-organization': {
    post: {
      tags: ['Farmers'],
      summary: 'Join an organization/cooperative',
      operationId: 'joinOrganization',
      security: auth,
      parameters: [farmerIdParam],
      requestBody: r({ type: 'object', required: ['organizationId'], properties: { organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' } } }),
      responses: { 200: { description: 'Joined organization.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/farmers/{farmerId}/membership/leave-organization': {
    post: {
      tags: ['Farmers'],
      summary: 'Leave current organization',
      operationId: 'leaveOrganization',
      security: auth,
      parameters: [farmerIdParam],
      requestBody: r({ type: 'object', properties: { reason: { type: 'string' } } }),
      responses: { 200: { description: 'Left organization.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/farmers/{farmerId}/membership/eligibility': {
    patch: {
      tags: ['Farmers', 'Admin'],
      summary: 'Update service eligibility',
      description: 'Requires platform_admin or org:manager role.',
      operationId: 'updateFarmerEligibility',
      security: auth,
      parameters: [farmerIdParam],
      requestBody: r({ type: 'object', required: ['serviceType', 'eligible'], properties: { serviceType: { type: 'string', example: 'credit' }, eligible: { type: 'boolean' }, reason: { type: 'string' } } }),
      responses: { 200: { description: 'Eligibility updated.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  // == Analytics & Stats ======================================================

  '/api/v1/farmers/stats': {
    get: {
      tags: ['Farmers', 'Admin'],
      summary: 'Farmer module statistics',
      description: 'Aggregate stats for the platform. Requires admin or org:manager role.',
      operationId: 'getFarmerStats',
      security: auth,
      parameters: [{ name: 'region', in: 'query', schema: { type: 'string' } }],
      responses: { 200: { description: 'Farmer statistics.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  // == Legacy Farmer Routes ===================================================

  '/api/v1/farmers/legacy': {
    get: {
      tags: ['Farmers'],
      summary: '[Legacy] List all farmers',
      description: 'Backward-compatible route. Prefer `/api/v1/farmers/profiles`.',
      operationId: 'legacyListFarmers',
      parameters: [pageParam, limitParam, { name: 'region', in: 'query', schema: { type: 'string' } }],
      responses: { 200: { description: 'Farmers list.' } },
    },
    post: {
      tags: ['Farmers'],
      summary: '[Legacy] Create farmer profile',
      description: 'Backward-compatible route. Prefer `/api/v1/farmers/profiles`.',
      operationId: 'legacyCreateFarmer',
      security: auth,
      requestBody: r({ $ref: '#/components/schemas/FarmerCreateRequest' }),
      responses: { 201: { description: 'Farmer profile created.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/farmers/legacy/me': {
    get: {
      tags: ['Farmers'],
      summary: '[Legacy] Get my farmer profile',
      operationId: 'legacyGetMyFarmerProfile',
      security: auth,
      responses: { 200: { description: 'My farmer profile.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/farmers/legacy/{id}': {
    get: {
      tags: ['Farmers'],
      summary: '[Legacy] Get farmer by ID',
      operationId: 'legacyGetFarmerById',
      parameters: [idParam],
      responses: { 200: { description: 'Farmer profile.' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    put: {
      tags: ['Farmers'],
      summary: '[Legacy] Update farmer profile',
      operationId: 'legacyUpdateFarmer',
      security: auth,
      parameters: [idParam],
      requestBody: r({ $ref: '#/components/schemas/FarmerCreateRequest' }),
      responses: { 200: { description: 'Updated.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/farmers/legacy/farms': {
    post: {
      tags: ['Farmers'],
      summary: '[Legacy] Create a farm',
      operationId: 'legacyCreateFarm',
      security: auth,
      requestBody: r({ type: 'object', required: ['name', 'location'], properties: { name: { type: 'string' }, location: { type: 'string' }, sizeInHectares: { type: 'number' } } }),
      responses: { 201: { description: 'Farm created.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/farmers/legacy/farms/{id}': {
    get: {
      tags: ['Farmers'],
      summary: '[Legacy] Get farm by ID',
      operationId: 'legacyGetFarmById',
      parameters: [idParam],
      responses: { 200: { description: 'Farm.' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    put: {
      tags: ['Farmers'],
      summary: '[Legacy] Update farm',
      operationId: 'legacyUpdateFarm',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { name: { type: 'string' }, sizeInHectares: { type: 'number' } } }),
      responses: { 200: { description: 'Farm updated.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
    delete: {
      tags: ['Farmers'],
      summary: '[Legacy] Delete farm',
      operationId: 'legacyDeleteFarm',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Farm deleted.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/farmers/legacy/{farmerId}/farms': {
    get: {
      tags: ['Farmers'],
      summary: '[Legacy] Get all farms for a farmer',
      operationId: 'legacyGetFarmerFarms',
      security: auth,
      parameters: [farmerIdParam],
      responses: { 200: { description: 'Farm list.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },
};
