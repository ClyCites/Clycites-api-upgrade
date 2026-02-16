import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  phone?: string;
  password: string;
  firstName: string;
  lastName: string;
  
  // Global role (for platform-level operations)
  role: 'platform_admin' | 'farmer' | 'buyer' | 'expert' | 'trader';
  
  // Organization memberships (handled via OrganizationMember model)
  // Users can be members of multiple organizations with different roles per org
  
  // Verification
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;
  
  // Status & Security
  isActive: boolean;
  isMfaEnabled: boolean;
  passwordChangedAt?: Date;
  passwordResetRequired: boolean;
  
  // Profile
  profileImage?: string;
  bio?: string;
  timezone?: string;
  language?: string;
  
  // Activity tracking
  lastLogin?: Date;
  lastLoginIp?: string;
  lastActiveAt?: Date;
  loginCount: number;
  failedLoginAttempts: number;
  lastFailedLoginAt?: Date;
  lockedUntil?: Date;
  
  // Security flags
  suspiciousActivityDetected: boolean;
  requiresIdentityVerification: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date; // Soft delete
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
      sparse: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['platform_admin', 'farmer', 'buyer', 'expert', 'trader'],
      default: 'farmer',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: Date,
    phoneVerifiedAt: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
    isMfaEnabled: {
      type: Boolean,
      default: false,
    },
    passwordChangedAt: Date,
    passwordResetRequired: {
      type: Boolean,
      default: false,
    },
    profileImage: String,
    bio: String,
    timezone: {
      type: String,
      default: 'UTC',
    },
    language: {
      type: String,
      default: 'en',
    },
    lastLogin: Date,
    lastLoginIp: String,
    lastActiveAt: Date,
    loginCount: {
      type: Number,
      default: 0,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lastFailedLoginAt: Date,
    lockedUntil: Date,
    suspiciousActivityDetected: {
      type: Boolean,
      default: false,
    },
    requiresIdentityVerification: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete (ret as { password?: string }).password;
        return ret;
      },
    },
  }
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ deletedAt: 1 });
UserSchema.index({ lastLogin: -1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Method to check if user is locked
UserSchema.methods.isLocked = function(): boolean {
  return !!(this.lockedUntil && this.lockedUntil > new Date());
};

export default mongoose.model<IUser>('User', UserSchema);

