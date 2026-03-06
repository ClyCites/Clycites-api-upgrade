import { Router } from 'express';
import { authenticate, optionalAuth } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import * as ctrl from './analytics.controller';
import {
  analyticsQueryValidator, farmerIdValidator, chartDefinitionValidator, previewChartValidator,
  updateChartValidator, dashboardValidator, addChartToDashboardValidator, updateSharingValidator,
  exportValidator, paginationValidator, chartIdValidator, dashboardIdValidator, updateDashboardValidator,
  reorderChartsValidator, templateIdValidator, datasetCreateValidator, datasetIdValidator,
  datasetUpdateValidator, reportCreateValidator, reportIdValidator, reportUpdateValidator, reportExportValidator,
} from './analytics.validator';

const router = Router();

// ── Public / optional auth ──────────────────────────────────────────────────
router.get('/overview',             optionalAuth, ctrl.getMarketOverview);
router.get('/price-trends',         optionalAuth, validate(analyticsQueryValidator), ctrl.getPriceTrends);
router.get('/demand',               optionalAuth, validate(analyticsQueryValidator), ctrl.getProductDemand);
router.get('/supply',               optionalAuth, validate(analyticsQueryValidator), ctrl.getSupplyAnalysis);
router.get('/regional',             optionalAuth, ctrl.getRegionalAnalysis);
router.get('/market-health',        optionalAuth, ctrl.getMarketHealth);
router.get('/dashboards/templates', ctrl.getDashboardTemplates);

// ── Auth required ───────────────────────────────────────────────────────────
router.use(authenticate);

// Datasets
router.get('/datasets', validate(paginationValidator), ctrl.listDatasets);
router.post('/datasets', validate(datasetCreateValidator), ctrl.createDataset);
router.get('/datasets/:id', validate(datasetIdValidator), ctrl.getDataset);
router.patch('/datasets/:id', validate([...datasetIdValidator, ...datasetUpdateValidator]), ctrl.updateDataset);
router.delete('/datasets/:id', validate(datasetIdValidator), ctrl.deleteDataset);

// Charts — preview (no saved chart required)
router.post('/charts/preview',        validate(previewChartValidator), ctrl.previewChart);
router.post('/charts/preview/export', validate([...previewChartValidator, ...exportValidator]), ctrl.previewChartExport);

// Charts CRUD
router.get(   '/charts',         validate(paginationValidator), ctrl.listCharts);
router.post(  '/charts',         validate(chartDefinitionValidator), ctrl.createChart);
router.get(   '/charts/:id',     validate(chartIdValidator), ctrl.getChart);
router.put(   '/charts/:id',     validate([...chartIdValidator, ...updateChartValidator]), ctrl.updateChart);
router.post(  '/charts/:id/publish', validate(chartIdValidator), ctrl.publishChart);
router.post(  '/charts/:id/archive', validate(chartIdValidator), ctrl.archiveChart);
router.delete('/charts/:id',     validate(chartIdValidator), ctrl.deleteChart);
router.post(  '/charts/:id/export', validate([...chartIdValidator, ...exportValidator]), ctrl.exportChart);

// Dashboards CRUD
router.get(   '/dashboards',     validate(paginationValidator), ctrl.listDashboards);
router.post(  '/dashboards',     validate(dashboardValidator), ctrl.createDashboard);
router.get(   '/dashboards/:id', validate(dashboardIdValidator), ctrl.getDashboard);
router.patch( '/dashboards/:id', validate([...dashboardIdValidator, ...updateDashboardValidator]), ctrl.updateDashboard);
router.post(  '/dashboards/:id/publish', validate(dashboardIdValidator), ctrl.publishDashboard);
router.post(  '/dashboards/:id/archive', validate(dashboardIdValidator), ctrl.archiveDashboard);
router.delete('/dashboards/:id', validate(dashboardIdValidator), ctrl.deleteDashboard);
router.post(  '/dashboards/:id/charts',             validate([...dashboardIdValidator, ...addChartToDashboardValidator]), ctrl.addChartToDashboard);
router.delete('/dashboards/:id/charts/:chartId',    validate(dashboardIdValidator), ctrl.removeChartFromDashboard);
router.patch( '/dashboards/:id/charts/reorder',     validate([...dashboardIdValidator, ...reorderChartsValidator]), ctrl.reorderDashboardCharts);
router.patch( '/dashboards/:id/sharing',            validate([...dashboardIdValidator, ...updateSharingValidator]), ctrl.updateDashboardSharing);

// Templates CRUD
router.post(  '/dashboards/templates',               validate(dashboardValidator), ctrl.createDashboardTemplate);
router.get(   '/dashboards/templates/:id',           validate(templateIdValidator), ctrl.getDashboardTemplate);
router.patch( '/dashboards/templates/:id',           validate([...templateIdValidator, ...updateDashboardValidator]), ctrl.updateDashboardTemplate);
router.post(  '/dashboards/templates/:id/publish',   validate(templateIdValidator), ctrl.publishDashboardTemplate);
router.post(  '/dashboards/templates/:id/archive',   validate(templateIdValidator), ctrl.archiveDashboardTemplate);
router.delete('/dashboards/templates/:id',           validate(templateIdValidator), ctrl.deleteDashboardTemplate);

// Reports CRUD / workflows
router.get(   '/reports',                 validate(paginationValidator), ctrl.listReports);
router.post(  '/reports',                 validate(reportCreateValidator), ctrl.createReport);
router.get(   '/reports/:id',             validate(reportIdValidator), ctrl.getReport);
router.patch( '/reports/:id',             validate([...reportIdValidator, ...reportUpdateValidator]), ctrl.updateReport);
router.delete('/reports/:id',             validate(reportIdValidator), ctrl.deleteReport);
router.post(  '/reports/:id/generate',    validate(reportIdValidator), ctrl.generateReport);
router.post(  '/reports/:id/export',      validate([...reportIdValidator, ...reportExportValidator]), ctrl.exportReport);

// Farmer routes
router.get('/my-performance',     authorize('farmer'), validate(analyticsQueryValidator), ctrl.getMyPerformance);
router.get('/farmer/dashboard',   authorize('farmer','admin','platform_admin'), ctrl.getFarmerDashboard);
router.get('/farmer/:farmerId',   authorize('farmer','admin','platform_admin'), validate([...farmerIdValidator, ...analyticsQueryValidator]), ctrl.getFarmerPerformance);

// Org / Admin domain dashboards
router.get('/org/dashboard',      authorize('org_admin','admin','platform_admin'), ctrl.getOrgDashboard);
router.get('/admin/dashboard',    authorize('admin','platform_admin'), ctrl.getAdminDashboard);

export default router;
