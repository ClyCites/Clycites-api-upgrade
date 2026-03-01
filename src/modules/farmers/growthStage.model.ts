import mongoose, { Document, Schema } from 'mongoose';

export type GrowthStageStatus = 'planned' | 'active' | 'completed';
export type GrowthStageName = 'seed' | 'vegetative' | 'flowering' | 'maturity' | 'harvested';

export interface IGrowthStage extends Document {
  farmerId: mongoose.Types.ObjectId;
  cycleId: mongoose.Types.ObjectId;
  cropId?: mongoose.Types.ObjectId;
  stage: GrowthStageName;
  observedAt: Date;
  notes?: string;
  status: GrowthStageStatus;
  version: number;
  isActive: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  softDelete(deletedBy?: mongoose.Types.ObjectId): Promise<IGrowthStage>;
}

const GrowthStageSchema = new Schema<IGrowthStage>(
  {
    farmerId: {
      type: Schema.Types.ObjectId,
      ref: 'FarmerProfile',
      required: true,
      index: true,
    },
    cycleId: {
      type: Schema.Types.ObjectId,
      ref: 'CropProduction',
      required: true,
      index: true,
    },
    cropId: {
      type: Schema.Types.ObjectId,
      ref: 'CropProduction',
      index: true,
    },
    stage: {
      type: String,
      enum: ['seed', 'vegetative', 'flowering', 'maturity', 'harvested'],
      required: true,
      index: true,
    },
    observedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    notes: String,
    status: {
      type: String,
      enum: ['planned', 'active', 'completed'],
      default: 'active',
      index: true,
    },
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

GrowthStageSchema.index({ farmerId: 1, observedAt: -1, isActive: 1 });
GrowthStageSchema.index({ cycleId: 1, observedAt: -1, isActive: 1 });
GrowthStageSchema.index({ cropId: 1, observedAt: -1, isActive: 1 });

GrowthStageSchema.methods.softDelete = async function (deletedBy?: mongoose.Types.ObjectId) {
  this.isActive = false;
  this.deletedAt = new Date();
  if (deletedBy) this.deletedBy = deletedBy;
  return this.save();
};

export default mongoose.model<IGrowthStage>('GrowthStage', GrowthStageSchema);
