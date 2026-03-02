const mockCollectionPointModel = {
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
};

const mockShipmentModel = {
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
};

jest.mock('../dist/modules/logistics/collectionPoint.model', () => ({
  __esModule: true,
  default: mockCollectionPointModel,
}));

jest.mock('../dist/modules/logistics/shipment.model', () => ({
  __esModule: true,
  default: mockShipmentModel,
}));

jest.mock('../dist/modules/audit/audit.service', () => ({
  __esModule: true,
  default: { log: jest.fn().mockResolvedValue(undefined) },
}));

const controller = require('../dist/modules/logistics/logistics.controller').default;

const createResponseMock = (req) => ({
  locals: { requestId: 'req-123' },
  req,
  statusCode: 200,
  payload: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.payload = body;
    return this;
  },
});

const user = {
  id: '507f1f77bcf86cd799439011',
  role: 'admin',
  orgId: '507f1f77bcf86cd799439012',
};

const createListQueryMock = (model, rows) => {
  const limit = jest.fn().mockResolvedValue(rows);
  const skip = jest.fn().mockReturnValue({ limit });
  const sort = jest.fn().mockReturnValue({ skip });
  model.find.mockReturnValue({ sort });
};

describe('Logistics shipment API status harmonization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('create/list/get responses expose canonical uiStatus and list uiStatus filter maps to native statuses', async () => {
    const next = jest.fn();

    const createdShipment = {
      _id: { toString: () => '507f1f77bcf86cd799439101' },
      shipmentNumber: 'SHP-1700000000000-12345',
      status: 'created',
      organization: user.orgId,
      createdBy: user.id,
      trackingEvents: [],
      save: jest.fn(),
    };

    mockShipmentModel.create.mockResolvedValue(createdShipment);

    const createReq = {
      body: {
        from: { type: 'warehouse', label: 'Warehouse A' },
        to: { type: 'address', label: 'Delivery Point' },
      },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user,
    };
    const createRes = createResponseMock(createReq);

    await controller.createShipment(createReq, createRes, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockShipmentModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'created',
      })
    );
    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.success).toBe(true);
    expect(createRes.payload.data.uiStatus).toBe('planned');

    const rows = [
      { _id: '507f1f77bcf86cd799439102', status: 'assigned' },
      { _id: '507f1f77bcf86cd799439103', status: 'picked_up' },
      { _id: '507f1f77bcf86cd799439104', status: 'delivered' },
      { _id: '507f1f77bcf86cd799439105', status: 'returned' },
    ];
    createListQueryMock(mockShipmentModel, rows);
    mockShipmentModel.countDocuments.mockResolvedValue(rows.length);

    const listReq = {
      query: { uiStatus: 'planned', page: '1', limit: '20' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user,
    };
    const listRes = createResponseMock(listReq);

    await controller.listShipments(listReq, listRes, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockShipmentModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        organization: user.orgId,
        status: { $in: ['created', 'assigned'] },
      })
    );
    expect(listRes.payload.success).toBe(true);
    expect(listRes.payload.data.map((item) => item.uiStatus)).toEqual([
      'planned',
      'in_transit',
      'delivered',
      'cancelled',
    ]);
    expect(listRes.payload.meta.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 4,
      totalPages: 1,
    });

    const fetchedShipment = {
      _id: '507f1f77bcf86cd799439106',
      status: 'assigned',
      organization: user.orgId,
      createdBy: user.id,
    };
    mockShipmentModel.findById.mockResolvedValue(fetchedShipment);

    const getReq = {
      params: { id: '507f1f77bcf86cd799439106' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user,
    };
    const getRes = createResponseMock(getReq);

    await controller.getShipment(getReq, getRes, next);

    expect(next).not.toHaveBeenCalled();
    expect(getRes.payload.success).toBe(true);
    expect(getRes.payload.data.uiStatus).toBe('planned');
  });

  test('shipment status updates accept uiStatus mapping and reject invalid transitions with 400', async () => {
    const next = jest.fn();

    const inFlightShipment = {
      _id: '507f1f77bcf86cd799439107',
      status: 'assigned',
      organization: user.orgId,
      createdBy: user.id,
      trackingEvents: [],
      save: jest.fn().mockResolvedValue(undefined),
    };

    const cancelledShipment = {
      _id: '507f1f77bcf86cd799439108',
      status: 'cancelled',
      organization: user.orgId,
      createdBy: user.id,
      trackingEvents: [],
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockShipmentModel.findById
      .mockResolvedValueOnce(inFlightShipment)
      .mockResolvedValueOnce(cancelledShipment);

    const updateReq = {
      params: { id: '507f1f77bcf86cd799439107' },
      body: { uiStatus: 'in_transit', note: 'Carrier departed', location: 'Kampala' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user,
    };
    const updateRes = createResponseMock(updateReq);

    await controller.updateShipmentStatus(updateReq, updateRes, next);

    expect(next).not.toHaveBeenCalled();
    expect(inFlightShipment.status).toBe('in_transit');
    expect(inFlightShipment.trackingEvents).toHaveLength(1);
    expect(inFlightShipment.save).toHaveBeenCalledTimes(1);
    expect(updateRes.payload.success).toBe(true);
    expect(updateRes.payload.data.uiStatus).toBe('in_transit');

    const invalidReq = {
      params: { id: '507f1f77bcf86cd799439108' },
      body: { uiStatus: 'delivered', note: 'Attempt invalid transition' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user,
    };
    const invalidRes = createResponseMock(invalidReq);

    await controller.updateShipmentStatus(invalidReq, invalidRes, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });
});
