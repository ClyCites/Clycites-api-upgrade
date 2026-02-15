import { Router } from 'express';
import listingRoutes from '../../modules/marketplace/listing.routes';
import marketRoutes from '../../modules/markets/market.routes';
import priceRoutes from '../../modules/prices/price.routes';
import config from '../../common/config';
import { createServiceApp, startService } from '../shared/createServiceApp';

const router = Router();
const API_VERSION = `/api/${config.app.apiVersion}`;

router.use(`${API_VERSION}/listings`, listingRoutes);
router.use(`${API_VERSION}/markets`, marketRoutes);
router.use(`${API_VERSION}/prices`, priceRoutes);
router.get(`${API_VERSION}/health`, (_req, res) => {
  res.json({
    success: true,
    service: 'marketplace',
    message: 'Marketplace service is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

const app = createServiceApp({ serviceName: 'marketplace', routes: router });

startService(app, config.services.marketplacePort, 'marketplace');
