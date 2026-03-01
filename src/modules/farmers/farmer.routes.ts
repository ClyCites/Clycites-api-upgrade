import { Router } from 'express';
import farmerController from './farmer.controller';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import {
  createFarmerProfileValidator,
  updateFarmerProfileValidator,
  createFarmValidator,
  updateFarmValidator,
  farmerIdValidator,
  farmIdValidator,
} from './farmer.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Farmer Profile Routes
router.post(
  '/',
  authorize('farmer' ,'platform_admin'),
  validate(createFarmerProfileValidator),
  farmerController.createProfile
);

router.get('/me', authorize('farmer' ,'platform_admin'), farmerController.getMyProfile);

router.get(
  '/:id',
  validate(farmerIdValidator),
  farmerController.getFarmerById
);

router.put(
  '/:id',
  authorize('farmer', 'platform_admin'),
  validate(updateFarmerProfileValidator),
  farmerController.updateProfile
);

router.get('/', farmerController.getAllFarmers);

// Farm Routes
router.post(
  '/farms',
  authorize('farmer', 'platform_admin'),
  validate(createFarmValidator),
  farmerController.createFarm
);

router.get(
  '/:farmerId/farms',
  authorize('farmer', 'platform_admin'),
  farmerController.getMyFarms
);

router.get(
  '/farms/:id',
  validate(farmIdValidator),
  farmerController.getFarmById
);

router.put(
  '/farms/:id',
  authorize('farmer', 'platform_admin'),
  validate(updateFarmValidator),
  farmerController.updateFarm
);

router.delete(
  '/farms/:id',
  authorize('farmer', 'platform_admin'),
  validate(farmIdValidator),
  farmerController.deleteFarm
);

export default router;
