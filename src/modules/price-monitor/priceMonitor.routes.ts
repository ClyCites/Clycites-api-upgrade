import { Router } from 'express';
import priceMonitorController from './priceMonitor.controller';
import { validate } from '../../common/middleware/validate';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import {
  createEstimationValidator,
  estimationIdValidator,
  listEstimationsValidator,
  predictPriceValidator,
  updateEstimationValidator,
} from './priceMonitor.validator';

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

router.get(
  '/estimations',
  authenticate,
  validate(listEstimationsValidator),
  priceMonitorController.listEstimations
);

router.post(
  '/estimations',
  authenticate,
  authorize('admin', 'platform_admin', 'super_admin', 'trader', 'farmer'),
  validate(createEstimationValidator),
  priceMonitorController.createEstimation
);

router.get(
  '/estimations/:estimationId',
  authenticate,
  validate(estimationIdValidator),
  priceMonitorController.getEstimation
);

router.patch(
  '/estimations/:estimationId',
  authenticate,
  authorize('admin', 'platform_admin', 'super_admin', 'trader', 'farmer'),
  validate(updateEstimationValidator),
  priceMonitorController.updateEstimation
);

router.delete(
  '/estimations/:estimationId',
  authenticate,
  authorize('admin', 'platform_admin', 'super_admin', 'trader', 'farmer'),
  validate(estimationIdValidator),
  priceMonitorController.deleteEstimation
);

export default router;
