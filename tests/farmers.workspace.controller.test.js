const mockService = {
  getFarmById: jest.fn(),
  deleteFarm: jest.fn(),
  createPlot: jest.fn(),
  getPlot: jest.fn(),
  updatePlot: jest.fn(),
  deletePlot: jest.fn(),
  getFarmerCrops: jest.fn(),
  getCropProduction: jest.fn(),
  updateCropProduction: jest.fn(),
  deleteCropProduction: jest.fn(),
  getFarmerGrowthStages: jest.fn(),
  createGrowthStage: jest.fn(),
  getGrowthStage: jest.fn(),
  updateGrowthStage: jest.fn(),
  deleteGrowthStage: jest.fn(),
  getFarmerYieldPredictions: jest.fn(),
  createYieldPrediction: jest.fn(),
  getYieldPrediction: jest.fn(),
  updateYieldPrediction: jest.fn(),
  deleteYieldPrediction: jest.fn(),
  refreshYieldPrediction: jest.fn(),
  createInput: jest.fn(),
  getInput: jest.fn(),
  updateInput: jest.fn(),
  deleteInput: jest.fn(),
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

const adminUser = { id: '507f1f77bcf86cd799439011', role: 'platform_admin' };

describe('Farmers workspace entity controllers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('farms get/delete endpoints return deterministic success envelope', async () => {
    const farm = { _id: '507f1f77bcf86cd799439021', farmName: 'North Farm' };
    mockService.getFarmById.mockResolvedValue(farm);
    mockService.deleteFarm.mockResolvedValue(undefined);

    const getReq = { params: { farmId: '507f1f77bcf86cd799439021' }, user: adminUser };
    const getRes = createResponseMock(getReq);
    const next = jest.fn();
    await controller.getFarm(getReq, getRes, next);

    expect(next).not.toHaveBeenCalled();
    expect(getRes.payload.success).toBe(true);
    expect(getRes.payload.data).toEqual(farm);

    const delReq = { params: { farmId: '507f1f77bcf86cd799439021' }, user: adminUser };
    const delRes = createResponseMock(delReq);
    await controller.deleteFarm(delReq, delRes, next);

    expect(mockService.deleteFarm).toHaveBeenCalledTimes(1);
    expect(delRes.payload.success).toBe(true);
    expect(delRes.payload.data).toBeNull();
  });

  test('plots CRUD endpoints return updated payloads', async () => {
    const next = jest.fn();
    const plot = { _id: '507f1f77bcf86cd799439031', plotName: 'Plot A' };
    const updatedPlot = { ...plot, plotName: 'Plot B' };
    mockService.createPlot.mockResolvedValue(plot);
    mockService.getPlot.mockResolvedValue(plot);
    mockService.updatePlot.mockResolvedValue(updatedPlot);
    mockService.deletePlot.mockResolvedValue(undefined);

    const createReq = {
      params: { farmerId: '507f1f77bcf86cd799439012' },
      body: { plotName: 'Plot A', area: 2, areaUnit: 'acres' },
      user: adminUser,
    };
    const createRes = createResponseMock(createReq);
    await controller.createPlot(createReq, createRes, next);

    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.success).toBe(true);
    expect(createRes.payload.data).toEqual(plot);

    const getReq = { params: { plotId: '507f1f77bcf86cd799439031' }, user: adminUser };
    const getRes = createResponseMock(getReq);
    await controller.getPlot(getReq, getRes, next);
    expect(getRes.payload.data).toEqual(plot);

    const updateReq = {
      params: { plotId: '507f1f77bcf86cd799439031' },
      body: { plotName: 'Plot B' },
      user: adminUser,
    };
    const updateRes = createResponseMock(updateReq);
    await controller.updatePlot(updateReq, updateRes, next);
    expect(updateRes.payload.data).toEqual(updatedPlot);

    const deleteReq = { params: { plotId: '507f1f77bcf86cd799439031' }, user: adminUser };
    const deleteRes = createResponseMock(deleteReq);
    await controller.deletePlot(deleteReq, deleteRes, next);
    expect(deleteRes.payload.success).toBe(true);
    expect(deleteRes.payload.data).toBeNull();
  });

  test('crops list/update/delete endpoints work with consistent envelopes', async () => {
    const next = jest.fn();
    const crop = { _id: '507f1f77bcf86cd799439041', cropName: 'Maize', uiStatus: 'active' };
    const updatedCrop = { ...crop, productionStatus: 'harvested' };
    mockService.getFarmerCrops.mockResolvedValue({
      crops: [crop],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    mockService.getCropProduction.mockResolvedValue(crop);
    mockService.updateCropProduction.mockResolvedValue(updatedCrop);
    mockService.deleteCropProduction.mockResolvedValue(undefined);

    const listReq = {
      params: { farmerId: '507f1f77bcf86cd799439012' },
      query: {},
      user: adminUser,
    };
    const listRes = createResponseMock(listReq);
    await controller.getFarmerCrops(listReq, listRes, next);
    expect(listRes.payload.success).toBe(true);
    expect(listRes.payload.meta.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    expect(listRes.payload.data).toEqual([crop]);

    const updateReq = {
      params: { cropId: '507f1f77bcf86cd799439041' },
      body: { productionStatus: 'harvested' },
      user: adminUser,
    };
    const updateRes = createResponseMock(updateReq);
    await controller.updateCropProduction(updateReq, updateRes, next);
    expect(updateRes.payload.data).toEqual(updatedCrop);

    const deleteReq = { params: { cropId: '507f1f77bcf86cd799439041' }, user: adminUser };
    const deleteRes = createResponseMock(deleteReq);
    await controller.deleteCropProduction(deleteReq, deleteRes, next);
    expect(deleteRes.payload.data).toBeNull();
  });

  test('growth stages CRUD endpoints return deterministic payloads', async () => {
    const next = jest.fn();
    const stage = { _id: '507f1f77bcf86cd799439061', stage: 'vegetative', status: 'active' };
    const updatedStage = { ...stage, status: 'completed' };

    mockService.getFarmerGrowthStages.mockResolvedValue({
      stages: [stage],
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
    mockService.createGrowthStage.mockResolvedValue(stage);
    mockService.getGrowthStage.mockResolvedValue(stage);
    mockService.updateGrowthStage.mockResolvedValue(updatedStage);
    mockService.deleteGrowthStage.mockResolvedValue(undefined);

    const listReq = {
      params: { farmerId: '507f1f77bcf86cd799439012' },
      query: { page: '1', limit: '10' },
      user: adminUser,
    };
    const listRes = createResponseMock(listReq);
    await controller.getFarmerGrowthStages(listReq, listRes, next);
    expect(listRes.payload.success).toBe(true);
    expect(listRes.payload.meta.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
    expect(listRes.payload.data).toEqual([stage]);

    const createReq = {
      params: { farmerId: '507f1f77bcf86cd799439012' },
      body: { cycleId: '507f1f77bcf86cd799439041', stage: 'vegetative' },
      user: adminUser,
    };
    const createRes = createResponseMock(createReq);
    await controller.createGrowthStage(createReq, createRes, next);
    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data).toEqual(stage);

    const getReq = { params: { stageId: '507f1f77bcf86cd799439061' }, user: adminUser };
    const getRes = createResponseMock(getReq);
    await controller.getGrowthStage(getReq, getRes, next);
    expect(getRes.payload.data).toEqual(stage);

    const updateReq = {
      params: { stageId: '507f1f77bcf86cd799439061' },
      body: { status: 'completed' },
      user: adminUser,
    };
    const updateRes = createResponseMock(updateReq);
    await controller.updateGrowthStage(updateReq, updateRes, next);
    expect(updateRes.payload.data).toEqual(updatedStage);

    const deleteReq = { params: { stageId: '507f1f77bcf86cd799439061' }, user: adminUser };
    const deleteRes = createResponseMock(deleteReq);
    await controller.deleteGrowthStage(deleteReq, deleteRes, next);
    expect(deleteRes.payload.data).toBeNull();
  });

  test('yield prediction CRUD + refresh endpoints return deterministic payloads', async () => {
    const next = jest.fn();
    const prediction = {
      _id: '507f1f77bcf86cd799439071',
      cropId: '507f1f77bcf86cd799439041',
      predictedYield: 4300,
      confidence: 0.81,
      status: 'generated',
    };
    const refreshed = { ...prediction, status: 'refreshed', refreshedAt: '2026-03-01T00:00:00.000Z' };

    mockService.getFarmerYieldPredictions.mockResolvedValue({
      predictions: [prediction],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    mockService.createYieldPrediction.mockResolvedValue(prediction);
    mockService.getYieldPrediction.mockResolvedValue(prediction);
    mockService.updateYieldPrediction.mockResolvedValue({ ...prediction, predictedYield: 4400 });
    mockService.deleteYieldPrediction.mockResolvedValue(undefined);
    mockService.refreshYieldPrediction.mockResolvedValue(refreshed);

    const listReq = {
      params: { farmerId: '507f1f77bcf86cd799439012' },
      query: {},
      user: adminUser,
    };
    const listRes = createResponseMock(listReq);
    await controller.getFarmerYieldPredictions(listReq, listRes, next);
    expect(listRes.payload.success).toBe(true);
    expect(listRes.payload.meta.pagination.total).toBe(1);
    expect(listRes.payload.data).toEqual([prediction]);

    const createReq = {
      params: { farmerId: '507f1f77bcf86cd799439012' },
      body: {
        cropId: '507f1f77bcf86cd799439041',
        predictedYield: 4300,
        confidence: 0.81,
        horizonDays: 30,
      },
      user: adminUser,
    };
    const createRes = createResponseMock(createReq);
    await controller.createYieldPrediction(createReq, createRes, next);
    expect(createRes.statusCode).toBe(201);

    const refreshReq = {
      params: { predictionId: '507f1f77bcf86cd799439071' },
      body: { predictedYield: 4450 },
      user: adminUser,
    };
    const refreshRes = createResponseMock(refreshReq);
    await controller.refreshYieldPrediction(refreshReq, refreshRes, next);
    expect(refreshRes.payload.data.status).toBe('refreshed');

    const deleteReq = { params: { predictionId: '507f1f77bcf86cd799439071' }, user: adminUser };
    const deleteRes = createResponseMock(deleteReq);
    await controller.deleteYieldPrediction(deleteReq, deleteRes, next);
    expect(deleteRes.payload.data).toBeNull();
  });

  test('inputs CRUD endpoints work with consistent envelopes', async () => {
    const next = jest.fn();
    const input = { _id: '507f1f77bcf86cd799439051', inputName: 'NPK', inputType: 'fertilizer' };
    const updatedInput = { ...input, quantity: 20 };
    mockService.createInput.mockResolvedValue(input);
    mockService.getInput.mockResolvedValue(input);
    mockService.updateInput.mockResolvedValue(updatedInput);
    mockService.deleteInput.mockResolvedValue(undefined);

    const createReq = {
      params: { farmerId: '507f1f77bcf86cd799439012' },
      body: { inputName: 'NPK', inputType: 'fertilizer', quantity: 10, unit: 'kg' },
      user: adminUser,
    };
    const createRes = createResponseMock(createReq);
    await controller.createInput(createReq, createRes, next);
    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data).toEqual(input);

    const updateReq = {
      params: { inputId: '507f1f77bcf86cd799439051' },
      body: { quantity: 20 },
      user: adminUser,
    };
    const updateRes = createResponseMock(updateReq);
    await controller.updateInput(updateReq, updateRes, next);
    expect(updateRes.payload.data).toEqual(updatedInput);

    const deleteReq = { params: { inputId: '507f1f77bcf86cd799439051' }, user: adminUser };
    const deleteRes = createResponseMock(deleteReq);
    await controller.deleteInput(deleteReq, deleteRes, next);
    expect(deleteRes.payload.success).toBe(true);
    expect(deleteRes.payload.data).toBeNull();
  });
});
