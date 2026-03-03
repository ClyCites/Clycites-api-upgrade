import mongoose, { Document, Schema } from 'mongoose';

export type PriceEstimationStatus = 'draft' | 'submitted' | 'approved';

export interface IPriceEstimation extends Document {
  organization?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  marketId?: mongoose.Types.ObjectId;
  estimatedPrice: number;
  currency: string;
  basis?: string;
  confidence?: number;
  status: PriceEstimationStatus;
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  notes?: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PriceEstimationSchema = new Schema<IPriceEstimation>(
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
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    marketId: {
      type: Schema.Types.ObjectId,
      ref: 'Market',
      index: true,
    },
    estimatedPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'UGX',
      trim: true,
    },
    basis: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved'],
      default: 'draft',
      index: true,
    },
    submittedAt: Date,
    approvedAt: Date,
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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

PriceEstimationSchema.index({ organization: 1, status: 1, isActive: 1, createdAt: -1 });
PriceEstimationSchema.index({ createdBy: 1, status: 1, createdAt: -1 });

export default mongoose.model<IPriceEstimation>('PriceEstimation', PriceEstimationSchema);
