import mongoose, { Document, Schema } from 'mongoose';

export type PayoutStatus = 'requested' | 'processing' | 'paid' | 'failed';

export interface IPayout extends Document {
  organization?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  wallet?: mongoose.Types.ObjectId;
  transaction?: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  method: 'bank_transfer' | 'mobile_money' | 'cash';
  accountDetails?: Record<string, unknown>;
  reference?: string;
  status: PayoutStatus;
  notes?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
  requestedAt: Date;
  processedAt?: Date;
  paidAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutSchema = new Schema<IPayout>(
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
    wallet: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
      index: true,
    },
    transaction: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currency: {
      type: String,
      default: 'UGX',
      trim: true,
    },
    method: {
      type: String,
      enum: ['bank_transfer', 'mobile_money', 'cash'],
      default: 'bank_transfer',
      index: true,
    },
    accountDetails: {
      type: Schema.Types.Mixed,
      default: {},
    },
    reference: {
      type: String,
      trim: true,
      maxlength: 80,
      index: true,
    },
    status: {
      type: String,
      enum: ['requested', 'processing', 'paid', 'failed'],
      default: 'requested',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    failureReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: Date,
    paidAt: Date,
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

PayoutSchema.index({ organization: 1, status: 1, isActive: 1, createdAt: -1 });
PayoutSchema.index({ createdBy: 1, status: 1, createdAt: -1 });

export default mongoose.model<IPayout>('Payout', PayoutSchema);
