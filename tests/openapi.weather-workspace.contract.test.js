const { openApiSpec } = require('../dist/common/docs');

describe('OpenAPI weather workspace contract coverage', () => {
  test('weather workspace endpoints are present', () => {
    expect(openApiSpec.paths['/api/v1/weather/profiles']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/weather/profiles/me']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/weather/profiles/{id}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/weather/profiles/{profileId}/forecast']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/weather/profiles/{profileId}/forecast/refresh']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/weather/profiles/{profileId}/forecast/history']).toBeDefined();

    expect(openApiSpec.paths['/api/v1/weather/profiles/{profileId}/alerts']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/weather/alerts/{id}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/weather/alerts/{id}/acknowledge']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/weather/alerts/{id}/dismiss']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/weather/alerts/{id}/escalate']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/weather/org/{orgId}/alerts']).toBeDefined();

    expect(openApiSpec.paths['/api/v1/weather/rules']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/weather/rules/{id}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/weather/rules/{id}/test']).toBeDefined();
  });

  test('weather schemas expose frontend-aligned status enums', () => {
    const alertSchema = openApiSpec.components.schemas.WeatherAlert;
    const ruleSchema = openApiSpec.components.schemas.WeatherRule;

    expect(alertSchema.properties.status.enum).toEqual([
      'new',
      'sent',
      'acknowledged',
      'expired',
      'dismissed',
    ]);
    expect(alertSchema.properties.uiStatus.enum).toEqual([
      'new',
      'acknowledged',
      'escalated',
      'resolved',
    ]);
    expect(ruleSchema.properties.status.enum).toEqual(['draft', 'active', 'disabled']);
    expect(ruleSchema.properties.uiStatus.enum).toEqual(['draft', 'active', 'disabled']);
  });

  test('transition-sensitive weather endpoints document mutation behavior', () => {
    const dismissAlert = openApiSpec.paths['/api/v1/weather/alerts/{id}/dismiss'].post;
    const escalateAlert = openApiSpec.paths['/api/v1/weather/alerts/{id}/escalate'].post;
    const patchRule = openApiSpec.paths['/api/v1/weather/rules/{id}'].patch;

    expect(dismissAlert.description).toContain('resolution metadata');
    expect(escalateAlert.description).toContain('uiStatus');
    expect(patchRule.description).toContain('Validates status transition rules');
  });
});
