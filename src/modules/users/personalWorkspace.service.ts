import PersonalWorkspace, { IPersonalWorkspace } from './personalWorkspace.model';
import User from './user.model';
import { AuditService } from '../audit';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../../common/errors/AppError';

interface CreatePersonalWorkspaceData {
  userId: string;
  displayName?: string;
  description?: string;
}

// interface MigrateToOrganizationData {
//   userId: string;
//   organizationName: string;
//   organizationType: 'enterprise' | 'cooperative' | 'government' | 'individual';
//   transferData: boolean; // Transfer personal data to organization
// }

class PersonalWorkspaceService {
  /**
   * Create personal workspace for a user
   * Automatically called during user registration
   */
  async create(data: CreatePersonalWorkspaceData): Promise<IPersonalWorkspace> {
    const { userId, displayName, description } = data;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if workspace already exists
    const existing = await PersonalWorkspace.findOne({ user: userId });
    if (existing) {
      throw new ConflictError('Personal workspace already exists for this user');
    }

    // Create workspace
    const workspace = await PersonalWorkspace.create({
      user: userId,
      displayName: displayName || `${user.firstName}'s Workspace`,
      description,
    });

    // Audit log
    await AuditService.log({
      action: 'personal_workspace.created',
      resource: 'personal_workspace',
      resourceId: workspace._id.toString(),
      userId,
      details: {
        after: {
          displayName: workspace.displayName,
        },
      },
    });

    return workspace;
  }

  /**
   * Get personal workspace by user ID
   */
  async getByUserId(userId: string): Promise<IPersonalWorkspace> {
    const workspace = await PersonalWorkspace.findOne({ user: userId });

    if (!workspace) {
      throw new NotFoundError('Personal workspace not found');
    }

    return workspace;
  }

  /**
   * Update personal workspace
   */
  async update(
    userId: string,
    updateData: Partial<IPersonalWorkspace>
  ): Promise<IPersonalWorkspace> {
    const workspace = await this.getByUserId(userId);

    const beforeState = workspace.toObject();

    Object.assign(workspace, updateData);
    await workspace.save();

    // Audit log
    await AuditService.log({
      action: 'personal_workspace.updated',
      resource: 'personal_workspace',
      resourceId: workspace._id.toString(),
      userId,
      details: {
        before: beforeState,
        after: workspace.toObject(),
      },
    });

    return workspace;
  }

  /**
   * Check if user can create resource (within limits)
   */
  async checkResourceLimit(
    userId: string,
    resourceType: 'products' | 'orders' | 'storage'
  ): Promise<boolean> {
    const workspace = await this.getByUserId(userId);

    switch (resourceType) {
      case 'products':
        return workspace.usage.productsCount < workspace.limits.maxProducts;
      case 'orders':
        return workspace.usage.ordersCount < workspace.limits.maxOrders;
      case 'storage':
        return workspace.usage.storageUsedGB < workspace.limits.maxStorageGB;
      default:
        return false;
    }
  }

  /**
   * Increment usage counter
   */
  async incrementUsage(
    userId: string,
    resourceType: 'products' | 'orders',
    amount: number = 1
  ): Promise<void> {
    const workspace = await this.getByUserId(userId);

    if (resourceType === 'products') {
      workspace.usage.productsCount += amount;
    } else if (resourceType === 'orders') {
      workspace.usage.ordersCount += amount;
    }

    await workspace.save();
  }

  /**
   * Decrement usage counter
   */
  async decrementUsage(
    userId: string,
    resourceType: 'products' | 'orders',
    amount: number = 1
  ): Promise<void> {
    const workspace = await this.getByUserId(userId);

    if (resourceType === 'products') {
      workspace.usage.productsCount = Math.max(0, workspace.usage.productsCount - amount);
    } else if (resourceType === 'orders') {
      workspace.usage.ordersCount = Math.max(0, workspace.usage.ordersCount - amount);
    }

    await workspace.save();
  }

  /**
   * Mark workspace as migrated to organization
   */
  async markAsMigrated(
    userId: string,
    organizationId: string
  ): Promise<IPersonalWorkspace> {
    const workspace = await this.getByUserId(userId);

    workspace.hasCreatedOrganization = true;
    workspace.primaryOrganization = organizationId as any;
    await workspace.save();

    // Audit log
    await AuditService.log({
      action: 'personal_workspace.migrated_to_organization',
      resource: 'personal_workspace',
      resourceId: workspace._id.toString(),
      userId,
      organizationId,
      details: {
        after: {
          organizationId,
        },
      },
    });

    return workspace;
  }

  /**
   * Suspend personal workspace
   */
  async suspend(
    userId: string,
    reason: string,
    suspendedBy: string
  ): Promise<IPersonalWorkspace> {
    const workspace = await this.getByUserId(userId);

    workspace.status = 'suspended';
    workspace.suspendedAt = new Date();
    workspace.suspensionReason = reason;
    await workspace.save();

    // Audit log
    await AuditService.log({
      action: 'personal_workspace.suspended',
      resource: 'personal_workspace',
      resourceId: workspace._id.toString(),
      userId: suspendedBy,
      details: {
        after: {
          reason,
          suspendedAt: workspace.suspendedAt,
        },
      },
    });

    return workspace;
  }

  /**
   * Reactivate suspended workspace
   */
  async reactivate(userId: string, reactivatedBy: string): Promise<IPersonalWorkspace> {
    const workspace = await this.getByUserId(userId);

    if (workspace.status !== 'suspended') {
      throw new BadRequestError('Workspace is not suspended');
    }

    workspace.status = 'active';
    workspace.suspendedAt = undefined;
    workspace.suspensionReason = undefined;
    await workspace.save();

    // Audit log
    await AuditService.log({
      action: 'personal_workspace.reactivated',
      resource: 'personal_workspace',
      resourceId: workspace._id.toString(),
      userId: reactivatedBy,
      details: {
        after: {
          status: 'active',
        },
      },
    });

    return workspace;
  }
}

export default new PersonalWorkspaceService();
