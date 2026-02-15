import { Router } from 'express';
import analyticsRoutes from '../../modules/analytics/analytics.routes';
import priceMonitorRoutes from '../../modules/price-monitor/priceMonitor.routes';
import config from '../../common/config';
import { createServiceApp, startService } from '../shared/createServiceApp';

const router = Router();
const API_VERSION = `/api/${config.app.apiVersion}`;

router.use(`${API_VERSION}/analytics`, analyticsRoutes);
router.use(`${API_VERSION}/pricing`, priceMonitorRoutes);
router.get(`${API_VERSION}/health`, (_req, res) => {
  res.json({
    success: true,
    service: 'analytics',
    message: 'Analytics service is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

const app = createServiceApp({ serviceName: 'analytics', routes: router });

startService(app, config.services.analyticsPort, 'analytics');
