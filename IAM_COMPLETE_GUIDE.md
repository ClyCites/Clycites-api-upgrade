# ClyCites IAM System - Complete Implementation Guide

## Overview

This document provides a comprehensive guide to the production-grade Identity and Access Management (IAM) system implemented for the ClyCites agricultural platform. The system supports hybrid identity management for both individual users (farmers) and organizations (enterprises, cooperatives, government agencies).

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Hybrid Identity Model](#hybrid-identity-model)
3. [Authentication System](#authentication-system)
4. [Authorization & Permissions](#authorization--permissions)
5. [Security Features](#security-features)
6. [OAuth/SSO Integration](#oauthsso-integration)
7. [API Reference](#api-reference)
8. [Deployment & Operations](#deployment--operations)

---

## Architecture Overview

### Core Components

1. **User Management** (`src/modules/users/`)
   - User model with global roles
   - Personal workspace for individual users
   - Role-based access control (RBAC)

2. **Organization Management** (`src/modules/organizations/`)
   - Multi-tenant organization support
   - Organization member management
   - Organization-scoped roles and permissions

3. **Authentication** (`src/modules/auth/`)
   - Email/password authentication with Argon2id hashing
   - JWT access tokens + refresh token rotation
   - Multi-factor authentication (MFA)
   - OAuth/SSO support

4. **Authorization** (`src/modules/permissions/`)
   - Fine-grained RBAC
   - Policy-based access control (PBAC)
   - Resource-level authorization

5. **Security** (`src/modules/security/`)
   - Device tracking and management
   - Suspicious activity detection
   - Security event logging
   - MFA with TOTP and email OTP

6. **Audit** (`src/modules/audit/`)
   - Comprehensive audit logging
   - Security event tracking
   - Compliance-ready traceability

---

## Hybrid Identity Model

The ClyCites IAM system supports two distinct user types operating seamlessly together:

### Individual Users (Farmers, Personal Accounts)

**Use Case**: Individual farmers or users who want to use ClyCites without belonging to an organization.

**Features:**
- Personal workspace with private data scope
- Ability to create products, orders, and price alerts
- Personal analytics and activity tracking
- Can later create or join organizations
- Independent permission model

**Implementation:**
```typescript
// Personal workspace is automatically created during registration
const user = await AuthService.register({
  email: 'farmer@example.com',
  password: 'SecurePass123!',
  firstName: 'John',
  lastName: 'Doe',
  role: 'farmer', // Default global role
});

// Personal workspace created automatically
const workspace = await PersonalWorkspaceService.getByUserId(user.id);
```

**Default Permissions for Farmers:**
- Manage own profile
- Create/manage own products
- Create/manage orders
- View markets and prices
- Set price alerts
- View personal analytics

### Organization Users (Multi-Tenant)

**Use Case**: Enterprises, cooperatives, government agencies with multiple members.

**Features:**
- Organization-scoped data isolation
- Multi-level roles (Admin, Manager, Member, Viewer)
- Member invitation and lifecycle management
- Delegated administration
- Organization-specific permissions

**Implementation:**
```typescript
// Create organization
const org = await OrganizationService.create({
  name: 'AgroCoop Ltd',
  type: 'cooperative',
  industry: 'agriculture',
  email: 'info@agrocoop.com',
  address: {
    city: 'Nairobi',
    state: 'Nairobi',
    country: 'Kenya',
  },
  ownerId: userId,
});

// Invite members
const invitation = await OrganizationService.inviteMember(org.id, {
  email: 'member@example.com',
  roleId: orgManagerRoleId,
  department: 'Operations',
  invitedBy: userId,
});
```

### Migration Path

Users can transition from individual to organization:

```typescript
// Individual user creates organization
const organization = await OrganizationService.create({
  name: "John's Farm Cooperative",
  ownerId: userId,
  // ... other details
});

// Mark personal workspace as migrated
await PersonalWorkspaceService.markAsMigrated(userId, organization.id);
```

---

## Authentication System

### Registration

**Standard Registration:**
```typescript
const result = await AuthService.register({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  firstName: 'Jane',
  lastName: 'Smith',
  role: 'farmer', // Optional: defaults to 'farmer'
});

// Returns: { user, tokens }
// Personal workspace created automatically
// Email verification OTP sent
```

**Password Requirements:**
- Minimum 12 characters (configurable)
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Not in common password list

### Login with Enhanced Security

```typescript
const result = await EnhancedAuthService.login({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  deviceInfo: {
    userAgent: request.headers['user-agent'],
    ipAddress: request.ip,
  },
});

// Returns:
// {
//   user: { ... },
//   tokens: { accessToken, refreshToken },
//   requiresMfa: boolean,
//   deviceTrusted: boolean,
//   securityFlags?: string[]
// }
```

**Security Features:**
- Account lockout after 5 failed attempts (30-minute lockout)
- Device fingerprinting and tracking
- Suspicious activity detection
- Geolocation tracking
- Automatic password rehashing (bcrypt → argon2 migration)

### Multi-Factor Authentication (MFA)

**Setup TOTP (Authenticator App):**
```typescript
// Step 1: Generate secret and QR code
const { secret, qrCode } = await MFAService.setupTOTP(userId);

// Step 2: Verify and enable
const { backupCodes } = await MFAService.verifyAndEnableTOTP(
  userId,
  tokenFromAuthenticator
);
```

**Email OTP:**
```typescript
// Send OTP
await MFAService.sendEmailOTP(userId, 'login_verification');

// Verify
await MFAService.verifyEmailOTP(userId, otpCode);
```

### Token Management

**Refresh Token Rotation:**
```typescript
const tokens = await EnhancedAuthService.refreshAccessToken(
  oldRefreshToken,
  { ipAddress: req.ip, userAgent: req.headers['user-agent'] }
);

// Old token automatically revoked
// New token pair generated
```

**Logout:**
```typescript
// Logout current device
await EnhancedAuthService.logout(userId, refreshToken);

// Logout all devices
await EnhancedAuthService.logoutAllDevices(userId);
```

---

## Authorization & Permissions

### Permission Model

Permissions follow the format: `resource:action:scope`

**Scopes:**
- `global`: Platform-wide access
- `organization`: Organization-scoped access
- `own`: User's own resources only

**Examples:**
```
users:create:organization  // Can create users in organization
products:read:own          // Can read own products
orders:update:organization // Can update organization orders
analytics:view:global      // Can view all analytics
```

### Role-Based Access Control (RBAC)

**Global Roles** (platform-wide):
- `platform-super-admin`: Full platform access
- `farmer`: Individual farmer (default)
- `buyer`: Marketplace buyer
- `trader`: Agricultural trader
- `expert`: Agricultural expert/advisor

**Organization Roles** (organization-specific):
- `org-admin`: Full organization access
- `org-manager`: Management access
- `org-member`: Standard member (default)
- `org-viewer`: Read-only access

**Check Permission:**
```typescript
// Check if user has permission
const hasAccess = await AuthorizationService.hasPermission({
  userId,
  organizationId, // optional
  resource: 'products',
  action: 'create',
  scope: 'organization',
});

// Require permission (throws if unauthorized)
await AuthorizationService.requirePermission({
  userId,
  organizationId,
  resource: 'products',
  action: 'update',
  scope: 'own',
  ownerId: productOwnerId,
});
```

### Policy-Based Access Control (PBAC)

Resource-level policies for fine-grained control:

**Create Resource Policy:**
```typescript
const policy = await ResourceAuthorizationService.createPolicy({
  resourceType: 'product',
  resourceId: productId,
  ownerType: 'user',
  ownerId: userId,
  visibility: 'private', // or 'organization', 'public', 'restricted'
  createdBy: userId,
});
```

**Grant Access:**
```typescript
await ResourceAuthorizationService.grantAccess(
  'product',
  productId,
  {
    principalId: otherUserId,
    principalType: 'user',
    permissions: ['read', 'update'],
    conditions: {
      expiresAt: new Date('2026-12-31'),
      ipRestriction: ['192.168.1.0/24'],
    },
    grantedBy: userId,
  }
);
```

**Check Resource Access:**
```typescript
await ResourceAuthorizationService.requireAccess({
  userId,
  resourceType: 'product',
  resourceId,
  permission: 'update',
  context: {
    ipAddress: req.ip,
    organizationId,
  },
});
```

---

## Security Features

### Device Management

**Track Devices:**
```typescript
// Automatically tracked during login
const device = await DeviceService.registerDevice(userId, {
  userAgent: req.headers['user-agent'],
  ipAddress: req.ip,
});

// Get user's devices
const devices = await DeviceService.getUserDevices(userId);

// Trust device
await DeviceService.verifyDevice(userId, deviceId);

// Revoke device
await DeviceService.revokeDevice(userId, deviceId);
```

**Trust Levels:**
- `new`: First-time device
- `recognized`: Used 5+ times
- `verified`: Manually verified by user
- `suspicious`: Flagged by security system

### Suspicious Activity Detection

Automatic detection of:
- Login from new location
- Login from new device
- Unusual login time
- Multiple failed attempts
- Rapid location changes
- IP address reputation

**Response:**
- Security event logged
- Email alert sent to user
- Account flagged for review
- MFA challenge can be required

### Audit Logging

All security-sensitive actions are logged:

```typescript
await AuditService.log({
  action: 'user.login',
  resource: 'user',
  resourceId: userId,
  userId,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  details: {
    metadata: { deviceId, deviceTrusted: true },
  },
  status: 'success',
  risk: 'low',
});
```

**Queryable Audit Logs:**
```typescript
// Get user's audit trail
const logs = await AuditService.getUserAuditLogs(userId, {
  startDate,
  endDate,
  actions: ['user.login', 'user.password_changed'],
  limit: 100,
});

// Get organization audit logs
const orgLogs = await AuditService.getOrganizationAuditLogs(orgId, {
  resource: 'products',
  limit: 50,
});
```

---

## OAuth/SSO Integration

### Supported Providers

- Google OAuth 2.0
- Microsoft/Azure AD
- Custom OIDC providers
- SAML 2.0 (foundation)

### Setup OAuth Provider

```typescript
// For platform admin
const provider = await OAuthProvider.create({
  provider: 'google',
  displayName: 'Sign in with Google',
  config: {
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    redirectUri: 'https://app.clycites.com/auth/callback/google',
    scopes: ['openid', 'email', 'profile'],
  },
  mapping: {
    emailField: 'email',
    firstNameField: 'given_name',
    lastNameField: 'family_name',
  },
  autoProvisioning: true,
  defaultRole: 'farmer',
  isEnabled: true,
  createdBy: adminUserId,
});
```

### OAuth Login Flow

```typescript
// 1. Get authorization URL
const authUrl = await OAuthService.getAuthorizationUrl(
  providerId,
  stateToken
);

// 2. Redirect user to authUrl
// 3. Handle callback
const { user, tokens, isNewUser } = await OAuthService.handleCallback(
  providerId,
  authorizationCode,
  stateToken
);
```

### Link OAuth Account

```typescript
// Link external account to existing user
await OAuthService.linkAccount(userId, providerId, authorizationCode);

// Unlink account
await OAuthService.unlinkAccount(userId, linkedAccountId);
```

---

## API Reference

### Authentication Endpoints

```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - Login with credentials
POST   /api/auth/logout            - Logout current device
POST   /api/auth/logout-all        - Logout all devices
POST   /api/auth/refresh-token     - Refresh access token
POST   /api/auth/verify-email      - Verify email with OTP
POST   /api/auth/resend-otp        - Resend verification OTP
POST   /api/auth/forgot-password   - Request password reset
POST   /api/auth/reset-password    - Reset password with OTP
```

### User Endpoints

```
GET    /api/users/me               - Get current user profile
PUT    /api/users/me               - Update profile
GET    /api/users/me/workspace     - Get personal workspace
PUT    /api/users/me/workspace     - Update personal workspace
GET    /api/users/me/organizations - Get user's organizations
```

### Organization Endpoints

```
POST   /api/organizations          - Create organization
GET    /api/organizations/:id      - Get organization
PUT    /api/organizations/:id      - Update organization
DELETE /api/organizations/:id      - Delete organization

POST   /api/organizations/:id/members/invite - Invite member
GET    /api/organizations/:id/members        - List members
PUT    /api/organizations/:id/members/:memberId - Update member
DELETE /api/organizations/:id/members/:memberId - Remove member
```

### Security Endpoints

```
GET    /api/security/devices       - List user's devices
POST   /api/security/devices/:id/verify - Trust device
DELETE /api/security/devices/:id   - Revoke device

POST   /api/security/mfa/setup-totp - Setup authenticator app
POST   /api/security/mfa/verify-totp - Verify and enable TOTP
POST   /api/security/mfa/disable   - Disable MFA

GET    /api/security/events        - Get security events
```

---

## Deployment & Operations

### Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/clycites

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@clycites.com
SMTP_PASS=your-password

# OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Security
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30
MFA_REQUIRED=false
```

### Initialize IAM System

```bash
# Run initialization script
npm run init:iam

# Or using ts-node
npx ts-node src/scripts/initializeIAM.ts
```

This creates:
- All default permissions
- Global platform roles
- Organization role templates

### Monitoring

**Key Metrics:**
- Failed login attempts
- MFA enrollment rate
- Suspicious activity events
- Device trust ratio
- Token refresh rate

**Audit Queries:**
```typescript
// High-risk security events
const criticalEvents = await AuditService.search({
  risk: 'critical',
  startDate: last24Hours,
});

// Failed login patterns
const failedLogins = await AuditService.search({
  action: 'auth.login_failed',
  groupBy: 'ipAddress',
});
```

### Compliance

The system supports:
- **GDPR**: Data isolation, consent tracking, right to deletion
- **SOC 2**: Audit logging, access controls, encryption
- **ISO 27001**: Security controls, incident response
- **HIPAA**: For health-related agricultural data

---

## Best Practices

### For Individual Users (Farmers)

1. Always enable MFA for account security
2. Use strong, unique passwords
3. Trust devices you use regularly
4. Review security events periodically
5. Set up price alerts for market monitoring

### For Organizations

1. Enforce MFA for all members
2. Use least-privilege principle for roles
3. Regularly audit member access
4. Monitor security events
5. Configure IP whitelisting for sensitive operations
6. Use SSO for enterprise deployments

### For Developers

1. Always check permissions before operations
2. Use resource policies for shared resources
3. Log all security-sensitive actions
4. Implement rate limiting on auth endpoints
5. Never log passwords or tokens
6. Rotate secrets regularly

---

## Support & Resources

- **API Documentation**: `/docs/api`
- **Security Reporting**: security@clycites.com
- **Support**: support@clycites.com

---

*Last Updated: February 16, 2026*
