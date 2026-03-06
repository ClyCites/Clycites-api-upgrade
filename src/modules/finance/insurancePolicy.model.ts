import mongoose, { Document, Schema } from 'mongoose';

export type InsurancePolicyStatus = 'active' | 'claim_open' | 'claim_resolved' | 'expired';

export interface IInsurancePolicy extends Document {
  organization?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  insuredEntityId?: mongoose.Types.ObjectId;
  insuredEntityName: string;
  providerName: string;
  coverageType: string;
  policyNumber: string;
  premiumAmount: number;
  coverageAmount: number;
  startDate: Date;
  endDate: Date;
  status: InsurancePolicyStatus;
  notes?: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const InsurancePolicySchema = new Schema<IInsurancePolicy>(
  {
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
    insuredEntityId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    insuredEntityName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    providerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    coverageType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    policyNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    premiumAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    coverageAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'claim_open', 'claim_resolved', 'expired'],
      default: 'active',
      index: true,
    },
    notes: {
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

InsurancePolicySchema.index({ organization: 1, status: 1, isActive: 1, createdAt: -1 });
InsurancePolicySchema.index({ createdBy: 1, status: 1, createdAt: -1 });

InsurancePolicySchema.pre('validate', function (next) {
  if (!this.policyNumber) {
    this.policyNumber = `POL-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }
  next();
});

export default mongoose.model<IInsurancePolicy>('FinanceInsurancePolicy', InsurancePolicySchema);
