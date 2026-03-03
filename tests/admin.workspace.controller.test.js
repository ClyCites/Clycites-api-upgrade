const mockOrganizationService = {
  create: jest.fn(),
  getById: jest.fn(),
  update: jest.fn(),
  inviteMember: jest.fn(),
  acceptInvitation: jest.fn(),
  getMembers: jest.fn(),
  removeMember: jest.fn(),
  updateMemberRole: jest.fn(),
  getUserOrganizations: jest.fn(),
  setMemberStatus: jest.fn(),
  setOrganizationStatus: jest.fn(),
  listOrganizations: jest.fn(),
  toOrganizationUiStatus: jest.fn(),
};

const mockRoleModel = {
  find: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
};

const mockPermissionModel = {
  find: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
};

const mockPlatformControlService = {
  getFeatureFlags: jest.fn(),
  setFeatureFlags: jest.fn(),
};

jest.mock('../dist/modules/organizations/organization.service', () => ({
  __esModule: true,
  default: mockOrganizationService,
}));

jest.mock('../dist/modules/users/role.model', () => ({
  __esModule: true,
  default: mockRoleModel,
}));

jest.mock('../dist/modules/permissions/permission.model', () => ({
  __esModule: true,
  default: mockPermissionModel,
}));

jest.mock('../dist/modules/admin/platformControl.service', () => ({
  __esModule: true,
  default: mockPlatformControlService,
}));

const organizationController = require('../dist/modules/organizations/organization.controller').default;
const adminWorkspaceController = require('../dist/modules/admin/adminWorkspace.controller').default;
const platformControlController = require('../dist/modules/admin/platformControl.controller').default;

const createResponseMock = (req) => ({
  locals: { requestId: 'req-admin-1' },
  req,
  statusCode: 200,
  payload: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.payload = body;
    return this;
  },
});

const createQueryChain = (rows) => {
  const chain = {
    populate: jest.fn(() => chain),
    sort: jest.fn(() => chain),
    skip: jest.fn(() => chain),
    limit: jest.fn().mockResolvedValue(rows),
  };
  return chain;
};

const adminUser = {
  id: '507f1f77bcf86cd799439011',
  role: 'admin',
  orgId: '507f1f77bcf86cd799439012',
};

const superAdminUser = {
  id: '507f1f77bcf86cd799439099',
  role: 'super_admin',
};

describe('Admin workspace controller contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrganizationService.toOrganizationUiStatus.mockImplementation((status) => (status === 'active' ? 'active' : 'disabled'));
  });

  test('organization create/list/get/update and disable/enable actions expose deterministic uiStatus', async () => {
    const next = jest.fn();

    mockOrganizationService.create.mockResolvedValue({ _id: 'org1', status: 'pending', name: 'Org A' });
    mockOrganizationService.getById.mockResolvedValue({ _id: 'org1', status: 'active', name: 'Org A' });
    mockOrganizationService.update.mockResolvedValue({ _id: 'org1', status: 'suspended', name: 'Org A' });
    mockOrganizationService.setOrganizationStatus
      .mockResolvedValueOnce({ _id: 'org1', status: 'suspended', name: 'Org A' })
      .mockResolvedValueOnce({ _id: 'org1', status: 'active', name: 'Org A' });
    mockOrganizationService.listOrganizations.mockResolvedValue({
      organizations: [{ _id: 'org1', status: 'suspended', name: 'Org A' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const createReq = {
      user: adminUser,
      body: { name: 'Org A' },
      params: {},
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const createRes = createResponseMock(createReq);
    await organizationController.create(createReq, createRes, next);
    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data.uiStatus).toBe('disabled');

    const getReq = {
      user: adminUser,
      body: {},
      params: { id: 'org1' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const getRes = createResponseMock(getReq);
    await organizationController.getById(getReq, getRes, next);
    expect(getRes.payload.data.uiStatus).toBe('active');

    const updateReq = {
      user: adminUser,
      body: { status: 'suspended' },
      params: { id: 'org1' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const updateRes = createResponseMock(updateReq);
    await organizationController.update(updateReq, updateRes, next);
    expect(updateRes.payload.data.uiStatus).toBe('disabled');

    const disableReq = {
      user: adminUser,
      body: { reason: 'compliance breach' },
      params: { id: 'org1' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const disableRes = createResponseMock(disableReq);
    await organizationController.disableOrganization(disableReq, disableRes, next);
    expect(disableRes.payload.data.uiStatus).toBe('disabled');

    const enableReq = {
      user: adminUser,
      body: { reason: 'restored' },
      params: { id: 'org1' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const enableRes = createResponseMock(enableReq);
    await organizationController.enableOrganization(enableReq, enableRes, next);
    expect(enableRes.payload.data.uiStatus).toBe('active');

    const listReq = {
      user: superAdminUser,
      body: {},
      params: {},
      query: { page: '1', limit: '20', uiStatus: 'disabled' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const listRes = createResponseMock(listReq);
    await adminWorkspaceController.listOrganizations(listReq, listRes, next);
    expect(listRes.payload.success).toBe(true);
    expect(listRes.payload.data[0].uiStatus).toBe('disabled');
    expect(listRes.payload.meta.pagination.total).toBe(1);
  });

  test('organization members invite/update-role/remove and enable/disable flow return uiStatus + pagination', async () => {
    const next = jest.fn();

    mockOrganizationService.inviteMember.mockResolvedValue({
      member: { _id: 'm1', status: 'invited' },
      invitationUrl: '/invitations/accept?token=abc',
    });
    mockOrganizationService.getMembers.mockResolvedValue({
      members: [{ _id: 'm1', status: 'active' }, { _id: 'm2', status: 'suspended' }],
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
    });
    mockOrganizationService.updateMemberRole.mockResolvedValue({ _id: 'm1', status: 'active' });
    mockOrganizationService.setMemberStatus
      .mockResolvedValueOnce({ _id: 'm1', status: 'suspended' })
      .mockResolvedValueOnce({ _id: 'm1', status: 'active' });
    mockOrganizationService.removeMember.mockResolvedValue(undefined);

    const inviteReq = {
      user: adminUser,
      body: { email: 'user@clycites.test', roleId: '507f1f77bcf86cd799439070' },
      params: { id: 'org1' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const inviteRes = createResponseMock(inviteReq);
    await organizationController.inviteMember(inviteReq, inviteRes, next);
    expect(inviteRes.payload.data.member.uiStatus).toBe('disabled');

    const listReq = {
      user: adminUser,
      body: {},
      params: { id: 'org1' },
      query: { page: '1', limit: '20', uiStatus: 'active' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const listRes = createResponseMock(listReq);
    await organizationController.getMembers(listReq, listRes, next);
    expect(listRes.payload.data[0].uiStatus).toBe('active');
    expect(listRes.payload.data[1].uiStatus).toBe('disabled');
    expect(listRes.payload.meta.pagination.total).toBe(2);

    const roleReq = {
      user: adminUser,
      body: { roleId: '507f1f77bcf86cd799439071' },
      params: { id: 'org1', memberId: 'm1' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const roleRes = createResponseMock(roleReq);
    await organizationController.updateMemberRole(roleReq, roleRes, next);
    expect(roleRes.payload.data.uiStatus).toBe('active');

    const disableReq = {
      user: adminUser,
      body: { reason: 'policy' },
      params: { id: 'org1', memberId: 'm1' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const disableRes = createResponseMock(disableReq);
    await organizationController.disableMember(disableReq, disableRes, next);
    expect(disableRes.payload.data.uiStatus).toBe('disabled');

    const enableReq = {
      user: adminUser,
      body: { reason: 'restored' },
      params: { id: 'org1', memberId: 'm1' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const enableRes = createResponseMock(enableReq);
    await organizationController.enableMember(enableReq, enableRes, next);
    expect(enableRes.payload.data.uiStatus).toBe('active');

    const removeReq = {
      user: adminUser,
      body: { reason: 'left' },
      params: { id: 'org1', memberId: 'm2' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const removeRes = createResponseMock(removeReq);
    await organizationController.removeMember(removeReq, removeRes, next);
    expect(removeRes.payload.data).toBeNull();
  });

  test('roles and permissions CRUD workflows expose deterministic status and validate transitions', async () => {
    const next = jest.fn();

    mockRoleModel.find.mockReturnValue(createQueryChain([{ _id: 'r1', status: 'active', scope: 'organization', organization: adminUser.orgId }]));
    mockRoleModel.countDocuments.mockResolvedValue(1);
    mockPermissionModel.countDocuments.mockResolvedValue(1);
    mockRoleModel.create.mockResolvedValue({ _id: 'r2', status: 'active', scope: 'organization', organization: adminUser.orgId });

    const roleGetDoc = { _id: 'r3', status: 'deprecated', scope: 'organization', organization: adminUser.orgId };
    const roleUpdateDoc = {
      _id: 'r4',
      status: 'active',
      scope: 'organization',
      organization: { toString: () => adminUser.orgId },
      isSystem: false,
      save: jest.fn().mockResolvedValue(undefined),
    };
    const roleDeleteDoc = {
      _id: 'r5',
      status: 'active',
      scope: 'organization',
      organization: { toString: () => adminUser.orgId },
      isSystem: false,
      deleteOne: jest.fn().mockResolvedValue(undefined),
    };

    mockRoleModel.findById
      .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue(roleGetDoc) })
      .mockResolvedValueOnce(roleUpdateDoc)
      .mockResolvedValueOnce(roleDeleteDoc);

    const listRoleReq = {
      user: adminUser,
      body: {},
      params: {},
      query: { page: '1', limit: '20' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const listRoleRes = createResponseMock(listRoleReq);
    await adminWorkspaceController.listRoles(listRoleReq, listRoleRes, next);
    expect(listRoleRes.payload.data[0].uiStatus).toBe('active');
    expect(listRoleRes.payload.meta.pagination.total).toBe(1);

    const createRoleReq = {
      user: adminUser,
      body: { name: 'Ops Lead', description: 'Leads ops', permissions: ['507f1f77bcf86cd799439081'] },
      params: {},
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const createRoleRes = createResponseMock(createRoleReq);
    await adminWorkspaceController.createRole(createRoleReq, createRoleRes, next);
    expect(createRoleRes.statusCode).toBe(201);
    expect(createRoleRes.payload.data.uiStatus).toBe('active');

    const getRoleReq = {
      user: adminUser,
      body: {},
      params: { roleId: '507f1f77bcf86cd799439082' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const getRoleRes = createResponseMock(getRoleReq);
    await adminWorkspaceController.getRole(getRoleReq, getRoleRes, next);
    expect(getRoleRes.payload.data.uiStatus).toBe('deprecated');

    const updateRoleReq = {
      user: adminUser,
      body: { status: 'deprecated' },
      params: { roleId: '507f1f77bcf86cd799439083' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const updateRoleRes = createResponseMock(updateRoleReq);
    await adminWorkspaceController.updateRole(updateRoleReq, updateRoleRes, next);
    expect(updateRoleRes.payload.data.uiStatus).toBe('deprecated');

    const deleteRoleReq = {
      user: adminUser,
      body: {},
      params: { roleId: '507f1f77bcf86cd799439084' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const deleteRoleRes = createResponseMock(deleteRoleReq);
    await adminWorkspaceController.deleteRole(deleteRoleReq, deleteRoleRes, next);
    expect(deleteRoleRes.payload.data).toBeNull();

    mockPermissionModel.find.mockReturnValue(createQueryChain([{ _id: 'p1', status: 'active' }]));
    mockPermissionModel.countDocuments.mockResolvedValue(1);
    mockPermissionModel.create.mockResolvedValue({ _id: 'p2', status: 'active' });
    const permissionGetDoc = { _id: 'p3', status: 'deprecated' };
    const permissionUpdateDoc = {
      _id: 'p4',
      status: 'active',
      save: jest.fn().mockResolvedValue(undefined),
      resource: 'orders',
      action: 'read',
      scope: 'organization',
      name: 'orders:read:organization',
      description: 'Read orders',
      category: 'orders',
      isSystem: false,
    };
    const permissionDeleteDoc = {
      _id: 'p5',
      status: 'active',
      isSystem: false,
      deleteOne: jest.fn().mockResolvedValue(undefined),
    };

    mockPermissionModel.findById
      .mockResolvedValueOnce(permissionGetDoc)
      .mockResolvedValueOnce(permissionUpdateDoc)
      .mockResolvedValueOnce(permissionDeleteDoc);

    const listPermissionReq = {
      user: adminUser,
      body: {},
      params: {},
      query: { page: '1', limit: '20' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const listPermissionRes = createResponseMock(listPermissionReq);
    await adminWorkspaceController.listPermissions(listPermissionReq, listPermissionRes, next);
    expect(listPermissionRes.payload.data[0].uiStatus).toBe('active');
    expect(listPermissionRes.payload.meta.pagination.total).toBe(1);

    const createPermissionReq = {
      user: superAdminUser,
      body: {
        resource: 'shipments',
        action: 'read',
        scope: 'organization',
        description: 'Read shipments',
        category: 'logistics',
      },
      params: {},
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const createPermissionRes = createResponseMock(createPermissionReq);
    await adminWorkspaceController.createPermission(createPermissionReq, createPermissionRes, next);
    expect(createPermissionRes.statusCode).toBe(201);
    expect(createPermissionRes.payload.data.uiStatus).toBe('active');

    const getPermissionReq = {
      user: adminUser,
      body: {},
      params: { permissionId: '507f1f77bcf86cd799439085' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const getPermissionRes = createResponseMock(getPermissionReq);
    await adminWorkspaceController.getPermission(getPermissionReq, getPermissionRes, next);
    expect(getPermissionRes.payload.data.uiStatus).toBe('deprecated');

    const updatePermissionReq = {
      user: superAdminUser,
      body: { status: 'deprecated' },
      params: { permissionId: '507f1f77bcf86cd799439086' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const updatePermissionRes = createResponseMock(updatePermissionReq);
    await adminWorkspaceController.updatePermission(updatePermissionReq, updatePermissionRes, next);
    expect(updatePermissionRes.payload.data.uiStatus).toBe('deprecated');

    const deletePermissionReq = {
      user: superAdminUser,
      body: {},
      params: { permissionId: '507f1f77bcf86cd799439087' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const deletePermissionRes = createResponseMock(deletePermissionReq);
    await adminWorkspaceController.deletePermission(deletePermissionReq, deletePermissionRes, next);
    expect(deletePermissionRes.payload.data).toBeNull();
  });

  test('module toggles support workspace-level read/update with stable enabled/disabled status', async () => {
    const next = jest.fn();

    mockPlatformControlService.getFeatureFlags.mockResolvedValue({ analytics: true, logistics: false });
    mockPlatformControlService.setFeatureFlags.mockResolvedValue({ analytics: false, logistics: false });

    const getReq = {
      user: superAdminUser,
      body: {},
      params: { workspaceId: 'analytics' },
      query: {},
      headers: {},
      requestId: 'req-admin-toggle',
      socket: { remoteAddress: '127.0.0.1' },
    };
    const getRes = createResponseMock(getReq);
    await platformControlController.getWorkspaceFeatureFlag(getReq, getRes, next);
    expect(getRes.payload.data.workspaceId).toBe('analytics');
    expect(getRes.payload.data.enabled).toBe(true);
    expect(getRes.payload.data.uiStatus).toBe('enabled');

    const updateReq = {
      user: superAdminUser,
      body: { enabled: false, reason: 'temporarily disabled' },
      params: { workspaceId: 'analytics' },
      query: {},
      headers: {},
      requestId: 'req-admin-toggle-update',
      socket: { remoteAddress: '127.0.0.1' },
    };
    const updateRes = createResponseMock(updateReq);
    await platformControlController.updateWorkspaceFeatureFlag(updateReq, updateRes, next);
    expect(updateRes.payload.data.enabled).toBe(false);
    expect(updateRes.payload.data.uiStatus).toBe('disabled');
    expect(mockPlatformControlService.setFeatureFlags).toHaveBeenCalledWith(expect.objectContaining({
      actorId: superAdminUser.id,
      reason: 'temporarily disabled',
      flags: expect.objectContaining({ analytics: false }),
    }));
  });
});
