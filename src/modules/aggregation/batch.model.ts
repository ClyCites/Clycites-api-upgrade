import mongoose, { Document, Schema } from 'mongoose';

export type AggregationBatchStatus = 'received' | 'stored' | 'dispatched' | 'closed';

export interface IAggregationBatch extends Document {
  organization: mongoose.Types.ObjectId;
  commodity: string;
  quantity: number;
  unit: 'kg' | 'tons' | 'bags' | 'liters' | 'units';
  grade?: string;
  warehouseId: mongoose.Types.ObjectId;
  binId?: mongoose.Types.ObjectId;
  receivedAt: Date;
  status: AggregationBatchStatus;
  notes?: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  deletedBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  softDelete(deletedBy: mongoose.Types.ObjectId): Promise<IAggregationBatch>;
}

const AggregationBatchSchema = new Schema<IAggregationBatch>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    commodity: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      enum: ['kg', 'tons', 'bags', 'liters', 'units'],
      default: 'kg',
    },
    grade: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'CollectionPoint',
      required: true,
      index: true,
    },
    binId: {
      type: Schema.Types.ObjectId,
      ref: 'StorageBin',
      index: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ['received', 'stored', 'dispatched', 'closed'],
      default: 'received',
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

AggregationBatchSchema.index({ organization: 1, status: 1, isActive: 1, createdAt: -1 });
AggregationBatchSchema.index({ organization: 1, warehouseId: 1, isActive: 1, createdAt: -1 });

AggregationBatchSchema.methods.softDelete = async function (deletedBy: mongoose.Types.ObjectId) {
  this.isActive = false;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

export default mongoose.model<IAggregationBatch>('AggregationBatch', AggregationBatchSchema);
