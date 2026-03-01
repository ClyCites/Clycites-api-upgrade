import mongoose, { Document, Schema } from 'mongoose';

export interface IImpersonationSession extends Document {
  sessionId: string;
  actorUser: mongoose.Types.ObjectId;
  targetUser: mongoose.Types.ObjectId;
  reason: string;
  scopes: string[];
  startedAt: Date;
  expiresAt: Date;
  isActive: boolean;
  revokedAt?: Date;
  revokedBy?: mongoose.Types.ObjectId;
  revokeReason?: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ImpersonationSessionSchema = new Schema<IImpersonationSession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    actorUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 1000,
    },
    scopes: {
      type: [String],
      default: [],
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    revokedAt: Date,
    revokedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    revokeReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    metadata: {
      ipAddress: String,
      userAgent: String,
    },
  },
  {
    timestamps: true,
  }
);

ImpersonationSessionSchema.index({ actorUser: 1, isActive: 1, createdAt: -1 });
ImpersonationSessionSchema.index({ targetUser: 1, isActive: 1, createdAt: -1 });
ImpersonationSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IImpersonationSession>(
  'ImpersonationSession',
  ImpersonationSessionSchema
);

