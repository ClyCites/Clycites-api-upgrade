import ResourcePolicy, { IResourcePolicy } from './resourcePolicy.model';
import OrganizationMember from '../organizations/organizationMember.model';
import AuthorizationService from './authorization.service';
import { AuditService } from '../audit';
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from '../../common/errors/AppError';

interface ResourceAccessCheck {
  userId: string;
  resourceType: string;
  resourceId: string;
  permission: string; // e.g., 'read', 'write', 'delete', 'share'
  context?: {
    ipAddress?: string;
    organizationId?: string;
  };
}

interface CreatePolicyData {
  resourceType: string;
  resourceId: string;
  ownerType: 'user' | 'organization';
  ownerId: string;
  visibility?: 'private' | 'organization' | 'public' | 'restricted';
  createdBy: string;
}

interface GrantAccessData {
  principalId: string;
  principalType: 'user' | 'role' | 'organization';
  permissions: string[];
  conditions?: {
    expiresAt?: Date;
    ipRestriction?: string[];
  };
  grantedBy: string;
}

class ResourceAuthorizationService {
  /**
   * Create resource policy
   */
  async createPolicy(data: CreatePolicyData): Promise<IResourcePolicy> {
    const policy = await ResourcePolicy.create({
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      ownerType: data.ownerType,
      ownerId: data.ownerId,
      visibility: data.visibility || 'private',
      grants: [],
      denials: [],
      createdBy: data.createdBy,
    });

    // Audit log
    await AuditService.log({
      action: 'resource_policy.created',
      resource: 'resource_policy',
      resourceId: policy._id.toString(),
      userId: data.createdBy,
      details: {
        after: {
          resourceType: data.resourceType,
          visibility: data.visibility,
        },
      },
    });

    return policy;
  }

  /**
   * Check if user has access to resource
   */
  async hasAccess(check: ResourceAccessCheck): Promise<boolean> {
    try {
      await this.requireAccess(check);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Require access (throws if unauthorized)
   */
  async requireAccess(check: ResourceAccessCheck): Promise<void> {
    const { userId, resourceType, resourceId, permission, context } = check;

    // Get resource policy
    const policy = await ResourcePolicy.findOne({
      resourceType,
      resourceId,
    });

    if (!policy) {
      // No policy = only owner can access
      throw new ForbiddenError('Access denied: No policy found for this resource');
    }

    // Owner always has full access
    if (
      (policy.ownerType === 'user' && policy.ownerId.toString() === userId) ||
      (policy.ownerType === 'organization' && 
       context?.organizationId && 
       policy.ownerId.toString() === context.organizationId)
    ) {
      return; // Access granted
    }

    // Check explicit denials first (deny overrides allow)
    const isDenied = this.checkDenial(policy, userId, permission);
    if (isDenied) {
      throw new ForbiddenError(`Access explicitly denied for permission: ${permission}`);
    }

    // Check visibility-based access
    if (policy.visibility === 'public' && permission === 'read') {
      return; // Public resources allow read to everyone
    }

    if (policy.visibility === 'organization' && context?.organizationId) {
      // Check if user is member of the organization
      const isMember = await this.isOrganizationMember(userId, context.organizationId);
      if (isMember && (permission === 'read' || permission === 'view')) {
        return; // Organization members can read org resources
      }
    }

    // Check explicit grants
    const hasGrant = await this.checkGrant(policy, userId, permission, context);
    if (hasGrant) {
      return; // Access granted
    }

    // Check role-based grants
    if (context?.organizationId) {
      const hasRoleGrant = await this.checkRoleGrant(
        policy,
        userId,
        context.organizationId,
        permission
      );
      if (hasRoleGrant) {
        return; // Access granted via role
      }
    }

    // No access found
    throw new ForbiddenError(`Access denied for permission: ${permission} on ${resourceType}`);
  }

  /**
   * Grant access to resource
   */
  async grantAccess(
    resourceType: string,
    resourceId: string,
    data: GrantAccessData
  ): Promise<IResourcePolicy> {
    const policy = await ResourcePolicy.findOne({
      resourceType,
      resourceId,
    });

    if (!policy) {
      throw new NotFoundError('Resource policy not found');
    }

    // Check if grant already exists
    const existingGrant = policy.grants.find(
      g =>
        g.principal.toString() === data.principalId &&
        g.principalType === data.principalType
    );

    if (existingGrant) {
      // Update existing grant
      existingGrant.permissions = [
        ...new Set([...existingGrant.permissions, ...data.permissions]),
      ];
      if (data.conditions?.expiresAt) {
        existingGrant.expiresAt = data.conditions.expiresAt;
      }
    } else {
      // Add new grant
      policy.grants.push({
        principal: data.principalId as any,
        principalType: data.principalType,
        permissions: data.permissions,
        conditions: {
          timeRestriction: data.conditions?.expiresAt
            ? { validUntil: data.conditions.expiresAt }
            : undefined,
          ipRestriction: data.conditions?.ipRestriction,
        },
        grantedBy: data.grantedBy as any,
        grantedAt: new Date(),
        expiresAt: data.conditions?.expiresAt,
      } as any);
    }

    await policy.save();

    // Audit log
    await AuditService.log({
      action: 'resource_policy.access_granted',
      resource: 'resource_policy',
      resourceId: policy._id.toString(),
      userId: data.grantedBy,
      details: {
        after: {
          principal: data.principalId,
          principalType: data.principalType,
          permissions: data.permissions,
        },
      },
    });

    return policy;
  }

  /**
   * Revoke access to resource
   */
  async revokeAccess(
    resourceType: string,
    resourceId: string,
    principalId: string,
    principalType: 'user' | 'role' | 'organization',
    revokedBy: string
  ): Promise<IResourcePolicy> {
    const policy = await ResourcePolicy.findOne({
      resourceType,
      resourceId,
    });

    if (!policy) {
      throw new NotFoundError('Resource policy not found');
    }

    // Remove grant
    policy.grants = policy.grants.filter(
      g =>
        !(
          g.principal.toString() === principalId &&
          g.principalType === principalType
        )
    );

    await policy.save();

    // Audit log
    await AuditService.log({
      action: 'resource_policy.access_revoked',
      resource: 'resource_policy',
      resourceId: policy._id.toString(),
      userId: revokedBy,
      details: {
        after: {
          principal: principalId,
          principalType,
        },
      },
    });

    return policy;
  }

  /**
   * Deny access to resource (explicit deny)
   */
  async denyAccess(
    resourceType: string,
    resourceId: string,
    principalId: string,
    principalType: 'user' | 'role' | 'organization',
    permissions: string[],
    deniedBy: string,
    reason?: string
  ): Promise<IResourcePolicy> {
    const policy = await ResourcePolicy.findOne({
      resourceType,
      resourceId,
    });

    if (!policy) {
      throw new NotFoundError('Resource policy not found');
    }

    // Add denial
    policy.denials.push({
      principal: principalId as any,
      principalType,
      permissions,
      deniedBy: deniedBy as any,
      deniedAt: new Date(),
      reason,
    } as any);

    await policy.save();

    // Audit log
    await AuditService.log({
      action: 'resource_policy.access_denied',
      resource: 'resource_policy',
      resourceId: policy._id.toString(),
      userId: deniedBy,
      details: {
        after: {
          principal: principalId,
          principalType,
          permissions,
          reason,
        },
      },
      risk: 'medium',
    });

    return policy;
  }

  /**
   * Update resource visibility
   */
  async updateVisibility(
    resourceType: string,
    resourceId: string,
    visibility: 'private' | 'organization' | 'public' | 'restricted',
    updatedBy: string
  ): Promise<IResourcePolicy> {
    const policy = await ResourcePolicy.findOne({
      resourceType,
      resourceId,
    });

    if (!policy) {
      throw new NotFoundError('Resource policy not found');
    }

    const oldVisibility = policy.visibility;
    policy.visibility = visibility;
    await policy.save();

    // Audit log
    await AuditService.log({
      action: 'resource_policy.visibility_updated',
      resource: 'resource_policy',
      resourceId: policy._id.toString(),
      userId: updatedBy,
      details: {
        before: { visibility: oldVisibility },
        after: { visibility },
      },
    });

    return policy;
  }

  /**
   * Check if user is denied access
   */
  private checkDenial(policy: IResourcePolicy, userId: string, permission: string): boolean {
    return policy.denials.some(
      d =>
        d.principal.toString() === userId &&
        d.permissions.includes(permission)
    );
  }

  /**
   * Check if user has explicit grant
   */
  private async checkGrant(
    policy: IResourcePolicy,
    userId: string,
    permission: string,
    context?: { ipAddress?: string }
  ): Promise<boolean> {
    const grant = policy.grants.find(
      g =>
        g.principalType === 'user' &&
        g.principal.toString() === userId &&
        g.permissions.includes(permission)
    );

    if (!grant) {
      return false;
    }

    // Check if grant is expired
    if (grant.expiresAt && grant.expiresAt < new Date()) {
      return false;
    }

    // Check time restrictions
    if (grant.conditions?.timeRestriction) {
      const now = new Date();
      if (
        grant.conditions.timeRestriction.validFrom &&
        grant.conditions.timeRestriction.validFrom > now
      ) {
        return false;
      }
      if (
        grant.conditions.timeRestriction.validUntil &&
        grant.conditions.timeRestriction.validUntil < now
      ) {
        return false;
      }
    }

    // Check IP restrictions
    if (grant.conditions?.ipRestriction && context?.ipAddress) {
      if (!grant.conditions.ipRestriction.includes(context.ipAddress)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if user has role-based grant
   */
  private async checkRoleGrant(
    policy: IResourcePolicy,
    userId: string,
    organizationId: string,
    permission: string
  ): Promise<boolean> {
    // Get user's organization membership
    const membership = await OrganizationMember.findOne({
      user: userId,
      organization: organizationId,
      status: 'active',
    });

    if (!membership) {
      return false;
    }

    // Check if role has grant
    const grant = policy.grants.find(
      g =>
        g.principalType === 'role' &&
        g.principal.toString() === membership.role.toString() &&
        g.permissions.includes(permission)
    );

    if (!grant) {
      return false;
    }

    // Check if grant is expired
    if (grant.expiresAt && grant.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Check if user is organization member
   */
  private async isOrganizationMember(userId: string, organizationId: string): Promise<boolean> {
    const membership = await OrganizationMember.findOne({
      user: userId,
      organization: organizationId,
      status: 'active',
    });

    return !!membership;
  }

  /**
   * Get all policies for a resource
   */
  async getResourcePolicies(resourceType: string, resourceId: string): Promise<IResourcePolicy[]> {
    return ResourcePolicy.find({
      resourceType,
      resourceId,
    });
  }

  /**
   * Get all resources accessible by user
   */
  async getUserAccessibleResources(
    userId: string,
    resourceType: string,
    organizationId?: string
  ): Promise<string[]> {
    const policies = await ResourcePolicy.find({
      resourceType,
      $or: [
        // Resources owned by user
        { ownerType: 'user', ownerId: userId },
        // Resources owned by user's organization
        organizationId
          ? { ownerType: 'organization', ownerId: organizationId }
          : {},
        // Public resources
        { visibility: 'public' },
        // Resources with explicit grants
        {
          'grants.principalType': 'user',
          'grants.principal': userId,
        },
      ],
    });

    return policies.map(p => p.resourceId.toString());
  }
}

export default new ResourceAuthorizationService();
