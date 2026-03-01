const mockService = {
  getFarmerReports: jest.fn(),
  createReportJson: jest.fn(),
  updateReportJson: jest.fn(),
  deleteReport: jest.fn(),
  assignReport: jest.fn(),
  closeReport: jest.fn(),
};

jest.mock('../dist/modules/pest-disease/pestDisease.service', () => ({
  __esModule: true,
  default: mockService,
}));

jest.mock('../dist/modules/pest-disease/outbreakAnalytics.service', () => ({
  __esModule: true,
  default: {},
}));

const controller = require('../dist/modules/pest-disease/pestDisease.controller');

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

describe('Pest-disease workspace JSON CRUD and lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const user = {
    id: '507f1f77bcf86cd799439401',
    role: 'platform_admin',
  };

  test('getFarmerReports returns paginated meta contract', async () => {
    const req = {
      params: { farmerId: '507f1f77bcf86cd799439402' },
      query: { page: '2', limit: '5', status: 'assigned' },
      user,
    };
    const res = createResponseMock(req);
    const next = jest.fn();

    const reports = [{ _id: '507f1f77bcf86cd799439403', uiStatus: 'assigned' }];
    mockService.getFarmerReports.mockResolvedValue({ reports, total: 11 });

    await controller.getFarmerReports(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.payload.success).toBe(true);
    expect(res.payload.data).toEqual(reports);
    expect(res.payload.meta.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 11,
      totalPages: 3,
    });
  });

  test('create/update/delete report JSON endpoints return deterministic envelopes', async () => {
    const next = jest.fn();
    const report = { _id: '507f1f77bcf86cd799439404', uiStatus: 'created' };
    const updated = { ...report, uiStatus: 'resolved' };
    mockService.createReportJson.mockResolvedValue(report);
    mockService.updateReportJson.mockResolvedValue(updated);
    mockService.deleteReport.mockResolvedValue(undefined);

    const createReq = {
      params: { farmerId: '507f1f77bcf86cd799439402' },
      body: {
        farmId: '507f1f77bcf86cd799439405',
        fieldContext: { cropType: 'maize', longitude: 32.5, latitude: 0.3 },
      },
      user,
    };
    const createRes = createResponseMock(createReq);
    await controller.createReportJson(createReq, createRes, next);
    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data).toEqual(report);

    const updateReq = {
      params: { reportId: '507f1f77bcf86cd799439404' },
      body: { outcome: { isResolved: true } },
      user,
    };
    const updateRes = createResponseMock(updateReq);
    await controller.updateReport(updateReq, updateRes, next);
    expect(updateRes.payload.data).toEqual(updated);

    const deleteReq = {
      params: { reportId: '507f1f77bcf86cd799439404' },
      user,
    };
    const deleteRes = createResponseMock(deleteReq);
    await controller.deleteReport(deleteReq, deleteRes, next);
    expect(deleteRes.payload.success).toBe(true);
    expect(deleteRes.payload.data).toBeNull();
  });

  test('assign and close lifecycle endpoints return updated report payload', async () => {
    const next = jest.fn();
    const assigned = { _id: '507f1f77bcf86cd799439406', uiStatus: 'assigned' };
    const closed = { ...assigned, uiStatus: 'closed' };
    mockService.assignReport.mockResolvedValue(assigned);
    mockService.closeReport.mockResolvedValue(closed);

    const assignReq = {
      params: { reportId: '507f1f77bcf86cd799439406' },
      body: { notes: 'Escalate to agronomist' },
      user,
    };
    const assignRes = createResponseMock(assignReq);
    await controller.assignReport(assignReq, assignRes, next);
    expect(assignRes.payload.data).toEqual(assigned);

    const closeReq = {
      params: { reportId: '507f1f77bcf86cd799439406' },
      body: { reason: 'Resolved in field' },
      user,
    };
    const closeRes = createResponseMock(closeReq);
    await controller.closeReport(closeReq, closeRes, next);
    expect(closeRes.payload.data).toEqual(closed);
  });
});
