import mongoose, { Document, Schema } from 'mongoose';

export type LogisticsVehicleStatus = 'available' | 'assigned' | 'maintenance' | 'inactive';

export interface ILogisticsVehicle extends Document {
  organization?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  registration: string;
  capacityKg: number;
  coldChainEnabled: boolean;
  available: boolean;
  status: LogisticsVehicleStatus;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LogisticsVehicleSchema = new Schema<ILogisticsVehicle>(
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
    registration: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
      index: true,
    },
    capacityKg: {
      type: Number,
      required: true,
      min: 0,
    },
    coldChainEnabled: {
      type: Boolean,
      default: false,
    },
    available: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['available', 'assigned', 'maintenance', 'inactive'],
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

LogisticsVehicleSchema.index({ organization: 1, status: 1, isActive: 1, createdAt: -1 });
LogisticsVehicleSchema.index({ organization: 1, registration: 1, isActive: 1 });
LogisticsVehicleSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.model<ILogisticsVehicle>('LogisticsVehicle', LogisticsVehicleSchema);
