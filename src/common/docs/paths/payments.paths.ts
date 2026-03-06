const auth = [{ BearerAuth: [] }];
const r = (s: object) => ({ required: true, content: { 'application/json': { schema: s } } });
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };
const escrowIdParam = { name: 'escrowId', in: 'path' as const, required: true, schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' } };
const payoutIdParam = { name: 'payoutId', in: 'path' as const, required: true, schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' } };

const walletSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    user: { type: 'string' },
    balance: { type: 'number', description: 'Wallet balance.' },
    escrowBalance: { type: 'number' },
    availableBalance: { type: 'number' },
    currency: { type: 'string', example: 'UGX' },
    status: { type: 'string', enum: ['active', 'suspended', 'frozen', 'closed'] },
    uiStatus: { type: 'string', enum: ['active', 'frozen'] },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const transactionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    type: { type: 'string', enum: ['deposit', 'withdrawal', 'payment', 'refund', 'escrow_hold', 'escrow_release', 'fee', 'commission', 'transfer'] },
    amount: { type: 'number' },
    currency: { type: 'string' },
    status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed', 'reversed', 'cancelled'] },
    uiStatus: { type: 'string', enum: ['pending', 'completed', 'failed', 'reversed'] },
    reference: { type: 'string' },
    description: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

const escrowSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    orderId: { type: 'string' },
    buyerId: { type: 'string' },
    sellerId: { type: 'string' },
    amount: { type: 'number' },
    currency: { type: 'string' },
    status: { type: 'string', enum: ['initiated', 'funded', 'held', 'released', 'refunded', 'disputed'] },
    uiStatus: { type: 'string', enum: ['created', 'funded', 'released', 'refunded', 'closed'] },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

const payoutSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    amount: { type: 'number' },
    currency: { type: 'string', example: 'UGX' },
    method: { type: 'string', enum: ['bank_transfer', 'mobile_money', 'cash'] },
    status: { type: 'string', enum: ['requested', 'processing', 'paid', 'failed'] },
    uiStatus: { type: 'string', enum: ['requested', 'processing', 'paid', 'failed'] },
    reference: { type: 'string' },
    failureReason: { type: 'string' },
    requestedAt: { type: 'string', format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

export const paymentsPaths: Record<string, unknown> = {

  // ─── Wallet ───────────────────────────────────────────────────────────────────

  '/api/v1/payments/wallet': {
    get: {
      tags: ['Payments'],
      summary: 'Get my wallet',
      description: 'Returns wallet status plus canonical `uiStatus` (`active|frozen`) and safe workflow hints.',
      operationId: 'getWallet',
      security: auth,
      responses: {
        200: { description: 'Wallet details.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: walletSchema } }] } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/payments/wallet/deposit': {
    post: {
      tags: ['Payments'],
      summary: 'Initiate wallet deposit',
      description: 'Returns a payment URL / reference for the chosen gateway (Flutterwave, Paystack, MTN MoMo, Airtel Money).',
      operationId: 'depositFunds',
      security: auth,
      requestBody: r({
        type: 'object',
        required: ['amount', 'paymentMethod'],
        properties: {
          amount: { type: 'number', minimum: 1, description: 'Amount in USD.' },
          paymentMethod: { type: 'string', enum: ['flutterwave', 'paystack', 'mtn_momo', 'airtel_money', 'bank_transfer'] },
          reference: { type: 'string', description: 'Optional idempotency reference.' },
          currency: { type: 'string', example: 'UGX', description: 'Local currency to charge in.' },
          phoneNumber: { type: 'string', description: 'Required for mobile money methods.' },
        },
      }),
      responses: {
        200: { description: 'Payment initiation response with checkout URL or USSD code.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/payments/wallet/withdraw': {
    post: {
      tags: ['Payments'],
      summary: 'Initiate wallet withdrawal',
      operationId: 'withdrawFunds',
      security: auth,
      requestBody: r({
        type: 'object',
        required: ['amount', 'withdrawalMethod', 'accountDetails'],
        properties: {
          amount: { type: 'number', minimum: 1 },
          withdrawalMethod: { type: 'string', enum: ['bank_transfer', 'mtn_momo', 'airtel_money'] },
          accountDetails: {
            type: 'object',
            description: 'Bank account or mobile money details.',
            properties: {
              bankCode: { type: 'string' },
              accountNumber: { type: 'string' },
              phoneNumber: { type: 'string' },
              accountName: { type: 'string' },
            },
          },
        },
      }),
      responses: {
        200: { description: 'Withdrawal initiated.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  // ─── Transactions ─────────────────────────────────────────────────────────────

  '/api/v1/payments/transactions': {
    get: {
      tags: ['Payments'],
      summary: 'Get my transaction history',
      description: 'Supports native `status` filters and canonical UI mapping via `uiStatus`.',
      operationId: 'getTransactions',
      security: auth,
      parameters: [
        pageParam, limitParam,
        { name: 'type', in: 'query', schema: { type: 'string', enum: ['deposit', 'withdrawal', 'payment', 'refund', 'escrow_hold', 'escrow_release', 'fee', 'commission', 'transfer'] } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed', 'reversed', 'cancelled'] } },
        { name: 'uiStatus', in: 'query', schema: { type: 'string', enum: ['pending', 'completed', 'failed', 'reversed'] } },
        { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
      ],
      responses: {
        200: {
          description: 'Transaction list.',
          content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { type: 'object', properties: { transactions: { type: 'array', items: transactionSchema }, pagination: { $ref: '#/components/schemas/PaginationMeta' } } }, meta: { type: 'object', properties: { pagination: { $ref: '#/components/schemas/PaginationMeta' } } } } }] } } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  // ─── Escrow ───────────────────────────────────────────────────────────────────

  '/api/v1/payments/escrow/initiate': {
    post: {
      tags: ['Payments'],
      summary: 'Initiate order escrow',
      description: 'Locks the buyer\'s wallet funds in escrow for the specified order.',
      operationId: 'initiateEscrow',
      security: auth,
      requestBody: r({ type: 'object', required: ['orderId', 'sellerId', 'amount'], properties: { orderId: { type: 'string', pattern: '^[a-f0-9]{24}$' }, sellerId: { type: 'string', pattern: '^[a-f0-9]{24}$' }, amount: { type: 'number', minimum: 0.01 } } }),
      responses: {
        201: { description: 'Escrow created.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: escrowSchema } }] } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/payments/escrow': {
    get: {
      tags: ['Payments'],
      summary: 'List my escrows',
      operationId: 'getUserEscrows',
      security: auth,
      parameters: [pageParam, limitParam, { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'released', 'refunded', 'disputed', 'all', 'created', 'funded', 'closed', 'initiated', 'held'] } }],
      responses: {
        200: { description: 'Escrow list.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { type: 'array', items: escrowSchema } } }] } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/payments/escrow/{escrowId}': {
    get: {
      tags: ['Payments'],
      summary: 'Get escrow details',
      operationId: 'getEscrowDetails',
      security: auth,
      parameters: [escrowIdParam],
      responses: {
        200: { description: 'Escrow details.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: escrowSchema } }] } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/payments/escrow/{escrowId}/release': {
    post: {
      tags: ['Payments'],
      summary: 'Release escrow to seller',
      description: 'Buyer or admin can release funds after confirming delivery.',
      operationId: 'releaseEscrow',
      security: auth,
      parameters: [escrowIdParam],
      requestBody: r({ type: 'object', properties: { releaseReason: { type: 'string' } } }),
      responses: {
        200: { description: 'Escrow released.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/payments/escrow/{escrowId}/refund': {
    post: {
      tags: ['Payments'],
      summary: 'Refund escrow to buyer',
      description: 'Refunds the locked funds back to the buyer. Requires seller agreement or admin override.',
      operationId: 'refundEscrow',
      security: auth,
      parameters: [escrowIdParam],
      requestBody: r({ type: 'object', properties: { refundReason: { type: 'string' } } }),
      responses: {
        200: { description: 'Escrow refunded.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  // ─── Payouts ────────────────────────────────────────────────────────────────

  '/api/v1/payments/payouts': {
    get: {
      tags: ['Payments'],
      summary: 'List payouts',
      operationId: 'listPayouts',
      security: auth,
      parameters: [
        pageParam,
        limitParam,
        { name: 'organizationId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['requested', 'processing', 'paid', 'failed'] } },
        { name: 'method', in: 'query', schema: { type: 'string', enum: ['bank_transfer', 'mobile_money', 'cash'] } },
      ],
      responses: {
        200: { description: 'Payouts retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    post: {
      tags: ['Payments'],
      summary: 'Create payout',
      operationId: 'createPayout',
      security: auth,
      requestBody: r({
        type: 'object',
        required: ['amount'],
        properties: {
          organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          amount: { type: 'number', minimum: 0.01 },
          method: { type: 'string', enum: ['bank_transfer', 'mobile_money', 'cash'] },
          accountDetails: { type: 'object', additionalProperties: true },
          reference: { type: 'string' },
          notes: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
        },
      }),
      responses: {
        201: { description: 'Payout created.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/payments/payouts/{payoutId}': {
    get: {
      tags: ['Payments'],
      summary: 'Get payout',
      operationId: 'getPayout',
      security: auth,
      parameters: [payoutIdParam],
      responses: {
        200: { description: 'Payout retrieved.', content: { 'application/json': { schema: payoutSchema } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Payments'],
      summary: 'Update payout',
      description: 'Validates payout status transitions and returns 400 on invalid transitions.',
      operationId: 'updatePayout',
      security: auth,
      parameters: [payoutIdParam],
      requestBody: r({
        type: 'object',
        properties: {
          method: { type: 'string', enum: ['bank_transfer', 'mobile_money', 'cash'] },
          accountDetails: { type: 'object', additionalProperties: true },
          reference: { type: 'string' },
          status: { type: 'string', enum: ['requested', 'processing', 'paid', 'failed'] },
          failureReason: { type: 'string' },
          notes: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
        },
      }),
      responses: {
        200: { description: 'Payout updated.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
    delete: {
      tags: ['Payments'],
      summary: 'Delete payout',
      operationId: 'deletePayout',
      security: auth,
      parameters: [payoutIdParam],
      responses: {
        200: { description: 'Payout deleted.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/payments/payouts/{payoutId}/approve': {
    post: {
      tags: ['Payments'],
      summary: 'Approve payout',
      description: 'Marks payout as paid and updates linked transaction status.',
      operationId: 'approvePayout',
      security: auth,
      parameters: [payoutIdParam],
      responses: {
        200: { description: 'Payout approved.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/payments/payouts/{payoutId}/fail': {
    post: {
      tags: ['Payments'],
      summary: 'Fail payout',
      description: 'Marks payout as failed, updates linked transaction, and reverses wallet debit.',
      operationId: 'failPayout',
      security: auth,
      parameters: [payoutIdParam],
      requestBody: r({
        type: 'object',
        properties: {
          reason: { type: 'string' },
        },
      }),
      responses: {
        200: { description: 'Payout marked as failed.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  // ─── Payment Webhooks ─────────────────────────────────────────────────────────

  '/api/v1/payments/webhook/{provider}': {
    post: {
      tags: ['Payments'],
      summary: 'Payment gateway webhook',
      description: 'Receives payment status callbacks from external gateways. Each provider uses HMAC signature verification.',
      operationId: 'handleWebhook',
      parameters: [{ name: 'provider', in: 'path', required: true, schema: { type: 'string', enum: ['flutterwave', 'mtn', 'airtel', 'paystack'] } }],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', description: 'Provider-specific payload.' } } } },
      responses: {
        200: { description: 'Webhook acknowledged.' },
        400: { description: 'Invalid signature.' },
      },
    },
  },
};
