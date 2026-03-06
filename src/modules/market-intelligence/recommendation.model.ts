import mongoose, { Document, Schema } from 'mongoose';

export type RecommendationStatus = 'draft' | 'approved' | 'published' | 'retracted';

export interface IRecommendation extends Document {
  organization?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId;
  marketId?: mongoose.Types.ObjectId;
  region?: string;
  recommendationType: string;
  recommendedPrice?: number;
  currency: string;
  rationale?: string;
  status: RecommendationStatus;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  publishedAt?: Date;
  retractedAt?: Date;
  notes?: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RecommendationSchema = new Schema<IRecommendation>(
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
      index: true,
    },
    marketId: {
      type: Schema.Types.ObjectId,
      ref: 'Market',
      index: true,
    },
    region: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    recommendationType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    recommendedPrice: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: 'UGX',
      trim: true,
    },
    rationale: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ['draft', 'approved', 'published', 'retracted'],
      default: 'draft',
      index: true,
    },
    approvedAt: Date,
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    publishedAt: Date,
    retractedAt: Date,
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

RecommendationSchema.index({ organization: 1, status: 1, isActive: 1, createdAt: -1 });
RecommendationSchema.index({ createdBy: 1, status: 1, createdAt: -1 });

export default mongoose.model<IRecommendation>('MarketRecommendation', RecommendationSchema);
