
const auth = [{ BearerAuth: [] }];
const r = (s: object) => ({ required: true, content: { 'application/json': { schema: s } } });

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
};
