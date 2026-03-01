const mockSnapshotModel = {
  findById: jest.fn(),
};

const mockProfileModel = {
  findById: jest.fn(),
};

jest.mock('../dist/modules/weather/weatherSnapshot.model', () => ({
  __esModule: true,
  default: mockSnapshotModel,
}));

jest.mock('../dist/modules/weather/farmWeatherProfile.model', () => ({
  __esModule: true,
  default: mockProfileModel,
}));

jest.mock('../dist/modules/weather/weatherAlert.service', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../dist/modules/weather/weatherIngest.service', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../dist/modules/weather/weatherForecast.service', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../dist/modules/weather/weatherRules.service', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../dist/modules/weather/weatherProvider.service', () => ({
  __esModule: true,
  default: { getProviderNames: jest.fn().mockReturnValue([]) },
}));

jest.mock('../dist/modules/weather/weatherRule.model', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../dist/modules/audit/audit.service', () => ({
  __esModule: true,
  default: { log: jest.fn() },
}));

const controller = require('../dist/modules/weather/weather.controller');

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

describe('Weather sensor reading workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getConditionById returns reading payload', async () => {
    const req = {
      params: { readingId: '507f1f77bcf86cd799439301' },
      user: { id: '507f1f77bcf86cd799439011', role: 'platform_admin' },
    };
    const res = createResponseMock(req);
    const next = jest.fn();

    const snapshot = {
      _id: req.params.readingId,
      profileId: '507f1f77bcf86cd799439302',
      status: 'captured',
    };
    const profile = {
      _id: snapshot.profileId,
      farmerId: req.user.id,
      organizationId: null,
    };

    mockSnapshotModel.findById.mockResolvedValue(snapshot);
    mockProfileModel.findById.mockResolvedValue(profile);

    await controller.getConditionById(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.payload.success).toBe(true);
    expect(res.payload.data).toEqual(snapshot);
  });

  test('updateConditionById supports captured -> flagged transition', async () => {
    const req = {
      params: { readingId: '507f1f77bcf86cd799439311' },
      body: { status: 'flagged', statusReason: 'Outlier reading' },
      user: { id: '507f1f77bcf86cd799439011', role: 'platform_admin' },
    };
    const res = createResponseMock(req);
    const next = jest.fn();

    const snapshot = {
      _id: req.params.readingId,
      profileId: '507f1f77bcf86cd799439312',
      status: 'captured',
      save: jest.fn().mockResolvedValue(undefined),
    };
    const profile = {
      _id: snapshot.profileId,
      farmerId: req.user.id,
      organizationId: null,
    };

    mockSnapshotModel.findById.mockResolvedValue(snapshot);
    mockProfileModel.findById.mockResolvedValue(profile);

    await controller.updateConditionById(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(snapshot.save).toHaveBeenCalledTimes(1);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.status).toBe('flagged');
  });

  test('updateConditionById rejects invalid verified -> flagged transition', async () => {
    const req = {
      params: { readingId: '507f1f77bcf86cd799439321' },
      body: { status: 'flagged' },
      user: { id: '507f1f77bcf86cd799439011', role: 'platform_admin' },
    };
    const res = createResponseMock(req);
    const next = jest.fn();

    const snapshot = {
      _id: req.params.readingId,
      profileId: '507f1f77bcf86cd799439322',
      status: 'verified',
      save: jest.fn(),
    };
    const profile = {
      _id: snapshot.profileId,
      farmerId: req.user.id,
      organizationId: null,
    };

    mockSnapshotModel.findById.mockResolvedValue(snapshot);
    mockProfileModel.findById.mockResolvedValue(profile);

    await controller.updateConditionById(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain('Invalid sensor status transition');
  });
});
