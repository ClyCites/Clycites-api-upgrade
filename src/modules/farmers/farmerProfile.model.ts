import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

/**
 * Enterprise Farmer Profile Model
 * Supports independent smallholder farmers and organization members
 * Full KYC, verification, and compliance readiness
 */

export interface IFarmerProfile extends Document {
  // Identity & IAM Integration
  userId: mongoose.Types.ObjectId; // Links to IAM User
  farmerCode: string; // Unique farmer identifier (auto-generated)
  
  // Farmer Classification
  farmerType: 'individual' | 'cooperative_member' | 'enterprise_grower' | 'contract_farmer';
  farmingExperience: number; // Years of experience
  
  // Verification & Compliance
  verificationStatus: 'draft' | 'submitted' | 'verified' | 'rejected';
  verificationLevel: 'basic' | 'intermediate' | 'advanced'; // KYC levels
  verificationSubmittedAt?: Date;
  verificationReviewedAt?: Date;
  verificationReason?: string;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId; // Admin/verifier
  verificationNotes?: string;
  rejectionReason?: string;
  
  // Secure KYC Data (Encrypted)
  kycData: {
    nationalIdNumber?: string; // Encrypted
    nationalIdType?: 'national_id' | 'passport' | 'drivers_license' | 'voter_id';
    nationalIdDocument?: string; // Encrypted file reference/URL
    taxIdentificationNumber?: string; // Encrypted
    dateOfBirth?: Date;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
    dependents?: number;
    educationLevel?: 'none' | 'primary' | 'secondary' | 'tertiary' | 'vocational';
  };
  
  // Contact & Location
  contactDetails: {
    primaryPhone: string;
    secondaryPhone?: string;
    whatsapp?: string;
    email?: string;
    preferredContactMethod: 'phone' | 'sms' | 'whatsapp' | 'email';
  };
  
  primaryLocation: {
    country: string;
    region: string;
    district: string;
    subCounty?: string;
    parish?: string;
    village?: string;
    landmark?: string;
    coordinates?: {
      type: 'Point';
      coordinates: [number, number]; // [longitude, latitude]
    };
    accuracy?: number; // GPS accuracy in meters
  };
  
  // Address
  physicalAddress?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country: string;
  };
  
  // Organization & Cooperative Membership
  organizationMembership?: {
    organizationId?: mongoose.Types.ObjectId; // Nullable - can be independent
    role?: 'member' | 'committee_member' | 'treasurer' | 'secretary' | 'chairperson' | 'vice_chairperson' | 'auditor';
    joinedAt?: Date;
    membershipNumber?: string;
    membershipStatus?: 'active' | 'inactive' | 'suspended' | 'terminated';
    exitDate?: Date;
    exitReason?: string;
  };
  
  // Financial Readiness
  financialProfile: {
    hasBankAccount: boolean;
    bankName?: string;
    accountNumber?: string; // Encrypted
    mobileMoney?: {
      provider: 'mtn' | 'airtel' | 'vodafone' | 'orange' | 'mpesa' | 'other';
      number: string; // Encrypted
      accountName?: string;
    }[];
    creditWorthiness?: 'poor' | 'fair' | 'good' | 'excellent';
    previousLoans?: boolean;
    loanDefaultHistory?: boolean;
    annualIncome?: number; // Estimated annual farming income
    otherIncomeSources?: string[];
  };
  
  // Market Participation
  marketReadiness: {
    canSupplyRegularly: boolean;
    preferredMarketChannel: ('direct' | 'cooperative' | 'aggregator' | 'online')[];
    qualityStandards?: ('organic' | 'gap' | 'fairtrade' | 'rainforest_alliance' | 'global_gap')[];
    certifications?: {
      name: string;
      issuedBy: string;
      issuedDate?: Date;
      expiryDate?: Date;
      certificateUrl?: string;
    }[];
    hasStorage: boolean;
    hasTransport: boolean;
    willingToContract: boolean;
  };
  
  // Performance Metrics
  performance: {
    rating: number; // 0-5 stars
    totalSales: number;
    totalOrders: number;
    completedDeliveries: number;
    cancelledOrders: number;
    averageDeliveryTime?: number; // in days
    qualityComplaintRate?: number; // percentage
    repeatCustomerRate?: number; // percentage
  };
  
  // Profile Completeness
  profileCompleteness: number; // 0-100%
  
  // Additional Data
  notes?: string; // Internal admin notes
  tags?: string[]; // For categorization/filtering
  
  // Multi-tenant & Audit
  tenantId?: string; // For SaaS multi-tenancy
  version: number; // For versioning/history
  
  // Soft Delete & Audit Trail
  isActive: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  
  // Methods
  calculateProfileCompleteness(): number;
  decryptSensitiveData(): IFarmerProfile;
  softDelete(deletedBy?: mongoose.Types.ObjectId): Promise<IFarmerProfile>;
}

const FarmerProfileSchema = new Schema<IFarmerProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    farmerCode: {
      type: String,
      unique: true,
      index: true,
    },
    farmerType: {
      type: String,
      enum: ['individual', 'cooperative_member', 'enterprise_grower', 'contract_farmer'],
      default: 'individual',
      index: true,
    },
    farmingExperience: {
      type: Number,
      default: 0,
      min: 0,
    },
    verificationStatus: {
      type: String,
      enum: ['draft', 'submitted', 'verified', 'rejected', 'unverified', 'pending', 'suspended'],
      default: 'draft',
      index: true,
    },
    verificationLevel: {
      type: String,
      enum: ['basic', 'intermediate', 'advanced'],
      default: 'basic',
    },
    verificationSubmittedAt: Date,
    verificationReviewedAt: Date,
    verificationReason: String,
    verifiedAt: Date,
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    verificationNotes: String,
    rejectionReason: String,
    kycData: {
      nationalIdNumber: String, // Will be encrypted
      nationalIdType: {
        type: String,
        enum: ['national_id', 'passport', 'drivers_license', 'voter_id'],
      },
      nationalIdDocument: String,
      taxIdentificationNumber: String,
      dateOfBirth: Date,
      gender: {
        type: String,
        enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      },
      maritalStatus: {
        type: String,
        enum: ['single', 'married', 'divorced', 'widowed'],
      },
      dependents: Number,
      educationLevel: {
        type: String,
        enum: ['none', 'primary', 'secondary', 'tertiary', 'vocational'],
      },
    },
    contactDetails: {
      primaryPhone: {
        type: String,
        required: true,
        index: true,
      },
      secondaryPhone: String,
      whatsapp: String,
      email: String,
      preferredContactMethod: {
        type: String,
        enum: ['phone', 'sms', 'whatsapp', 'email'],
        default: 'phone',
      },
    },
    primaryLocation: {
      country: {
        type: String,
        required: true,
        default: 'Uganda',
      },
      region: {
        type: String,
        required: true,
        index: true,
      },
      district: {
        type: String,
        required: true,
        index: true,
      },
      subCounty: String,
      parish: String,
      village: String,
      landmark: String,
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          index: '2dsphere',
        },
      },
      accuracy: Number,
    },
    physicalAddress: {
      street: String,
      city: String,
      postalCode: String,
      country: String,
    },
    organizationMembership: {
      organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        index: true,
      },
      role: {
        type: String,
        enum: ['member', 'committee_member', 'treasurer', 'secretary', 'chairperson'],
      },
      joinedAt: Date,
      membershipNumber: String,
      membershipStatus: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'terminated'],
      },
      exitDate: Date,
      exitReason: String,
    },
    financialProfile: {
      hasBankAccount: {
        type: Boolean,
        default: false,
      },
      bankName: String,
      accountNumber: String, // Will be encrypted
      mobileMoney: [
        {
          provider: {
            type: String,
            enum: ['mtn', 'airtel', 'vodafone', 'orange', 'mpesa', 'other'],
          },
          number: String, // Will be encrypted
          accountName: String,
        },
      ],
      creditWorthiness: {
        type: String,
        enum: ['poor', 'fair', 'good', 'excellent'],
      },
      previousLoans: Boolean,
      loanDefaultHistory: Boolean,
      annualIncome: Number,
      otherIncomeSources: [String],
    },
    marketReadiness: {
      canSupplyRegularly: {
        type: Boolean,
        default: false,
      },
      preferredMarketChannel: {
        type: [String],
        enum: ['direct', 'cooperative', 'aggregator', 'online'],
        default: ['direct'],
      },
      qualityStandards: {
        type: [String],
        enum: ['organic', 'gap', 'fairtrade', 'rainforest_alliance', 'global_gap'],
      },
      certifications: [
        {
          name: String,
          issuedBy: String,
          issuedDate: Date,
          expiryDate: Date,
          certificateUrl: String,
        },
      ],
      hasStorage: {
        type: Boolean,
        default: false,
      },
      hasTransport: {
        type: Boolean,
        default: false,
      },
      willingToContract: {
        type: Boolean,
        default: true,
      },
    },
    performance: {
      rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      totalSales: {
        type: Number,
        default: 0,
      },
      totalOrders: {
        type: Number,
        default: 0,
      },
      completedDeliveries: {
        type: Number,
        default: 0,
      },
      cancelledOrders: {
        type: Number,
        default: 0,
      },
      averageDeliveryTime: Number,
      qualityComplaintRate: Number,
      repeatCustomerRate: Number,
    },
    profileCompleteness: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    notes: String,
    tags: [String],
    tenantId: {
      type: String,
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    deletedAt: Date,
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
FarmerProfileSchema.index({ userId: 1, isActive: 1 });
FarmerProfileSchema.index({ farmerCode: 1 });
FarmerProfileSchema.index({ verificationStatus: 1, isActive: 1 });
FarmerProfileSchema.index({ 'primaryLocation.region': 1, 'primaryLocation.district': 1 });
FarmerProfileSchema.index({ 'organizationMembership.organizationId': 1 });
FarmerProfileSchema.index({ tenantId: 1, isActive: 1 });
FarmerProfileSchema.index({ createdAt: -1 });

// Geospatial index for location-based queries
FarmerProfileSchema.index({ 'primaryLocation.coordinates': '2dsphere' });

// Text search index
FarmerProfileSchema.index({
  farmerCode: 'text',
  'contactDetails.primaryPhone': 'text',
  'contactDetails.email': 'text',
  'primaryLocation.village': 'text',
});

// Encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

// Encryption utility
function encrypt(text: string): string {
  if (!text) return text;
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Pre-save middleware: Encrypt sensitive data
FarmerProfileSchema.pre('save', function (next) {
  // Encrypt KYC data
  if (this.kycData?.nationalIdNumber && !this.kycData.nationalIdNumber.startsWith('enc_')) {
    this.kycData.nationalIdNumber = 'enc_' + encrypt(this.kycData.nationalIdNumber);
  }
  if (this.kycData?.taxIdentificationNumber && !this.kycData.taxIdentificationNumber.startsWith('enc_')) {
    this.kycData.taxIdentificationNumber = 'enc_' + encrypt(this.kycData.taxIdentificationNumber);
  }
  
  // Encrypt financial data
  if (this.financialProfile?.accountNumber && !this.financialProfile.accountNumber.startsWith('enc_')) {
    this.financialProfile.accountNumber = 'enc_' + encrypt(this.financialProfile.accountNumber);
  }
  
  if (this.financialProfile?.mobileMoney) {
    this.financialProfile.mobileMoney.forEach((mm: { provider: string; number: string; accountName?: string }) => {
      if (mm.number && !mm.number.startsWith('enc_')) {
        mm.number = 'enc_' + encrypt(mm.number);
      }
    });
  }
  
  // Auto-generate farmer code if not present
  if (!this.farmerCode) {
    const region = this.primaryLocation.region.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.farmerCode = `FM-${region}-${timestamp}-${random}`;
  }
  
  // Calculate profile completeness
  this.profileCompleteness = this.calculateProfileCompleteness();
  
  next();
});

// Method: Calculate profile completeness percentage
FarmerProfileSchema.methods.calculateProfileCompleteness = function (): number {
  let score = 0;
  const weights = {
    basicInfo: 20, // userId, farmerType, contact, location
    kycData: 25,
    financialProfile: 20,
    marketReadiness: 20,
    verification: 15,
  };
  
  // Basic info
  if (this.userId && this.farmerType && this.contactDetails?.primaryPhone && this.primaryLocation?.district) {
    score += weights.basicInfo;
  }
  
  // KYC data
  if (this.kycData?.nationalIdNumber && this.kycData?.dateOfBirth) {
    score += weights.kycData;
  }
  
  // Financial profile
  if (this.financialProfile?.hasBankAccount || this.financialProfile?.mobileMoney?.length > 0) {
    score += weights.financialProfile;
  }
  
  // Market readiness
  if (this.marketReadiness?.canSupplyRegularly !== undefined && this.marketReadiness?.willingToContract !== undefined) {
    score += weights.marketReadiness;
  }
  
  // Verification
  if (this.verificationStatus === 'verified') {
    score += weights.verification;
  }
  
  return score;
};

// Method: Decrypt sensitive fields (use carefully, only when needed)
FarmerProfileSchema.methods.decryptSensitiveData = function () {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decrypted: any = this.toObject();
  
  if (decrypted.kycData?.nationalIdNumber?.startsWith('enc_')) {
    decrypted.kycData.nationalIdNumber = decrypt(decrypted.kycData.nationalIdNumber.substring(4));
  }
  if (decrypted.kycData?.taxIdentificationNumber?.startsWith('enc_')) {
    decrypted.kycData.taxIdentificationNumber = decrypt(decrypted.kycData.taxIdentificationNumber.substring(4));
  }
  if (decrypted.financialProfile?.accountNumber?.startsWith('enc_')) {
    decrypted.financialProfile.accountNumber = decrypt(decrypted.financialProfile.accountNumber.substring(4));
  }
  if (decrypted.financialProfile?.mobileMoney) {
    decrypted.financialProfile.mobileMoney.forEach((mm: { provider: string; number: string; accountName?: string }) => {
      if (mm.number?.startsWith('enc_')) {
        mm.number = decrypt(mm.number.substring(4));
      }
    });
  }
  
  return decrypted;
};

// Soft delete method
FarmerProfileSchema.methods.softDelete = async function (deletedBy?: mongoose.Types.ObjectId) {
  this.isActive = false;
  this.deletedAt = new Date();
  if (deletedBy) this.deletedBy = deletedBy;
  return await this.save();
};

export default mongoose.model<IFarmerProfile>('FarmerProfile', FarmerProfileSchema);
