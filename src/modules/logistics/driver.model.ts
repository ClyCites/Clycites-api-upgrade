import mongoose, { Document, Schema } from 'mongoose';

export type LogisticsDriverStatus = 'available' | 'assigned' | 'inactive';

export interface ILogisticsDriver extends Document {
  organization?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  licenseNumber: string;
  available: boolean;
  status: LogisticsDriverStatus;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LogisticsDriverSchema = new Schema<ILogisticsDriver>(
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
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    licenseNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      index: true,
    },
    available: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['available', 'assigned', 'inactive'],
      default: 'available',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
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

LogisticsDriverSchema.index({ organization: 1, status: 1, isActive: 1, createdAt: -1 });
LogisticsDriverSchema.index({ organization: 1, licenseNumber: 1, isActive: 1 });
LogisticsDriverSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.model<ILogisticsDriver>('LogisticsDriver', LogisticsDriverSchema);
