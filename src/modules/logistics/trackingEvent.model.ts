import mongoose, { Document, Schema } from 'mongoose';

export type LogisticsTrackingEventStatus = 'created' | 'verified' | 'closed';

export interface ILogisticsTrackingEvent extends Document {
  shipmentId: mongoose.Types.ObjectId;
  organization?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  location?: string;
  note?: string;
  eventType: string;
  recordedAt: Date;
  status: LogisticsTrackingEventStatus;
  metadata?: Record<string, string>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LogisticsTrackingEventSchema = new Schema<ILogisticsTrackingEvent>(
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
    location: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ['created', 'verified', 'closed'],
      default: 'created',
      index: true,
    },
    metadata: {
      type: Map,
      of: String,
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

LogisticsTrackingEventSchema.index({ organization: 1, shipmentId: 1, isActive: 1, recordedAt: -1 });
LogisticsTrackingEventSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.model<ILogisticsTrackingEvent>('LogisticsTrackingEvent', LogisticsTrackingEventSchema);
