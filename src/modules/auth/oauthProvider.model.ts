import mongoose, { Document, Schema } from 'mongoose';

/**
 * OAuth Provider Configuration
 * Supports enterprise SSO integrations (Google, Microsoft, SAML, etc.)
 */
export interface IOAuthProvider extends Document {
  // Organization context (if org-specific)
  organization?: mongoose.Types.ObjectId;
  
  // Provider details
  provider: 'google' | 'microsoft' | 'azure-ad' | 'okta' | 'auth0' | 'saml' | 'oidc' | 'custom';
  displayName: string;
  
  // Configuration
  config: {
    clientId: string;
    clientSecret?: string; // Encrypted
    redirectUri: string;
    scopes: string[];
    
    // SAML-specific
    samlEntryPoint?: string;
    samlIssuer?: string;
    samlCert?: string;
    
    // OIDC-specific
    oidcDiscoveryUrl?: string;
    
    // Custom OAuth2
    authorizationUrl?: string;
    tokenUrl?: string;
    userInfoUrl?: string;
  };
  
  // Mapping configuration (map OAuth user to ClyCites user)
  mapping: {
    emailField: string; // default: 'email'
    firstNameField: string; // default: 'given_name'
    lastNameField: string; // default: 'family_name'
    customMappings?: Record<string, string>;
  };
  
  // Provisioning
  autoProvisioning: boolean; // Auto-create users on first login
  defaultRole?: string; // Default role for auto-provisioned users
  requiredDomain?: string; // Only allow users from specific domain
  
  // Status
  isEnabled: boolean;
  
  // Metadata
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OAuthProviderSchema = new Schema<IOAuthProvider>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    provider: {
      type: String,
      enum: ['google', 'microsoft', 'azure-ad', 'okta', 'auth0', 'saml', 'oidc', 'custom'],
      required: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    config: {
      clientId: {
        type: String,
        required: true,
      },
      clientSecret: String, // Should be encrypted
      redirectUri: {
        type: String,
        required: true,
      },
      scopes: {
        type: [String],
        default: ['openid', 'email', 'profile'],
      },
      samlEntryPoint: String,
      samlIssuer: String,
      samlCert: String,
      oidcDiscoveryUrl: String,
      authorizationUrl: String,
      tokenUrl: String,
      userInfoUrl: String,
    },
    mapping: {
      emailField: {
        type: String,
        default: 'email',
      },
      firstNameField: {
        type: String,
        default: 'given_name',
      },
      lastNameField: {
        type: String,
        default: 'family_name',
      },
      customMappings: Schema.Types.Mixed,
    },
    autoProvisioning: {
      type: Boolean,
      default: false,
    },
    defaultRole: String,
    requiredDomain: String,
    isEnabled: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
OAuthProviderSchema.index({ organization: 1, provider: 1 });
OAuthProviderSchema.index({ isEnabled: 1 });

export default mongoose.model<IOAuthProvider>('OAuthProvider', OAuthProviderSchema);
