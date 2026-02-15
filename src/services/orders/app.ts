import { Router } from 'express';
import orderRoutes from '../../modules/orders/order.routes';
import config from '../../common/config';
import { createServiceApp, startService } from '../shared/createServiceApp';

const router = Router();
const API_VERSION = `/api/${config.app.apiVersion}`;

router.use(`${API_VERSION}/orders`, orderRoutes);
router.get(`${API_VERSION}/health`, (_req, res) => {
  res.json({
    success: true,
    service: 'orders',
    message: 'Orders service is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

const app = createServiceApp({ serviceName: 'orders', routes: router });

startService(app, config.services.ordersPort, 'orders');
