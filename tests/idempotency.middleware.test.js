const { createHash } = require('crypto');

jest.mock('../dist/common/models/idempotencyKey.model', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

const IdempotencyKey = require('../dist/common/models/idempotencyKey.model').default;
const { enforceIdempotency } = require('../dist/common/middleware/idempotency');
const { BadRequestError } = require('../dist/common/errors/AppError');

const createResponseMock = () => ({
  locals: { requestId: 'req-test-1' },
  statusCode: 200,
  payload: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.payload = body;
    return this;
  },
});

describe('enforceIdempotency middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns validation error when Idempotency-Key header is missing', async () => {
    const middleware = enforceIdempotency();
    const req = {
      headers: {},
      body: {},
      method: 'POST',
      originalUrl: '/api/v1/orders',
      user: { id: 'user-1' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(BadRequestError);
  });

  test('replays stored response for a completed idempotent request', async () => {
    const middleware = enforceIdempotency();
    const requestBody = { listingId: 'abc123', quantity: 20 };
    const requestHash = createHash('sha256').update(JSON.stringify(requestBody)).digest('hex');

    IdempotencyKey.findOne.mockResolvedValue({
      requestHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      status: 'completed',
      responseStatus: 201,
      responseBody: {
        success: true,
        data: { orderId: 'ord-1' },
        meta: { requestId: 'old-request-id' },
      },
    });

    const req = {
      headers: { 'idempotency-key': 'idem-key-12345678' },
      body: requestBody,
      method: 'POST',
      originalUrl: '/api/v1/orders',
      user: { id: 'user-1' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    expect(res.payload.meta.idempotencyReplayed).toBe(true);
    expect(res.payload.meta.requestId).toBe('req-test-1');
  });
});
