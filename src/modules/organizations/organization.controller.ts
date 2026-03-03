import { Request, Response, NextFunction } from 'express';
import OrganizationService from './organization.service';
import { ResponseHandler, successResponse } from '../../common/utils/response';

const toPlainObject = <T>(value: T): T => {
  if (value && typeof (value as { toObject?: () => unknown }).toObject === 'function') {
    return (value as unknown as { toObject: () => T }).toObject();
  }
  return value;
};

const withOrganizationUiStatus = <T extends Record<string, unknown>>(organization: T): T & { uiStatus: 'active' | 'disabled' } => {
  const plain = toPlainObject(organization);
  const status = plain.status === 'active' ? 'active' : 'disabled';
  return { ...plain, uiStatus: status };
};

const withMemberUiStatus = <T extends Record<string, unknown>>(member: T): T & { uiStatus: 'active' | 'disabled' } => {
  const plain = toPlainObject(member);
  const status = plain.status === 'active' ? 'active' : 'disabled';
  return { ...plain, uiStatus: status };
};

class OrganizationController {
  /**
   * Create organization
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const organization = await OrganizationService.create({
        ...req.body,
        ownerId: req.user!.id,
      });

      return successResponse(res, withOrganizationUiStatus(organization as unknown as Record<string, unknown>), 'Organization created successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get organization
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const organization = await OrganizationService.getById(req.params.id);
      return successResponse(res, withOrganizationUiStatus(organization as unknown as Record<string, unknown>));
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Update organization
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const organization = await OrganizationService.update(
        req.params.id,
        req.body,
        req.user!.id
      );

      return successResponse(res, withOrganizationUiStatus(organization as unknown as Record<string, unknown>), 'Organization updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Invite member
   */
  async inviteMember(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await OrganizationService.inviteMember(req.params.id, {
        ...req.body,
        invitedBy: req.user!.id,
      });

      return successResponse(
        res,
        {
          ...result,
          member: withMemberUiStatus(result.member as unknown as Record<string, unknown>),
        },
        'Member invited successfully'
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await OrganizationService.acceptInvitation(
        req.body.token,
        req.user!.id
      );

      return successResponse(res, withMemberUiStatus(member as unknown as Record<string, unknown>), 'Invitation accepted successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get members
   */
  async getMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const { members, pagination } = await OrganizationService.getMembers(
        req.params.id,
        {
          status: typeof req.query.status === 'string' ? req.query.status : undefined,
          uiStatus: typeof req.query.uiStatus === 'string'
            ? (req.query.uiStatus as 'active' | 'disabled')
            : undefined,
          page: Number(req.query.page || 1),
          limit: Number(req.query.limit || 20),
        }
      );

      return ResponseHandler.success(
        res,
        members.map((member) => withMemberUiStatus(member as unknown as Record<string, unknown>)),
        'Organization members retrieved',
        200,
        { pagination }
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Remove member
   */
  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      await OrganizationService.removeMember(
        req.params.id,
        req.params.memberId,
        req.user!.id,
        req.body.reason
      );

      return successResponse(res, null, 'Member removed successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await OrganizationService.updateMemberRole(
        req.params.id,
        req.params.memberId,
        req.body.roleId,
        req.user!.id
      );

      return successResponse(res, withMemberUiStatus(member as unknown as Record<string, unknown>), 'Member role updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  async disableMember(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await OrganizationService.setMemberStatus(
        req.params.id,
        req.params.memberId,
        'disable',
        req.user!.id,
        req.body.reason
      );

      return successResponse(res, withMemberUiStatus(member as unknown as Record<string, unknown>), 'Member disabled successfully');
    } catch (error) {
      return next(error);
    }
  }

  async enableMember(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await OrganizationService.setMemberStatus(
        req.params.id,
        req.params.memberId,
        'enable',
        req.user!.id,
        req.body.reason
      );

      return successResponse(res, withMemberUiStatus(member as unknown as Record<string, unknown>), 'Member enabled successfully');
    } catch (error) {
      return next(error);
    }
  }

  async disableOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const organization = await OrganizationService.setOrganizationStatus(
        req.params.id,
        'disable',
        req.user!.id,
        req.body.reason
      );

      return successResponse(res, withOrganizationUiStatus(organization as unknown as Record<string, unknown>), 'Organization disabled successfully');
    } catch (error) {
      return next(error);
    }
  }

  async enableOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const organization = await OrganizationService.setOrganizationStatus(
        req.params.id,
        'enable',
        req.user!.id,
        req.body.reason
      );

      return successResponse(res, withOrganizationUiStatus(organization as unknown as Record<string, unknown>), 'Organization enabled successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get user's organizations
   */
  async getUserOrganizations(req: Request, res: Response, next: NextFunction) {
    try {
      const organizations = await OrganizationService.getUserOrganizations(
        req.user!.id
      );

      const mappedOrganizations = organizations.map((entry) => {
        const plain = toPlainObject(entry as unknown as Record<string, unknown>);
        const organization = plain.organization as Record<string, unknown> | undefined;
        if (!organization) return plain;
        return {
          ...plain,
          organization: withOrganizationUiStatus(organization),
        };
      });

      return successResponse(res, mappedOrganizations);
    } catch (error) {
      return next(error);
    }
  }
}

export default new OrganizationController();
