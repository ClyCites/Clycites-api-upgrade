import { Router } from 'express';
import AuditController from './audit.controller';
import { authenticate } from '../../common/middleware/auth';
import { requirePermission } from '../../common/middleware/permission';

const router = Router();

router.use(authenticate);

/**
 * @route   GET /audit/me
 * @desc    Get current user's audit logs
 * @access  Authenticated users
 */
router.get(
  '/me',
  AuditController.getUserLogs
);

/**
 * @route   GET /audit/organizations/:organizationId
 * @desc    Get organization audit logs
 * @access  Organization members with audit:read permission
 */
router.get(
  '/organizations/:organizationId',
  requirePermission('audit', 'read'),
  AuditController.getOrganizationLogs
);

/**
 * @route   GET /audit/resources/:resource/:resourceId
 * @desc    Get resource-specific audit logs
 * @access  Organization members with audit:read permission
 */
router.get(
  '/resources/:resource/:resourceId',
  requirePermission('audit', 'read'),
  AuditController.getResourceLogs
);

/**
 * @route   GET /audit/suspicious
 * @desc    Get suspicious activities
 * @access  Organization admins
 */
router.get(
  '/suspicious',
  requirePermission('audit', 'read'),
  AuditController.getSuspiciousActivities
);

export default router;
