import mongoose, { Document, Schema } from 'mongoose';

/**
 * Linked Account (OAuth/SSO)
 * Links external OAuth accounts to ClyCites users
 */
export interface ILinkedAccount extends Document {
  user: mongoose.Types.ObjectId;
  provider: string; // e.g., 'google', 'microsoft', 'azure-ad'
  
  // External account details
  externalId: string; // User ID from OAuth provider
  externalEmail: string;
  externalUsername?: string;
  
  // OAuth tokens
  accessToken?: string; // Encrypted
  refreshToken?: string; // Encrypted
  tokenExpiresAt?: Date;
  
  // Profile data from provider
  profile: {
    email: string;
    firstName?: string;
    lastName?: string;
    picture?: string;
    metadata?: Record<string, any>;
  };
  
  // Status
  isActive: boolean;
  isPrimary: boolean; // Primary login method
  
  // Last used
  lastUsedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const LinkedAccountSchema = new Schema<ILinkedAccount>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    provider: {
      type: String,
      required: true,
    },
    externalId: {
      type: String,
      required: true,
    },
    externalEmail: {
      type: String,
      required: true,
    },
    externalUsername: String,
    accessToken: String, // Should be encrypted
    refreshToken: String, // Should be encrypted
    tokenExpiresAt: Date,
    profile: {
      email: String,
      firstName: String,
      lastName: String,
      picture: String,
      metadata: Schema.Types.Mixed,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    lastUsedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Compound unique index for provider + externalId
LinkedAccountSchema.index({ provider: 1, externalId: 1 }, { unique: true });
LinkedAccountSchema.index({ user: 1, provider: 1 });
LinkedAccountSchema.index({ externalEmail: 1 });

export default mongoose.model<ILinkedAccount>('LinkedAccount', LinkedAccountSchema);
