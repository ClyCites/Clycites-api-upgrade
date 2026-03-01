
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
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'pending', 'sold', 'expired', 'cancelled', 'draft', 'published', 'paused', 'closed'] } },
        { name: 'uiStatus', in: 'query', schema: { type: 'string', enum: ['draft', 'published', 'paused', 'closed'] } },
        { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['price', 'createdAt', 'quantity'] } },
      ],
      responses: {
        200: {
          description: 'Listings.',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Listing' } },
                      meta: {
                        type: 'object',
                        properties: {
                          pagination: { $ref: '#/components/schemas/PaginationMeta' },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
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

  '/api/v1/listings/my/listings': {
    get: {
      tags: ['Marketplace'],
      summary: 'My listings',
      description: "Returns the authenticated farmer's listings.",
      operationId: 'getMyListings',
      security: auth,
      parameters: [
        pageParam,
        limitParam,
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'pending', 'sold', 'expired', 'cancelled', 'draft', 'published', 'paused', 'closed'] } },
        { name: 'uiStatus', in: 'query', schema: { type: 'string', enum: ['draft', 'published', 'paused', 'closed'] } },
      ],
      responses: {
        200: {
          description: 'My listings.',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Listing' } },
                      meta: {
                        type: 'object',
                        properties: {
                          pagination: { $ref: '#/components/schemas/PaginationMeta' },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/listings/my/stats': {
    get: {
      tags: ['Marketplace'],
      summary: 'My listing statistics',
      description: 'Returns stats for the authenticated farmer\'s listings (total, active, sold, expired, total revenue, inquiry count).',
      operationId: 'getMyListingStats',
      security: auth,
      responses: { 200: { description: 'Listing stats.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
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
      responses: {
        200: {
          description: 'Updated.',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { type: 'object', properties: { data: { $ref: '#/components/schemas/Listing' } } },
                ],
              },
            },
          },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Marketplace'],
      summary: 'Partially update listing',
      operationId: 'patchListing',
      security: auth,
      parameters: [idParam],
      requestBody: r({
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          quantity: { type: 'number', minimum: 0 },
          price: { type: 'number', minimum: 0 },
          quality: { type: 'string', enum: ['premium', 'standard', 'economy'] },
          deliveryOptions: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['active', 'pending', 'sold', 'expired', 'cancelled', 'draft', 'published', 'paused', 'closed'] },
          uiStatus: { type: 'string', enum: ['draft', 'published', 'paused', 'closed'] },
        },
      }),
      responses: {
        200: {
          description: 'Listing updated.',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { type: 'object', properties: { data: { $ref: '#/components/schemas/Listing' } } },
                ],
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
    delete: {
      tags: ['Marketplace'],
      summary: 'Delete listing',
      operationId: 'deleteListing',
      security: auth,
      parameters: [idParam],
      responses: {
        200: {
          description: 'Listing deleted.',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { type: 'object', properties: { data: { type: 'null' } } },
                ],
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/listings/{id}/inquire': {
    post: {
      tags: ['Marketplace'],
      summary: 'Inquire about a listing',
      description: 'Increments the inquiry count and optionally sends a message to the seller. Optional authentication.',
      operationId: 'inquireListing',
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { message: { type: 'string', description: 'Optional inquiry message.' } } }),
      responses: {
        200: {
          description: 'Inquiry recorded.',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { type: 'object', properties: { data: { type: 'null' } } },
                ],
              },
            },
          },
        },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/listings/{id}/status': {
    patch: {
      tags: ['Marketplace'],
      summary: 'Legacy listing status update endpoint',
      operationId: 'patchListingStatus',
      security: auth,
      parameters: [idParam],
      requestBody: r({
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'pending', 'sold', 'expired', 'cancelled', 'draft', 'published', 'paused', 'closed'] },
          uiStatus: { type: 'string', enum: ['draft', 'published', 'paused', 'closed'] },
        },
        anyOf: [
          { required: ['status'] },
          { required: ['uiStatus'] },
        ],
      }),
      responses: {
        200: {
          description: 'Status updated.',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { type: 'object', properties: { data: { $ref: '#/components/schemas/Listing' } } },
                ],
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
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
      operationId: 'createOfferForListing',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['offeredPrice', 'quantity'], properties: { offeredPrice: { type: 'number', example: 1100 }, quantity: { type: 'number', example: 200 }, message: { type: 'string' } } }),
      responses: {
        201: { description: 'Offer submitted.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/marketplace/contracts': {
    get: {
      tags: ['Marketplace'],
      summary: 'List marketplace contracts',
      operationId: 'listMarketplaceContracts',
      security: auth,
      parameters: [
        pageParam,
        limitParam,
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'under_review', 'active', 'completed', 'terminated'] } },
        { name: 'organizationId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: 'Contracts list.',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/MarketplaceContract' } },
                      meta: {
                        type: 'object',
                        properties: {
                          pagination: { $ref: '#/components/schemas/PaginationMeta' },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    post: {
      tags: ['Marketplace'],
      summary: 'Create marketplace contract',
      operationId: 'createMarketplaceContract',
      security: auth,
      requestBody: r({
        type: 'object',
        required: ['title', 'terms', 'parties'],
        properties: {
          organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          listing: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          order: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          offer: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          title: { type: 'string' },
          terms: { type: 'string' },
          valueAmount: { type: 'number', minimum: 0 },
          currency: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          parties: { type: 'array', items: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
          status: { type: 'string', enum: ['draft', 'under_review', 'active', 'completed', 'terminated'] },
        },
      }),
      responses: {
        201: {
          description: 'Contract created.',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { type: 'object', properties: { data: { $ref: '#/components/schemas/MarketplaceContract' } } },
                ],
              },
            },
          },
        },
        400: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },

  '/api/v1/marketplace/contracts/{contractId}': {
    get: {
      tags: ['Marketplace'],
      summary: 'Get marketplace contract by ID',
      operationId: 'getMarketplaceContract',
      security: auth,
      parameters: [{ name: 'contractId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      responses: {
        200: {
          description: 'Contract details.',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { type: 'object', properties: { data: { $ref: '#/components/schemas/MarketplaceContract' } } },
                ],
              },
            },
          },
        },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Marketplace'],
      summary: 'Update marketplace contract',
      operationId: 'updateMarketplaceContract',
      security: auth,
      parameters: [{ name: 'contractId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      requestBody: r({
        type: 'object',
        properties: {
          title: { type: 'string' },
          terms: { type: 'string' },
          valueAmount: { type: 'number', minimum: 0 },
          currency: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          parties: { type: 'array', items: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
          status: { type: 'string', enum: ['draft', 'under_review', 'active', 'completed', 'terminated'] },
        },
      }),
      responses: {
        200: {
          description: 'Contract updated.',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { type: 'object', properties: { data: { $ref: '#/components/schemas/MarketplaceContract' } } },
                ],
              },
            },
          },
        },
        400: { $ref: '#/components/responses/ValidationError' },
      },
    },
    delete: {
      tags: ['Marketplace'],
      summary: 'Soft delete marketplace contract',
      operationId: 'deleteMarketplaceContract',
      security: auth,
      parameters: [{ name: 'contractId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      responses: {
        200: {
          description: 'Contract deleted.',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { type: 'object', properties: { data: { type: 'null' } } },
                ],
              },
            },
          },
        },
      },
    },
  },

  '/api/v1/marketplace/contracts/{contractId}/sign': {
    post: {
      tags: ['Marketplace'],
      summary: 'Sign marketplace contract',
      description: 'Transition rule: draft -> under_review on first signature, under_review -> active when all parties sign.',
      operationId: 'signMarketplaceContract',
      security: auth,
      parameters: [{ name: 'contractId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      requestBody: r({
        type: 'object',
        properties: {
          note: { type: 'string', maxLength: 1000 },
        },
      }),
      responses: {
        200: {
          description: 'Contract signed.',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { type: 'object', properties: { data: { $ref: '#/components/schemas/MarketplaceContract' } } },
                ],
              },
            },
          },
        },
        400: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
};
