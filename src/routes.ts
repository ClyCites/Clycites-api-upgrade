import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes';

const router = Router();

// API versioning
const API_VERSION = '/api/v1';

// Mount routes
router.use(`${API_VERSION}/auth`, authRoutes);

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
