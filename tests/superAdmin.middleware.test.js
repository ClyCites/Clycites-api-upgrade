const { requireSuperAdmin, isSuperAdminRole } = require('../dist/common/middleware/superAdmin');
const { BadRequestError, ForbiddenError, UnauthorizedError } = require('../dist/common/errors/AppError');

const createResponse = () => ({});

describe('superAdmin middleware', () => {
  test('only super_admin is treated as Super Admin role', () => {
    expect(isSuperAdminRole('super_admin')).toBe(true);
    expect(isSuperAdminRole('platform_admin')).toBe(false);
  });

  test('requires authentication', () => {
    const middleware = requireSuperAdmin();
    const req = { headers: {} };
    const next = jest.fn();

    middleware(req, createResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  test('rejects non-super-admin role', () => {
    const middleware = requireSuperAdmin();
    const req = {
      user: { id: 'u-1', role: 'platform_admin', superAdminScopes: ['*'] },
      headers: {
        'x-super-admin-mode': 'true',
        'x-super-admin-reason': 'Need global export',
      },
    };
    const next = jest.fn();

    middleware(req, createResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
  });

  test('requires explicit mode and reason for super-admin actions', () => {
    const middleware = requireSuperAdmin();
    const req = {
      user: { id: 'u-1', role: 'super_admin', superAdminScopes: ['*'] },
      headers: {},
    };
    const next = jest.fn();

    middleware(req, createResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(BadRequestError);
  });

  test('enforces required scope when provided', () => {
    const middleware = requireSuperAdmin(['super_admin:analytics:global']);
    const req = {
      user: { id: 'u-1', role: 'super_admin', superAdminScopes: ['super_admin:rbac:override'] },
      headers: {
        'x-super-admin-mode': 'true',
        'x-super-admin-reason': 'Global audit investigation',
      },
    };
    const next = jest.fn();

    middleware(req, createResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
  });

  test('allows valid super-admin mode with matching scope', () => {
    const middleware = requireSuperAdmin(['super_admin:analytics:global']);
    const req = {
      user: { id: 'u-1', role: 'super_admin', superAdminScopes: ['super_admin:analytics:global'] },
      headers: {
        'x-super-admin-mode': 'true',
        'x-super-admin-reason': 'Need global analytics export',
      },
    };
    const next = jest.fn();

    middleware(req, createResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
  });
});
