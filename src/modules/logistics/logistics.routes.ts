import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import LogisticsController, { proofOfDeliveryUpload } from './logistics.controller';
import LogisticsWorkspaceController from './logisticsWorkspace.controller';
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
  listRoutesValidator,
  createRouteValidator,
  routeIdValidator,
  updateRouteValidator,
  listVehiclesValidator,
  createVehicleValidator,
  vehicleIdValidator,
  updateVehicleValidator,
  listDriversValidator,
  createDriverValidator,
  driverIdValidator,
  updateDriverValidator,
  listTrackingEventsValidator,
  createTrackingEventResourceValidator,
  trackingEventIdValidator,
  updateTrackingEventResourceValidator,
  listColdChainLogsValidator,
  createColdChainLogValidator,
  coldChainLogIdValidator,
  updateColdChainLogValidator,
  flagColdChainViolationsValidator,
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

router.get(
  '/routes',
  validate(listRoutesValidator),
  LogisticsWorkspaceController.listRoutes
);

router.post(
  '/routes',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(createRouteValidator),
  LogisticsWorkspaceController.createRoute
);

router.get(
  '/routes/:routeId',
  validate(routeIdValidator),
  LogisticsWorkspaceController.getRoute
);

router.patch(
  '/routes/:routeId',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(updateRouteValidator),
  LogisticsWorkspaceController.updateRoute
);

router.delete(
  '/routes/:routeId',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(routeIdValidator),
  LogisticsWorkspaceController.deleteRoute
);

router.get(
  '/vehicles',
  validate(listVehiclesValidator),
  LogisticsWorkspaceController.listVehicles
);

router.post(
  '/vehicles',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(createVehicleValidator),
  LogisticsWorkspaceController.createVehicle
);

router.get(
  '/vehicles/:vehicleId',
  validate(vehicleIdValidator),
  LogisticsWorkspaceController.getVehicle
);

router.patch(
  '/vehicles/:vehicleId',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(updateVehicleValidator),
  LogisticsWorkspaceController.updateVehicle
);

router.delete(
  '/vehicles/:vehicleId',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(vehicleIdValidator),
  LogisticsWorkspaceController.deleteVehicle
);

router.get(
  '/drivers',
  validate(listDriversValidator),
  LogisticsWorkspaceController.listDrivers
);

router.post(
  '/drivers',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(createDriverValidator),
  LogisticsWorkspaceController.createDriver
);

router.get(
  '/drivers/:driverId',
  validate(driverIdValidator),
  LogisticsWorkspaceController.getDriver
);

router.patch(
  '/drivers/:driverId',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(updateDriverValidator),
  LogisticsWorkspaceController.updateDriver
);

router.delete(
  '/drivers/:driverId',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(driverIdValidator),
  LogisticsWorkspaceController.deleteDriver
);

router.get(
  '/tracking-events',
  validate(listTrackingEventsValidator),
  LogisticsWorkspaceController.listTrackingEvents
);

router.post(
  '/tracking-events',
  authorize('admin', 'platform_admin', 'super_admin', 'trader', 'farmer'),
  validate(createTrackingEventResourceValidator),
  LogisticsWorkspaceController.createTrackingEventResource
);

router.get(
  '/tracking-events/:eventId',
  validate(trackingEventIdValidator),
  LogisticsWorkspaceController.getTrackingEventResource
);

router.patch(
  '/tracking-events/:eventId',
  authorize('admin', 'platform_admin', 'super_admin', 'trader', 'farmer'),
  validate(updateTrackingEventResourceValidator),
  LogisticsWorkspaceController.updateTrackingEventResource
);

router.delete(
  '/tracking-events/:eventId',
  authorize('admin', 'platform_admin', 'super_admin', 'trader', 'farmer'),
  validate(trackingEventIdValidator),
  LogisticsWorkspaceController.deleteTrackingEventResource
);

router.get(
  '/cold-chain-logs',
  validate(listColdChainLogsValidator),
  LogisticsWorkspaceController.listColdChainLogs
);

router.post(
  '/cold-chain-logs',
  authorize('admin', 'platform_admin', 'super_admin', 'trader', 'farmer'),
  validate(createColdChainLogValidator),
  LogisticsWorkspaceController.createColdChainLog
);

router.get(
  '/cold-chain-logs/:logId',
  validate(coldChainLogIdValidator),
  LogisticsWorkspaceController.getColdChainLog
);

router.patch(
  '/cold-chain-logs/:logId',
  authorize('admin', 'platform_admin', 'super_admin', 'trader', 'farmer'),
  validate(updateColdChainLogValidator),
  LogisticsWorkspaceController.updateColdChainLog
);

router.delete(
  '/cold-chain-logs/:logId',
  authorize('admin', 'platform_admin', 'super_admin', 'trader', 'farmer'),
  validate(coldChainLogIdValidator),
  LogisticsWorkspaceController.deleteColdChainLog
);

router.post(
  '/cold-chain-logs/flag-violations',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(flagColdChainViolationsValidator),
  LogisticsWorkspaceController.flagColdChainViolations
);

export default router;
