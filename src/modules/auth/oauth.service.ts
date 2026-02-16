import OAuthProvider from './oauthProvider.model';
import LinkedAccount from './linkedAccount.model';
import User from '../users/user.model';
import PersonalWorkspaceService from '../users/personalWorkspace.service';
import { AuditService } from '../audit';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../../common/errors/AppError';

/**
 * OAuth/SSO Service
 * Foundation for enterprise SSO integrations
 * Supports OIDC, SAML, and custom OAuth2 providers
 */
class OAuthService {
  /**
   * Get authorization URL for OAuth flow
   */
  async getAuthorizationUrl(
    providerId: string,
    state: string,
    organizationId?: string
  ): Promise<string> {
    const provider = await OAuthProvider.findById(providerId);

    if (!provider || !provider.isEnabled) {
      throw new NotFoundError('OAuth provider not found or disabled');
    }

    // Verify organization match if specified
    if (organizationId && provider.organization?.toString() !== organizationId) {
      throw new BadRequestError('Provider does not belong to this organization');
    }

    const { config } = provider;
    let authUrl = config.authorizationUrl;

    // Auto-detect authorization URL for known providers
    if (!authUrl) {
      switch (provider.provider) {
        case 'google':
          authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
          break;
        case 'microsoft':
        case 'azure-ad':
          authUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
          break;
        default:
          throw new BadRequestError('Authorization URL not configured');
      }
    }

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
    });

    return `${authUrl}?${params.toString()}`;
  }

  /**
   * Handle OAuth callback
   * NOTE: This is a foundation - actual OAuth flow requires integration with OAuth2 libraries
   */
  async handleCallback(
    providerId: string,
    code: string,
    _state: string
  ): Promise<{ user: any; tokens: any; isNewUser: boolean }> {
    const provider = await OAuthProvider.findById(providerId);

    if (!provider || !provider.isEnabled) {
      throw new NotFoundError('OAuth provider not found or disabled');
    }

    // TODO: Exchange code for tokens (requires OAuth2 library)
    // This is a placeholder for the actual implementation
    const oauthTokens = await this.exchangeCodeForToken(provider, code);

    // Get user info from provider
    const userInfo = await this.getUserInfo(provider, oauthTokens.access_token);

    // Map OAuth user to ClyCites user
    const email = userInfo[provider.mapping.emailField];
    const firstName = userInfo[provider.mapping.firstNameField] || 'Unknown';
    const lastName = userInfo[provider.mapping.lastNameField] || 'User';

    if (!email) {
      throw new BadRequestError('Email not provided by OAuth provider');
    }

    // Check domain restriction
    if (provider.requiredDomain) {
      const emailDomain = email.split('@')[1];
      if (emailDomain !== provider.requiredDomain) {
        throw new BadRequestError(`Only ${provider.requiredDomain} emails are allowed`);
      }
    }

    // Find or create user
    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      if (!provider.autoProvisioning) {
        throw new BadRequestError('User not found and auto-provisioning is disabled');
      }

      // Create new user
      user = await User.create({
        email,
        firstName,
        lastName,
        password: `oauth_${Date.now()}_${Math.random()}`, // Random password (not used)
        isEmailVerified: true, // Verified by OAuth provider
        role: provider.defaultRole || 'farmer',
      });

      // Create personal workspace
      await PersonalWorkspaceService.create({
        userId: user._id.toString(),
        displayName: `${firstName}'s Workspace`,
      });

      isNewUser = true;
    }

    // Create or update linked account
    await LinkedAccount.findOneAndUpdate(
      {
        provider: provider.provider,
        externalId: userInfo.sub || userInfo.id,
      },
      {
        user: user._id,
        provider: provider.provider,
        externalId: userInfo.sub || userInfo.id,
        externalEmail: email,
        accessToken: oauthTokens.access_token, // TODO: Encrypt
        refreshToken: oauthTokens.refresh_token, // TODO: Encrypt
        tokenExpiresAt: oauthTokens.expires_at
          ? new Date(oauthTokens.expires_at * 1000)
          : undefined,
        profile: {
          email,
          firstName,
          lastName,
          picture: userInfo.picture,
          metadata: userInfo,
        },
        lastUsedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Audit log
    await AuditService.log({
      action: isNewUser ? 'oauth.user_provisioned' : 'oauth.login',
      resource: 'user',
      resourceId: user._id.toString(),
      userId: user._id.toString(),
      details: {
        after: {
          provider: provider.provider,
          email,
        },
      },
    });

    // TODO: Generate ClyCites JWT tokens
    const tokens = {
      accessToken: 'placeholder',
      refreshToken: 'placeholder',
    };

    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tokens,
      isNewUser,
    };
  }

  /**
   * Link OAuth account to existing user
   */
  async linkAccount(
    userId: string,
    providerId: string,
    code: string
  ): Promise<void> {
    const provider = await OAuthProvider.findById(providerId);

    if (!provider || !provider.isEnabled) {
      throw new NotFoundError('OAuth provider not found or disabled');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Exchange code for tokens
    const oauthTokens = await this.exchangeCodeForToken(provider, code);
    const userInfo = await this.getUserInfo(provider, oauthTokens.access_token);

    // Check if account is already linked to another user
    const existing = await LinkedAccount.findOne({
      provider: provider.provider,
      externalId: userInfo.sub || userInfo.id,
    });

    if (existing && existing.user.toString() !== userId) {
      throw new ConflictError('This OAuth account is already linked to another user');
    }

    // Create linked account
    await LinkedAccount.create({
      user: userId,
      provider: provider.provider,
      externalId: userInfo.sub || userInfo.id,
      externalEmail: userInfo.email,
      accessToken: oauthTokens.access_token,
      refreshToken: oauthTokens.refresh_token,
      profile: {
        email: userInfo.email,
        firstName: userInfo.given_name,
        lastName: userInfo.family_name,
        picture: userInfo.picture,
        metadata: userInfo,
      },
    });

    // Audit log
    await AuditService.log({
      action: 'oauth.account_linked',
      resource: 'linked_account',
      userId,
      details: {
        after: {
          provider: provider.provider,
        },
      },
    });
  }

  /**
   * Unlink OAuth account
   */
  async unlinkAccount(userId: string, linkedAccountId: string): Promise<void> {
    const linkedAccount = await LinkedAccount.findOne({
      _id: linkedAccountId,
      user: userId,
    });

    if (!linkedAccount) {
      throw new NotFoundError('Linked account not found');
    }

    await linkedAccount.deleteOne();

    // Audit log
    await AuditService.log({
      action: 'oauth.account_unlinked',
      resource: 'linked_account',
      resourceId: linkedAccountId,
      userId,
      details: {
        before: {
          provider: linkedAccount.provider,
        },
      },
    });
  }

  /**
   * Placeholder: Exchange authorization code for tokens
   * Real implementation requires OAuth2 library like `passport` or `oauth4webapi`
   */
  private async exchangeCodeForToken(
    _provider: any,
    _code: string
  ): Promise<{ access_token: string; refresh_token?: string; expires_at?: number }> {
    // TODO: Implement actual OAuth2 token exchange
    // This is a placeholder
    return {
      access_token: 'placeholder_access_token',
      refresh_token: 'placeholder_refresh_token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
  }

  /**
   * Placeholder: Get user info from OAuth provider
   */
  private async getUserInfo(_provider: any, _accessToken: string): Promise<any> {
    // TODO: Implement actual user info retrieval
    // This is a placeholder
    return {
      sub: 'oauth_user_id',
      email: 'user@example.com',
      given_name: 'John',
      family_name: 'Doe',
      picture: 'https://example.com/avatar.jpg',
    };
  }
}

export default new OAuthService();
