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
    const crop = { _id: '507f1f77bcf86cd799439041', cropName: 'Maize' };
    const updatedCrop = { ...crop, productionStatus: 'harvested' };
    mockService.getFarmerCrops.mockResolvedValue([crop]);
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
