import { Router } from 'express';
import OrganizationController from './organization.controller';
import { authenticate } from '../../common/middleware/auth';
import {
  requirePermission,
  requireOrganizationAdmin,
} from '../../common/middleware/permission';
import { createLimiter } from '../../common/middleware/rateLimiter';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /organizations
 * @desc    Create a new organization
 * @access  Authenticated users
 */
router.post(
  '/',
  createLimiter,
  OrganizationController.create
);

/**
 * @route   GET /organizations/me
 * @desc    Get user's organizations
 * @access  Authenticated users
 */
router.get(
  '/me',
  OrganizationController.getUserOrganizations
);

/**
 * @route   GET /organizations/:id
 * @desc    Get organization details
 * @access  Organization members
 */
router.get(
  '/:id',
  requirePermission('organization', 'read'),
  OrganizationController.getById
);

/**
 * @route   PATCH /organizations/:id
 * @desc    Update organization
 * @access  Organization admins
 */
router.patch(
  '/:id',
  requireOrganizationAdmin,
  OrganizationController.update
);

/**
 * @route   POST /organizations/:id/members/invite
 * @desc    Invite member to organization
 * @access  Organization admins
 */
router.post(
  '/:id/members/invite',
  requirePermission('members', 'invite'),
  OrganizationController.inviteMember
);

/**
 * @route   POST /organizations/invitations/accept
 * @desc    Accept organization invitation
 * @access  Authenticated users
 */
router.post(
  '/invitations/accept',
  OrganizationController.acceptInvitation
);

/**
 * @route   GET /organizations/:id/members
 * @desc    Get organization members
 * @access  Organization members
 */
router.get(
  '/:id/members',
  requirePermission('members', 'read'),
  OrganizationController.getMembers
);

/**
 * @route   DELETE /organizations/:id/members/:memberId
 * @desc    Remove member from organization
 * @access  Organization admins
 */
router.delete(
  '/:id/members/:memberId',
  requirePermission('members', 'remove'),
  OrganizationController.removeMember
);

/**
 * @route   PATCH /organizations/:id/members/:memberId/role
 * @desc    Update member role
 * @access  Organization admins
 */
router.patch(
  '/:id/members/:memberId/role',
  requirePermission('members', 'update'),
  OrganizationController.updateMemberRole
);

export default router;
