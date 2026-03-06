
const auth = [{ BearerAuth: [] }];
const r = (s: object) => ({ required: true, content: { 'application/json': { schema: s } } });
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };
const estimationIdParam = { name: 'estimationId', in: 'path' as const, required: true, schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' } };

export const priceMonitorPaths: Record<string, unknown> = {

  '/api/v1/pricing/predict': {
    post: {
      tags: ['Price Monitor'],
      summary: 'ML price prediction',
      description: 'Runs the trained ML model to predict a commodity price.',
      operationId: 'priceMonitorPredict',
      requestBody: r({
        type: 'object',
        required: ['productId', 'marketId'],
        properties: {
          productId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          marketId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          daysAhead: { type: 'integer', minimum: 1, maximum: 90, default: 7, description: 'Forecast horizon in days.' },
          features: { type: 'object', additionalProperties: true, description: 'Optional extra feature overrides for the ML model.' },
        },
      }),
      responses: {
        200: {
          description: 'Prediction result.',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          predictedPrice: { type: 'number', example: 1250.5 },
                          currency: { type: 'string', example: 'UGX' },
                          unit: { type: 'string', example: 'kg' },
                          confidence: { type: 'number', minimum: 0, maximum: 1, example: 0.87 },
                          range: { type: 'object', properties: { low: { type: 'number' }, high: { type: 'number' } } },
                          forecastDate: { type: 'string', format: 'date' },
                          modelVersion: { type: 'string' },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        429: { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },

  '/api/v1/pricing/train': {
    post: {
      tags: ['Price Monitor', 'Admin'],
      summary: 'Retrain price prediction model',
      description: 'Triggers ML model retraining on latest price data. Requires `platform_admin` role.',
      operationId: 'priceMonitorTrain',
      security: auth,
      requestBody: r({
        type: 'object',
        properties: {
          productIds: { type: 'array', items: { type: 'string' }, description: 'Retrain only for specific products (default: all).' },
          marketIds: { type: 'array', items: { type: 'string' } },
          lookbackDays: { type: 'integer', default: 365 },
        },
      }),
      responses: {
        200: { description: 'Training job initiated.', content: { 'application/json': { schema: { type: 'object', properties: { jobId: { type: 'string' }, estimatedDuration: { type: 'string', example: '~5 minutes' } } } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/pricing/estimations': {
    get: {
      tags: ['Price Monitor'],
      summary: 'List price estimations',
      description: 'Returns saved estimation resources with explicit UI status values.',
      security: auth,
      parameters: [
        pageParam,
        limitParam,
        { name: 'organizationId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'productId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'marketId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'submitted', 'approved'] } },
      ],
      responses: {
        200: { description: 'Estimations retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    post: {
      tags: ['Price Monitor'],
      summary: 'Create price estimation',
      security: auth,
      requestBody: r({
        type: 'object',
        required: ['productId', 'estimatedPrice'],
        properties: {
          organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          productId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          marketId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          estimatedPrice: { type: 'number', minimum: 0 },
          currency: { type: 'string', example: 'UGX' },
          basis: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          status: { type: 'string', enum: ['draft', 'submitted', 'approved'] },
          notes: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
        },
      }),
      responses: {
        201: { description: 'Estimation created.' },
        400: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },

  '/api/v1/pricing/estimations/{estimationId}': {
    get: {
      tags: ['Price Monitor'],
      summary: 'Get estimation',
      security: auth,
      parameters: [estimationIdParam],
      responses: {
        200: { description: 'Estimation retrieved.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PriceEstimation' } } } },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Price Monitor'],
      summary: 'Update estimation',
      description: 'Validates estimation status transitions and returns 400 on invalid transitions.',
      security: auth,
      parameters: [estimationIdParam],
      requestBody: r({
        type: 'object',
        properties: {
          estimatedPrice: { type: 'number', minimum: 0 },
          currency: { type: 'string' },
          basis: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          status: { type: 'string', enum: ['draft', 'submitted', 'approved'] },
          notes: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
        },
      }),
      responses: {
        200: { description: 'Estimation updated.' },
        400: { $ref: '#/components/responses/ValidationError' },
      },
    },
    delete: {
      tags: ['Price Monitor'],
      summary: 'Delete estimation',
      security: auth,
      parameters: [estimationIdParam],
      responses: {
        200: { description: 'Estimation deleted.' },
      },
    },
  },
};
