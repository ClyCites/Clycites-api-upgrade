const { openApiSpec } = require('../dist/common/docs');

describe('OpenAPI auth registration role coverage', () => {
  test('public registration roles endpoint is documented', () => {
    const registrationRolesPath = openApiSpec.paths['/api/v1/auth/register/roles'];

    expect(registrationRolesPath).toBeDefined();
    expect(registrationRolesPath.get).toBeDefined();
    expect(registrationRolesPath.get.security).toBeUndefined();
    expect(registrationRolesPath.get.responses['200']).toBeDefined();
  });

  test('registration role schema matches the public register role payload', () => {
    const registrationRoleSchema = openApiSpec.components.schemas.RegistrationRole;

    expect(registrationRoleSchema).toBeDefined();
    expect(registrationRoleSchema.required).toEqual([
      'role',
      'label',
      'description',
      'isDefault',
    ]);
    expect(registrationRoleSchema.properties.role.enum).toEqual([
      'farmer',
      'buyer',
      'trader',
      'expert',
    ]);
  });
});
