const express = require('express');
const request = require('supertest');

const mockAuthService = {
  listRegistrationRoles: jest.fn(),
};

jest.mock('../dist/modules/auth/auth.service', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockAuthService),
}));

const authRoutes = require('../dist/modules/auth/auth.routes').default;

describe('Public registration roles route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/v1/auth/register/roles returns public self-registration roles without auth', async () => {
    mockAuthService.listRegistrationRoles.mockResolvedValue([
      {
        role: 'farmer',
        label: 'Farmer',
        description: 'Individual farmer with personal workspace - can operate independently without organization',
        isDefault: true,
      },
      {
        role: 'buyer',
        label: 'Buyer',
        description: 'Marketplace buyer - can browse and purchase products',
        isDefault: false,
      },
    ]);

    const app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRoutes);
    app.use((err, _req, res, _next) => {
      res.status(err.statusCode || 500).json({
        success: false,
        error: {
          code: err.code || 'INTERNAL_ERROR',
          message: err.message,
        },
      });
    });

    const response = await request(app).get('/api/v1/auth/register/roles');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Registration roles retrieved');
    expect(response.body.data).toEqual([
      expect.objectContaining({
        role: 'farmer',
        label: 'Farmer',
        isDefault: true,
      }),
      expect.objectContaining({
        role: 'buyer',
        label: 'Buyer',
        isDefault: false,
      }),
    ]);
    expect(mockAuthService.listRegistrationRoles).toHaveBeenCalledTimes(1);
  });
});
