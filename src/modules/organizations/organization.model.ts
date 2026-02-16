import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  slug: string;
  type: 'enterprise' | 'cooperative' | 'government' | 'individual';
  industry: string;
  description?: string;
  logo?: string;
  website?: string;
  email: string;
  phone?: string;
  
  // Address
  address: {
    street?: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
  };
  
  // Registration & Compliance
  registrationNumber?: string;
  taxId?: string;
  licenseNumber?: string;
  
  // Configuration
  settings: {
    // Security
    security: {
      mfaRequired: boolean;
      passwordExpiryDays?: number;
      sessionTimeoutMinutes: number;
      ipWhitelist: string[];
      allowedDevices?: number;
    };
    
    // Access Control
    accessControl: {
      allowPublicSignup: boolean;
      requireEmailVerification: boolean;
      requireAdminApproval: boolean;
      defaultRole?: string;
    };
    
    // Features
    features: {
      marketplace: boolean;
      analytics: boolean;
      apiAccess: boolean;
      customBranding: boolean;
    };
    
    // Billing
    billing: {
      plan: 'free' | 'starter' | 'professional' | 'enterprise' | 'government';
      maxUsers: number;
      maxStorage: number; // in GB
      billingEmail?: string;
    };
  };
  
  // Metadata
  owner: mongoose.Types.ObjectId; // User who created the org
  status: 'active' | 'suspended' | 'pending' | 'archived';
  isVerified: boolean;
  verifiedAt?: Date;
  
  // Stats
  stats: {
    memberCount: number;
    adminCount: number;
    lastActivityAt?: Date;
  };
  
  // Dates
  createdAt: Date;
  updatedAt: Date;
  suspendedAt?: Date;
  archivedAt?: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: [200, 'Organization name cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    },
    type: {
      type: String,
      enum: ['enterprise', 'cooperative', 'government', 'individual'],
      required: true,
    },
    industry: {
      type: String,
      required: [true, 'Industry is required'],
      trim: true,
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    logo: String,
    website: String,
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    phone: String,
    
    address: {
      street: String,
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
      },
      postalCode: String,
    },
    
    registrationNumber: String,
    taxId: String,
    licenseNumber: String,
    
    settings: {
      security: {
        mfaRequired: {
          type: Boolean,
          default: false,
        },
        passwordExpiryDays: Number,
        sessionTimeoutMinutes: {
          type: Number,
          default: 480, // 8 hours
        },
        ipWhitelist: {
          type: [String],
          default: [],
        },
        allowedDevices: Number,
      },
      
      accessControl: {
        allowPublicSignup: {
          type: Boolean,
          default: false,
        },
        requireEmailVerification: {
          type: Boolean,
          default: true,
        },
        requireAdminApproval: {
          type: Boolean,
          default: false,
        },
        defaultRole: String,
      },
      
      features: {
        marketplace: {
          type: Boolean,
          default: true,
        },
        analytics: {
          type: Boolean,
          default: false,
        },
        apiAccess: {
          type: Boolean,
          default: false,
        },
        customBranding: {
          type: Boolean,
          default: false,
        },
      },
      
      billing: {
        plan: {
          type: String,
          enum: ['free', 'starter', 'professional', 'enterprise', 'government'],
          default: 'free',
        },
        maxUsers: {
          type: Number,
          default: 10,
        },
        maxStorage: {
          type: Number,
          default: 5, // 5GB
        },
        billingEmail: String,
      },
    },
    
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending', 'archived'],
      default: 'pending',
    },
    
    isVerified: {
      type: Boolean,
      default: false,
    },
    
    verifiedAt: Date,
    
    stats: {
      memberCount: {
        type: Number,
        default: 0,
      },
      adminCount: {
        type: Number,
        default: 0,
      },
      lastActivityAt: Date,
    },
    
    suspendedAt: Date,
    archivedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes for performance and data isolation
OrganizationSchema.index({ slug: 1 }, { unique: true });
OrganizationSchema.index({ owner: 1 });
OrganizationSchema.index({ status: 1 });
OrganizationSchema.index({ 'settings.billing.plan': 1 });
OrganizationSchema.index({ createdAt: -1 });

// Compound index for searching
OrganizationSchema.index({ name: 'text', description: 'text' });

export default mongoose.model<IOrganization>('Organization', OrganizationSchema);
