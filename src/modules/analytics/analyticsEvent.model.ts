/**
 * Analytics Event Model
 *
 * Immutable, append-only raw event store.
 * All major ClyCites actions publish here for auditability and metric replay.
 * Events are never updated — only inserted.
 * 90-day TTL for routine events; critical events (outbreaks, payments) persist longer.
 */

import mongoose, { Schema, Document } from 'mongoose';
import {
  IAnalyticsEvent,
  AnalyticsEventType,
  EventDomain,
} from './analytics.types';

export interface IAnalyticsEventDocument extends IAnalyticsEvent, Document {}

const analyticsEventSchema = new Schema<IAnalyticsEventDocument>(
  {
    eventType: {
      type:     String,
      enum:     Object.values(AnalyticsEventType),
      required: true,
      index:    true,
    },
    domain: {
      type:     String,
      enum:     Object.values(EventDomain),
      required: true,
      index:    true,
    },
    actorId:  { type: Schema.Types.ObjectId, ref: 'User',         index: true },
    farmerId: { type: Schema.Types.ObjectId, ref: 'Farmer',       index: true },
    orgId:    { type: Schema.Types.ObjectId, ref: 'Organization',  index: true },
    region:   { type: String, index: true },
    district: { type: String, index: true },
    cropType: [String],
    refId:    { type: Schema.Types.ObjectId },
    refModel: { type: String },
    payload:  { type: Schema.Types.Mixed, default: {} },
    metadata: {
      ipAddress: String,
      userAgent: String,
      source:    String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    // No updates — immutable
    strict: true,
  }
);

// ── Compound indexes for common query patterns ─────────────────────────────
analyticsEventSchema.index({ domain: 1, createdAt: -1 });
analyticsEventSchema.index({ eventType: 1, createdAt: -1 });
analyticsEventSchema.index({ orgId: 1, domain: 1, createdAt: -1 });
analyticsEventSchema.index({ farmerId: 1, domain: 1, createdAt: -1 });
analyticsEventSchema.index({ region: 1, eventType: 1, createdAt: -1 });
analyticsEventSchema.index({ domain: 1, region: 1, 'payload.cropType': 1, createdAt: -1 });

// ── 90-day TTL (for high-volume routine events) ────────────────────────────
// Critical domains (disease, payment) should override in ingestion layer
analyticsEventSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 90 * 24 * 60 * 60,
    partialFilterExpression: {
      domain: {
        $nin: [
          EventDomain.DISEASE,
          EventDomain.PAYMENT,
          EventDomain.DISPUTE,
        ],
      },
    },
  }
);

/** Prevent any accidental updates to events */
analyticsEventSchema.pre('findOneAndUpdate', function () {
  throw new Error('Analytics events are immutable — use insertEvent() instead');
});
analyticsEventSchema.pre('updateOne', function () {
  throw new Error('Analytics events are immutable — use insertEvent() instead');
});
analyticsEventSchema.pre('updateMany', function () {
  throw new Error('Analytics events are immutable — use insertEvent() instead');
});

const AnalyticsEvent = mongoose.model<IAnalyticsEventDocument>(
  'AnalyticsEvent',
  analyticsEventSchema
);

export default AnalyticsEvent;
