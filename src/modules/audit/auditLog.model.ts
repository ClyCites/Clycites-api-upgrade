import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  // Who
  user?: mongoose.Types.ObjectId;
  actor: {
    userId?: string;
    email?: string;
    role?: string;
    ipAddress: string;
    userAgent: string;
    sessionId?: string;
  };
  
  // Where (tenant isolation)
  organization?: mongoose.Types.ObjectId;
  
  // What
  action: string; // e.g., 'user.created', 'role.updated', 'auth.login'
  resource: string; // e.g., 'user', 'organization', 'role'
  resourceId?: string; // ID of the affected resource
  
  // How & Why
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint?: string;
  
  // Details
  details: {
    before?: any; // State before action
    after?: any; // State after action
    changes?: any; // Specific changes
    metadata?: any; // Additional context
  };
  
  // Result
  status: 'success' | 'failure' | 'error';
  statusCode?: number;
  errorMessage?: string;
  
  // Security context
  securityContext: {
    risk: 'low' | 'medium' | 'high' | 'critical';
    isSuspicious: boolean;
    flags: string[]; // e.g., ['unusual_location', 'multiple_failed_attempts']
  };
  
  // Performance
  duration?: number; // in milliseconds
  
  // Timestamp
  timestamp: Date;
  
  // Retention
  retentionPeriod?: number; // days to keep this log
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    actor: {
      userId: String,
      email: String,
      role: String,
      ipAddress: {
        type: String,
        required: true,
      },
      userAgent: {
        type: String,
        required: true,
      },
      sessionId: String,
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    resource: {
      type: String,
      required: true,
      index: true,
    },
    resourceId: String,
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      required: true,
    },
    endpoint: String,
    details: {
      before: Schema.Types.Mixed,
      after: Schema.Types.Mixed,
      changes: Schema.Types.Mixed,
      metadata: Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ['success', 'failure', 'error'],
      required: true,
    },
    statusCode: Number,
    errorMessage: String,
    securityContext: {
      risk: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low',
      },
      isSuspicious: {
        type: Boolean,
        default: false,
      },
      flags: {
        type: [String],
        default: [],
      },
    },
    duration: Number,
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    retentionPeriod: {
      type: Number,
      default: 365, // 1 year
    },
  },
  {
    timestamps: false, // Using custom timestamp field
    timeseries: {
      timeField: 'timestamp',
      metaField: 'actor',
      granularity: 'hours',
    },
  }
);

// Indexes for efficient querying and data isolation
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ user: 1, timestamp: -1 });
AuditLogSchema.index({ organization: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1 });
AuditLogSchema.index({ 'actor.ipAddress': 1 });
AuditLogSchema.index({ 'securityContext.isSuspicious': 1 });
AuditLogSchema.index({ 'securityContext.risk': 1 });

// TTL index for automatic cleanup based on retention period
AuditLogSchema.index(
  { timestamp: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { retentionPeriod: { $exists: true } }
  }
);

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
