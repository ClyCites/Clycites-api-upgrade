import { Router } from 'express';
import notificationController from './notification.controller';
import { authenticate } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import {
  notificationIdValidator,
  notificationQueryValidator,
} from './notification.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get(
  '/',
  validate(notificationQueryValidator),
  notificationController.getMyNotifications
);

router.get(
  '/unread-count',
  notificationController.getUnreadCount
);

router.get(
  '/:id',
  validate(notificationIdValidator),
  notificationController.getNotificationById
);

router.patch(
  '/:id/read',
  validate(notificationIdValidator),
  notificationController.markAsRead
);

router.patch(
  '/mark-all-read',
  notificationController.markAllAsRead
);

router.delete(
  '/:id',
  validate(notificationIdValidator),
  notificationController.deleteNotification
);

export default router;
