import Permission from './permission.model';
import Role from '../users/role.model';
import OrganizationMember from '../organizations/organizationMember.model';
import AuditService from '../audit/audit.service';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../common/errors/AppError';

interface PermissionCheck {
  userId: string;
  organizationId?: string;
  resource: string;
  action: string;
  scope?: 'global' | 'organization' | 'own';
  ownerId?: string; // For 'own' scope validation
}

class AuthorizationService {
  /**
   * Check if user has permission
   */
  async hasPermission(check: PermissionCheck): Promise<boolean> {
    try {
      await this.requirePermission(check);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Require permission (throws if unauthorized)
   */
  async requirePermission(check: PermissionCheck): Promise<void> {
    const {
      userId,
      organizationId,
      resource,
      action,
      scope = 'organization',
      ownerId,
    } = check;

    // Get user's permissions
    const permissions = await this.getUserPermissions(userId, organizationId);

    // Check for matching permission
    const permissionName = `${resource}:${action}:${scope}`;
    const hasPermission = permissions.includes(permissionName);

    if (!hasPermission) {
      // Check if user has a broader scope permission
      if (scope === 'own') {
        const orgScopePermission = `${resource}:${action}:organization`;
        if (permissions.includes(orgScopePermission)) {
          return; // Has organization-level access
        }
      }

      if (scope === 'organization') {
        const globalScopePermission = `${resource}:${action}:global`;
        if (permissions.includes(globalScopePermission)) {
          return; // Has global access
        }
      }

      // No permission found
      throw new ForbiddenError(`Permission denied: ${permissionName}`);
    }

    // If scope is 'own', verify ownership
    if (scope === 'own' && ownerId && ownerId !== userId) {
      throw new ForbiddenError('You can only access your own resources');
    }
  }

  /**
   * Get all permissions for a user in an organization
   */
  async getUserPermissions(
    userId: string,
    organizationId?: string
  ): Promise<string[]> {
    const allPermissions: Set<string> = new Set();

    if (organizationId) {
      // Get organization membership
      const membership = await OrganizationMember.findOne({
        user: userId,
        organization: organizationId,
        status: 'active',
      }).populate({
        path: 'role',
        populate: {
          path: 'permissions',
        },
      });

      if (membership && membership.role) {
        const role = membership.role as any;

        // Add role permissions
        if (role.permissions) {
          for (const perm of role.permissions) {
            if (perm.name) {
              allPermissions.add(perm.name);
            }
          }
        }

        // Add inherited permissions
        if (role.inheritsFrom) {
          const inheritedPerms = await this.getRolePermissions(role.inheritsFrom);
          inheritedPerms.forEach(p => allPermissions.add(p));
        }

        // Add custom granted permissions
        if (membership.customPermissions?.granted) {
          membership.customPermissions.granted.forEach(p => allPermissions.add(p));
        }

        // Remove custom revoked permissions
        if (membership.customPermissions?.revoked) {
          membership.customPermissions.revoked.forEach(p => allPermissions.delete(p));
        }
      }
    }

    return Array.from(allPermissions);
  }

  /**
   * Get all permissions for a role (including inherited)
   */
  async getRolePermissions(roleId: string): Promise<string[]> {
    const permissions: Set<string> = new Set();

    const role = await Role.findById(roleId).populate('permissions');
    if (!role) return [];

    // Add role's direct permissions
    if (role.permissions) {
      for (const perm of role.permissions as any[]) {
        if (perm.name) {
          permissions.add(perm.name);
        }
      }
    }

    // Add inherited permissions
    if (role.inheritsFrom) {
      const inheritedPerms = await this.getRolePermissions(role.inheritsFrom.toString());
      inheritedPerms.forEach(p => permissions.add(p));
    }

    return Array.from(permissions);
  }

  /**
   * Grant custom permission to organization member
   */
  async grantCustomPermission(
    organizationId: string,
    memberId: string,
    permission: string,
    grantedBy: string
  ): Promise<void> {
    const member = await OrganizationMember.findOne({
      _id: memberId,
      organization: organizationId,
      status: 'active',
    });

    if (!member) {
      throw new NotFoundError('Member not found');
    }

    // Verify permission exists
    const permissionExists = await Permission.findOne({ name: permission });
    if (!permissionExists) {
      throw new BadRequestError('Invalid permission');
    }

    // Add to granted permissions (if not already there)
    if (!member.customPermissions.granted.includes(permission)) {
      member.customPermissions.granted.push(permission);
    }

    // Remove from revoked if present
    member.customPermissions.revoked = member.customPermissions.revoked.filter(
      p => p !== permission
    );

    await member.save();

    // Audit log
    await AuditService.log({
      action: 'permission.granted',
      resource: 'organization_member',
      resourceId: memberId,
      userId: grantedBy,
      organizationId,
      details: {
        after: { permission },
      },
      risk: 'high',
    });
  }

  /**
   * Revoke custom permission from organization member
   */
  async revokeCustomPermission(
    organizationId: string,
    memberId: string,
    permission: string,
    revokedBy: string
  ): Promise<void> {
    const member = await OrganizationMember.findOne({
      _id: memberId,
      organization: organizationId,
      status: 'active',
    });

    if (!member) {
      throw new NotFoundError('Member not found');
    }

    // Add to revoked permissions (if not already there)
    if (!member.customPermissions.revoked.includes(permission)) {
      member.customPermissions.revoked.push(permission);
    }

    // Remove from granted if present
    member.customPermissions.granted = member.customPermissions.granted.filter(
      p => p !== permission
    );

    await member.save();

    // Audit log
    await AuditService.log({
      action: 'permission.revoked',
      resource: 'organization_member',
      resourceId: memberId,
      userId: revokedBy,
      organizationId,
      details: {
        after: { permission },
      },
      risk: 'high',
    });
  }

  /**
   * Check if user is organization admin
   */
  async isOrganizationAdmin(userId: string, organizationId: string): Promise<boolean> {
    const membership = await OrganizationMember.findOne({
      user: userId,
      organization: organizationId,
      status: 'active',
    }).populate('role');

    if (!membership) return false;

    const role = membership.role as any;
    return role && role.level <= 20; // Admin level threshold
  }

  /**
   * Check if user is organization owner
   */
  async isOrganizationOwner(userId: string, organizationId: string): Promise<boolean> {
    const Organization = require('../organizations/organization.model').default;
    const org = await Organization.findById(organizationId);
    
    return org && org.owner.toString() === userId;
  }

  /**
   * Get user's role in organization
   */
  async getUserRole(userId: string, organizationId: string): Promise<any> {
    const membership = await OrganizationMember.findOne({
      user: userId,
      organization: organizationId,
      status: 'active',
    }).populate('role');

    return membership?.role;
  }
}

export default new AuthorizationService();
