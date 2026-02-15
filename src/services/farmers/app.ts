import { Router } from 'express';
import farmerRoutes from '../../modules/farmers/farmer.routes';
import config from '../../common/config';
import { createServiceApp, startService } from '../shared/createServiceApp';

const router = Router();
const API_VERSION = `/api/${config.app.apiVersion}`;

router.use(`${API_VERSION}/farmers`, farmerRoutes);
router.get(`${API_VERSION}/health`, (_req, res) => {
  res.json({
    success: true,
    service: 'farmers',
    message: 'Farmers service is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

const app = createServiceApp({ serviceName: 'farmers', routes: router });

startService(app, config.services.farmersPort, 'farmers');
