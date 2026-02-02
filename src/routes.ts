import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes';
import farmerRoutes from './modules/farmers/farmer.routes';
import productRoutes from './modules/products/product.routes';
import listingRoutes from './modules/marketplace/listing.routes';
import orderRoutes from './modules/orders/order.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';

const router = Router();

// API versioning
const API_VERSION = '/api/v1';

// Mount routes
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/farmers`, farmerRoutes);
router.use(`${API_VERSION}/products`, productRoutes);
router.use(`${API_VERSION}/listings`, listingRoutes);
router.use(`${API_VERSION}/orders`, orderRoutes);
router.use(`${API_VERSION}/notifications`, notificationRoutes);
router.use(`${API_VERSION}/analytics`, analyticsRoutes);

// Health check
router.get(`${API_VERSION}/health`, (_req, res) => {
  res.json({
    success: true,
    message: 'ClyCites API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default router;
