import { Router } from 'express';
import analyticsController from './analytics.controller';
import { authenticate, optionalAuth } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import {
  analyticsQueryValidator,
  farmerIdValidator,
} from './analytics.validator';

const router = Router();

// Public analytics (optional auth)
router.get(
  '/overview',
  optionalAuth,
  analyticsController.getMarketOverview
);

router.get(
  '/price-trends',
  optionalAuth,
  validate(analyticsQueryValidator),
  analyticsController.getPriceTrends
);

router.get(
  '/demand',
  optionalAuth,
  validate(analyticsQueryValidator),
  analyticsController.getProductDemand
);

router.get(
  '/supply',
  optionalAuth,
  validate(analyticsQueryValidator),
  analyticsController.getSupplyAnalysis
);

router.get(
  '/regional',
  optionalAuth,
  analyticsController.getRegionalAnalysis
);

router.get(
  '/market-health',
  optionalAuth,
  analyticsController.getMarketHealth
);

// Protected analytics
router.use(authenticate);

router.get(
  '/my-performance',
  authorize('farmer'),
  validate(analyticsQueryValidator),
  analyticsController.getMyPerformance
);

router.get(
  '/farmer/:farmerId',
  authorize('admin', 'farmer'),
  validate(farmerIdValidator),
  validate(analyticsQueryValidator),
  analyticsController.getFarmerPerformance
);

export default router;
