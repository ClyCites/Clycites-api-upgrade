/**
 * Advisory Model
 * Targeted expert advisories, broadcast messages, and emergency alerts.
 */

import mongoose, { Schema } from 'mongoose';
import {
  IAdvisory,
  AdvisoryType,
  AdvisoryStatus,
  UrgencyLevel,
  ExpertSpecialization,
} from './expert.types';

const AdvisorySchema = new Schema<IAdvisory>(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(AdvisoryType),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(AdvisoryStatus),
      default: AdvisoryStatus.DRAFT,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'ExpertProfile',
      required: true,
      index: true,
    },

    // Targeting
    targetCrops: { type: [String], default: [] },
    targetRegions: { type: [String], default: [], index: true },
    targetDistricts: { type: [String], default: [] },
    targetSeasons: { type: [String], default: [] },
    targetUserRoles: { type: [String], default: [] },
    targetFarmerIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    specificFarmer: { type: Schema.Types.ObjectId, ref: 'User', index: true },

    // Classification
    urgency: {
      type: String,
      enum: Object.values(UrgencyLevel),
      default: UrgencyLevel.LOW,
      index: true,
    },
    specialization: {
      type: String,
      enum: Object.values(ExpertSpecialization),
    },
    relatedArticle: { type: Schema.Types.ObjectId, ref: 'KnowledgeArticle' },
    relatedReport: { type: Schema.Types.ObjectId, ref: 'PestDiseaseReport' },

    // Delivery scheduling
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    expiresAt: { type: Date },

    // Channels
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
    },

    // Engagement metrics
    totalRecipients: { type: Number, default: 0 },
    deliveredCount: { type: Number, default: 0 },
    openedCount: { type: Number, default: 0 },
    acknowledgedCount: { type: Number, default: 0 },

    // Attachments
    attachmentUrls: { type: [String], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

AdvisorySchema.index({ type: 1, urgency: 1, status: 1 });
AdvisorySchema.index({ targetRegions: 1, urgency: 1 });
AdvisorySchema.index({ scheduledAt: 1, status: 1 });
AdvisorySchema.index({ createdAt: -1 });

export default mongoose.model<IAdvisory>('Advisory', AdvisorySchema);
