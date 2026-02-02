import { Router } from 'express';
import orderController from './order.controller';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import {
  createOrderValidator,
  updateStatusValidator,
  cancelOrderValidator,
  orderIdValidator,
  orderQueryValidator,
} from './order.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Buyer routes
router.post(
  '/',
  authorize('buyer', 'farmer', 'admin'),
  validate(createOrderValidator),
  orderController.createOrder
);

router.get(
  '/my-orders',
  authorize('buyer', 'farmer', 'admin'),
  validate(orderQueryValidator),
  orderController.getMyOrders
);

router.get(
  '/my-stats',
  authorize('buyer', 'farmer', 'admin'),
  orderController.getOrderStats
);

router.get(
  '/:id',
  validate(orderIdValidator),
  orderController.getOrderById
);

// Farmer routes
router.get(
  '/farmer/orders',
  authorize('farmer', 'admin'),
  validate(orderQueryValidator),
  orderController.getFarmerOrders
);

router.patch(
  '/:id/status',
  authorize('farmer', 'admin'),
  validate(updateStatusValidator),
  orderController.updateOrderStatus
);

// Cancel order (buyer, farmer, or admin)
router.post(
  '/:id/cancel',
  validate(cancelOrderValidator),
  orderController.cancelOrder
);

export default router;
