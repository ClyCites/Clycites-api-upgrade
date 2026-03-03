const mockAlertService = {
  getAlert: jest.fn(),
  escalateAlert: jest.fn(),
  simulateAlert: jest.fn(),
};

jest.mock('../dist/modules/weather/weatherAlert.service', () => ({
  __esModule: true,
  default: mockAlertService,
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

jest.mock('../dist/modules/weather/farmWeatherProfile.model', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../dist/modules/weather/weatherSnapshot.model', () => ({
  __esModule: true,
  default: {},
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

describe('Weather alerts escalation and simulation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('escalateAlert returns updated alert payload', async () => {
    const req = {
      params: { id: '507f1f77bcf86cd799439081' },
      body: { reason: 'Flood risk worsening' },
      user: { id: '507f1f77bcf86cd799439011', role: 'platform_admin', orgId: '507f1f77bcf86cd799439012' },
    };
    const res = createResponseMock(req);
    const next = jest.fn();
    const existing = {
      _id: req.params.id,
      farmerId: req.user.id,
      organizationId: req.user.orgId,
      severity: 'high',
      status: 'new',
      triggeredBy: 'system',
    };
    const alert = {
      ...existing,
      severity: 'critical',
      status: 'sent',
      triggeredBy: 'manual',
    };

    mockAlertService.getAlert.mockResolvedValue(existing);
    mockAlertService.escalateAlert.mockResolvedValue(alert);

    await controller.escalateAlert(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockAlertService.getAlert).toHaveBeenCalledTimes(1);
    expect(mockAlertService.escalateAlert).toHaveBeenCalledTimes(1);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.uiStatus).toBe('escalated');
    expect(res.payload.data.reason).toBe('Flood risk worsening');
  });

  test('simulateAlert returns created alert payload', async () => {
    const req = {
      body: {
        farmId: '507f1f77bcf86cd799439091',
        farmerId: '507f1f77bcf86cd799439092',
        alertType: 'flood_risk',
        severity: 'high',
        advisoryMessage: 'Simulated flood warning',
      },
      user: { id: '507f1f77bcf86cd799439011', role: 'platform_admin' },
    };
    const res = createResponseMock(req);
    const next = jest.fn();
    const alert = { _id: '507f1f77bcf86cd799439093', ...req.body };

    mockAlertService.simulateAlert.mockResolvedValue(alert);

    await controller.simulateAlert(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockAlertService.simulateAlert).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(201);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data).toEqual(alert);
  });
});
