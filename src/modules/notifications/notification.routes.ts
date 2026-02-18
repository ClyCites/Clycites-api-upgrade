import { Router } from 'express';
import * as ctrl from './notification.controller';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import {
  notificationIdValidator,
  notificationQueryValidator,
  templateIdValidator,
  createTemplateValidator,
  updateTemplateValidator,
  updatePreferencesValidator,
  fcmTokenValidator,
} from './notification.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Notifications ──────────────────────────────────────────────────────────────
router.get(  '/',                         validate(notificationQueryValidator), ctrl.getMyNotifications);
router.get(  '/unread-count',                                                   ctrl.getUnreadCount);
router.patch('/mark-all-read',                                                  ctrl.markAllAsRead);
router.get(  '/:id',                      validate(notificationIdValidator),    ctrl.getNotificationById);
router.patch('/:id/read',                 validate(notificationIdValidator),    ctrl.markAsRead);
router.patch('/:id/archive',              validate(notificationIdValidator),    ctrl.archiveNotification);
router.delete('/:id',                     validate(notificationIdValidator),    ctrl.deleteNotification);

// ── Admin: maintenance ─────────────────────────────────────────────────────────
router.post('/admin/retry-failed',        authorize('platform_admin'),          ctrl.retryFailed);
router.post('/admin/expire-old',          authorize('platform_admin'),          ctrl.expireOld);

// ── Templates ──────────────────────────────────────────────────────────────────
router.get(   '/templates',                                                      ctrl.listTemplates);
router.post(  '/templates/seed',          authorize('platform_admin'),           ctrl.seedTemplates);
router.post(  '/templates',               authorize('platform_admin'),
                                          validate(createTemplateValidator),     ctrl.createTemplate);
router.get(   '/templates/:id',           validate(templateIdValidator),         ctrl.getTemplate);
router.patch( '/templates/:id',           authorize('platform_admin'),
                                          validate(updateTemplateValidator),     ctrl.updateTemplate);
router.delete('/templates/:id',           authorize('platform_admin'),
                                          validate(templateIdValidator),         ctrl.deactivateTemplate);

// ── Preferences ────────────────────────────────────────────────────────────────
router.get(  '/preferences',                                                     ctrl.getMyPreferences);
router.patch('/preferences',              validate(updatePreferencesValidator),  ctrl.updatePreferences);
router.post( '/preferences/fcm-token',    validate(fcmTokenValidator),           ctrl.setFcmToken);
router.post( '/preferences/reset',                                               ctrl.resetPreferences);

export default router;

