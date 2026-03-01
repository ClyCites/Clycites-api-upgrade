import mongoose, { Document, Schema } from 'mongoose';

export type SpoilageReportStatus = 'reported' | 'approved' | 'closed';

export interface ISpoilageReport extends Document {
  organization: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  quantity: number;
  unit: 'kg' | 'tons' | 'bags' | 'liters' | 'units';
  cause: string;
  reportedAt: Date;
  reportedBy: mongoose.Types.ObjectId;
  status: SpoilageReportStatus;
  notes?: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  deletedBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  softDelete(deletedBy: mongoose.Types.ObjectId): Promise<ISpoilageReport>;
}

const SpoilageReportSchema = new Schema<ISpoilageReport>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'AggregationBatch',
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
      enum: ['kg', 'tons', 'bags', 'liters', 'units'],
      default: 'kg',
    },
    cause: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    reportedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['reported', 'approved', 'closed'],
      default: 'reported',
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

SpoilageReportSchema.index({ organization: 1, status: 1, isActive: 1, reportedAt: -1 });
SpoilageReportSchema.index({ organization: 1, batchId: 1, isActive: 1, createdAt: -1 });

SpoilageReportSchema.methods.softDelete = async function (deletedBy: mongoose.Types.ObjectId) {
  this.isActive = false;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

export default mongoose.model<ISpoilageReport>('SpoilageReport', SpoilageReportSchema);
