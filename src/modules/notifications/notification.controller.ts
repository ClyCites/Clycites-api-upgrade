import { Response, NextFunction } from 'express';
import notificationService from './notification.service';
import templateService from './template.service';
import preferenceService from './preference.service';
import { sendSuccess } from '../../common/utils/response';
import { AuthRequest } from '../../common/middleware/auth';
import auditService from '../audit/audit.service';

// ── Notifications ─────────────────────────────────────────────────────────────

export const getMyNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await notificationService.getMyNotifications(req.user!.id, req.query as Record<string, unknown>);
    sendSuccess(res, result, 'Notifications retrieved successfully');
  } catch (error) { next(error); }
};

export const getNotificationById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notification = await notificationService.getNotificationById(req.params.id, req.user!.id);
    sendSuccess(res, notification, 'Notification retrieved successfully');
  } catch (error) { next(error); }
};

export const markAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user!.id);
    sendSuccess(res, notification, 'Notification marked as read');
  } catch (error) { next(error); }
};

export const markAllAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const count = await notificationService.markAllAsRead(req.user!.id);
    sendSuccess(res, { updated: count }, 'All notifications marked as read');
  } catch (error) { next(error); }
};

export const archiveNotification = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notification = await notificationService.archiveNotification(req.params.id, req.user!.id);
    sendSuccess(res, notification, 'Notification archived');
  } catch (error) { next(error); }
};

export const deleteNotification = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await notificationService.deleteNotification(req.params.id, req.user!.id);
    sendSuccess(res, null, 'Notification deleted');
  } catch (error) { next(error); }
};

export const getUnreadCount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const count = await notificationService.getUnreadCount(req.user!.id);
    sendSuccess(res, { count }, 'Unread count retrieved');
  } catch (error) { next(error); }
};

// ── Admin: retry / expire ─────────────────────────────────────────────────────

export const retryFailed = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const count = await notificationService.retryFailed();
    await auditService.log({ userId: req.user!.id, action: 'ADMIN_RETRY_FAILED_NOTIFICATIONS', resource: 'notification', status: 'success' });
    sendSuccess(res, { retried: count }, 'Failed notifications re-queued');
  } catch (error) { next(error); }
};

export const expireOld = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const count = await notificationService.expireOldNotifications();
    await auditService.log({ userId: req.user!.id, action: 'ADMIN_EXPIRE_OLD_NOTIFICATIONS', resource: 'notification', status: 'success' });
    sendSuccess(res, { expired: count }, 'Old notifications expired');
  } catch (error) { next(error); }
};

// ── Templates ─────────────────────────────────────────────────────────────────

export const listTemplates = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await templateService.list(req.query as Record<string, unknown>);
    sendSuccess(res, result, 'Notification templates retrieved');
  } catch (error) { next(error); }
};

export const getTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const template = await templateService.getById(req.params.id);
    sendSuccess(res, template, 'Template retrieved');
  } catch (error) { next(error); }
};

export const createTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const template = await templateService.create(req.body, req.user!.id);
    await auditService.log({ userId: req.user!.id, action: 'CREATE_NOTIFICATION_TEMPLATE', resource: 'notificationTemplate', resourceId: (template as { id?: string }).id, status: 'success' });
    sendSuccess(res, template, 'Template created', 201);
  } catch (error) { next(error); }
};

export const updateTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const template = await templateService.update(req.params.id, req.body, req.user!.id);
    await auditService.log({ userId: req.user!.id, action: 'UPDATE_NOTIFICATION_TEMPLATE', resource: 'notificationTemplate', resourceId: req.params.id, status: 'success' });
    sendSuccess(res, template, 'Template updated');
  } catch (error) { next(error); }
};

export const deactivateTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await templateService.deactivate(req.params.id, req.user!.id);
    await auditService.log({ userId: req.user!.id, action: 'DEACTIVATE_NOTIFICATION_TEMPLATE', resource: 'notificationTemplate', resourceId: req.params.id, status: 'success' });
    sendSuccess(res, null, 'Template deactivated');
  } catch (error) { next(error); }
};

export const seedTemplates = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await templateService.seedDefaultTemplates(req.user!.id);
    await auditService.log({ userId: req.user!.id, action: 'SEED_NOTIFICATION_TEMPLATES', resource: 'notificationTemplate', status: 'success' });
    sendSuccess(res, null, 'Default templates seeded');
  } catch (error) { next(error); }
};

// ── Preferences ───────────────────────────────────────────────────────────────

export const getMyPreferences = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prefs = await preferenceService.getPreferences(req.user!.id, req.query.organizationId as string | undefined);
    sendSuccess(res, prefs, 'Preferences retrieved');
  } catch (error) { next(error); }
};

export const updatePreferences = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prefs = await preferenceService.updatePreferences(
      req.user!.id,
      req.query.organizationId as string | undefined,
      req.body
    );
    await auditService.log({ userId: req.user!.id, action: 'UPDATE_NOTIFICATION_PREFERENCES', resource: 'notificationPreference', status: 'success' });
    sendSuccess(res, prefs, 'Preferences updated');
  } catch (error) { next(error); }
};

export const setFcmToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await preferenceService.setFcmToken(req.user!.id, req.body.token, req.query.organizationId as string | undefined);
    sendSuccess(res, null, 'FCM token registered');
  } catch (error) { next(error); }
};

export const resetPreferences = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prefs = await preferenceService.resetToDefaults(req.user!.id, req.query.organizationId as string | undefined);
    sendSuccess(res, prefs, 'Preferences reset to defaults');
  } catch (error) { next(error); }
};

// ── Legacy default export (backward compat) ──────────────────────────────────
export default {
  getMyNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  deleteNotification,
  getUnreadCount,
};
