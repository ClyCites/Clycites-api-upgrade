const { openApiSpec } = require('../dist/common/docs');

describe('OpenAPI farmer workspace contract coverage', () => {
  test('farmer profile verification fields and lifecycle endpoints are documented', () => {
    const farmerProfile = openApiSpec.components.schemas.FarmerProfile;
    expect(farmerProfile.properties.verificationStatus.enum).toEqual([
      'draft',
      'submitted',
      'verified',
      'rejected',
    ]);
    expect(farmerProfile.properties).toEqual(
      expect.objectContaining({
        verificationSubmittedAt: expect.any(Object),
        verificationReviewedAt: expect.any(Object),
        verificationReason: expect.any(Object),
      })
    );

    expect(openApiSpec.paths['/api/v1/farmers/profiles/{id}/verify']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/farmers/profiles/{id}/verify/submit']).toBeDefined();
  });

  test('farmer workspace entity endpoints are present', () => {
    expect(openApiSpec.paths['/api/v1/farmers/farms/{farmId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/farmers/{farmerId}/plots']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/farmers/plots/{plotId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/farmers/{farmerId}/production/crops']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/farmers/production/crops/{cropId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/farmers/{farmerId}/inputs']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/farmers/inputs/{inputId}']).toBeDefined();
  });

  test('expert portal inquiry/advisory CRUD and review endpoints are present', () => {
    expect(openApiSpec.paths['/api/v1/expert-portal/inquiries/{id}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/advisories/{id}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/advisories/{id}/submit']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/advisories/{id}/review']).toBeDefined();
  });

  test('weather escalation/simulation and market alert filters are documented', () => {
    expect(openApiSpec.paths['/api/v1/weather/alerts/{id}/escalate']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/weather/admin/simulate']).toBeDefined();

    const alertList = openApiSpec.paths['/api/v1/market-intelligence/alerts'].get;
    const queryNames = alertList.parameters.map((param) => param.name);
    expect(queryNames).toEqual(
      expect.arrayContaining(['status', 'active', 'region', 'district', 'product'])
    );
  });
});
