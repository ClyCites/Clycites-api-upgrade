
const auth = [{ BearerAuth: [] }];
const r = (schema: object) => ({ required: true, content: { 'application/json': { schema } } });
const idParam = { $ref: '#/components/parameters/mongoIdPath' };
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };

export const marketplacePaths: Record<string, unknown> = {

  '/api/v1/listings': {
    get: {
      tags: ['Marketplace'],
      summary: 'Browse listings',
      description: 'Search and filter active marketplace listings. Optional authentication for personalized results.',
      operationId: 'listListings',
      parameters: [
        pageParam, limitParam,
        { name: 'product', in: 'query', schema: { type: 'string' }, description: 'Filter by product ID.' },
        { name: 'category', in: 'query', schema: { type: 'string' } },
        { name: 'region', in: 'query', schema: { type: 'string' } },
        { name: 'minPrice', in: 'query', schema: { type: 'number' } },
        { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'sold', 'expired', 'draft'] } },
        { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['price', 'createdAt', 'quantity'] } },
      ],
      responses: {
        200: { description: 'Listings.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Listing' } } } }] } } } },
      },
    },
    post: {
      tags: ['Marketplace'],
      summary: 'Create listing',
      description: 'Requires `farmer` role. Creates a new product listing.',
      operationId: 'createListing',
      security: auth,
      requestBody: r({ $ref: '#/components/schemas/ListingCreateRequest' }),
      responses: {
        201: { description: 'Listing created.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Listing' } } }] } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/listings/my': {
    get: {
      tags: ['Marketplace'],
      summary: 'My listings',
      description: "Returns the authenticated farmer's listings.",
      operationId: 'getMyListings',
      security: auth,
      parameters: [pageParam, limitParam, { name: 'status', in: 'query', schema: { type: 'string' } }],
      responses: { 200: { description: 'My listings.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/listings/{id}': {
    get: {
      tags: ['Marketplace'],
      summary: 'Get listing by ID',
      operationId: 'getListing',
      parameters: [idParam],
      responses: {
        200: { description: 'Listing.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Listing' } } }] } } } },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    put: {
      tags: ['Marketplace'],
      summary: 'Update listing',
      operationId: 'updateListing',
      security: auth,
      parameters: [idParam],
      requestBody: r({ $ref: '#/components/schemas/ListingCreateRequest' }),
      responses: { 200: { description: 'Updated.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Marketplace'],
      summary: 'Update listing status',
      operationId: 'patchListingStatus',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['active', 'draft', 'expired'] } } }),
      responses: { 200: { description: 'Status updated.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
    delete: {
      tags: ['Marketplace'],
      summary: 'Delete listing',
      operationId: 'deleteListing',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Listing deleted.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  '/api/v1/listings/{id}/offers': {
    get: {
      tags: ['Marketplace', 'Offers'],
      summary: 'Get offers on a listing',
      operationId: 'getListingOffers',
      security: auth,
      parameters: [idParam, pageParam],
      responses: { 200: { description: 'Offers.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
    post: {
      tags: ['Marketplace', 'Offers'],
      summary: 'Make an offer',
      description: 'Submit a price offer on a listing.',
      operationId: 'createOffer',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['offeredPrice', 'quantity'], properties: { offeredPrice: { type: 'number', example: 1100 }, quantity: { type: 'number', example: 200 }, message: { type: 'string' } } }),
      responses: { 201: { description: 'Offer submitted.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },
};
