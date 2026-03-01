const mockListingService = {
  createListing: jest.fn(),
  getAllListings: jest.fn(),
  updateListingStatus: jest.fn(),
  deleteListing: jest.fn(),
};

const MockListingService = jest.fn(() => mockListingService);

const mockOfferService = {
  getUserOffers: jest.fn(),
  acceptOffer: jest.fn(),
};

const mockOrderService = {
  createOrder: jest.fn(),
  updateOrderStatus: jest.fn(),
};

const MockOrderService = jest.fn(() => mockOrderService);

const mockContractsService = {
  listContracts: jest.fn(),
  createContract: jest.fn(),
  getContract: jest.fn(),
  updateContract: jest.fn(),
  deleteContract: jest.fn(),
  signContract: jest.fn(),
};

jest.mock('../dist/modules/marketplace/listing.service', () => ({
  __esModule: true,
  default: MockListingService,
}));

jest.mock('../dist/modules/offers/offer.service', () => ({
  __esModule: true,
  offerService: mockOfferService,
}));

jest.mock('../dist/modules/orders/order.service', () => ({
  __esModule: true,
  default: MockOrderService,
}));

jest.mock('../dist/modules/marketplace/contracts.service', () => ({
  __esModule: true,
  default: mockContractsService,
}));

const listingController = require('../dist/modules/marketplace/listing.controller').default;
const { offerController } = require('../dist/modules/offers/offer.controller');
const orderController = require('../dist/modules/orders/order.controller').default;
const contractsController = require('../dist/modules/marketplace/contracts.controller').default;

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

const farmerUser = {
  id: '507f1f77bcf86cd799439011',
  role: 'farmer',
  farmerId: '507f1f77bcf86cd799439012',
  orgId: '507f1f77bcf86cd799439013',
};

const adminUser = {
  id: '507f1f77bcf86cd799439021',
  role: 'platform_admin',
  orgId: '507f1f77bcf86cd799439013',
};

describe('Marketplace workspace controllers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('listings CRUD/status responses include deterministic uiStatus', async () => {
    const next = jest.fn();

    const listing = {
      _id: '507f1f77bcf86cd799439101',
      title: 'Maize grain',
      status: 'active',
    };

    mockListingService.createListing.mockResolvedValue(listing);
    mockListingService.getAllListings.mockResolvedValue({
      data: [listing],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    mockListingService.updateListingStatus.mockResolvedValue({ ...listing, status: 'cancelled' });
    mockListingService.deleteListing.mockResolvedValue(undefined);

    const createReq = {
      body: {
        product: '507f1f77bcf86cd799439130',
        title: 'Maize grain',
        description: 'Dry maize grain',
        quantity: 500,
        price: 1200,
        quality: 'standard',
        deliveryOptions: ['pickup'],
        location: { region: 'Central', district: 'Wakiso' },
      },
      user: farmerUser,
    };
    const createRes = createResponseMock(createReq);
    await listingController.createListing(createReq, createRes, next);

    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.success).toBe(true);
    expect(createRes.payload.data.uiStatus).toBe('published');

    const listReq = {
      query: { page: '1', limit: '20' },
      user: farmerUser,
    };
    const listRes = createResponseMock(listReq);
    await listingController.getAllListings(listReq, listRes, next);

    expect(listRes.payload.success).toBe(true);
    expect(listRes.payload.data[0].uiStatus).toBe('published');
    expect(listRes.payload.meta.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });

    const updateStatusReq = {
      params: { id: listing._id },
      body: { uiStatus: 'paused' },
      user: farmerUser,
    };
    const updateStatusRes = createResponseMock(updateStatusReq);
    await listingController.updateListingStatus(updateStatusReq, updateStatusRes, next);

    expect(updateStatusRes.payload.success).toBe(true);
    expect(updateStatusRes.payload.data.uiStatus).toBe('paused');

    const deleteReq = { params: { id: listing._id }, user: farmerUser };
    const deleteRes = createResponseMock(deleteReq);
    await listingController.deleteListing(deleteReq, deleteRes, next);

    expect(deleteRes.payload.success).toBe(true);
    expect(deleteRes.payload.data).toBeNull();
  });

  test('offers lifecycle exposes canonical uiStatus mapping', async () => {
    const next = jest.fn();

    mockOfferService.getUserOffers.mockResolvedValue({
      offers: [
        { _id: '1', status: 'pending' },
        { _id: '2', status: 'countered' },
        { _id: '3', status: 'accepted' },
        { _id: '4', status: 'withdrawn' },
      ],
      pagination: { total: 4, page: 1, limit: 20, pages: 1 },
    });

    mockOfferService.acceptOffer.mockResolvedValue({
      offer: { _id: '3', status: 'accepted' },
      order: { _id: '507f1f77bcf86cd799439201', status: 'pending' },
    });

    const listReq = { query: { uiStatus: 'open', page: '1', limit: '20' }, user: farmerUser };
    const listRes = createResponseMock(listReq);
    await offerController.getUserOffers(listReq, listRes, next);

    expect(listRes.payload.success).toBe(true);
    expect(listRes.payload.data.offers.map((o) => o.uiStatus)).toEqual([
      'open',
      'responded',
      'shortlisted',
      'closed',
    ]);
    expect(listRes.payload.meta.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 4,
      totalPages: 1,
    });

    const acceptReq = {
      params: { offerId: '507f1f77bcf86cd799439211' },
      body: { notes: 'Accepted' },
      user: farmerUser,
    };
    const acceptRes = createResponseMock(acceptReq);
    await offerController.acceptOffer(acceptReq, acceptRes, next);

    expect(acceptRes.payload.success).toBe(true);
    expect(acceptRes.payload.data.offer.uiStatus).toBe('shortlisted');
    expect(acceptRes.payload.data.order.status).toBe('pending');
  });

  test('orders create and status transition responses use uiStatus; invalid transition flows to error handler', async () => {
    const next = jest.fn();

    mockOrderService.createOrder.mockResolvedValue({
      _id: '507f1f77bcf86cd799439301',
      status: 'pending',
    });

    mockOrderService.updateOrderStatus
      .mockResolvedValueOnce({ _id: '507f1f77bcf86cd799439301', status: 'completed' })
      .mockRejectedValueOnce(Object.assign(new Error('Invalid status transition from pending to completed'), { statusCode: 400 }));

    const createReq = {
      body: {
        listing: '507f1f77bcf86cd799439302',
        quantity: 100,
        deliveryOption: 'pickup',
        deliveryAddress: {
          region: 'Central',
          district: 'Wakiso',
          phone: '+256700123456',
          recipientName: 'Buyer Name',
        },
      },
      user: farmerUser,
    };
    const createRes = createResponseMock(createReq);
    await orderController.createOrder(createReq, createRes, next);

    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data.uiStatus).toBe('created');

    const updateReq = {
      params: { id: '507f1f77bcf86cd799439301' },
      body: { uiStatus: 'fulfilled' },
      user: farmerUser,
    };
    const updateRes = createResponseMock(updateReq);
    await orderController.updateOrderStatus(updateReq, updateRes, next);

    expect(updateRes.payload.success).toBe(true);
    expect(updateRes.payload.data.uiStatus).toBe('fulfilled');

    const invalidReq = {
      params: { id: '507f1f77bcf86cd799439301' },
      body: { status: 'completed' },
      user: farmerUser,
    };
    const invalidRes = createResponseMock(invalidReq);
    await orderController.updateOrderStatus(invalidReq, invalidRes, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  test('contracts CRUD and sign flow return deterministic payloads', async () => {
    const next = jest.fn();

    const contract = {
      _id: '507f1f77bcf86cd799439401',
      status: 'draft',
      toObject() {
        return { _id: this._id, status: this.status, title: 'Supply Agreement' };
      },
    };

    const signedContract = {
      _id: '507f1f77bcf86cd799439401',
      status: 'under_review',
      toObject() {
        return { _id: this._id, status: this.status, title: 'Supply Agreement' };
      },
    };

    mockContractsService.listContracts.mockResolvedValue({
      contracts: [contract],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    mockContractsService.createContract.mockResolvedValue(contract);
    mockContractsService.getContract.mockResolvedValue(contract);
    mockContractsService.updateContract.mockResolvedValue(contract);
    mockContractsService.signContract.mockResolvedValue(signedContract);
    mockContractsService.deleteContract.mockResolvedValue(undefined);

    const listReq = { query: { page: '1', limit: '20' }, user: adminUser };
    const listRes = createResponseMock(listReq);
    await contractsController.listContracts(listReq, listRes, next);

    expect(listRes.payload.success).toBe(true);
    expect(listRes.payload.data[0].uiStatus).toBe('draft');
    expect(listRes.payload.meta.pagination.totalPages).toBe(1);

    const createReq = {
      body: {
        title: 'Supply Agreement',
        terms: 'Long form terms and obligations.',
        parties: ['507f1f77bcf86cd799439011'],
      },
      user: adminUser,
    };
    const createRes = createResponseMock(createReq);
    await contractsController.createContract(createReq, createRes, next);
    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data.uiStatus).toBe('draft');

    const signReq = {
      params: { contractId: '507f1f77bcf86cd799439401' },
      body: { note: 'Signed by party 1' },
      user: adminUser,
    };
    const signRes = createResponseMock(signReq);
    await contractsController.signContract(signReq, signRes, next);

    expect(signRes.payload.success).toBe(true);
    expect(signRes.payload.data.uiStatus).toBe('under_review');

    const deleteReq = {
      params: { contractId: '507f1f77bcf86cd799439401' },
      user: adminUser,
    };
    const deleteRes = createResponseMock(deleteReq);
    await contractsController.deleteContract(deleteReq, deleteRes, next);

    expect(deleteRes.payload.success).toBe(true);
    expect(deleteRes.payload.data).toBeNull();
  });
});
