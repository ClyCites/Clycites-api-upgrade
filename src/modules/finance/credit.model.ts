import mongoose, { Document, Schema } from 'mongoose';

export type CreditStatus = 'applied' | 'under_review' | 'approved' | 'rejected' | 'disbursed';

export interface ICredit extends Document {
  organization?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  applicantId?: mongoose.Types.ObjectId;
  applicantName: string;
  referenceCode: string;
  amountRequested: number;
  amountApproved?: number;
  currency: string;
  purpose?: string;
  termMonths?: number;
  interestRate?: number;
  status: CreditStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  disbursedAt?: Date;
  notes?: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CreditSchema = new Schema<ICredit>(
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
    applicantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    applicantName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    referenceCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    amountRequested: {
      type: Number,
      required: true,
      min: 0.01,
    },
    amountApproved: {
      type: Number,
      min: 0.01,
    },
    currency: {
      type: String,
      default: 'UGX',
      trim: true,
    },
    purpose: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    termMonths: {
      type: Number,
      min: 1,
      max: 600,
    },
    interestRate: {
      type: Number,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ['applied', 'under_review', 'approved', 'rejected', 'disbursed'],
      default: 'applied',
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    disbursedAt: Date,
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

CreditSchema.index({ organization: 1, status: 1, isActive: 1, createdAt: -1 });
CreditSchema.index({ createdBy: 1, status: 1, createdAt: -1 });

CreditSchema.pre('validate', function (next) {
  if (!this.referenceCode) {
    this.referenceCode = `CR-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }
  next();
});

export default mongoose.model<ICredit>('FinanceCredit', CreditSchema);
