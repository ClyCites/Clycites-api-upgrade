/**
 * Case Assignment Model
 *
 * Tracks AI diagnosis case assignments to experts for human-in-the-loop validation.
 * Records full audit trail of expert decisions for accountability and AI retraining.
 */

import mongoose, { Schema } from 'mongoose';
import {
  ICaseAssignment,
  CaseReviewStatus,
  CaseReviewDecision,
  UrgencyLevel,
} from './expert.types';

const TreatmentRecSchema = new Schema(
  {
    method: {
      type: String,
      enum: ['chemical', 'organic', 'biological', 'cultural', 'mechanical', 'integrated'],
      required: true,
    },
    product: { type: String },
    activeIngredient: { type: String },
    applicationRate: { type: String },
    applicationMethod: { type: String },
    frequency: { type: String },
    precautions: { type: [String], default: [] },
    estimatedCost: { type: String },
    effectiveness: {
      type: String,
      enum: ['high', 'medium', 'low'],
      required: true,
    },
    notes: { type: String },
  },
  { _id: false }
);

const AuditEntrySchema = new Schema(
  {
    action: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { _id: false }
);

const CaseAssignmentSchema = new Schema<ICaseAssignment>(
  {
    // Reference to PestDiseaseReport
    report: {
      type: Schema.Types.ObjectId,
      ref: 'PestDiseaseReport',
      required: true,
      index: true,
    },
    assignedExpert: {
      type: Schema.Types.ObjectId,
      ref: 'ExpertProfile',
      required: true,
      index: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedAt: { type: Date, default: Date.now },

    status: {
      type: String,
      enum: Object.values(CaseReviewStatus),
      default: CaseReviewStatus.PENDING,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(UrgencyLevel),
      default: UrgencyLevel.MEDIUM,
      index: true,
    },

    // Review outcome
    decision: {
      type: String,
      enum: Object.values(CaseReviewDecision),
    },
    reviewedAt: { type: Date },
    reviewDuration: { type: Number }, // minutes

    // Expert findings
    confirmedDiagnosis: { type: String },
    modifiedDiagnosis: { type: String },
    confidenceLevel: { type: Number, min: 0, max: 100 },
    expertNotes: { type: String, maxlength: 5000 },

    // Outbreak
    isOutbreak: { type: Boolean, default: false, index: true },
    outbreakNotes: { type: String },

    // Recommendations
    treatmentRecommendations: { type: [TreatmentRecSchema], default: [] },
    preventionGuidance: { type: String },
    followUpRequired: { type: Boolean, default: false },
    followUpDate: { type: Date },

    // Escalation
    escalatedTo: { type: Schema.Types.ObjectId, ref: 'ExpertProfile' },
    escalationReason: { type: String },
    escalatedAt: { type: Date },

    // AI model feedback
    aiFeedback: {
      modelId: { type: String },
      originalPrediction: { type: String },
      originalConfidence: { type: Number },
      expertAgreement: { type: Boolean },
      feedbackNotes: { type: String },
      submittedAt: { type: Date },
    },

    // Full audit trail
    auditTrail: { type: [AuditEntrySchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

CaseAssignmentSchema.index({ assignedExpert: 1, status: 1 });
CaseAssignmentSchema.index({ status: 1, priority: 1, assignedAt: -1 });
CaseAssignmentSchema.index({ isOutbreak: 1, status: 1 });
CaseAssignmentSchema.index({ createdAt: -1 });

export default mongoose.model<ICaseAssignment>('CaseAssignment', CaseAssignmentSchema);
