import PermissionService from '../modules/permissions/permission.service';
import Role from '../modules/users/role.model';
import Permission from '../modules/permissions/permission.model';

/**
 * Initialize IAM system with default permissions and roles
 */
async function initializeIAMSystem() {
  console.log('🚀 Initializing IAM System...');

  try {
    // 1. Initialize default permissions
    console.log('📋 Creating default permissions...');
    await PermissionService.initializeDefaultPermissions();
    const permissionCount = await Permission.countDocuments();
    console.log(`✅ ${permissionCount} permissions initialized`);

    // 2. Create default global roles
    console.log('👥 Creating default global roles...');
    await createDefaultRoles();
    const roleCount = await Role.countDocuments({ scope: 'global' });
    console.log(`✅ ${roleCount} global roles created`);

    console.log('✅ IAM System initialized successfully!');
  } catch (error) {
    console.error('❌ Failed to initialize IAM System:', error);
    throw error;
  }
}

/**
 * Create default system roles
 */
async function createDefaultRoles() {
  const permissions = await Permission.find();
  const permissionMap = new Map(permissions.map(p => [p.name, p._id]));

  // Platform Administrator (Super Admin)
  const platformAdminPerms = permissions.map(p => p._id);
  await createRoleIfNotExists({
    name: 'Platform Administrator',
    slug: 'platform-admin',
    description: 'Full platform access with all permissions',
    scope: 'global',
    level: 0,
    isSystem: true,
    isDefault: false,
    permissions: platformAdminPerms,
  });

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
