import type { OpenAPIV3_1 } from 'openapi-types';

const auth = [{ BearerAuth: [] }];
const r = (s: object) => ({ required: true, content: { 'application/json': { schema: s } } });
const idParam = { $ref: '#/components/parameters/mongoIdPath' };
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };

export const pestDiseasePaths: OpenAPIV3_1.PathsObject = {

  '/api/v1/pest-disease': {
    post: {
      tags: ['Pest & Disease'],
      summary: 'Submit pest/disease report',
      description: 'Upload images alongside report data. Uses `multipart/form-data`.',
      operationId: 'createPestDiseaseReport',
      security: auth,
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['cropType', 'symptoms'],
              properties: {
                cropType: { type: 'string', example: 'Maize' },
                symptoms: { type: 'string', description: 'Detailed symptom description.' },
                affectedArea: { type: 'number', description: 'Estimated affected area in hectares.' },
                severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                location: { type: 'string', description: 'JSON string: {"lat": 0.32, "lng": 32.58, "region": "Central"}' },
                farmerId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
                images: { type: 'array', items: { type: 'string', format: 'binary' }, maxItems: 5 },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Report submitted.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/PestDiseaseReport' } } }] } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    get: {
      tags: ['Pest & Disease'],
      summary: 'List pest/disease reports',
      operationId: 'listPestDiseaseReports',
      security: auth,
      parameters: [
        pageParam, limitParam,
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'analyzing', 'analyzed', 'verified', 'resolved'] } },
        { name: 'severity', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] } },
        { name: 'cropType', in: 'query', schema: { type: 'string' } },
        { name: 'region', in: 'query', schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Report list.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/pest-disease/my': {
    get: {
      tags: ['Pest & Disease'],
      summary: 'Get my submitted reports',
      operationId: 'myPestDiseaseReports',
      security: auth,
      parameters: [pageParam, limitParam],
      responses: { 200: { description: 'My reports.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/pest-disease/outbreaks': {
    get: {
      tags: ['Pest & Disease'],
      summary: 'Active regional outbreak alerts',
      operationId: 'pestDiseaseOutbreaks',
      parameters: [
        { name: 'region', in: 'query', schema: { type: 'string' } },
        { name: 'severity', in: 'query', schema: { type: 'string', enum: ['medium', 'high', 'critical'] } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: { 200: { description: 'Active outbreaks.' } },
    },
  },

  '/api/v1/pest-disease/trends': {
    get: {
      tags: ['Pest & Disease'],
      summary: 'Pest & disease trend data',
      operationId: 'pestDiseaseTrends',
      parameters: [
        { name: 'region', in: 'query', schema: { type: 'string' } },
        { name: 'cropType', in: 'query', schema: { type: 'string' } },
        { $ref: '#/components/parameters/daysParam' },
      ],
      responses: { 200: { description: 'Trend data.' } },
    },
  },

  '/api/v1/pest-disease/heatmap': {
    get: {
      tags: ['Pest & Disease'],
      summary: 'Geographic heatmap data',
      description: 'Returns geo-coordinates and severity levels for map rendering.',
      operationId: 'pestDiseaseHeatmap',
      parameters: [
        { name: 'pestType', in: 'query', schema: { type: 'string' } },
        { name: 'country', in: 'query', schema: { type: 'string' } },
        { $ref: '#/components/parameters/daysParam' },
      ],
      responses: { 200: { description: 'Heatmap data.' } },
    },
  },

  '/api/v1/pest-disease/stats': {
    get: {
      tags: ['Pest & Disease'],
      summary: 'Aggregate statistics',
      operationId: 'pestDiseaseStats',
      security: auth,
      parameters: [{ $ref: '#/components/parameters/daysParam' }],
      responses: { 200: { description: 'Stats.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/pest-disease/{id}': {
    get: {
      tags: ['Pest & Disease'],
      summary: 'Get report by ID',
      operationId: 'getPestDiseaseReport',
      security: auth,
      parameters: [idParam],
      responses: {
        200: { description: 'Report.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/PestDiseaseReport' } } }] } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/pest-disease/{id}/analyze': {
    post: {
      tags: ['Pest & Disease'],
      summary: 'Trigger AI image analysis',
      description: 'Submits report images to the ML pipeline for pest/disease identification.',
      operationId: 'analyzePestDiseaseReport',
      security: auth,
      parameters: [idParam],
      responses: {
        200: { description: 'Analysis result.', content: { 'application/json': { schema: { type: 'object', properties: { identification: { type: 'string' }, confidence: { type: 'number' }, treatmentRecommendations: { type: 'array', items: { type: 'string' } }, preventionMeasures: { type: 'array', items: { type: 'string' } } } } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/pest-disease/{id}/verify': {
    post: {
      tags: ['Pest & Disease'],
      summary: 'Expert/admin verification',
      description: 'Requires `expert` or `platform_admin` role.',
      operationId: 'verifyPestDiseaseReport',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['status', 'notes'], properties: { status: { type: 'string', enum: ['verified', 'rejected', 'needs_more_info'] }, notes: { type: 'string' }, confirmedIdentification: { type: 'string' }, treatmentRecommendations: { type: 'array', items: { type: 'string' } } } }),
      responses: { 200: { description: 'Report verified.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/pest-disease/{id}/advisory': {
    post: {
      tags: ['Pest & Disease'],
      summary: 'Request expert advisory',
      operationId: 'requestPestDiseaseAdvisory',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { message: { type: 'string' }, urgency: { type: 'string', enum: ['normal', 'urgent', 'critical'] } } }),
      responses: { 200: { description: 'Advisory requested.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },
};
