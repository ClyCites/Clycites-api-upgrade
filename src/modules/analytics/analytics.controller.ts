import { Request, Response, NextFunction } from 'express';
import analyticsService from './analytics.service';
import { analyticsExportService } from './analyticsExport.service';
import { IQueryContext, AccessScope, IChartDefinition, ExportFormat } from './analytics.types';
import { ResponseHandler } from '../../common/utils/response';
import { AuthRequest } from '../../common/middleware/auth';
import { BadRequestError } from '../../common/errors/AppError';

/** Build IQueryContext from authenticated request */
function buildCtx(req: AuthRequest): IQueryContext {
  const user = req.user!;
  const u = user as any; // orgId extension
  let scope = AccessScope.PERSONAL;
  if (user.role === 'admin' || user.role === 'platform_admin') scope = AccessScope.PLATFORM_ADMIN;
  else if (u.orgId || user.role === 'org_admin') scope = AccessScope.ORGANIZATION;
  return { userId: user.id, userRole: user.role, orgId: u.orgId, farmerId: user.farmerId, scope };
}

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
    const fid = req.user!.farmerId ?? (req as any).params?.farmerId;
    if (!fid) throw new BadRequestError('farmerId required');
    ResponseHandler.success(res, await analyticsService.getFarmerDashboard(fid, Number(req.query.days ?? 30)), 'Farmer dashboard');
  } catch (e) { next(e); }
};

export const getOrgDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const oid = (req.user as any).orgId ?? req.query.orgId as string;
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
  try { ResponseHandler.success(res, analyticsService.getAccessibleDatasets(buildCtx(req)), 'Accessible datasets'); }
  catch (e) { next(e); }
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
    ResponseHandler.success(res, await analyticsService.createChart(name, description, definition, buildCtx(req), tags, shareScope), 'Chart created', 201);
  } catch (e) { next(e); }
};

export const listCharts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ResponseHandler.success(res, await analyticsService.listCharts(buildCtx(req), req.query as Record<string,string>), 'Charts'); }
  catch (e) { next(e); }
};

export const getChart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ResponseHandler.success(res, await analyticsService.getChart(req.params.id, buildCtx(req)), 'Chart'); }
  catch (e) { next(e); }
};

export const updateChart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ResponseHandler.success(res, await analyticsService.updateChart(req.params.id, req.body, buildCtx(req)), 'Chart updated'); }
  catch (e) { next(e); }
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
    ResponseHandler.success(res, await analyticsService.createDashboard(name, description, buildCtx(req), { orgId, shareScope, templateCategory, tags, isDefault }), 'Dashboard created', 201);
  } catch (e) { next(e); }
};

export const listDashboards = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ResponseHandler.success(res, await analyticsService.listDashboards(buildCtx(req), req.query as Record<string,string>), 'Dashboards'); }
  catch (e) { next(e); }
};

export const getDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ResponseHandler.success(res, await analyticsService.getDashboard(req.params.id, buildCtx(req)), 'Dashboard'); }
  catch (e) { next(e); }
};

export const deleteDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await analyticsService.deleteDashboard(req.params.id, buildCtx(req)); ResponseHandler.success(res, null, 'Dashboard deleted'); }
  catch (e) { next(e); }
};

export const addChartToDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { chartId, position, size } = req.body;
    ResponseHandler.success(res, await analyticsService.addChartToDashboard(req.params.id, chartId, position, size, buildCtx(req)), 'Chart added');
  } catch (e) { next(e); }
};

export const removeChartFromDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ResponseHandler.success(res, await analyticsService.removeChartFromDashboard(req.params.id, req.params.chartId, buildCtx(req)), 'Chart removed'); }
  catch (e) { next(e); }
};

export const updateDashboardSharing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ResponseHandler.success(res, await analyticsService.updateDashboardSharing(req.params.id, req.body, buildCtx(req)), 'Sharing updated'); }
  catch (e) { next(e); }
};

export const getDashboardTemplates = async (req: Request, res: Response, next: NextFunction) => {
  try { ResponseHandler.success(res, await analyticsService.getDashboardTemplates(req.query.category as string | undefined), 'Templates'); }
  catch (e) { next(e); }
};
