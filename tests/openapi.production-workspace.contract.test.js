const { openApiSpec } = require('../dist/common/docs');

describe('OpenAPI production workspace contract coverage', () => {
  test('crop cycle status mapping contract is documented', () => {
    const cropSchema = openApiSpec.components.schemas.FarmerCropProduction;
    expect(cropSchema.properties.productionStatus.enum).toEqual([
      'planned',
      'in_progress',
      'harvested',
      'sold',
      'stored',
      'failed',
    ]);
    expect(cropSchema.properties.uiStatus.enum).toEqual([
      'planned',
      'active',
      'completed',
    ]);
  });

  test('growth stage and yield prediction endpoints are present', () => {
    expect(openApiSpec.paths['/api/v1/farmers/{farmerId}/production/growth-stages']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/farmers/production/growth-stages/{stageId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/farmers/{farmerId}/production/yield-predictions']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/farmers/production/yield-predictions/{predictionId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/farmers/production/yield-predictions/{predictionId}/refresh']).toBeDefined();
  });

  test('sensor reading CRUD workflow endpoints are present', () => {
    expect(openApiSpec.paths['/api/v1/weather/profiles/{profileId}/conditions'].post).toBeDefined();
    expect(openApiSpec.paths['/api/v1/weather/conditions/{readingId}'].get).toBeDefined();
    expect(openApiSpec.paths['/api/v1/weather/conditions/{readingId}'].patch).toBeDefined();

    const sensorSchema = openApiSpec.components.schemas.WeatherSensorReading;
    expect(sensorSchema.properties.status.enum).toEqual(['captured', 'flagged', 'verified']);
  });

  test('pest incident JSON CRUD + lifecycle endpoints are present', () => {
    expect(openApiSpec.paths['/api/v1/pest-disease/farmers/{farmerId}/reports'].post).toBeDefined();
    expect(openApiSpec.paths['/api/v1/pest-disease/reports/{reportId}'].patch).toBeDefined();
    expect(openApiSpec.paths['/api/v1/pest-disease/reports/{reportId}'].delete).toBeDefined();
    expect(openApiSpec.paths['/api/v1/pest-disease/reports/{reportId}/assign']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/pest-disease/reports/{reportId}/close']).toBeDefined();

    const reportSchema = openApiSpec.components.schemas.PestDiseaseReport;
    expect(reportSchema.properties.uiStatus.enum).toEqual(['created', 'assigned', 'resolved', 'closed']);
  });
});
