const { openApiSpec } = require('../dist/common/docs');

describe('OpenAPI logistics workspace contract coverage', () => {
  test('logistics entity endpoints are present', () => {
    expect(openApiSpec.paths['/api/v1/logistics/shipments']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/logistics/shipments/{id}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/logistics/shipments/{id}/status']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/logistics/shipments/{id}/tracking']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/logistics/shipments/{id}/proof-of-delivery']).toBeDefined();

    expect(openApiSpec.paths['/api/v1/logistics/routes']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/logistics/routes/{routeId}']).toBeDefined();

    expect(openApiSpec.paths['/api/v1/logistics/vehicles']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/logistics/vehicles/{vehicleId}']).toBeDefined();

    expect(openApiSpec.paths['/api/v1/logistics/drivers']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/logistics/drivers/{driverId}']).toBeDefined();

    expect(openApiSpec.paths['/api/v1/logistics/tracking-events']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/logistics/tracking-events/{eventId}']).toBeDefined();

    expect(openApiSpec.paths['/api/v1/logistics/cold-chain-logs']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/logistics/cold-chain-logs/{logId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/logistics/cold-chain-logs/flag-violations']).toBeDefined();
  });

  test('shipment and logistics enums are documented for frontend status contracts', () => {
    const shipmentSchema = openApiSpec.components.schemas.LogisticsShipment;
    const routeSchema = openApiSpec.components.schemas.LogisticsRoute;
    const vehicleSchema = openApiSpec.components.schemas.LogisticsVehicle;
    const driverSchema = openApiSpec.components.schemas.LogisticsDriver;
    const trackingSchema = openApiSpec.components.schemas.LogisticsTrackingEvent;
    const coldChainSchema = openApiSpec.components.schemas.LogisticsColdChainLog;

    expect(shipmentSchema.properties.status.enum).toEqual([
      'created',
      'assigned',
      'picked_up',
      'in_transit',
      'delivered',
      'cancelled',
      'returned',
    ]);
    expect(shipmentSchema.properties.uiStatus.enum).toEqual([
      'planned',
      'in_transit',
      'delivered',
      'cancelled',
    ]);

    expect(routeSchema.properties.status.enum).toEqual(['draft', 'active', 'archived']);
    expect(vehicleSchema.properties.status.enum).toEqual(['available', 'assigned', 'maintenance', 'inactive']);
    expect(driverSchema.properties.status.enum).toEqual(['available', 'assigned', 'inactive']);
    expect(trackingSchema.properties.status.enum).toEqual(['created', 'verified', 'closed']);
    expect(coldChainSchema.properties.status.enum).toEqual(['normal', 'violation', 'resolved']);
  });

  test('transition and uiStatus request contract is explicit on shipment and resource mutation endpoints', () => {
    const shipmentStatusPatch = openApiSpec.paths['/api/v1/logistics/shipments/{id}/status'].patch;
    const shipmentStatusBody = shipmentStatusPatch.requestBody.content['application/json'].schema;
    expect(shipmentStatusBody.properties.uiStatus.enum).toEqual([
      'planned',
      'in_transit',
      'delivered',
      'cancelled',
    ]);

    const routesPatch = openApiSpec.paths['/api/v1/logistics/routes/{routeId}'].patch;
    const vehiclesPatch = openApiSpec.paths['/api/v1/logistics/vehicles/{vehicleId}'].patch;
    const driversPatch = openApiSpec.paths['/api/v1/logistics/drivers/{driverId}'].patch;
    const trackingPatch = openApiSpec.paths['/api/v1/logistics/tracking-events/{eventId}'].patch;
    const coldChainPatch = openApiSpec.paths['/api/v1/logistics/cold-chain-logs/{logId}'].patch;

    expect(routesPatch.description).toContain('Allowed transitions');
    expect(vehiclesPatch.description).toContain('Validates status transitions');
    expect(driversPatch.description).toContain('Validates status transitions');
    expect(trackingPatch.description).toContain('Allowed transitions');
    expect(coldChainPatch.description).toContain('Allowed transitions');
  });
});
