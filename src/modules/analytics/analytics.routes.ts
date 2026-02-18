import { Router } from 'express';
import { authenticate, optionalAuth } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import * as ctrl from './analytics.controller';
import {
  analyticsQueryValidator, farmerIdValidator, chartDefinitionValidator, previewChartValidator,
  updateChartValidator, dashboardValidator, addChartToDashboardValidator, updateSharingValidator,
  exportValidator, paginationValidator, chartIdValidator, dashboardIdValidator,
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
router.get('/datasets', ctrl.listDatasets);

// Charts — preview (no saved chart required)
router.post('/charts/preview',        validate(previewChartValidator), ctrl.previewChart);
router.post('/charts/preview/export', validate([...previewChartValidator, ...exportValidator]), ctrl.previewChartExport);

// Charts CRUD
router.get(   '/charts',         validate(paginationValidator), ctrl.listCharts);
router.post(  '/charts',         validate(chartDefinitionValidator), ctrl.createChart);
router.get(   '/charts/:id',     validate(chartIdValidator), ctrl.getChart);
router.put(   '/charts/:id',     validate([...chartIdValidator, ...updateChartValidator]), ctrl.updateChart);
router.delete('/charts/:id',     validate(chartIdValidator), ctrl.deleteChart);
router.post(  '/charts/:id/export', validate([...chartIdValidator, ...exportValidator]), ctrl.exportChart);

// Dashboards CRUD
router.get(   '/dashboards',     validate(paginationValidator), ctrl.listDashboards);
router.post(  '/dashboards',     validate(dashboardValidator), ctrl.createDashboard);
router.get(   '/dashboards/:id', validate(dashboardIdValidator), ctrl.getDashboard);
router.delete('/dashboards/:id', validate(dashboardIdValidator), ctrl.deleteDashboard);
router.post(  '/dashboards/:id/charts',             validate([...dashboardIdValidator, ...addChartToDashboardValidator]), ctrl.addChartToDashboard);
router.delete('/dashboards/:id/charts/:chartId',    validate(dashboardIdValidator), ctrl.removeChartFromDashboard);
router.patch( '/dashboards/:id/sharing',            validate([...dashboardIdValidator, ...updateSharingValidator]), ctrl.updateDashboardSharing);

// Farmer routes
router.get('/my-performance',     authorize('farmer'), validate(analyticsQueryValidator), ctrl.getMyPerformance);
router.get('/farmer/dashboard',   authorize('farmer','admin','platform_admin'), ctrl.getFarmerDashboard);
router.get('/farmer/:farmerId',   authorize('farmer','admin','platform_admin'), validate([...farmerIdValidator, ...analyticsQueryValidator]), ctrl.getFarmerPerformance);

// Org / Admin domain dashboards
router.get('/org/dashboard',      authorize('org_admin','admin','platform_admin'), ctrl.getOrgDashboard);
router.get('/admin/dashboard',    authorize('admin','platform_admin'), ctrl.getAdminDashboard);

export default router;
