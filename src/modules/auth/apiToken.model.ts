import mongoose, { Document, Schema } from 'mongoose';

export type ApiTokenType = 'personal' | 'organization' | 'super_admin';
export type ApiTokenStatus = 'active' | 'revoked' | 'expired';

export interface IApiTokenRateLimit {
  requestsPerMinute: number;
  burst?: number;
}

export interface IApiToken extends Document {
  tokenId: string;
  tokenType: ApiTokenType;
  name: string;
  description?: string;
  tokenPrefix: string;
  tokenHash: string;
  createdBy: mongoose.Types.ObjectId;
  organization?: mongoose.Types.ObjectId;
  scopes: string[];
  rateLimit: IApiTokenRateLimit;
  status: ApiTokenStatus;
  expiresAt?: Date;
  lastUsedAt?: Date;
  lastUsedIp?: string;
  allowedIps: string[];
  revokedAt?: Date;
  revokedBy?: mongoose.Types.ObjectId;
  revokeReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApiTokenRateLimitSchema = new Schema<IApiTokenRateLimit>(
  {
    requestsPerMinute: {
      type: Number,
      required: true,
      min: 1,
      max: 5000,
      default: 120,
    },
    burst: {
      type: Number,
      min: 1,
      max: 10000,
    },
  },
  { _id: false }
);

const ApiTokenSchema = new Schema<IApiToken>(
  {
    tokenId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    tokenType: {
      type: String,
      enum: ['personal', 'organization', 'super_admin'],
      default: 'personal',
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    tokenPrefix: {
      type: String,
      required: true,
      trim: true,
      maxlength: 32,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      select: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    scopes: {
      type: [String],
      default: [],
      index: true,
    },
    rateLimit: {
      type: ApiTokenRateLimitSchema,
      default: () => ({ requestsPerMinute: 120 }),
    },
    status: {
      type: String,
      enum: ['active', 'revoked', 'expired'],
      default: 'active',
      index: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    lastUsedAt: Date,
    lastUsedIp: String,
    allowedIps: {
      type: [String],
      default: [],
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

ApiTokenSchema.index({ createdBy: 1, status: 1, createdAt: -1 });
ApiTokenSchema.index({ organization: 1, status: 1, createdAt: -1 });
ApiTokenSchema.index({ tokenPrefix: 1, status: 1 });
ApiTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { status: 'expired' } });

export default mongoose.model<IApiToken>('ApiToken', ApiTokenSchema);
