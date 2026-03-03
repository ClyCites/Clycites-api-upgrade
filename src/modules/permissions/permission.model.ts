import mongoose, { Document, Schema } from 'mongoose';

export interface IPermission extends Document {
  resource: string; // e.g., 'users', 'products', 'orders'
  action: string; // e.g., 'create', 'read', 'update', 'delete'
  scope: 'global' | 'organization' | 'own'; // Scope of permission
  status: 'active' | 'deprecated';
  
  name: string; // Full permission name: resource:action:scope (e.g., users:create:organization)
  description: string;
  category: string; // e.g., 'users', 'marketplace', 'analytics'
  
  isSystem: boolean; // System permissions cannot be deleted
  
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema = new Schema<IPermission>(
  {
    resource: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    scope: {
      type: String,
      enum: ['global', 'organization', 'own'],
      required: true,
    },
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'deprecated'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
PermissionSchema.index({ name: 1 }, { unique: true });
PermissionSchema.index({ resource: 1, action: 1, scope: 1 });
PermissionSchema.index({ category: 1 });
PermissionSchema.index({ isSystem: 1 });
PermissionSchema.index({ status: 1 });

// Pre-save hook to generate permission name
PermissionSchema.pre('save', function (next) {
  if (!this.name) {
    this.name = `${this.resource}:${this.action}:${this.scope}`;
  }
  next();
});

export default mongoose.model<IPermission>('Permission', PermissionSchema);
