/**
 * Farmer Inquiry Model
 * Farmer questions and consultation requests assigned to experts.
 */

import mongoose, { Schema } from 'mongoose';
import {
  IFarmerInquiry,
  InquiryStatus,
  UrgencyLevel,
  KnowledgeCategory,
} from './expert.types';

const FollowUpSchema = new Schema(
  {
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    isExpert: { type: Boolean, default: false },
  },
  { _id: false }
);

const FarmerInquirySchema = new Schema<IFarmerInquiry>(
  {
    farmer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignedExpert: {
      type: Schema.Types.ObjectId,
      ref: 'ExpertProfile',
      index: true,
    },

    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    cropType: { type: String },
    region: { type: String, index: true },

    status: {
      type: String,
      enum: Object.values(InquiryStatus),
      default: InquiryStatus.OPEN,
      index: true,
    },
    urgency: {
      type: String,
      enum: Object.values(UrgencyLevel),
      default: UrgencyLevel.LOW,
    },
    category: {
      type: String,
      enum: Object.values(KnowledgeCategory),
      required: true,
      index: true,
    },

    attachmentUrls: { type: [String], default: [] },
    relatedReport: { type: Schema.Types.ObjectId, ref: 'PestDiseaseReport' },

    // Expert response
    expertResponse: { type: String },
    respondedAt: { type: Date },
    responseAttachments: { type: [String], default: [] },

    // Farmer feedback
    farmerRating: { type: Number, min: 1, max: 5 },
    farmerFeedback: { type: String },
    ratedAt: { type: Date },

    // Conversation thread
    followUpMessages: { type: [FollowUpSchema], default: [] },

    assignedAt: { type: Date },
    closedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

FarmerInquirySchema.index({ farmer: 1, status: 1 });
FarmerInquirySchema.index({ assignedExpert: 1, status: 1 });
FarmerInquirySchema.index({ status: 1, urgency: 1, createdAt: -1 });

export default mongoose.model<IFarmerInquiry>('FarmerInquiry', FarmerInquirySchema);
