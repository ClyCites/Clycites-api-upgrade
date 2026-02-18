/**
 * Notification Model — v2
 *
 * Upgraded from the original single-type enum model to support:
 * - Full NotificationType enum (order, payment, weather, pest, messaging …)
 * - Per-delivery-attempt tracking per channel
 * - Status lifecycle (pending → sent → read → archived/expired)
 * - Locale support for template-rendered notifications
 * - Source service tracking for event-driven dispatch
 * - TTL index to auto-clean expired notifications
 */

import mongoose, { Schema } from 'mongoose';
import {
  INotificationDocument,
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  NotificationStatus,
  DeliveryStatus,
  Locale,
} from './notification.types';

// Legacy interface re-export (backward compat)
export type { INotificationDocument as INotification };

const deliveryAttemptSchema = new Schema(
  {
    channel:      { type: String, enum: Object.values(NotificationChannel), required: true },
    status:       { type: String, enum: Object.values(DeliveryStatus),      default: DeliveryStatus.PENDING },
    attemptedAt:  { type: Date,   default: Date.now },
    deliveredAt:  { type: Date },
    externalRef:  { type: String },
    errorMessage: { type: String },
    retryCount:   { type: Number, default: 0 },
  },
  { _id: false }
);

const notificationSchemaV2 = new Schema<INotificationDocument>(
  {
    user: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    type: {
      type:     String,
      enum:     Object.values(NotificationType),
      required: true,
      index:    true,
    },
    priority: {
      type:    String,
      enum:    Object.values(NotificationPriority),
      default: NotificationPriority.MEDIUM,
    },
    title:   { type: String, required: true },
    message: { type: String, required: true },
    data:    { type: Schema.Types.Mixed },
    templateId: { type: Schema.Types.ObjectId, ref: 'NotificationTemplate' },
    locale:  { type: String, enum: Object.values(Locale), default: Locale.EN },

    requestedChannels: [{ type: String, enum: Object.values(NotificationChannel) }],
    deliveryAttempts:  { type: [deliveryAttemptSchema], default: [] },

    status:     { type: String, enum: Object.values(NotificationStatus), default: NotificationStatus.PENDING, index: true },
    read:       { type: Boolean, default: false, index: true },
    readAt:     { type: Date },
    archivedAt: { type: Date },
    expiresAt:  { type: Date },

    triggeredBy:       { type: String, enum: ['system', 'user', 'event'], default: 'system' },
    triggeredByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    sourceService:     { type: String },
  },
  { timestamps: true, collection: 'notifications' }
);

// Indexes
notificationSchemaV2.index({ user: 1, read: 1, createdAt: -1 });
notificationSchemaV2.index({ user: 1, status: 1, createdAt: -1 });
notificationSchemaV2.index({ user: 1, type: 1, createdAt: -1 });
notificationSchemaV2.index({ organizationId: 1, type: 1, createdAt: -1 });
notificationSchemaV2.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

const Notification = mongoose.model<INotificationDocument>('Notification', notificationSchemaV2);

export default Notification;

