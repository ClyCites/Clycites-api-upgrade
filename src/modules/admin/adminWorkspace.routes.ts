import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { requireSuperAdmin } from '../../common/middleware/superAdmin';
import { validate } from '../../common/middleware/validate';
import AdminWorkspaceController from './adminWorkspace.controller';
import {
  createPermissionValidator,
  createRoleValidator,
  listAdminOrganizationsValidator,
  listPermissionsValidator,
  listRolesValidator,
  permissionIdValidator,
  roleIdValidator,
  updatePermissionValidator,
  updateRoleValidator,
} from './adminWorkspace.validator';

const router = Router();

router.use(authenticate);

router.get(
  '/organizations',
  authorize('admin', 'platform_admin', 'super_admin'),
  validate(listAdminOrganizationsValidator),
  AdminWorkspaceController.listOrganizations
);

router.get(
  '/roles',
  authorize('admin', 'platform_admin', 'super_admin'),
  validate(listRolesValidator),
  AdminWorkspaceController.listRoles
);
router.post(
  '/roles',
  authorize('admin', 'platform_admin', 'super_admin'),
  validate(createRoleValidator),
  AdminWorkspaceController.createRole
);
router.get(
  '/roles/:roleId',
  authorize('admin', 'platform_admin', 'super_admin'),
  validate(roleIdValidator),
  AdminWorkspaceController.getRole
);
router.patch(
  '/roles/:roleId',
  authorize('admin', 'platform_admin', 'super_admin'),
  validate(updateRoleValidator),
  AdminWorkspaceController.updateRole
);
router.delete(
  '/roles/:roleId',
  authorize('admin', 'platform_admin', 'super_admin'),
  validate(roleIdValidator),
  AdminWorkspaceController.deleteRole
);

router.get(
  '/permissions',
  authorize('admin', 'platform_admin', 'super_admin'),
  validate(listPermissionsValidator),
  AdminWorkspaceController.listPermissions
);
router.get(
  '/permissions/:permissionId',
  authorize('admin', 'platform_admin', 'super_admin'),
  validate(permissionIdValidator),
  AdminWorkspaceController.getPermission
);
router.post(
  '/permissions',
  requireSuperAdmin(['super_admin:rbac:override']),
  validate(createPermissionValidator),
  AdminWorkspaceController.createPermission
);
router.patch(
  '/permissions/:permissionId',
  requireSuperAdmin(['super_admin:rbac:override']),
  validate(updatePermissionValidator),
  AdminWorkspaceController.updatePermission
);
router.delete(
  '/permissions/:permissionId',
  requireSuperAdmin(['super_admin:rbac:override']),
  validate(permissionIdValidator),
  AdminWorkspaceController.deletePermission
);

export default router;
