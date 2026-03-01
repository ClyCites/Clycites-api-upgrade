import mongoose, { Document, Schema } from 'mongoose';

export interface IFarmerInput extends Document {
  farmerId: mongoose.Types.ObjectId;
  farmId?: mongoose.Types.ObjectId;
  plotId?: mongoose.Types.ObjectId;
  inputName: string;
  inputType: 'seed' | 'fertilizer' | 'pesticide' | 'herbicide' | 'feed' | 'equipment' | 'other';
  quantity: number;
  unit: string;
  cost?: number;
  currency?: string;
  supplier?: string;
  purchasedAt?: Date;
  applicationDate?: Date;
  status: 'planned' | 'applied' | 'consumed' | 'cancelled';
  notes?: string;
  version: number;
  isActive: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  softDelete(deletedBy?: mongoose.Types.ObjectId): Promise<IFarmerInput>;
}

const FarmerInputSchema = new Schema<IFarmerInput>(
  {
    farmerId: {
      type: Schema.Types.ObjectId,
      ref: 'FarmerProfile',
      required: true,
      index: true,
    },
    farmId: {
      type: Schema.Types.ObjectId,
      ref: 'FarmEnterprise',
      index: true,
    },
    plotId: {
      type: Schema.Types.ObjectId,
      ref: 'Plot',
      index: true,
    },
    inputName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    inputType: {
      type: String,
      enum: ['seed', 'fertilizer', 'pesticide', 'herbicide', 'feed', 'equipment', 'other'],
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    cost: Number,
    currency: {
      type: String,
      default: 'UGX',
    },
    supplier: String,
    purchasedAt: Date,
    applicationDate: Date,
    status: {
      type: String,
      enum: ['planned', 'applied', 'consumed', 'cancelled'],
      default: 'planned',
      index: true,
    },
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

FarmerInputSchema.index({ farmerId: 1, isActive: 1, createdAt: -1 });
FarmerInputSchema.index({ farmId: 1, isActive: 1 });
FarmerInputSchema.index({ plotId: 1, isActive: 1 });

FarmerInputSchema.methods.softDelete = async function (deletedBy?: mongoose.Types.ObjectId) {
  this.isActive = false;
  this.deletedAt = new Date();
  if (deletedBy) this.deletedBy = deletedBy;
  return this.save();
};

export default mongoose.model<IFarmerInput>('FarmerInput', FarmerInputSchema);
