const { openApiSpec } = require('../dist/common/docs');

describe('OpenAPI aggregation workspace contract coverage', () => {
  test('aggregation endpoints are present', () => {
    expect(openApiSpec.paths['/api/v1/aggregation/warehouses/{warehouseId}/bins']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/aggregation/bins/{binId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/aggregation/batches']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/aggregation/batches/{batchId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/aggregation/quality-grades']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/aggregation/quality-grades/{gradeId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/aggregation/stock-movements/{movementId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/aggregation/spoilage-reports']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/aggregation/spoilage-reports/{reportId}']).toBeDefined();
  });

  test('aggregation status enums are documented', () => {
    const warehouseSchema = openApiSpec.components.schemas.AggregationWarehouse;
    const binSchema = openApiSpec.components.schemas.AggregationStorageBin;
    const batchSchema = openApiSpec.components.schemas.AggregationBatch;
    const gradeSchema = openApiSpec.components.schemas.AggregationQualityGrade;
    const movementSchema = openApiSpec.components.schemas.AggregationStockMovement;
    const spoilageSchema = openApiSpec.components.schemas.AggregationSpoilageReport;

    expect(warehouseSchema.properties.status.enum).toEqual(['active', 'maintenance', 'inactive']);
    expect(binSchema.properties.status.enum).toEqual(['available', 'occupied', 'maintenance']);
    expect(batchSchema.properties.status.enum).toEqual(['received', 'stored', 'dispatched', 'closed']);
    expect(gradeSchema.properties.status.enum).toEqual(['draft', 'verified', 'final']);
    expect(movementSchema.properties.status.enum).toEqual(['draft', 'confirmed', 'completed', 'rejected']);
    expect(spoilageSchema.properties.status.enum).toEqual(['reported', 'approved', 'closed']);
  });

  test('warehouse lifecycle status is documented for logistics collection points', () => {
    const collectionPointList = openApiSpec.paths['/api/v1/logistics/collection-points'].get;
    const statusQuery = collectionPointList.parameters.find((param) => param.name === 'status');
    expect(statusQuery.schema.enum).toEqual(['active', 'maintenance', 'inactive']);

    const createCollectionPoint = openApiSpec.paths['/api/v1/logistics/collection-points'].post;
    const createSchema = createCollectionPoint.requestBody.content['application/json'].schema;
    expect(createSchema.properties.status.enum).toEqual(['active', 'maintenance', 'inactive']);
  });
});
