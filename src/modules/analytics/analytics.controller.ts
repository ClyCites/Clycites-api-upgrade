import { Request, Response, NextFunction } from 'express';
import analyticsService from './analytics.service';
import { analyticsExportService } from './analyticsExport.service';
import { IQueryContext, AccessScope, IChartDefinition, ExportFormat } from './analytics.types';
import { ResponseHandler } from '../../common/utils/response';
import { AuthRequest } from '../../common/middleware/auth';
import { BadRequestError } from '../../common/errors/AppError';

type AnyRecord = Record<string, unknown>;
type ChartUiStatus = 'draft' | 'published' | 'archived';
type DashboardUiStatus = 'draft' | 'published' | 'archived';
type DatasetUiStatus = 'active' | 'deprecated';
type ReportUiStatus = 'generated' | 'exported' | 'archived';

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/** Build IQueryContext from authenticated request */
function buildCtx(req: AuthRequest): IQueryContext {
  const user = req.user!;
  const u = user as unknown as { orgId?: string };
  let scope = AccessScope.PERSONAL;
  if (['admin', 'platform_admin', 'super_admin'].includes(user.role)) scope = AccessScope.PLATFORM_ADMIN;
  else if (u.orgId || user.role === 'org_admin') scope = AccessScope.ORGANIZATION;
  return { userId: user.id, userRole: user.role, orgId: u.orgId, farmerId: user.farmerId, scope };
}

const toPlainObject = <T>(value: T): T => {
  if (value && typeof (value as { toObject?: () => T }).toObject === 'function') {
    return (value as unknown as { toObject: () => T }).toObject();
  }
  return value;
};

const chartUiStatus = (status: unknown): ChartUiStatus => {
  if (status === 'published') return 'published';
  if (status === 'archived') return 'archived';
  return 'draft';
};

const dashboardUiStatus = (status: unknown): DashboardUiStatus => {
  if (status === 'published') return 'published';
  if (status === 'archived') return 'archived';
  return 'draft';
};

const datasetUiStatus = (status: unknown): DatasetUiStatus => {
  return status === 'deprecated' ? 'deprecated' : 'active';
};

const reportUiStatus = (status: unknown): ReportUiStatus => {
  if (status === 'exported') return 'exported';
  if (status === 'archived') return 'archived';
  return 'generated';
};

const withChartUiStatus = <T extends AnyRecord>(entity: T): T & { uiStatus: ChartUiStatus } => {
  const plain = toPlainObject(entity);
  return { ...plain, uiStatus: chartUiStatus(plain.status) };
};

const withDashboardUiStatus = <T extends AnyRecord>(entity: T): T & { uiStatus: DashboardUiStatus } => {
  const plain = toPlainObject(entity);
  return { ...plain, uiStatus: dashboardUiStatus(plain.status) };
};

const withDatasetUiStatus = <T extends AnyRecord>(entity: T): T & { uiStatus: DatasetUiStatus } => {
  const plain = toPlainObject(entity);
  return { ...plain, uiStatus: datasetUiStatus(plain.status) };
};

const withReportUiStatus = <T extends AnyRecord>(entity: T): T & { uiStatus: ReportUiStatus } => {
  const plain = toPlainObject(entity);
  return { ...plain, uiStatus: reportUiStatus(plain.status) };
};

const respondPaginated = <T>(
  res: Response,
  result: PaginatedResult<T>,
  message: string,
  mapper: (row: T) => unknown
) => {
  const mapped = result.data.map(mapper);
  ResponseHandler.success(
    res,
    {
      ...result,
      data: mapped,
    },
    message,
    200,
    { pagination: result.pagination }
  );
};

// ── Market Analytics (public / optional auth) ───────────────────────────────

export const getMarketOverview = async (_req: Request, res: Response, next: NextFunction) => {
  try { ResponseHandler.success(res, await analyticsService.getMarketOverview(), 'Market overview'); }
  catch (e) { next(e); }
};

export const getPriceTrends = async (req: Request, res: Response, next: NextFunction) => {
  try { ResponseHandler.success(res, await analyticsService.getPriceTrends(req.query as Record<string,string>), 'Price trends'); }
  catch (e) { next(e); }
};

export const getProductDemand = async (req: Request, res: Response, next: NextFunction) => {
  try { ResponseHandler.success(res, await analyticsService.getProductDemand(req.query as Record<string,string>), 'Product demand'); }
  catch (e) { next(e); }
};

export const getSupplyAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try { ResponseHandler.success(res, await analyticsService.getSupplyAnalysis(req.query as Record<string,string>), 'Supply analysis'); }
  catch (e) { next(e); }
};

export const getRegionalAnalysis = async (_req: Request, res: Response, next: NextFunction) => {
  try { ResponseHandler.success(res, await analyticsService.getRegionalAnalysis(), 'Regional analysis'); }
  catch (e) { next(e); }
};

export const getMarketHealth = async (_req: Request, res: Response, next: NextFunction) => {
  try { ResponseHandler.success(res, await analyticsService.getMarketHealth(), 'Market health'); }
  catch (e) { next(e); }
};

// ── Domain Dashboards ────────────────────────────────────────────────────────

export const getFarmerDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const fid = req.user!.farmerId ?? (req as unknown as { params?: { farmerId?: string } }).params?.farmerId;
    if (!fid) throw new BadRequestError('farmerId required');
    ResponseHandler.success(res, await analyticsService.getFarmerDashboard(fid, Number(req.query.days ?? 30)), 'Farmer dashboard');
  } catch (e) { next(e); }
};

export const getOrgDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const oid = (req.user as unknown as { orgId?: string }).orgId ?? req.query.orgId as string;
    if (!oid) throw new BadRequestError('orgId required');
    ResponseHandler.success(res, await analyticsService.getOrgDashboard(oid, Number(req.query.days ?? 30)), 'Org dashboard');
  } catch (e) { next(e); }
};

export const getAdminDashboard = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try { ResponseHandler.success(res, await analyticsService.getAdminDashboard(), 'Admin dashboard'); }
  catch (e) { next(e); }
};

export const getMyPerformance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const fid = req.user!.farmerId;
    if (!fid) throw new BadRequestError('Farmer profile required');
    ResponseHandler.success(res, await analyticsService.getFarmerPerformance(fid, req.query as Record<string,string>), 'Farmer performance');
  } catch (e) { next(e); }
};

export const getFarmerPerformance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ResponseHandler.success(res, await analyticsService.getFarmerPerformance(req.params.farmerId, req.query as Record<string,string>), 'Farmer performance'); }
  catch (e) { next(e); }
};

// ── Datasets ─────────────────────────────────────────────────────────────────

export const listDatasets = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await analyticsService.listDatasets(buildCtx(req), req.query as Record<string, string>);
    const rows = result.data.map((row) => withDatasetUiStatus(row as unknown as AnyRecord));
    ResponseHandler.success(res, rows, 'Datasets', 200, { pagination: result.pagination });
  } catch (e) { next(e); }
};

export const createDataset = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dataset = await analyticsService.createDataset(req.body, buildCtx(req));
    ResponseHandler.success(res, withDatasetUiStatus(dataset as unknown as AnyRecord), 'Dataset created', 201);
  } catch (e) { next(e); }
};

export const getDataset = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dataset = await analyticsService.getDataset(req.params.id, buildCtx(req));
    ResponseHandler.success(res, withDatasetUiStatus(dataset as unknown as AnyRecord), 'Dataset');
  } catch (e) { next(e); }
};

export const updateDataset = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dataset = await analyticsService.updateDataset(req.params.id, req.body, buildCtx(req));
    ResponseHandler.success(res, withDatasetUiStatus(dataset as unknown as AnyRecord), 'Dataset updated');
  } catch (e) { next(e); }
};

export const deleteDataset = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await analyticsService.deleteDataset(req.params.id, buildCtx(req));
    ResponseHandler.success(res, null, 'Dataset deleted');
  } catch (e) { next(e); }
};

// ── Charts ────────────────────────────────────────────────────────────────────

export const previewChart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ResponseHandler.success(res, await analyticsService.previewChart(req.body as IChartDefinition, buildCtx(req)), 'Preview'); }
  catch (e) { next(e); }
};

export const previewChartExport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await analyticsService.previewChart(req.body.definition as IChartDefinition, buildCtx(req));
    await analyticsExportService.streamExport(res, result, { format: (req.body.format ?? 'csv') as ExportFormat, filename: req.body.filename });
  } catch (e) { next(e); }
};

export const createChart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, definition, tags, shareScope } = req.body;
    const chart = await analyticsService.createChart(name, description, definition, buildCtx(req), tags, shareScope);
    ResponseHandler.success(res, withChartUiStatus(chart as unknown as AnyRecord), 'Chart created', 201);
  } catch (e) { next(e); }
};

export const listCharts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await analyticsService.listCharts(buildCtx(req), req.query as Record<string, string>);
    respondPaginated(res, result, 'Charts', (row) => withChartUiStatus(row as unknown as AnyRecord));
  } catch (e) { next(e); }
};

export const getChart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const chart = await analyticsService.getChart(req.params.id, buildCtx(req));
    ResponseHandler.success(res, withChartUiStatus(chart as unknown as AnyRecord), 'Chart');
  } catch (e) { next(e); }
};

export const updateChart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const chart = await analyticsService.updateChart(req.params.id, req.body, buildCtx(req));
    ResponseHandler.success(res, withChartUiStatus(chart as unknown as AnyRecord), 'Chart updated');
  } catch (e) { next(e); }
};

export const publishChart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const chart = await analyticsService.publishChart(req.params.id, buildCtx(req));
    ResponseHandler.success(res, withChartUiStatus(chart as unknown as AnyRecord), 'Chart published');
  } catch (e) { next(e); }
};

export const archiveChart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const chart = await analyticsService.archiveChart(req.params.id, buildCtx(req));
    ResponseHandler.success(res, withChartUiStatus(chart as unknown as AnyRecord), 'Chart archived');
  } catch (e) { next(e); }
};

export const deleteChart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await analyticsService.deleteChart(req.params.id, buildCtx(req)); ResponseHandler.success(res, null, 'Chart deleted'); }
  catch (e) { next(e); }
};

export const exportChart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const chart = await analyticsService.getChart(req.params.id, buildCtx(req));
    const result = await analyticsService.executeChartQuery(chart.definition, buildCtx(req));
    const fmt = (req.body.format ?? req.query.format ?? 'csv') as ExportFormat;
    await analyticsExportService.streamExport(res, result, { format: fmt, filename: req.body.filename ?? chart.name });
  } catch (e) { next(e); }
};

// ── Dashboards ────────────────────────────────────────────────────────────────

export const createDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, shareScope, orgId, templateCategory, tags, isDefault } = req.body;
    const dashboard = await analyticsService.createDashboard(
      name,
      description,
      buildCtx(req),
      { orgId, shareScope, templateCategory, tags, isDefault }
    );
    ResponseHandler.success(res, withDashboardUiStatus(dashboard as unknown as AnyRecord), 'Dashboard created', 201);
  } catch (e) { next(e); }
};

export const listDashboards = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await analyticsService.listDashboards(buildCtx(req), req.query as Record<string, string>);
    respondPaginated(res, result, 'Dashboards', (row) => withDashboardUiStatus(row as unknown as AnyRecord));
  } catch (e) { next(e); }
};

export const getDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dashboard = await analyticsService.getDashboard(req.params.id, buildCtx(req));
    ResponseHandler.success(res, withDashboardUiStatus(dashboard as unknown as AnyRecord), 'Dashboard');
  } catch (e) { next(e); }
};

export const updateDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dashboard = await analyticsService.updateDashboard(req.params.id, req.body, buildCtx(req));
    ResponseHandler.success(res, withDashboardUiStatus(dashboard as unknown as AnyRecord), 'Dashboard updated');
  } catch (e) { next(e); }
};

export const publishDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dashboard = await analyticsService.publishDashboard(req.params.id, buildCtx(req));
    ResponseHandler.success(res, withDashboardUiStatus(dashboard as unknown as AnyRecord), 'Dashboard published');
  } catch (e) { next(e); }
};

export const archiveDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dashboard = await analyticsService.archiveDashboard(req.params.id, buildCtx(req));
    ResponseHandler.success(res, withDashboardUiStatus(dashboard as unknown as AnyRecord), 'Dashboard archived');
  } catch (e) { next(e); }
};

export const deleteDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await analyticsService.deleteDashboard(req.params.id, buildCtx(req)); ResponseHandler.success(res, null, 'Dashboard deleted'); }
  catch (e) { next(e); }
};

export const addChartToDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { chartId, position, size } = req.body;
    const dashboard = await analyticsService.addChartToDashboard(req.params.id, chartId, position, size, buildCtx(req));
    ResponseHandler.success(res, withDashboardUiStatus(dashboard as unknown as AnyRecord), 'Chart added');
  } catch (e) { next(e); }
};

export const removeChartFromDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dashboard = await analyticsService.removeChartFromDashboard(req.params.id, req.params.chartId, buildCtx(req));
    ResponseHandler.success(res, withDashboardUiStatus(dashboard as unknown as AnyRecord), 'Chart removed');
  } catch (e) { next(e); }
};

export const reorderDashboardCharts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dashboard = await analyticsService.reorderDashboardCharts(req.params.id, req.body.items, buildCtx(req));
    ResponseHandler.success(res, withDashboardUiStatus(dashboard as unknown as AnyRecord), 'Dashboard charts reordered');
  } catch (e) { next(e); }
};

export const updateDashboardSharing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dashboard = await analyticsService.updateDashboardSharing(req.params.id, req.body, buildCtx(req));
    ResponseHandler.success(res, withDashboardUiStatus(dashboard as unknown as AnyRecord), 'Sharing updated');
  } catch (e) { next(e); }
};

// ── Templates ────────────────────────────────────────────────────────────────

export const getDashboardTemplates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await analyticsService.listDashboardTemplates(req.query as Record<string, string>);
    const rows = result.data.map((row) => withDashboardUiStatus(row as unknown as AnyRecord));
    ResponseHandler.success(res, rows, 'Templates', 200, { pagination: result.pagination });
  } catch (e) { next(e); }
};

export const createDashboardTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, shareScope, orgId, templateCategory, tags, isDefault } = req.body;
    const template = await analyticsService.createDashboardTemplate(
      name,
      description,
      buildCtx(req),
      { orgId, shareScope, templateCategory, tags, isDefault }
    );
    ResponseHandler.success(res, withDashboardUiStatus(template as unknown as AnyRecord), 'Template created', 201);
  } catch (e) { next(e); }
};

export const getDashboardTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const template = await analyticsService.getDashboardTemplate(req.params.id, buildCtx(req));
    ResponseHandler.success(res, withDashboardUiStatus(template as unknown as AnyRecord), 'Template');
  } catch (e) { next(e); }
};

export const updateDashboardTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const template = await analyticsService.updateDashboardTemplate(req.params.id, req.body, buildCtx(req));
    ResponseHandler.success(res, withDashboardUiStatus(template as unknown as AnyRecord), 'Template updated');
  } catch (e) { next(e); }
};

export const publishDashboardTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const template = await analyticsService.publishDashboardTemplate(req.params.id, buildCtx(req));
    ResponseHandler.success(res, withDashboardUiStatus(template as unknown as AnyRecord), 'Template published');
  } catch (e) { next(e); }
};

export const archiveDashboardTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const template = await analyticsService.archiveDashboardTemplate(req.params.id, buildCtx(req));
    ResponseHandler.success(res, withDashboardUiStatus(template as unknown as AnyRecord), 'Template archived');
  } catch (e) { next(e); }
};

export const deleteDashboardTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await analyticsService.deleteDashboardTemplate(req.params.id, buildCtx(req));
    ResponseHandler.success(res, null, 'Template deleted');
  } catch (e) { next(e); }
};

// ── Reports ──────────────────────────────────────────────────────────────────

export const listReports = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await analyticsService.listReports(buildCtx(req), req.query as Record<string, string>);
    respondPaginated(res, result, 'Reports', (row) => withReportUiStatus(row as unknown as AnyRecord));
  } catch (e) { next(e); }
};

export const createReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const report = await analyticsService.createReport(req.body, buildCtx(req));
    ResponseHandler.success(res, withReportUiStatus(report as unknown as AnyRecord), 'Report created', 201);
  } catch (e) { next(e); }
};

export const getReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const report = await analyticsService.getReport(req.params.id, buildCtx(req));
    ResponseHandler.success(res, withReportUiStatus(report as unknown as AnyRecord), 'Report');
  } catch (e) { next(e); }
};

export const updateReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const report = await analyticsService.updateReport(req.params.id, req.body, buildCtx(req));
    ResponseHandler.success(res, withReportUiStatus(report as unknown as AnyRecord), 'Report updated');
  } catch (e) { next(e); }
};

export const deleteReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await analyticsService.deleteReport(req.params.id, buildCtx(req));
    ResponseHandler.success(res, null, 'Report deleted');
  } catch (e) { next(e); }
};

export const generateReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const report = await analyticsService.generateReport(req.params.id, buildCtx(req), req.body?.metadata);
    ResponseHandler.success(res, withReportUiStatus(report as unknown as AnyRecord), 'Report generated');
  } catch (e) { next(e); }
};

export const exportReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const report = await analyticsService.exportReport(req.params.id, buildCtx(req), req.body);
    ResponseHandler.success(res, withReportUiStatus(report as unknown as AnyRecord), 'Report exported');
  } catch (e) { next(e); }
};
