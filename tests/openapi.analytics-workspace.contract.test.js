const { openApiSpec } = require('../dist/common/docs');

describe('OpenAPI analytics workspace contract coverage', () => {
  test('analytics workspace endpoints are present', () => {
    expect(openApiSpec.paths['/api/v1/analytics/datasets']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/analytics/datasets/{id}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/analytics/charts']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/analytics/charts/{id}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/analytics/charts/{id}/publish']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/analytics/charts/{id}/archive']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/analytics/dashboards']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/analytics/dashboards/{id}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/analytics/dashboards/{id}/charts/reorder']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/analytics/dashboards/templates']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/analytics/dashboards/templates/{id}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/analytics/dashboards/templates/{id}/publish']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/analytics/dashboards/templates/{id}/archive']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/analytics/reports']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/analytics/reports/{id}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/analytics/reports/{id}/generate']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/analytics/reports/{id}/export']).toBeDefined();
  });

  test('analytics schemas document frontend-aligned status enums', () => {
    const chartSchema = openApiSpec.components.schemas.Chart;
    const dashboardSchema = openApiSpec.components.schemas.Dashboard;
    const datasetSchema = openApiSpec.components.schemas.AnalyticsDataset;
    const reportSchema = openApiSpec.components.schemas.AnalyticsReport;

    expect(chartSchema.properties.status.enum).toEqual(['draft', 'published', 'archived']);
    expect(chartSchema.properties.uiStatus.enum).toEqual(['draft', 'published', 'archived']);
    expect(dashboardSchema.properties.status.enum).toEqual(['draft', 'published', 'archived']);
    expect(datasetSchema.properties.status.enum).toEqual(['active', 'deprecated']);
    expect(reportSchema.properties.status.enum).toEqual(['generated', 'exported', 'archived']);
  });

  test('transition-sensitive endpoints describe status transition validation', () => {
    const datasetPatch = openApiSpec.paths['/api/v1/analytics/datasets/{id}'].patch;
    const chartPut = openApiSpec.paths['/api/v1/analytics/charts/{id}'].put;
    const dashboardPatch = openApiSpec.paths['/api/v1/analytics/dashboards/{id}'].patch;
    const templatePatch = openApiSpec.paths['/api/v1/analytics/dashboards/templates/{id}'].patch;
    const reportPatch = openApiSpec.paths['/api/v1/analytics/reports/{id}'].patch;

    expect(datasetPatch.description).toContain('status transition');
    expect(chartPut.description).toContain('status transition');
    expect(dashboardPatch.description).toContain('status transition');
    expect(templatePatch.description).toContain('status transition');
    expect(reportPatch.description).toContain('status transition');
  });
});
