import Permission, { IPermission } from './permission.model';
import Role from '../users/role.model';
import AuditService from '../audit/audit.service';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../../common/errors/AppError';

interface CreatePermissionData {
  resource: string;
  action: string;
  scope: 'global' | 'organization' | 'own';
  description: string;
  category: string;
}

class PermissionService {
  /**
   * Create a new permission
   */
  async create(data: CreatePermissionData): Promise<IPermission> {
    const name = `${data.resource}:${data.action}:${data.scope}`;

    // Check if permission already exists
    const existing = await Permission.findOne({ name });
    if (existing) {
      throw new ConflictError('Permission already exists');
    }

    const permission = await Permission.create({
      ...data,
      name,
      isSystem: false,
    });

    return permission;
  }

  /**
   * Get permission by name
   */
  async getByName(name: string): Promise<IPermission> {
    const permission = await Permission.findOne({ name });
    
    if (!permission) {
      throw new NotFoundError('Permission not found');
    }

    return permission;
  }

  /**
   * Get all permissions
   */
  async getAll(filters?: {
    category?: string;
    resource?: string;
    scope?: string;
  }): Promise<IPermission[]> {
    const query: any = {};

    if (filters?.category) query.category = filters.category;
    if (filters?.resource) query.resource = filters.resource;
    if (filters?.scope) query.scope = filters.scope;

    return Permission.find(query).sort({ category: 1, name: 1 });
  }

  /**
   * Get permissions by category
   */
  async getByCategory(category: string): Promise<IPermission[]> {
    return Permission.find({ category }).sort({ name: 1 });
  }

  /**
   * Delete permission
   */
  async delete(permissionId: string, deletedBy: string): Promise<void> {
    const permission = await Permission.findById(permissionId);

    if (!permission) {
      throw new NotFoundError('Permission not found');
    }

    if (permission.isSystem) {
      throw new BadRequestError('Cannot delete system permission');
    }

    // Remove from all roles
    await Role.updateMany(
      { permissions: permissionId },
      { $pull: { permissions: permissionId } }
    );

    await permission.deleteOne();

    // Audit log
    await AuditService.log({
      action: 'permission.deleted',
      resource: 'permission',
      resourceId: permissionId,
      userId: deletedBy,
      details: {
        before: permission.toObject(),
      },
      risk: 'high',
    });
  }

  /**
   * Initialize default permissions
   */
  async initializeDefaultPermissions(): Promise<void> {
    const defaultPermissions = this.getDefaultPermissions();

    for (const perm of defaultPermissions) {
      const name = `${perm.resource}:${perm.action}:${perm.scope}`;
      const existing = await Permission.findOne({ name });
      if (!existing) {
        await Permission.create({ ...perm, name, isSystem: true });
      }
    }
  }

  /**
   * Get default system permissions
   */
  private getDefaultPermissions(): CreatePermissionData[] {
    return [
      // User Management
      {
        resource: 'users',
        action: 'create',
        scope: 'organization',
        description: 'Create new users in the organization',
        category: 'users',
      },
      {
        resource: 'users',
        action: 'read',
        scope: 'organization',
        description: 'View users in the organization',
        category: 'users',
      },
      {
        resource: 'users',
        action: 'update',
        scope: 'organization',
        description: 'Update users in the organization',
        category: 'users',
      },
      {
        resource: 'users',
        action: 'delete',
        scope: 'organization',
        description: 'Delete users in the organization',
        category: 'users',
      },
      {
        resource: 'users',
        action: 'read',
        scope: 'own',
        description: 'View own user profile',
        category: 'users',
      },
      {
        resource: 'users',
        action: 'update',
        scope: 'own',
        description: 'Update own user profile',
        category: 'users',
      },

      // Role Management
      {
        resource: 'roles',
        action: 'create',
        scope: 'organization',
        description: 'Create roles in the organization',
        category: 'roles',
      },
      {
        resource: 'roles',
        action: 'read',
        scope: 'organization',
        description: 'View roles in the organization',
        category: 'roles',
      },
      {
        resource: 'roles',
        action: 'update',
        scope: 'organization',
        description: 'Update roles in the organization',
        category: 'roles',
      },
      {
        resource: 'roles',
        action: 'delete',
        scope: 'organization',
        description: 'Delete roles in the organization',
        category: 'roles',
      },

      // Organization Management
      {
        resource: 'organization',
        action: 'read',
        scope: 'organization',
        description: 'View organization details',
        category: 'organization',
      },
      {
        resource: 'organization',
        action: 'update',
        scope: 'organization',
        description: 'Update organization settings',
        category: 'organization',
      },
      {
        resource: 'organization',
        action: 'delete',
        scope: 'organization',
        description: 'Delete organization',
        category: 'organization',
      },

      // Member Management
      {
        resource: 'members',
        action: 'invite',
        scope: 'organization',
        description: 'Invite members to the organization',
        category: 'members',
      },
      {
        resource: 'members',
        action: 'read',
        scope: 'organization',
        description: 'View organization members',
        category: 'members',
      },
      {
        resource: 'members',
        action: 'update',
        scope: 'organization',
        description: 'Update member roles and permissions',
        category: 'members',
      },
      {
        resource: 'members',
        action: 'remove',
        scope: 'organization',
        description: 'Remove members from the organization',
        category: 'members',
      },

      // Product Management
      {
        resource: 'products',
        action: 'create',
        scope: 'organization',
        description: 'Create products',
        category: 'products',
      },
      {
        resource: 'products',
        action: 'read',
        scope: 'organization',
        description: 'View products',
        category: 'products',
      },
      {
        resource: 'products',
        action: 'update',
        scope: 'organization',
        description: 'Update products',
        category: 'products',
      },
      {
        resource: 'products',
        action: 'delete',
        scope: 'organization',
        description: 'Delete products',
        category: 'products',
      },

      // Orders Management
      {
        resource: 'orders',
        action: 'create',
        scope: 'organization',
        description: 'Create orders',
        category: 'orders',
      },
      {
        resource: 'orders',
        action: 'read',
        scope: 'organization',
        description: 'View all orders',
        category: 'orders',
      },
      {
        resource: 'orders',
        action: 'read',
        scope: 'own',
        description: 'View own orders',
        category: 'orders',
      },
      {
        resource: 'orders',
        action: 'update',
        scope: 'organization',
        description: 'Update orders',
        category: 'orders',
      },
      {
        resource: 'orders',
        action: 'delete',
        scope: 'organization',
        description: 'Delete orders',
        category: 'orders',
      },

      // Marketplace Management
      {
        resource: 'marketplace',
        action: 'create',
        scope: 'organization',
        description: 'Create marketplace listings',
        category: 'marketplace',
      },
      {
        resource: 'marketplace',
        action: 'read',
        scope: 'organization',
        description: 'View marketplace listings',
        category: 'marketplace',
      },
      {
        resource: 'marketplace',
        action: 'update',
        scope: 'organization',
        description: 'Update marketplace listings',
        category: 'marketplace',
      },
      {
        resource: 'marketplace',
        action: 'delete',
        scope: 'organization',
        description: 'Delete marketplace listings',
        category: 'marketplace',
      },

      // Analytics
      {
        resource: 'analytics',
        action: 'read',
        scope: 'organization',
        description: 'View organization analytics',
        category: 'analytics',
      },
      {
        resource: 'analytics',
        action: 'export',
        scope: 'organization',
        description: 'Export analytics data',
        category: 'analytics',
      },

      // Audit Logs
      {
        resource: 'audit',
        action: 'read',
        scope: 'organization',
        description: 'View audit logs',
        category: 'audit',
      },

      // Settings
      {
        resource: 'settings',
        action: 'read',
        scope: 'organization',
        description: 'View organization settings',
        category: 'settings',
      },
      {
        resource: 'settings',
        action: 'update',
        scope: 'organization',
        description: 'Update organization settings',
        category: 'settings',
      },

      // API Access
      {
        resource: 'api',
        action: 'access',
        scope: 'organization',
        description: 'Access organization API',
        category: 'api',
      },
    ];
  }
}

export default new PermissionService();
