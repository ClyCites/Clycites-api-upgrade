const auth = [{ BearerAuth: [] }];
const r = (s: object) => ({ required: true, content: { 'application/json': { schema: s } } });
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };
const userIdParam = { name: 'userId', in: 'path' as const, required: true, schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' } };
const ratingIdParam = { name: 'ratingId', in: 'path' as const, required: true, schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' } };

const ratingSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    order: { type: 'string' },
    offer: { type: 'string' },
    ratedUser: { type: 'string' },
    ratedBy: { type: 'string' },
    raterRole: { type: 'string', enum: ['buyer', 'seller'] },
    overallRating: { type: 'integer', minimum: 1, maximum: 5 },
    categoryRatings: {
      type: 'object',
      properties: {
        productQuality: { type: 'integer', minimum: 1, maximum: 5 },
        communication: { type: 'integer', minimum: 1, maximum: 5 },
        packaging: { type: 'integer', minimum: 1, maximum: 5 },
        delivery: { type: 'integer', minimum: 1, maximum: 5 },
        pricing: { type: 'integer', minimum: 1, maximum: 5 },
        professionalism: { type: 'integer', minimum: 1, maximum: 5 },
        responsiveness: { type: 'integer', minimum: 1, maximum: 5 },
      },
    },
    review: { type: 'string' },
    pros: { type: 'array', items: { type: 'string' } },
    cons: { type: 'array', items: { type: 'string' } },
    wouldRecommend: { type: 'boolean' },
    wouldBuyAgain: { type: 'boolean' },
    images: { type: 'array', items: { type: 'string' } },
    verified: { type: 'boolean' },
    status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'flagged'] },
    uiStatus: { type: 'string', enum: ['draft', 'published', 'hidden'] },
    flagReason: { type: 'string' },
    moderatedBy: { type: 'string' },
    moderatedAt: { type: 'string', format: 'date-time' },
    sellerResponse: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        respondedAt: { type: 'string', format: 'date-time' },
      },
    },
    helpful: { type: 'integer' },
    notHelpful: { type: 'integer' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const scoreSchema = {
  type: 'object',
  properties: {
    userId: { type: 'string' },
    overallScore: { type: 'number' },
    totalRatings: { type: 'integer' },
    distribution: {
      type: 'object',
      properties: {
        '5': { type: 'integer' },
        '4': { type: 'integer' },
        '3': { type: 'integer' },
        '2': { type: 'integer' },
        '1': { type: 'integer' },
      },
    },
    averageAspects: {
      type: 'object',
      properties: {
        quality: { type: 'number' },
        communication: { type: 'number' },
        delivery: { type: 'number' },
        packaging: { type: 'number' },
        valueForMoney: { type: 'number' },
      },
    },
    reputationTier: { type: 'string', enum: ['bronze', 'silver', 'gold', 'platinum'] },
  },
};

export const reputationPaths: Record<string, unknown> = {

  '/api/v1/reputation/top-rated': {
    get: {
      tags: ['Reputation'],
      summary: 'Get top-rated users',
      operationId: 'getTopRatedUsers',
      security: auth,
      parameters: [
        pageParam, limitParam,
        { name: 'userType', in: 'query', schema: { type: 'string', enum: ['farmer', 'buyer', 'trader', 'expert'] }, description: 'Filter leaderboard by user type.' },
        { name: 'minRatings', in: 'query', schema: { type: 'integer', default: 5 }, description: 'Minimum number of ratings required.' },
        { name: 'region', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Top-rated users.' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/reputation/ratings': {
    post: {
      tags: ['Reputation'],
      summary: 'Submit a rating for a completed order',
      description: 'Can only be submitted once per order, within 30 days of delivery.',
      operationId: 'createRating',
      security: auth,
      requestBody: r({
        type: 'object',
        required: ['order', 'overallRating', 'wouldRecommend'],
        properties: {
          order: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          overallRating: { type: 'integer', minimum: 1, maximum: 5 },
          categoryRatings: {
            type: 'object',
            properties: {
              productQuality: { type: 'integer', minimum: 1, maximum: 5 },
              communication: { type: 'integer', minimum: 1, maximum: 5 },
              packaging: { type: 'integer', minimum: 1, maximum: 5 },
              delivery: { type: 'integer', minimum: 1, maximum: 5 },
              pricing: { type: 'integer', minimum: 1, maximum: 5 },
              professionalism: { type: 'integer', minimum: 1, maximum: 5 },
              responsiveness: { type: 'integer', minimum: 1, maximum: 5 },
            },
          },
          review: { type: 'string', maxLength: 2000 },
          pros: { type: 'array', items: { type: 'string' } },
          cons: { type: 'array', items: { type: 'string' } },
          wouldRecommend: { type: 'boolean' },
          wouldBuyAgain: { type: 'boolean' },
          images: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'flagged', 'draft', 'published', 'hidden'] },
          uiStatus: { type: 'string', enum: ['draft', 'published', 'hidden'] },
        },
      }),
      responses: {
        201: { description: 'Rating submitted.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: ratingSchema } }] } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        409: { description: 'Rating already submitted for this order.' },
      },
    },
  },

  '/api/v1/reputation/users/{userId}/ratings': {
    get: {
      tags: ['Reputation'],
      summary: 'Get all ratings for a user',
      operationId: 'getUserRatings',
      security: auth,
      parameters: [
        userIdParam, pageParam, limitParam,
        { name: 'role', in: 'query', schema: { type: 'string', enum: ['buyer', 'seller'] } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'approved', 'rejected', 'flagged'] } },
        { name: 'uiStatus', in: 'query', schema: { type: 'string', enum: ['draft', 'published', 'hidden'] } },
      ],
      responses: {
        200: { description: 'User ratings.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { type: 'array', items: ratingSchema }, meta: { $ref: '#/components/schemas/PaginationMeta' } } }] } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/reputation/users/{userId}/score': {
    get: {
      tags: ['Reputation'],
      summary: 'Get reputation score for a user',
      operationId: 'getReputationScore',
      security: auth,
      parameters: [userIdParam],
      responses: {
        200: { description: 'Reputation score.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: scoreSchema } }] } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/reputation/ratings/{ratingId}/response': {
    post: {
      tags: ['Reputation'],
      summary: 'Add seller response to a rating',
      description: 'The rated user (seller/buyer) can add a single public response to each rating.',
      operationId: 'addSellerResponse',
      security: auth,
      parameters: [ratingIdParam],
      requestBody: r({ type: 'object', required: ['message'], properties: { message: { type: 'string', maxLength: 1000 } } }),
      responses: {
        200: { description: 'Response added.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/reputation/ratings/{ratingId}/helpful': {
    post: {
      tags: ['Reputation'],
      summary: 'Vote a rating as helpful or not helpful',
      operationId: 'markHelpful',
      security: auth,
      parameters: [ratingIdParam],
      requestBody: r({ type: 'object', required: ['helpful'], properties: { helpful: { type: 'boolean', description: '`true` = helpful, `false` = not helpful.' } } }),
      responses: {
        200: { description: 'Vote recorded.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/reputation/ratings/{ratingId}': {
    get: {
      tags: ['Reputation'],
      summary: 'Get rating by ID',
      operationId: 'getRatingById',
      security: auth,
      parameters: [ratingIdParam],
      responses: {
        200: {
          description: 'Rating details.',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { type: 'object', properties: { data: ratingSchema } },
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
    patch: {
      tags: ['Reputation'],
      summary: 'Update rating',
      operationId: 'updateRating',
      security: auth,
      parameters: [ratingIdParam],
      requestBody: r({
        type: 'object',
        properties: {
          overallRating: { type: 'integer', minimum: 1, maximum: 5 },
          categoryRatings: { type: 'object' },
          review: { type: 'string', maxLength: 2000 },
          pros: { type: 'array', items: { type: 'string' } },
          cons: { type: 'array', items: { type: 'string' } },
          wouldRecommend: { type: 'boolean' },
          wouldBuyAgain: { type: 'boolean' },
          images: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'flagged', 'draft', 'published', 'hidden'] },
          uiStatus: { type: 'string', enum: ['draft', 'published', 'hidden'] },
        },
      }),
      responses: {
        200: { description: 'Rating updated.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    delete: {
      tags: ['Reputation'],
      summary: 'Delete rating (soft)',
      operationId: 'deleteRating',
      security: auth,
      parameters: [ratingIdParam],
      responses: {
        200: { description: 'Rating deleted.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/reputation/ratings/{ratingId}/moderate': {
    post: {
      tags: ['Reputation'],
      summary: 'Moderate rating visibility',
      operationId: 'moderateRating',
      security: auth,
      parameters: [ratingIdParam],
      requestBody: r({
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['draft', 'published', 'hidden'] },
          reason: { type: 'string' },
        },
      }),
      responses: {
        200: { description: 'Rating moderated.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
};
