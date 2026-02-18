import type { OpenAPIV3_1 } from 'openapi-types';

const auth = [{ BearerAuth: [] }];
const r = (s: object) => ({ required: true, content: { 'application/json': { schema: s } } });
const idParam = { $ref: '#/components/parameters/mongoIdPath' };
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };

const marketBody = {
  type: 'object',
  required: ['name', 'location'],
  properties: {
    name: { type: 'string', example: 'Kampala Central Market' },
    description: { type: 'string' },
    type: { type: 'string', enum: ['wholesale', 'retail', 'farmgate', 'export', 'online'], default: 'retail' },
    location: {
      type: 'object',
      required: ['address', 'city', 'country'],
      properties: {
        address: { type: 'string' },
        city: { type: 'string' },
        region: { type: 'string' },
        country: { type: 'string', example: 'Uganda' },
        coordinates: { type: 'object', properties: { lat: { type: 'number' }, lng: { type: 'number' } } },
      },
    },
    operatingHours: {
      type: 'object',
      properties: {
        open: { type: 'string', example: '06:00' },
        close: { type: 'string', example: '18:00' },
        days: { type: 'array', items: { type: 'string', enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] } },
      },
    },
    categories: { type: 'array', items: { type: 'string' }, description: 'Product categories traded.' },
    contact: { type: 'object', properties: { phone: { type: 'string' }, email: { type: 'string', format: 'email' }, website: { type: 'string', format: 'uri' } } },
  },
};

export const marketsPaths: OpenAPIV3_1.PathsObject = {

  '/api/v1/markets': {
    post: {
      tags: ['Markets'],
      summary: 'Register a market',
      description: 'Requires `platform_admin` or appropriate role.',
      operationId: 'createMarket',
      security: auth,
      requestBody: r(marketBody),
      responses: {
        201: { description: 'Market created.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Market' } } }] } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
    get: {
      tags: ['Markets'],
      summary: 'List / search markets',
      operationId: 'listMarkets',
      parameters: [
        pageParam, limitParam,
        { name: 'type', in: 'query', schema: { type: 'string', enum: ['wholesale', 'retail', 'farmgate', 'export', 'online'] } },
        { name: 'city', in: 'query', schema: { type: 'string' } },
        { name: 'country', in: 'query', schema: { type: 'string' } },
        { name: 'region', in: 'query', schema: { type: 'string' } },
        { name: 'search', in: 'query', description: 'Full-text search on name/description.', schema: { type: 'string' } },
        { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['name', 'createdAt'], default: 'name' } },
      ],
      responses: {
        200: {
          description: 'Market list.',
          content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Market' } }, meta: { $ref: '#/components/schemas/PaginationMeta' } } }] } } },
        },
      },
    },
  },

  '/api/v1/markets/{id}': {
    get: {
      tags: ['Markets'],
      summary: 'Get market by ID',
      operationId: 'getMarket',
      parameters: [idParam],
      responses: {
        200: { description: 'Market.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Market' } } }] } } } },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    put: {
      tags: ['Markets'],
      summary: 'Update market',
      operationId: 'updateMarket',
      security: auth,
      parameters: [idParam],
      requestBody: r(marketBody),
      responses: {
        200: { description: 'Updated.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Market' } } }] } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    delete: {
      tags: ['Markets'],
      summary: 'Delete market',
      description: 'Requires `platform_admin` role.',
      operationId: 'deleteMarket',
      security: auth,
      parameters: [idParam],
      responses: {
        200: { description: 'Deleted.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/markets/{marketId}/prices': {
    get: {
      tags: ['Markets', 'Prices'],
      summary: 'Get latest prices for a market',
      operationId: 'getMarketPrices',
      parameters: [
        { name: 'marketId', in: 'path', required: true, description: 'Market ID.', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        pageParam, limitParam,
        { name: 'productId', in: 'query', schema: { type: 'string' } },
        { name: 'category', in: 'query', schema: { type: 'string' } },
        { $ref: '#/components/parameters/daysParam' },
      ],
      responses: {
        200: { description: 'Prices for this market.' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
};
