const { openApiSpec } = require('../dist/common/docs');

describe('OpenAPI marketplace workspace contract coverage', () => {
  test('marketplace entity endpoints are present', () => {
    expect(openApiSpec.paths['/api/v1/listings']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/listings/{id}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/listings/{id}/status']).toBeDefined();

    expect(openApiSpec.paths['/api/v1/offers']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/offers/{offerId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/offers/{offerId}/accept']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/offers/{offerId}/withdraw']).toBeDefined();

    expect(openApiSpec.paths['/api/v1/orders/my-orders']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/orders/{id}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/orders/{id}/status']).toBeDefined();

    expect(openApiSpec.paths['/api/v1/marketplace/contracts']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/marketplace/contracts/{contractId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/marketplace/contracts/{contractId}/sign']).toBeDefined();

    expect(openApiSpec.paths['/api/v1/messaging/conversations']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/messaging/conversations/{id}/negotiation-status']).toBeDefined();

    expect(openApiSpec.paths['/api/v1/reputation/ratings/{ratingId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/reputation/ratings/{ratingId}/moderate']).toBeDefined();
  });

  test('marketplace status contracts are documented for frontend enums', () => {
    const listingSchema = openApiSpec.components.schemas.Listing;
    const orderSchema = openApiSpec.components.schemas.Order;
    const conversationSchema = openApiSpec.components.schemas.Conversation;
    const contractSchema = openApiSpec.components.schemas.MarketplaceContract;

    expect(listingSchema.properties.uiStatus.enum).toEqual(['draft', 'published', 'paused', 'closed']);
    expect(orderSchema.properties.uiStatus.enum).toEqual(['created', 'accepted', 'rejected', 'fulfilled', 'cancelled']);
    expect(conversationSchema.properties.negotiationStatus.enum).toEqual(['open', 'agreed', 'stalled', 'closed']);
    expect(contractSchema.properties.status.enum).toEqual(['draft', 'under_review', 'active', 'completed', 'terminated']);
  });

  test('offer and reviews uiStatus query/status fields are documented', () => {
    const offersGet = openApiSpec.paths['/api/v1/offers'].get;
    const offerUiStatusQuery = offersGet.parameters.find((param) => param.name === 'uiStatus');
    expect(offerUiStatusQuery.schema.enum).toEqual(['open', 'responded', 'shortlisted', 'closed']);

    const ratingsList = openApiSpec.paths['/api/v1/reputation/users/{userId}/ratings'].get;
    const ratingUiStatusQuery = ratingsList.parameters.find((param) => param.name === 'uiStatus');
    expect(ratingUiStatusQuery.schema.enum).toEqual(['draft', 'published', 'hidden']);

    const ratingsModerate = openApiSpec.paths['/api/v1/reputation/ratings/{ratingId}/moderate'].post;
    const moderateSchema = ratingsModerate.requestBody.content['application/json'].schema;
    expect(moderateSchema.properties.status.enum).toEqual(['draft', 'published', 'hidden']);
  });
});
