const mockProfileModel = {
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
};

const mockSnapshotModel = {
  findOne: jest.fn(),
};

const mockRuleModel = {
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
};

const mockForecastModel = {
  find: jest.fn(),
  countDocuments: jest.fn(),
};

const mockAlertService = {
  listAlerts: jest.fn(),
  listOrgAlerts: jest.fn(),
  getAlert: jest.fn(),
  acknowledgeAlert: jest.fn(),
  dismissAlert: jest.fn(),
  escalateAlert: jest.fn(),
  getAlertStats: jest.fn(),
  retryFailedDeliveries: jest.fn(),
  expireOldAlerts: jest.fn(),
  simulateAlert: jest.fn(),
};

const mockIngestService = {
  manualRefresh: jest.fn(),
  refreshAllProfiles: jest.fn(),
  pruneOldSnapshots: jest.fn(),
};

const mockRulesService = {
  seedDefaultRules: jest.fn(),
  evaluateRule: jest.fn(),
};

const mockWeatherProvider = {
  bustCache: jest.fn(),
  getProviderNames: jest.fn().mockReturnValue([]),
};

jest.mock('../dist/modules/weather/farmWeatherProfile.model', () => ({
  __esModule: true,
  default: mockProfileModel,
}));

jest.mock('../dist/modules/weather/weatherSnapshot.model', () => ({
  __esModule: true,
  default: mockSnapshotModel,
}));

jest.mock('../dist/modules/weather/weatherRule.model', () => ({
  __esModule: true,
  default: mockRuleModel,
}));

jest.mock('../dist/modules/weather/forecast.model', () => ({
  __esModule: true,
  default: mockForecastModel,
}));

jest.mock('../dist/modules/weather/weatherAlert.service', () => ({
  __esModule: true,
  default: mockAlertService,
}));

jest.mock('../dist/modules/weather/weatherIngest.service', () => ({
  __esModule: true,
  default: mockIngestService,
}));

jest.mock('../dist/modules/weather/weatherForecast.service', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../dist/modules/weather/weatherRules.service', () => ({
  __esModule: true,
  default: mockRulesService,
}));

jest.mock('../dist/modules/weather/weatherProvider.service', () => ({
  __esModule: true,
  default: mockWeatherProvider,
}));

jest.mock('../dist/modules/audit/audit.service', () => ({
  __esModule: true,
  default: { log: jest.fn().mockResolvedValue(undefined) },
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

const createLeanFindQuery = (rows) => {
  const lean = jest.fn().mockResolvedValue(rows);
  const limit = jest.fn().mockReturnValue({ lean });
  const skip = jest.fn().mockReturnValue({ limit });
  const sort = jest.fn().mockReturnValue({ skip });
  return { sort };
};

describe('Weather workspace controller contract', () => {
  const farmerUser = {
    id: '507f1f77bcf86cd799439011',
    role: 'farmer',
    orgId: '507f1f77bcf86cd799439012',
  };

  const adminUser = {
    id: '507f1f77bcf86cd799439013',
    role: 'platform_admin',
    orgId: '507f1f77bcf86cd799439012',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('profiles list/create/update/delete enforce org scope and pagination metadata', async () => {
    const next = jest.fn();

    const profileRows = [{ _id: '507f1f77bcf86cd799439101', farmName: 'Mukono Farm', isActive: true }];
    mockProfileModel.find.mockReturnValue(createLeanFindQuery(profileRows));
    mockProfileModel.countDocuments.mockResolvedValue(1);

    const listReq = {
      query: { page: '1', limit: '20', organizationId: adminUser.orgId, search: 'Mukono' },
      params: {},
      body: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const listRes = createResponseMock(listReq);

    await controller.listProfiles(listReq, listRes, next);

    expect(next).not.toHaveBeenCalled();
    expect(listRes.payload.success).toBe(true);
    expect(listRes.payload.meta.pagination.total).toBe(1);
    expect(listRes.payload.data).toEqual(profileRows);
    const listFilter = mockProfileModel.find.mock.calls[0][0];
    expect(listFilter.organizationId.toString()).toBe(adminUser.orgId);

    const createdProfile = {
      _id: { toString: () => '507f1f77bcf86cd799439102' },
      farmerId: { toString: () => farmerUser.id },
      organizationId: { toString: () => farmerUser.orgId },
      geoLocation: { coordinates: [32.5825, 0.3476] },
      isActive: true,
    };
    mockProfileModel.create.mockResolvedValue(createdProfile);

    const createReq = {
      query: {},
      params: {},
      body: {
        farmId: '507f1f77bcf86cd799439103',
        organizationId: farmerUser.orgId,
        farmName: 'Nakasero Farm',
        lat: 0.3476,
        lng: 32.5825,
      },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: farmerUser,
    };
    const createRes = createResponseMock(createReq);

    await controller.createProfile(createReq, createRes, next);

    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.success).toBe(true);

    const profileForUpdate = {
      _id: '507f1f77bcf86cd799439104',
      farmerId: { toString: () => farmerUser.id },
      organizationId: { toString: () => farmerUser.orgId },
      geoLocation: { coordinates: [32.5825, 0.3476] },
      set: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const profileForDelete = {
      _id: '507f1f77bcf86cd799439105',
      farmerId: { toString: () => farmerUser.id },
      organizationId: { toString: () => farmerUser.orgId },
      isActive: true,
      deletedAt: undefined,
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockProfileModel.findById
      .mockResolvedValueOnce(profileForUpdate)
      .mockResolvedValueOnce(profileForDelete);

    const updateReq = {
      params: { id: '507f1f77bcf86cd799439104' },
      query: {},
      body: { farmName: 'Nakasero Updated', lat: 0.352, lng: 32.589 },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: farmerUser,
    };
    const updateRes = createResponseMock(updateReq);

    await controller.updateProfile(updateReq, updateRes, next);

    expect(profileForUpdate.set).toHaveBeenCalledTimes(1);
    expect(profileForUpdate.save).toHaveBeenCalledTimes(1);
    expect(mockWeatherProvider.bustCache).toHaveBeenCalledTimes(1);
    expect(updateRes.payload.success).toBe(true);

    const deleteReq = {
      params: { id: '507f1f77bcf86cd799439105' },
      query: {},
      body: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: farmerUser,
    };
    const deleteRes = createResponseMock(deleteReq);

    await controller.deleteProfile(deleteReq, deleteRes, next);

    expect(profileForDelete.isActive).toBe(false);
    expect(profileForDelete.deletedAt).toBeInstanceOf(Date);
    expect(profileForDelete.save).toHaveBeenCalledTimes(1);
    expect(deleteRes.payload.success).toBe(true);
    expect(deleteRes.payload.data).toBeNull();
  });

  test('forecast refresh and history endpoints are profile-scoped and paginated', async () => {
    const next = jest.fn();

    const profile = {
      _id: '507f1f77bcf86cd799439111',
      farmId: '507f1f77bcf86cd799439112',
      farmerId: { toString: () => farmerUser.id },
      organizationId: { toString: () => farmerUser.orgId },
    };
    mockProfileModel.findById
      .mockResolvedValueOnce(profile)
      .mockResolvedValueOnce(profile);

    const refreshResult = {
      profileId: profile._id,
      farmId: profile.farmId,
      status: 'completed',
      durationMs: 150,
    };
    mockIngestService.manualRefresh.mockResolvedValue(refreshResult);

    const refreshReq = {
      params: { profileId: profile._id },
      query: {},
      body: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: farmerUser,
    };
    const refreshRes = createResponseMock(refreshReq);

    await controller.refreshForecast(refreshReq, refreshRes, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockIngestService.manualRefresh).toHaveBeenCalledWith(profile._id);
    expect(refreshRes.payload.success).toBe(true);

    const forecastRows = [{ _id: '507f1f77bcf86cd799439113', horizon: 'daily' }];
    mockForecastModel.find.mockReturnValue(createLeanFindQuery(forecastRows));
    mockForecastModel.countDocuments.mockResolvedValue(1);

    const historyReq = {
      params: { profileId: profile._id },
      query: { page: '1', limit: '20', horizon: 'daily', includeSuperseded: 'false' },
      body: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: farmerUser,
    };
    const historyRes = createResponseMock(historyReq);

    await controller.getForecastHistory(historyReq, historyRes, next);

    expect(historyRes.payload.success).toBe(true);
    expect(historyRes.payload.data).toEqual(forecastRows);
    expect(historyRes.payload.meta.pagination.total).toBe(1);
  });

  test('weather alert list and transitions return uiStatus and resolution metadata', async () => {
    const next = jest.fn();

    const profile = {
      _id: '507f1f77bcf86cd799439121',
      farmId: '507f1f77bcf86cd799439122',
      farmerId: { toString: () => farmerUser.id },
      organizationId: { toString: () => farmerUser.orgId },
    };
    mockProfileModel.findById.mockResolvedValueOnce(profile);

    mockAlertService.listAlerts.mockResolvedValue({
      data: [
        {
          _id: '507f1f77bcf86cd799439123',
          status: 'sent',
          triggeredBy: 'manual',
          farmerId: { toString: () => farmerUser.id },
          organizationId: { toString: () => farmerUser.orgId },
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const listReq = {
      params: { profileId: profile._id },
      query: { page: '1', limit: '20', uiStatus: 'escalated' },
      body: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: farmerUser,
    };
    const listRes = createResponseMock(listReq);

    await controller.listAlerts(listReq, listRes, next);

    expect(listRes.payload.success).toBe(true);
    expect(listRes.payload.data[0].uiStatus).toBe('escalated');
    expect(listRes.payload.meta.pagination.total).toBe(1);

    const ackExisting = {
      _id: '507f1f77bcf86cd799439124',
      status: 'new',
      triggeredBy: 'system',
      farmerId: { toString: () => farmerUser.id },
      organizationId: { toString: () => farmerUser.orgId },
    };
    const ackUpdated = { ...ackExisting, status: 'acknowledged' };

    const dismissExisting = {
      _id: '507f1f77bcf86cd799439125',
      status: 'acknowledged',
      triggeredBy: 'system',
      farmerId: { toString: () => farmerUser.id },
      organizationId: { toString: () => farmerUser.orgId },
    };
    const dismissUpdated = {
      ...dismissExisting,
      status: 'dismissed',
      resolvedBy: { toString: () => farmerUser.id },
      resolvedAt: new Date('2026-03-03T10:00:00.000Z'),
      resolutionReason: 'Issue addressed',
    };

    const escalateExisting = {
      _id: '507f1f77bcf86cd799439126',
      status: 'new',
      triggeredBy: 'system',
      farmerId: { toString: () => farmerUser.id },
      organizationId: { toString: () => farmerUser.orgId },
    };
    const escalated = {
      ...escalateExisting,
      status: 'sent',
      triggeredBy: 'manual',
    };

    mockAlertService.getAlert
      .mockResolvedValueOnce(ackExisting)
      .mockResolvedValueOnce(dismissExisting)
      .mockResolvedValueOnce(escalateExisting);
    mockAlertService.acknowledgeAlert.mockResolvedValue(ackUpdated);
    mockAlertService.dismissAlert.mockResolvedValue(dismissUpdated);
    mockAlertService.escalateAlert.mockResolvedValue(escalated);

    const ackReq = {
      params: { id: ackExisting._id },
      query: {},
      body: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: farmerUser,
    };
    const ackRes = createResponseMock(ackReq);
    await controller.acknowledgeAlert(ackReq, ackRes, next);
    expect(ackRes.payload.data.uiStatus).toBe('acknowledged');

    const dismissReq = {
      params: { id: dismissExisting._id },
      query: {},
      body: { reason: 'Issue addressed' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: farmerUser,
    };
    const dismissRes = createResponseMock(dismissReq);
    await controller.dismissAlert(dismissReq, dismissRes, next);
    expect(dismissRes.payload.data.uiStatus).toBe('resolved');
    expect(dismissRes.payload.data.reason).toBe('Issue addressed');
    expect(dismissRes.payload.data.resolvedBy).toBe(farmerUser.id);

    const escalateReq = {
      params: { id: escalateExisting._id },
      query: {},
      body: { reason: 'Escalate severity' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: farmerUser,
    };
    const escalateRes = createResponseMock(escalateReq);
    await controller.escalateAlert(escalateReq, escalateRes, next);
    expect(escalateRes.payload.data.uiStatus).toBe('escalated');
    expect(escalateRes.payload.data.reason).toBe('Escalate severity');
  });

  test('rule create/update/test/delete support status transitions and test action', async () => {
    const next = jest.fn();

    const createdRule = {
      _id: { toString: () => '507f1f77bcf86cd799439131' },
      organizationId: { toString: () => adminUser.orgId },
      workflowState: 'active',
      isActive: true,
      version: 1,
    };
    mockRuleModel.create.mockResolvedValue(createdRule);

    const createReq = {
      params: {},
      query: {},
      body: {
        name: 'Heat Stress',
        alertType: 'heat_wave',
        severity: 'high',
        conditions: [{ field: 'temperatureCelsius', operator: 'gte', value: 35 }],
        advisoryTemplate: 'Heat alert',
        recommendedActions: ['Irrigate'],
      },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const createRes = createResponseMock(createReq);
    await controller.createRule(createReq, createRes, next);
    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data.status).toBe('active');

    const updatableRule = {
      _id: { toString: () => '507f1f77bcf86cd799439132' },
      organizationId: { toString: () => adminUser.orgId },
      workflowState: 'active',
      isActive: true,
      version: 1,
      set: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const invalidRule = {
      _id: { toString: () => '507f1f77bcf86cd799439133' },
      organizationId: { toString: () => adminUser.orgId },
      workflowState: 'disabled',
      isActive: false,
      version: 2,
      set: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const ruleForTest = {
      _id: '507f1f77bcf86cd799439134',
      organizationId: { toString: () => adminUser.orgId },
      workflowState: 'active',
      isActive: true,
    };
    const ruleForDelete = {
      _id: { toString: () => '507f1f77bcf86cd799439135' },
      organizationId: { toString: () => adminUser.orgId },
      workflowState: 'active',
      isActive: true,
      version: 1,
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockRuleModel.findById
      .mockResolvedValueOnce(updatableRule)
      .mockResolvedValueOnce(invalidRule)
      .mockResolvedValueOnce(ruleForTest)
      .mockResolvedValueOnce(ruleForDelete);
    mockRulesService.evaluateRule.mockReturnValue(true);

    const updateReq = {
      params: { id: '507f1f77bcf86cd799439132' },
      query: {},
      body: { active: false },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const updateRes = createResponseMock(updateReq);
    await controller.updateRule(updateReq, updateRes, next);
    expect(updatableRule.workflowState).toBe('disabled');
    expect(updatableRule.isActive).toBe(false);
    expect(updateRes.payload.data.uiStatus).toBe('disabled');

    const invalidUpdateReq = {
      params: { id: '507f1f77bcf86cd799439133' },
      query: {},
      body: { status: 'draft' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const invalidUpdateRes = createResponseMock(invalidUpdateReq);
    await controller.updateRule(invalidUpdateReq, invalidUpdateRes, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));

    const testReq = {
      params: { id: '507f1f77bcf86cd799439134' },
      query: {},
      body: { reading: { temperatureCelsius: 38, humidity: 25 } },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const testRes = createResponseMock(testReq);
    await controller.testRule(testReq, testRes, next);
    expect(testRes.payload.success).toBe(true);
    expect(testRes.payload.data.matched).toBe(true);
    expect(testRes.payload.data.rule.status).toBe('active');

    const deleteReq = {
      params: { id: '507f1f77bcf86cd799439135' },
      query: {},
      body: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const deleteRes = createResponseMock(deleteReq);
    await controller.deleteRule(deleteReq, deleteRes, next);
    expect(ruleForDelete.workflowState).toBe('disabled');
    expect(ruleForDelete.isActive).toBe(false);
    expect(deleteRes.payload.success).toBe(true);
    expect(deleteRes.payload.data).toBeNull();
  });
});
