import mongoose, { Document, Schema } from 'mongoose';

export type YieldPredictionStatus = 'generated' | 'refreshed' | 'archived';

export interface IYieldPrediction extends Document {
  farmerId: mongoose.Types.ObjectId;
  cropId: mongoose.Types.ObjectId;
  predictedYield: number;
  confidence: number;
  horizonDays: number;
  modelVersion: string;
  status: YieldPredictionStatus;
  refreshedAt?: Date;
  notes?: string;
  version: number;
  isActive: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  softDelete(deletedBy?: mongoose.Types.ObjectId): Promise<IYieldPrediction>;
}

const YieldPredictionSchema = new Schema<IYieldPrediction>(
  {
    farmerId: {
      type: Schema.Types.ObjectId,
      ref: 'FarmerProfile',
      required: true,
      index: true,
    },
    cropId: {
      type: Schema.Types.ObjectId,
      ref: 'CropProduction',
      required: true,
      index: true,
    },
    predictedYield: {
      type: Number,
      required: true,
      min: 0,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    horizonDays: {
      type: Number,
      required: true,
      min: 1,
      max: 3650,
    },
    modelVersion: {
      type: String,
      required: true,
      trim: true,
      default: 'v1.0',
    },
    status: {
      type: String,
      enum: ['generated', 'refreshed', 'archived'],
      default: 'generated',
      index: true,
    },
    refreshedAt: Date,
    notes: String,
    version: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    deletedAt: Date,
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

YieldPredictionSchema.index({ farmerId: 1, createdAt: -1, isActive: 1 });
YieldPredictionSchema.index({ cropId: 1, createdAt: -1, isActive: 1 });

YieldPredictionSchema.methods.softDelete = async function (deletedBy?: mongoose.Types.ObjectId) {
  this.isActive = false;
  this.deletedAt = new Date();
  if (deletedBy) this.deletedBy = deletedBy;
  return this.save();
};

export default mongoose.model<IYieldPrediction>('YieldPrediction', YieldPredictionSchema);
