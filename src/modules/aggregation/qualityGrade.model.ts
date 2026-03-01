import mongoose, { Document, Schema } from 'mongoose';

export type QualityGradeStatus = 'draft' | 'verified' | 'final';

export interface IQualityGrade extends Document {
  organization: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  grade: string;
  notes?: string;
  assessedBy?: mongoose.Types.ObjectId;
  assessedAt: Date;
  status: QualityGradeStatus;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  deletedBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  softDelete(deletedBy: mongoose.Types.ObjectId): Promise<IQualityGrade>;
}

const QualityGradeSchema = new Schema<IQualityGrade>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'AggregationBatch',
      required: true,
      index: true,
    },
    grade: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    assessedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    assessedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'verified', 'final'],
      default: 'draft',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
  }
);

QualityGradeSchema.index({ organization: 1, batchId: 1, isActive: 1, createdAt: -1 });
QualityGradeSchema.index({ organization: 1, status: 1, isActive: 1 });

QualityGradeSchema.methods.softDelete = async function (deletedBy: mongoose.Types.ObjectId) {
  this.isActive = false;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

export default mongoose.model<IQualityGrade>('QualityGrade', QualityGradeSchema);
