const { authorize } = require('../dist/common/middleware/authorize');
const { BadRequestError, ForbiddenError, UnauthorizedError } = require('../dist/common/errors/AppError');

const createResponse = () => ({});

describe('authorize middleware', () => {
  test('returns UnauthorizedError when user is missing', () => {
    const middleware = authorize('admin');
    const req = { headers: {}, body: {}, params: {} };
    const next = jest.fn();

    middleware(req, createResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  test('allows super admin override with explicit mode and reason', () => {
    const middleware = authorize('farmer');
    const req = {
      user: { id: 'actor-1', role: 'super_admin', superAdminScopes: ['super_admin:rbac:override'] },
      headers: {
        'x-super-admin-mode': 'true',
        'x-super-admin-reason': 'Emergency listing takedown',
      },
      body: {},
      params: {},
    };
    const next = jest.fn();

    middleware(req, createResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
  });

  test('rejects override mode when reason is missing', () => {
    const middleware = authorize('farmer');
    const req = {
      user: { id: 'actor-1', role: 'super_admin', superAdminScopes: ['super_admin:rbac:override'] },
      headers: { 'x-super-admin-mode': 'true' },
      body: {},
      params: {},
    };
    const next = jest.fn();

    middleware(req, createResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(BadRequestError);
  });

  test('returns ForbiddenError when role does not match and no override', () => {
    const middleware = authorize('admin');
    const req = {
      user: { id: 'u-1', role: 'farmer' },
      headers: {},
      body: {},
      params: {},
    };
    const next = jest.fn();

    middleware(req, createResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
  });
});
