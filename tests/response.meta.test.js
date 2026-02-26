const { ResponseHandler } = require('../dist/common/utils/response');

const createResponseMock = (requestOverrides = {}) => {
  const response = {
    locals: { requestId: 'req-123' },
    req: {
      requestId: 'req-123',
      user: requestOverrides.user,
      ...requestOverrides,
    },
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
  };

  return response;
};

describe('ResponseHandler metadata', () => {
  test('includes requestId and impersonatedUserId in success responses', () => {
    const res = createResponseMock({
      user: { id: 'target-user', impersonatedBy: 'super-admin-user' },
    });

    ResponseHandler.success(res, { ok: true }, 'ok');

    expect(res.payload.success).toBe(true);
    expect(res.payload.meta.requestId).toBe('req-123');
    expect(res.payload.meta.impersonatedUserId).toBe('target-user');
  });

  test('includes requestId in error responses', () => {
    const res = createResponseMock();

    ResponseHandler.error(res, 'Failure', 500, 'INTERNAL_ERROR');

    expect(res.statusCode).toBe(500);
    expect(res.payload.success).toBe(false);
    expect(res.payload.meta.requestId).toBe('req-123');
  });
});
