import mongoose, { Document, Schema } from 'mongoose';

export type FieldCaseStatus = 'created' | 'assigned' | 'in_visit' | 'resolved' | 'closed';
export type FieldCasePriority = 'low' | 'medium' | 'high' | 'critical';

export interface IFieldCase extends Document {
  organization?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  caseNumber: string;
  title: string;
  description: string;
  region?: string;
  cropType?: string;
  source: 'workspace' | 'inquiry' | 'ai_report';
  inquiryId?: mongoose.Types.ObjectId;
  reportId?: mongoose.Types.ObjectId;
  assignedExpertUser?: mongoose.Types.ObjectId;
  assignedBy?: mongoose.Types.ObjectId;
  assignedAt?: Date;
  startedAt?: Date;
  submittedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  status: FieldCaseStatus;
  priority: FieldCasePriority;
  resolution?: string;
  closeReason?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FieldCaseSchema = new Schema<IFieldCase>(
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
    caseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 6000,
    },
    region: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    cropType: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    source: {
      type: String,
      enum: ['workspace', 'inquiry', 'ai_report'],
      default: 'workspace',
      index: true,
    },
    inquiryId: {
      type: Schema.Types.ObjectId,
      ref: 'FarmerInquiry',
      index: true,
    },
    reportId: {
      type: Schema.Types.ObjectId,
      ref: 'PestDiseaseReport',
      index: true,
    },
    assignedExpertUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedAt: Date,
    startedAt: Date,
    submittedAt: Date,
    resolvedAt: Date,
    closedAt: Date,
    status: {
      type: String,
      enum: ['created', 'assigned', 'in_visit', 'resolved', 'closed'],
      default: 'created',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    resolution: {
      type: String,
      trim: true,
      maxlength: 4000,
    },
    closeReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
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

FieldCaseSchema.index({ organization: 1, status: 1, isActive: 1, createdAt: -1 });
FieldCaseSchema.index({ assignedExpertUser: 1, status: 1, createdAt: -1 });
FieldCaseSchema.index({ createdBy: 1, status: 1, createdAt: -1 });

export default mongoose.model<IFieldCase>('ExpertFieldCase', FieldCaseSchema);
