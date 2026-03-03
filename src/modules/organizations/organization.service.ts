import Organization, { IOrganization } from './organization.model';
import OrganizationMember, { IOrganizationMember } from './organizationMember.model';
import { User, Role } from '../users';
import { AuditService } from '../audit';
import crypto from 'crypto';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../../common/errors/AppError';
import { Types } from 'mongoose';

interface CreateOrganizationData {
  name: string;
  slug?: string;
  type: 'enterprise' | 'cooperative' | 'government' | 'individual';
  industry: string;
  description?: string;
  email: string;
  address: {
    city: string;
    state: string;
    country: string;
  };
  ownerId: string;
}

interface InviteMemberData {
  email: string;
  roleId: string;
  department?: string;
  title?: string;
  invitedBy: string;
}

interface InviteMemberResult {
  member: IOrganizationMember;
  invitationUrl: string;
}

interface UserOrganization {
  organization: Types.ObjectId | IOrganization;
  role: Types.ObjectId | { name: string; description?: string };
  joinedAt?: Date;
  department?: string;
  title?: string;
}

export type OrganizationUiStatus = 'active' | 'disabled';
export type OrganizationMemberUiStatus = 'active' | 'disabled';

interface OrganizationMemberFilters {
  status?: string;
  uiStatus?: OrganizationMemberUiStatus;
  page?: number;
  limit?: number;
}

interface PaginatedOrganizationMembers {
  members: IOrganizationMember[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ListOrganizationsFilters {
  page?: number;
  limit?: number;
  status?: string;
  uiStatus?: OrganizationUiStatus;
  search?: string;
}

interface PaginatedOrganizations {
  organizations: IOrganization[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class OrganizationService {
  /**
   * Create a new organization
   */
  async create(data: CreateOrganizationData): Promise<IOrganization> {
    // Verify owner exists
    const owner = await User.findById(data.ownerId);
    if (!owner) {
      throw new NotFoundError('Owner user not found');
    }

    // Generate slug if not provided
    let slug = data.slug || this.generateSlug(data.name);
    
    // Ensure slug is unique
    const existingOrg = await Organization.findOne({ slug });
    if (existingOrg) {
      slug = `${slug}-${Date.now()}`;
    }

    // Create organization
    const organization = await Organization.create({
      ...data,
      slug,
      owner: data.ownerId,
      status: 'pending',
      stats: {
        memberCount: 1,
        adminCount: 1,
        lastActivityAt: new Date(),
      },
    });

    // Get default admin role or create one
    let adminRole = await Role.findOne({
      slug: 'org-admin',
      organization: organization._id,
    });

    if (!adminRole) {
      adminRole = await Role.create({
        name: 'Organization Admin',
        slug: 'org-admin',
        description: 'Full administrative access to the organization',
        organization: organization._id,
        scope: 'organization',
        level: 10,
        isSystem: true,
        permissions: [], // Will be populated with all permissions
      });
    }

    // Add owner as first member with admin role
    await OrganizationMember.create({
      organization: organization._id,
      user: data.ownerId,
      role: adminRole._id,
      status: 'active',
      joinedAt: new Date(),
    });

    // Audit log
    await AuditService.log({
      action: 'organization.created',
      resource: 'organization',
      resourceId: organization._id.toString(),
      userId: data.ownerId,
      organizationId: organization._id.toString(),
      details: {
        after: {
          name: organization.name,
          slug: organization.slug,
          type: organization.type,
        },
      },
    });

    return organization;
  }

  /**
   * Get organization by ID
   */
  async getById(orgId: string): Promise<IOrganization> {
    const organization = await Organization.findById(orgId);
    
    if (!organization) {
      throw new NotFoundError('Organization not found');
    }

    return organization;
  }

  /**
   * Get organization by slug
   */
  async getBySlug(slug: string): Promise<IOrganization> {
    const organization = await Organization.findOne({ slug });
    
    if (!organization) {
      throw new NotFoundError('Organization not found');
    }

    return organization;
  }

  /**
   * Update organization
   */
  async update(
    orgId: string,
    updateData: Partial<IOrganization>,
    updatedBy: string
  ): Promise<IOrganization> {
    const organization = await this.getById(orgId);

    // Store before state
    const beforeState = organization.toObject();

    // Update organization
    Object.assign(organization, updateData);
    await organization.save();

    // Audit log
    await AuditService.log({
      action: 'organization.updated',
      resource: 'organization',
      resourceId: orgId,
      userId: updatedBy,
      organizationId: orgId,
      details: {
        before: beforeState,
        after: organization.toObject(),
      },
    });

    return organization;
  }

  /**
   * Invite member to organization
   */
  async inviteMember(orgId: string, data: InviteMemberData): Promise<InviteMemberResult> {
    const organization = await this.getById(orgId);

    // Check if organization is active
    if (organization.status !== 'active') {
      throw new BadRequestError('Cannot invite members to inactive organization');
    }

    // Check member limit
    if (organization.stats.memberCount >= organization.settings.billing.maxUsers) {
      throw new BadRequestError('Organization has reached maximum member limit');
    }

    // Find user by email
    const user = await User.findOne({ email: data.email });

    // Check if already a member
    if (user) {
      const existingMember = await OrganizationMember.findOne({
        organization: orgId,
        user: user._id,
        status: { $in: ['active', 'invited'] },
      });

      if (existingMember) {
        throw new ConflictError('User is already a member or has a pending invitation');
      }
    }

    // Verify role exists and belongs to this organization
    const role = await Role.findOne({
      _id: data.roleId,
      $or: [{ organization: orgId }, { scope: 'global' }],
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create member invitation
    const member = await OrganizationMember.create({
      organization: orgId,
      user: user?._id,
      role: role._id,
      status: 'invited',
      invitedBy: data.invitedBy,
      invitedAt: new Date(),
      invitationToken,
      invitationExpiresAt,
      department: data.department,
      title: data.title,
    });

    // TODO: Send invitation email

    // Audit log
    await AuditService.log({
      action: 'organization.member.invited',
      resource: 'organization_member',
      resourceId: member._id.toString(),
      userId: data.invitedBy,
      organizationId: orgId,
      details: {
        after: {
          email: data.email,
          role: role.name,
        },
      },
    });

    return {
      member,
      invitationUrl: `/invitations/accept?token=${invitationToken}`,
    };
  }

  /**
   * Accept organization invitation
   */
  async acceptInvitation(token: string, userId: string): Promise<IOrganizationMember> {
    const member = await OrganizationMember.findOne({
      invitationToken: token,
      status: 'invited',
    });

    if (!member) {
      throw new NotFoundError('Invalid or expired invitation');
    }

    if (member.invitationExpiresAt && member.invitationExpiresAt < new Date()) {
      throw new BadRequestError('Invitation has expired');
    }

    // Update member status
    member.user = new Types.ObjectId(userId);
    member.status = 'active';
    member.joinedAt = new Date();
    member.invitationToken = undefined;
    await member.save();

    // Update organization stats
    await Organization.findByIdAndUpdate(member.organization, {
      $inc: { 'stats.memberCount': 1 },
      'stats.lastActivityAt': new Date(),
    });

    // Audit log
    await AuditService.log({
      action: 'organization.member.joined',
      resource: 'organization_member',
      resourceId: member._id.toString(),
      userId,
      organizationId: member.organization.toString(),
      details: {
        after: {
          status: 'active',
        },
      },
    });

    return member;
  }

  /**
   * Get organization members
   */
  async getMembers(orgId: string, filters?: OrganizationMemberFilters): Promise<PaginatedOrganizationMembers> {
    const page = Math.max(1, Number(filters?.page || 1));
    const limit = Math.max(1, Math.min(100, Number(filters?.limit || 20)));
    const skip = (page - 1) * limit;
    const query: Record<string, unknown> = { organization: orgId };

    if (filters?.status) {
      query.status = filters.status;
    } else if (filters?.uiStatus) {
      query.status = { $in: this.mapUiStatusToMemberStatuses(filters.uiStatus) };
    }

    const [members, total] = await Promise.all([
      OrganizationMember.find(query)
        .populate('user', 'firstName lastName email profileImage')
        .populate('role', 'name description')
        .sort({ joinedAt: -1 })
        .skip(skip)
        .limit(limit),
      OrganizationMember.countDocuments(query),
    ]);

    return {
      members,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Remove member from organization
   */
  async removeMember(
    orgId: string,
    memberId: string,
    removedBy: string,
    reason?: string
  ): Promise<void> {
    const member = await OrganizationMember.findOne({
      _id: memberId,
      organization: orgId,
    });

    if (!member) {
      throw new NotFoundError('Member not found');
    }

    // Store before state
    const beforeState = member.toObject();

    // Update member status
    member.status = 'removed';
    member.removedBy = new Types.ObjectId(removedBy);
    member.removedAt = new Date();
    member.removalReason = reason;
    await member.save();

    // Update organization stats
    if (beforeState.status === 'active') {
      await Organization.findByIdAndUpdate(orgId, {
        $inc: { 'stats.memberCount': -1 },
      });
    }

    // Audit log
    await AuditService.log({
      action: 'organization.member.removed',
      resource: 'organization_member',
      resourceId: memberId,
      userId: removedBy,
      organizationId: orgId,
      details: {
        before: beforeState,
        after: { status: 'removed', reason },
      },
    });
  }

  async setMemberStatus(
    orgId: string,
    memberId: string,
    action: 'enable' | 'disable',
    actedBy: string,
    reason?: string
  ): Promise<IOrganizationMember> {
    const member = await OrganizationMember.findOne({
      _id: memberId,
      organization: orgId,
    });

    if (!member) {
      throw new NotFoundError('Member not found');
    }

    const beforeState = member.toObject();
    const currentStatus = member.status;

    if (action === 'disable') {
      if (currentStatus === 'removed') {
        throw new BadRequestError('Cannot disable a removed member');
      }

      if (currentStatus === 'suspended') {
        return member;
      }

      member.status = 'suspended';
      member.suspendedBy = new Types.ObjectId(actedBy);
      member.suspendedAt = new Date();
      member.suspensionReason = reason;

      if (currentStatus === 'active') {
        await Organization.findByIdAndUpdate(orgId, {
          $inc: { 'stats.memberCount': -1 },
          'stats.lastActivityAt': new Date(),
        });
      }
    } else {
      if (currentStatus === 'removed') {
        throw new BadRequestError('Cannot enable a removed member');
      }

      if (currentStatus === 'invited') {
        throw new BadRequestError('Cannot enable an invited member before invitation acceptance');
      }

      if (currentStatus === 'active') {
        return member;
      }

      member.status = 'active';
      member.suspendedBy = undefined;
      member.suspendedAt = undefined;
      member.suspensionReason = undefined;
      if (!member.joinedAt) {
        member.joinedAt = new Date();
      }

      if (currentStatus === 'suspended') {
        await Organization.findByIdAndUpdate(orgId, {
          $inc: { 'stats.memberCount': 1 },
          'stats.lastActivityAt': new Date(),
        });
      }
    }

    await member.save();

    await AuditService.log({
      action: `organization.member.${action}d`,
      resource: 'organization_member',
      resourceId: memberId,
      userId: actedBy,
      organizationId: orgId,
      details: {
        before: beforeState,
        after: {
          status: member.status,
          reason,
        },
      },
    });

    return member;
  }

  async setOrganizationStatus(
    orgId: string,
    action: 'enable' | 'disable',
    actedBy: string,
    reason?: string
  ): Promise<IOrganization> {
    const organization = await this.getById(orgId);
    const beforeState = organization.toObject();
    const currentStatus = organization.status;

    if (action === 'disable') {
      if (currentStatus === 'suspended' || currentStatus === 'archived') {
        return organization;
      }

      organization.status = 'suspended';
      organization.suspendedAt = new Date();
    } else {
      if (currentStatus === 'active') {
        return organization;
      }

      if (currentStatus === 'archived') {
        throw new BadRequestError('Archived organizations cannot be re-enabled');
      }

      organization.status = 'active';
      organization.suspendedAt = undefined;
    }

    await organization.save();

    await AuditService.log({
      action: `organization.${action}d`,
      resource: 'organization',
      resourceId: orgId,
      userId: actedBy,
      organizationId: orgId,
      details: {
        before: beforeState,
        after: {
          status: organization.status,
          reason,
        },
      },
    });

    return organization;
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    orgId: string,
    memberId: string,
    newRoleId: string,
    updatedBy: string
  ): Promise<IOrganizationMember> {
    const member = await OrganizationMember.findOne({
      _id: memberId,
      organization: orgId,
      status: 'active',
    });

    if (!member) {
      throw new NotFoundError('Member not found');
    }

    // Verify new role
    const newRole = await Role.findOne({
      _id: newRoleId,
      $or: [{ organization: orgId }, { scope: 'global' }],
    });

    if (!newRole) {
      throw new NotFoundError('Role not found');
    }

    const oldRoleId = member.role;
    member.role = new Types.ObjectId(newRoleId);
    await member.save();

    // Audit log
    await AuditService.log({
      action: 'organization.member.role_updated',
      resource: 'organization_member',
      resourceId: memberId,
      userId: updatedBy,
      organizationId: orgId,
      details: {
        before: { role: oldRoleId },
        after: { role: newRoleId },
      },
    });

    return member;
  }

  /**
   * Get user's organizations
   */
  async getUserOrganizations(userId: string): Promise<UserOrganization[]> {
    const memberships = await OrganizationMember.find({
      user: userId,
      status: 'active',
    })
      .populate('organization')
      .populate('role', 'name description');

    return memberships.map(m => ({
      organization: m.organization,
      role: m.role,
      joinedAt: m.joinedAt,
      department: m.department,
      title: m.title,
    }));
  }

  async listOrganizations(filters?: ListOrganizationsFilters): Promise<PaginatedOrganizations> {
    const page = Math.max(1, Number(filters?.page || 1));
    const limit = Math.max(1, Math.min(100, Number(filters?.limit || 20)));
    const skip = (page - 1) * limit;
    const query: Record<string, unknown> = {};

    if (filters?.status) {
      query.status = filters.status;
    } else if (filters?.uiStatus) {
      query.status = { $in: this.mapUiStatusToOrganizationStatuses(filters.uiStatus) };
    }

    if (filters?.search) {
      const value = filters.search.trim();
      if (value) {
        query.$or = [
          { name: { $regex: value, $options: 'i' } },
          { slug: { $regex: value, $options: 'i' } },
          { industry: { $regex: value, $options: 'i' } },
        ];
      }
    }

    const [organizations, total] = await Promise.all([
      Organization.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Organization.countDocuments(query),
    ]);

    return {
      organizations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  toOrganizationUiStatus(status: IOrganization['status']): OrganizationUiStatus {
    return status === 'active' ? 'active' : 'disabled';
  }

  toMemberUiStatus(status: IOrganizationMember['status']): OrganizationMemberUiStatus {
    return status === 'active' ? 'active' : 'disabled';
  }

  private mapUiStatusToOrganizationStatuses(uiStatus: OrganizationUiStatus): IOrganization['status'][] {
    if (uiStatus === 'active') return ['active'];
    return ['pending', 'suspended', 'archived'];
  }

  private mapUiStatusToMemberStatuses(uiStatus: OrganizationMemberUiStatus): IOrganizationMember['status'][] {
    if (uiStatus === 'active') return ['active'];
    return ['invited', 'suspended', 'removed'];
  }

  /**
   * Generate slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

export default new OrganizationService();
