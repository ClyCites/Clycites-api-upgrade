import mongoose, { Document, Schema } from 'mongoose';

export type StorageBinStatus = 'available' | 'occupied' | 'maintenance';

export interface IStorageBin extends Document {
  organization: mongoose.Types.ObjectId;
  warehouseId: mongoose.Types.ObjectId;
  name: string;
  capacity: number;
  capacityUnit: 'kg' | 'tons' | 'bags' | 'liters' | 'units';
  temperatureControl: boolean;
  currentLoad: number;
  status: StorageBinStatus;
  notes?: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  deletedBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  softDelete(deletedBy: mongoose.Types.ObjectId): Promise<IStorageBin>;
}

const StorageBinSchema = new Schema<IStorageBin>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'CollectionPoint',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    capacity: {
      type: Number,
      required: true,
      min: 0,
    },
    capacityUnit: {
      type: String,
      enum: ['kg', 'tons', 'bags', 'liters', 'units'],
      default: 'kg',
    },
    temperatureControl: {
      type: Boolean,
      default: false,
    },
    currentLoad: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'maintenance'],
      default: 'available',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
  }
);

StorageBinSchema.index({ organization: 1, warehouseId: 1, isActive: 1, createdAt: -1 });
StorageBinSchema.index({ organization: 1, status: 1, isActive: 1 });

StorageBinSchema.methods.softDelete = async function (deletedBy: mongoose.Types.ObjectId) {
  this.isActive = false;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

export default mongoose.model<IStorageBin>('StorageBin', StorageBinSchema);
