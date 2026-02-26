import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import LogisticsController, { proofOfDeliveryUpload } from './logistics.controller';
import {
  createCollectionPointValidator,
  updateCollectionPointValidator,
  listCollectionPointsValidator,
  collectionPointIdValidator,
  createShipmentValidator,
  listShipmentsValidator,
  shipmentIdValidator,
  updateShipmentStatusValidator,
  addTrackingEventValidator,
  uploadProofOfDeliveryValidator,
} from './logistics.validator';

const router = Router();

router.use(authenticate);

router.post(
  '/collection-points',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(createCollectionPointValidator),
  LogisticsController.createCollectionPoint
);

router.get(
  '/collection-points',
  validate(listCollectionPointsValidator),
  LogisticsController.listCollectionPoints
);

router.get(
  '/collection-points/:id',
  validate(collectionPointIdValidator),
  LogisticsController.getCollectionPoint
);

router.patch(
  '/collection-points/:id',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(updateCollectionPointValidator),
  LogisticsController.updateCollectionPoint
);

router.delete(
  '/collection-points/:id',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(collectionPointIdValidator),
  LogisticsController.deactivateCollectionPoint
);

router.post(
  '/shipments',
  authorize('admin', 'platform_admin', 'super_admin', 'trader', 'farmer'),
  validate(createShipmentValidator),
  LogisticsController.createShipment
);

router.get(
  '/shipments',
  validate(listShipmentsValidator),
  LogisticsController.listShipments
);

router.get(
  '/shipments/:id',
  validate(shipmentIdValidator),
  LogisticsController.getShipment
);

router.patch(
  '/shipments/:id/status',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(updateShipmentStatusValidator),
  LogisticsController.updateShipmentStatus
);

router.post(
  '/shipments/:id/tracking',
  authorize('admin', 'platform_admin', 'super_admin', 'trader', 'farmer'),
  validate(addTrackingEventValidator),
  LogisticsController.addTrackingEvent
);

router.post(
  '/shipments/:id/proof-of-delivery',
  authorize('admin', 'platform_admin', 'super_admin', 'trader', 'farmer'),
  proofOfDeliveryUpload.single('proof'),
  validate(uploadProofOfDeliveryValidator),
  LogisticsController.uploadProofOfDelivery
);

export default router;
