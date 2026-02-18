const auth = [{ BearerAuth: [] }];
const r = (s: object) => ({ required: true, content: { 'application/json': { schema: s } } });
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };
const offerIdParam = { name: 'offerId', in: 'path' as const, required: true, schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' } };

const offerSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    listingId: { type: 'string' },
    buyerId: { type: 'string' },
    sellerId: { type: 'string' },
    offerPrice: { type: 'number' },
    quantity: { type: 'number' },
    unit: { type: 'string' },
    totalAmount: { type: 'number' },
    status: { type: 'string', enum: ['pending', 'accepted', 'rejected', 'countered', 'withdrawn', 'expired', 'converted_to_order'] },
    message: { type: 'string' },
    expiresAt: { type: 'string', format: 'date-time' },
    counterOffer: {
      type: 'object',
      properties: {
        price: { type: 'number' },
        quantity: { type: 'number' },
        message: { type: 'string' },
      },
    },
    negotiationMessages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          senderId: { type: 'string' },
          content: { type: 'string' },
          sentAt: { type: 'string', format: 'date-time' },
          isRead: { type: 'boolean' },
        },
      },
    },
    orderId: { type: 'string', description: 'Populated when offer is accepted and converted to an order.' },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

export const offersPaths: Record<string, unknown> = {

  '/api/v1/offers': {
    get: {
      tags: ['Offers'],
      summary: 'Get my offers (sent or received)',
      operationId: 'getMyOffers',
      security: auth,
      parameters: [
        pageParam, limitParam,
        { name: 'direction', in: 'query', schema: { type: 'string', enum: ['sent', 'received', 'all'], default: 'all' }, description: '`sent` = offers I made; `received` = offers on my listings.' },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'accepted', 'rejected', 'countered', 'withdrawn', 'expired', 'converted_to_order'] } },
        { name: 'listingId', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Offer list.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { type: 'array', items: offerSchema }, meta: { $ref: '#/components/schemas/PaginationMeta' } } }] } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    post: {
      tags: ['Offers'],
      summary: 'Create an offer on a listing',
      description: 'Submit a price/quantity offer to the listing seller. The seller receives a notification.',
      operationId: 'createOffer',
      security: auth,
      requestBody: r({
        type: 'object',
        required: ['listingId', 'offerPrice', 'quantity'],
        properties: {
          listingId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          offerPrice: { type: 'number', minimum: 0.01, description: 'Price per unit.' },
          quantity: { type: 'number', minimum: 0.01 },
          message: { type: 'string', maxLength: 500, description: 'Optional message to the seller.' },
          expiresInHours: { type: 'integer', minimum: 1, maximum: 168, default: 48, description: 'Offer validity in hours.' },
          deliveryOption: { type: 'string', enum: ['pickup', 'delivery', 'any'] },
          deliveryAddress: { type: 'string' },
        },
      }),
      responses: {
        201: { description: 'Offer submitted.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: offerSchema } }] } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { description: 'Listing not found.' },
      },
    },
  },

  '/api/v1/offers/stats': {
    get: {
      tags: ['Offers'],
      summary: 'Get my offer statistics',
      operationId: 'getOfferStats',
      security: auth,
      responses: {
        200: {
          description: 'Offer stats.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  totalSent: { type: 'integer' },
                  totalReceived: { type: 'integer' },
                  pendingSent: { type: 'integer' },
                  pendingReceived: { type: 'integer' },
                  acceptedRate: { type: 'number', description: 'Percentage of sent offers that were accepted.' },
                  averageNegotiationRounds: { type: 'number' },
                },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/offers/{offerId}': {
    get: {
      tags: ['Offers'],
      summary: 'Get offer by ID',
      operationId: 'getOfferById',
      security: auth,
      parameters: [offerIdParam],
      responses: {
        200: { description: 'Offer details.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: offerSchema } }] } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/offers/{offerId}/counter': {
    post: {
      tags: ['Offers'],
      summary: 'Counter an offer',
      description: 'The seller (or buyer in re-counter scenarios) proposes new terms.',
      operationId: 'counterOffer',
      security: auth,
      parameters: [offerIdParam],
      requestBody: r({ type: 'object', required: ['offerPrice', 'quantity'], properties: { offerPrice: { type: 'number', minimum: 0.01 }, quantity: { type: 'number', minimum: 0.01 }, message: { type: 'string', maxLength: 500 } } }),
      responses: {
        200: { description: 'Counter-offer submitted.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/offers/{offerId}/accept': {
    post: {
      tags: ['Offers'],
      summary: 'Accept an offer and create order',
      description: 'Accepting converts the offer into an order and triggers escrow initiation.',
      operationId: 'acceptOffer',
      security: auth,
      parameters: [offerIdParam],
      requestBody: r({ type: 'object', properties: { message: { type: 'string' } } }),
      responses: {
        200: { description: 'Offer accepted. An order has been created.', content: { 'application/json': { schema: { type: 'object', properties: { offerId: { type: 'string' }, orderId: { type: 'string' } } } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/offers/{offerId}/reject': {
    post: {
      tags: ['Offers'],
      summary: 'Reject an offer',
      operationId: 'rejectOffer',
      security: auth,
      parameters: [offerIdParam],
      requestBody: r({ type: 'object', properties: { reason: { type: 'string', maxLength: 300 } } }),
      responses: {
        200: { description: 'Offer rejected.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/offers/{offerId}/withdraw': {
    post: {
      tags: ['Offers'],
      summary: 'Withdraw an offer (buyer only)',
      description: 'Can only be withdrawn while the offer is still pending or countered.',
      operationId: 'withdrawOffer',
      security: auth,
      parameters: [offerIdParam],
      requestBody: r({ type: 'object', properties: { reason: { type: 'string' } } }),
      responses: {
        200: { description: 'Offer withdrawn.' },
        400: { description: 'Offer cannot be withdrawn in its current state.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/offers/{offerId}/messages': {
    post: {
      tags: ['Offers'],
      summary: 'Send a negotiation message',
      operationId: 'addOfferMessage',
      security: auth,
      parameters: [offerIdParam],
      requestBody: r({ type: 'object', required: ['content'], properties: { content: { type: 'string', maxLength: 1000 } } }),
      responses: {
        201: { description: 'Message sent.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/offers/{offerId}/messages/read': {
    put: {
      tags: ['Offers'],
      summary: 'Mark all offer messages as read',
      operationId: 'markOfferMessagesRead',
      security: auth,
      parameters: [offerIdParam],
      responses: {
        200: { description: 'Messages marked as read.' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
};
