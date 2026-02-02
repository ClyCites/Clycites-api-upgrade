import { Response, NextFunction } from 'express';
import NotificationService from './notification.service';
import { ResponseHandler } from '../../common/utils/response';
import { AuthRequest } from '../../common/middleware/auth';

export class NotificationController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  getMyNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.notificationService.getMyNotifications(req.user!.id, req.query);
      ResponseHandler.paginated(
        res,
        result.data,
        result.pagination,
        'Notifications retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  getNotificationById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const notification = await this.notificationService.getNotificationById(id, req.user!.id);
      ResponseHandler.success(res, notification, 'Notification retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const notification = await this.notificationService.markAsRead(id, req.user!.id);
      ResponseHandler.success(res, notification, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  };

  markAllAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await this.notificationService.markAllAsRead(req.user!.id);
      ResponseHandler.success(res, null, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  };

  deleteNotification = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.notificationService.deleteNotification(id, req.user!.id);
      ResponseHandler.success(res, null, 'Notification deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  getUnreadCount = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const count = await this.notificationService.getUnreadCount(req.user!.id);
      ResponseHandler.success(res, { count }, 'Unread count retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}

export default new NotificationController();
