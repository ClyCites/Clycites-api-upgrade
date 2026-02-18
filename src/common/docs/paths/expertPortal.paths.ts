
const auth = [{ BearerAuth: [] }];
const r = (s: object) => ({ required: true, content: { 'application/json': { schema: s } } });
const idParam = { $ref: '#/components/parameters/mongoIdPath' };
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };

export const expertPortalPaths: Record<string, unknown> = {

  // ─── Expert Profiles ────────────────────────────────────────────────────────

  '/api/v1/expert-portal/experts': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Register as an expert',
      operationId: 'registerExpert',
      security: auth,
      requestBody: r({
        type: 'object',
        required: ['specializations', 'bio'],
        properties: {
          specializations: { type: 'array', items: { type: 'string' }, example: ['crop_diseases', 'soil_health'] },
          bio: { type: 'string' },
          qualifications: { type: 'array', items: { type: 'object', properties: { degree: { type: 'string' }, institution: { type: 'string' }, year: { type: 'integer' } } } },
          yearsOfExperience: { type: 'integer', minimum: 0 },
          languages: { type: 'array', items: { type: 'string' } },
          country: { type: 'string' },
          hourlyRate: { type: 'number', description: 'USD hourly consultation rate (optional).' },
        },
      }),
      responses: {
        201: { description: 'Expert profile created.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/ExpertProfile' } } }] } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    get: {
      tags: ['Expert Portal'],
      summary: 'Browse verified experts',
      operationId: 'listExperts',
      parameters: [
        pageParam, limitParam,
        { name: 'specialization', in: 'query', schema: { type: 'string' } },
        { name: 'country', in: 'query', schema: { type: 'string' } },
        { name: 'language', in: 'query', schema: { type: 'string' } },
        { name: 'minRating', in: 'query', schema: { type: 'number', minimum: 1, maximum: 5 } },
        { name: 'available', in: 'query', schema: { type: 'boolean' } },
      ],
      responses: { 200: { description: 'Expert list.' } },
    },
  },

  '/api/v1/expert-portal/experts/me': {
    get: {
      tags: ['Expert Portal'],
      summary: 'Get my expert profile',
      operationId: 'getMyExpertProfile',
      security: auth,
      responses: { 200: { description: 'My profile.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/ExpertProfile' } } }] } } } }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  '/api/v1/expert-portal/experts/{id}': {
    get: {
      tags: ['Expert Portal'],
      summary: 'Get expert by ID',
      operationId: 'getExpert',
      parameters: [idParam],
      responses: { 200: { description: 'Expert profile.' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Expert Portal'],
      summary: 'Update expert profile',
      operationId: 'updateExpertProfile',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { bio: { type: 'string' }, specializations: { type: 'array', items: { type: 'string' } }, hourlyRate: { type: 'number' }, available: { type: 'boolean' } } }),
      responses: { 200: { description: 'Updated.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/experts/{id}/verify': {
    post: {
      tags: ['Expert Portal', 'Admin'],
      summary: 'Verify expert profile',
      description: '`platform_admin` only.',
      operationId: 'verifyExpert',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['verified', 'rejected', 'suspended'] }, reason: { type: 'string' } } }),
      responses: { 200: { description: 'Status updated.' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/experts/{id}/dashboard': {
    get: {
      tags: ['Expert Portal'],
      summary: 'Expert performance dashboard',
      operationId: 'expertDashboard',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Dashboard analytics.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  // ─── Cases ───────────────────────────────────────────────────────────────────

  '/api/v1/expert-portal/cases': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Open expert consultation case',
      operationId: 'createCase',
      security: auth,
      requestBody: r({ type: 'object', required: ['expertId', 'title', 'description', 'category'], properties: { expertId: { type: 'string', pattern: '^[a-f0-9]{24}$' }, title: { type: 'string' }, description: { type: 'string' }, category: { type: 'string', enum: ['pest_disease', 'soil', 'irrigation', 'market', 'finance', 'general'] }, linkedReportId: { type: 'string', description: 'PestDiseaseReport ID to link (optional).' }, urgency: { type: 'string', enum: ['low', 'normal', 'high', 'critical'] } } }),
      responses: { 201: { description: 'Case opened.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
    get: {
      tags: ['Expert Portal', 'Admin'],
      summary: 'List all cases',
      description: '`platform_admin` only.',
      operationId: 'listAllCases',
      security: auth,
      parameters: [pageParam, limitParam, { name: 'status', in: 'query', schema: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed'] } }],
      responses: { 200: { description: 'Cases.' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/cases/my': {
    get: {
      tags: ['Expert Portal'],
      summary: 'List my cases (farmer or expert)',
      operationId: 'myCases',
      security: auth,
      parameters: [pageParam, limitParam, { name: 'role', in: 'query', schema: { type: 'string', enum: ['farmer', 'expert'] }, description: 'View my cases as farmer or expert.' }],
      responses: { 200: { description: 'My cases.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/expert-portal/cases/{id}': {
    get: {
      tags: ['Expert Portal'],
      summary: 'Get case by ID',
      operationId: 'getCase',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Case detail.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  '/api/v1/expert-portal/cases/{id}/start': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Expert accepts case',
      operationId: 'startCase',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Case started.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/cases/{id}/close': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Close / resolve case',
      operationId: 'closeCase',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['resolution'], properties: { resolution: { type: 'string' }, rating: { type: 'integer', minimum: 1, maximum: 5 } } }),
      responses: { 200: { description: 'Case closed.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/cases/{id}/notes': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Add progress note to case',
      operationId: 'addCaseNote',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['content'], properties: { content: { type: 'string' }, visibility: { type: 'string', enum: ['private', 'shared'], default: 'shared' } } }),
      responses: { 201: { description: 'Note added.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/expert-portal/cases/{id}/recommend': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Submit treatment recommendation',
      operationId: 'recommendTreatment',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['recommendations'], properties: { diagnosis: { type: 'string' }, recommendations: { type: 'array', items: { type: 'string' } }, preventions: { type: 'array', items: { type: 'string' } }, expectedOutcome: { type: 'string' } } }),
      responses: { 200: { description: 'Recommendation saved.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  // ─── Knowledge Base ───────────────────────────────────────────────────────────

  '/api/v1/expert-portal/knowledge': {
    get: {
      tags: ['Expert Portal'],
      summary: 'Browse knowledge articles',
      operationId: 'listKnowledgeArticles',
      parameters: [
        pageParam, limitParam,
        { name: 'category', in: 'query', schema: { type: 'string', enum: ['pest_control', 'disease_management', 'soil_management', 'irrigation', 'market_tips', 'general'] } },
        { name: 'cropType', in: 'query', schema: { type: 'string' } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'published'] }, description: 'Experts/admins only see drafts.' },
      ],
      responses: { 200: { description: 'Articles.' } },
    },
    post: {
      tags: ['Expert Portal'],
      summary: 'Publish knowledge article',
      operationId: 'createKnowledgeArticle',
      security: auth,
      requestBody: r({ type: 'object', required: ['title', 'content', 'category'], properties: { title: { type: 'string' }, content: { type: 'string', description: 'Markdown body.' }, summary: { type: 'string' }, category: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, cropTypes: { type: 'array', items: { type: 'string' } }, status: { type: 'string', enum: ['draft', 'published'], default: 'draft' } } }),
      responses: { 201: { description: 'Article created.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/KnowledgeArticle' } } }] } } } }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/expert-portal/knowledge/{id}': {
    get: {
      tags: ['Expert Portal'],
      summary: 'Get knowledge article',
      operationId: 'getKnowledgeArticle',
      parameters: [idParam],
      responses: { 200: { description: 'Article.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/KnowledgeArticle' } } }] } } } }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Expert Portal'],
      summary: 'Update knowledge article',
      operationId: 'updateKnowledgeArticle',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' }, status: { type: 'string', enum: ['draft', 'published'] } } }),
      responses: { 200: { description: 'Updated.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  // ─── Advisories ───────────────────────────────────────────────────────────────

  '/api/v1/expert-portal/advisories': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Push expert advisory',
      description: 'Broadcast advisory to a targeted farmer audience.',
      operationId: 'createAdvisory',
      security: auth,
      requestBody: r({ type: 'object', required: ['title', 'content', 'category'], properties: { title: { type: 'string' }, content: { type: 'string' }, category: { type: 'string', enum: ['weather', 'pest_outbreak', 'market', 'best_practice', 'regulatory'] }, targetRegions: { type: 'array', items: { type: 'string' } }, targetCrops: { type: 'array', items: { type: 'string' } }, urgency: { type: 'string', enum: ['info', 'warning', 'critical'] }, expiresAt: { type: 'string', format: 'date-time' } } }),
      responses: { 201: { description: 'Advisory created.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/expert-portal/advisories/feed': {
    get: {
      tags: ['Expert Portal'],
      summary: 'Farmer advisory feed',
      description: 'Returns advisories relevant to the authenticated farmer.',
      operationId: 'advisoryFeed',
      security: auth,
      parameters: [pageParam, limitParam, { name: 'urgency', in: 'query', schema: { type: 'string', enum: ['info', 'warning', 'critical'] } }],
      responses: { 200: { description: 'Advisory feed.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/expert-portal/advisories/{id}/publish': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Publish advisory',
      operationId: 'publishAdvisory',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Published.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },
};
