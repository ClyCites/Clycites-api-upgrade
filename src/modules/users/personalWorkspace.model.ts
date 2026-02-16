import mongoose, { Document, Schema } from 'mongoose';

/**
 * Personal Workspace for individual users (farmers, personal accounts)
 * Provides data isolation and personal resource management
 * separate from organizational resources
 */
export interface IPersonalWorkspace extends Document {
  user: mongoose.Types.ObjectId;
  
  // Workspace configuration
  displayName: string;
  description?: string;
  
  // Personal permissions & features
  features: {
    marketplace: boolean; // Can access marketplace
    analytics: boolean; // Can view personal analytics
    priceAlerts: boolean; // Can set price alerts
    collaborations: boolean; // Can collaborate with others
  };
  
  // Storage & limits
  limits: {
    maxProducts: number; // Max products user can create
    maxOrders: number; // Max active orders
    maxStorageGB: number; // Storage limit
    maxApiCalls: number; // API rate limit
  };
  
  // Usage tracking
  usage: {
    productsCount: number;
    ordersCount: number;
    storageUsedGB: number;
    apiCallsThisMonth: number;
  };
  
  // Personal settings
  settings: {
    privacy: {
      profileVisibility: 'public' | 'private' | 'connections';
      showActivity: boolean;
      allowMessages: boolean;
    };
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
  
  // Migration tracking
  canUpgradeToOrganization: boolean;
  hasCreatedOrganization: boolean;
  primaryOrganization?: mongoose.Types.ObjectId;
  
  // Status
  status: 'active' | 'suspended' | 'archived';
  suspendedAt?: Date;
  suspensionReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const PersonalWorkspaceSchema = new Schema<IPersonalWorkspace>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    features: {
      marketplace: {
        type: Boolean,
        default: true,
      },
      analytics: {
        type: Boolean,
        default: true,
      },
      priceAlerts: {
        type: Boolean,
        default: true,
      },
      collaborations: {
        type: Boolean,
        default: false,
      },
    },
    limits: {
      maxProducts: {
        type: Number,
        default: 50,
      },
      maxOrders: {
        type: Number,
        default: 100,
      },
      maxStorageGB: {
        type: Number,
        default: 5,
      },
      maxApiCalls: {
        type: Number,
        default: 1000,
      },
    },
    usage: {
      productsCount: {
        type: Number,
        default: 0,
      },
      ordersCount: {
        type: Number,
        default: 0,
      },
      storageUsedGB: {
        type: Number,
        default: 0,
      },
      apiCallsThisMonth: {
        type: Number,
        default: 0,
      },
    },
    settings: {
      privacy: {
        profileVisibility: {
          type: String,
          enum: ['public', 'private', 'connections'],
          default: 'public',
        },
        showActivity: {
          type: Boolean,
          default: true,
        },
        allowMessages: {
          type: Boolean,
          default: true,
        },
      },
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        sms: {
          type: Boolean,
          default: false,
        },
        push: {
          type: Boolean,
          default: true,
        },
      },
    },
    canUpgradeToOrganization: {
      type: Boolean,
      default: true,
    },
    hasCreatedOrganization: {
      type: Boolean,
      default: false,
    },
    primaryOrganization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'archived'],
      default: 'active',
    },
    suspendedAt: Date,
    suspensionReason: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
PersonalWorkspaceSchema.index({ user: 1 }, { unique: true });
PersonalWorkspaceSchema.index({ status: 1 });
PersonalWorkspaceSchema.index({ primaryOrganization: 1 });

export default mongoose.model<IPersonalWorkspace>('PersonalWorkspace', PersonalWorkspaceSchema);
