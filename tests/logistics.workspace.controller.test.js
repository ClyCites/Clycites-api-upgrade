const mockRouteModel = {
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findOne: jest.fn(),
};

const mockVehicleModel = {
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findOne: jest.fn(),
};

const mockDriverModel = {
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findOne: jest.fn(),
};

const mockTrackingEventModel = {
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findOne: jest.fn(),
};

const mockColdChainLogModel = {
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findOne: jest.fn(),
};

const mockShipmentModel = {
  findById: jest.fn(),
};

jest.mock('../dist/modules/logistics/route.model', () => ({
  __esModule: true,
  default: mockRouteModel,
}));

jest.mock('../dist/modules/logistics/vehicle.model', () => ({
  __esModule: true,
  default: mockVehicleModel,
}));

jest.mock('../dist/modules/logistics/driver.model', () => ({
  __esModule: true,
  default: mockDriverModel,
}));

jest.mock('../dist/modules/logistics/trackingEvent.model', () => ({
  __esModule: true,
  default: mockTrackingEventModel,
}));

jest.mock('../dist/modules/logistics/coldChainLog.model', () => ({
  __esModule: true,
  default: mockColdChainLogModel,
}));

jest.mock('../dist/modules/logistics/shipment.model', () => ({
  __esModule: true,
  default: mockShipmentModel,
}));

jest.mock('../dist/modules/audit/audit.service', () => ({
  __esModule: true,
  default: { log: jest.fn().mockResolvedValue(undefined) },
}));

const controller = require('../dist/modules/logistics/logisticsWorkspace.controller').default;

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

const createPagedFindQuery = (rows) => {
  const limit = jest.fn().mockResolvedValue(rows);
  const skip = jest.fn().mockReturnValue({ limit });
  const sort = jest.fn().mockReturnValue({ skip });
  return { sort };
};

const adminUser = {
  id: '507f1f77bcf86cd799439011',
  role: 'admin',
  orgId: '507f1f77bcf86cd799439012',
};

describe('Logistics workspace controller contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('routes CRUD supports uiStatus and rejects invalid status transitions', async () => {
    const next = jest.fn();

    const routeRows = [{ _id: '507f1f77bcf86cd799439101', status: 'draft' }];
    mockRouteModel.find.mockReturnValue(createPagedFindQuery(routeRows));
    mockRouteModel.countDocuments.mockResolvedValue(1);

    const listReq = {
      query: { page: '1', limit: '20', status: 'draft' },
      params: {},
      body: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const listRes = createResponseMock(listReq);

    await controller.listRoutes(listReq, listRes, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockRouteModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        organization: adminUser.orgId,
        status: 'draft',
        isActive: true,
      })
    );
    expect(listRes.payload.success).toBe(true);
    expect(listRes.payload.data[0].uiStatus).toBe('draft');
    expect(listRes.payload.meta.pagination.total).toBe(1);

    const createdRoute = {
      _id: { toString: () => '507f1f77bcf86cd799439102' },
      status: 'draft',
      isActive: true,
    };
    mockRouteModel.create.mockResolvedValue(createdRoute);

    const createReq = {
      body: {
        origin: 'Kampala',
        destination: 'Gulu',
        distanceKm: 340,
        waypoints: ['Luweero'],
      },
      query: {},
      params: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const createRes = createResponseMock(createReq);

    await controller.createRoute(createReq, createRes, next);

    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.success).toBe(true);
    expect(createRes.payload.data.uiStatus).toBe('draft');

    const routeForGet = {
      _id: '507f1f77bcf86cd799439103',
      status: 'active',
      organization: adminUser.orgId,
      createdBy: adminUser.id,
      isActive: true,
    };

    const routeForUpdate = {
      _id: { toString: () => '507f1f77bcf86cd799439104' },
      status: 'draft',
      organization: adminUser.orgId,
      createdBy: adminUser.id,
      isActive: true,
      save: jest.fn().mockResolvedValue(undefined),
    };

    const routeForDelete = {
      _id: { toString: () => '507f1f77bcf86cd799439105' },
      status: 'active',
      organization: adminUser.orgId,
      createdBy: adminUser.id,
      isActive: true,
      save: jest.fn().mockResolvedValue(undefined),
    };

    const routeForInvalidUpdate = {
      _id: { toString: () => '507f1f77bcf86cd799439106' },
      status: 'active',
      organization: adminUser.orgId,
      createdBy: adminUser.id,
      isActive: true,
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockRouteModel.findOne
      .mockResolvedValueOnce(routeForGet)
      .mockResolvedValueOnce(routeForUpdate)
      .mockResolvedValueOnce(routeForDelete)
      .mockResolvedValueOnce(routeForInvalidUpdate);

    const getReq = {
      params: { routeId: '507f1f77bcf86cd799439103' },
      query: {},
      body: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const getRes = createResponseMock(getReq);

    await controller.getRoute(getReq, getRes, next);

    expect(getRes.payload.success).toBe(true);
    expect(getRes.payload.data.status).toBe('active');

    const updateReq = {
      params: { routeId: '507f1f77bcf86cd799439104' },
      body: { status: 'active', notes: 'Activated route' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const updateRes = createResponseMock(updateReq);

    await controller.updateRoute(updateReq, updateRes, next);

    expect(routeForUpdate.status).toBe('active');
    expect(routeForUpdate.isActive).toBe(true);
    expect(routeForUpdate.save).toHaveBeenCalledTimes(1);
    expect(updateRes.payload.data.uiStatus).toBe('active');

    const deleteReq = {
      params: { routeId: '507f1f77bcf86cd799439105' },
      query: {},
      body: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const deleteRes = createResponseMock(deleteReq);

    await controller.deleteRoute(deleteReq, deleteRes, next);

    expect(routeForDelete.isActive).toBe(false);
    expect(routeForDelete.status).toBe('archived');
    expect(deleteRes.payload.success).toBe(true);
    expect(deleteRes.payload.data).toBeNull();

    const invalidUpdateReq = {
      params: { routeId: '507f1f77bcf86cd799439106' },
      body: { status: 'draft' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const invalidUpdateRes = createResponseMock(invalidUpdateReq);

    await controller.updateRoute(invalidUpdateReq, invalidUpdateRes, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  test('vehicles CRUD preserves inactive status as readable state and validates transitions', async () => {
    const next = jest.fn();

    const vehicleRows = [{ _id: '507f1f77bcf86cd799439111', status: 'available', available: true }];
    mockVehicleModel.find.mockReturnValue(createPagedFindQuery(vehicleRows));
    mockVehicleModel.countDocuments.mockResolvedValue(1);

    const listReq = {
      query: { page: '1', limit: '20' },
      params: {},
      body: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const listRes = createResponseMock(listReq);

    await controller.listVehicles(listReq, listRes, next);

    expect(listRes.payload.success).toBe(true);
    expect(listRes.payload.data[0].uiStatus).toBe('available');

    const createdVehicle = {
      _id: { toString: () => '507f1f77bcf86cd799439112' },
      status: 'assigned',
      available: false,
      isActive: true,
    };
    mockVehicleModel.create.mockResolvedValue(createdVehicle);

    const createReq = {
      body: {
        registration: 'UBA 123A',
        capacityKg: 5000,
        available: false,
      },
      query: {},
      params: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const createRes = createResponseMock(createReq);

    await controller.createVehicle(createReq, createRes, next);

    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data.uiStatus).toBe('assigned');

    const vehicleForGet = {
      _id: '507f1f77bcf86cd799439113',
      status: 'inactive',
      available: false,
      organization: adminUser.orgId,
      createdBy: adminUser.id,
      isActive: true,
    };

    const vehicleForUpdate = {
      _id: { toString: () => '507f1f77bcf86cd799439114' },
      status: 'available',
      available: true,
      organization: adminUser.orgId,
      createdBy: adminUser.id,
      isActive: true,
      save: jest.fn().mockResolvedValue(undefined),
    };

    const vehicleForDelete = {
      _id: { toString: () => '507f1f77bcf86cd799439115' },
      status: 'assigned',
      available: false,
      organization: adminUser.orgId,
      createdBy: adminUser.id,
      isActive: true,
      save: jest.fn().mockResolvedValue(undefined),
    };

    const vehicleForInvalidUpdate = {
      _id: { toString: () => '507f1f77bcf86cd799439116' },
      status: 'inactive',
      available: false,
      organization: adminUser.orgId,
      createdBy: adminUser.id,
      isActive: true,
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockVehicleModel.findOne
      .mockResolvedValueOnce(vehicleForGet)
      .mockResolvedValueOnce(vehicleForUpdate)
      .mockResolvedValueOnce(vehicleForDelete)
      .mockResolvedValueOnce(vehicleForInvalidUpdate);

    const getReq = {
      params: { vehicleId: '507f1f77bcf86cd799439113' },
      query: {},
      body: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const getRes = createResponseMock(getReq);

    await controller.getVehicle(getReq, getRes, next);

    expect(getRes.payload.success).toBe(true);
    expect(getRes.payload.data.uiStatus).toBe('inactive');

    const updateReq = {
      params: { vehicleId: '507f1f77bcf86cd799439114' },
      body: { status: 'maintenance' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const updateRes = createResponseMock(updateReq);

    await controller.updateVehicle(updateReq, updateRes, next);

    expect(vehicleForUpdate.status).toBe('maintenance');
    expect(vehicleForUpdate.available).toBe(false);
    expect(vehicleForUpdate.isActive).toBe(true);
    expect(vehicleForUpdate.save).toHaveBeenCalledTimes(1);
    expect(updateRes.payload.data.uiStatus).toBe('maintenance');

    const deleteReq = {
      params: { vehicleId: '507f1f77bcf86cd799439115' },
      query: {},
      body: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const deleteRes = createResponseMock(deleteReq);

    await controller.deleteVehicle(deleteReq, deleteRes, next);

    expect(vehicleForDelete.status).toBe('inactive');
    expect(vehicleForDelete.available).toBe(false);
    expect(vehicleForDelete.isActive).toBe(false);
    expect(deleteRes.payload.data).toBeNull();

    const invalidUpdateReq = {
      params: { vehicleId: '507f1f77bcf86cd799439116' },
      body: { status: 'maintenance' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const invalidUpdateRes = createResponseMock(invalidUpdateReq);

    await controller.updateVehicle(invalidUpdateReq, invalidUpdateRes, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  test('drivers CRUD preserves inactive status as readable state and validates transitions', async () => {
    const next = jest.fn();

    const driverRows = [{ _id: '507f1f77bcf86cd799439121', status: 'available', available: true }];
    mockDriverModel.find.mockReturnValue(createPagedFindQuery(driverRows));
    mockDriverModel.countDocuments.mockResolvedValue(1);

    const listReq = {
      query: { page: '1', limit: '20' },
      params: {},
      body: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const listRes = createResponseMock(listReq);

    await controller.listDrivers(listReq, listRes, next);

    expect(listRes.payload.success).toBe(true);
    expect(listRes.payload.data[0].uiStatus).toBe('available');

    const createdDriver = {
      _id: { toString: () => '507f1f77bcf86cd799439122' },
      status: 'assigned',
      available: false,
      isActive: true,
    };
    mockDriverModel.create.mockResolvedValue(createdDriver);

    const createReq = {
      body: {
        name: 'Driver One',
        phone: '+256700000001',
        licenseNumber: 'DRV-1001',
        available: false,
      },
      query: {},
      params: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const createRes = createResponseMock(createReq);

    await controller.createDriver(createReq, createRes, next);

    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data.uiStatus).toBe('assigned');

    const driverForGet = {
      _id: '507f1f77bcf86cd799439123',
      status: 'inactive',
      available: false,
      organization: adminUser.orgId,
      createdBy: adminUser.id,
      isActive: true,
    };

    const driverForUpdate = {
      _id: { toString: () => '507f1f77bcf86cd799439124' },
      status: 'available',
      available: true,
      organization: adminUser.orgId,
      createdBy: adminUser.id,
      isActive: true,
      save: jest.fn().mockResolvedValue(undefined),
    };

    const driverForDelete = {
      _id: { toString: () => '507f1f77bcf86cd799439125' },
      status: 'assigned',
      available: false,
      organization: adminUser.orgId,
      createdBy: adminUser.id,
      isActive: true,
      save: jest.fn().mockResolvedValue(undefined),
    };

    const driverForInvalidUpdate = {
      _id: { toString: () => '507f1f77bcf86cd799439126' },
      status: 'inactive',
      available: false,
      organization: adminUser.orgId,
      createdBy: adminUser.id,
      isActive: true,
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockDriverModel.findOne
      .mockResolvedValueOnce(driverForGet)
      .mockResolvedValueOnce(driverForUpdate)
      .mockResolvedValueOnce(driverForDelete)
      .mockResolvedValueOnce(driverForInvalidUpdate);

    const getReq = {
      params: { driverId: '507f1f77bcf86cd799439123' },
      query: {},
      body: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const getRes = createResponseMock(getReq);

    await controller.getDriver(getReq, getRes, next);

    expect(getRes.payload.success).toBe(true);
    expect(getRes.payload.data.uiStatus).toBe('inactive');

    const updateReq = {
      params: { driverId: '507f1f77bcf86cd799439124' },
      body: { status: 'assigned' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const updateRes = createResponseMock(updateReq);

    await controller.updateDriver(updateReq, updateRes, next);

    expect(driverForUpdate.status).toBe('assigned');
    expect(driverForUpdate.available).toBe(false);
    expect(driverForUpdate.isActive).toBe(true);
    expect(driverForUpdate.save).toHaveBeenCalledTimes(1);
    expect(updateRes.payload.data.uiStatus).toBe('assigned');

    const deleteReq = {
      params: { driverId: '507f1f77bcf86cd799439125' },
      query: {},
      body: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const deleteRes = createResponseMock(deleteReq);

    await controller.deleteDriver(deleteReq, deleteRes, next);

    expect(driverForDelete.status).toBe('inactive');
    expect(driverForDelete.available).toBe(false);
    expect(driverForDelete.isActive).toBe(false);
    expect(deleteRes.payload.data).toBeNull();

    const invalidUpdateReq = {
      params: { driverId: '507f1f77bcf86cd799439126' },
      body: { status: 'assigned' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const invalidUpdateRes = createResponseMock(invalidUpdateReq);

    await controller.updateDriver(invalidUpdateReq, invalidUpdateRes, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  test('tracking events CRUD updates shipment timeline and validates status transitions', async () => {
    const next = jest.fn();

    const eventRows = [{ _id: '507f1f77bcf86cd799439131', status: 'created' }];
    mockTrackingEventModel.find.mockReturnValue(createPagedFindQuery(eventRows));
    mockTrackingEventModel.countDocuments.mockResolvedValue(1);

    const listReq = {
      query: { page: '1', limit: '20' },
      params: {},
      body: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const listRes = createResponseMock(listReq);

    await controller.listTrackingEvents(listReq, listRes, next);

    expect(listRes.payload.success).toBe(true);
    expect(listRes.payload.data[0].uiStatus).toBe('created');

    const shipmentForCreate = {
      _id: '507f1f77bcf86cd799439132',
      status: 'in_transit',
      organization: adminUser.orgId,
      createdBy: adminUser.id,
      trackingEvents: [],
      save: jest.fn().mockResolvedValue(undefined),
    };

    const shipmentForUpdate = {
      _id: '507f1f77bcf86cd799439132',
      status: 'in_transit',
      organization: adminUser.orgId,
      createdBy: adminUser.id,
      trackingEvents: [],
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockShipmentModel.findById
      .mockResolvedValueOnce(shipmentForCreate)
      .mockResolvedValueOnce(shipmentForUpdate);

    const createdEvent = {
      _id: { toString: () => '507f1f77bcf86cd799439133' },
      shipmentId: shipmentForCreate._id,
      eventType: 'checkpoint',
      recordedAt: new Date('2026-03-01T10:00:00.000Z'),
      status: 'created',
      organization: adminUser.orgId,
      createdBy: adminUser.id,
    };
    mockTrackingEventModel.create.mockResolvedValue(createdEvent);

    const createReq = {
      body: {
        shipmentId: shipmentForCreate._id,
        location: 'Kampala',
        note: 'Reached central hub',
        eventType: 'checkpoint',
      },
      query: {},
      params: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const createRes = createResponseMock(createReq);

    await controller.createTrackingEventResource(createReq, createRes, next);

    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data.uiStatus).toBe('created');
    expect(shipmentForCreate.trackingEvents).toHaveLength(1);
    expect(shipmentForCreate.save).toHaveBeenCalledTimes(1);

    const eventForGet = {
      _id: '507f1f77bcf86cd799439134',
      status: 'created',
      organization: adminUser.orgId,
      createdBy: adminUser.id,
    };

    const eventForUpdate = {
      _id: { toString: () => '507f1f77bcf86cd799439135' },
      shipmentId: shipmentForUpdate._id,
      status: 'created',
      eventType: 'checkpoint',
      note: 'Reached central hub',
      location: 'Kampala',
      recordedAt: new Date('2026-03-01T10:00:00.000Z'),
      organization: adminUser.orgId,
      createdBy: adminUser.id,
      save: jest.fn().mockResolvedValue(undefined),
    };

    const eventForDelete = {
      _id: { toString: () => '507f1f77bcf86cd799439136' },
      status: 'verified',
      isActive: true,
      organization: adminUser.orgId,
      createdBy: adminUser.id,
      save: jest.fn().mockResolvedValue(undefined),
    };

    const eventForInvalidUpdate = {
      _id: { toString: () => '507f1f77bcf86cd799439137' },
      status: 'closed',
      organization: adminUser.orgId,
      createdBy: adminUser.id,
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockTrackingEventModel.findOne
      .mockResolvedValueOnce(eventForGet)
      .mockResolvedValueOnce(eventForUpdate)
      .mockResolvedValueOnce(eventForDelete)
      .mockResolvedValueOnce(eventForInvalidUpdate);

    const getReq = {
      params: { eventId: '507f1f77bcf86cd799439134' },
      query: {},
      body: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const getRes = createResponseMock(getReq);

    await controller.getTrackingEventResource(getReq, getRes, next);

    expect(getRes.payload.success).toBe(true);
    expect(getRes.payload.data.uiStatus).toBe('created');

    const updateReq = {
      params: { eventId: '507f1f77bcf86cd799439135' },
      body: { status: 'verified', note: 'Verified at hub' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const updateRes = createResponseMock(updateReq);

    await controller.updateTrackingEventResource(updateReq, updateRes, next);

    expect(eventForUpdate.status).toBe('verified');
    expect(eventForUpdate.save).toHaveBeenCalledTimes(1);
    expect(shipmentForUpdate.trackingEvents).toHaveLength(1);
    expect(shipmentForUpdate.save).toHaveBeenCalledTimes(1);
    expect(updateRes.payload.data.uiStatus).toBe('verified');

    const deleteReq = {
      params: { eventId: '507f1f77bcf86cd799439136' },
      query: {},
      body: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const deleteRes = createResponseMock(deleteReq);

    await controller.deleteTrackingEventResource(deleteReq, deleteRes, next);

    expect(eventForDelete.status).toBe('closed');
    expect(eventForDelete.isActive).toBe(false);
    expect(deleteRes.payload.data).toBeNull();

    const invalidUpdateReq = {
      params: { eventId: '507f1f77bcf86cd799439137' },
      body: { status: 'verified' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const invalidUpdateRes = createResponseMock(invalidUpdateReq);

    await controller.updateTrackingEventResource(invalidUpdateReq, invalidUpdateRes, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  test('cold-chain logs CRUD supports violation workflow and validates status transitions', async () => {
    const next = jest.fn();

    const logRows = [{ _id: '507f1f77bcf86cd799439141', status: 'normal', violation: false }];
    const listSort = jest.fn().mockReturnValue({
      skip: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(logRows),
      }),
    });

    const hotLog = {
      _id: '507f1f77bcf86cd799439146',
      status: 'normal',
      violation: false,
      temperatureC: 8,
      thresholdC: 5,
      save: jest.fn().mockResolvedValue(undefined),
    };
    const coolLog = {
      _id: '507f1f77bcf86cd799439147',
      status: 'normal',
      violation: false,
      temperatureC: 3,
      thresholdC: 5,
      save: jest.fn().mockResolvedValue(undefined),
    };

    const flagSort = jest.fn().mockResolvedValue([hotLog, coolLog]);

    mockColdChainLogModel.find
      .mockReturnValueOnce({ sort: listSort })
      .mockReturnValueOnce({ sort: flagSort });
    mockColdChainLogModel.countDocuments.mockResolvedValue(1);

    const listReq = {
      query: { page: '1', limit: '20' },
      params: {},
      body: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const listRes = createResponseMock(listReq);

    await controller.listColdChainLogs(listReq, listRes, next);

    expect(listRes.payload.success).toBe(true);
    expect(listRes.payload.data[0].uiStatus).toBe('normal');
    expect(listRes.payload.meta.pagination.total).toBe(1);

    const shipmentForCreate = {
      _id: '507f1f77bcf86cd799439142',
      status: 'in_transit',
      organization: adminUser.orgId,
      createdBy: adminUser.id,
      trackingEvents: [],
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockShipmentModel.findById.mockResolvedValue(shipmentForCreate);

    const createdLog = {
      _id: { toString: () => '507f1f77bcf86cd799439143' },
      status: 'violation',
      violation: true,
      capturedAt: new Date('2026-03-01T11:00:00.000Z'),
      temperatureC: 9,
      thresholdC: 5,
    };
    mockColdChainLogModel.create.mockResolvedValue(createdLog);

    const createReq = {
      body: {
        shipmentId: shipmentForCreate._id,
        temperatureC: 9,
        thresholdC: 5,
      },
      query: {},
      params: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const createRes = createResponseMock(createReq);

    await controller.createColdChainLog(createReq, createRes, next);

    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data.uiStatus).toBe('violation');
    expect(shipmentForCreate.trackingEvents).toHaveLength(1);
    expect(shipmentForCreate.save).toHaveBeenCalledTimes(1);

    const logForGet = {
      _id: '507f1f77bcf86cd799439144',
      status: 'violation',
      violation: true,
      organization: adminUser.orgId,
      createdBy: adminUser.id,
    };

    const logForUpdate = {
      _id: { toString: () => '507f1f77bcf86cd799439145' },
      status: 'violation',
      violation: true,
      temperatureC: 8,
      thresholdC: 5,
      organization: adminUser.orgId,
      createdBy: adminUser.id,
      save: jest.fn().mockResolvedValue(undefined),
    };

    const logForDelete = {
      _id: { toString: () => '507f1f77bcf86cd799439148' },
      status: 'normal',
      violation: false,
      isActive: true,
      organization: adminUser.orgId,
      createdBy: adminUser.id,
      save: jest.fn().mockResolvedValue(undefined),
    };

    const logForInvalidUpdate = {
      _id: { toString: () => '507f1f77bcf86cd799439149' },
      status: 'normal',
      violation: false,
      temperatureC: 2,
      thresholdC: 5,
      organization: adminUser.orgId,
      createdBy: adminUser.id,
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockColdChainLogModel.findOne
      .mockResolvedValueOnce(logForGet)
      .mockResolvedValueOnce(logForUpdate)
      .mockResolvedValueOnce(logForDelete)
      .mockResolvedValueOnce(logForInvalidUpdate);

    const getReq = {
      params: { logId: '507f1f77bcf86cd799439144' },
      query: {},
      body: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const getRes = createResponseMock(getReq);

    await controller.getColdChainLog(getReq, getRes, next);

    expect(getRes.payload.success).toBe(true);
    expect(getRes.payload.data.uiStatus).toBe('violation');

    const updateReq = {
      params: { logId: '507f1f77bcf86cd799439145' },
      body: { status: 'resolved', notes: 'Issue fixed' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const updateRes = createResponseMock(updateReq);

    await controller.updateColdChainLog(updateReq, updateRes, next);

    expect(logForUpdate.status).toBe('resolved');
    expect(logForUpdate.violation).toBe(false);
    expect(logForUpdate.save).toHaveBeenCalledTimes(1);
    expect(updateRes.payload.data.uiStatus).toBe('resolved');

    const deleteReq = {
      params: { logId: '507f1f77bcf86cd799439148' },
      query: {},
      body: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const deleteRes = createResponseMock(deleteReq);

    await controller.deleteColdChainLog(deleteReq, deleteRes, next);

    expect(logForDelete.isActive).toBe(false);
    expect(deleteRes.payload.data).toBeNull();

    const invalidUpdateReq = {
      params: { logId: '507f1f77bcf86cd799439149' },
      body: { status: 'resolved' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const invalidUpdateRes = createResponseMock(invalidUpdateReq);

    await controller.updateColdChainLog(invalidUpdateReq, invalidUpdateRes, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));

    const flagReq = {
      body: {},
      query: {},
      params: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: adminUser,
    };
    const flagRes = createResponseMock(flagReq);

    await controller.flagColdChainViolations(flagReq, flagRes, next);

    expect(hotLog.status).toBe('violation');
    expect(hotLog.violation).toBe(true);
    expect(hotLog.save).toHaveBeenCalledTimes(1);
    expect(coolLog.save).not.toHaveBeenCalled();

    expect(flagRes.payload.success).toBe(true);
    expect(flagRes.payload.data.flaggedCount).toBe(1);
    expect(flagRes.payload.data.scannedCount).toBe(2);
    expect(flagRes.payload.data.logs[0].uiStatus).toBe('violation');
  });
});
