# IAM System Installation Guide

Complete step-by-step guide for installing and configuring the ClyCites IAM (Identity and Access Management) system.

---

## 📋 Prerequisites

Before installation, ensure you have:

- **Node.js** v16+ and npm/yarn
- **MongoDB** v4.4+ running locally or remotely
- **Redis** (optional but recommended for production)
- **Git** for version control
- Basic knowledge of TypeScript/Node.js

---

## 🚀 Installation Steps

### Step 1: Install Dependencies

```bash
# Navigate to project root
cd d:\projects\ClyCites\Clycites-api-upgrade

# Install all required packages
npm install
```

**New packages installed:**
- `argon2` - Enterprise password hashing
- `speakeasy` - TOTP multi-factor authentication
- `qrcode` - QR code generation for MFA
- `ioredis` - Redis client for distributed systems
- `rate-limit-redis` - Redis-backed rate limiting
- `@types/speakeasy` - TypeScript definitions
- `@types/qrcode` - TypeScript definitions

### Step 2: Environment Configuration

Create or update your `.env` file with IAM-specific variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/clycites
MONGODB_TEST_URI=mongodb://localhost:27017/clycites-test

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Session Configuration
SESSION_TIMEOUT=30m
SESSION_SECRET=your-session-secret-change-in-production

# MFA Configuration
MFA_APP_NAME=ClyCites
MFA_ISSUER=ClyCites Agricultural Platform

# Email Configuration (for OTP and notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@clycites.com

# Redis (Optional - for production)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Rate Limiting
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=5

# Organization Defaults
DEFAULT_ORG_PLAN=basic
DEFAULT_USER_LIMIT=50
DEFAULT_STORAGE_MB=1024

# Security
ARGON2_TIME_COST=3
ARGON2_MEMORY_COST=65536
ARGON2_PARALLELISM=4
```

#### 🔐 Generate Strong Secrets

Use these commands to generate secure random secrets:

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Initialize IAM System

Run the initialization script to create default permissions and roles:

```bash
npm run init:iam
```

This command will:
- ✅ Create 40+ default permissions (users, products, orders, etc.)
- ✅ Create 5 default roles (Platform Admin, Org Admin, Manager, Member, Viewer)
- ✅ Set up permission inheritance hierarchy
- ✅ Configure system flags for core permissions

**Expected Output:**
```
🚀 Initializing IAM System...
📋 Creating system permissions...
✅ Created 43 permissions
👥 Creating default roles...
✅ Created 5 roles
✨ IAM System initialized successfully!
```

### Step 4: Start the Application

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### Step 5: Verify Installation

Check that the server started successfully:

```bash
# You should see:
Server running on port 3000
✅ MongoDB connected
✅ IAM system loaded
```

---

## 🔧 Post-Installation Configuration

### Create First Admin User

Use the API or direct database insertion:

```bash
# Using MongoDB shell
mongosh clycites

db.users.insertOne({
  firstName: "Admin",
  lastName: "User",
  email: "admin@clycites.com",
  password: "$argon2id$v=19$m=65536,t=3,p=4$...", // Use hashed password
  role: "admin",
  isVerified: true,
  securitySettings: {
    mfaEnabled: false,
    passwordChangedAt: new Date()
  },
  createdAt: new Date(),
  updatedAt: new Date()
})
```

Or use the registration endpoint and update the role manually.

### Create First Organization

```bash
POST /api/organizations
Content-Type: application/json
Authorization: Bearer <admin-token>

{
  "name": "My First Organization",
  "slug": "my-org",
  "type": "enterprise",
  "industry": "agriculture",
  "description": "Our main organization",
  "settings": {
    "security": {
      "mfaRequired": false,
      "sessionTimeout": 30,
      "ipWhitelist": []
    }
  }
}
```

### Enable MFA for Admin User

```bash
# 1. Setup TOTP
POST /api/security/mfa/setup-totp
Authorization: Bearer <admin-token>

# Response includes QR code URL - scan with authenticator app

# 2. Verify and enable
POST /api/security/mfa/verify-totp
Authorization: Bearer <admin-token>
{
  "token": "123456"  // From authenticator app
}

# Response includes backup codes - save these securely!
```

---

## 🧪 Testing the Installation

### 1. Test Authentication

```bash
# Register new user
POST /api/auth/register
{
  "email": "test@example.com",
  "password": "SecurePass123!@#",
  "firstName": "Test",
  "lastName": "User"
}

# Login
POST /api/auth/login
{
  "email": "test@example.com",
  "password": "SecurePass123!@#"
}

# Response includes accessToken and refreshToken
```

### 2. Test Organization Creation

```bash
POST /api/organizations
Authorization: Bearer <token>
{
  "name": "Test Cooperative",
  "type": "cooperative",
  "industry": "agriculture"
}
```

### 3. Test Permission System

```bash
# Get user permissions
GET /api/organizations/<org-id>/members/<user-id>/permissions
Authorization: Bearer <token>

# Should return list of permissions based on role
```

### 4. Test MFA Flow

```bash
# Enable TOTP
POST /api/security/mfa/setup-totp

# Login with MFA
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password",
  "mfaToken": "123456"
}
```

### 5. Test Rate Limiting

```bash
# Try multiple login attempts quickly
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done

# Should get rate limited after 5 attempts
```

---

## 📊 Database Verification

### Check Created Collections

```bash
mongosh clycites

# View collections
show collections

# Should include:
# - users
# - organizations
# - organizationmembers
# - permissions
# - roles
# - auditlogs
# - devices
# - mfasecrets
# - securityevents
```

### Verify Permissions

```bash
db.permissions.countDocuments()
# Should return 40+

db.permissions.find({ category: "users" }).pretty()
# Shows user management permissions
```

### Verify Roles

```bash
db.roles.find({}).pretty()
# Should show 5 roles: Platform Admin, Org Admin, Manager, Member, Viewer

db.roles.findOne({ name: "Platform Admin" }).permissions.length
# Should return all permissions
```

---

## 🔍 Troubleshooting

### Issue: "Cannot find module 'argon2'"

**Solution:**
```bash
npm install argon2 --save
# If fails on Windows, install build tools:
npm install --global windows-build-tools
```

### Issue: "MongoDB connection failed"

**Solution:**
1. Check MongoDB is running: `mongosh`
2. Verify MONGODB_URI in .env
3. Check firewall settings

### Issue: "Rate limiting not working"

**Solution:**
1. Redis not required for basic rate limiting
2. For production, install Redis and uncomment RedisStore config
3. Set REDIS_URL in .env

### Issue: "MFA QR code not generating"

**Solution:**
1. Check `qrcode` package installed: `npm list qrcode`
2. Verify MFA_APP_NAME and MFA_ISSUER in .env
3. Check console for errors

### Issue: "Permission denied errors"

**Solution:**
1. Re-run initialization: `npm run init:iam`
2. Check user has organizationMember record
3. Verify role has correct permissions:
```bash
db.roles.findOne({ slug: "org-admin" }).permissions
```

### Issue: "Email OTP not sending"

**Solution:**
1. Configure email service in .env
2. For Gmail, enable "Less secure app access" or use App Password
3. Check email service logs in console

---

## 🔐 Security Checklist

Before going to production, ensure:

- [ ] All secrets in .env are strong random values
- [ ] JWT_SECRET and JWT_REFRESH_SECRET are different
- [ ] MongoDB has authentication enabled
- [ ] Redis has password protection (if used)
- [ ] HTTPS/TLS enabled on all endpoints
- [ ] Rate limiting configured and tested
- [ ] MFA enforced for admin users
- [ ] Audit logging enabled
- [ ] IP whitelist configured for admin routes
- [ ] Database backups scheduled
- [ ] Security event monitoring configured
- [ ] Session timeout configured appropriately
- [ ] CORS configured for allowed origins only

---

## 📈 Performance Optimization

### Enable Redis for Rate Limiting

```typescript
// In src/common/middleware/rateLimiter.ts
// Uncomment RedisStore import and configuration:

import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const client = createClient({
  url: config.redis.url,
});

const limiter = rateLimit({
  store: new RedisStore({
    client,
    prefix: 'rl:',
  }),
  // ... rest of config
});
```

### Database Indexes

Indexes are automatically created by Mongoose schemas, but verify:

```bash
# Check indexes
db.users.getIndexes()
db.organizations.getIndexes()
db.auditlogs.getIndexes()

# Should include compound indexes on:
# - users: email (unique), organizationId
# - organizations: slug (unique)
# - organizationmembers: organization + user (compound unique)
# - auditlogs: actor, organization, action, timestamp
# - devices: user + deviceId (compound unique)
```

### Monitor Performance

```javascript
// Add to audit queries
db.auditlogs.find({ timestamp: { $gte: new Date(Date.now() - 24*60*60*1000) }})
  .explain("executionStats")
// Should use indexes, not COLLSCAN
```

---

## 🚢 Production Deployment

### Environment Variables

Update production .env:
- Generate new secrets (never reuse dev secrets!)
- Use production MongoDB URI
- Configure production Redis
- Set NODE_ENV=production
- Configure production email service

### PM2 Configuration

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 list
pm2 save

# Setup PM2 startup
pm2 startup
```

### Docker Deployment

```dockerfile
# Dockerfile already exists in express-app/
docker build -t clycites-iam:latest .
docker run -p 3000:3000 --env-file .env.production clycites-iam:latest
```

### Monitoring

Set up monitoring for:
- Failed login attempts (SecurityEvents)
- MFA failures
- Rate limit violations
- Suspicious device registrations
- High-risk audit log entries

```javascript
// Query for monitoring
db.securityevents.find({
  severity: { $in: ["error", "critical"] },
  timestamp: { $gte: new Date(Date.now() - 3600000) }
}).count()
```

---

## 📚 Next Steps

After successful installation:

1. **Read Documentation**
   - [IAM_SYSTEM_DOCUMENTATION.md](./IAM_SYSTEM_DOCUMENTATION.md) - Complete system guide
   - [IAM_QUICK_REFERENCE.md](./IAM_QUICK_REFERENCE.md) - Quick patterns and recipes
   - [I AM_IMPLEMENTATION_SUMMARY.md](./IAM_IMPLEMENTATION_SUMMARY.md) - Technical details

2. **Customize for Your Needs**
   - Add custom permissions for your resources
   - Create organization-specific roles
   - Configure email templates
   - Set up webhook notifications

3. **Integrate with Frontend**
   - Use JWT tokens for authentication
   - Implement permission-based UI rendering
   - Add MFA setup flows
   - Handle session expiration

4. **Scale the System**
   - Set up Redis cluster for rate limiting
   - Configure MongoDB sharding for large datasets
   - Implement caching layer for permissions
   - Add CDN for static assets

5. **Enhance Security**
   - Regular security audits
   - Penetration testing
   - Update dependencies regularly
   - Monitor security events
   - Implement DDoS protection

---

## 📞 Support

For issues or questions:

1. Check [IAM_QUICK_REFERENCE.md](./IAM_QUICK_REFERENCE.md) troubleshooting section
2. Review [IAM_SYSTEM_DOCUMENTATION.md](./IAM_SYSTEM_DOCUMENTATION.md) for detailed explanations
3. Check GitHub issues (if applicable)
4. Contact development team

---

## ✅ Installation Complete!

You've successfully installed the ClyCites IAM system! 🎉

Your system now includes:
- ✅ Enterprise-grade authentication (Argon2id)
- ✅ Multi-factor authentication (TOTP + Email OTP)
- ✅ Multi-tenant organization management
- ✅ Fine-grained RBAC/PBAC authorization
- ✅ Comprehensive audit logging
- ✅ Device security and tracking
- ✅ Advanced rate limiting
- ✅ Security event monitoring

**Remember to:**
- Keep secrets secure
- Enable MFA for all admin users
- Monitor audit logs regularly
- Update dependencies
- Back up your database

Happy coding! 🚀
