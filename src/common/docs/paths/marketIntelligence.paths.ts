const auth = [{ BearerAuth: [] }];
const r = (s: object) => ({ required: true, content: { 'application/json': { schema: s } } });
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };
const recommendationIdParam = { name: 'recommendationId', in: 'path' as const, required: true, schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' } };
const sourceIdParam = { name: 'sourceId', in: 'path' as const, required: true, schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' } };

export const marketIntelligencePaths: Record<string, unknown> = {

  '/api/v1/market-intelligence/insights': {
    get: {
      tags: ['Market Intelligence'],
      summary: 'Get market insights for a product',
      description: 'Returns demand indicators, price forecasts, and competitor analysis for the specified product and region.',
      operationId: 'getMarketInsights',
      security: auth,
      parameters: [
        { name: 'productId', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'region', in: 'query', schema: { type: 'string' } },
        { name: 'district', in: 'query', schema: { type: 'string' } },
        { name: 'period', in: 'query', schema: { type: 'string', enum: ['daily', 'weekly', 'monthly'], default: 'weekly' } },
      ],
      responses: {
        200: {
          description: 'Market insight data.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  productId: { type: 'string' },
                  region: { type: 'string' },
                  averagePrice: { type: 'number' },
                  priceChange: { type: 'number', description: 'Percentage change over the period.' },
                  demandIndex: { type: 'number', description: '0–100 demand score.' },
                  supplyIndex: { type: 'number', description: '0–100 supply score.' },
                  competitorCount: { type: 'integer' },
                  priceForecast: { type: 'number', description: 'Predicted price next period.' },
                  confidence: { type: 'number' },
                  recommendations: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/market-intelligence/price-recommendation': {
    get: {
      tags: ['Market Intelligence'],
      summary: 'Get optimal listing price recommendation',
      description: 'Returns a recommended sell price and confidence interval based on current market data.',
      operationId: 'getPriceRecommendation',
      security: auth,
      parameters: [
        { name: 'productId', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'region', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'quality', in: 'query', schema: { type: 'string', enum: ['A', 'B', 'C', 'standard'] } },
        { name: 'quantity', in: 'query', schema: { type: 'number' }, description: 'Quantity available (affects bulk pricing).' },
      ],
      responses: {
        200: {
          description: 'Price recommendation.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  recommendedPrice: { type: 'number' },
                  priceRange: { type: 'object', properties: { min: { type: 'number' }, max: { type: 'number' } } },
                  confidence: { type: 'number' },
                  basis: { type: 'string', description: 'Explanation of the recommendation.' },
                  marketAveragePrice: { type: 'number' },
                  competitorCount: { type: 'integer' },
                },
              },
            },
          },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/market-intelligence/trends': {
    get: {
      tags: ['Market Intelligence'],
      summary: 'Get historical market trends',
      operationId: 'getMarketTrends',
      security: auth,
      parameters: [
        { name: 'productId', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'period', in: 'query', schema: { type: 'integer', description: 'Days of historical data.', default: 30 } },
        { name: 'region', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: 'Trend data points.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  dataPoints: { type: 'array', items: { type: 'object', properties: { date: { type: 'string', format: 'date' }, avgPrice: { type: 'number' }, volume: { type: 'number' }, listingCount: { type: 'integer' } } } },
                  trendDirection: { type: 'string', enum: ['rising', 'falling', 'stable'] },
                  trendStrength: { type: 'number', description: 'Magnitude of the trend (0–1).' },
                },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/market-intelligence/compare': {
    get: {
      tags: ['Market Intelligence'],
      summary: 'Compare market conditions across regions',
      operationId: 'getComparativeAnalysis',
      security: auth,
      parameters: [
        { name: 'productId', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'regions', in: 'query', required: true, schema: { type: 'string' }, description: 'Comma-separated list of regions.' },
      ],
      responses: {
        200: {
          description: 'Multi-region comparison.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  regions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        region: { type: 'string' },
                        avgPrice: { type: 'number' },
                        demand: { type: 'string', enum: ['low', 'medium', 'high'] },
                        supply: { type: 'string', enum: ['low', 'medium', 'high'] },
                        listingCount: { type: 'integer' },
                      },
                    },
                  },
                  bestRegionToBuy: { type: 'string' },
                  bestRegionToSell: { type: 'string' },
                },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/market-intelligence/alerts': {
    post: {
      tags: ['Market Intelligence'],
      summary: 'Create a market price alert',
      operationId: 'createMIAlert',
      security: auth,
      requestBody: r({
        type: 'object',
        required: ['product'],
        properties: {
          product: { type: 'string', description: 'Product ID.' },
          region: { type: 'string' },
          district: { type: 'string' },
          condition: {
            type: 'object',
            properties: {
              operator: { type: 'string', enum: ['below', 'above', 'equals', 'changes_by'] },
              threshold: { type: 'number' },
              percentage: { type: 'number' },
            },
          },
          conditions: {
            type: 'object',
            description: 'Legacy compatibility condition object.',
            properties: {
              priceAbove: { type: 'number' },
              priceBelow: { type: 'number' },
              targetPrice: { type: 'number' },
              changePercent: { type: 'number' },
            },
          },
          notificationChannels: { type: 'array', items: { type: 'string', enum: ['push', 'email', 'sms', 'in_app', 'inApp'] } },
          alertType: { type: 'string', enum: ['price_drop', 'price_increase', 'target_price', 'availability'] },
          status: { type: 'string', enum: ['new', 'investigating', 'investigated', 'dismissed'] },
          uiStatus: { type: 'string', enum: ['new', 'investigating', 'investigated', 'dismissed'] },
          active: { type: 'boolean' },
          isActive: { type: 'boolean', description: 'Legacy compatibility alias for active.' },
        },
      }),
      responses: {
        201: {
          description: 'Alert created.',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { type: 'object', properties: { data: { $ref: '#/components/schemas/MarketSignal' } } },
                ],
              },
            },
          },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    get: {
      tags: ['Market Intelligence'],
      summary: 'Get my market alerts',
      operationId: 'getMIAlerts',
      security: auth,
      parameters: [
        pageParam,
        limitParam,
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'inactive', 'new', 'investigating', 'investigated', 'dismissed'] }, description: 'Supports legacy active/inactive or canonical market-signal statuses.' },
        { name: 'active', in: 'query', schema: { type: 'boolean' } },
        { name: 'product', in: 'query', schema: { type: 'string' } },
        { name: 'region', in: 'query', schema: { type: 'string' } },
        { name: 'district', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: 'Alert list.',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/MarketSignal' } } } },
                ],
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/market-intelligence/alerts/{alertId}': {
    patch: {
      tags: ['Market Intelligence'],
      summary: 'Update market alert',
      description: 'Supports canonical market-signal status transitions and returns 400 on invalid transitions.',
      operationId: 'updateMIAlert',
      security: auth,
      parameters: [{ name: 'alertId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      requestBody: r({ type: 'object', properties: { condition: { type: 'object' }, conditions: { type: 'object' }, notificationChannels: { type: 'array', items: { type: 'string' } }, status: { type: 'string', enum: ['new', 'investigating', 'investigated', 'dismissed'] }, uiStatus: { type: 'string', enum: ['new', 'investigating', 'investigated', 'dismissed'] }, active: { type: 'boolean' }, isActive: { type: 'boolean' } } }),
      responses: {
        200: { description: 'Alert updated.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    delete: {
      tags: ['Market Intelligence'],
      summary: 'Delete market alert',
      operationId: 'deleteMIAlert',
      security: auth,
      parameters: [{ name: 'alertId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      responses: {
        200: { description: 'Deleted.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/market-intelligence/recommendations': {
    get: {
      tags: ['Market Intelligence'],
      summary: 'List recommendations',
      security: auth,
      parameters: [
        pageParam,
        limitParam,
        { name: 'organizationId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'productId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'marketId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'region', in: 'query', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'approved', 'published', 'retracted'] } },
      ],
      responses: {
        200: { description: 'Recommendations retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    post: {
      tags: ['Market Intelligence'],
      summary: 'Create recommendation',
      security: auth,
      requestBody: r({
        type: 'object',
        required: ['recommendationType'],
        properties: {
          organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          productId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          marketId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          region: { type: 'string' },
          recommendationType: { type: 'string', example: 'price' },
          recommendedPrice: { type: 'number', minimum: 0 },
          currency: { type: 'string', example: 'UGX' },
          rationale: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'approved', 'published', 'retracted'] },
          notes: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
        },
      }),
      responses: {
        201: { description: 'Recommendation created.' },
        400: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },

  '/api/v1/market-intelligence/recommendations/{recommendationId}': {
    get: {
      tags: ['Market Intelligence'],
      summary: 'Get recommendation',
      security: auth,
      parameters: [recommendationIdParam],
      responses: {
        200: { description: 'Recommendation retrieved.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MarketRecommendation' } } } },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Market Intelligence'],
      summary: 'Update recommendation',
      description: 'Validates recommendation status transitions and returns 400 on invalid transitions.',
      security: auth,
      parameters: [recommendationIdParam],
      requestBody: r({
        type: 'object',
        properties: {
          recommendationType: { type: 'string' },
          recommendedPrice: { type: 'number', minimum: 0 },
          currency: { type: 'string' },
          rationale: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'approved', 'published', 'retracted'] },
          notes: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
        },
      }),
      responses: {
        200: { description: 'Recommendation updated.' },
        400: { $ref: '#/components/responses/ValidationError' },
      },
    },
    delete: {
      tags: ['Market Intelligence'],
      summary: 'Delete recommendation',
      security: auth,
      parameters: [recommendationIdParam],
      responses: {
        200: { description: 'Recommendation deleted.' },
      },
    },
  },

  '/api/v1/market-intelligence/recommendations/{recommendationId}/approve': {
    post: {
      tags: ['Market Intelligence'],
      summary: 'Approve recommendation',
      security: auth,
      parameters: [recommendationIdParam],
      responses: {
        200: { description: 'Recommendation approved.' },
        400: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },

  '/api/v1/market-intelligence/recommendations/{recommendationId}/publish': {
    post: {
      tags: ['Market Intelligence'],
      summary: 'Publish recommendation',
      security: auth,
      parameters: [recommendationIdParam],
      responses: {
        200: { description: 'Recommendation published.' },
        400: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },

  '/api/v1/market-intelligence/recommendations/{recommendationId}/retract': {
    post: {
      tags: ['Market Intelligence'],
      summary: 'Retract recommendation',
      security: auth,
      parameters: [recommendationIdParam],
      responses: {
        200: { description: 'Recommendation retracted.' },
        400: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },

  '/api/v1/market-intelligence/data-sources': {
    get: {
      tags: ['Market Intelligence'],
      summary: 'List market data sources',
      security: auth,
      parameters: [
        pageParam,
        limitParam,
        { name: 'organizationId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'name', in: 'query', schema: { type: 'string' } },
        { name: 'provider', in: 'query', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'paused', 'disabled'] } },
      ],
      responses: {
        200: { description: 'Data sources retrieved.' },
      },
    },
    post: {
      tags: ['Market Intelligence'],
      summary: 'Create market data source',
      security: auth,
      requestBody: r({
        type: 'object',
        required: ['name'],
        properties: {
          organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          name: { type: 'string' },
          provider: { type: 'string' },
          endpoint: { type: 'string' },
          authType: { type: 'string', enum: ['none', 'api_key', 'oauth2'] },
          pullIntervalMinutes: { type: 'integer', minimum: 1, maximum: 1440 },
          status: { type: 'string', enum: ['active', 'paused', 'disabled'] },
          metadata: { type: 'object', additionalProperties: true },
        },
      }),
      responses: {
        201: { description: 'Data source created.' },
      },
    },
  },

  '/api/v1/market-intelligence/data-sources/{sourceId}': {
    get: {
      tags: ['Market Intelligence'],
      summary: 'Get data source',
      security: auth,
      parameters: [sourceIdParam],
      responses: {
        200: { description: 'Data source retrieved.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MarketDataSource' } } } },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Market Intelligence'],
      summary: 'Update data source',
      description: 'Validates data source status transitions and returns 400 on invalid transitions.',
      security: auth,
      parameters: [sourceIdParam],
      requestBody: r({
        type: 'object',
        properties: {
          name: { type: 'string' },
          provider: { type: 'string' },
          endpoint: { type: 'string' },
          authType: { type: 'string', enum: ['none', 'api_key', 'oauth2'] },
          pullIntervalMinutes: { type: 'integer', minimum: 1, maximum: 1440 },
          status: { type: 'string', enum: ['active', 'paused', 'disabled'] },
          metadata: { type: 'object', additionalProperties: true },
        },
      }),
      responses: {
        200: { description: 'Data source updated.' },
        400: { $ref: '#/components/responses/ValidationError' },
      },
    },
    delete: {
      tags: ['Market Intelligence'],
      summary: 'Delete data source',
      security: auth,
      parameters: [sourceIdParam],
      responses: {
        200: { description: 'Data source deleted.' },
      },
    },
  },

  '/api/v1/market-intelligence/data-sources/{sourceId}/refresh': {
    post: {
      tags: ['Market Intelligence'],
      summary: 'Refresh data source',
      security: auth,
      parameters: [sourceIdParam],
      responses: {
        200: { description: 'Data source refresh queued.' },
      },
    },
  },

  '/api/v1/market-intelligence/alerts/check': {
    post: {
      tags: ['Market Intelligence', 'Admin'],
      summary: 'Trigger price alert check (admin/testing)',
      description: 'Manually invokes the alert-evaluation job. `admin` role required.',
      operationId: 'checkMIAlerts',
      security: auth,
      responses: {
        200: { description: 'Check triggered.' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
};
