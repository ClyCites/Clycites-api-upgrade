import mongoose, { Document, Schema } from 'mongoose';

export type LogisticsColdChainStatus = 'normal' | 'violation' | 'resolved';

export interface ILogisticsColdChainLog extends Document {
  shipmentId: mongoose.Types.ObjectId;
  organization?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  temperatureC: number;
  thresholdC: number;
  violation: boolean;
  capturedAt: Date;
  status: LogisticsColdChainStatus;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LogisticsColdChainLogSchema = new Schema<ILogisticsColdChainLog>(
  {
    shipmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Shipment',
      required: true,
      index: true,
    },
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
    temperatureC: {
      type: Number,
      required: true,
    },
    thresholdC: {
      type: Number,
      required: true,
    },
    violation: {
      type: Boolean,
      default: false,
      index: true,
    },
    capturedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ['normal', 'violation', 'resolved'],
      default: 'normal',
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

LogisticsColdChainLogSchema.index({ organization: 1, shipmentId: 1, status: 1, isActive: 1, capturedAt: -1 });
LogisticsColdChainLogSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.model<ILogisticsColdChainLog>('LogisticsColdChainLog', LogisticsColdChainLogSchema);
