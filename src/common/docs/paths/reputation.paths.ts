const auth = [{ BearerAuth: [] }];
const r = (s: object) => ({ required: true, content: { 'application/json': { schema: s } } });
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };
const userIdParam = { name: 'userId', in: 'path' as const, required: true, schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' } };
const ratingIdParam = { name: 'ratingId', in: 'path' as const, required: true, schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' } };

const ratingSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    raterId: { type: 'string' },
    ratedUserId: { type: 'string' },
    orderId: { type: 'string' },
    score: { type: 'integer', minimum: 1, maximum: 5 },
    category: { type: 'string', enum: ['buyer', 'seller'] },
    comment: { type: 'string' },
    aspects: {
      type: 'object',
      properties: {
        quality: { type: 'integer', minimum: 1, maximum: 5 },
        communication: { type: 'integer', minimum: 1, maximum: 5 },
        delivery: { type: 'integer', minimum: 1, maximum: 5 },
        packaging: { type: 'integer', minimum: 1, maximum: 5 },
        valueForMoney: { type: 'integer', minimum: 1, maximum: 5 },
      },
    },
    sellerResponse: { type: 'string' },
    helpfulCount: { type: 'integer' },
    isVerified: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
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
        { name: 'category', in: 'query', schema: { type: 'string', enum: ['buyer', 'seller', 'all'] }, description: 'Filter by rating category.' },
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
        required: ['orderId', 'ratedUserId', 'score', 'category'],
        properties: {
          orderId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          ratedUserId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          score: { type: 'integer', minimum: 1, maximum: 5 },
          category: { type: 'string', enum: ['buyer', 'seller'] },
          comment: { type: 'string', maxLength: 1000 },
          aspects: {
            type: 'object',
            properties: {
              quality: { type: 'integer', minimum: 1, maximum: 5 },
              communication: { type: 'integer', minimum: 1, maximum: 5 },
              delivery: { type: 'integer', minimum: 1, maximum: 5 },
              packaging: { type: 'integer', minimum: 1, maximum: 5 },
              valueForMoney: { type: 'integer', minimum: 1, maximum: 5 },
            },
          },
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
        { name: 'category', in: 'query', schema: { type: 'string', enum: ['buyer', 'seller'] } },
        { name: 'minScore', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 5 } },
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
      requestBody: r({ type: 'object', required: ['response'], properties: { response: { type: 'string', maxLength: 500 } } }),
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
};
