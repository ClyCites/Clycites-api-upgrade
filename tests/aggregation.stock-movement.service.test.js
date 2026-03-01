const mongoose = require('mongoose');

const mockShipmentModel = {
  findById: jest.fn(),
};

const mockAuditLog = jest.fn().mockResolvedValue(undefined);

jest.mock('../dist/modules/logistics/shipment.model', () => ({
  __esModule: true,
  default: mockShipmentModel,
}));

jest.mock('../dist/modules/audit/audit.service', () => ({
  __esModule: true,
  default: {
    log: mockAuditLog,
  },
}));

const aggregationService = require('../dist/modules/aggregation/aggregation.service').default;

const orgId = '507f1f77bcf86cd799439012';
const actor = {
  userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
  role: 'platform_admin',
  orgId,
};

const movementId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439171');

const buildShipment = (overrides = {}) => ({
  _id: movementId,
  organization: new mongoose.Types.ObjectId(orgId),
  from: {
    type: 'farm',
    refId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439172'),
    label: 'Farm A',
  },
  to: {
    type: 'warehouse',
    refId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439173'),
    label: 'Warehouse A',
  },
  status: 'created',
  metadata: { quantity: '1250' },
  trackingEvents: [],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('Aggregation stock movement service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getStockMovement maps shipment to stock movement contract', async () => {
    const shipment = buildShipment({ status: 'assigned' });
    mockShipmentModel.findById.mockResolvedValue(shipment);

    const movement = await aggregationService.getStockMovement(movementId, actor);

    expect(movement.shipmentId).toBe(movementId.toString());
    expect(movement.movementType).toBe('receive');
    expect(movement.status).toBe('confirmed');
    expect(movement.quantity).toBe(1250);
  });

  test('updateStockMovement applies valid transition and writes tracking event', async () => {
    const shipment = buildShipment({ status: 'created', metadata: {} });
    mockShipmentModel.findById.mockResolvedValue(shipment);

    const movement = await aggregationService.updateStockMovement(
      movementId,
      actor,
      {
        status: 'confirmed',
        quantity: 1800,
        note: 'Confirmed by warehouse team',
      }
    );

    expect(shipment.status).toBe('in_transit');
    expect(shipment.save).toHaveBeenCalledTimes(1);
    expect(shipment.trackingEvents.length).toBe(1);
    expect(movement.status).toBe('confirmed');
    expect(movement.quantity).toBe(1800);
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'aggregation.stock_movement_updated',
      })
    );
  });

  test('updateStockMovement rejects invalid transition with 400', async () => {
    const shipment = buildShipment({ status: 'delivered' });
    mockShipmentModel.findById.mockResolvedValue(shipment);

    await expect(
      aggregationService.updateStockMovement(
        movementId,
        actor,
        { status: 'confirmed' }
      )
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test('deleteStockMovement marks projection as deleted and cancels shipment', async () => {
    const shipment = buildShipment({ status: 'created', metadata: {} });
    mockShipmentModel.findById.mockResolvedValue(shipment);

    await aggregationService.deleteStockMovement(movementId, actor);

    expect(shipment.metadata.aggregationDeleted).toBe('true');
    expect(shipment.status).toBe('cancelled');
    expect(shipment.save).toHaveBeenCalledTimes(1);
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'aggregation.stock_movement_deleted',
      })
    );
  });
});
