import Notification, { INotification } from './notification.model';
import EmailService from '../../common/utils/email';
import { PaginationUtil } from '../../common/utils/pagination';
import User from '../users/user.model';
import { NotFoundError } from '../../common/errors/AppError';

interface CreateNotificationData {
  user: string;
  type: INotification['type'];
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: INotification['priority'];
  channels?: INotification['channels'];
}

class NotificationService {
  async createNotification(data: CreateNotificationData): Promise<INotification> {
    const notification = await Notification.create({
      ...data,
      channels: data.channels || ['in_app'],
      sentChannels: [],
    });

    // Send through requested channels
    await this.sendThroughChannels(notification, data.user);

    return notification;
  }

  async getNotificationById(notificationId: string, userId: string): Promise<INotification> {
    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId,
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    return notification;
  }

  async getMyNotifications(userId: string, query: any) {
    const { page, limit, sortBy, sortOrder } = PaginationUtil.getPaginationParams(query);
    const skip = PaginationUtil.getSkip(page, limit);
    const sort = PaginationUtil.getSortObject(sortBy || 'createdAt', sortOrder || 'desc');

    const filter: any = { user: userId };

    if (query.type) {
      filter.type = query.type;
    }

    if (query.read !== undefined) {
      filter.read = query.read === 'true';
    }

    const [notifications, total] = await Promise.all([
      Notification.find(filter).sort(sort).skip(skip).limit(limit),
      Notification.countDocuments(filter),
    ]);

    return PaginationUtil.buildPaginationResult(notifications, total, page, limit);
  }

  async markAsRead(notificationId: string, userId: string): Promise<INotification> {
    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId,
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (!notification.read) {
      notification.read = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return notification;
  }

  async markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany(
      { user: userId, read: false },
      { read: true, readAt: new Date() }
    );
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId,
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    await notification.deleteOne();
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await Notification.countDocuments({ user: userId, read: false });
  }

  // Notification templates
  async notifyOrderCreated(orderId: string, buyerId: string, farmerId: string): Promise<void> {
    // Notify buyer
    await this.createNotification({
      user: buyerId,
      type: 'order',
      title: 'Order Created',
      message: `Your order has been created successfully. Order ID: ${orderId}`,
      data: { orderId },
      priority: 'high',
      channels: ['email', 'in_app'],
    });

    // Notify farmer
    await this.createNotification({
      user: farmerId,
      type: 'order',
      title: 'New Order Received',
      message: `You have received a new order. Order ID: ${orderId}`,
      data: { orderId },
      priority: 'high',
      channels: ['email', 'sms', 'in_app'],
    });
  }

  async notifyOrderStatusChange(orderId: string, buyerId: string, status: string): Promise<void> {
    await this.createNotification({
      user: buyerId,
      type: 'order',
      title: 'Order Status Updated',
      message: `Your order status has been updated to: ${status}`,
      data: { orderId, status },
      priority: 'medium',
      channels: ['email', 'in_app'],
    });
  }

  async notifyPaymentReceived(orderId: string, farmerId: string, amount: number): Promise<void> {
    await this.createNotification({
      user: farmerId,
      type: 'payment',
      title: 'Payment Received',
      message: `Payment of UGX ${amount.toLocaleString()} has been received for order ${orderId}`,
      data: { orderId, amount },
      priority: 'high',
      channels: ['email', 'sms', 'in_app'],
    });
  }

  async notifyListingExpiring(farmerId: string, listingId: string, daysLeft: number): Promise<void> {
    await this.createNotification({
      user: farmerId,
      type: 'listing',
      title: 'Listing Expiring Soon',
      message: `Your listing will expire in ${daysLeft} days. Listing ID: ${listingId}`,
      data: { listingId, daysLeft },
      priority: 'medium',
      channels: ['email', 'in_app'],
    });
  }

  async sendBulkNotification(
    userIds: string[],
    data: Omit<CreateNotificationData, 'user'>
  ): Promise<void> {
    const notifications = userIds.map(userId => ({
      ...data,
      user: userId,
      channels: data.channels || ['in_app'],
      sentChannels: [],
    }));

    await Notification.insertMany(notifications);

    // Send through channels asynchronously
    userIds.forEach(userId => {
      this.sendThroughChannels(
        { ...data, user: userId } as any,
        userId
      ).catch(err => console.error('Failed to send notification:', err));
    });
  }

  private async sendThroughChannels(notification: INotification, userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) return;

    const sentChannels: INotification['sentChannels'] = [];

    for (const channel of notification.channels) {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmail(user.email, notification.title, notification.message);
            sentChannels.push('email');
            break;
          case 'sms':
            await this.sendSMS(user.phone || '', notification.message);
            sentChannels.push('sms');
            break;
          case 'push':
            await this.sendPushNotification(userId, notification.title, notification.message);
            sentChannels.push('push');
            break;
          case 'in_app':
            sentChannels.push('in_app');
            break;
        }
      } catch (error) {
        console.error(`Failed to send notification via ${channel}:`, error);
      }
    }

    // Update sent channels
    notification.sentChannels = sentChannels;
    await notification.save();
  }

  private async sendEmail(to: string, subject: string, message: string): Promise<void> {
    await EmailService.send({
      to,
      subject,
      text: message,
      html: `<div style="padding: 20px; font-family: Arial, sans-serif;">
        <h2>${subject}</h2>
        <p>${message}</p>
        <hr>
        <p style="color: #666; font-size: 12px;">This is an automated message from ClyCites Agricultural E-Market Platform</p>
      </div>`,
    });
  }

  private async sendSMS(phone: string, message: string): Promise<void> {
    // TODO: Integrate with SMS provider (e.g., Twilio, Africa's Talking)
    console.log(`SMS to ${phone}: ${message}`);
    // Implementation placeholder
  }

  private async sendPushNotification(userId: string, title: string, message: string): Promise<void> {
    // TODO: Integrate with push notification service (e.g., FCM, OneSignal)
    console.log(`Push to ${userId}: ${title} - ${message}`);
    // Implementation placeholder
  }
}

export default NotificationService;
