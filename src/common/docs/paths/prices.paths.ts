import type { OpenAPIV3_1 } from 'openapi-types';

const auth = [{ BearerAuth: [] }];
const r = (s: object) => ({ required: true, content: { 'application/json': { schema: s } } });
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };
const daysParam = { $ref: '#/components/parameters/daysParam' };

const commonFilters = [
  pageParam, limitParam,
  { name: 'marketId', in: 'query' as const, schema: { type: 'string' as const } },
  { name: 'productId', in: 'query' as const, schema: { type: 'string' as const } },
  { name: 'region', in: 'query' as const, schema: { type: 'string' as const } },
];

const priceBody = {
  type: 'object',
  required: ['marketId', 'productId', 'price', 'unit', 'currency'],
  properties: {
    marketId: { type: 'string' },
    productId: { type: 'string' },
    price: { type: 'number', minimum: 0 },
    unit: { type: 'string', example: 'kg' },
    currency: { type: 'string', example: 'UGX' },
    quantity: { type: 'number' },
    priceType: { type: 'string', enum: ['retail', 'wholesale', 'farmgate', 'export', 'import'] },
    grade: { type: 'string', enum: ['A', 'B', 'C', 'standard'] },
    source: { type: 'string', enum: ['manual', 'automated', 'market_survey', 'aggregated'] },
    notes: { type: 'string' },
  },
};

export const pricesPaths: OpenAPIV3_1.PathsObject = {

  '/api/v1/prices': {
    post: {
      tags: ['Prices'],
      summary: 'Submit price entry',
      description: 'Requires `trader` or `platform_admin` role.',
      operationId: 'createPrice',
      security: auth,
      requestBody: r(priceBody),
      responses: { 201: { description: 'Price created.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Price' } } }] } } } }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
    get: {
      tags: ['Prices'],
      summary: 'List price entries',
      operationId: 'listPrices',
      parameters: [...commonFilters, { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } }],
      responses: { 200: { description: 'Price list.' }, 400: { $ref: '#/components/responses/ValidationError' } },
    },
  },

  '/api/v1/prices/trends': {
    get: {
      tags: ['Prices'],
      summary: 'Price trend analysis',
      operationId: 'priceTrends',
      parameters: [{ name: 'productId', in: 'query', required: true, schema: { type: 'string' } }, { name: 'marketId', in: 'query', schema: { type: 'string' } }, daysParam],
      responses: { 200: { description: 'Trend data.' } },
    },
  },

  '/api/v1/prices/predict': {
    post: {
      tags: ['Prices'],
      summary: 'Predict future price',
      description: 'ML-based price prediction for a product/market combination.',
      operationId: 'predictPrice',
      security: auth,
      requestBody: r({ type: 'object', required: ['productId'], properties: { productId: { type: 'string' }, marketId: { type: 'string' }, daysAhead: { type: 'integer', minimum: 1, maximum: 90, default: 7 } } }),
      responses: { 200: { description: 'Prediction result.', content: { 'application/json': { schema: { type: 'object', properties: { predictedPrice: { type: 'number' }, confidence: { type: 'number' }, range: { type: 'object', properties: { low: { type: 'number' }, high: { type: 'number' } } } } } } } }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/prices/bulk-import': {
    post: {
      tags: ['Prices', 'Admin'],
      summary: 'Bulk import prices',
      description: 'Requires `trader` or `platform_admin` role.',
      operationId: 'bulkImportPrices',
      security: auth,
      requestBody: r({ type: 'object', required: ['prices'], properties: { prices: { type: 'array', items: priceBody, maxItems: 500 } } }),
      responses: { 200: { description: 'Import summary.' }, 400: { $ref: '#/components/responses/ValidationError' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/prices/historical': {
    get: {
      tags: ['Prices'],
      summary: 'Historical price data',
      operationId: 'historicalPrices',
      parameters: [...commonFilters, daysParam, { name: 'interval', in: 'query', schema: { type: 'string', enum: ['daily', 'weekly', 'monthly'] } }],
      responses: { 200: { description: 'Historical data.' } },
    },
  },

  '/api/v1/prices/top-markets': {
    get: {
      tags: ['Prices'],
      summary: 'Top markets by trading volume',
      operationId: 'topMarkets',
      parameters: [{ name: 'productId', in: 'query', schema: { type: 'string' } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }, daysParam],
      responses: { 200: { description: 'Top markets.' } },
    },
  },

  '/api/v1/prices/anomalies': {
    get: {
      tags: ['Prices'],
      summary: 'Detected price anomalies',
      operationId: 'priceAnomalies',
      security: auth,
      parameters: [...commonFilters, daysParam],
      responses: { 200: { description: 'Anomaly list.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/prices/average': {
    get: {
      tags: ['Prices'],
      summary: 'Average price for product/market',
      operationId: 'averagePrice',
      parameters: [{ name: 'productId', in: 'query', required: true, schema: { type: 'string' } }, { name: 'marketId', in: 'query', schema: { type: 'string' } }, daysParam],
      responses: { 200: { description: 'Average price.' } },
    },
  },

  '/api/v1/prices/compare': {
    get: {
      tags: ['Prices'],
      summary: 'Compare prices across markets',
      operationId: 'comparePrices',
      parameters: [{ name: 'productId', in: 'query', required: true, schema: { type: 'string' } }, { name: 'marketIds', in: 'query', schema: { type: 'array', items: { type: 'string' } }, explode: false }, daysParam],
      responses: { 200: { description: 'Comparison data.' } },
    },
  },

  '/api/v1/prices/volatility': {
    get: {
      tags: ['Prices'],
      summary: 'Price volatility index',
      operationId: 'priceVolatility',
      parameters: [...commonFilters, daysParam],
      responses: { 200: { description: 'Volatility data.' } },
    },
  },

  '/api/v1/prices/trends/popular': {
    get: {
      tags: ['Prices'],
      summary: 'Most searched / popular price trends',
      operationId: 'popularPriceTrends',
      parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }],
      responses: { 200: { description: 'Popular trends.' } },
    },
  },

  '/api/v1/prices/trends/product': {
    get: {
      tags: ['Prices'],
      summary: 'Product-specific trend breakdown',
      operationId: 'productPriceTrend',
      parameters: [{ name: 'productId', in: 'query', required: true, schema: { type: 'string' } }, daysParam],
      responses: { 200: { description: 'Product trend.' } },
    },
  },

  '/api/v1/prices/seasonal': {
    get: {
      tags: ['Prices'],
      summary: 'Seasonal price patterns',
      operationId: 'seasonalPrices',
      parameters: [{ name: 'productId', in: 'query', required: true, schema: { type: 'string' } }, { name: 'years', in: 'query', schema: { type: 'integer', default: 3 } }],
      responses: { 200: { description: 'Seasonal data.' } },
    },
  },

  '/api/v1/prices/correlations': {
    get: {
      tags: ['Prices'],
      summary: 'Price correlations between products',
      operationId: 'priceCorrelations',
      parameters: [{ name: 'productIds', in: 'query', schema: { type: 'array', items: { type: 'string' } }, explode: false }, daysParam],
      responses: { 200: { description: 'Correlation matrix.' } },
    },
  },

  '/api/v1/prices/regional': {
    get: {
      tags: ['Prices'],
      summary: 'Regional price distribution',
      operationId: 'regionalPrices',
      parameters: [{ name: 'productId', in: 'query', required: true, schema: { type: 'string' } }, { name: 'country', in: 'query', schema: { type: 'string' } }, daysParam],
      responses: { 200: { description: 'Regional data.' } },
    },
  },

  '/api/v1/prices/report': {
    get: {
      tags: ['Prices'],
      summary: 'Generate price report',
      operationId: 'priceReport',
      security: auth,
      parameters: [...commonFilters, { name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'csv', 'pdf'] }, description: 'Download format.' }, daysParam],
      responses: { 200: { description: 'Report data / file.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/prices/price-summary/{productId}': {
    get: {
      tags: ['Prices'],
      summary: 'Comprehensive price summary for a product',
      operationId: 'priceSummaryByProduct',
      parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }, daysParam],
      responses: { 200: { description: 'Price summary.' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  '/api/v1/prices/alerts': {
    post: {
      tags: ['Prices'],
      summary: 'Create price alert',
      operationId: 'createPriceAlert',
      security: auth,
      requestBody: r({ type: 'object', required: ['productId', 'alertType', 'threshold'], properties: { productId: { type: 'string' }, marketId: { type: 'string' }, alertType: { type: 'string', enum: ['above', 'below', 'change_percent'] }, threshold: { type: 'number' }, channels: { type: 'array', items: { type: 'string', enum: ['email', 'sms', 'push', 'in_app'] } } } }),
      responses: { 201: { description: 'Alert created.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
    get: {
      tags: ['Prices'],
      summary: 'List my price alerts',
      operationId: 'listPriceAlerts',
      security: auth,
      parameters: [pageParam, limitParam],
      responses: { 200: { description: 'Alert list.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/prices/alerts/{id}': {
    delete: {
      tags: ['Prices'],
      summary: 'Delete price alert',
      operationId: 'deletePriceAlert',
      security: auth,
      parameters: [{ $ref: '#/components/parameters/mongoIdPath' }],
      responses: { 200: { description: 'Deleted.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/prices/schedule-report': {
    post: {
      tags: ['Prices'],
      summary: 'Schedule recurring price report',
      operationId: 'schedulePriceReport',
      security: auth,
      requestBody: r({ type: 'object', required: ['frequency'], properties: { frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly'] }, email: { type: 'string', format: 'email' }, filters: { type: 'object', properties: { productIds: { type: 'array', items: { type: 'string' } }, marketIds: { type: 'array', items: { type: 'string' } } } } } }),
      responses: { 200: { description: 'Report scheduled.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/prices/{id}': {
    get: {
      tags: ['Prices'],
      summary: 'Get price by ID',
      operationId: 'getPrice',
      parameters: [{ $ref: '#/components/parameters/mongoIdPath' }],
      responses: { 200: { description: 'Price.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Price' } } }] } } } }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    put: {
      tags: ['Prices', 'Admin'],
      summary: 'Update price entry',
      description: 'Requires `trader` or `platform_admin` role.',
      operationId: 'updatePrice',
      security: auth,
      parameters: [{ $ref: '#/components/parameters/mongoIdPath' }],
      requestBody: r(priceBody),
      responses: { 200: { description: 'Updated.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    delete: {
      tags: ['Prices', 'Admin'],
      summary: 'Delete price entry',
      description: 'Requires `trader` or `platform_admin` role.',
      operationId: 'deletePrice',
      security: auth,
      parameters: [{ $ref: '#/components/parameters/mongoIdPath' }],
      responses: { 200: { description: 'Deleted.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },
};
