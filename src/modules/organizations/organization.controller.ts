import { Request, Response, NextFunction } from 'express';
import OrganizationService from './organization.service';
import { successResponse } from '../../common/utils/response';

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

      return successResponse(res, organization, 'Organization created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organization
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const organization = await OrganizationService.getById(req.params.id);
      return successResponse(res, organization);
    } catch (error) {
      next(error);
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

      return successResponse(res, organization, 'Organization updated successfully');
    } catch (error) {
      next(error);
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

      return successResponse(res, result, 'Member invited successfully');
    } catch (error) {
      next(error);
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

      return successResponse(res, member, 'Invitation accepted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get members
   */
  async getMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const members = await OrganizationService.getMembers(
        req.params.id,
        req.query
      );

      return successResponse(res, members);
    } catch (error) {
      next(error);
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
      next(error);
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

      return successResponse(res, member, 'Member role updated successfully');
    } catch (error) {
      next(error);
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

      return successResponse(res, organizations);
    } catch (error) {
      next(error);
    }
  }
}

export default new OrganizationController();
