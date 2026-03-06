const auth = [{ BearerAuth: [] }];
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };

const invoiceIdParam = {
  name: 'invoiceId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};

const creditIdParam = {
  name: 'creditId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};

const policyIdParam = {
  name: 'policyId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};

const claimIdParam = {
  name: 'claimId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};

const jsonBody = (schema: object) => ({
  required: true,
  content: { 'application/json': { schema } },
});

export const financePaths: Record<string, unknown> = {
  '/api/v1/finance/invoices': {
    get: {
      tags: ['Finance'],
      summary: 'List invoices',
      security: auth,
      parameters: [
        { name: 'organizationId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'issued', 'paid', 'overdue', 'cancelled'] } },
        { name: 'invoiceNumber', in: 'query', schema: { type: 'string' } },
        pageParam,
        limitParam,
      ],
      responses: {
        200: { description: 'Invoices retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    post: {
      tags: ['Finance'],
      summary: 'Create invoice',
      security: auth,
      requestBody: jsonBody({
        type: 'object',
        required: ['customerName', 'dueDate'],
        properties: {
          organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          customerId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          customerName: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                quantity: { type: 'number', minimum: 0.0001 },
                unitPrice: { type: 'number', minimum: 0 },
                lineTotal: { type: 'number', minimum: 0 },
              },
            },
          },
          amount: { type: 'number', minimum: 0 },
          currency: { type: 'string', example: 'UGX' },
          dueDate: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['draft', 'issued', 'paid', 'overdue', 'cancelled'] },
          notes: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
        },
      }),
      responses: {
        201: { description: 'Invoice created.' },
        400: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },

  '/api/v1/finance/invoices/{invoiceId}': {
    get: {
      tags: ['Finance'],
      summary: 'Get invoice',
      security: auth,
      parameters: [invoiceIdParam],
      responses: { 200: { description: 'Invoice retrieved.' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Finance'],
      summary: 'Update invoice',
      description: 'Validates invoice status transitions and returns 400 on invalid transitions.',
      security: auth,
      parameters: [invoiceIdParam],
      requestBody: jsonBody({
        type: 'object',
        properties: {
          customerName: { type: 'string' },
          amount: { type: 'number', minimum: 0 },
          dueDate: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['draft', 'issued', 'paid', 'overdue', 'cancelled'] },
          notes: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
        },
      }),
      responses: { 200: { description: 'Invoice updated.' }, 400: { $ref: '#/components/responses/ValidationError' } },
    },
    delete: {
      tags: ['Finance'],
      summary: 'Delete invoice',
      security: auth,
      parameters: [invoiceIdParam],
      responses: { 200: { description: 'Invoice deleted.' } },
    },
  },

  '/api/v1/finance/invoices/{invoiceId}/export': {
    post: {
      tags: ['Finance'],
      summary: 'Export invoice',
      security: auth,
      parameters: [invoiceIdParam],
      requestBody: jsonBody({
        type: 'object',
        properties: { format: { type: 'string', enum: ['pdf', 'csv', 'json'] } },
      }),
      responses: { 200: { description: 'Invoice export generated.' } },
    },
  },

  '/api/v1/finance/credits': {
    get: {
      tags: ['Finance'],
      summary: 'List credits',
      security: auth,
      parameters: [
        { name: 'organizationId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['applied', 'under_review', 'approved', 'rejected', 'disbursed'] } },
        { name: 'referenceCode', in: 'query', schema: { type: 'string' } },
        pageParam,
        limitParam,
      ],
      responses: { 200: { description: 'Credits retrieved.' } },
    },
    post: {
      tags: ['Finance'],
      summary: 'Create credit application',
      security: auth,
      requestBody: jsonBody({
        type: 'object',
        required: ['applicantName', 'amountRequested'],
        properties: {
          organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          applicantId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          applicantName: { type: 'string' },
          amountRequested: { type: 'number', minimum: 0.01 },
          currency: { type: 'string', example: 'UGX' },
          purpose: { type: 'string' },
          termMonths: { type: 'integer', minimum: 1 },
          interestRate: { type: 'number', minimum: 0, maximum: 100 },
          status: { type: 'string', enum: ['applied', 'under_review', 'approved', 'rejected', 'disbursed'] },
          notes: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
        },
      }),
      responses: { 201: { description: 'Credit application created.' } },
    },
  },

  '/api/v1/finance/credits/{creditId}': {
    get: {
      tags: ['Finance'],
      summary: 'Get credit',
      security: auth,
      parameters: [creditIdParam],
      responses: { 200: { description: 'Credit retrieved.' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Finance'],
      summary: 'Update credit',
      description: 'Validates credit status transitions and returns 400 on invalid transitions.',
      security: auth,
      parameters: [creditIdParam],
      requestBody: jsonBody({
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['applied', 'under_review', 'approved', 'rejected', 'disbursed'] },
          amountApproved: { type: 'number', minimum: 0.01 },
          rejectionReason: { type: 'string' },
          notes: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
        },
      }),
      responses: { 200: { description: 'Credit updated.' }, 400: { $ref: '#/components/responses/ValidationError' } },
    },
    delete: {
      tags: ['Finance'],
      summary: 'Delete credit',
      security: auth,
      parameters: [creditIdParam],
      responses: { 200: { description: 'Credit deleted.' } },
    },
  },

  '/api/v1/finance/credits/{creditId}/approve': {
    post: {
      tags: ['Finance'],
      summary: 'Approve credit',
      security: auth,
      parameters: [creditIdParam],
      requestBody: jsonBody({ type: 'object', properties: { amountApproved: { type: 'number', minimum: 0.01 } } }),
      responses: { 200: { description: 'Credit approved.' }, 400: { $ref: '#/components/responses/ValidationError' } },
    },
  },

  '/api/v1/finance/credits/{creditId}/reject': {
    post: {
      tags: ['Finance'],
      summary: 'Reject credit',
      security: auth,
      parameters: [creditIdParam],
      requestBody: jsonBody({ type: 'object', properties: { reason: { type: 'string' }, rejectionReason: { type: 'string' } } }),
      responses: { 200: { description: 'Credit rejected.' }, 400: { $ref: '#/components/responses/ValidationError' } },
    },
  },

  '/api/v1/finance/credits/{creditId}/disburse': {
    post: {
      tags: ['Finance'],
      summary: 'Disburse credit',
      security: auth,
      parameters: [creditIdParam],
      responses: { 200: { description: 'Credit disbursed.' }, 400: { $ref: '#/components/responses/ValidationError' } },
    },
  },

  '/api/v1/finance/insurance/policies': {
    get: {
      tags: ['Finance'],
      summary: 'List insurance policies',
      security: auth,
      parameters: [
        { name: 'organizationId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'claim_open', 'claim_resolved', 'expired'] } },
        { name: 'policyNumber', in: 'query', schema: { type: 'string' } },
        pageParam,
        limitParam,
      ],
      responses: { 200: { description: 'Insurance policies retrieved.' } },
    },
    post: {
      tags: ['Finance'],
      summary: 'Create insurance policy',
      security: auth,
      requestBody: jsonBody({
        type: 'object',
        required: ['insuredEntityName', 'providerName', 'coverageType', 'premiumAmount', 'coverageAmount', 'startDate', 'endDate'],
        properties: {
          organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          insuredEntityId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          insuredEntityName: { type: 'string' },
          providerName: { type: 'string' },
          coverageType: { type: 'string' },
          premiumAmount: { type: 'number', minimum: 0 },
          coverageAmount: { type: 'number', minimum: 0 },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['active', 'claim_open', 'claim_resolved', 'expired'] },
          notes: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
        },
      }),
      responses: { 201: { description: 'Insurance policy created.' } },
    },
  },

  '/api/v1/finance/insurance/policies/{policyId}': {
    get: {
      tags: ['Finance'],
      summary: 'Get insurance policy',
      security: auth,
      parameters: [policyIdParam],
      responses: { 200: { description: 'Insurance policy retrieved.' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Finance'],
      summary: 'Update insurance policy',
      description: 'Validates insurance policy status transitions and returns 400 on invalid transitions.',
      security: auth,
      parameters: [policyIdParam],
      requestBody: jsonBody({
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'claim_open', 'claim_resolved', 'expired'] },
          notes: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
        },
      }),
      responses: { 200: { description: 'Insurance policy updated.' }, 400: { $ref: '#/components/responses/ValidationError' } },
    },
    delete: {
      tags: ['Finance'],
      summary: 'Delete insurance policy',
      security: auth,
      parameters: [policyIdParam],
      responses: { 200: { description: 'Insurance policy deleted.' } },
    },
  },

  '/api/v1/finance/insurance/policies/{policyId}/claims': {
    post: {
      tags: ['Finance'],
      summary: 'Create insurance claim',
      security: auth,
      parameters: [policyIdParam],
      requestBody: jsonBody({
        type: 'object',
        required: ['amountClaimed', 'reason'],
        properties: {
          amountClaimed: { type: 'number', minimum: 0.01 },
          reason: { type: 'string' },
          status: { type: 'string', enum: ['open', 'under_review', 'resolved', 'rejected'] },
          metadata: { type: 'object', additionalProperties: true },
        },
      }),
      responses: { 201: { description: 'Insurance claim created.' } },
    },
  },

  '/api/v1/finance/insurance/claims/{claimId}': {
    patch: {
      tags: ['Finance'],
      summary: 'Update insurance claim',
      description: 'Validates claim status transitions and syncs policy status changes.',
      security: auth,
      parameters: [claimIdParam],
      requestBody: jsonBody({
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['open', 'under_review', 'resolved', 'rejected'] },
          amountApproved: { type: 'number', minimum: 0 },
          resolutionNote: { type: 'string' },
          reason: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
        },
      }),
      responses: { 200: { description: 'Insurance claim updated.' }, 400: { $ref: '#/components/responses/ValidationError' } },
    },
  },
};
