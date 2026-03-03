import mongoose, { Document, Schema } from 'mongoose';

export type AnalyticsDatasetStatus = 'active' | 'deprecated';

export interface IAnalyticsDatasetDocument extends Document {
  name: string;
  description?: string;
  ownerId: mongoose.Types.ObjectId;
  orgId?: mongoose.Types.ObjectId;
  sourceDatasetId?: string;
  fields: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'objectId';
    description?: string;
    filterable?: boolean;
    sortable?: boolean;
  }>;
  metadata?: Record<string, unknown>;
  tags: string[];
  status: AnalyticsDatasetStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const datasetFieldSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['string', 'number', 'date', 'boolean', 'objectId'], required: true },
    description: { type: String, trim: true },
    filterable: { type: Boolean, default: true },
    sortable: { type: Boolean, default: false },
  },
  { _id: false }
);

const analyticsDatasetSchema = new Schema<IAnalyticsDatasetDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    sourceDatasetId: { type: String, trim: true },
    fields: { type: [datasetFieldSchema], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
    tags: { type: [String], default: [] },
    status: { type: String, enum: ['active', 'deprecated'], default: 'active', index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

analyticsDatasetSchema.index({ ownerId: 1, status: 1, isActive: 1, createdAt: -1 });
analyticsDatasetSchema.index({ orgId: 1, status: 1, isActive: 1, createdAt: -1 });

const AnalyticsDataset = mongoose.model<IAnalyticsDatasetDocument>('AnalyticsDataset', analyticsDatasetSchema);

export default AnalyticsDataset;
