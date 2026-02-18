import mongoose, { Schema } from 'mongoose';
import {
  IDisputeDocument,
  DisputeStatus,
  DisputeReason,
  ResolutionType,
  MediatorType,
} from './dispute.types';

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const evidenceSchema = new Schema(
  {
    submittedBy:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    description:  { type: String, required: true, maxlength: 2000 },
    mediaFiles:   [{ type: Schema.Types.ObjectId, ref: 'MediaFile' }],
    submittedAt:  { type: Date, default: Date.now },
  },
  { _id: true }
);

const timelineSchema = new Schema(
  {
    status:    { type: String, enum: Object.values(DisputeStatus), required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, default: Date.now },
    note:      String,
  },
  { _id: false }
);

const resolutionSchema = new Schema(
  {
    type:          { type: String, enum: Object.values(ResolutionType), required: true },
    resolvedBy:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    resolvedAt:    { type: Date, default: Date.now },
    refundAmount:  { type: Number, min: 0 },
    note:          { type: String, required: true, maxlength: 2000 },
    mediatorType:  { type: String, enum: Object.values(MediatorType), required: true },
  },
  { _id: false }
);

// ── Main schema ───────────────────────────────────────────────────────────────

const disputeSchema = new Schema<IDisputeDocument>(
  {
    disputeNumber: { type: String, required: true, unique: true, index: true },
    orderId:       { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    raisedBy:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    respondent:    { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reason:        { type: String, enum: Object.values(DisputeReason), required: true },
    description:   { type: String, required: true, maxlength: 3000 },

    status: {
      type:    String,
      enum:    Object.values(DisputeStatus),
      default: DisputeStatus.OPEN,
      index:   true,
    },

    timeline:    { type: [timelineSchema], default: [] },
    evidence:    { type: [evidenceSchema], default: [] },
    resolution:  { type: resolutionSchema },

    mediator:       { type: Schema.Types.ObjectId, ref: 'User' },
    mediatorType:   { type: String, enum: Object.values(MediatorType) },

    evidenceDeadline:  Date,
    responseDeadline:  Date,
    internalNotes:     { type: String, maxlength: 5000 },
    closedAt:          Date,
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.index({ raisedBy: 1, status: 1 });
disputeSchema.index({ respondent: 1, status: 1 });
disputeSchema.index({ mediator: 1, status: 1 });
disputeSchema.index({ responseDeadline: 1 }, { partialFilterExpression: { status: { $in: [DisputeStatus.OPEN, DisputeStatus.AWAITING_EVIDENCE] } } });

// ── Auto-generate dispute number ──────────────────────────────────────────────

disputeSchema.pre('save', async function (next) {
  if (!this.disputeNumber) {
    const date = new Date();
    const yy   = date.getFullYear().toString().slice(-2);
    const mm   = String(date.getMonth() + 1).padStart(2, '0');
    const n    = await mongoose.model('Dispute').countDocuments();
    this.disputeNumber = `DSP${yy}${mm}${String(n + 1).padStart(5, '0')}`;
  }
  next();
});

const Dispute = mongoose.model<IDisputeDocument>('Dispute', disputeSchema);
export default Dispute;
