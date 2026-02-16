# ClyCites IAM - Quick Setup & Reference

## 🚀 Quick Start (5 Minutes)

### 1. Initialize IAM System

```bash
npm run init:iam
```

This creates all permissions and roles needed for the system.

### 2. Register First User (Farmer)

```typescript
const farmer = await AuthService.register({
  email: 'farmer@example.com',
  password: 'SecurePass123!',
  firstName: 'John',
  lastName: 'Doe',
});

// ✅ Personal workspace created automatically
// ✅ Can create products, orders independently
// ✅ No organization required
```

### 3. Create Organization (Optional)

```typescript
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
  ownerId: userId, // Becomes admin automatically
});
```

### 4. Invite Team Members

```typescript
await OrganizationService.inviteMember(orgId, {
  email: 'member@example.com',
  roleId: managerRoleId,
  department: 'Operations',
  invitedBy: adminUserId,
});
```

---

## 🔑 Common Operations

### Authentication

```typescript
// Login
const { user, tokens } = await EnhancedAuthService.login({
  email, password,
  deviceInfo: { userAgent, ipAddress },
});

// Refresh Token
const newTokens = await EnhancedAuthService.refreshAccessToken(
  refreshToken,
  { ipAddress, userAgent }
);

// Logout
await EnhancedAuthService.logout(userId, refreshToken);
```

### Check Permissions

```typescript
// Check if user can do something
const canCreate = await AuthorizationService.hasPermission({
  userId,
  organizationId,
  resource: 'products',
  action: 'create',
  scope: 'organization',
});

// Require permission (throws if denied)
await AuthorizationService.requirePermission({
  userId,
  resource: 'products',
  action: 'update',
  scope: 'own',
  ownerId: productOwnerId,
});
```

### Resource Access Control

```typescript
// Create policy for a resource
await ResourceAuthorizationService.createPolicy({
  resourceType: 'product',
  resourceId: productId,
  ownerType: 'user',
  ownerId: userId,
  visibility: 'private',
  createdBy: userId,
});

// Grant access to someone
await ResourceAuthorizationService.grantAccess(
  'product',
  productId,
  {
    principalId: otherUserId,
    principalType: 'user',
    permissions: ['read', 'update'],
    grantedBy: userId,
  }
);

// Check access
await ResourceAuthorizationService.requireAccess({
  userId,
  resourceType: 'product',
  resourceId,
  permission: 'update',
});
```

---

## 👥 User Types & Default Permissions

### Individual Farmer (No Organization)

**Automatic Features:**
- Personal workspace
- Product management (own)
- Order management (own)
- Price alerts
- Market viewing

**Default Permissions:**
```
users:read:own
users:update:own
products:create:own
products:read:own
products:update:own
products:delete:own
orders:create:own
orders:read:own
markets:read:global
prices:read:global
analytics:view:own
```

### Organization Admin

**Can Do:**
- Manage all organization resources
- Invite/remove members
- Create/assign roles
- View all organization data
- Export analytics

### Organization Member (Default)

**Can Do:**
- View organization resources
- Read organization data
- Update own profile

---

## 🔐 Security Features

### Enable MFA

```typescript
// Setup TOTP
const { secret, qrCode } = await MFAService.setupTOTP(userId);

// Show QR code to user, then verify
const { backupCodes } = await MFAService.verifyAndEnableTOTP(
  userId,
  totpToken
);

// Save backup codes securely!
```

### Manage Devices

```typescript
// List devices
const devices = await DeviceService.getUserDevices(userId);

// Trust device
await DeviceService.verifyDevice(userId, deviceId);

// Revoke device
await DeviceService.revokeDevice(userId, deviceId);
```

### View Security Events

```typescript
const events = await AuditService.getUserAuditLogs(userId, {
  actions: ['auth.login', 'auth.login_failed'],
  limit: 20,
});
```

---

## 🏢 Organization Patterns

### Enterprise Setup

```typescript
// 1. Create organization
const enterprise = await OrganizationService.create({
  name: 'AgriTech Corp',
  type: 'enterprise',
  ownerId: userId,
});

// 2. Configure security
await OrganizationService.update(enterprise.id, {
  settings: {
    security: {
      mfaRequired: true,
      sessionTimeoutMinutes: 30,
      ipWhitelist: ['203.0.113.0/24'],
    },
  },
}, userId);

// 3. Create custom role
const customRole = await Role.create({
  name: 'Product Manager',
  organization: enterprise.id,
  scope: 'organization',
  permissions: [/* permission IDs */],
});

// 4. Invite with custom role
await OrganizationService.inviteMember(enterprise.id, {
  email: 'pm@agritech.com',
  roleId: customRole.id,
  invitedBy: userId,
});
```

### Cooperative Setup

```typescript
// Cooperative with democratic access
const cooperative = await OrganizationService.create({
  name: 'Farmers Cooperative Society',
  type: 'cooperative',
  settings: {
    accessControl: {
      allowPublicSignup: true,
      defaultRole: 'member',
    },
    features: {
      marketplace: true,
      analytics: true,
    },
  },
  ownerId: userId,
});
```

---

## 🔄 Migration Scenarios

### Individual → Organization

```typescript
// Farmer wants to create organization
const org = await OrganizationService.create({
  name: "John's Farm Coop",
  type: 'cooperative',
  ownerId: farmerId,
});

// Mark personal workspace as migrated
await PersonalWorkspaceService.markAsMigrated(
  farmerId,
  org.id
);

// Personal data remains accessible
// Can now manage organization too
```

### Transfer Organization Ownership

```typescript
// Create new admin
await OrganizationMember.create({
  organization: orgId,
  user: newOwnerId,
  role: orgAdminRoleId,
  status: 'active',
});

// Update organization owner
await OrganizationService.update(orgId, {
  owner: newOwnerId,
}, currentOwnerId);
```

---

## 📊 Monitoring Queries

### Failed Logins (Last 24h)

```typescript
const failedLogins = await AuditService.search({
  action: 'auth.login_failed',
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
  groupBy: 'ipAddress',
});
```

### Suspicious Activity

```typescript
const suspicious = await AuditService.search({
  risk: ['high', 'critical'],
  isSuspicious: true,
  limit: 50,
});
```

### MFA Adoption Rate

```typescript
const totalUsers = await User.countDocuments({ isActive: true });
const mfaUsers = await User.countDocuments({ 
  isActive: true,
  isMfaEnabled: true,
});
const adoptionRate = (mfaUsers / totalUsers) * 100;
```

---

## 🛠️ Middleware Usage

### Require Authentication

```typescript
import { requireAuth } from './middleware/auth';

router.get('/products', requireAuth, async (req, res) => {
  // req.user available (authenticated user)
  const products = await getProducts();
  res.json(products);
});
```

### Require Permission

```typescript
import { requirePermission } from './middleware/permission';

router.post('/products',
  requireAuth,
  requirePermission('products', 'create', 'own'),
  async (req, res) => {
    // User has permission to create products
    const product = await createProduct(req.user.id, req.body);
    res.json(product);
  }
);
```

### Require Organization Context

```typescript
import { requireOrganization } from './middleware/authorize';

router.get('/organizations/:orgId/analytics',
  requireAuth,
  requireOrganization('analytics', 'view'),
  async (req, res) => {
    // req.organization available
    // User has permission in this organization
    const analytics = await getAnalytics(req.organization.id);
    res.json(analytics);
  }
);
```

---

## 🐛 Common Issues & Solutions

### Issue: User can't access organization resources

**Check:**
1. Is user an active member?
2. Does role have required permissions?
3. Are custom permissions revoking access?

```typescript
// Debug user's permissions
const permissions = await AuthorizationService.getUserPermissions(
  userId,
  organizationId
);
console.log('User permissions:', permissions);
```

### Issue: Device keeps getting flagged as suspicious

**Solution:**
```typescript
// Manually verify device
await DeviceService.verifyDevice(userId, deviceId);
```

### Issue: Refresh token expired

**Cause:** Token expired (7 days default)  
**Solution:** User must login again

```typescript
// Update expiry in config if needed
const expiryDays = 30;
const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
```

---

## 📋 Checklist: Production Deployment

- [ ] Initialize IAM system (`npm run init:iam`)
- [ ] Set strong JWT secret in env
- [ ] Configure SMTP for emails
- [ ] Enable MFA enforcement (optional)
- [ ] Set up rate limiting
- [ ] Configure IP whitelisting (if needed)
- [ ] Set session timeouts
- [ ] Enable audit log retention
- [ ] Set up monitoring alerts
- [ ] Configure backup for MongoDB
- [ ] Test OAuth providers (if using)
- [ ] Review security events daily
- [ ] Document custom roles/permissions

---

## 🎯 Key Principles

1. **Least Privilege**: Grant minimum permissions needed
2. **Defense in Depth**: Multiple security layers
3. **Audit Everything**: Log all sensitive operations
4. **Fail Secure**: Default deny, explicit allow
5. **Data Isolation**: Organizations and personal data separated
6. **User Choice**: Individual users don't need organizations

---

## 📞 Quick Links

- **Full Guide**: [IAM_COMPLETE_GUIDE.md](./IAM_COMPLETE_GUIDE.md)
- **API Docs**: `/docs/api`
- **Security**: security@clycites.com

---

*ClyCites IAM v1.0 - Production Ready*
