const mockCollectionPointModel = {
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
  default: {},
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

describe('Logistics warehouse lifecycle status mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createCollectionPoint persists explicit warehouse status', async () => {
    const req = {
      body: {
        name: 'Central Warehouse',
        type: 'warehouse',
        status: 'maintenance',
        address: { country: 'Uganda', district: 'Wakiso' },
      },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user,
    };
    const res = createResponseMock(req);
    const next = jest.fn();

    const warehouse = {
      _id: { toString: () => '507f1f77bcf86cd799439181' },
      ...req.body,
      isActive: true,
    };
    mockCollectionPointModel.create.mockResolvedValue(warehouse);

    await controller.createCollectionPoint(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockCollectionPointModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'maintenance',
        isActive: true,
      })
    );
    expect(res.statusCode).toBe(201);
    expect(res.payload.data.status).toBe('maintenance');
  });

  test('listCollectionPoints supports lifecycle status filter', async () => {
    const req = {
      query: { type: 'warehouse', status: 'inactive', page: '1', limit: '20' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user,
    };
    const res = createResponseMock(req);
    const next = jest.fn();

    const rows = [{ _id: '507f1f77bcf86cd799439182', status: 'inactive', isActive: false }];
    const limit = jest.fn().mockResolvedValue(rows);
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    mockCollectionPointModel.find.mockReturnValue({ sort });
    mockCollectionPointModel.countDocuments.mockResolvedValue(1);

    await controller.listCollectionPoints(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockCollectionPointModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'warehouse',
        status: 'inactive',
        isActive: { $in: [true, false] },
      })
    );
    expect(res.payload.success).toBe(true);
    expect(res.payload.data[0].status).toBe('inactive');
  });

  test('updateCollectionPoint syncs inactive status with isActive=false', async () => {
    const point = {
      _id: { toString: () => '507f1f77bcf86cd799439183' },
      organization: { toString: () => user.orgId },
      createdBy: { toString: () => user.id },
      status: 'active',
      isActive: true,
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockCollectionPointModel.findById.mockResolvedValue(point);

    const req = {
      params: { id: '507f1f77bcf86cd799439183' },
      body: { status: 'inactive' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user,
    };
    const res = createResponseMock(req);
    const next = jest.fn();

    await controller.updateCollectionPoint(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(point.status).toBe('inactive');
    expect(point.isActive).toBe(false);
    expect(point.save).toHaveBeenCalledTimes(1);
    expect(res.payload.data.status).toBe('inactive');
  });
});
