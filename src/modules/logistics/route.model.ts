import mongoose, { Document, Schema } from 'mongoose';

export type LogisticsRouteStatus = 'draft' | 'active' | 'archived';

export interface ILogisticsRoute extends Document {
  organization?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  origin: string;
  destination: string;
  distanceKm: number;
  waypoints: string[];
  status: LogisticsRouteStatus;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LogisticsRouteSchema = new Schema<ILogisticsRoute>(
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
    origin: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    distanceKm: {
      type: Number,
      required: true,
      min: 0,
    },
    waypoints: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'draft',
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

LogisticsRouteSchema.index({ organization: 1, status: 1, isActive: 1, createdAt: -1 });
LogisticsRouteSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.model<ILogisticsRoute>('LogisticsRoute', LogisticsRouteSchema);
