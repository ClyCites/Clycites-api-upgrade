import Organization, { IOrganization } from './organization.model';
import OrganizationMember from './organizationMember.model';
import User from '../users/user.model';
import Role from '../users/role.model';
import AuditService from '../audit/audit.service';
import crypto from 'crypto';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../../common/errors/AppError';

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
  async inviteMember(orgId: string, data: InviteMemberData): Promise<any> {
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
    let user = await User.findOne({ email: data.email });

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
  async acceptInvitation(token: string, userId: string): Promise<any> {
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
    member.user = userId as any;
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
  async getMembers(orgId: string, filters?: any): Promise<any[]> {
    const query: any = { organization: orgId };

    if (filters?.status) {
      query.status = filters.status;
    }

    const members = await OrganizationMember.find(query)
      .populate('user', 'firstName lastName email profileImage')
      .populate('role', 'name description')
      .sort({ joinedAt: -1 });

    return members;
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
    member.removedBy = removedBy as any;
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

  /**
   * Update member role
   */
  async updateMemberRole(
    orgId: string,
    memberId: string,
    newRoleId: string,
    updatedBy: string
  ): Promise<any> {
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
    member.role = newRoleId as any;
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
  async getUserOrganizations(userId: string): Promise<any[]> {
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
