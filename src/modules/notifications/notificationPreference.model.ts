/**
 * Notification Preference Model
 *
 * Per-user (optionally per-organisation) delivery preferences:
 * - Global channel on/off switches with address overrides
 * - Per notification-type channel + enabled overrides
 * - Quiet hours with timezone and day-of-week filtering
 * - FCM push token storage
 * - Marketing opt-in flag
 * - Preferred locale for template rendering
 *
 * One document per (user, organizationId?) pair.
 */

import mongoose, { Schema } from 'mongoose';
import {
  INotificationPreferenceDocument,
  NotificationChannel,
  NotificationType,
  Locale,
} from './notification.types';

const channelPrefSchema = new Schema(
  {
    channel:  { type: String, enum: Object.values(NotificationChannel), required: true },
    enabled:  { type: Boolean, default: true },
    address:  { type: String },   // override email/phone for this channel
  },
  { _id: false }
);

const typePrefSchema = new Schema(
  {
    type:     { type: String, enum: Object.values(NotificationType), required: true },
    enabled:  { type: Boolean, default: true },
    channels: [{ type: String, enum: Object.values(NotificationChannel) }],
  },
  { _id: false }
);

const quietHoursSchema = new Schema(
  {
    enabled:    { type: Boolean, default: false },
    startHour:  { type: Number, min: 0, max: 23, default: 22 },
    endHour:    { type: Number, min: 0, max: 23, default: 7 },
    timezone:   { type: String, default: 'UTC' },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }],
  },
  { _id: false }
);

const notificationPreferenceSchema = new Schema<INotificationPreferenceDocument>(
  {
    userId: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    organizationId: {
      type:  Schema.Types.ObjectId,
      ref:   'Organization',
      index: true,
    },

    channelPrefs: { type: [channelPrefSchema], default: [] },
    typePrefs:    { type: [typePrefSchema],    default: [] },
    quietHours:   {
      type:    quietHoursSchema,
      default: { enabled: false, startHour: 22, endHour: 7, timezone: 'UTC' },
    },

    fcmToken:        { type: String },
    pushEnabled:     { type: Boolean, default: false },
    locale:          { type: String, enum: Object.values(Locale), default: Locale.EN },
    marketingEnabled:{ type: Boolean, default: false },
  },
  { timestamps: true }
);

// Unique per (user, organizationId) pair
notificationPreferenceSchema.index(
  { userId: 1, organizationId: 1 },
  { unique: true, sparse: true }
);

const NotificationPreference = mongoose.model<INotificationPreferenceDocument>(
  'NotificationPreference',
  notificationPreferenceSchema
);
export default NotificationPreference;
