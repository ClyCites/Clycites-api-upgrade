import { body, param, query } from 'express-validator';

const lifecycleStatuses = ['active', 'deprecated'];

export const listAdminOrganizationsValidator = [
  query('page').optional().isInt({ min: 1, max: 10000 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(['active', 'pending', 'suspended', 'archived']),
  query('uiStatus').optional().isIn(['active', 'disabled']),
  query('search').optional().trim().isLength({ min: 1, max: 120 }),
];

export const roleIdValidator = [
  param('roleId').isMongoId().withMessage('roleId must be a valid ID'),
];

export const permissionIdValidator = [
  param('permissionId').isMongoId().withMessage('permissionId must be a valid ID'),
];

export const listRolesValidator = [
  query('page').optional().isInt({ min: 1, max: 10000 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('organizationId').optional().isMongoId(),
  query('scope').optional().isIn(['global', 'organization']),
  query('status').optional().isIn(lifecycleStatuses),
  query('uiStatus').optional().isIn(lifecycleStatuses),
];

export const createRoleValidator = [
  body('name').trim().isLength({ min: 2, max: 120 }),
  body('slug').optional().trim().isLength({ min: 2, max: 120 }),
  body('description').trim().isLength({ min: 3, max: 1000 }),
  body('scope').optional().isIn(['global', 'organization']),
  body('organizationId').optional().isMongoId(),
  body('permissions').optional().isArray({ max: 500 }),
  body('permissions.*').optional().isMongoId(),
  body('level').optional().isInt({ min: 0, max: 1000 }).toInt(),
  body('isDefault').optional().isBoolean().toBoolean(),
  body('isSystem').optional().isBoolean().toBoolean(),
  body('maxMembers').optional().isInt({ min: 1, max: 100000 }).toInt(),
  body('status').optional().isIn(lifecycleStatuses),
  body('uiStatus').optional().isIn(lifecycleStatuses),
];

export const updateRoleValidator = [
  ...roleIdValidator,
  body('name').optional().trim().isLength({ min: 2, max: 120 }),
  body('slug').optional().trim().isLength({ min: 2, max: 120 }),
  body('description').optional().trim().isLength({ min: 3, max: 1000 }),
  body('permissions').optional().isArray({ max: 500 }),
  body('permissions.*').optional().isMongoId(),
  body('level').optional().isInt({ min: 0, max: 1000 }).toInt(),
  body('isDefault').optional().isBoolean().toBoolean(),
  body('maxMembers').optional().isInt({ min: 1, max: 100000 }).toInt(),
  body('status').optional().isIn(lifecycleStatuses),
  body('uiStatus').optional().isIn(lifecycleStatuses),
];

export const listPermissionsValidator = [
  query('page').optional().isInt({ min: 1, max: 10000 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('resource').optional().trim().isLength({ min: 1, max: 80 }),
  query('action').optional().trim().isLength({ min: 1, max: 80 }),
  query('scope').optional().isIn(['global', 'organization', 'own']),
  query('category').optional().trim().isLength({ min: 1, max: 80 }),
  query('status').optional().isIn(lifecycleStatuses),
  query('uiStatus').optional().isIn(lifecycleStatuses),
];

export const createPermissionValidator = [
  body('resource').trim().isLength({ min: 1, max: 80 }),
  body('action').trim().isLength({ min: 1, max: 80 }),
  body('scope').isIn(['global', 'organization', 'own']),
  body('name').optional().trim().isLength({ min: 3, max: 200 }),
  body('description').trim().isLength({ min: 3, max: 1000 }),
  body('category').trim().isLength({ min: 1, max: 80 }),
  body('isSystem').optional().isBoolean().toBoolean(),
  body('status').optional().isIn(lifecycleStatuses),
  body('uiStatus').optional().isIn(lifecycleStatuses),
];

export const updatePermissionValidator = [
  ...permissionIdValidator,
  body('resource').optional().trim().isLength({ min: 1, max: 80 }),
  body('action').optional().trim().isLength({ min: 1, max: 80 }),
  body('scope').optional().isIn(['global', 'organization', 'own']),
  body('name').optional().trim().isLength({ min: 3, max: 200 }),
  body('description').optional().trim().isLength({ min: 3, max: 1000 }),
  body('category').optional().trim().isLength({ min: 1, max: 80 }),
  body('isSystem').optional().isBoolean().toBoolean(),
  body('status').optional().isIn(lifecycleStatuses),
  body('uiStatus').optional().isIn(lifecycleStatuses),
];
