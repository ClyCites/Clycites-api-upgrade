import { Router } from 'express';
import { marketIntelligenceController } from './marketIntelligence.controller';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';

const router = Router();

/**
 * All routes require authentication
 */
router.use(authenticate);

/**
 * @route   GET /api/market-intelligence/insights
 * @desc    Get market insights for a product
 * @access  Authenticated users
 * @query   productId, region, district, period (daily|weekly|monthly)
 */
router.get('/insights', marketIntelligenceController.getMarketInsights.bind(marketIntelligenceController));

/**
 * @route   GET /api/market-intelligence/price-recommendation
 * @desc    Get price recommendation for a listing
 * @access  Authenticated users
 * @query   productId, region, quality, quantity
 */
router.get(
  '/price-recommendation',
  marketIntelligenceController.getPriceRecommendation.bind(marketIntelligenceController)
);

/**
 * @route   GET /api/market-intelligence/trends
 * @desc    Get historical market trends
 * @access  Authenticated users
 * @query   productId, period (days)
 */
router.get('/trends', marketIntelligenceController.getMarketTrends.bind(marketIntelligenceController));

/**
 * @route   GET /api/market-intelligence/compare
 * @desc    Compare market conditions across regions
 * @access  Authenticated users
 * @query   productId, regions (comma-separated)
 */
router.get('/compare', marketIntelligenceController.getComparativeAnalysis.bind(marketIntelligenceController));

/**
 * @route   POST /api/market-intelligence/alerts
 * @desc    Create a price alert
 * @access  Authenticated users
 * @body    { product, region, district, conditions, notificationChannels }
 */
router.post('/alerts', marketIntelligenceController.createPriceAlert.bind(marketIntelligenceController));

/**
 * @route   GET /api/market-intelligence/alerts
 * @desc    Get user's price alerts
 * @access  Authenticated users
 */
router.get('/alerts', marketIntelligenceController.getUserAlerts.bind(marketIntelligenceController));

/**
 * @route   PATCH /api/market-intelligence/alerts/:alertId
 * @desc    Update a price alert
 * @access  Alert owner
 */
router.patch('/alerts/:alertId', marketIntelligenceController.updatePriceAlert.bind(marketIntelligenceController));

/**
 * @route   DELETE /api/market-intelligence/alerts/:alertId
 * @desc    Delete a price alert
 * @access  Alert owner
 */
router.delete('/alerts/:alertId', marketIntelligenceController.deletePriceAlert.bind(marketIntelligenceController));

/**
 * @route   POST /api/market-intelligence/alerts/check
 * @desc    Manually trigger price alert check (for testing/admin)
 * @access  Admin only
 */
router.post(
  '/alerts/check',
  authorize('admin'),
  marketIntelligenceController.checkPriceAlerts.bind(marketIntelligenceController)
);

/**
 * @route   GET /api/market-intelligence/recommendations
 * @desc    List recommendation resources
 * @access  Authenticated users (scoped)
 */
router.get('/recommendations', marketIntelligenceController.listRecommendations.bind(marketIntelligenceController));

/**
 * @route   POST /api/market-intelligence/recommendations
 * @desc    Create recommendation resource
 * @access  Authenticated users
 */
router.post('/recommendations', marketIntelligenceController.createRecommendation.bind(marketIntelligenceController));

/**
 * @route   GET /api/market-intelligence/recommendations/:recommendationId
 * @desc    Get recommendation resource
 * @access  Scoped
 */
router.get('/recommendations/:recommendationId', marketIntelligenceController.getRecommendation.bind(marketIntelligenceController));

/**
 * @route   PATCH /api/market-intelligence/recommendations/:recommendationId
 * @desc    Update recommendation resource
 * @access  Scoped owner/admin
 */
router.patch('/recommendations/:recommendationId', marketIntelligenceController.updateRecommendation.bind(marketIntelligenceController));

/**
 * @route   DELETE /api/market-intelligence/recommendations/:recommendationId
 * @desc    Delete recommendation resource
 * @access  Scoped owner/admin
 */
router.delete('/recommendations/:recommendationId', marketIntelligenceController.deleteRecommendation.bind(marketIntelligenceController));

router.post('/recommendations/:recommendationId/approve', marketIntelligenceController.approveRecommendation.bind(marketIntelligenceController));
router.post('/recommendations/:recommendationId/publish', marketIntelligenceController.publishRecommendation.bind(marketIntelligenceController));
router.post('/recommendations/:recommendationId/retract', marketIntelligenceController.retractRecommendation.bind(marketIntelligenceController));

/**
 * @route   GET /api/market-intelligence/data-sources
 * @desc    List data source resources
 * @access  Scoped users
 */
router.get('/data-sources', marketIntelligenceController.listDataSources.bind(marketIntelligenceController));

/**
 * @route   POST /api/market-intelligence/data-sources
 * @desc    Create data source
 * @access  Authenticated users
 */
router.post('/data-sources', marketIntelligenceController.createDataSource.bind(marketIntelligenceController));

router.get('/data-sources/:sourceId', marketIntelligenceController.getDataSource.bind(marketIntelligenceController));
router.patch('/data-sources/:sourceId', marketIntelligenceController.updateDataSource.bind(marketIntelligenceController));
router.delete('/data-sources/:sourceId', marketIntelligenceController.deleteDataSource.bind(marketIntelligenceController));
router.post('/data-sources/:sourceId/refresh', marketIntelligenceController.refreshDataSource.bind(marketIntelligenceController));

export default router;
