import { Router } from 'express';
import userController from './user.controller';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import {
  adminDeleteUserValidator,
  adminListUsersValidator,
  adminUpdateUserStatusValidator,
  adminUpdateUserValidator,
  adminUserIdValidator,
} from './user.validator';

const router = Router();

// Admin-only user management routes
router.use(authenticate, authorize('platform_admin', 'admin'));

router.get('/admin', validate(adminListUsersValidator), userController.listUsers);
router.get('/admin/:id', validate(adminUserIdValidator), userController.getUserById);
router.patch('/admin/:id', validate(adminUpdateUserValidator), userController.updateUserByAdmin);
router.patch(
  '/admin/:id/status',
  validate(adminUpdateUserStatusValidator),
  userController.updateUserStatusByAdmin
);
router.post('/admin/:id/unlock', validate(adminUserIdValidator), userController.unlockUserByAdmin);
router.delete('/admin/:id', validate(adminDeleteUserValidator), userController.softDeleteUserByAdmin);
router.post('/admin/:id/restore', validate(adminUserIdValidator), userController.restoreUserByAdmin);

export default router;
