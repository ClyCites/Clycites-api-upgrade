import { Router } from 'express';
import notificationRoutes from '../../modules/notifications/notification.routes';
import config from '../../common/config';
import { createServiceApp, startService } from '../shared/createServiceApp';

const router = Router();
const API_VERSION = `/api/${config.app.apiVersion}`;

router.use(`${API_VERSION}/notifications`, notificationRoutes);
router.get(`${API_VERSION}/health`, (_req, res) => {
  res.json({
    success: true,
    service: 'notifications',
    message: 'Notifications service is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

const app = createServiceApp({ serviceName: 'notifications', routes: router });

startService(app, config.services.notificationsPort, 'notifications');
