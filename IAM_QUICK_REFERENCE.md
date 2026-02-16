# IAM System - Quick Reference

## 🚀 Quick Start

### 1. Initial Setup
```bash
# Install dependencies
npm install

# Initialize IAM system (creates permissions and roles)
npm run init:iam

# Start development server
npm run dev
```

### 2. Create Your First Organization
```bash
curl -X POST http://localhost:3000/api/organizations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "My Organization",
    "type": "enterprise",
    "industry": "Agriculture",
    "email": "admin@myorg.com",
    "address": {
      "city": "Nairobi",
      "state": "Nairobi",
      "country": "Kenya"
    }
  }'
```

### 3. Enable MFA
```bash
# Setup TOTP
curl -X POST http://localhost:3000/api/security/mfa/totp/setup \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Verify with code from authenticator app
curl -X POST http://localhost:3000/api/security/mfa/totp/verify \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "token": "123456" }'
```

## 🔑 Common Patterns

### Check Permission in Code
```typescript
import AuthorizationService from './modules/permissions/authorization.service';

// Check if user has permission
const hasPermission = await AuthorizationService.hasPermission({
  userId: req.user.id,
  organizationId: req.headers['x-organization-id'],
  resource: 'products',
  action: 'create',
  scope: 'organization',
});

if (!hasPermission) {
  throw new ForbiddenError('Permission denied');
}
```

### Use Permission Middleware
```typescript
import { requirePermission } from './common/middleware/permission';

// In your routes
router.post(
  '/products',
  authenticate,
  requirePermission('products', 'create'),
  ProductController.create
);
```

### Log Audit Event
```typescript
import AuditService from './modules/audit/audit.service';

await AuditService.log({
  action: 'product.created',
  resource: 'product',
  resourceId: product._id,
  userId: req.user.id,
  organizationId: req.headers['x-organization-id'],
  ipAddress: getClientIp(req),
  userAgent: req.headers['user-agent'],
  details: {
    after: product,
  },
});
```

### Track Device
```typescript
import DeviceService from './modules/security/device.service';

const device = await DeviceService.registerDevice(userId, {
  userAgent: req.headers['user-agent'],
  ipAddress: getClientIp(req),
});

// Check if device is trusted
if (!device.isTrusted) {
  // Require MFA or additional verification
}
```

## 📋 Permission Checklist

### User Management
- [ ] `users:create:organization` - Create users
- [ ] `users:read:organization` - View all users
- [ ] `users:update:organization` - Update users
- [ ] `users:delete:organization` - Delete users
- [ ] `users:read:own` - View own profile
- [ ] `users:update:own` - Update own profile

### Organization Management
- [ ] `organization:read:organization` - View org details
- [ ] `organization:update:organization` - Update org settings
- [ ] `organization:delete:organization` - Delete organization

### Member Management
- [ ] `members:invite:organization` - Invite members
- [ ] `members:read:organization` - View members
- [ ] `members:update:organization` - Update member roles
- [ ] `members:remove:organization` - Remove members

### Product Management
- [ ] `products:create:organization` - Create products
- [ ] `products:read:organization` - View products
- [ ] `products:update:organization` - Update products
- [ ] `products:delete:organization` - Delete products

### Analytics & Audit
- [ ] `analytics:read:organization` - View analytics
- [ ] `analytics:export:organization` - Export data
- [ ] `audit:read:organization` - View audit logs

## 🛡️ Security Checklist

### Setup Phase
- [ ] Environment variables configured
- [ ] JWT secrets are strong and unique
- [ ] Database secured with authentication
- [ ] HTTPS enabled in production
- [ ] CORS configured correctly
- [ ] Rate limiting enabled

### Initial Configuration
- [ ] IAM system initialized
- [ ] Default roles created
- [ ] First admin user created
- [ ] First organization created
- [ ] Email service configured

### Operational Security
- [ ] MFA enabled for admins
- [ ] IP whitelisting configured (if needed)
- [ ] Session timeout configured
- [ ] Password policies enforced
- [ ] Audit logging enabled
- [ ] Security event monitoring active

### Ongoing Maintenance
- [ ] Regular audit log reviews
- [ ] Quarterly permission audits
- [ ] Monthly security event reviews
- [ ] User access reviews
- [ ] Device management reviews

## 🔧 Troubleshooting

### Common Issues

#### "Permission denied" errors
```typescript
// Check user's permissions
const permissions = await AuthorizationService.getUserPermissions(
  userId,
  organizationId
);
console.log('User permissions:', permissions);
```

#### MFA not working
```typescript
// Check MFA status
const mfaSecret = await MFASecret.findOne({ user: userId });
console.log('MFA enabled:', mfaSecret?.isActive);
console.log('TOTP enabled:', mfaSecret?.totpEnabled);
```

#### Device blocked
```typescript
// Unblock device
await DeviceService.unblockDevice(userId, deviceId);
```

#### Rate limit errors
```typescript
// Check rate limit headers in response
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

### Debug Mode

Enable debug logging:
```env
DEBUG=iam:*
LOG_LEVEL=debug
```

## 📊 Monitoring Quick Reference

### Key Queries

```javascript
// Failed login attempts in last hour
db.auditLogs.find({
  action: 'auth.login',
  status: 'failure',
  timestamp: { $gte: new Date(Date.now() - 3600000) }
}).count()

// Suspicious activities
db.securityEvents.find({
  isSuspicious: true,
  responseStatus: 'open'
}).sort({ timestamp: -1 })

// Most active users
db.auditLogs.aggregate([
  { $group: { _id: '$user', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 10 }
])

// Permission denials
db.auditLogs.find({
  status: 'failure',
  errorMessage: /permission/i
}).sort({ timestamp: -1 })
```

## 🔗 Useful Links

- [Full Documentation](./IAM_SYSTEM_DOCUMENTATION.md)
- [API Testing Guide](./API_TESTING.md)
- [Deployment Guide](./DEPLOYMENT.md)

## 💡 Tips

1. **Always use organization context**: Include `X-Organization-ID` header for organization-scoped operations
2. **Test permissions early**: Verify permission checks before implementing features
3. **Log important events**: Use audit service for all security-critical operations
4. **Monitor rate limits**: Keep an eye on rate limit headers to avoid throttling
5. **Review audit logs**: Regularly check logs for unusual activity
6. **Keep MFA optional initially**: Let users adopt MFA gradually
7. **Document custom permissions**: Maintain a list of any custom permissions you create

## 🎯 Best Practices

### Code Organization
```
src/
  modules/
    organizations/    # Organization management
    permissions/      # Authorization logic
    security/         # MFA, devices, security events
    audit/           # Audit logging
  common/
    middleware/      # Auth, permission, rate limiting
    utils/           # Helper functions
```

### Error Handling
```typescript
// Always use typed errors
throw new ForbiddenError('Insufficient permissions');
throw new UnauthorizedError('MFA required');
throw new NotFoundError('Organization not found');
```

### Async/Await
```typescript
// Always use try-catch with async operations
try {
  await OrganizationService.create(data);
} catch (error) {
  next(error); // Pass to error middleware
}
```

---

**Need help? Check the full documentation or open an issue.**
