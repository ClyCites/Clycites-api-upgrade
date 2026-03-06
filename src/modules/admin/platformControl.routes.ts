import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { requireSuperAdmin } from '../../common/middleware/superAdmin';
import PlatformControlController from './platformControl.controller';

const router = Router();

router.use(authenticate, requireSuperAdmin());

router.get('/system/maintenance', PlatformControlController.getMaintenance);
router.patch('/system/maintenance', PlatformControlController.updateMaintenance);

router.get('/system/feature-flags', PlatformControlController.getFeatureFlags);
router.patch('/system/feature-flags', PlatformControlController.updateFeatureFlags);
router.get('/system/feature-flags/:workspaceId', PlatformControlController.getWorkspaceFeatureFlag);
router.patch('/system/feature-flags/:workspaceId', PlatformControlController.updateWorkspaceFeatureFlag);

export default router;
