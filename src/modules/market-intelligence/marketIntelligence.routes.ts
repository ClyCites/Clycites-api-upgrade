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
router.get('/insights', marketIntelligenceController.getMarketInsights);

/**
 * @route   GET /api/market-intelligence/price-recommendation
 * @desc    Get price recommendation for a listing
 * @access  Authenticated users
 * @query   productId, region, quality, quantity
 */
router.get(
  '/price-recommendation',
  marketIntelligenceController.getPriceRecommendation
);

/**
 * @route   GET /api/market-intelligence/trends
 * @desc    Get historical market trends
 * @access  Authenticated users
 * @query   productId, period (days)
 */
router.get('/trends', marketIntelligenceController.getMarketTrends);

/**
 * @route   GET /api/market-intelligence/compare
 * @desc    Compare market conditions across regions
 * @access  Authenticated users
 * @query   productId, regions (comma-separated)
 */
router.get('/compare', marketIntelligenceController.getComparativeAnalysis);

/**
 * @route   POST /api/market-intelligence/alerts
 * @desc    Create a price alert
 * @access  Authenticated users
 * @body    { product, region, district, conditions, notificationChannels }
 */
router.post('/alerts', marketIntelligenceController.createPriceAlert);

/**
 * @route   GET /api/market-intelligence/alerts
 * @desc    Get user's price alerts
 * @access  Authenticated users
 */
router.get('/alerts', marketIntelligenceController.getUserAlerts);

/**
 * @route   PATCH /api/market-intelligence/alerts/:alertId
 * @desc    Update a price alert
 * @access  Alert owner
 */
router.patch('/alerts/:alertId', marketIntelligenceController.updatePriceAlert);

/**
 * @route   DELETE /api/market-intelligence/alerts/:alertId
 * @desc    Delete a price alert
 * @access  Alert owner
 */
router.delete('/alerts/:alertId', marketIntelligenceController.deletePriceAlert);

/**
 * @route   POST /api/market-intelligence/alerts/check
 * @desc    Manually trigger price alert check (for testing/admin)
 * @access  Admin only
 */
router.post(
  '/alerts/check',
  authorize('admin'),
  marketIntelligenceController.checkPriceAlerts
);

/**
 * @route   GET /api/market-intelligence/recommendations
 * @desc    List recommendation resources
 * @access  Authenticated users (scoped)
 */
router.get('/recommendations', marketIntelligenceController.listRecommendations);

/**
 * @route   POST /api/market-intelligence/recommendations
 * @desc    Create recommendation resource
 * @access  Authenticated users
 */
router.post('/recommendations', marketIntelligenceController.createRecommendation);

/**
 * @route   GET /api/market-intelligence/recommendations/:recommendationId
 * @desc    Get recommendation resource
 * @access  Scoped
 */
router.get('/recommendations/:recommendationId', marketIntelligenceController.getRecommendation);

/**
 * @route   PATCH /api/market-intelligence/recommendations/:recommendationId
 * @desc    Update recommendation resource
 * @access  Scoped owner/admin
 */
router.patch('/recommendations/:recommendationId', marketIntelligenceController.updateRecommendation);

/**
 * @route   DELETE /api/market-intelligence/recommendations/:recommendationId
 * @desc    Delete recommendation resource
 * @access  Scoped owner/admin
 */
router.delete('/recommendations/:recommendationId', marketIntelligenceController.deleteRecommendation);

router.post('/recommendations/:recommendationId/approve', marketIntelligenceController.approveRecommendation);
router.post('/recommendations/:recommendationId/publish', marketIntelligenceController.publishRecommendation);
router.post('/recommendations/:recommendationId/retract', marketIntelligenceController.retractRecommendation);

/**
 * @route   GET /api/market-intelligence/data-sources
 * @desc    List data source resources
 * @access  Scoped users
 */
router.get('/data-sources', marketIntelligenceController.listDataSources);

/**
 * @route   POST /api/market-intelligence/data-sources
 * @desc    Create data source
 * @access  Authenticated users
 */
router.post('/data-sources', marketIntelligenceController.createDataSource);

router.get('/data-sources/:sourceId', marketIntelligenceController.getDataSource);
router.patch('/data-sources/:sourceId', marketIntelligenceController.updateDataSource);
router.delete('/data-sources/:sourceId', marketIntelligenceController.deleteDataSource);
router.post('/data-sources/:sourceId/refresh', marketIntelligenceController.refreshDataSource);

export default router;
