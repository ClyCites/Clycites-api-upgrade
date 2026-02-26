import mongoose, { Document, Schema } from 'mongoose';

export interface ISuperAdminGrant extends Document {
  grantId: string;
  actorUser: mongoose.Types.ObjectId;
  scopes: string[];
  reason: string;
  expiresAt: Date;
  isActive: boolean;
  revokedAt?: Date;
  revokedBy?: mongoose.Types.ObjectId;
  revokeReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SuperAdminGrantSchema = new Schema<ISuperAdminGrant>(
  {
    grantId: {
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
    scopes: {
      type: [String],
      required: true,
      default: [],
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 1000,
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
  },
  {
    timestamps: true,
  }
);

SuperAdminGrantSchema.index({ actorUser: 1, isActive: 1, createdAt: -1 });
SuperAdminGrantSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<ISuperAdminGrant>('SuperAdminGrant', SuperAdminGrantSchema);

