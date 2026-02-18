/**
 * Notification Template Model
 *
 * Localised, versioned templates for all notification types.
 * - Handlebars-compatible variable interpolation: {{orderId}}, {{farmerName}} …
 * - Per-locale title + body + htmlBody (email) + smsBody (SMS)
 * - Default channel selection and priority stored with the template
 * - Active/inactive flag for staged rollouts
 * - Soft delete + version counter for audit
 */

import mongoose, { Schema } from 'mongoose';
import {
  INotificationTemplateDocument,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  Locale,
} from './notification.types';

const translationSchema = new Schema(
  {
    locale:   { type: String, enum: Object.values(Locale), required: true },
    title:    { type: String, required: true },
    body:     { type: String, required: true },
    htmlBody: { type: String },
    smsBody:  { type: String },
  },
  { _id: false }
);

const notificationTemplateSchema = new Schema<INotificationTemplateDocument>(
  {
    code: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
      lowercase: true,
    },
    type: {
      type:     String,
      enum:     Object.values(NotificationType),
      required: true,
      index:    true,
    },
    description: { type: String },
    translations: { type: [translationSchema], default: [] },
    defaultLocale:{ type: String, enum: Object.values(Locale), default: Locale.EN },
    channels:     [{ type: String, enum: Object.values(NotificationChannel) }],
    priority: {
      type:    String,
      enum:    Object.values(NotificationPriority),
      default: NotificationPriority.MEDIUM,
    },
    isActive:  { type: Boolean, default: true, index: true },
    version:   { type: Number, default: 1 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

notificationTemplateSchema.index({ code: 1, isActive: 1 });
notificationTemplateSchema.index({ type: 1, isActive: 1 });

const NotificationTemplate = mongoose.model<INotificationTemplateDocument>(
  'NotificationTemplate',
  notificationTemplateSchema
);
export default NotificationTemplate;
