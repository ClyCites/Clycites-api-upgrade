const { openApiSpec } = require('../dist/common/docs');

describe('OpenAPI admin workspace contract coverage', () => {
  test('admin workspace and organization status lifecycle endpoints are present', () => {
    expect(openApiSpec.paths['/api/v1/admin/organizations']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/admin/roles']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/admin/roles/{roleId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/admin/permissions']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/admin/permissions/{permissionId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/admin/system/feature-flags']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/admin/system/feature-flags/{workspaceId}']).toBeDefined();

    expect(openApiSpec.paths['/api/v1/organizations/{id}/disable']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/organizations/{id}/enable']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/organizations/{id}/members/{memberId}/disable']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/organizations/{id}/members/{memberId}/enable']).toBeDefined();
  });

  test('admin schemas and token schema document deterministic status contracts', () => {
    const orgSchema = openApiSpec.components.schemas.Organization;
    const roleSchema = openApiSpec.components.schemas.AdminRole;
    const permissionSchema = openApiSpec.components.schemas.AdminPermission;
    const toggleSchema = openApiSpec.components.schemas.AdminModuleToggle;
    const tokenSchema = openApiSpec.components.schemas.ApiToken;

    expect(orgSchema.properties.uiStatus.enum).toEqual(['active', 'disabled']);
    expect(roleSchema.properties.status.enum).toEqual(['active', 'deprecated']);
    expect(permissionSchema.properties.uiStatus.enum).toEqual(['active', 'deprecated']);
    expect(toggleSchema.properties.uiStatus.enum).toEqual(['enabled', 'disabled']);
    expect(tokenSchema.properties.uiStatus.enum).toEqual(['active', 'revoked', 'expired']);
  });

  test('transition-sensitive admin endpoints describe status transition validation', () => {
    const memberDisable = openApiSpec.paths['/api/v1/organizations/{id}/members/{memberId}/disable'].post;
    const memberEnable = openApiSpec.paths['/api/v1/organizations/{id}/members/{memberId}/enable'].post;
    const rolePatch = openApiSpec.paths['/api/v1/admin/roles/{roleId}'].patch;
    const permissionPatch = openApiSpec.paths['/api/v1/admin/permissions/{permissionId}'].patch;

    expect(memberDisable.responses['400'].description).toContain('transition');
    expect(memberEnable.responses['400'].description).toContain('transition');
    expect(rolePatch.description).toContain('transition');
    expect(permissionPatch.description).toContain('transition');
  });
});
