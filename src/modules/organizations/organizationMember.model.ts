import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganizationMember extends Document {
  organization: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  role: mongoose.Types.ObjectId; // Reference to Role model
  
  // Status
  status: 'active' | 'invited' | 'suspended' | 'removed';
  
  // Invitation
  invitedBy?: mongoose.Types.ObjectId;
  invitedAt?: Date;
  invitationToken?: string;
  invitationExpiresAt?: Date;
  
  // Access
  joinedAt?: Date;
  lastAccessAt?: Date;
  
  // Permissions override (for granular control beyond role)
  customPermissions: {
    granted: string[];
    revoked: string[];
  };
  
  // Department & metadata
  department?: string;
  title?: string;
  notes?: string;
  
  // Suspension
  suspendedBy?: mongoose.Types.ObjectId;
  suspendedAt?: Date;
  suspensionReason?: string;
  
  // Removal
  removedBy?: mongoose.Types.ObjectId;
  removedAt?: Date;
  removalReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationMemberSchema = new Schema<IOrganizationMember>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
    },
    
    status: {
      type: String,
      enum: ['active', 'invited', 'suspended', 'removed'],
      default: 'invited',
    },
    
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    invitedAt: Date,
    invitationToken: String,
    invitationExpiresAt: Date,
    
    joinedAt: Date,
    lastAccessAt: Date,
    
    customPermissions: {
      granted: {
        type: [String],
        default: [],
      },
      revoked: {
        type: [String],
        default: [],
      },
    },
    
    department: String,
    title: String,
    notes: String,
    
    suspendedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    suspendedAt: Date,
    suspensionReason: String,
    
    removedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    removedAt: Date,
    removalReason: String,
  },
  {
    timestamps: true,
  }
);

// Indexes for multi-tenant data isolation and performance
OrganizationMemberSchema.index({ organization: 1, user: 1 }, { unique: true });
OrganizationMemberSchema.index({ organization: 1, status: 1 });
OrganizationMemberSchema.index({ user: 1, status: 1 });
OrganizationMemberSchema.index({ invitationToken: 1 });
OrganizationMemberSchema.index({ role: 1 });

// TTL index for expired invitations
OrganizationMemberSchema.index(
  { invitationExpiresAt: 1 },
  { 
    expireAfterSeconds: 0,
    partialFilterExpression: { status: 'invited' }
  }
);

export default mongoose.model<IOrganizationMember>('OrganizationMember', OrganizationMemberSchema);
