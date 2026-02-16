import mongoose, { Document, Schema } from 'mongoose';

export interface IMFASecret extends Document {
  user: mongoose.Types.ObjectId;
  
  // TOTP (Authenticator app)
  totpSecret?: string;
  totpEnabled: boolean;
  totpVerifiedAt?: Date;
  backupCodes: string[]; // Hashed backup codes
  
  // Email OTP
  emailOtpEnabled: boolean;
  
  // SMS OTP (future)
  smsOtpEnabled: boolean;
  phone?: string;
  phoneVerified: boolean;
  
  // Recovery
  recoveryEmail?: string;
  recoveryEmailVerified: boolean;
  
  // Status
  isActive: boolean;
  
  // Device bypass (for trusted devices)
  trustedDevices: mongoose.Types.ObjectId[]; // Reference to Device model
  
  createdAt: Date;
  updatedAt: Date;
}

const MFASecretSchema = new Schema<IMFASecret>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    totpSecret: {
      type: String,
      select: false, // Don't include in queries by default
    },
    totpEnabled: {
      type: Boolean,
      default: false,
    },
    totpVerifiedAt: Date,
    backupCodes: {
      type: [String],
      default: [],
      select: false,
    },
    emailOtpEnabled: {
      type: Boolean,
      default: false,
    },
    smsOtpEnabled: {
      type: Boolean,
      default: false,
    },
    phone: String,
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    recoveryEmail: String,
    recoveryEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    trustedDevices: [{
      type: Schema.Types.ObjectId,
      ref: 'Device',
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes
MFASecretSchema.index({ user: 1 }, { unique: true });
MFASecretSchema.index({ isActive: 1 });

export default mongoose.model<IMFASecret>('MFASecret', MFASecretSchema);
