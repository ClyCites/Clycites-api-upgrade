
const auth = [{ BearerAuth: [] }];
const r = (schema: object) => ({ required: true, content: { 'application/json': { schema } } });
const idParam = { $ref: '#/components/parameters/mongoIdPath' };
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };

export const ordersPaths: Record<string, unknown> = {

  '/api/v1/orders': {
    post: {
      tags: ['Orders'],
      summary: 'Place order',
      description: 'Create a new order from a marketplace listing. Requires `buyer` or `farmer` role.',
      operationId: 'createOrder',
      security: auth,
      requestBody: r({ $ref: '#/components/schemas/OrderCreateRequest' }),
      responses: {
        201: { description: 'Order placed.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Order' } } }] } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { description: 'Listing not found or no longer active.' },
      },
    },
  },

  '/api/v1/orders/my-orders': {
    get: {
      tags: ['Orders'],
      summary: 'List my orders',
      description: 'Returns orders where the authenticated user is buyer or farmer.',
      operationId: 'listMyOrders',
      security: auth,
      parameters: [
        pageParam, limitParam,
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'role', in: 'query', schema: { type: 'string', enum: ['buyer', 'seller'] }, description: 'Filter by your role in the order.' },
      ],
      responses: { 200: { description: 'My orders.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/orders/my-stats': {
    get: {
      tags: ['Orders'],
      summary: 'Get my order statistics',
      operationId: 'getMyOrderStats',
      security: auth,
      responses: { 200: { description: 'Order stats (total, pending, completed, cancelled, revenue).' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/orders/farmer/orders': {
    get: {
      tags: ['Orders'],
      summary: 'List orders as farmer/seller',
      description: 'Returns incoming orders for products the authenticated farmer has listed.',
      operationId: 'getFarmerOrders',
      security: auth,
      parameters: [
        pageParam, limitParam,
        { name: 'status', in: 'query', schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Farmer orders.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/orders/{id}': {
    get: {
      tags: ['Orders'],
      summary: 'Get order by ID',
      operationId: 'getOrder',
      security: auth,
      parameters: [idParam],
      responses: {
        200: { description: 'Order details.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Order' } } }] } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/orders/{id}/status': {
    patch: {
      tags: ['Orders'],
      summary: 'Update order status',
      description: 'Transition order through its lifecycle (confirm, ship, deliver, complete, cancel). Requires farmer or admin role.',
      operationId: 'updateOrderStatus',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'] }, reason: { type: 'string', description: 'Required when cancelling.' } } }),
      responses: { 200: { description: 'Status updated.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/orders/{id}/confirm-delivery': {
    post: {
      tags: ['Orders'],
      summary: 'Confirm delivery',
      description: 'Buyer confirms receipt of goods. Triggers payment release from escrow.',
      operationId: 'confirmDelivery',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { rating: { type: 'number', minimum: 1, maximum: 5 }, review: { type: 'string' } } }),
      responses: { 200: { description: 'Delivery confirmed. Payment released.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  '/api/v1/orders/{id}/cancel': {
    post: {
      tags: ['Orders'],
      summary: 'Cancel order',
      operationId: 'cancelOrder',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['reason'], properties: { reason: { type: 'string', minLength: 10 } } }),
      responses: { 200: { description: 'Order cancelled.' }, 400: { description: 'Order cannot be cancelled in current status.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/orders/{id}/timeline': {
    get: {
      tags: ['Orders'],
      summary: 'Get order status timeline',
      description: 'Returns the immutable status change audit trail for an order.',
      operationId: 'getOrderTimeline',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Timeline entries.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },
};

export const disputesPaths: Record<string, unknown> = {

  '/api/v1/disputes': {
    post: {
      tags: ['Disputes'],
      summary: 'Raise a dispute',
      description: 'Open a dispute on an order. Either buyer or seller can raise.',
      operationId: 'createDispute',
      security: auth,
      requestBody: r({ $ref: '#/components/schemas/DisputeCreateRequest' }),
      responses: {
        201: { description: 'Dispute opened.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Dispute' } } }] } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    get: {
      tags: ['Disputes'],
      summary: 'My disputes',
      operationId: 'listMyDisputes',
      security: auth,
      parameters: [pageParam, limitParam, { name: 'status', in: 'query', schema: { type: 'string' } }],
      responses: { 200: { description: 'My disputes.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/disputes/{id}': {
    get: {
      tags: ['Disputes'],
      summary: 'Get dispute by ID',
      operationId: 'getDispute',
      security: auth,
      parameters: [idParam],
      responses: {
        200: { description: 'Dispute.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Dispute' } } }] } } } },
        401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/disputes/{id}/evidence': {
    post: {
      tags: ['Disputes'],
      summary: 'Submit evidence',
      operationId: 'submitEvidence',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['evidenceUrls'], properties: { evidenceUrls: { type: 'array', items: { type: 'string', format: 'uri' } }, description: { type: 'string' } } }),
      responses: { 200: { description: 'Evidence added.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/disputes/{id}/resolve': {
    post: {
      tags: ['Disputes', 'Admin'],
      summary: 'Resolve dispute',
      description: 'Admin/mediator closes the dispute with a resolution.',
      operationId: 'resolveDispute',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['resolution', 'outcome'], properties: { resolution: { type: 'string', minLength: 20 }, outcome: { type: 'string', enum: ['buyer_favor', 'seller_favor', 'partial_refund', 'no_action'] }, refundAmount: { type: 'number' } } }),
      responses: { 200: { description: 'Dispute resolved.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/disputes/{id}/escalate': {
    post: {
      tags: ['Disputes'],
      summary: 'Escalate dispute',
      description: 'Escalate to platform admin if mediation fails.',
      operationId: 'escalateDispute',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['reason'], properties: { reason: { type: 'string' } } }),
      responses: { 200: { description: 'Dispute escalated.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/disputes/{id}/messages': {
    get: {
      tags: ['Disputes'],
      summary: 'Get dispute thread messages',
      operationId: 'getDisputeMessages',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Mediation messages.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
    post: {
      tags: ['Disputes'],
      summary: 'Send message in dispute thread',
      operationId: 'sendDisputeMessage',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['message'], properties: { message: { type: 'string' } } }),
      responses: { 201: { description: 'Message sent.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/disputes/admin/all': {
    get: {
      tags: ['Disputes', 'Admin'],
      summary: 'List all disputes (admin)',
      operationId: 'adminListDisputes',
      security: auth,
      parameters: [pageParam, limitParam, { name: 'status', in: 'query', schema: { type: 'string' } }],
      responses: { 200: { description: 'All disputes.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/disputes/admin/stats': {
    get: {
      tags: ['Disputes', 'Admin'],
      summary: 'Get dispute statistics (admin)',
      operationId: 'getDisputeStats',
      security: auth,
      responses: { 200: { description: 'Dispute stats by status, type, and resolution rate.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/disputes/{id}/review': {
    post: {
      tags: ['Disputes', 'Admin'],
      summary: 'Review dispute (admin note)',
      description: 'Admin adds a review note to the dispute.',
      operationId: 'reviewDispute',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['note'], properties: { note: { type: 'string', minLength: 10 } } }),
      responses: { 200: { description: 'Review note added.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/disputes/{id}/mediator': {
    post: {
      tags: ['Disputes', 'Admin'],
      summary: 'Assign mediator to dispute',
      description: 'Admin assigns a mediator (expert or admin user) to help resolve the dispute.',
      operationId: 'assignMediator',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['mediatorId'], properties: { mediatorId: { type: 'string', pattern: '^[a-f0-9]{24}$' }, note: { type: 'string' } } }),
      responses: { 200: { description: 'Mediator assigned.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/disputes/{id}/close': {
    post: {
      tags: ['Disputes', 'Admin'],
      summary: 'Close dispute',
      description: 'Admin administratively closes the dispute.',
      operationId: 'closeDispute',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['note'], properties: { note: { type: 'string', minLength: 10 } } }),
      responses: { 200: { description: 'Dispute closed.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },
};
