declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        authType?: 'jwt' | 'api_token';
        farmerId?: string;
        permissions?: string[];
        deviceId?: string;
        tokenId?: string;
        tokenType?: 'personal' | 'organization' | 'super_admin';
        tokenScopes?: string[];
        orgId?: string;
        apiTokenRateLimit?: {
          requestsPerMinute: number;
          burst?: number;
        };
        mfaVerified?: boolean;
        superAdminGrantId?: string;
        superAdminScopes?: string[];
        impersonationSessionId?: string;
        impersonatedBy?: string;
        impersonationReason?: string;
        impersonationExpiresAt?: string;
        [key: string]: unknown;
      };
      device?: unknown;
      requestId?: string;
      apiToken?: {
        id: string;
        tokenId: string;
        tokenType?: string;
        tokenPrefix: string;
        scopes: string[];
        orgId?: string;
        rateLimit?: unknown;
      };
      impersonation?: {
        sessionId: string;
        actorId: string;
        reason: string;
        expiresAt?: string;
      };
      superAdminGrant?: {
        grantId: string;
        scopes: string[];
        expiresAt: string;
      };
    }
  }
}

export {};
