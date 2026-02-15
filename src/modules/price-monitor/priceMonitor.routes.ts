import { Router } from 'express';
import priceMonitorController from './priceMonitor.controller';
import { validate } from '../../common/middleware/validate';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { predictPriceValidator } from './priceMonitor.validator';

const router = Router();

router.post(
  '/predict',
  validate(predictPriceValidator),
  priceMonitorController.predict
);

router.post(
  '/train',
  authenticate,
  authorize('admin'),
  priceMonitorController.train
);

export default router;
