const { openApiSpec } = require('../dist/common/docs');

describe('OpenAPI prices workspace contract coverage', () => {
  test('prices workspace endpoints are present', () => {
    expect(openApiSpec.paths['/api/v1/products']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/products/{id}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/prices']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/prices/{id}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/pricing/estimations']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/pricing/estimations/{estimationId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/prices/predictions']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/prices/predictions/{predictionId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/prices/predictions/{predictionId}/regenerate']).toBeDefined();

    expect(openApiSpec.paths['/api/v1/market-intelligence/insights']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/market-intelligence/trends']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/market-intelligence/compare']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/market-intelligence/alerts']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/market-intelligence/alerts/{alertId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/market-intelligence/recommendations']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/market-intelligence/recommendations/{recommendationId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/market-intelligence/recommendations/{recommendationId}/approve']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/market-intelligence/recommendations/{recommendationId}/publish']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/market-intelligence/recommendations/{recommendationId}/retract']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/market-intelligence/data-sources']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/market-intelligence/data-sources/{sourceId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/market-intelligence/data-sources/{sourceId}/refresh']).toBeDefined();
  });

  test('prices schemas document frontend-aligned status enums', () => {
    const priceSchema = openApiSpec.components.schemas.Price;
    const estimationSchema = openApiSpec.components.schemas.PriceEstimation;
    const predictionSchema = openApiSpec.components.schemas.PricePrediction;
    const signalSchema = openApiSpec.components.schemas.MarketSignal;
    const recommendationSchema = openApiSpec.components.schemas.MarketRecommendation;
    const dataSourceSchema = openApiSpec.components.schemas.MarketDataSource;

    expect(priceSchema.properties.status.enum).toEqual(['captured', 'validated', 'published']);
    expect(priceSchema.properties.uiStatus.enum).toEqual(['captured', 'validated', 'published']);
    expect(estimationSchema.properties.status.enum).toEqual(['draft', 'submitted', 'approved']);
    expect(predictionSchema.properties.status.enum).toEqual(['generated', 'compared', 'archived']);
    expect(signalSchema.properties.uiStatus.enum).toEqual(['new', 'investigating', 'investigated', 'dismissed']);
    expect(recommendationSchema.properties.status.enum).toEqual(['draft', 'approved', 'published', 'retracted']);
    expect(dataSourceSchema.properties.status.enum).toEqual(['active', 'paused', 'disabled']);
  });

  test('transition-sensitive workspace endpoints document transition behavior', () => {
    const alertPatch = openApiSpec.paths['/api/v1/market-intelligence/alerts/{alertId}'].patch;
    const recommendationPatch = openApiSpec.paths['/api/v1/market-intelligence/recommendations/{recommendationId}'].patch;
    const dataSourcePatch = openApiSpec.paths['/api/v1/market-intelligence/data-sources/{sourceId}'].patch;
    const estimationPatch = openApiSpec.paths['/api/v1/pricing/estimations/{estimationId}'].patch;
    const predictionPatch = openApiSpec.paths['/api/v1/prices/predictions/{predictionId}'].patch;

    expect(alertPatch.description).toContain('status transition');
    expect(recommendationPatch.description).toContain('status transition');
    expect(dataSourcePatch.description).toContain('status transition');
    expect(estimationPatch.description).toContain('status transition');
    expect(predictionPatch.description).toContain('status transition');
  });
});
