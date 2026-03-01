const mockOrderModel = {
  findById: jest.fn(),
};

jest.mock('../dist/modules/orders/order.model', () => ({
  __esModule: true,
  default: mockOrderModel,
}));

jest.mock('../dist/modules/marketplace/listing.model', () => ({
  __esModule: true,
  default: {},
}));

const OrderService = require('../dist/modules/orders/order.service').default;

describe('Order service status transition validation', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrderService();
  });

  test('maps uiStatus to native status and applies valid transition', async () => {
    const orderDoc = {
      _id: '507f1f77bcf86cd799439701',
      status: 'delivered',
      farmer: { toString: () => '507f1f77bcf86cd799439712' },
      statusHistory: [],
      save: jest.fn().mockResolvedValue(undefined),
      populate: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439701',
        status: 'completed',
      }),
    };

    mockOrderModel.findById.mockResolvedValue(orderDoc);

    const result = await service.updateOrderStatus(
      '507f1f77bcf86cd799439701',
      'fulfilled',
      '507f1f77bcf86cd799439711',
      'admin'
    );

    expect(orderDoc.status).toBe('completed');
    expect(orderDoc.save).toHaveBeenCalledTimes(1);
    expect(orderDoc.statusHistory).toHaveLength(1);
    expect(result.status).toBe('completed');
  });

  test('rejects invalid transition with 400 error', async () => {
    const orderDoc = {
      _id: '507f1f77bcf86cd799439702',
      status: 'pending',
      farmer: { toString: () => '507f1f77bcf86cd799439712' },
      statusHistory: [],
      save: jest.fn(),
      populate: jest.fn(),
    };

    mockOrderModel.findById.mockResolvedValue(orderDoc);

    await expect(
      service.updateOrderStatus(
        '507f1f77bcf86cd799439702',
        'completed',
        '507f1f77bcf86cd799439711',
        'admin'
      )
    ).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(orderDoc.save).not.toHaveBeenCalled();
  });
});
