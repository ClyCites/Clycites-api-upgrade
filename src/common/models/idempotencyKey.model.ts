import mongoose, { Document, Schema } from 'mongoose';

export interface IIdempotencyKey extends Document {
  key: string;
  ownerKey: string;
  method: string;
  routeKey: string;
  requestHash: string;
  status: 'processing' | 'completed' | 'failed';
  responseStatus?: number;
  responseBody?: any;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IdempotencyKeySchema = new Schema<IIdempotencyKey>(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    ownerKey: {
      type: String,
      required: true,
      index: true,
    },
    method: {
      type: String,
      required: true,
      index: true,
    },
    routeKey: {
      type: String,
      required: true,
      index: true,
    },
    requestHash: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      default: 'processing',
      index: true,
    },
    responseStatus: Number,
    responseBody: Schema.Types.Mixed,
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

IdempotencyKeySchema.index(
  { key: 1, ownerKey: 1, method: 1, routeKey: 1 },
  { unique: true }
);
IdempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IIdempotencyKey>('IdempotencyKey', IdempotencyKeySchema);

