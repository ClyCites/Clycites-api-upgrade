const mockPriceServiceInstance = {
  addPrice: jest.fn(),
  getPrices: jest.fn(),
  getPriceById: jest.fn(),
  updatePrice: jest.fn(),
  deletePrice: jest.fn(),
  getPriceTrends: jest.fn(),
  predictPrice: jest.fn(),
  bulkImportPrices: jest.fn(),
  getHistoricalPrices: jest.fn(),
  getTopMarketsForProduct: jest.fn(),
  setUserPriceAlerts: jest.fn(),
  checkPriceAlerts: jest.fn(),
  deletePriceAlert: jest.fn(),
  detectPriceAnomalies: jest.fn(),
  getAveragePricePerMarket: jest.fn(),
  compareMarketPrices: jest.fn(),
  getPriceVolatility: jest.fn(),
  getTrendingProducts: jest.fn(),
  getProductTrend: jest.fn(),
  getPriceSummary: jest.fn(),
  analyzeSeasonalPrices: jest.fn(),
  analyzeCorrelations: jest.fn(),
  analyzeRegionalPrices: jest.fn(),
  generateMarketReport: jest.fn(),
  scheduleReport: jest.fn(),
};

const MockPriceService = jest.fn(() => mockPriceServiceInstance);

const mockPricePredictionModel = {
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findOne: jest.fn(),
};

const mockEstimationModel = {
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findOne: jest.fn(),
};

const mockMIService = {
  generateMarketInsight: jest.fn(),
  getPriceRecommendation: jest.fn(),
};

const mockMarketInsightModel = {
  find: jest.fn(),
};

const mockAlertModel = {
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
};

const mockRecommendationModel = {
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findOne: jest.fn(),
};

const mockDataSourceModel = {
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findOne: jest.fn(),
};

jest.mock('../dist/modules/prices/price.service', () => ({
  __esModule: true,
  default: MockPriceService,
}));

jest.mock('../dist/modules/prices/pricePrediction.model', () => ({
  __esModule: true,
  default: mockPricePredictionModel,
}));

jest.mock('../dist/modules/price-monitor/priceEstimation.model', () => ({
  __esModule: true,
  default: mockEstimationModel,
}));

jest.mock('../dist/modules/market-intelligence/marketIntelligence.service', () => ({
  __esModule: true,
  marketIntelligenceService: mockMIService,
}));

jest.mock('../dist/modules/market-intelligence/marketInsight.model', () => ({
  __esModule: true,
  default: mockMarketInsightModel,
}));

jest.mock('../dist/modules/market-intelligence/priceAlert.model', () => ({
  __esModule: true,
  default: mockAlertModel,
}));

jest.mock('../dist/modules/market-intelligence/recommendation.model', () => ({
  __esModule: true,
  default: mockRecommendationModel,
}));

jest.mock('../dist/modules/market-intelligence/dataSource.model', () => ({
  __esModule: true,
  default: mockDataSourceModel,
}));

const priceController = require('../dist/modules/prices/price.controller').default;
const priceMonitorController = require('../dist/modules/price-monitor/priceMonitor.controller').default;
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

const createPagedQuery = (rows) => {
  const limit = jest.fn().mockResolvedValue(rows);
  const skip = jest.fn().mockReturnValue({ limit });
  const sort = jest.fn().mockReturnValue({ skip });
  return { sort };
};

const createPopulatePagedQuery = (rows) => {
  const limit = jest.fn().mockResolvedValue(rows);
  const skip = jest.fn().mockReturnValue({ limit });
  const sort = jest.fn().mockReturnValue({ skip });
  const populate = jest.fn().mockReturnValue({ sort });
  return { populate };
};

const adminUser = {
  id: '507f1f77bcf86cd799439011',
  role: 'admin',
  orgId: '507f1f77bcf86cd799439012',
};

describe('Prices workspace controller contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('market prices endpoints expose deterministic uiStatus mapping', async () => {
    const next = jest.fn();

    mockPriceServiceInstance.getPrices.mockResolvedValue([
      { _id: '507f1f77bcf86cd799439101', isValid: false },
      { _id: '507f1f77bcf86cd799439102', status: 'published' },
    ]);

    const listReq = { query: { page: '1', limit: '20' }, params: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const listRes = createResponseMock(listReq);
    await priceController.getPrices(listReq, listRes, next);

    expect(next).not.toHaveBeenCalled();
    expect(listRes.payload.success).toBe(true);
    expect(listRes.payload.data[0].uiStatus).toBe('captured');
    expect(listRes.payload.data[1].uiStatus).toBe('published');
    expect(listRes.payload.meta.pagination.total).toBe(2);

    mockPriceServiceInstance.getPriceById.mockResolvedValue({ _id: '507f1f77bcf86cd799439103', isValid: true });

    const getReq = { query: {}, params: { id: '507f1f77bcf86cd799439103' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const getRes = createResponseMock(getReq);
    await priceController.getPriceById(getReq, getRes, next);
    expect(getRes.payload.data.uiStatus).toBe('validated');

    mockPriceServiceInstance.updatePrice.mockResolvedValue({
      message: 'updated',
      price: { _id: '507f1f77bcf86cd799439104', status: 'validated' },
    });

    const updateReq = { query: {}, params: { id: '507f1f77bcf86cd799439104' }, body: { status: 'validated' }, headers: {}, socket: { remoteAddress: '127.0.0.1' }, user: adminUser };
    const updateRes = createResponseMock(updateReq);
    await priceController.updatePrice(updateReq, updateRes, next);
    expect(updateRes.payload.data.price.uiStatus).toBe('validated');
  });

  test('price predictions CRUD + regenerate honor status transitions and pagination', async () => {
    const next = jest.fn();

    mockPricePredictionModel.find.mockReturnValue(createPagedQuery([{ _id: '507f1f77bcf86cd799439201', status: 'generated' }]));
    mockPricePredictionModel.countDocuments.mockResolvedValue(1);

    const listReq = { user: adminUser, query: { page: '1', limit: '20' }, params: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const listRes = createResponseMock(listReq);
    await priceController.listPredictions(listReq, listRes, next);

    expect(listRes.payload.success).toBe(true);
    expect(listRes.payload.data[0].uiStatus).toBe('generated');
    expect(listRes.payload.meta.pagination.total).toBe(1);

    mockPricePredictionModel.create.mockResolvedValue({ _id: '507f1f77bcf86cd799439202', status: 'generated' });

    const createReq = {
      user: adminUser,
      query: {},
      params: {},
      body: { productId: '507f1f77bcf86cd799439203', predictedPrice: 1200 },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const createRes = createResponseMock(createReq);
    await priceController.createPrediction(createReq, createRes, next);
    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data.uiStatus).toBe('generated');

    const predictionForGet = {
      _id: '507f1f77bcf86cd799439204',
      status: 'generated',
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
    };
    const predictionForUpdate = {
      _id: '507f1f77bcf86cd799439205',
      status: 'generated',
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      save: jest.fn().mockResolvedValue(undefined),
    };
    const predictionForDelete = {
      _id: '507f1f77bcf86cd799439206',
      status: 'compared',
      isActive: true,
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      save: jest.fn().mockResolvedValue(undefined),
    };
    const predictionForRegenerate = {
      _id: '507f1f77bcf86cd799439207',
      status: 'archived',
      predictedPrice: 1100,
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      save: jest.fn().mockResolvedValue(undefined),
    };
    const predictionInvalidTransition = {
      _id: '507f1f77bcf86cd799439208',
      status: 'archived',
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockPricePredictionModel.findOne
      .mockResolvedValueOnce(predictionForGet)
      .mockResolvedValueOnce(predictionForUpdate)
      .mockResolvedValueOnce(predictionForDelete)
      .mockResolvedValueOnce(predictionForRegenerate)
      .mockResolvedValueOnce(predictionInvalidTransition);

    const getReq = { user: adminUser, query: {}, params: { predictionId: '507f1f77bcf86cd799439204' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const getRes = createResponseMock(getReq);
    await priceController.getPrediction(getReq, getRes, next);
    expect(getRes.payload.data.uiStatus).toBe('generated');

    const updateReq = { user: adminUser, query: {}, params: { predictionId: '507f1f77bcf86cd799439205' }, body: { status: 'compared' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const updateRes = createResponseMock(updateReq);
    await priceController.updatePrediction(updateReq, updateRes, next);
    expect(updateRes.payload.data.uiStatus).toBe('compared');
    expect(predictionForUpdate.comparedAt).toEqual(expect.any(Date));

    const deleteReq = { user: adminUser, query: {}, params: { predictionId: '507f1f77bcf86cd799439206' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const deleteRes = createResponseMock(deleteReq);
    await priceController.deletePrediction(deleteReq, deleteRes, next);
    expect(predictionForDelete.isActive).toBe(false);
    expect(predictionForDelete.status).toBe('archived');
    expect(deleteRes.payload.data).toBeNull();

    const regenerateReq = { user: adminUser, query: {}, params: { predictionId: '507f1f77bcf86cd799439207' }, body: { predictedPrice: 1300 }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const regenerateRes = createResponseMock(regenerateReq);
    await priceController.regeneratePrediction(regenerateReq, regenerateRes, next);
    expect(regenerateRes.payload.data.uiStatus).toBe('generated');
    expect(predictionForRegenerate.predictedPrice).toBe(1300);

    const invalidReq = { user: adminUser, query: {}, params: { predictionId: '507f1f77bcf86cd799439208' }, body: { status: 'generated' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const invalidRes = createResponseMock(invalidReq);
    await priceController.updatePrediction(invalidReq, invalidRes, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  test('price estimations CRUD validates workflow transitions', async () => {
    const next = jest.fn();

    mockEstimationModel.find.mockReturnValue(createPagedQuery([{ _id: '507f1f77bcf86cd799439301', status: 'draft' }]));
    mockEstimationModel.countDocuments.mockResolvedValue(1);

    const listReq = { user: adminUser, query: { page: '1', limit: '20' }, params: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const listRes = createResponseMock(listReq);
    await priceMonitorController.listEstimations(listReq, listRes, next);
    expect(listRes.payload.data[0].uiStatus).toBe('draft');

    mockEstimationModel.create.mockResolvedValue({ _id: '507f1f77bcf86cd799439302', status: 'draft' });

    const createReq = {
      user: adminUser,
      query: {},
      params: {},
      body: { productId: '507f1f77bcf86cd799439303', estimatedPrice: 950 },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const createRes = createResponseMock(createReq);
    await priceMonitorController.createEstimation(createReq, createRes, next);
    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data.uiStatus).toBe('draft');

    const estimationForGet = {
      _id: '507f1f77bcf86cd799439304',
      status: 'submitted',
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
    };
    const estimationForUpdate = {
      _id: '507f1f77bcf86cd799439305',
      status: 'submitted',
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      save: jest.fn().mockResolvedValue(undefined),
    };
    const estimationInvalid = {
      _id: '507f1f77bcf86cd799439306',
      status: 'approved',
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      save: jest.fn().mockResolvedValue(undefined),
    };
    const estimationForDelete = {
      _id: '507f1f77bcf86cd799439307',
      status: 'draft',
      isActive: true,
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockEstimationModel.findOne
      .mockResolvedValueOnce(estimationForGet)
      .mockResolvedValueOnce(estimationForUpdate)
      .mockResolvedValueOnce(estimationInvalid)
      .mockResolvedValueOnce(estimationForDelete);

    const getReq = { user: adminUser, query: {}, params: { estimationId: '507f1f77bcf86cd799439304' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const getRes = createResponseMock(getReq);
    await priceMonitorController.getEstimation(getReq, getRes, next);
    expect(getRes.payload.data.uiStatus).toBe('submitted');

    const updateReq = { user: adminUser, query: {}, params: { estimationId: '507f1f77bcf86cd799439305' }, body: { status: 'approved' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const updateRes = createResponseMock(updateReq);
    await priceMonitorController.updateEstimation(updateReq, updateRes, next);
    expect(updateRes.payload.data.uiStatus).toBe('approved');
    expect(estimationForUpdate.approvedAt).toEqual(expect.any(Date));

    const invalidReq = { user: adminUser, query: {}, params: { estimationId: '507f1f77bcf86cd799439306' }, body: { status: 'draft' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const invalidRes = createResponseMock(invalidReq);
    await priceMonitorController.updateEstimation(invalidReq, invalidRes, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));

    const deleteReq = { user: adminUser, query: {}, params: { estimationId: '507f1f77bcf86cd799439307' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const deleteRes = createResponseMock(deleteReq);
    await priceMonitorController.deleteEstimation(deleteReq, deleteRes, next);
    expect(estimationForDelete.isActive).toBe(false);
    expect(deleteRes.payload.data).toBeNull();
  });

  test('market signals + recommendations + data sources support workspace workflows', async () => {
    const next = jest.fn();

    mockMIService.generateMarketInsight.mockResolvedValue({ averagePrice: 1200, trendDirection: 'rising' });
    const insightsReq = { user: adminUser, query: { productId: '507f1f77bcf86cd799439401', region: 'Central' }, params: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const insightsRes = createResponseMock(insightsReq);
    await marketIntelligenceController.getMarketInsights(insightsReq, insightsRes, next);
    expect(insightsRes.payload.success).toBe(true);

    const trendsRows = [{ _id: '507f1f77bcf86cd799439402', period: { start: '2026-01-01' } }];
    const select = jest.fn().mockResolvedValue(trendsRows);
    const sort = jest.fn().mockReturnValue({ select });
    mockMarketInsightModel.find.mockReturnValue({ sort });

    const trendsReq = { user: adminUser, query: { productId: '507f1f77bcf86cd799439401', period: '30' }, params: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const trendsRes = createResponseMock(trendsReq);
    await marketIntelligenceController.getMarketTrends(trendsReq, trendsRes, next);
    expect(trendsRes.payload.data.trends).toEqual(trendsRows);

    mockAlertModel.create.mockResolvedValue({ _id: '507f1f77bcf86cd799439403', active: true, status: 'new' });
    const createAlertReq = {
      user: adminUser,
      query: {},
      params: {},
      body: {
        product: '507f1f77bcf86cd799439404',
        condition: { operator: 'below', threshold: 900 },
      },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const createAlertRes = createResponseMock(createAlertReq);
    await marketIntelligenceController.createPriceAlert(createAlertReq, createAlertRes, next);
    expect(createAlertRes.payload.data.uiStatus).toBe('new');

    mockAlertModel.find.mockReturnValue(createPopulatePagedQuery([{ _id: '507f1f77bcf86cd799439405', active: false }]));
    mockAlertModel.countDocuments.mockResolvedValue(1);
    const listAlertReq = {
      user: adminUser,
      query: { page: '1', limit: '20', status: 'inactive' },
      params: {},
      body: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const listAlertRes = createResponseMock(listAlertReq);
    await marketIntelligenceController.getUserAlerts(listAlertReq, listAlertRes, next);
    expect(listAlertRes.payload.data[0].uiStatus).toBe('dismissed');

    const alertForInvalidUpdate = {
      _id: '507f1f77bcf86cd799439406',
      status: 'investigated',
      active: true,
      user: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockAlertModel.findById.mockResolvedValueOnce(alertForInvalidUpdate);
    const invalidAlertReq = {
      user: adminUser,
      query: {},
      params: { alertId: '507f1f77bcf86cd799439406' },
      body: { status: 'new' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const invalidAlertRes = createResponseMock(invalidAlertReq);
    await marketIntelligenceController.updatePriceAlert(invalidAlertReq, invalidAlertRes, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));

    mockRecommendationModel.find.mockReturnValue(createPagedQuery([{ _id: '507f1f77bcf86cd799439407', status: 'draft' }]));
    mockRecommendationModel.countDocuments.mockResolvedValue(1);
    const listRecReq = { user: adminUser, query: { page: '1', limit: '20' }, params: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const listRecRes = createResponseMock(listRecReq);
    await marketIntelligenceController.listRecommendations(listRecReq, listRecRes, next);
    expect(listRecRes.payload.data[0].uiStatus).toBe('draft');

    mockRecommendationModel.create.mockResolvedValue({ _id: '507f1f77bcf86cd799439408', status: 'draft' });
    const createRecReq = {
      user: adminUser,
      query: {},
      params: {},
      body: { recommendationType: 'price', recommendedPrice: 1400 },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const createRecRes = createResponseMock(createRecReq);
    await marketIntelligenceController.createRecommendation(createRecReq, createRecRes, next);
    expect(createRecRes.statusCode).toBe(201);

    const recForApprove = {
      _id: '507f1f77bcf86cd799439409',
      status: 'draft',
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      save: jest.fn().mockResolvedValue(undefined),
    };
    const recForPublish = {
      _id: '507f1f77bcf86cd799439410',
      status: 'approved',
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      save: jest.fn().mockResolvedValue(undefined),
    };
    const recForRetract = {
      _id: '507f1f77bcf86cd799439411',
      status: 'published',
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockRecommendationModel.findOne
      .mockResolvedValueOnce(recForApprove)
      .mockResolvedValueOnce(recForPublish)
      .mockResolvedValueOnce(recForRetract);

    const approveReq = { user: adminUser, query: {}, params: { recommendationId: '507f1f77bcf86cd799439409' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const approveRes = createResponseMock(approveReq);
    await marketIntelligenceController.approveRecommendation(approveReq, approveRes, next);
    expect(approveRes.payload.data.uiStatus).toBe('approved');

    const publishReq = { user: adminUser, query: {}, params: { recommendationId: '507f1f77bcf86cd799439410' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const publishRes = createResponseMock(publishReq);
    await marketIntelligenceController.publishRecommendation(publishReq, publishRes, next);
    expect(publishRes.payload.data.uiStatus).toBe('published');

    const retractReq = { user: adminUser, query: {}, params: { recommendationId: '507f1f77bcf86cd799439411' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const retractRes = createResponseMock(retractReq);
    await marketIntelligenceController.retractRecommendation(retractReq, retractRes, next);
    expect(retractRes.payload.data.uiStatus).toBe('retracted');

    mockDataSourceModel.find.mockReturnValue(createPagedQuery([{ _id: '507f1f77bcf86cd799439412', status: 'active' }]));
    mockDataSourceModel.countDocuments.mockResolvedValue(1);
    const listSourceReq = { user: adminUser, query: { page: '1', limit: '20' }, params: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const listSourceRes = createResponseMock(listSourceReq);
    await marketIntelligenceController.listDataSources(listSourceReq, listSourceRes, next);
    expect(listSourceRes.payload.data[0].uiStatus).toBe('active');

    mockDataSourceModel.create.mockResolvedValue({ _id: '507f1f77bcf86cd799439413', status: 'active' });
    const createSourceReq = { user: adminUser, query: {}, params: {}, body: { name: 'Regional API', provider: 'acme' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const createSourceRes = createResponseMock(createSourceReq);
    await marketIntelligenceController.createDataSource(createSourceReq, createSourceRes, next);
    expect(createSourceRes.statusCode).toBe(201);

    const sourceForRefresh = {
      _id: '507f1f77bcf86cd799439414',
      status: 'active',
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockDataSourceModel.findOne.mockResolvedValueOnce(sourceForRefresh);
    const refreshReq = { user: adminUser, query: {}, params: { sourceId: '507f1f77bcf86cd799439414' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const refreshRes = createResponseMock(refreshReq);
    await marketIntelligenceController.refreshDataSource(refreshReq, refreshRes, next);
    expect(refreshRes.payload.data.uiStatus).toBe('active');
    expect(sourceForRefresh.lastRefreshAt).toEqual(expect.any(Date));
  });
});
