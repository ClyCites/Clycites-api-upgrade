import type { OpenAPIV3_1 } from 'openapi-types';

const auth = [{ BearerAuth: [] }];
const r = (schema: object) => ({ required: true, content: { 'application/json': { schema } } });
const idParam = { $ref: '#/components/parameters/mongoIdPath' };

export const productsPaths: OpenAPIV3_1.PathsObject = {

  '/api/v1/products': {
    get: {
      tags: ['Products'],
      summary: 'List all products',
      description: 'Returns the product catalogue. No auth required.',
      operationId: 'listProducts',
      parameters: [
        { $ref: '#/components/parameters/pageParam' },
        { $ref: '#/components/parameters/limitParam' },
        { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by category.' },
        { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Full-text search.' },
      ],
      responses: {
        200: { description: 'Product catalogue.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Product' } } } }] } } } },
        500: { $ref: '#/components/responses/InternalError' },
      },
    },
    post: {
      tags: ['Products'],
      summary: 'Create product',
      description: 'Requires `admin` or `trader` role.',
      operationId: 'createProduct',
      security: auth,
      requestBody: r({ $ref: '#/components/schemas/ProductCreateRequest' }),
      responses: {
        201: { description: 'Product created.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Product' } } }] } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/products/{id}': {
    get: {
      tags: ['Products'],
      summary: 'Get product by ID',
      operationId: 'getProduct',
      parameters: [idParam],
      responses: {
        200: { description: 'Product.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Product' } } }] } } } },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    put: {
      tags: ['Products'],
      summary: 'Update product',
      operationId: 'updateProduct',
      security: auth,
      parameters: [idParam],
      requestBody: r({ $ref: '#/components/schemas/ProductCreateRequest' }),
      responses: {
        200: { description: 'Product updated.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    delete: {
      tags: ['Products'],
      summary: 'Delete product',
      operationId: 'deleteProduct',
      security: auth,
      parameters: [idParam],
      responses: {
        200: { description: 'Product deleted.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
};
