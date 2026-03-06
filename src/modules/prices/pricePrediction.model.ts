import mongoose, { Document, Schema } from 'mongoose';

export type PricePredictionStatus = 'generated' | 'compared' | 'archived';

export interface IPricePrediction extends Document {
  organization?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  marketId?: mongoose.Types.ObjectId;
  horizonDays: number;
  predictedPrice: number;
  currency: string;
  lowerBound?: number;
  upperBound?: number;
  confidence?: number;
  modelVersion?: string;
  status: PricePredictionStatus;
  generatedAt: Date;
  comparedAt?: Date;
  archivedAt?: Date;
  notes?: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PricePredictionSchema = new Schema<IPricePrediction>(
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
    horizonDays: {
      type: Number,
      required: true,
      min: 1,
      max: 365,
      default: 7,
    },
    predictedPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'UGX',
      trim: true,
    },
    lowerBound: {
      type: Number,
      min: 0,
    },
    upperBound: {
      type: Number,
      min: 0,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    modelVersion: {
      type: String,
      trim: true,
      maxlength: 64,
    },
    status: {
      type: String,
      enum: ['generated', 'compared', 'archived'],
      default: 'generated',
      index: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    comparedAt: Date,
    archivedAt: Date,
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

PricePredictionSchema.index({ organization: 1, status: 1, isActive: 1, createdAt: -1 });
PricePredictionSchema.index({ createdBy: 1, status: 1, createdAt: -1 });
PricePredictionSchema.index({ productId: 1, marketId: 1, generatedAt: -1 });

export default mongoose.model<IPricePrediction>('PricePredictionWorkspace', PricePredictionSchema);
