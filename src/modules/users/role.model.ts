import mongoose, { Document, Schema } from 'mongoose';

export interface IRole extends Document {
  name: string;
  slug: string;
  description: string;
  
  // Permissions
  permissions: mongoose.Types.ObjectId[]; // References to Permission model
  
  // Organization-specific roles
  organization?: mongoose.Types.ObjectId; // If set, this is an org-specific role
  scope: 'global' | 'organization'; // Global = platform-wide, Organization = org-specific
  
  // Role hierarchy and inheritance
  inheritsFrom?: mongoose.Types.ObjectId; // Parent role for permission inheritance
  level: number; // Administrative level: 0 = super admin, 100 = basic user
  
  // Metadata
  isSystem: boolean; // System roles cannot be deleted/modified
  isDefault: boolean; // Default role for new users
  
  // Constraints
  maxMembers?: number; // Maximum users that can have this role
  
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Role description is required'],
    },
    permissions: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Permission' }],
      default: [],
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    scope: {
      type: String,
      enum: ['global', 'organization'],
      default: 'organization',
    },
    inheritsFrom: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
    },
    level: {
      type: Number,
      required: true,
      default: 100,
      min: 0,
      max: 1000,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    maxMembers: Number,
  },
  {
    timestamps: true,
  }
);

// Compound unique index for organization-scoped roles
RoleSchema.index({ slug: 1, organization: 1 }, { unique: true });
RoleSchema.index({ name: 1, organization: 1 });
RoleSchema.index({ scope: 1 });
RoleSchema.index({ isSystem: 1 });
RoleSchema.index({ isDefault: 1 });
RoleSchema.index({ organization: 1 });

export default mongoose.model<IRole>('Role', RoleSchema);
