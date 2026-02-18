/**
 * Delivery Log Model
 *
 * Immutable audit trail of every outbound notification delivery attempt,
 * one document per channel per attempt.
 * Provides:
 * - Provider-level diagnostic data (request / response payloads)
 * - Duration tracking for SLA monitoring
 * - Retry sequence (attemptNumber)
 * - TTL cleanup after 180 days
 */

import mongoose, { Schema } from 'mongoose';
import { IDeliveryLogDocument, NotificationChannel, DeliveryStatus } from './notification.types';

const deliveryLogSchema = new Schema<IDeliveryLogDocument>(
  {
    notificationId: { type: Schema.Types.ObjectId, ref: 'Notification', required: true, index: true },
    userId:         { type: Schema.Types.ObjectId, ref: 'User',         required: true, index: true },
    channel:        { type: String, enum: Object.values(NotificationChannel), required: true },
    status:         { type: String, enum: Object.values(DeliveryStatus),      required: true, index: true },
    provider:       { type: String, required: true },   // 'nodemailer' | 'twilio' | 'africas_talking' | 'fcm'
    externalRef:    { type: String },
    requestPayload: { type: Schema.Types.Mixed },
    responsePayload:{ type: Schema.Types.Mixed },
    errorMessage:   { type: String },
    attemptNumber:  { type: Number, default: 1 },
    attemptedAt:    { type: Date,   default: Date.now, index: true },
    deliveredAt:    { type: Date },
    durationMs:     { type: Number },
  },
  {
    timestamps: false,          // attemptedAt serves as the timestamp
    collection: 'delivery_logs',
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
deliveryLogSchema.index({ notificationId: 1, channel: 1 });
deliveryLogSchema.index({ userId: 1, attemptedAt: -1 });
// TTL — purge after 180 days
deliveryLogSchema.index({ attemptedAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

const DeliveryLog = mongoose.model<IDeliveryLogDocument>('DeliveryLog', deliveryLogSchema);
export default DeliveryLog;
