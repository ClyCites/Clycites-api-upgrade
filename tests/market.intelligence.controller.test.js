const mockService = {
  generateMarketInsight: jest.fn(),
  getPriceRecommendation: jest.fn(),
};

const mockPriceAlertModel = {
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
};

jest.mock('../dist/modules/market-intelligence/marketIntelligence.service', () => ({
  __esModule: true,
  marketIntelligenceService: mockService,
}));

jest.mock('../dist/modules/market-intelligence/priceAlert.model', () => ({
  __esModule: true,
  default: mockPriceAlertModel,
}));

jest.mock('../dist/modules/market-intelligence/marketInsight.model', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}));

const { marketIntelligenceController } = require('../dist/modules/market-intelligence/marketIntelligence.controller');

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

describe('Market intelligence alert contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createPriceAlert normalizes legacy conditions and inApp channel', async () => {
    const req = {
      body: {
        product: '507f1f77bcf86cd799439101',
        region: 'Central',
        conditions: { priceBelow: 1000 },
        notificationChannels: ['inApp', 'sms'],
        isActive: false,
      },
      user: { id: '507f1f77bcf86cd799439011' },
      query: {},
      params: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const res = createResponseMock(req);
    const next = jest.fn();
    const created = { _id: '507f1f77bcf86cd799439102' };
    mockPriceAlertModel.create.mockResolvedValue(created);

    await marketIntelligenceController.createPriceAlert(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockPriceAlertModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        condition: { operator: 'below', threshold: 1000 },
        notificationChannels: ['in_app', 'sms'],
        active: false,
      })
    );
    expect(res.statusCode).toBe(201);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data).toEqual(expect.objectContaining({
      ...created,
      status: 'new',
      uiStatus: 'new',
    }));
  });

  test('getUserAlerts supports status/active/product/region filters with pagination meta', async () => {
    const req = {
      query: {
        status: 'inactive',
        active: 'true',
        product: '507f1f77bcf86cd799439103',
        region: 'Western',
        page: '2',
        limit: '5',
      },
      user: { id: '507f1f77bcf86cd799439011' },
      body: {},
      params: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const res = createResponseMock(req);
    const next = jest.fn();
    const alerts = [{ _id: '507f1f77bcf86cd799439104', active: false }];

    const limit = jest.fn().mockResolvedValue(alerts);
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    const populate = jest.fn().mockReturnValue({ sort });
    mockPriceAlertModel.find.mockReturnValue({ populate });
    mockPriceAlertModel.countDocuments.mockResolvedValue(7);

    await marketIntelligenceController.getUserAlerts(req, res, next);

    expect(next).not.toHaveBeenCalled();
    const queryArg = mockPriceAlertModel.find.mock.calls[0][0];
    expect(queryArg).toEqual(
      expect.objectContaining({
        user: '507f1f77bcf86cd799439011',
        active: false,
        region: 'Western',
        product: '507f1f77bcf86cd799439103',
      })
    );
    expect(res.payload.success).toBe(true);
    expect(res.payload.data[0]).toEqual(expect.objectContaining({
      _id: '507f1f77bcf86cd799439104',
      active: false,
      status: 'dismissed',
      uiStatus: 'dismissed',
    }));
    expect(res.payload.meta.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 7,
      totalPages: 2,
    });
  });
});
