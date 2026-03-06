import { NextFunction, Request, Response } from 'express';
import Role, { IRole } from '../users/role.model';
import Permission from '../permissions/permission.model';
import OrganizationService from '../organizations/organization.service';
import { AppError, BadRequestError, ForbiddenError } from '../../common/errors/AppError';
import { ResponseHandler } from '../../common/utils/response';
import { isSuperAdminRole } from '../../common/middleware/superAdmin';

type AnyRecord = Record<string, unknown>;
type LifecycleStatus = 'active' | 'deprecated';

const STATUS_TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = {
  active: ['active', 'deprecated'],
  deprecated: ['deprecated', 'active'],
};

const toPlainObject = <T>(value: T): T => {
  if (value && typeof (value as unknown as { toObject?: () => T }).toObject === 'function') {
    return (value as unknown as { toObject: () => T }).toObject();
  }
  return value;
};

const toInt = (value: unknown, fallback: number, max?: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  if (typeof max === 'number') return Math.min(parsed, max);
  return parsed;
};

const buildPagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit) || 1,
});

const parseStatus = (value: unknown): LifecycleStatus | undefined => {
  if (value !== 'active' && value !== 'deprecated') return undefined;
  return value;
};

const normalizeId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

class AdminWorkspaceController {
  private getActor(req: Request): { id: string; role: string; orgId?: string } {
    if (!req.user?.id || !req.user?.role) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    return {
      id: req.user.id,
      role: req.user.role,
      orgId: normalizeId(req.user.orgId),
    };
  }

  private resolveActorOrgScope(req: Request): string {
    const actor = this.getActor(req);
    const requestedOrgId = normalizeId(req.query.organizationId)
      || normalizeId(req.headers['x-organization-id'])
      || normalizeId((req.body as AnyRecord)?.organizationId);

    if (isSuperAdminRole(actor.role)) {
      return requestedOrgId || actor.orgId || '';
    }

    if (!actor.orgId) {
      throw new ForbiddenError('Organization context is required for this operation');
    }

    if (requestedOrgId && requestedOrgId !== actor.orgId) {
      throw new ForbiddenError('Cannot access resources outside your organization scope');
    }

    return actor.orgId;
  }

  private withRoleUiStatus<T extends AnyRecord>(entity: T): T & { status: LifecycleStatus; uiStatus: LifecycleStatus } {
    const plain = toPlainObject(entity);
    const status: LifecycleStatus = plain.status === 'deprecated' ? 'deprecated' : 'active';
    return { ...plain, status, uiStatus: status };
  }

  private withPermissionUiStatus<T extends AnyRecord>(entity: T): T & { status: LifecycleStatus; uiStatus: LifecycleStatus } {
    const plain = toPlainObject(entity);
    const status: LifecycleStatus = plain.status === 'deprecated' ? 'deprecated' : 'active';
    return { ...plain, status, uiStatus: status };
  }

  private assertLifecycleTransition(currentStatus: LifecycleStatus, nextStatus: LifecycleStatus, label: string): void {
    if (!(STATUS_TRANSITIONS[currentStatus] || []).includes(nextStatus)) {
      throw new BadRequestError(`Invalid ${label} transition: ${currentStatus} -> ${nextStatus}`);
    }
  }

  private async assertRoleAccess(req: Request, roleDoc: IRole): Promise<void> {
    const actor = this.getActor(req);
    if (isSuperAdminRole(actor.role)) {
      return;
    }

    if (roleDoc.scope === 'global') {
      throw new ForbiddenError('Only super admin can access global roles');
    }

    const actorOrg = this.resolveActorOrgScope(req);
    const roleOrg = roleDoc.organization?.toString();
    if (!roleOrg || roleOrg !== actorOrg) {
      throw new ForbiddenError('Cannot access roles outside your organization scope');
    }
  }

  async listOrganizations(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = this.getActor(req);
      const page = toInt(req.query.page, 1, 10000);
      const limit = toInt(req.query.limit, 20, 100);
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const uiStatus = req.query.uiStatus === 'active' || req.query.uiStatus === 'disabled'
        ? req.query.uiStatus
        : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;

      if (isSuperAdminRole(actor.role)) {
        const result = await OrganizationService.listOrganizations({
          page,
          limit,
          status,
          uiStatus,
          search,
        });

        ResponseHandler.success(
          res,
          result.organizations.map((org) => {
            const plain = toPlainObject(org as unknown as AnyRecord);
            return {
              ...plain,
              uiStatus: OrganizationService.toOrganizationUiStatus(org.status),
            };
          }),
          'Organizations retrieved',
          200,
          { pagination: result.pagination }
        );
        return;
      }

      const orgId = this.resolveActorOrgScope(req);
      const organization = await OrganizationService.getById(orgId);
      const orgUiStatus = OrganizationService.toOrganizationUiStatus(organization.status);

      const statusMatch = !status || status === organization.status;
      const uiStatusMatch = !uiStatus || uiStatus === orgUiStatus;
      const searchMatch = !search || organization.name.toLowerCase().includes(search.trim().toLowerCase());

      const data = statusMatch && uiStatusMatch && searchMatch
        ? [{ ...(toPlainObject(organization as unknown as AnyRecord)), uiStatus: orgUiStatus }]
        : [];

      ResponseHandler.success(
        res,
        data,
        'Organizations retrieved',
        200,
        { pagination: buildPagination(page, limit, data.length) }
      );
    } catch (error) {
      next(error);
    }
  }

  async listRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = this.getActor(req);
      const page = toInt(req.query.page, 1, 10000);
      const limit = toInt(req.query.limit, 20, 100);
      const skip = (page - 1) * limit;
      const requestedOrgId = normalizeId(req.query.organizationId);
      const requestedScope = req.query.scope === 'global' || req.query.scope === 'organization'
        ? req.query.scope
        : undefined;
      const requestedStatus = parseStatus(req.query.uiStatus) || parseStatus(req.query.status);

      const query: Record<string, unknown> = {};

      if (isSuperAdminRole(actor.role)) {
        if (requestedOrgId) query.organization = requestedOrgId;
        if (requestedScope) query.scope = requestedScope;
      } else {
        const orgId = this.resolveActorOrgScope(req);
        query.organization = orgId;
        query.scope = 'organization';
      }

      if (requestedStatus === 'deprecated') {
        query.status = 'deprecated';
      } else if (requestedStatus === 'active') {
        query.$or = [{ status: 'active' }, { status: { $exists: false } }];
      }

      const [roles, total] = await Promise.all([
        Role.find(query)
          .populate('permissions', 'name resource action scope status')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Role.countDocuments(query),
      ]);

      ResponseHandler.success(
        res,
        roles.map((role) => this.withRoleUiStatus(role as unknown as AnyRecord)),
        'Roles retrieved',
        200,
        { pagination: buildPagination(page, limit, total) }
      );
    } catch (error) {
      next(error);
    }
  }

  async createRole(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = this.getActor(req);
      const name = String(req.body.name || '').trim();
      const description = String(req.body.description || '').trim();
      if (!name || !description) {
        throw new BadRequestError('name and description are required');
      }

      const requestedStatus = parseStatus(req.body.status) || parseStatus(req.body.uiStatus) || 'active';
      const requestedScope = req.body.scope === 'global' ? 'global' : 'organization';

      let scope: 'global' | 'organization' = requestedScope;
      let organizationId = normalizeId(req.body.organizationId) || normalizeId(req.query.organizationId);

      if (!isSuperAdminRole(actor.role)) {
        scope = 'organization';
        organizationId = this.resolveActorOrgScope(req);
      } else if (scope === 'organization' && !organizationId) {
        throw new BadRequestError('organizationId is required for organization roles');
      }

      const permissionIds = Array.isArray(req.body.permissions)
        ? req.body.permissions.map((value: unknown) => String(value))
        : [];

      if (permissionIds.length > 0) {
        const permissionCount = await Permission.countDocuments({ _id: { $in: permissionIds } });
        if (permissionCount !== permissionIds.length) {
          throw new BadRequestError('One or more permissions do not exist');
        }
      }

      const role = await Role.create({
        name,
        slug: String(req.body.slug || '').trim() || toSlug(name),
        description,
        permissions: permissionIds,
        scope,
        organization: scope === 'organization' ? organizationId : undefined,
        level: Number.isFinite(Number(req.body.level)) ? Number(req.body.level) : 100,
        isSystem: Boolean(req.body.isSystem) && isSuperAdminRole(actor.role),
        isDefault: Boolean(req.body.isDefault),
        maxMembers: req.body.maxMembers !== undefined ? Number(req.body.maxMembers) : undefined,
        status: requestedStatus,
      });

      ResponseHandler.created(res, this.withRoleUiStatus(role as unknown as AnyRecord), 'Role created');
    } catch (error) {
      next(error);
    }
  }

  async getRole(req: Request, res: Response, next: NextFunction) {
    try {
      const role = await Role.findById(req.params.roleId).populate('permissions', 'name resource action scope status');
      if (!role) {
        throw new AppError('Role not found', 404, 'NOT_FOUND');
      }

      await this.assertRoleAccess(req, role);
      ResponseHandler.success(res, this.withRoleUiStatus(role as unknown as AnyRecord), 'Role retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = this.getActor(req);
      const role = await Role.findById(req.params.roleId);
      if (!role) {
        throw new AppError('Role not found', 404, 'NOT_FOUND');
      }

      await this.assertRoleAccess(req, role);

      if (role.isSystem && !isSuperAdminRole(actor.role)) {
        throw new ForbiddenError('System roles can only be managed by super admin');
      }

      const nextStatus = parseStatus(req.body.status) || parseStatus(req.body.uiStatus);
      if (nextStatus) {
        const currentStatus = role.status === 'deprecated' ? 'deprecated' : 'active';
        this.assertLifecycleTransition(currentStatus, nextStatus, 'role status');
        role.status = nextStatus;
      }

      if (req.body.name !== undefined) role.name = String(req.body.name).trim();
      if (req.body.slug !== undefined) role.slug = String(req.body.slug).trim();
      if (req.body.description !== undefined) role.description = String(req.body.description).trim();
      if (req.body.level !== undefined) role.level = Number(req.body.level);
      if (req.body.maxMembers !== undefined) role.maxMembers = Number(req.body.maxMembers);
      if (req.body.isDefault !== undefined) role.isDefault = Boolean(req.body.isDefault);

      if (req.body.permissions !== undefined) {
        const permissionIds = Array.isArray(req.body.permissions)
          ? req.body.permissions.map((value: unknown) => String(value))
          : [];
        if (permissionIds.length > 0) {
          const permissionCount = await Permission.countDocuments({ _id: { $in: permissionIds } });
          if (permissionCount !== permissionIds.length) {
            throw new BadRequestError('One or more permissions do not exist');
          }
        }
        role.permissions = permissionIds as any;
      }

      await role.save();
      ResponseHandler.success(res, this.withRoleUiStatus(role as unknown as AnyRecord), 'Role updated');
    } catch (error) {
      next(error);
    }
  }

  async deleteRole(req: Request, res: Response, next: NextFunction) {
    try {
      const role = await Role.findById(req.params.roleId);
      if (!role) {
        throw new AppError('Role not found', 404, 'NOT_FOUND');
      }

      await this.assertRoleAccess(req, role);
      if (role.isSystem) {
        throw new BadRequestError('System roles cannot be deleted');
      }

      await role.deleteOne();
      ResponseHandler.success(res, null, 'Role deleted');
    } catch (error) {
      next(error);
    }
  }

  async listPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const page = toInt(req.query.page, 1, 10000);
      const limit = toInt(req.query.limit, 20, 100);
      const skip = (page - 1) * limit;
      const requestedStatus = parseStatus(req.query.uiStatus) || parseStatus(req.query.status);
      const query: Record<string, unknown> = {};

      if (requestedStatus === 'deprecated') {
        query.status = 'deprecated';
      } else if (requestedStatus === 'active') {
        query.$or = [{ status: 'active' }, { status: { $exists: false } }];
      }

      if (typeof req.query.resource === 'string' && req.query.resource.trim()) {
        query.resource = req.query.resource.trim().toLowerCase();
      }
      if (typeof req.query.action === 'string' && req.query.action.trim()) {
        query.action = req.query.action.trim().toLowerCase();
      }
      if (typeof req.query.scope === 'string' && ['global', 'organization', 'own'].includes(req.query.scope)) {
        query.scope = req.query.scope;
      }
      if (typeof req.query.category === 'string' && req.query.category.trim()) {
        query.category = req.query.category.trim().toLowerCase();
      }

      const [permissions, total] = await Promise.all([
        Permission.find(query).sort({ category: 1, name: 1 }).skip(skip).limit(limit),
        Permission.countDocuments(query),
      ]);

      ResponseHandler.success(
        res,
        permissions.map((permission) => this.withPermissionUiStatus(permission as unknown as AnyRecord)),
        'Permissions retrieved',
        200,
        { pagination: buildPagination(page, limit, total) }
      );
    } catch (error) {
      next(error);
    }
  }

  async createPermission(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isSuperAdminRole(this.getActor(req).role)) {
        throw new ForbiddenError('Only super admin can create permissions');
      }

      const resource = String(req.body.resource || '').trim().toLowerCase();
      const action = String(req.body.action || '').trim().toLowerCase();
      const scope = String(req.body.scope || '').trim().toLowerCase();
      const description = String(req.body.description || '').trim();
      const category = String(req.body.category || '').trim().toLowerCase();

      if (!resource || !action || !scope || !description || !category) {
        throw new BadRequestError('resource, action, scope, description, and category are required');
      }

      const name = String(req.body.name || '').trim() || `${resource}:${action}:${scope}`;
      const status = parseStatus(req.body.status) || parseStatus(req.body.uiStatus) || 'active';

      const permission = await Permission.create({
        resource,
        action,
        scope,
        name,
        description,
        category,
        isSystem: Boolean(req.body.isSystem),
        status,
      });

      ResponseHandler.created(res, this.withPermissionUiStatus(permission as unknown as AnyRecord), 'Permission created');
    } catch (error) {
      next(error);
    }
  }

  async getPermission(req: Request, res: Response, next: NextFunction) {
    try {
      const permission = await Permission.findById(req.params.permissionId);
      if (!permission) {
        throw new AppError('Permission not found', 404, 'NOT_FOUND');
      }

      ResponseHandler.success(
        res,
        this.withPermissionUiStatus(permission as unknown as AnyRecord),
        'Permission retrieved'
      );
    } catch (error) {
      next(error);
    }
  }

  async updatePermission(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isSuperAdminRole(this.getActor(req).role)) {
        throw new ForbiddenError('Only super admin can update permissions');
      }

      const permission = await Permission.findById(req.params.permissionId);
      if (!permission) {
        throw new AppError('Permission not found', 404, 'NOT_FOUND');
      }

      const nextStatus = parseStatus(req.body.status) || parseStatus(req.body.uiStatus);
      if (nextStatus) {
        const currentStatus: LifecycleStatus = permission.status === 'deprecated' ? 'deprecated' : 'active';
        this.assertLifecycleTransition(currentStatus, nextStatus, 'permission status');
        permission.status = nextStatus;
      }

      if (req.body.resource !== undefined) permission.resource = String(req.body.resource).trim().toLowerCase();
      if (req.body.action !== undefined) permission.action = String(req.body.action).trim().toLowerCase();
      if (req.body.scope !== undefined) permission.scope = String(req.body.scope).trim().toLowerCase() as any;
      if (req.body.description !== undefined) permission.description = String(req.body.description).trim();
      if (req.body.category !== undefined) permission.category = String(req.body.category).trim().toLowerCase();
      if (req.body.isSystem !== undefined) permission.isSystem = Boolean(req.body.isSystem);

      if (req.body.name !== undefined) {
        permission.name = String(req.body.name).trim();
      } else if (req.body.resource !== undefined || req.body.action !== undefined || req.body.scope !== undefined) {
        permission.name = `${permission.resource}:${permission.action}:${permission.scope}`;
      }

      await permission.save();

      ResponseHandler.success(
        res,
        this.withPermissionUiStatus(permission as unknown as AnyRecord),
        'Permission updated'
      );
    } catch (error) {
      next(error);
    }
  }

  async deletePermission(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isSuperAdminRole(this.getActor(req).role)) {
        throw new ForbiddenError('Only super admin can delete permissions');
      }

      const permission = await Permission.findById(req.params.permissionId);
      if (!permission) {
        throw new AppError('Permission not found', 404, 'NOT_FOUND');
      }

      if (permission.isSystem) {
        throw new BadRequestError('System permissions cannot be deleted');
      }

      await permission.deleteOne();
      ResponseHandler.success(res, null, 'Permission deleted');
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminWorkspaceController();
