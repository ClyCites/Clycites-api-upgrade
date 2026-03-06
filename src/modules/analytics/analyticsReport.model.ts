import mongoose, { Document, Schema } from 'mongoose';

export type AnalyticsReportStatus = 'generated' | 'exported' | 'archived';

export interface IAnalyticsReportDocument extends Document {
  name: string;
  description?: string;
  ownerId: mongoose.Types.ObjectId;
  orgId?: mongoose.Types.ObjectId;
  chartIds: mongoose.Types.ObjectId[];
  dashboardId?: mongoose.Types.ObjectId;
  datasetId?: string;
  filters?: Record<string, unknown>;
  outputFormat?: 'csv' | 'json';
  status: AnalyticsReportStatus;
  generatedAt?: Date;
  exportedAt?: Date;
  archivedAt?: Date;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const analyticsReportSchema = new Schema<IAnalyticsReportDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    chartIds: [{ type: Schema.Types.ObjectId, ref: 'Chart' }],
    dashboardId: { type: Schema.Types.ObjectId, ref: 'Dashboard' },
    datasetId: { type: String, trim: true },
    filters: { type: Schema.Types.Mixed, default: {} },
    outputFormat: { type: String, enum: ['csv', 'json'] },
    status: { type: String, enum: ['generated', 'exported', 'archived'], default: 'generated', index: true },
    generatedAt: { type: Date, default: Date.now },
    exportedAt: Date,
    archivedAt: Date,
    isActive: { type: Boolean, default: true, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

analyticsReportSchema.index({ ownerId: 1, status: 1, isActive: 1, createdAt: -1 });
analyticsReportSchema.index({ orgId: 1, status: 1, isActive: 1, createdAt: -1 });

const AnalyticsReport = mongoose.model<IAnalyticsReportDocument>('AnalyticsReport', analyticsReportSchema);

export default AnalyticsReport;
