import mongoose, { Document, Schema } from 'mongoose';

export type DataSourceStatus = 'active' | 'paused' | 'disabled';

export interface IDataSource extends Document {
  organization?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  name: string;
  provider: string;
  endpoint?: string;
  status: DataSourceStatus;
  authType?: 'none' | 'api_key' | 'oauth2';
  pullIntervalMinutes?: number;
  lastRefreshAt?: Date;
  lastRefreshStatus?: 'success' | 'failed';
  lastError?: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DataSourceSchema = new Schema<IDataSource>(
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
      maxlength: 160,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    endpoint: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'disabled'],
      default: 'active',
      index: true,
    },
    authType: {
      type: String,
      enum: ['none', 'api_key', 'oauth2'],
      default: 'none',
    },
    pullIntervalMinutes: {
      type: Number,
      min: 1,
      max: 24 * 60,
      default: 60,
    },
    lastRefreshAt: Date,
    lastRefreshStatus: {
      type: String,
      enum: ['success', 'failed'],
    },
    lastError: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    metadata: {
      type: Schema.Types.Mixed,
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

DataSourceSchema.index({ organization: 1, status: 1, isActive: 1, createdAt: -1 });
DataSourceSchema.index({ createdBy: 1, status: 1, createdAt: -1 });
DataSourceSchema.index({ organization: 1, name: 1, isActive: 1 }, { unique: true, sparse: true });

export default mongoose.model<IDataSource>('MarketDataSource', DataSourceSchema);
