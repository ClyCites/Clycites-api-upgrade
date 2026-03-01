declare global {
  namespace Express {
    interface Request {
      user?: {
        id?: string;
        email?: string;
        role?: string;
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