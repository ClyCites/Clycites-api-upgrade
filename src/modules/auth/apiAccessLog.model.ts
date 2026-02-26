import mongoose, { Document, Schema } from 'mongoose';

export interface IApiAccessLog extends Document {
  token: mongoose.Types.ObjectId;
  tokenId: string;
  tokenPrefix: string;
  actorUser: mongoose.Types.ObjectId;
  organization?: mongoose.Types.ObjectId;
  method: string;
  endpoint: string;
  statusCode: number;
  requestId?: string;
  ipAddress: string;
  userAgent?: string;
  responseTimeMs?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ApiAccessLogSchema = new Schema<IApiAccessLog>(
  {
    token: {
      type: Schema.Types.ObjectId,
      ref: 'ApiToken',
      required: true,
      index: true,
    },
    tokenId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    tokenPrefix: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    actorUser: {
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
    method: {
      type: String,
      required: true,
      trim: true,
      maxlength: 12,
    },
    endpoint: {
      type: String,
      required: true,
      trim: true,
      maxlength: 400,
    },
    statusCode: {
      type: Number,
      required: true,
      min: 100,
      max: 599,
    },
    requestId: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    ipAddress: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 512,
    },
    responseTimeMs: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

ApiAccessLogSchema.index({ token: 1, createdAt: -1 });
ApiAccessLogSchema.index({ tokenId: 1, createdAt: -1 });
ApiAccessLogSchema.index({ actorUser: 1, createdAt: -1 });
ApiAccessLogSchema.index({ organization: 1, createdAt: -1 });
ApiAccessLogSchema.index({ createdAt: -1 });

export default mongoose.model<IApiAccessLog>('ApiAccessLog', ApiAccessLogSchema);
