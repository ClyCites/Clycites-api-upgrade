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
  AdminWorkspaceController.listOrganizations.bind(AdminWorkspaceController)
);

router.get(
  '/roles',
  authorize('admin', 'platform_admin', 'super_admin'),
  validate(listRolesValidator),
  AdminWorkspaceController.listRoles.bind(AdminWorkspaceController)
);
router.post(
  '/roles',
  authorize('admin', 'platform_admin', 'super_admin'),
  validate(createRoleValidator),
  AdminWorkspaceController.createRole.bind(AdminWorkspaceController)
);
router.get(
  '/roles/:roleId',
  authorize('admin', 'platform_admin', 'super_admin'),
  validate(roleIdValidator),
  AdminWorkspaceController.getRole.bind(AdminWorkspaceController)
);
router.patch(
  '/roles/:roleId',
  authorize('admin', 'platform_admin', 'super_admin'),
  validate(updateRoleValidator),
  AdminWorkspaceController.updateRole.bind(AdminWorkspaceController)
);
router.delete(
  '/roles/:roleId',
  authorize('admin', 'platform_admin', 'super_admin'),
  validate(roleIdValidator),
  AdminWorkspaceController.deleteRole.bind(AdminWorkspaceController)
);

router.get(
  '/permissions',
  authorize('admin', 'platform_admin', 'super_admin'),
  validate(listPermissionsValidator),
  AdminWorkspaceController.listPermissions.bind(AdminWorkspaceController)
);
router.get(
  '/permissions/:permissionId',
  authorize('admin', 'platform_admin', 'super_admin'),
  validate(permissionIdValidator),
  AdminWorkspaceController.getPermission.bind(AdminWorkspaceController)
);
router.post(
  '/permissions',
  requireSuperAdmin(['super_admin:rbac:override']),
  validate(createPermissionValidator),
  AdminWorkspaceController.createPermission.bind(AdminWorkspaceController)
);
router.patch(
  '/permissions/:permissionId',
  requireSuperAdmin(['super_admin:rbac:override']),
  validate(updatePermissionValidator),
  AdminWorkspaceController.updatePermission.bind(AdminWorkspaceController)
);
router.delete(
  '/permissions/:permissionId',
  requireSuperAdmin(['super_admin:rbac:override']),
  validate(permissionIdValidator),
  AdminWorkspaceController.deletePermission.bind(AdminWorkspaceController)
);

export default router;
