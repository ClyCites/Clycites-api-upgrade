import mongoose, { Document, Schema } from 'mongoose';

export type InsuranceClaimStatus = 'open' | 'under_review' | 'resolved' | 'rejected';

export interface IInsuranceClaim extends Document {
  policyId: mongoose.Types.ObjectId;
  organization?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  reviewedBy?: mongoose.Types.ObjectId;
  claimNumber: string;
  amountClaimed: number;
  amountApproved?: number;
  reason: string;
  status: InsuranceClaimStatus;
  filedAt: Date;
  resolvedAt?: Date;
  resolutionNote?: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const InsuranceClaimSchema = new Schema<IInsuranceClaim>(
  {
    policyId: {
      type: Schema.Types.ObjectId,
      ref: 'FinanceInsurancePolicy',
      required: true,
      index: true,
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    claimNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    amountClaimed: {
      type: Number,
      required: true,
      min: 0.01,
    },
    amountApproved: {
      type: Number,
      min: 0,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['open', 'under_review', 'resolved', 'rejected'],
      default: 'open',
      index: true,
    },
    filedAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: Date,
    resolutionNote: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

InsuranceClaimSchema.index({ organization: 1, status: 1, isActive: 1, createdAt: -1 });
InsuranceClaimSchema.index({ policyId: 1, status: 1, filedAt: -1 });

InsuranceClaimSchema.pre('validate', function (next) {
  if (!this.claimNumber) {
    this.claimNumber = `CLM-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }
  next();
});

export default mongoose.model<IInsuranceClaim>('FinanceInsuranceClaim', InsuranceClaimSchema);
