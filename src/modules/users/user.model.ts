import mongoose, { Document, Schema } from 'mongoose';

export type UserRole =
  | 'super_admin'
  | 'platform_admin'
  | 'admin'
  | 'farmer'
  | 'buyer'
  | 'expert'
  | 'trader';

export interface IUserAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  district?: string;
  postalCode?: string;
  country?: string;
}

export interface IUserIdentityProfile {
  documentType?:
    | 'national_id'
    | 'passport'
    | 'driver_license'
    | 'voter_card'
    | 'business_registration'
    | 'other';
  documentNumber?: string;
  documentIssuingCountry?: string;
  documentExpiryDate?: Date;
  kycStatus?: 'not_started' | 'pending' | 'verified' | 'rejected' | 'expired';
  kycReference?: string;
  verificationProvider?: string;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
}

export interface IUserProfessionalProfile {
  company?: string;
  jobTitle?: string;
  department?: string;
  employeeId?: string;
  industry?: string;
  yearsOfExperience?: number;
  skills?: string[];
  certifications?: string[];
  linkedInUrl?: string;
}

export interface IUserSocialProfile {
  website?: string;
  x?: string;
  linkedIn?: string;
  facebook?: string;
  instagram?: string;
}

export interface IUserEmergencyContact {
  name?: string;
  relationship?: string;
  phone?: string;
  email?: string;
}

export interface IUserProfilePreferences {
  preferredContactMethod?: 'email' | 'phone' | 'sms' | 'whatsapp' | 'in_app';
  notifications?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    inApp?: boolean;
    whatsapp?: boolean;
    securityAlerts?: boolean;
  };
  dateFormat?: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY';
  timeFormat?: '12h' | '24h';
  numberFormat?: '1,234.56' | '1.234,56';
  weekStartsOn?: 0 | 1 | 6;
  marketingOptIn?: boolean;
}

export interface IUserComplianceProfile {
  termsAccepted?: boolean;
  termsAcceptedAt?: Date;
  privacyPolicyAccepted?: boolean;
  privacyPolicyAcceptedAt?: Date;
  dataProcessingConsent?: boolean;
  dataProcessingConsentAt?: Date;
  gdprConsent?: boolean;
  gdprConsentAt?: Date;
  lastConsentUpdateAt?: Date;
}

export interface IUserProfile {
  displayName?: string;
  middleName?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'non_binary' | 'other' | 'prefer_not_to_say';
  nationality?: string;
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed' | 'prefer_not_to_say';
  preferredPronouns?: string;
  headline?: string;
  website?: string;
  locale?: string;
  currency?: string;
  address?: IUserAddress;
  billingAddress?: IUserAddress;
  identity?: IUserIdentityProfile;
  professional?: IUserProfessionalProfile;
  social?: IUserSocialProfile;
  emergencyContact?: IUserEmergencyContact;
  preferences?: IUserProfilePreferences;
  compliance?: IUserComplianceProfile;
  tags?: string[];
  customAttributes?: Map<string, string>;
  completionScore?: number;
  lastProfileUpdateAt?: Date;
}

export interface IUser extends Document {
  email: string;
  phone?: string;
  password: string;
  firstName: string;
  lastName: string;
  
  // Global role (for platform-level operations)
  role: UserRole;
  
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
  profile?: IUserProfile;
  
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
  
  // Methods
  isLocked(): boolean;
}

const AddressSchema = new Schema<IUserAddress>(
  {
    line1: { type: String, trim: true, maxlength: 120 },
    line2: { type: String, trim: true, maxlength: 120 },
    city: { type: String, trim: true, maxlength: 80 },
    state: { type: String, trim: true, maxlength: 80 },
    district: { type: String, trim: true, maxlength: 80 },
    postalCode: { type: String, trim: true, maxlength: 20 },
    country: { type: String, trim: true, maxlength: 80 },
  },
  { _id: false }
);

const IdentityProfileSchema = new Schema<IUserIdentityProfile>(
  {
    documentType: {
      type: String,
      enum: ['national_id', 'passport', 'driver_license', 'voter_card', 'business_registration', 'other'],
    },
    documentNumber: { type: String, trim: true, maxlength: 120 },
    documentIssuingCountry: { type: String, trim: true, maxlength: 80 },
    documentExpiryDate: Date,
    kycStatus: {
      type: String,
      enum: ['not_started', 'pending', 'verified', 'rejected', 'expired'],
      default: 'not_started',
    },
    kycReference: { type: String, trim: true, maxlength: 120 },
    verificationProvider: { type: String, trim: true, maxlength: 80 },
    verifiedAt: Date,
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const ProfessionalProfileSchema = new Schema<IUserProfessionalProfile>(
  {
    company: { type: String, trim: true, maxlength: 120 },
    jobTitle: { type: String, trim: true, maxlength: 120 },
    department: { type: String, trim: true, maxlength: 120 },
    employeeId: { type: String, trim: true, maxlength: 80 },
    industry: { type: String, trim: true, maxlength: 80 },
    yearsOfExperience: { type: Number, min: 0, max: 80 },
    skills: [{ type: String, trim: true, maxlength: 80 }],
    certifications: [{ type: String, trim: true, maxlength: 120 }],
    linkedInUrl: { type: String, trim: true, maxlength: 240 },
  },
  { _id: false }
);

const SocialProfileSchema = new Schema<IUserSocialProfile>(
  {
    website: { type: String, trim: true, maxlength: 240 },
    x: { type: String, trim: true, maxlength: 240 },
    linkedIn: { type: String, trim: true, maxlength: 240 },
    facebook: { type: String, trim: true, maxlength: 240 },
    instagram: { type: String, trim: true, maxlength: 240 },
  },
  { _id: false }
);

const EmergencyContactSchema = new Schema<IUserEmergencyContact>(
  {
    name: { type: String, trim: true, maxlength: 120 },
    relationship: { type: String, trim: true, maxlength: 80 },
    phone: { type: String, trim: true, maxlength: 30 },
    email: { type: String, trim: true, lowercase: true, maxlength: 120 },
  },
  { _id: false }
);

const ProfilePreferencesSchema = new Schema<IUserProfilePreferences>(
  {
    preferredContactMethod: {
      type: String,
      enum: ['email', 'phone', 'sms', 'whatsapp', 'in_app'],
      default: 'email',
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false },
      securityAlerts: { type: Boolean, default: true },
    },
    dateFormat: {
      type: String,
      enum: ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'],
      default: 'YYYY-MM-DD',
    },
    timeFormat: {
      type: String,
      enum: ['12h', '24h'],
      default: '24h',
    },
    numberFormat: {
      type: String,
      enum: ['1,234.56', '1.234,56'],
      default: '1,234.56',
    },
    weekStartsOn: {
      type: Number,
      enum: [0, 1, 6],
      default: 1,
    },
    marketingOptIn: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const ComplianceProfileSchema = new Schema<IUserComplianceProfile>(
  {
    termsAccepted: { type: Boolean, default: false },
    termsAcceptedAt: Date,
    privacyPolicyAccepted: { type: Boolean, default: false },
    privacyPolicyAcceptedAt: Date,
    dataProcessingConsent: { type: Boolean, default: false },
    dataProcessingConsentAt: Date,
    gdprConsent: { type: Boolean, default: false },
    gdprConsentAt: Date,
    lastConsentUpdateAt: Date,
  },
  { _id: false }
);

const UserProfileSchema = new Schema<IUserProfile>(
  {
    displayName: { type: String, trim: true, maxlength: 120 },
    middleName: { type: String, trim: true, maxlength: 80 },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'non_binary', 'other', 'prefer_not_to_say'],
    },
    nationality: { type: String, trim: true, maxlength: 80 },
    maritalStatus: {
      type: String,
      enum: ['single', 'married', 'divorced', 'widowed', 'prefer_not_to_say'],
    },
    preferredPronouns: { type: String, trim: true, maxlength: 40 },
    headline: { type: String, trim: true, maxlength: 180 },
    website: { type: String, trim: true, maxlength: 240 },
    locale: { type: String, trim: true, maxlength: 12, default: 'en-US' },
    currency: { type: String, trim: true, uppercase: true, maxlength: 3, default: 'USD' },
    address: AddressSchema,
    billingAddress: AddressSchema,
    identity: IdentityProfileSchema,
    professional: ProfessionalProfileSchema,
    social: SocialProfileSchema,
    emergencyContact: EmergencyContactSchema,
    preferences: {
      type: ProfilePreferencesSchema,
      default: () => ({}),
    },
    compliance: {
      type: ComplianceProfileSchema,
      default: () => ({}),
    },
    tags: {
      type: [String],
      default: [],
    },
    customAttributes: {
      type: Map,
      of: String,
    },
    completionScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    lastProfileUpdateAt: Date,
  },
  { _id: false }
);

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
      enum: ['super_admin', 'platform_admin', 'admin', 'farmer', 'buyer', 'expert', 'trader'],
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
    profile: {
      type: UserProfileSchema,
      default: undefined,
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
UserSchema.index({ 'profile.identity.kycStatus': 1 });
UserSchema.index({ 'profile.address.country': 1 });
UserSchema.index({ 'profile.professional.company': 1 });
UserSchema.index({ 'profile.completionScore': -1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Method to check if user is locked
UserSchema.methods.isLocked = function(): boolean {
  return !!(this.lockedUntil && this.lockedUntil > new Date());
};

export default mongoose.model<IUser>('User', UserSchema);

