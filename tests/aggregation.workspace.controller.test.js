const mockService = {
  listStorageBins: jest.fn(),
  createStorageBin: jest.fn(),
  getStorageBin: jest.fn(),
  updateStorageBin: jest.fn(),
  deleteStorageBin: jest.fn(),
  listBatches: jest.fn(),
  createBatch: jest.fn(),
  getBatch: jest.fn(),
  updateBatch: jest.fn(),
  deleteBatch: jest.fn(),
  listQualityGrades: jest.fn(),
  createQualityGrade: jest.fn(),
  getQualityGrade: jest.fn(),
  updateQualityGrade: jest.fn(),
  deleteQualityGrade: jest.fn(),
  getStockMovement: jest.fn(),
  updateStockMovement: jest.fn(),
  deleteStockMovement: jest.fn(),
  listSpoilageReports: jest.fn(),
  createSpoilageReport: jest.fn(),
  getSpoilageReport: jest.fn(),
  updateSpoilageReport: jest.fn(),
  deleteSpoilageReport: jest.fn(),
};

jest.mock('../dist/modules/aggregation/aggregation.service', () => ({
  __esModule: true,
  default: mockService,
}));

const controller = require('../dist/modules/aggregation/aggregation.controller').default;

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

const user = {
  id: '507f1f77bcf86cd799439011',
  role: 'platform_admin',
  orgId: '507f1f77bcf86cd799439012',
};

describe('Aggregation workspace controller contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('storage bins list/create/get/update/delete use deterministic envelope', async () => {
    const next = jest.fn();
    const bin = { _id: '507f1f77bcf86cd799439111', status: 'available' };
    const updatedBin = { ...bin, status: 'occupied' };
    mockService.listStorageBins.mockResolvedValue({
      data: [bin],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    mockService.createStorageBin.mockResolvedValue(bin);
    mockService.getStorageBin.mockResolvedValue(bin);
    mockService.updateStorageBin.mockResolvedValue(updatedBin);
    mockService.deleteStorageBin.mockResolvedValue(undefined);

    const listReq = {
      params: { warehouseId: '507f1f77bcf86cd799439121' },
      query: { page: '1', limit: '20' },
      user,
      headers: {},
    };
    const listRes = createResponseMock(listReq);
    await controller.listStorageBins(listReq, listRes, next);
    expect(listRes.payload.success).toBe(true);
    expect(listRes.payload.data).toEqual([bin]);
    expect(listRes.payload.meta.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });

    const createReq = {
      params: { warehouseId: '507f1f77bcf86cd799439121' },
      body: { name: 'Bin A', capacity: 1000, status: 'available' },
      user,
      headers: {},
      query: {},
    };
    const createRes = createResponseMock(createReq);
    await controller.createStorageBin(createReq, createRes, next);
    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data).toEqual(bin);

    const getReq = {
      params: { binId: '507f1f77bcf86cd799439111' },
      user,
      headers: {},
      query: {},
    };
    const getRes = createResponseMock(getReq);
    await controller.getStorageBin(getReq, getRes, next);
    expect(getRes.payload.data).toEqual(bin);

    const updateReq = {
      params: { binId: '507f1f77bcf86cd799439111' },
      body: { status: 'occupied' },
      user,
      headers: {},
      query: {},
    };
    const updateRes = createResponseMock(updateReq);
    await controller.updateStorageBin(updateReq, updateRes, next);
    expect(updateRes.payload.data).toEqual(updatedBin);

    const deleteReq = {
      params: { binId: '507f1f77bcf86cd799439111' },
      user,
      headers: {},
      query: {},
    };
    const deleteRes = createResponseMock(deleteReq);
    await controller.deleteStorageBin(deleteReq, deleteRes, next);
    expect(deleteRes.payload.success).toBe(true);
    expect(deleteRes.payload.data).toBeNull();
  });

  test('batches and quality grades CRUD endpoints return updated payloads', async () => {
    const next = jest.fn();
    const batch = { _id: '507f1f77bcf86cd799439131', status: 'received' };
    const grade = { _id: '507f1f77bcf86cd799439132', status: 'draft' };
    mockService.listBatches.mockResolvedValue({
      data: [batch],
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
    mockService.createBatch.mockResolvedValue(batch);
    mockService.getBatch.mockResolvedValue(batch);
    mockService.updateBatch.mockResolvedValue({ ...batch, status: 'stored' });
    mockService.deleteBatch.mockResolvedValue(undefined);
    mockService.listQualityGrades.mockResolvedValue({
      data: [grade],
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
    mockService.createQualityGrade.mockResolvedValue(grade);
    mockService.getQualityGrade.mockResolvedValue(grade);
    mockService.updateQualityGrade.mockResolvedValue({ ...grade, status: 'verified' });
    mockService.deleteQualityGrade.mockResolvedValue(undefined);

    const listBatchReq = { query: { page: '1', limit: '10' }, user, headers: {}, params: {} };
    const listBatchRes = createResponseMock(listBatchReq);
    await controller.listBatches(listBatchReq, listBatchRes, next);
    expect(listBatchRes.payload.meta.pagination.total).toBe(1);

    const createBatchReq = {
      body: {
        commodity: 'Maize',
        quantity: 2000,
        unit: 'kg',
        warehouseId: '507f1f77bcf86cd799439121',
      },
      user,
      headers: {},
      params: {},
      query: {},
    };
    const createBatchRes = createResponseMock(createBatchReq);
    await controller.createBatch(createBatchReq, createBatchRes, next);
    expect(createBatchRes.statusCode).toBe(201);
    expect(createBatchRes.payload.data).toEqual(batch);

    const getBatchReq = {
      params: { batchId: '507f1f77bcf86cd799439131' },
      user,
      headers: {},
      body: {},
      query: {},
    };
    const getBatchRes = createResponseMock(getBatchReq);
    await controller.getBatch(getBatchReq, getBatchRes, next);
    expect(getBatchRes.payload.data).toEqual(batch);

    const updateBatchReq = {
      params: { batchId: '507f1f77bcf86cd799439131' },
      body: { status: 'stored' },
      user,
      headers: {},
      query: {},
    };
    const updateBatchRes = createResponseMock(updateBatchReq);
    await controller.updateBatch(updateBatchReq, updateBatchRes, next);
    expect(updateBatchRes.payload.data.status).toBe('stored');

    const deleteBatchReq = {
      params: { batchId: '507f1f77bcf86cd799439131' },
      user,
      headers: {},
      body: {},
      query: {},
    };
    const deleteBatchRes = createResponseMock(deleteBatchReq);
    await controller.deleteBatch(deleteBatchReq, deleteBatchRes, next);
    expect(deleteBatchRes.payload.data).toBeNull();

    const listGradeReq = { query: { page: '1', limit: '10' }, user, headers: {}, params: {} };
    const listGradeRes = createResponseMock(listGradeReq);
    await controller.listQualityGrades(listGradeReq, listGradeRes, next);
    expect(listGradeRes.payload.meta.pagination.totalPages).toBe(1);

    const createGradeReq = {
      body: { batchId: '507f1f77bcf86cd799439131', grade: 'A' },
      user,
      headers: {},
      params: {},
      query: {},
    };
    const createGradeRes = createResponseMock(createGradeReq);
    await controller.createQualityGrade(createGradeReq, createGradeRes, next);
    expect(createGradeRes.statusCode).toBe(201);
    expect(createGradeRes.payload.data).toEqual(grade);

    const getGradeReq = {
      params: { gradeId: '507f1f77bcf86cd799439132' },
      body: {},
      query: {},
      user,
      headers: {},
    };
    const getGradeRes = createResponseMock(getGradeReq);
    await controller.getQualityGrade(getGradeReq, getGradeRes, next);
    expect(getGradeRes.payload.data).toEqual(grade);

    const updateGradeReq = {
      params: { gradeId: '507f1f77bcf86cd799439132' },
      body: { status: 'verified' },
      query: {},
      user,
      headers: {},
    };
    const updateGradeRes = createResponseMock(updateGradeReq);
    await controller.updateQualityGrade(updateGradeReq, updateGradeRes, next);
    expect(updateGradeRes.payload.data.status).toBe('verified');

    const deleteGradeReq = {
      params: { gradeId: '507f1f77bcf86cd799439132' },
      body: {},
      query: {},
      user,
      headers: {},
    };
    const deleteGradeRes = createResponseMock(deleteGradeReq);
    await controller.deleteQualityGrade(deleteGradeReq, deleteGradeRes, next);
    expect(deleteGradeRes.payload.data).toBeNull();
  });

  test('stock movement get/update/delete returns deterministic envelopes', async () => {
    const next = jest.fn();
    const movement = {
      id: '507f1f77bcf86cd799439141',
      movementType: 'transfer',
      status: 'draft',
    };
    const updated = { ...movement, status: 'confirmed' };
    mockService.getStockMovement.mockResolvedValue(movement);
    mockService.updateStockMovement.mockResolvedValue(updated);
    mockService.deleteStockMovement.mockResolvedValue(undefined);

    const getReq = {
      params: { movementId: '507f1f77bcf86cd799439141' },
      body: {},
      query: {},
      user,
      headers: {},
    };
    const getRes = createResponseMock(getReq);
    await controller.getStockMovement(getReq, getRes, next);
    expect(getRes.payload.data).toEqual(movement);

    const updateReq = {
      params: { movementId: '507f1f77bcf86cd799439141' },
      body: { status: 'confirmed', note: 'Carrier accepted' },
      query: {},
      user,
      headers: {},
    };
    const updateRes = createResponseMock(updateReq);
    await controller.updateStockMovement(updateReq, updateRes, next);
    expect(updateRes.payload.data).toEqual(updated);

    const deleteReq = {
      params: { movementId: '507f1f77bcf86cd799439141' },
      body: {},
      query: {},
      user,
      headers: {},
    };
    const deleteRes = createResponseMock(deleteReq);
    await controller.deleteStockMovement(deleteReq, deleteRes, next);
    expect(deleteRes.payload.success).toBe(true);
    expect(deleteRes.payload.data).toBeNull();
  });

  test('spoilage reports list/create/get/update/delete use consistent contract', async () => {
    const next = jest.fn();
    const report = { _id: '507f1f77bcf86cd799439151', status: 'reported' };
    mockService.listSpoilageReports.mockResolvedValue({
      data: [report],
      page: 2,
      limit: 5,
      total: 6,
      totalPages: 2,
    });
    mockService.createSpoilageReport.mockResolvedValue(report);
    mockService.getSpoilageReport.mockResolvedValue(report);
    mockService.updateSpoilageReport.mockResolvedValue({ ...report, status: 'approved' });
    mockService.deleteSpoilageReport.mockResolvedValue(undefined);

    const listReq = {
      query: { page: '2', limit: '5' },
      user,
      headers: {},
      params: {},
      body: {},
    };
    const listRes = createResponseMock(listReq);
    await controller.listSpoilageReports(listReq, listRes, next);
    expect(listRes.payload.meta.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 6,
      totalPages: 2,
    });

    const createReq = {
      body: {
        batchId: '507f1f77bcf86cd799439131',
        quantity: 30,
        unit: 'kg',
        cause: 'Moisture damage',
      },
      query: {},
      params: {},
      user,
      headers: {},
    };
    const createRes = createResponseMock(createReq);
    await controller.createSpoilageReport(createReq, createRes, next);
    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data).toEqual(report);

    const getReq = {
      params: { reportId: '507f1f77bcf86cd799439151' },
      body: {},
      query: {},
      user,
      headers: {},
    };
    const getRes = createResponseMock(getReq);
    await controller.getSpoilageReport(getReq, getRes, next);
    expect(getRes.payload.data).toEqual(report);

    const updateReq = {
      params: { reportId: '507f1f77bcf86cd799439151' },
      body: { status: 'approved' },
      query: {},
      user,
      headers: {},
    };
    const updateRes = createResponseMock(updateReq);
    await controller.updateSpoilageReport(updateReq, updateRes, next);
    expect(updateRes.payload.data.status).toBe('approved');

    const deleteReq = {
      params: { reportId: '507f1f77bcf86cd799439151' },
      body: {},
      query: {},
      user,
      headers: {},
    };
    const deleteRes = createResponseMock(deleteReq);
    await controller.deleteSpoilageReport(deleteReq, deleteRes, next);
    expect(deleteRes.payload.data).toBeNull();
  });
});
