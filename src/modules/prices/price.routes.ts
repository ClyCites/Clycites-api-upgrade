import { Router } from 'express';
import priceController from './price.controller';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { blockWhenFeatureFlagEnabled } from '../../common/middleware/featureFlagGuard';
import { validate } from '../../common/middleware/validate';
import {
  createPredictionValidator,
  listPredictionsValidator,
  predictionIdValidator,
  regeneratePredictionValidator,
  updatePredictionValidator,
} from './price.validator';

const router = Router();
const priceFreezeGuard = blockWhenFeatureFlagEnabled('priceFreeze', {
  overrideScope: 'super_admin:pricing:override',
  message: 'Price updates are temporarily frozen by platform control',
});

router.post('/', authenticate, priceFreezeGuard, authorize('admin', 'trader'), priceController.addPrice);
router.get('/', priceController.getPrices);

router.get('/trends', priceController.getPriceTrends);
router.post('/predict', priceController.predictPrice);
router.get(
  '/predictions',
  authenticate,
  validate(listPredictionsValidator),
  priceController.listPredictions
);
router.post(
  '/predictions',
  authenticate,
  authorize('admin', 'platform_admin', 'super_admin', 'trader', 'farmer'),
  validate(createPredictionValidator),
  priceController.createPrediction
);
router.get(
  '/predictions/:predictionId',
  authenticate,
  validate(predictionIdValidator),
  priceController.getPrediction
);
router.patch(
  '/predictions/:predictionId',
  authenticate,
  authorize('admin', 'platform_admin', 'super_admin', 'trader', 'farmer'),
  validate(updatePredictionValidator),
  priceController.updatePrediction
);
router.delete(
  '/predictions/:predictionId',
  authenticate,
  authorize('admin', 'platform_admin', 'super_admin', 'trader', 'farmer'),
  validate(predictionIdValidator),
  priceController.deletePrediction
);
router.post(
  '/predictions/:predictionId/regenerate',
  authenticate,
  authorize('admin', 'platform_admin', 'super_admin', 'trader', 'farmer'),
  validate(regeneratePredictionValidator),
  priceController.regeneratePrediction
);
router.post(
  '/bulk-import',
  authenticate,
  priceFreezeGuard,
  authorize('admin', 'trader'),
  priceController.bulkImportPrices
);
router.get('/historical', priceController.getHistoricalPrices);
router.get('/top-markets', priceController.getTopMarketsForProduct);
router.get('/anomalies', priceController.detectPriceAnomalies);
router.get('/average', priceController.getAveragePricePerMarket);
router.get('/compare', priceController.compareMarketPrices);
router.get('/volatility', priceController.getPriceVolatility);
router.get('/trends/popular', priceController.getTrendingProducts);
router.get('/trends/product', priceController.getProductTrend);
router.get('/seasonal', priceController.analyzeSeasonalPrices);
router.get('/correlations', priceController.analyzeCorrelations);
router.get('/regional', priceController.analyzeRegionalPrices);
router.get('/report', priceController.generateMarketReport);

router.post('/alerts', authenticate, priceController.setUserPriceAlerts);
router.get('/alerts', authenticate, priceController.checkPriceAlerts);
router.delete('/alerts/:id', authenticate, priceController.deletePriceAlert);

router.post('/schedule-report', authenticate, priceController.scheduleReport);

router.get('/price-summary/:productId', priceController.getPriceSummary);
router.get('/:id', priceController.getPriceById);
router.put('/:id', authenticate, priceFreezeGuard, authorize('admin', 'trader'), priceController.updatePrice);
router.delete('/:id', authenticate, priceFreezeGuard, authorize('admin', 'trader'), priceController.deletePrice);

export default router;
