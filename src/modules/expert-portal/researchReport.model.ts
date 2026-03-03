import mongoose, { Document, Schema } from 'mongoose';

export type ResearchReportStatus = 'draft' | 'in_review' | 'published' | 'archived';

export interface IResearchReport extends Document {
  organization?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  title: string;
  summary?: string;
  content: string;
  tags: string[];
  relatedCaseId?: mongoose.Types.ObjectId;
  status: ResearchReportStatus;
  submittedAt?: Date;
  publishedAt?: Date;
  archivedAt?: Date;
  publishedBy?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ResearchReportSchema = new Schema<IResearchReport>(
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
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    summary: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    content: {
      type: String,
      required: true,
      maxlength: 20000,
    },
    tags: {
      type: [String],
      default: [],
    },
    relatedCaseId: {
      type: Schema.Types.ObjectId,
      ref: 'ExpertFieldCase',
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'in_review', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    submittedAt: Date,
    publishedAt: Date,
    archivedAt: Date,
    publishedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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

ResearchReportSchema.index({ organization: 1, status: 1, isActive: 1, createdAt: -1 });
ResearchReportSchema.index({ createdBy: 1, status: 1, createdAt: -1 });

export default mongoose.model<IResearchReport>('ExpertResearchReport', ResearchReportSchema);
