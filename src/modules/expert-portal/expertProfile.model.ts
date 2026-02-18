/**
 * Expert Profile Model
 *
 * Represents a certified agricultural expert on the ClyCites platform.
 * Includes credentials, specializations, geographic scope, and performance metrics.
 */

import mongoose, { Schema } from 'mongoose';
import {
  IExpertProfile,
  ExpertSpecialization,
  ExpertRole,
  ExpertStatus,
  CredentialType,
} from './expert.types';

const CredentialSchema = new Schema(
  {
    type: {
      type: String,
      enum: Object.values(CredentialType),
      required: true,
    },
    title: { type: String, required: true, trim: true },
    institution: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1950 },
    verificationUrl: { type: String },
    documentUrl: { type: String },
    verified: { type: Boolean, default: false },
  },
  { _id: false }
);

const PerformanceSchema = new Schema(
  {
    totalReviews: { type: Number, default: 0 },
    approvedReviews: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 },
    accuracyScore: { type: Number, default: 0, min: 0, max: 100 },
    farmerRating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    advisoriesIssued: { type: Number, default: 0 },
    publicationsCount: { type: Number, default: 0 },
    escalationRate: { type: Number, default: 0 },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ExpertProfileSchema = new Schema<IExpertProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    title: { type: String, trim: true },

    // Specialization
    specializations: {
      type: [String],
      enum: Object.values(ExpertSpecialization),
      required: true,
    },
    primarySpecialization: {
      type: String,
      enum: Object.values(ExpertSpecialization),
      required: true,
      index: true,
    },
    subjectAreas: { type: [String], default: [] },

    // Geographic scope
    regions: { type: [String], default: [], index: true },
    districts: { type: [String], default: [] },
    nationalCoverage: { type: Boolean, default: false },
    languages: { type: [String], default: ['en'] },

    // Role & Access
    role: {
      type: String,
      enum: Object.values(ExpertRole),
      default: ExpertRole.ADVISOR,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ExpertStatus),
      default: ExpertStatus.PENDING_VERIFICATION,
      index: true,
    },
    permissions: { type: [String], default: [] },

    // Credentials
    credentials: { type: [CredentialSchema], default: [] },
    yearsOfExperience: { type: Number, default: 0, min: 0 },
    institutionAffiliation: { type: String },
    institutionType: { type: String },
    bio: { type: String, maxlength: 2000 },
    profileImageUrl: { type: String },

    // Performance
    performance: { type: PerformanceSchema, default: () => ({}) },

    // Availability
    isAvailableForReview: { type: Boolean, default: true, index: true },
    maxDailyReviews: { type: Number, default: 10 },
    workingHours: {
      start: { type: String },
      end: { type: String },
      timezone: { type: String },
    },

    // Verification
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    verificationNotes: { type: String },

    // Soft delete
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for efficient queries
ExpertProfileSchema.index({ primarySpecialization: 1, regions: 1, status: 1 });
ExpertProfileSchema.index({ status: 1, isAvailableForReview: 1 });
ExpertProfileSchema.index({ 'performance.farmerRating': -1 });
ExpertProfileSchema.index({ role: 1, status: 1 });

// Virtual: full approval rate
ExpertProfileSchema.virtual('approvalRate').get(function () {
  if (!this.performance.totalReviews) return 0;
  return ((this.performance.approvedReviews / this.performance.totalReviews) * 100).toFixed(1);
});

export default mongoose.model<IExpertProfile>('ExpertProfile', ExpertProfileSchema);
