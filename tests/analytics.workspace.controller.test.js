const mockAnalyticsService = {
  listDatasets: jest.fn(),
  createDataset: jest.fn(),
  getDataset: jest.fn(),
  updateDataset: jest.fn(),
  deleteDataset: jest.fn(),
  previewChart: jest.fn(),
  createChart: jest.fn(),
  listCharts: jest.fn(),
  getChart: jest.fn(),
  updateChart: jest.fn(),
  publishChart: jest.fn(),
  archiveChart: jest.fn(),
  deleteChart: jest.fn(),
  executeChartQuery: jest.fn(),
  createDashboard: jest.fn(),
  listDashboards: jest.fn(),
  getDashboard: jest.fn(),
  updateDashboard: jest.fn(),
  publishDashboard: jest.fn(),
  archiveDashboard: jest.fn(),
  deleteDashboard: jest.fn(),
  addChartToDashboard: jest.fn(),
  removeChartFromDashboard: jest.fn(),
  reorderDashboardCharts: jest.fn(),
  updateDashboardSharing: jest.fn(),
  listDashboardTemplates: jest.fn(),
  createDashboardTemplate: jest.fn(),
  getDashboardTemplate: jest.fn(),
  updateDashboardTemplate: jest.fn(),
  publishDashboardTemplate: jest.fn(),
  archiveDashboardTemplate: jest.fn(),
  deleteDashboardTemplate: jest.fn(),
  listReports: jest.fn(),
  createReport: jest.fn(),
  getReport: jest.fn(),
  updateReport: jest.fn(),
  deleteReport: jest.fn(),
  generateReport: jest.fn(),
  exportReport: jest.fn(),
};

const mockExportService = {
  streamExport: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../dist/modules/analytics/analytics.service', () => ({
  __esModule: true,
  default: mockAnalyticsService,
}));

jest.mock('../dist/modules/analytics/analyticsExport.service', () => ({
  __esModule: true,
  analyticsExportService: mockExportService,
}));

const controller = require('../dist/modules/analytics/analytics.controller');

const createResponseMock = (req) => ({
  locals: { requestId: 'req-analytics-1' },
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

const adminUser = {
  id: '507f1f77bcf86cd799439011',
  role: 'admin',
  orgId: '507f1f77bcf86cd799439012',
  farmerId: '507f1f77bcf86cd799439013',
};

const paged = (rows) => ({
  data: rows,
  pagination: {
    page: 1,
    limit: 20,
    total: rows.length,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  },
});

describe('Analytics workspace controller contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('datasets list + CRUD expose deterministic status and pagination metadata', async () => {
    const next = jest.fn();
    mockAnalyticsService.listDatasets.mockResolvedValue(paged([{ id: 'market_sales_daily', name: 'Market', status: 'active' }]));
    mockAnalyticsService.createDataset.mockResolvedValue({ _id: '507f1f77bcf86cd799439101', status: 'active' });
    mockAnalyticsService.getDataset.mockResolvedValue({ _id: '507f1f77bcf86cd799439102', status: 'deprecated' });
    mockAnalyticsService.updateDataset.mockResolvedValue({ _id: '507f1f77bcf86cd799439103', status: 'active' });
    mockAnalyticsService.deleteDataset.mockResolvedValue(undefined);

    const listReq = { user: adminUser, query: { page: '1', limit: '20' }, params: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const listRes = createResponseMock(listReq);
    await controller.listDatasets(listReq, listRes, next);
    expect(listRes.payload.data[0].uiStatus).toBe('active');
    expect(listRes.payload.meta.pagination.total).toBe(1);

    const createReq = { user: adminUser, query: {}, params: {}, body: { name: 'Custom Dataset' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const createRes = createResponseMock(createReq);
    await controller.createDataset(createReq, createRes, next);
    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data.uiStatus).toBe('active');

    const getReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439102' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const getRes = createResponseMock(getReq);
    await controller.getDataset(getReq, getRes, next);
    expect(getRes.payload.data.uiStatus).toBe('deprecated');

    const updateReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439103' }, body: { status: 'active' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const updateRes = createResponseMock(updateReq);
    await controller.updateDataset(updateReq, updateRes, next);
    expect(updateRes.payload.data.uiStatus).toBe('active');

    const deleteReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439103' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const deleteRes = createResponseMock(deleteReq);
    await controller.deleteDataset(deleteReq, deleteRes, next);
    expect(deleteRes.payload.data).toBeNull();
  });

  test('charts CRUD + preview/export + publish/archive status workflow', async () => {
    const next = jest.fn();
    mockAnalyticsService.previewChart.mockResolvedValue({ data: [{ value: 10 }], total: 1, fromCache: false, executedInMs: 10, truncated: false });
    mockAnalyticsService.listCharts.mockResolvedValue(paged([{ _id: '507f1f77bcf86cd799439201', status: 'draft', name: 'A' }]));
    mockAnalyticsService.createChart.mockResolvedValue({ _id: '507f1f77bcf86cd799439202', status: 'draft' });
    mockAnalyticsService.getChart.mockResolvedValue({ _id: '507f1f77bcf86cd799439203', status: 'published', name: 'Published Chart', definition: {} });
    mockAnalyticsService.updateChart.mockResolvedValue({ _id: '507f1f77bcf86cd799439204', status: 'archived' });
    mockAnalyticsService.publishChart.mockResolvedValue({ _id: '507f1f77bcf86cd799439205', status: 'published' });
    mockAnalyticsService.archiveChart.mockResolvedValue({ _id: '507f1f77bcf86cd799439206', status: 'archived' });
    mockAnalyticsService.executeChartQuery.mockResolvedValue({ data: [{ x: 1 }], total: 1, fromCache: false, executedInMs: 1, truncated: false });
    mockAnalyticsService.deleteChart.mockResolvedValue(undefined);

    const previewReq = { user: adminUser, query: {}, params: {}, body: { datasetId: 'market_sales_daily', metrics: [{ type: 'count' }], chartType: 'line' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const previewRes = createResponseMock(previewReq);
    await controller.previewChart(previewReq, previewRes, next);
    expect(previewRes.payload.success).toBe(true);

    const previewExportReq = { user: adminUser, query: {}, params: {}, body: { definition: { datasetId: 'market_sales_daily', metrics: [{ type: 'count' }], chartType: 'line' }, format: 'csv', filename: 'preview' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const previewExportRes = createResponseMock(previewExportReq);
    await controller.previewChartExport(previewExportReq, previewExportRes, next);
    expect(mockExportService.streamExport).toHaveBeenCalled();

    const listReq = { user: adminUser, query: { page: '1', limit: '20' }, params: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const listRes = createResponseMock(listReq);
    await controller.listCharts(listReq, listRes, next);
    expect(listRes.payload.data.data[0].uiStatus).toBe('draft');

    const createReq = { user: adminUser, query: {}, params: {}, body: { name: 'New', definition: { datasetId: 'market_sales_daily', metrics: [{ type: 'count' }], chartType: 'line' } }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const createRes = createResponseMock(createReq);
    await controller.createChart(createReq, createRes, next);
    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data.uiStatus).toBe('draft');

    const getReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439203' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const getRes = createResponseMock(getReq);
    await controller.getChart(getReq, getRes, next);
    expect(getRes.payload.data.uiStatus).toBe('published');

    const updateReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439204' }, body: { status: 'archived' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const updateRes = createResponseMock(updateReq);
    await controller.updateChart(updateReq, updateRes, next);
    expect(updateRes.payload.data.uiStatus).toBe('archived');

    const publishReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439205' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const publishRes = createResponseMock(publishReq);
    await controller.publishChart(publishReq, publishRes, next);
    expect(publishRes.payload.data.uiStatus).toBe('published');

    const archiveReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439206' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const archiveRes = createResponseMock(archiveReq);
    await controller.archiveChart(archiveReq, archiveRes, next);
    expect(archiveRes.payload.data.uiStatus).toBe('archived');

    const exportReq = { user: adminUser, query: { format: 'csv' }, params: { id: '507f1f77bcf86cd799439203' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const exportRes = createResponseMock(exportReq);
    await controller.exportChart(exportReq, exportRes, next);
    expect(mockExportService.streamExport).toHaveBeenCalled();

    const deleteReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439206' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const deleteRes = createResponseMock(deleteReq);
    await controller.deleteChart(deleteReq, deleteRes, next);
    expect(deleteRes.payload.data).toBeNull();

    mockAnalyticsService.updateChart.mockRejectedValueOnce({ statusCode: 400, message: 'invalid transition' });
    const invalidReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439207' }, body: { status: 'draft' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const invalidRes = createResponseMock(invalidReq);
    await controller.updateChart(invalidReq, invalidRes, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  test('dashboards and templates support lifecycle, chart reorder, and sharing updates', async () => {
    const next = jest.fn();
    mockAnalyticsService.listDashboards.mockResolvedValue(paged([{ _id: '507f1f77bcf86cd799439301', status: 'draft' }]));
    mockAnalyticsService.createDashboard.mockResolvedValue({ _id: '507f1f77bcf86cd799439302', status: 'draft' });
    mockAnalyticsService.getDashboard.mockResolvedValue({ _id: '507f1f77bcf86cd799439303', status: 'published' });
    mockAnalyticsService.updateDashboard.mockResolvedValue({ _id: '507f1f77bcf86cd799439304', status: 'published' });
    mockAnalyticsService.addChartToDashboard.mockResolvedValue({ _id: '507f1f77bcf86cd799439305', status: 'published' });
    mockAnalyticsService.removeChartFromDashboard.mockResolvedValue({ _id: '507f1f77bcf86cd799439306', status: 'published' });
    mockAnalyticsService.reorderDashboardCharts.mockResolvedValue({ _id: '507f1f77bcf86cd799439307', status: 'published' });
    mockAnalyticsService.updateDashboardSharing.mockResolvedValue({ _id: '507f1f77bcf86cd799439308', status: 'published' });
    mockAnalyticsService.publishDashboard.mockResolvedValue({ _id: '507f1f77bcf86cd799439309', status: 'published' });
    mockAnalyticsService.archiveDashboard.mockResolvedValue({ _id: '507f1f77bcf86cd799439310', status: 'archived' });
    mockAnalyticsService.deleteDashboard.mockResolvedValue(undefined);

    mockAnalyticsService.listDashboardTemplates.mockResolvedValue(paged([{ _id: '507f1f77bcf86cd799439401', status: 'draft' }]));
    mockAnalyticsService.createDashboardTemplate.mockResolvedValue({ _id: '507f1f77bcf86cd799439402', status: 'draft' });
    mockAnalyticsService.getDashboardTemplate.mockResolvedValue({ _id: '507f1f77bcf86cd799439403', status: 'published' });
    mockAnalyticsService.updateDashboardTemplate.mockResolvedValue({ _id: '507f1f77bcf86cd799439404', status: 'published' });
    mockAnalyticsService.publishDashboardTemplate.mockResolvedValue({ _id: '507f1f77bcf86cd799439405', status: 'published' });
    mockAnalyticsService.archiveDashboardTemplate.mockResolvedValue({ _id: '507f1f77bcf86cd799439406', status: 'archived' });
    mockAnalyticsService.deleteDashboardTemplate.mockResolvedValue(undefined);

    const listReq = { user: adminUser, query: { page: '1', limit: '20' }, params: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const listRes = createResponseMock(listReq);
    await controller.listDashboards(listReq, listRes, next);
    expect(listRes.payload.data.data[0].uiStatus).toBe('draft');

    const createReq = { user: adminUser, query: {}, params: {}, body: { name: 'Ops' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const createRes = createResponseMock(createReq);
    await controller.createDashboard(createReq, createRes, next);
    expect(createRes.payload.data.uiStatus).toBe('draft');

    const getReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439303' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const getRes = createResponseMock(getReq);
    await controller.getDashboard(getReq, getRes, next);
    expect(getRes.payload.data.uiStatus).toBe('published');

    const updateReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439304' }, body: { status: 'published' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const updateRes = createResponseMock(updateReq);
    await controller.updateDashboard(updateReq, updateRes, next);
    expect(updateRes.payload.data.uiStatus).toBe('published');

    const addReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439305' }, body: { chartId: '507f1f77bcf86cd799439999', position: { col: 0, row: 0 }, size: { w: 6, h: 4 } }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const addRes = createResponseMock(addReq);
    await controller.addChartToDashboard(addReq, addRes, next);
    expect(addRes.payload.data.uiStatus).toBe('published');

    const removeReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439306', chartId: '507f1f77bcf86cd799439999' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const removeRes = createResponseMock(removeReq);
    await controller.removeChartFromDashboard(removeReq, removeRes, next);
    expect(removeRes.payload.data.uiStatus).toBe('published');

    const reorderReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439307' }, body: { items: [{ chartId: '507f1f77bcf86cd799439999', position: { col: 1, row: 0 }, size: { w: 6, h: 4 } }] }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const reorderRes = createResponseMock(reorderReq);
    await controller.reorderDashboardCharts(reorderReq, reorderRes, next);
    expect(reorderRes.payload.data.uiStatus).toBe('published');

    const sharingReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439308' }, body: { scope: 'public' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const sharingRes = createResponseMock(sharingReq);
    await controller.updateDashboardSharing(sharingReq, sharingRes, next);
    expect(sharingRes.payload.data.uiStatus).toBe('published');

    const publishReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439309' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const publishRes = createResponseMock(publishReq);
    await controller.publishDashboard(publishReq, publishRes, next);
    expect(publishRes.payload.data.uiStatus).toBe('published');

    const archiveReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439310' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const archiveRes = createResponseMock(archiveReq);
    await controller.archiveDashboard(archiveReq, archiveRes, next);
    expect(archiveRes.payload.data.uiStatus).toBe('archived');

    const deleteReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439310' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const deleteRes = createResponseMock(deleteReq);
    await controller.deleteDashboard(deleteReq, deleteRes, next);
    expect(deleteRes.payload.data).toBeNull();

    const templateListReq = { query: { page: '1', limit: '20' }, params: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const templateListRes = createResponseMock(templateListReq);
    await controller.getDashboardTemplates(templateListReq, templateListRes, next);
    expect(templateListRes.payload.data[0].uiStatus).toBe('draft');

    const templateCreateReq = { user: adminUser, query: {}, params: {}, body: { name: 'Template A' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const templateCreateRes = createResponseMock(templateCreateReq);
    await controller.createDashboardTemplate(templateCreateReq, templateCreateRes, next);
    expect(templateCreateRes.payload.data.uiStatus).toBe('draft');

    const templateGetReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439403' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const templateGetRes = createResponseMock(templateGetReq);
    await controller.getDashboardTemplate(templateGetReq, templateGetRes, next);
    expect(templateGetRes.payload.data.uiStatus).toBe('published');

    const templateUpdateReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439404' }, body: { status: 'published' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const templateUpdateRes = createResponseMock(templateUpdateReq);
    await controller.updateDashboardTemplate(templateUpdateReq, templateUpdateRes, next);
    expect(templateUpdateRes.payload.data.uiStatus).toBe('published');

    const templatePublishReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439405' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const templatePublishRes = createResponseMock(templatePublishReq);
    await controller.publishDashboardTemplate(templatePublishReq, templatePublishRes, next);
    expect(templatePublishRes.payload.data.uiStatus).toBe('published');

    const templateArchiveReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439406' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const templateArchiveRes = createResponseMock(templateArchiveReq);
    await controller.archiveDashboardTemplate(templateArchiveReq, templateArchiveRes, next);
    expect(templateArchiveRes.payload.data.uiStatus).toBe('archived');

    const templateDeleteReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439406' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const templateDeleteRes = createResponseMock(templateDeleteReq);
    await controller.deleteDashboardTemplate(templateDeleteReq, templateDeleteRes, next);
    expect(templateDeleteRes.payload.data).toBeNull();
  });

  test('analytics-native reports CRUD + generate/export workflows', async () => {
    const next = jest.fn();
    mockAnalyticsService.listReports.mockResolvedValue(paged([{ _id: '507f1f77bcf86cd799439501', status: 'generated' }]));
    mockAnalyticsService.createReport.mockResolvedValue({ _id: '507f1f77bcf86cd799439502', status: 'generated' });
    mockAnalyticsService.getReport.mockResolvedValue({ _id: '507f1f77bcf86cd799439503', status: 'generated' });
    mockAnalyticsService.updateReport.mockResolvedValue({ _id: '507f1f77bcf86cd799439504', status: 'archived' });
    mockAnalyticsService.generateReport.mockResolvedValue({ _id: '507f1f77bcf86cd799439505', status: 'generated' });
    mockAnalyticsService.exportReport.mockResolvedValue({ _id: '507f1f77bcf86cd799439506', status: 'exported' });
    mockAnalyticsService.deleteReport.mockResolvedValue(undefined);

    const listReq = { user: adminUser, query: { page: '1', limit: '20' }, params: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const listRes = createResponseMock(listReq);
    await controller.listReports(listReq, listRes, next);
    expect(listRes.payload.data.data[0].uiStatus).toBe('generated');

    const createReq = { user: adminUser, query: {}, params: {}, body: { name: 'Monthly Report' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const createRes = createResponseMock(createReq);
    await controller.createReport(createReq, createRes, next);
    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data.uiStatus).toBe('generated');

    const getReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439503' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const getRes = createResponseMock(getReq);
    await controller.getReport(getReq, getRes, next);
    expect(getRes.payload.data.uiStatus).toBe('generated');

    const updateReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439504' }, body: { status: 'archived' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const updateRes = createResponseMock(updateReq);
    await controller.updateReport(updateReq, updateRes, next);
    expect(updateRes.payload.data.uiStatus).toBe('archived');

    const generateReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439505' }, body: { metadata: { reason: 'rerun' } }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const generateRes = createResponseMock(generateReq);
    await controller.generateReport(generateReq, generateRes, next);
    expect(generateRes.payload.data.uiStatus).toBe('generated');

    const exportReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439506' }, body: { format: 'csv' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const exportRes = createResponseMock(exportReq);
    await controller.exportReport(exportReq, exportRes, next);
    expect(exportRes.payload.data.uiStatus).toBe('exported');

    const deleteReq = { user: adminUser, query: {}, params: { id: '507f1f77bcf86cd799439506' }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const deleteRes = createResponseMock(deleteReq);
    await controller.deleteReport(deleteReq, deleteRes, next);
    expect(deleteRes.payload.data).toBeNull();
  });
});
