# ClyCites Enterprise IAM System

## 🎯 Overview

The ClyCites Identity and Access Management (IAM) system is a production-grade, enterprise-level security infrastructure built to support multi-organization onboarding, large-scale user growth, and secure handling of agricultural, financial, and operational data.

## 🏗️ Architecture

### Core Components

1. **Multi-Tenant Organizations**
   - Organization-scoped data isolation
   - Membership lifecycle management
   - Configurable security and access policies
   - Billing and subscription tiers

2. **Enterprise Authentication**
   - Argon2id password hashing (OWASP recommended)
   - JWT access tokens + rotating refresh tokens
   - Multi-Factor Authentication (TOTP, Email OTP)
   - Device tracking and trust management
   - Suspicious activity detection
   - Brute-force protection

3. **Authorization System (RBAC + PBAC)**
   - Role-Based Access Control
   - Permission-Based Access Control
   - Resource-level authorization
   - Custom permission overrides
   - Permission inheritance

4. **Audit & Compliance**
   - Comprehensive audit logging
   - Security event monitoring
   - Risk scoring and classification
   - Compliance-ready data tracking

5. **Security Features**
   - IP-based rate limiting
   - Device fingerprinting
   - Session management
   - Automated threat detection
   - Real-time security alerts

## 📊 Data Models

### Organization
```typescript
{
  name: string
  slug: string (unique)
  type: 'enterprise' | 'cooperative' | 'government' | 'individual'
  owner: User
  settings: {
    security: { mfaRequired, sessionTimeout, ipWhitelist }
    accessControl: { allowPublicSignup, defaultRole }
    features: { marketplace, analytics, apiAccess }
    billing: { plan, maxUsers, maxStorage }
  }
  status: 'active' | 'suspended' | 'pending' | 'archived'
}
```

### OrganizationMember
```typescript
{
  organization: Organization
  user: User
  role: Role
  status: 'active' | 'invited' | 'suspended' | 'removed'
  customPermissions: {
    granted: Permission[]
    revoked: Permission[]
  }
}
```

### Permission
```typescript
{
  resource: string  // e.g., 'users', 'products'
  action: string    // e.g., 'create', 'read', 'update', 'delete'
  scope: 'global' | 'organization' | 'own'
  name: string      // format: resource:action:scope
}
```

### Role
```typescript
{
  name: string
  slug: string
  permissions: Permission[]
  organization?: Organization  // null for global roles
  scope: 'global' | 'organization'
  level: number  // 0 = super admin, 100 = basic user
  inheritsFrom?: Role  // permission inheritance
}
```

### AuditLog
```typescript
{
  user: User
  organization: Organization
  action: string
  resource: string
  details: { before, after, changes }
  securityContext: {
    risk: 'low' | 'medium' | 'high' | 'critical'
    isSuspicious: boolean
    flags: string[]
  }
  timestamp: Date
}
```

### Device
```typescript
{
  user: User
  deviceId: string
  deviceInfo: { type, os, browser, userAgent }
  isTrusted: boolean
  trustLevel: 'verified' | 'recognized' | 'new' | 'suspicious'
  lastLocation: { ip, country, city }
  status: 'active' | 'blocked' | 'revoked'
}
```

## 🔐 Security Features

### Password Security
- **Hashing**: Argon2id with configurable parameters
- **Validation**: Minimum 12 characters, complexity requirements
- **Strength Scoring**: Real-time password strength feedback
- **Common Password Prevention**: Blocks frequently used passwords
- **Migration Support**: Backward compatible with bcrypt

### Multi-Factor Authentication
- **TOTP**: Authenticator app support (Google Authenticator, Authy)
- **Email OTP**: Time-limited codes via email
- **Backup Codes**: 10 single-use recovery codes
- **Trusted Devices**: MFA bypass for verified devices

### Device Management
- **Fingerprinting**: Unique device identification
- **Trust Levels**: Verified, Recognized, New, Suspicious
- **Activity Tracking**: Login count, failed attempts, locations
- **Automated Blocking**: Excessive failed login protection
- **Manual Controls**: User can verify, block, or revoke devices

### Rate Limiting
- **API Limiter**: 100 requests/15 minutes per user
- **Auth Limiter**: 5 attempts/15 minutes (brute-force protection)
- **IP Limiter**: 60 requests/minute per IP
- **Sensitive Operations**: 10 operations/hour for critical actions
- **Automatic Logging**: All rate limit violations logged

## 🚀 Setup & Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create `.env` file:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/clycites

# JWT Secrets
JWT_SECRET=your_super_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Rate Limiting (optional - Redis)
REDIS_URL=redis://localhost:6379

# Security
SESSION_TIMEOUT_MINUTES=480
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_MINUTES=15
```

### 3. Initialize IAM System
```bash
npm run init:iam
```

This will:
- Create all default permissions
- Set up default roles (Platform Admin, Org Admin, Manager, Member, Viewer)
- Configure system settings

### 4. Start the Server
```bash
npm run dev
```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### MFA Verification
```http
POST /api/auth/mfa/verify
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "code": "123456"
}
```

### Organization Management

#### Create Organization
```http
POST /api/organizations
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "name": "My Farm Cooperative",
  "slug": "my-farm-coop",
  "type": "cooperative",
  "industry": "Agriculture",
  "email": "contact@myfarm.com",
  "address": {
    "city": "Nairobi",
    "state": "Nairobi",
    "country": "Kenya"
  }
}
```

#### Invite Member
```http
POST /api/organizations/{orgId}/members/invite
Content-Type: application/json
Authorization: Bearer {access_token}
X-Organization-ID: {orgId}

{
  "email": "member@example.com",
  "roleId": "role_id_here",
  "department": "Sales",
  "title": "Sales Manager"
}
```

### Security Endpoints

#### Setup TOTP MFA
```http
POST /api/security/mfa/totp/setup
Authorization: Bearer {access_token}
```

Returns:
```json
{
  "secret": "BASE32_SECRET",
  "qrCode": "data:image/png;base64,..."
}
```

#### Get User Devices
```http
GET /api/security/devices
Authorization: Bearer {access_token}
```

#### Verify Device
```http
POST /api/security/devices/{deviceId}/verify
Authorization: Bearer {access_token}
```

### Audit Endpoints

#### Get User Audit Logs
```http
GET /api/audit/me?limit=50&skip=0
Authorization: Bearer {access_token}
```

#### Get Organization Audit Logs
```http
GET /api/audit/organizations/{orgId}?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer {access_token}
X-Organization-ID: {orgId}
```

## 🔑 Permission System

### Permission Format
```
resource:action:scope
```

Examples:
- `users:create:organization` - Create users within organization
- `products:read:organization` - View all organization products
- `orders:read:own` - View only own orders
- `analytics:export:organization` - Export organization analytics

### Default Roles

#### Platform Administrator (Level 0)
- All permissions across all organizations
- Platform-wide management

#### Organization Administrator (Level 10)
- Full administrative access within organization
- Member management
- Role and permission management
- Settings configuration

#### Manager (Level 50)
- User and product management
- Order processing
- Analytics access
- No administrative functions

#### Member (Level 100) - Default
- View organization data
- Manage own profile
- Create orders
- Basic marketplace access

#### Viewer (Level 150)
- Read-only access
- View organization data
- View own profile

### Custom Permissions
```typescript
// Grant custom permission to a member
POST /api/organizations/{orgId}/members/{memberId}/permissions/grant
{
  "permission": "analytics:export:organization"
}

// Revoke custom permission
POST /api/organizations/{orgId}/members/{memberId}/permissions/revoke
{
  "permission": "analytics:export:organization"
}
```

## 🛡️ Security Best Practices

### For Administrators

1. **Enable MFA**: Require MFA for all administrative accounts
2. **IP Whitelisting**: Restrict admin access to known IP addresses
3. **Regular Audits**: Review audit logs weekly for suspicious activity
4. **Device Management**: Review and verify devices regularly
5. **Role Review**: Audit user roles and permissions quarterly

### For Developers

1. **Use Permission Middleware**: Always check permissions on protected routes
2. **Audit Sensitive Actions**: Log all security-critical operations
3. **Rate Limit**: Apply appropriate rate limits to all endpoints
4. **Input Validation**: Validate and sanitize all user inputs
5. **Error Handling**: Don't expose sensitive information in errors

### For Users

1. **Strong Passwords**: Use unique, complex passwords (12+ characters)
2. **Enable MFA**: Activate two-factor authentication
3. **Verify Devices**: Review and verify new device notifications
4. **Monitor Activity**: Check audit logs for unauthorized access
5. **Secure Sessions**: Log out when using shared devices

## 📈 Monitoring & Observability

### Key Metrics to Monitor

1. **Authentication**
   - Failed login attempts
   - MFA verification rates
   - Session duration

2. **Authorization**
   - Permission denials
   - Role assignment changes
   - Unusual permission grants

3. **Security**
   - Rate limit violations
   - Suspicious activity flags
   - Device blocking events

4. **Performance**
   - API response times
   - Database query performance
   - Cache hit rates

### Alert Triggers

- Multiple failed login attempts from same IP
- MFA disabled for administrative accounts
- New device from unusual location
- Mass permission changes
- Data export operations
- Account lockouts

## 🔄 Migration Guide

### From Basic Auth to Enterprise IAM

1. **Backup Data**: Export all existing users and roles
2. **Run Initialization**: `npm run init:iam`
3. **Create Organizations**: Set up your organizations
4. **Migrate Users**: Assign users to organizations with appropriate roles
5. **Update Applications**: Update client apps to use new auth flow
6. **Enable MFA**: Roll out MFA to users gradually
7. **Monitor**: Track migration metrics and address issues

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Security Tests
```bash
npm run test:security
```

## 📞 Support & Resources

- **Documentation**: `/docs`
- **API Reference**: `/api-docs`
- **Security Advisories**: `/security`
- **Changelog**: `/CHANGELOG.md`

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for the ClyCites Agricultural Platform**
