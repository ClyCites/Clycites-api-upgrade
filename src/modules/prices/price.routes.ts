import { Router } from 'express';
import priceController from './price.controller';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';

const router = Router();

router.post('/', authenticate, authorize('admin', 'trader'), priceController.addPrice);
router.get('/', priceController.getPrices);

router.get('/trends', priceController.getPriceTrends);
router.post('/predict', priceController.predictPrice);
router.post('/bulk-import', authenticate, authorize('admin', 'trader'), priceController.bulkImportPrices);
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
router.put('/:id', authenticate, authorize('admin', 'trader'), priceController.updatePrice);
router.delete('/:id', authenticate, authorize('admin', 'trader'), priceController.deletePrice);

export default router;
