import { Router } from 'express';
import platformControlRoutes from './platformControl.routes';
import adminWorkspaceRoutes from './adminWorkspace.routes';

const router = Router();

router.use('/', adminWorkspaceRoutes);
router.use('/', platformControlRoutes);

export default router;
