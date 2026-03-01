jest.mock('../dist/modules/admin/platformControl.service', () => ({
  __esModule: true,
  default: {
    getFeatureFlags: jest.fn(),
  },
}));

const PlatformControlService = require('../dist/modules/admin/platformControl.service').default;
const { blockWhenFeatureFlagEnabled, clearFeatureFlagGuardCache } = require('../dist/common/middleware/featureFlagGuard');
const { BadRequestError, ForbiddenError } = require('../dist/common/errors/AppError');

describe('featureFlagGuard middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearFeatureFlagGuardCache();
  });

  test('allows request when feature flag is disabled', async () => {
    PlatformControlService.getFeatureFlags.mockResolvedValue({ priceFreeze: false });

    const middleware = blockWhenFeatureFlagEnabled('priceFreeze', {
      overrideScope: 'super_admin:pricing:override',
      message: 'Price updates are frozen',
    });

    const req = { headers: {}, user: { id: 'u-1', role: 'admin' }, body: {}, params: {} };
    const next = jest.fn();

    await middleware(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
  });

  test('blocks non-super-admin when feature flag is enabled', async () => {
    PlatformControlService.getFeatureFlags.mockResolvedValue({ priceFreeze: true });

    const middleware = blockWhenFeatureFlagEnabled('priceFreeze', {
      overrideScope: 'super_admin:pricing:override',
      message: 'Price updates are frozen',
    });

    const req = { headers: {}, user: { id: 'u-1', role: 'admin' }, body: {}, params: {} };
    const next = jest.fn();

    await middleware(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
  });

  test('allows scoped super-admin override in explicit mode', async () => {
    PlatformControlService.getFeatureFlags.mockResolvedValue({ priceFreeze: true });

    const middleware = blockWhenFeatureFlagEnabled('priceFreeze', {
      overrideScope: 'super_admin:pricing:override',
      message: 'Price updates are frozen',
    });

    const req = {
      headers: {
        'x-super-admin-mode': 'true',
        'x-super-admin-reason': 'Emergency market stabilization',
      },
      user: {
        id: 's-1',
        role: 'super_admin',
        superAdminScopes: ['super_admin:pricing:override'],
      },
      body: {},
      params: {},
    };
    const next = jest.fn();

    await middleware(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
  });

  test('rejects super-admin override without reason', async () => {
    PlatformControlService.getFeatureFlags.mockResolvedValue({ priceFreeze: true });

    const middleware = blockWhenFeatureFlagEnabled('priceFreeze', {
      overrideScope: 'super_admin:pricing:override',
      message: 'Price updates are frozen',
    });

    const req = {
      headers: { 'x-super-admin-mode': 'true' },
      user: {
        id: 's-1',
        role: 'super_admin',
        superAdminScopes: ['super_admin:pricing:override'],
      },
      body: {},
      params: {},
    };
    const next = jest.fn();

    await middleware(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(BadRequestError);
  });
});
