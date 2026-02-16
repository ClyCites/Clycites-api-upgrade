import mongoose, { Document, Schema } from 'mongoose';

/**
 * Resource Policy for fine-grained access control
 * Supports both organization and personal resources
 */
export interface IResourcePolicy extends Document {
  // Resource identification
  resourceType: string; // e.g., 'product', 'order', 'price_alert'
  resourceId: mongoose.Types.ObjectId;
  
  // Owner context
  ownerType: 'user' | 'organization';
  ownerId: mongoose.Types.ObjectId; // User ID or Organization ID
  
  // Access control
  visibility: 'private' | 'organization' | 'public' | 'restricted';
  
  // Specific grants
  grants: {
    // User or role that has access
    principal: mongoose.Types.ObjectId;
    principalType: 'user' | 'role' | 'organization';
    
    // Permissions granted
    permissions: string[]; // e.g., ['read', 'write', 'delete', 'share']
    
    // Conditions
    conditions?: {
      timeRestriction?: {
        validFrom?: Date;
        validUntil?: Date;
      };
      ipRestriction?: string[]; // Allowed IP addresses
      contextRestrictions?: Record<string, any>;
    };
    
    grantedBy: mongoose.Types.ObjectId;
    grantedAt: Date;
    expiresAt?: Date;
  }[];
  
  // Denials (explicit deny overrides allow)
  denials: {
    principal: mongoose.Types.ObjectId;
    principalType: 'user' | 'role' | 'organization';
    permissions: string[];
    deniedBy: mongoose.Types.ObjectId;
    deniedAt: Date;
    reason?: string;
  }[];
  
  // Inheritance
  inheritsFrom?: mongoose.Types.ObjectId; // Parent policy
  
  // Metadata
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ResourcePolicySchema = new Schema<IResourcePolicy>(
  {
    resourceType: {
      type: String,
      required: true,
      index: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    ownerType: {
      type: String,
      enum: ['user', 'organization'],
      required: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    visibility: {
      type: String,
      enum: ['private', 'organization', 'public', 'restricted'],
      default: 'private',
    },
    grants: [
      {
        principal: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        principalType: {
          type: String,
          enum: ['user', 'role', 'organization'],
          required: true,
        },
        permissions: {
          type: [String],
          required: true,
        },
        conditions: {
          timeRestriction: {
            validFrom: Date,
            validUntil: Date,
          },
          ipRestriction: [String],
          contextRestrictions: Schema.Types.Mixed,
        },
        grantedBy: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        grantedAt: {
          type: Date,
          default: Date.now,
        },
        expiresAt: Date,
      },
    ],
    denials: [
      {
        principal: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        principalType: {
          type: String,
          enum: ['user', 'role', 'organization'],
          required: true,
        },
        permissions: {
          type: [String],
          required: true,
        },
        deniedBy: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        deniedAt: {
          type: Date,
          default: Date.now,
        },
        reason: String,
      },
    ],
    inheritsFrom: {
      type: Schema.Types.ObjectId,
      ref: 'ResourcePolicy',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
ResourcePolicySchema.index({ resourceType: 1, resourceId: 1 });
ResourcePolicySchema.index({ ownerType: 1, ownerId: 1 });
ResourcePolicySchema.index({ 'grants.principal': 1 });
ResourcePolicySchema.index({ visibility: 1 });

export default mongoose.model<IResourcePolicy>('ResourcePolicy', ResourcePolicySchema);
