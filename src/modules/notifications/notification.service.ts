/**
 * Notification Service — v2
 *
 * Central event-driven dispatcher for all platform notifications.
 * See notification.types.ts for all interfaces and enums.
 */

import mongoose from 'mongoose';
import Notification from './notification.model';
import DeliveryLog from './deliveryLog.model';
import NotificationPreference from './notificationPreference.model';
import User from '../users/user.model';
import {
  INotificationDocument,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  DeliveryStatus,
  Locale,
  IDeliveryAttempt,
} from './notification.types';
import {
  emailChannelService,
  smsChannelService,
  pushChannelService,
  whatsappChannelService,
} from './channels.service';
import templateService from './template.service';
import { PaginationUtil } from '../../common/utils/pagination';
import { NotFoundError } from '../../common/errors/AppError';
import logger from '../../common/utils/logger';


// ============================================================================
// Helpers
// ============================================================================

const MAX_RETRIES = 3;

function isQuietHour(pref: {
  enabled: boolean;
  startHour: number;
  endHour: number;
  timezone: string;
  daysOfWeek?: number[];
}): boolean {
  if (!pref.enabled) return false;
  try {
    const now = new Date();
    if (pref.daysOfWeek && pref.daysOfWeek.length > 0) {
      const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: pref.timezone }).format(now);
      const dayIdx  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(dayName);
      if (!pref.daysOfWeek.includes(dayIdx)) return false;
    }
    const hour = parseInt(
      new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: pref.timezone }).format(now),
      10
    );
    if (pref.startHour <= pref.endHour) return hour >= pref.startHour && hour < pref.endHour;
    return hour >= pref.startHour || hour < pref.endHour;
  } catch { return false; }
}

// ============================================================================
// CreateNotificationData — backward-compatible interface
// ============================================================================

export interface CreateNotificationData {
  user:          string;
  type:          NotificationType;
  title:         string;
  message:       string;
  data?:         Record<string, unknown>;
  priority?:     NotificationPriority;
  channels?:     NotificationChannel[];
  locale?:       string;
  expiresAt?:    Date;
  templateCode?: string;
  templateVars?: Record<string, string | number>;
  organizationId?:    string;
  sourceService?:     string;
  triggeredByUserId?: string;
}

// ============================================================================
// Service
// ============================================================================

class NotificationService {

  // ── Core dispatch ─────────────────────────────────────────────────────────

  async createNotification(data: CreateNotificationData): Promise<INotificationDocument> {
    const channels = await this.resolveChannels(data.user, data.channels, data.type);

    let { title, message } = data;
    let htmlBody: string | undefined;
    let smsBody:  string | undefined;

    if (data.templateCode) {
      const rendered = await templateService.render({
        code:   data.templateCode,
        vars:   data.templateVars,
        locale: (data.locale as Locale) ?? Locale.EN,
      });
      if (rendered) {
        title    = rendered.title;
        message  = rendered.body;
        htmlBody = rendered.htmlBody;
        smsBody  = rendered.smsBody;
      }
    }

    const notification = await Notification.create({
      user:              new mongoose.Types.ObjectId(data.user),
      organizationId:    data.organizationId ? new mongoose.Types.ObjectId(data.organizationId) : undefined,
      type:              data.type,
      priority:          data.priority       ?? NotificationPriority.MEDIUM,
      title,
      message,
      data:              data.data,
      locale:            data.locale         ?? Locale.EN,
      requestedChannels: channels,
      deliveryAttempts:  [],
      status:            NotificationStatus.PENDING,
      read:              false,
      expiresAt:         data.expiresAt,
      triggeredBy:       data.triggeredByUserId ? 'user' : 'system',
      triggeredByUserId: data.triggeredByUserId ? new mongoose.Types.ObjectId(data.triggeredByUserId) : undefined,
      sourceService:     data.sourceService,
    });

    this.dispatchChannels(notification, channels, { htmlBody, smsBody }).catch(err =>
      logger.error(`[NotificationService] Dispatch error for ${notification._id}: ${err}`)
    );

    return notification;
  }

  async sendBulkNotification(userIds: string[], data: Omit<CreateNotificationData, 'user'>): Promise<void> {
    const docs = userIds.map(userId => ({
      user:              new mongoose.Types.ObjectId(userId),
      type:              data.type,
      priority:          data.priority  ?? NotificationPriority.MEDIUM,
      title:             data.title,
      message:           data.message,
      data:              data.data,
      locale:            Locale.EN,
      requestedChannels: data.channels ?? [NotificationChannel.IN_APP],
      deliveryAttempts:  [],
      status:            NotificationStatus.PENDING,
      read:              false,
    }));

    const created = await Notification.insertMany(docs) as unknown as INotificationDocument[];
    created.forEach(n => {
      this.dispatchChannels(n, n.requestedChannels).catch(err =>
        logger.warn(`[NotificationService] Bulk dispatch fail for ${n._id}: ${err}`)
      );
    });
  }

  // ── Read lifecycle ────────────────────────────────────────────────────────

  async getMyNotifications(userId: string, query: Record<string, unknown>) {
    const { page, limit, sortBy, sortOrder } = PaginationUtil.getPaginationParams(query);
    const skip = PaginationUtil.getSkip(page, limit);
    const sort = PaginationUtil.getSortObject(sortBy || 'createdAt', sortOrder || 'desc');

    const filter: Record<string, unknown> = {
      user:   new mongoose.Types.ObjectId(userId),
      status: { $ne: NotificationStatus.ARCHIVED },
    };
    if (query.type)            filter.type   = query.type;
    if (query.read !== undefined) filter.read = query.read === 'true';
    if (query.status)          filter.status = query.status;

    const [data, total] = await Promise.all([
      Notification.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
    ]);
    return PaginationUtil.buildPaginationResult(data, total, page, limit);
  }

  async getNotificationById(notificationId: string, userId: string): Promise<INotificationDocument> {
    const n = await Notification.findOne({
      _id:  new mongoose.Types.ObjectId(notificationId),
      user: new mongoose.Types.ObjectId(userId),
    });
    if (!n) throw new NotFoundError('Notification not found');
    return n;
  }

  async markAsRead(notificationId: string, userId: string): Promise<INotificationDocument> {
    const n = await this.getNotificationById(notificationId, userId);
    if (!n.read) {
      n.read   = true;
      n.readAt = new Date();
      n.status = NotificationStatus.READ;
      await n.save();
    }
    return n;
  }

  async markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany(
      { user: new mongoose.Types.ObjectId(userId), read: false },
      { $set: { read: true, readAt: new Date(), status: NotificationStatus.READ } }
    );
  }

  async archiveNotification(notificationId: string, userId: string): Promise<INotificationDocument> {
    const n = await this.getNotificationById(notificationId, userId);
    n.status     = NotificationStatus.ARCHIVED;
    n.archivedAt = new Date();
    await n.save();
    return n;
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const n = await Notification.findOne({
      _id:  new mongoose.Types.ObjectId(notificationId),
      user: new mongoose.Types.ObjectId(userId),
    });
    if (!n) throw new NotFoundError('Notification not found');
    await n.deleteOne();
  }

  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({
      user: new mongoose.Types.ObjectId(userId),
      read: false,
      status: { $nin: [NotificationStatus.ARCHIVED, NotificationStatus.EXPIRED] },
    });
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  async retryFailed(): Promise<number> {
    const failed = await Notification.find({
      status: NotificationStatus.PENDING,
      'deliveryAttempts.status': DeliveryStatus.FAILED,
    }).limit(100);

    let retried = 0;
    for (const n of failed) {
      const failedCh = n.deliveryAttempts
        .filter(a => a.status === DeliveryStatus.FAILED && a.retryCount < MAX_RETRIES)
        .map(a => a.channel);
      if (failedCh.length === 0) continue;
      await this.dispatchChannels(n, failedCh);
      retried++;
    }
    return retried;
  }

  async expireOldNotifications(): Promise<number> {
    const r = await Notification.updateMany(
      {
        expiresAt: { $lt: new Date() },
        status:    { $nin: [NotificationStatus.READ, NotificationStatus.ARCHIVED, NotificationStatus.EXPIRED] }
      },
      { $set: { status: NotificationStatus.EXPIRED } }
    );
    return r.modifiedCount;
  }

  // ── Domain event helpers ──────────────────────────────────────────────────

  async notifyOrderCreated(orderId: string, buyerId: string, farmerId: string): Promise<void> {
    await Promise.all([
      this.createNotification({
        user: buyerId, type: NotificationType.ORDER_CREATED,
        title: 'Order Created', message: `Your order #${orderId} has been created successfully.`,
        data: { orderId }, priority: NotificationPriority.HIGH,
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        templateCode: 'order_created', templateVars: { orderId }, sourceService: 'orders',
      }),
      this.createNotification({
        user: farmerId, type: NotificationType.ORDER_CREATED,
        title: 'New Order Received', message: `You have received a new order #${orderId}.`,
        data: { orderId }, priority: NotificationPriority.HIGH,
        channels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.IN_APP],
        sourceService: 'orders',
      }),
    ]);
  }

  async notifyOrderStatusChange(orderId: string, buyerId: string, status: string): Promise<void> {
    await this.createNotification({
      user: buyerId, type: NotificationType.ORDER_STATUS_CHANGED,
      title: 'Order Status Updated', message: `Your order #${orderId} status is now: ${status}`,
      data: { orderId, status }, priority: NotificationPriority.MEDIUM,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP], sourceService: 'orders',
    });
  }

  async notifyPaymentReceived(orderId: string, farmerId: string, amount: number, currency = 'UGX'): Promise<void> {
    await this.createNotification({
      user: farmerId, type: NotificationType.PAYMENT_RECEIVED,
      title: 'Payment Received', message: `Payment of ${currency} ${amount.toLocaleString()} received for order #${orderId}`,
      data: { orderId, amount, currency }, priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.IN_APP],
      templateCode: 'payment_received', templateVars: { orderId, amount, currency }, sourceService: 'payments',
    });
  }

  async notifyListingExpiring(farmerId: string, listingId: string, daysLeft: number): Promise<void> {
    await this.createNotification({
      user: farmerId, type: NotificationType.LISTING_EXPIRING,
      title: 'Listing Expiring Soon', message: `Your listing #${listingId} expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`,
      data: { listingId, daysLeft }, priority: NotificationPriority.MEDIUM,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP], sourceService: 'marketplace',
    });
  }

  async notifyWeatherAlert(params: {
    userId: string; alertType: string; advisoryMessage: string;
    farmName?: string; alertId?: string; farmId?: string; severity?: string;
  }): Promise<void> {
    await this.createNotification({
      user: params.userId, type: NotificationType.WEATHER_ALERT,
      title: `Weather Alert: ${params.alertType.replace(/_/g, ' ')}`,
      message: params.advisoryMessage,
      data: { alertId: params.alertId, farmId: params.farmId, severity: params.severity },
      priority: NotificationPriority.URGENT,
      channels: [NotificationChannel.IN_APP, NotificationChannel.SMS, NotificationChannel.PUSH],
      templateCode: 'weather_alert',
      templateVars: { alertType: params.alertType.replace(/_/g, ' '), advisoryMessage: params.advisoryMessage, farmName: params.farmName ?? '', actions: '' },
      sourceService: 'weather',
    });
  }

  async notifyPestAlert(params: {
    userId: string; pestName: string; confidence: number; recommendation: string; detectionId?: string;
  }): Promise<void> {
    await this.createNotification({
      user: params.userId, type: NotificationType.PEST_ALERT,
      title: `Pest Alert: ${params.pestName}`,
      message: `${params.pestName} detected (${params.confidence}% confidence). ${params.recommendation}`,
      data: { detectionId: params.detectionId, pestName: params.pestName, confidence: params.confidence },
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.IN_APP, NotificationChannel.SMS],
      templateCode: 'pest_alert',
      templateVars: { pestName: params.pestName, confidence: params.confidence, recommendation: params.recommendation },
      sourceService: 'pest-disease',
    });
  }

  async notifyNewMessage(params: {
    recipientId: string; senderName: string; preview: string; conversationId: string;
  }): Promise<void> {
    await this.createNotification({
      user: params.recipientId, type: NotificationType.NEW_MESSAGE,
      title: `New message from ${params.senderName}`,
      message: params.preview.slice(0, 120),
      data: { conversationId: params.conversationId },
      priority: NotificationPriority.MEDIUM,
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      templateCode: 'new_message',
      templateVars: { senderName: params.senderName, messagePreview: params.preview.slice(0, 80) },
      sourceService: 'messaging',
    });
  }

  // ── Preference-aware channel resolver ────────────────────────────────────

  private async resolveChannels(
    userId: string,
    requestedChannels?: NotificationChannel[],
    type?: NotificationType
  ): Promise<NotificationChannel[]> {
    const channels = requestedChannels ?? [NotificationChannel.IN_APP];
    try {
      const pref = await NotificationPreference.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      if (!pref) return channels;

      return channels.filter(ch => {
        const cp = pref.channelPrefs.find(p => p.channel === ch);
        if (cp && !cp.enabled) return false;
        if (type) {
          const tp = pref.typePrefs.find(p => p.type === type);
          if (tp && !tp.enabled) return false;
          if (tp && tp.channels.length > 0 && !tp.channels.includes(ch)) return false;
        }
        return true;
      });
    } catch { return channels; }
  }

  // ── Internal dispatcher ───────────────────────────────────────────────────

  private async dispatchChannels(
    notification: INotificationDocument,
    channels: NotificationChannel[],
    extras?: { htmlBody?: string; smsBody?: string }
  ): Promise<void> {
    const user = await User.findById(notification.user).select('email phone firstName').lean();
    const pref = await NotificationPreference.findOne({ userId: notification.user }).lean();

    for (const channel of channels) {
      if (pref?.quietHours && isQuietHour(pref.quietHours)) {
        await this.recordAttempt(notification, channel, DeliveryStatus.SKIPPED, { provider: 'system', error: 'quiet_hours', durationMs: 0, retryCount: 0 });
        continue;
      }

      const retryCount = notification.deliveryAttempts.find(a => a.channel === channel)?.retryCount ?? 0;
      let result: { success: boolean; externalRef?: string; provider: string; durationMs: number; error?: string };

      switch (channel) {
        case NotificationChannel.EMAIL: {
          if (!user?.email) { await this.recordAttempt(notification, channel, DeliveryStatus.SKIPPED, { provider: 'nodemailer', error: 'no_email', durationMs: 0, retryCount }); continue; }
          result = await emailChannelService.send({ to: user.email, subject: notification.title, text: notification.message, html: extras?.htmlBody });
          break;
        }
        case NotificationChannel.SMS: {
          const phone = pref?.channelPrefs.find(p => p.channel === NotificationChannel.SMS)?.address ?? user?.phone;
          if (!phone) { await this.recordAttempt(notification, channel, DeliveryStatus.SKIPPED, { provider: 'africas_talking', error: 'no_phone', durationMs: 0, retryCount }); continue; }
          result = await smsChannelService.send({ to: phone, message: extras?.smsBody ?? notification.message });
          break;
        }
        case NotificationChannel.PUSH: {
          const fcmToken = pref?.fcmToken;
          if (!fcmToken || !pref?.pushEnabled) { await this.recordAttempt(notification, channel, DeliveryStatus.SKIPPED, { provider: 'fcm', error: 'no_fcm_token', durationMs: 0, retryCount }); continue; }
          result = await pushChannelService.send({ fcmToken, title: notification.title, body: notification.message, data: notification.data as Record<string, string> | undefined });
          break;
        }
        case NotificationChannel.WHATSAPP: {
          const waPhone = pref?.channelPrefs.find(p => p.channel === NotificationChannel.WHATSAPP)?.address ?? user?.phone;
          if (!waPhone) { await this.recordAttempt(notification, channel, DeliveryStatus.SKIPPED, { provider: 'whatsapp_stub', error: 'no_phone', durationMs: 0, retryCount }); continue; }
          result = await whatsappChannelService.send({ to: waPhone, message: notification.message });
          break;
        }
        default:
          // IN_APP — stored in DB, no external call
          result = { success: true, provider: 'in_app', durationMs: 0 };
          break;
      }

      const status = result.success ? DeliveryStatus.DELIVERED : DeliveryStatus.FAILED;
      await this.recordAttempt(notification, channel, status, { ...result, retryCount });
    }

    const hasSuccess = notification.deliveryAttempts.some(a => a.status === DeliveryStatus.DELIVERED);
    if (hasSuccess && notification.status === NotificationStatus.PENDING) {
      notification.status = NotificationStatus.SENT;
      await notification.save();
    }
  }

  private async recordAttempt(
    notification: INotificationDocument,
    channel: NotificationChannel,
    status: DeliveryStatus,
    meta: { provider: string; externalRef?: string; error?: string; durationMs: number; retryCount: number }
  ): Promise<void> {
    const attempt: IDeliveryAttempt = {
      channel,
      status,
      attemptedAt:  new Date(),
      deliveredAt:  status === DeliveryStatus.DELIVERED ? new Date() : undefined,
      externalRef:  meta.externalRef,
      errorMessage: meta.error,
      retryCount:   meta.retryCount,
    };
    notification.deliveryAttempts.push(attempt);
    await notification.save();

    await DeliveryLog.create({
      notificationId: notification._id,
      userId:         notification.user,
      channel,
      status,
      provider:       meta.provider,
      externalRef:    meta.externalRef,
      errorMessage:   meta.error,
      attemptNumber:  meta.retryCount + 1,
      attemptedAt:    attempt.attemptedAt,
      deliveredAt:    attempt.deliveredAt,
      durationMs:     meta.durationMs,
    }).catch(err => logger.warn(`[NotificationService] DeliveryLog write failed: ${err}`));
  }
}

const notificationService = new NotificationService();
export default notificationService;

