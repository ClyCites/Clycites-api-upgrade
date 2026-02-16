import mongoose, { Document, Schema } from 'mongoose';

export interface IDevice extends Document {
  user: mongoose.Types.ObjectId;
  
  // Device identification
  deviceId: string; // Unique device fingerprint
  name?: string; // User-provided device name
  
  // Device info
  deviceInfo: {
    type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    os: string;
    browser: string;
    userAgent: string;
  };
  
  // Trust & security
  isTrusted: boolean;
  trustLevel: 'verified' | 'recognized' | 'new' | 'suspicious';
  
  // Location tracking
  lastLocation?: {
    ip: string;
    country?: string;
    city?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  
  // Activity
  firstSeenAt: Date;
  lastSeenAt: Date;
  lastActiveAt?: Date;
  loginCount: number;
  failedLoginAttempts: number;
  
  // Status
  status: 'active' | 'blocked' | 'revoked';
  blockedAt?: Date;
  blockedReason?: string;
  
  // MFA
  mfaEnabled: boolean;
  
  // Refresh token (for this device)
  refreshToken?: string;
  refreshTokenExpiresAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema = new Schema<IDevice>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deviceId: {
      type: String,
      required: true,
    },
    name: String,
    deviceInfo: {
      type: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet', 'unknown'],
        default: 'unknown',
      },
      os: String,
      browser: String,
      userAgent: {
        type: String,
        required: true,
      },
    },
    isTrusted: {
      type: Boolean,
      default: false,
    },
    trustLevel: {
      type: String,
      enum: ['verified', 'recognized', 'new', 'suspicious'],
      default: 'new',
    },
    lastLocation: {
      ip: String,
      country: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    firstSeenAt: {
      type: Date,
      default: Date.now,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    lastActiveAt: Date,
    loginCount: {
      type: Number,
      default: 0,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'blocked', 'revoked'],
      default: 'active',
    },
    blockedAt: Date,
    blockedReason: String,
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    refreshToken: String,
    refreshTokenExpiresAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
DeviceSchema.index({ user: 1, deviceId: 1 }, { unique: true });
DeviceSchema.index({ user: 1, status: 1 });
DeviceSchema.index({ deviceId: 1 });
DeviceSchema.index({ refreshToken: 1 });
DeviceSchema.index({ lastSeenAt: -1 });
DeviceSchema.index({ trustLevel: 1 });

export default mongoose.model<IDevice>('Device', DeviceSchema);
