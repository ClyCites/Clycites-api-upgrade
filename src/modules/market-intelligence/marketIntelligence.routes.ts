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

export default router;
