import { Router } from 'express';
import mongoose from 'mongoose';
import authRoutes from './modules/auth/auth.routes';
import farmerRoutes from './modules/farmers/farmer.routes';
import farmersEnterpriseRoutes from './modules/farmers/farmersEnterprise.routes';
import productRoutes from './modules/products/product.routes';
import listingRoutes from './modules/marketplace/listing.routes';
import orderRoutes from './modules/orders/order.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import messagingRoutes from './modules/notifications/messaging.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import priceMonitorRoutes from './modules/price-monitor/priceMonitor.routes';
import marketRoutes from './modules/markets/market.routes';
import priceRoutes from './modules/prices/price.routes';
import pestDiseaseRoutes from './modules/pest-disease/pestDisease.routes';
import expertPortalRoutes from './modules/expert-portal/expert.routes';
import weatherRoutes from './modules/weather/weather.routes';
import mediaRoutes from './modules/media/media.routes';
import disputeRoutes from './modules/orders/dispute.routes';
import securityRoutes from './modules/security/security.routes';
import auditRoutes from './modules/audit/audit.routes';
import paymentRoutes from './modules/payments/payment.routes';
import reputationRoutes from './modules/reputation/reputation.routes';
import marketIntelligenceRoutes from './modules/market-intelligence/marketIntelligence.routes';
import organizationRoutes from './modules/organizations/organization.routes';
import offerRoutes from './modules/offers/offer.routes';
import userRoutes from './modules/users/user.routes';
import platformControlRoutes from './modules/admin/platformControl.routes';
import logisticsRoutes from './modules/logistics/logistics.routes';
import aggregationRoutes from './modules/aggregation/aggregation.routes';
import { ResponseHandler } from './common/utils/response';
import config from './common/config';

const router = Router();

// API versioning
const API_VERSION = '/api/v1';

// Mount routes
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/farmers`, farmersEnterpriseRoutes); // Enterprise Farmers Module
router.use(`${API_VERSION}/farmers/legacy`, farmerRoutes); // Legacy routes (backward compatibility)
router.use(`${API_VERSION}/products`, productRoutes);
router.use(`${API_VERSION}/listings`, listingRoutes);
router.use(`${API_VERSION}/orders`, orderRoutes);
router.use(`${API_VERSION}/notifications`, notificationRoutes);
router.use(`${API_VERSION}/messaging`, messagingRoutes); // Messaging & Conversations Module
router.use(`${API_VERSION}/analytics`, analyticsRoutes);
router.use(`${API_VERSION}/pricing`, priceMonitorRoutes);
router.use(`${API_VERSION}/markets`, marketRoutes);
router.use(`${API_VERSION}/prices`, priceRoutes);
router.use(`${API_VERSION}/pest-disease`, pestDiseaseRoutes); // Pest & Disease Detection Module
router.use(`${API_VERSION}/expert-portal`, expertPortalRoutes); // Expert Portal Module
router.use(`${API_VERSION}/weather`, weatherRoutes); // Weather Detection, Forecasting & Alerts Module
router.use(`${API_VERSION}/media`, mediaRoutes);       // Media & File Management Service
router.use(`${API_VERSION}/disputes`, disputeRoutes); // Orders & Dispute Resolution Module
router.use(`${API_VERSION}/security`, securityRoutes);            // Security — MFA & Device Management
router.use(`${API_VERSION}/audit`, auditRoutes);                  // Audit Logs
router.use(`${API_VERSION}/payments`, paymentRoutes);             // Payments, Wallet & Escrow
router.use(`${API_VERSION}/reputation`, reputationRoutes);        // Reputation & Ratings
router.use(`${API_VERSION}/market-intelligence`, marketIntelligenceRoutes); // Market Intelligence & Alerts
router.use(`${API_VERSION}/organizations`, organizationRoutes);   // Organizations (Co-ops)
router.use(`${API_VERSION}/offers`, offerRoutes);                 // Marketplace Offers & Negotiation
router.use(`${API_VERSION}/users`, userRoutes);                   // Admin User Management
router.use(`${API_VERSION}/admin`, platformControlRoutes);        // Platform Controls
router.use(`${API_VERSION}/logistics`, logisticsRoutes);          // Logistics & Distribution
router.use(`${API_VERSION}/aggregation`, aggregationRoutes);      // Aggregation Workspace

// Health check
router.get(`${API_VERSION}/health`, (_req, res) => {
  return ResponseHandler.success(
    res,
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
    'ClyCites API is running'
  );
});

router.get(`${API_VERSION}/ready`, (_req, res) => {
  const isReady = mongoose.connection.readyState === 1;
  if (!isReady) {
    return ResponseHandler.error(
      res,
      'Service is not ready',
      503,
      'SERVICE_UNAVAILABLE',
      { databaseState: mongoose.connection.readyState }
    );
  }

  return ResponseHandler.success(
    res,
    {
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    },
    'Service is ready'
  );
});

router.get(`${API_VERSION}/version`, (_req, res) => {
  return ResponseHandler.success(
    res,
    {
      appVersion: '1.0.0',
      apiVersion: config.app.apiVersion,
      nodeEnv: config.app.env,
      timestamp: new Date().toISOString(),
    },
    'Version information retrieved'
  );
});

export default router;
