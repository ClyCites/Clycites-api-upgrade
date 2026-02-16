import mongoose, { Document, Schema } from 'mongoose';

export interface ISecurityEvent extends Document {
  user?: mongoose.Types.ObjectId;
  organization?: mongoose.Types.ObjectId;
  
  // Event classification
  type: 'auth' | 'access' | 'data' | 'system' | 'compliance';
  category: string; // e.g., 'login_failed', 'permission_denied', 'data_export'
  severity: 'info' | 'warning' | 'error' | 'critical';
  
  // Event details
  title: string;
  description: string;
  
  // Context
  context: {
    ipAddress: string;
    userAgent: string;
    deviceId?: string;
    location?: {
      country?: string;
      city?: string;
    };
    endpoint?: string;
    method?: string;
  };
  
  // Risk assessment
  riskScore: number; // 0-100
  isSuspicious: boolean;
  isBlocked: boolean;
  
  // Response
  actionTaken?: string;
  responseStatus: 'open' | 'investigating' | 'resolved' | 'false_positive';
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  resolution?: string;
  
  // Notification
  notificationSent: boolean;
  notifiedAt?: Date;
  
  timestamp: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const SecurityEventSchema = new Schema<ISecurityEvent>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    type: {
      type: String,
      enum: ['auth', 'access', 'data', 'system', 'compliance'],
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'error', 'critical'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    context: {
      ipAddress: String,
      userAgent: String,
      deviceId: String,
      location: {
        country: String,
        city: String,
      },
      endpoint: String,
      method: String,
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    isSuspicious: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    actionTaken: String,
    responseStatus: {
      type: String,
      enum: ['open', 'investigating', 'resolved', 'false_positive'],
      default: 'open',
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: Date,
    resolution: String,
    notificationSent: {
      type: Boolean,
      default: false,
    },
    notifiedAt: Date,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
SecurityEventSchema.index({ timestamp: -1 });
SecurityEventSchema.index({ user: 1, timestamp: -1 });
SecurityEventSchema.index({ organization: 1, timestamp: -1 });
SecurityEventSchema.index({ type: 1, category: 1 });
SecurityEventSchema.index({ severity: 1 });
SecurityEventSchema.index({ isSuspicious: 1 });
SecurityEventSchema.index({ responseStatus: 1 });

export default mongoose.model<ISecurityEvent>('SecurityEvent', SecurityEventSchema);
