const mockService = {
  submitForVerification: jest.fn(),
  verifyFarmer: jest.fn(),
  listFarmers: jest.fn(),
};

jest.mock('../dist/modules/farmers/farmersEnterprise.service', () => ({
  __esModule: true,
  default: mockService,
}));

const controller = require('../dist/modules/farmers/farmersEnterprise.controller').default;

const createResponseMock = (req) => ({
  locals: { requestId: 'req-123' },
  req,
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

describe('FarmersEnterpriseController verification response contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('submitForVerification responds with { success, data }', async () => {
    const req = {
      params: { id: '507f1f77bcf86cd799439012' },
      body: { notes: 'Ready for verification' },
      user: { id: '507f1f77bcf86cd799439011', role: 'platform_admin' },
    };
    const res = createResponseMock(req);
    const next = jest.fn();
    const profile = {
      _id: '507f1f77bcf86cd799439012',
      verificationStatus: 'submitted',
    };

    mockService.submitForVerification.mockResolvedValue(profile);

    await controller.submitForVerification(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockService.submitForVerification).toHaveBeenCalledTimes(1);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data).toEqual(profile);
  });

  test('verifyProfile responds with { success, data }', async () => {
    const req = {
      params: { id: '507f1f77bcf86cd799439012' },
      body: { status: 'verified', reason: 'Identity checks passed' },
      user: { id: '507f1f77bcf86cd799439011', role: 'platform_admin' },
    };
    const res = createResponseMock(req);
    const next = jest.fn();
    const profile = {
      _id: '507f1f77bcf86cd799439012',
      verificationStatus: 'verified',
      verificationReason: 'Identity checks passed',
    };

    mockService.verifyFarmer.mockResolvedValue(profile);

    await controller.verifyProfile(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockService.verifyFarmer).toHaveBeenCalledTimes(1);
    expect(mockService.verifyFarmer.mock.calls[0][2]).toBe('verified');
    expect(mockService.verifyFarmer.mock.calls[0][3]).toBe('Identity checks passed');
    expect(res.payload.success).toBe(true);
    expect(res.payload.data).toEqual(profile);
  });

  test('listProfiles returns pagination in meta.pagination', async () => {
    const req = {
      query: {
        page: '2',
        limit: '5',
        verificationStatus: 'submitted',
      },
    };
    const res = createResponseMock(req);
    const next = jest.fn();
    const profiles = [{ _id: '507f1f77bcf86cd799439012', verificationStatus: 'submitted' }];

    mockService.listFarmers.mockResolvedValue({
      farmers: profiles,
      page: 2,
      limit: 5,
      total: 12,
      totalPages: 3,
    });

    await controller.listProfiles(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.payload.success).toBe(true);
    expect(res.payload.data).toEqual(profiles);
    expect(res.payload.meta.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 12,
      totalPages: 3,
    });
  });
});
