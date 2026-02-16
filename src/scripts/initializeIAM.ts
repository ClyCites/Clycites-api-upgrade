import PermissionService from '../modules/permissions/permission.service';
import Role from '../modules/users/role.model';
import Permission from '../modules/permissions/permission.model';

/**
 * Comprehensive IAM System Initialization
 * Production-grade Identity and Access Management setup
 */
async function initializeIAMSystem() {
  console.log('🚀 Initializing Comprehensive IAM System...');
  console.log('📊 This will create:');
  console.log('   - Enterprise-grade permissions');
  console.log('   - Global platform roles');
  console.log('   - Organization role templates');
  console.log('   - Hybrid identity support (Individual + Organization users)');
  console.log('');

  try {
    // 1. Initialize default permissions
    console.log('📋 Creating enterprise permissions...');
    await PermissionService.initializeDefaultPermissions();
    const permissionCount = await Permission.countDocuments();
    console.log(`✅ ${permissionCount} permissions initialized`);

    // 2. Create default global roles
    console.log('👥 Creating global platform roles...');
    await createDefaultRoles();
    const roleCount = await Role.countDocuments({ scope: 'global' });
    console.log(`✅ ${roleCount} global roles created`);

    console.log('');
    console.log('✅ IAM System initialized successfully!');
    console.log('');
    console.log('📝 Summary:');
    console.log(`   - Permissions: ${permissionCount}`);
    console.log(`   - Global Roles: ${roleCount}`);
    console.log(`   - Individual users can operate with personal workspaces`);
    console.log(`   - Organizations can invite members and manage access`);
    console.log(`   - Full RBAC + PBAC support enabled`);
    console.log('');
  } catch (error) {
    console.error('❌ Failed to initialize IAM System:', error);
    throw error;
  }
}

/**
 * Create comprehensive default system roles
 * Supports both individual and organizational users
 */
async function createDefaultRoles() {
  const permissions = await Permission.find();
  const permissionMap = new Map(permissions.map(p => [p.name, p._id]));

  // ============================================
  // GLOBAL PLATFORM ROLES (For ALL Users)
  // ============================================

  // Platform Super Administrator
  const platformAdminPerms = permissions.map(p => p._id);
  await createRoleIfNotExists({
    name: 'Platform Super Admin',
    slug: 'platform-super-admin',
    description: 'Full platform access - can manage everything globally',
    scope: 'global',
    level: 0,
    isSystem: true,
    isDefault: false,
    permissions: platformAdminPerms,
  });

  // Farmer (Individual User - Default for new users)
  const farmerPermissions = [
    'users:read:own',
    'users:update:own',
    'products:create:own',
    'products:read:own',
    'products:update:own',
    'products:delete:own',
    'orders:create:own',
    'orders:read:own',
    'orders:update:own',
    'orders:cancel:own',
    'markets:read:global',
    'products:read:global',
    'analytics:read:own',
  ];

  await createRoleIfNotExists({
    name: 'Farmer',
    slug: 'farmer',
    description: 'Individual farmer with personal workspace - can operate independently without organization',
    scope: 'global',
    level: 100,
    isSystem: true,
    isDefault: true,
    permissions: farmerPermissions.map(name => permissionMap.get(name)).filter(Boolean),
  });

  // Buyer (Individual/Organization Buyer)
  const buyerPermissions = [
    'users:read:own',
    'users:update:own',
    'products:read:global',
    'orders:create:own',
    'orders:read:own',
    'orders:cancel:own',
    'markets:read:global',
  ];

  await createRoleIfNotExists({
    name: 'Buyer',
    slug: 'buyer',
    description: 'Marketplace buyer - can browse and purchase products',
    scope: 'global',
    level: 100,
    isSystem: true,
    isDefault: false,
    permissions: buyerPermissions.map(name => permissionMap.get(name)).filter(Boolean),
  });

  // Trader
  const traderPermissions = [
    'users:read:own',
    'users:update:own',
    'products:create:own',
    'products:read:global',
    'products:update:own',
    'products:delete:own',
    'orders:create:own',
    'orders:read:own',
    'orders:update:own',
    'markets:read:global',
    'analytics:read:own',
  ];

  await createRoleIfNotExists({
    name: 'Trader',
    slug: 'trader',
    description: 'Agricultural trader - can create/manage products and orders',
    scope: 'global',
    level: 100,
    isSystem: true,
    isDefault: false,
    permissions: traderPermissions.map(name => permissionMap.get(name)).filter(Boolean),
  });

  // Expert (Agricultural Advisor)
  const expertPermissions = [
    'users:read:own',
    'users:update:own',
    'products:read:global',
    'markets:read:global',
    'analytics:read:global',
  ];

  await createRoleIfNotExists({
    name: 'Expert',
    slug: 'expert',
    description: 'Agricultural expert/advisor - analytics and insights access',
    scope: 'global',
    level: 50,
    isSystem: true,
    isDefault: false,
    permissions: expertPermissions.map(name => permissionMap.get(name)).filter(Boolean),
  });

  // ============================================
  // ORGANIZATION ROLES (For Multi-Tenant)
  // ============================================

  // Organization Administrator
  const orgAdminPermissions = [
    'organization:read:organization',
    'organization:update:organization',
    'members:invite:organization',
    'members:read:organization',
    'members:update:organization',
    'members:remove:organization',
    'roles:create:organization',
    'roles:read:organization',
    'roles:update:organization',
    'roles:delete:organization',
    'users:create:organization',
    'users:read:organization',
    'users:update:organization',
    'users:delete:organization',
    'products:create:organization',
    'products:read:organization',
    'products:update:organization',
    'products:delete:organization',
    'orders:read:organization',
    'orders:update:organization',
    'marketplace:create:organization',
    'marketplace:read:organization',
    'marketplace:update:organization',
    'marketplace:delete:organization',
    'analytics:read:organization',
    'analytics:export:organization',
    'audit:read:organization',
    'settings:read:organization',
    'settings:update:organization',
  ];

  await createRoleIfNotExists({
    name: 'Organization Administrator',
    slug: 'org-admin',
    description: 'Full administrative access within an organization',
    scope: 'organization',
    level: 10,
    isSystem: true,
    isDefault: false,
    permissions: orgAdminPermissions.map(name => permissionMap.get(name)).filter(Boolean),
  });

  // Manager
  const managerPermissions = [
    'organization:read:organization',
    'members:read:organization',
    'users:read:organization',
    'users:update:organization',
    'products:create:organization',
    'products:read:organization',
    'products:update:organization',
    'orders:read:organization',
    'orders:update:organization',
    'marketplace:create:organization',
    'marketplace:read:organization',
    'marketplace:update:organization',
    'analytics:read:organization',
  ];

  await createRoleIfNotExists({
    name: 'Manager',
    slug: 'manager',
    description: 'Management access with limited administrative capabilities',
    scope: 'organization',
    level: 50,
    isSystem: true,
    isDefault: false,
    permissions: managerPermissions.map(name => permissionMap.get(name)).filter(Boolean),
  });

  // Member (Default role)
  const memberPermissions = [
    'organization:read:organization',
    'users:read:own',
    'users:update:own',
    'products:read:organization',
    'orders:create:organization',
    'orders:read:own',
    'marketplace:read:organization',
  ];

  await createRoleIfNotExists({
    name: 'Member',
    slug: 'member',
    description: 'Basic member access',
    scope: 'organization',
    level: 100,
    isSystem: true,
    isDefault: true,
    permissions: memberPermissions.map(name => permissionMap.get(name)).filter(Boolean),
  });

  // Viewer (Read-only)
  const viewerPermissions = [
    'organization:read:organization',
    'users:read:own',
    'products:read:organization',
    'marketplace:read:organization',
  ];

  await createRoleIfNotExists({
    name: 'Viewer',
    slug: 'viewer',
    description: 'Read-only access',
    scope: 'organization',
    level: 150,
    isSystem: true,
    isDefault: false,
    permissions: viewerPermissions.map(name => permissionMap.get(name)).filter(Boolean),
  });
}

/**
 * Create role if it doesn't exist
 */
async function createRoleIfNotExists(roleData: any) {
  const existing = await Role.findOne({ slug: roleData.slug, scope: roleData.scope });
  
  if (!existing) {
    await Role.create(roleData);
    console.log(`  ✓ Created role: ${roleData.name}`);
  } else {
    console.log(`  → Role already exists: ${roleData.name}`);
  }
}

export { initializeIAMSystem };
