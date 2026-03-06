const mockInvoiceModel = {
  find: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
};

const mockCreditModel = {
  find: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
};

const mockPolicyModel = {
  find: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
};

const mockClaimModel = {
  create: jest.fn(),
  findOne: jest.fn(),
};

jest.mock('../dist/modules/finance/invoice.model', () => ({
  __esModule: true,
  default: mockInvoiceModel,
}));

jest.mock('../dist/modules/finance/credit.model', () => ({
  __esModule: true,
  default: mockCreditModel,
}));

jest.mock('../dist/modules/finance/insurancePolicy.model', () => ({
  __esModule: true,
  default: mockPolicyModel,
}));

jest.mock('../dist/modules/finance/insuranceClaim.model', () => ({
  __esModule: true,
  default: mockClaimModel,
}));

const controller = require('../dist/modules/finance/finance.controller').default;

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

const createPagedQuery = (rows) => {
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

describe('Finance workspace controller contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('invoices CRUD + status transitions return deterministic uiStatus', async () => {
    const next = jest.fn();

    const invoiceRows = [{ _id: '507f1f77bcf86cd799439101', status: 'draft' }];
    mockInvoiceModel.find.mockReturnValue(createPagedQuery(invoiceRows));
    mockInvoiceModel.countDocuments.mockResolvedValue(1);

    const listReq = { user: adminUser, query: { page: '1', limit: '20' }, params: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const listRes = createResponseMock(listReq);
    await controller.listInvoices(listReq, listRes, next);

    expect(listRes.payload.success).toBe(true);
    expect(listRes.payload.data[0].uiStatus).toBe('draft');
    expect(listRes.payload.meta.pagination.total).toBe(1);

    const createdInvoice = { _id: '507f1f77bcf86cd799439102', status: 'draft' };
    mockInvoiceModel.create.mockResolvedValue(createdInvoice);

    const createReq = {
      user: adminUser,
      body: {
        customerName: 'Buyer A',
        dueDate: '2026-03-31T00:00:00.000Z',
        items: [{ description: 'Beans', quantity: 10, unitPrice: 100 }],
      },
      query: {},
      params: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const createRes = createResponseMock(createReq);
    await controller.createInvoice(createReq, createRes, next);

    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data.uiStatus).toBe('draft');

    const invoiceForGet = {
      _id: '507f1f77bcf86cd799439103',
      status: 'issued',
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
    };
    const invoiceForUpdate = {
      _id: '507f1f77bcf86cd799439104',
      status: 'draft',
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      save: jest.fn().mockResolvedValue(undefined),
    };
    const invoiceForInvalidUpdate = {
      _id: '507f1f77bcf86cd799439105',
      status: 'paid',
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      save: jest.fn().mockResolvedValue(undefined),
    };
    const invoiceForDelete = {
      _id: '507f1f77bcf86cd799439106',
      status: 'cancelled',
      isActive: true,
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockInvoiceModel.findOne
      .mockResolvedValueOnce(invoiceForGet)
      .mockResolvedValueOnce(invoiceForUpdate)
      .mockResolvedValueOnce(invoiceForInvalidUpdate)
      .mockResolvedValueOnce(invoiceForDelete);

    const getReq = { user: adminUser, params: { invoiceId: '507f1f77bcf86cd799439103' }, query: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const getRes = createResponseMock(getReq);
    await controller.getInvoice(getReq, getRes, next);
    expect(getRes.payload.data.uiStatus).toBe('issued');

    const updateReq = { user: adminUser, params: { invoiceId: '507f1f77bcf86cd799439104' }, query: {}, body: { status: 'issued' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const updateRes = createResponseMock(updateReq);
    await controller.updateInvoice(updateReq, updateRes, next);
    expect(updateRes.payload.data.uiStatus).toBe('issued');
    expect(invoiceForUpdate.issuedAt).toEqual(expect.any(Date));

    const invalidReq = { user: adminUser, params: { invoiceId: '507f1f77bcf86cd799439105' }, query: {}, body: { status: 'draft' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const invalidRes = createResponseMock(invalidReq);
    await controller.updateInvoice(invalidReq, invalidRes, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));

    const deleteReq = { user: adminUser, params: { invoiceId: '507f1f77bcf86cd799439106' }, query: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const deleteRes = createResponseMock(deleteReq);
    await controller.deleteInvoice(deleteReq, deleteRes, next);
    expect(invoiceForDelete.isActive).toBe(false);
    expect(deleteRes.payload.data).toBeNull();
  });

  test('credits CRUD and approve/reject/disburse workflows enforce transitions', async () => {
    const next = jest.fn();

    mockCreditModel.find.mockReturnValue(createPagedQuery([{ _id: '1', status: 'applied' }]));
    mockCreditModel.countDocuments.mockResolvedValue(1);

    const listReq = { user: adminUser, query: { page: '1', limit: '20' }, params: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const listRes = createResponseMock(listReq);
    await controller.listCredits(listReq, listRes, next);
    expect(listRes.payload.data[0].uiStatus).toBe('applied');

    mockCreditModel.create.mockResolvedValue({ _id: '507f1f77bcf86cd799439120', status: 'applied' });

    const createReq = {
      user: adminUser,
      body: { applicantName: 'Farmer A', amountRequested: 5000 },
      query: {},
      params: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const createRes = createResponseMock(createReq);
    await controller.createCredit(createReq, createRes, next);
    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data.uiStatus).toBe('applied');

    const creditForGet = {
      _id: '507f1f77bcf86cd799439121',
      status: 'under_review',
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
    };
    const creditForUpdate = {
      _id: '507f1f77bcf86cd799439122',
      status: 'under_review',
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      save: jest.fn().mockResolvedValue(undefined),
    };
    const creditForApprove = {
      _id: '507f1f77bcf86cd799439123',
      status: 'under_review',
      amountRequested: 8000,
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      save: jest.fn().mockResolvedValue(undefined),
    };
    const creditForReject = {
      _id: '507f1f77bcf86cd799439124',
      status: 'under_review',
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      save: jest.fn().mockResolvedValue(undefined),
    };
    const creditForDisburse = {
      _id: '507f1f77bcf86cd799439125',
      status: 'approved',
      amountRequested: 9000,
      amountApproved: 9000,
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      save: jest.fn().mockResolvedValue(undefined),
    };
    const creditForDelete = {
      _id: '507f1f77bcf86cd799439126',
      status: 'rejected',
      isActive: true,
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockCreditModel.findOne
      .mockResolvedValueOnce(creditForGet)
      .mockResolvedValueOnce(creditForUpdate)
      .mockResolvedValueOnce(creditForApprove)
      .mockResolvedValueOnce(creditForReject)
      .mockResolvedValueOnce(creditForDisburse)
      .mockResolvedValueOnce(creditForDelete);

    const getReq = { user: adminUser, params: { creditId: '507f1f77bcf86cd799439121' }, query: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const getRes = createResponseMock(getReq);
    await controller.getCredit(getReq, getRes, next);
    expect(getRes.payload.data.uiStatus).toBe('under_review');

    const updateReq = { user: adminUser, params: { creditId: '507f1f77bcf86cd799439122' }, query: {}, body: { status: 'approved' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const updateRes = createResponseMock(updateReq);
    await controller.updateCredit(updateReq, updateRes, next);
    expect(updateRes.payload.data.uiStatus).toBe('approved');

    const approveReq = { user: adminUser, params: { creditId: '507f1f77bcf86cd799439123' }, query: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const approveRes = createResponseMock(approveReq);
    await controller.approveCredit(approveReq, approveRes, next);
    expect(approveRes.payload.data.uiStatus).toBe('approved');
    expect(creditForApprove.amountApproved).toBe(8000);

    const rejectReq = { user: adminUser, params: { creditId: '507f1f77bcf86cd799439124' }, query: {}, body: { reason: 'Insufficient history' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const rejectRes = createResponseMock(rejectReq);
    await controller.rejectCredit(rejectReq, rejectRes, next);
    expect(rejectRes.payload.data.uiStatus).toBe('rejected');

    const disburseReq = { user: adminUser, params: { creditId: '507f1f77bcf86cd799439125' }, query: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const disburseRes = createResponseMock(disburseReq);
    await controller.disburseCredit(disburseReq, disburseRes, next);
    expect(disburseRes.payload.data.uiStatus).toBe('disbursed');
    expect(creditForDisburse.disbursedAt).toEqual(expect.any(Date));

    const deleteReq = { user: adminUser, params: { creditId: '507f1f77bcf86cd799439126' }, query: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const deleteRes = createResponseMock(deleteReq);
    await controller.deleteCredit(deleteReq, deleteRes, next);
    expect(creditForDelete.isActive).toBe(false);
    expect(deleteRes.payload.data).toBeNull();
  });

  test('insurance policy CRUD and claim lifecycle synchronize policy uiStatus', async () => {
    const next = jest.fn();

    mockPolicyModel.find.mockReturnValue(createPagedQuery([{ _id: 'p1', status: 'active' }]));
    mockPolicyModel.countDocuments.mockResolvedValue(1);

    const listReq = { user: adminUser, query: { page: '1', limit: '20' }, params: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const listRes = createResponseMock(listReq);
    await controller.listInsurancePolicies(listReq, listRes, next);
    expect(listRes.payload.data[0].uiStatus).toBe('active');

    mockPolicyModel.create.mockResolvedValue({ _id: '507f1f77bcf86cd799439140', status: 'active' });

    const createReq = {
      user: adminUser,
      body: {
        insuredEntityName: 'Warehouse A',
        providerName: 'Insurer A',
        coverageType: 'cold_chain',
        premiumAmount: 300,
        coverageAmount: 5000,
        startDate: '2026-03-01T00:00:00.000Z',
        endDate: '2027-03-01T00:00:00.000Z',
      },
      query: {},
      params: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const createRes = createResponseMock(createReq);
    await controller.createInsurancePolicy(createReq, createRes, next);
    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data.uiStatus).toBe('active');

    const policyForGet = {
      _id: '507f1f77bcf86cd799439141',
      status: 'claim_open',
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
    };
    const policyForUpdate = {
      _id: '507f1f77bcf86cd799439142',
      status: 'active',
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      save: jest.fn().mockResolvedValue(undefined),
    };
    const policyForDelete = {
      _id: '507f1f77bcf86cd799439143',
      status: 'expired',
      isActive: true,
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      save: jest.fn().mockResolvedValue(undefined),
    };
    const policyForCreateClaim = {
      _id: '507f1f77bcf86cd799439144',
      status: 'active',
      organization: { toString: () => adminUser.orgId },
      createdBy: { toString: () => adminUser.id },
      save: jest.fn().mockResolvedValue(undefined),
    };
    const policyForUpdateClaim = {
      _id: '507f1f77bcf86cd799439145',
      status: 'claim_open',
      organization: { toString: () => adminUser.orgId },
      createdBy: { toString: () => adminUser.id },
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockPolicyModel.findOne
      .mockResolvedValueOnce(policyForGet)
      .mockResolvedValueOnce(policyForUpdate)
      .mockResolvedValueOnce(policyForDelete)
      .mockResolvedValueOnce(policyForCreateClaim)
      .mockResolvedValueOnce(policyForUpdateClaim);

    const getReq = { user: adminUser, params: { policyId: '507f1f77bcf86cd799439141' }, query: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const getRes = createResponseMock(getReq);
    await controller.getInsurancePolicy(getReq, getRes, next);
    expect(getRes.payload.data.uiStatus).toBe('claim_open');

    const updateReq = { user: adminUser, params: { policyId: '507f1f77bcf86cd799439142' }, query: {}, body: { status: 'expired' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const updateRes = createResponseMock(updateReq);
    await controller.updateInsurancePolicy(updateReq, updateRes, next);
    expect(updateRes.payload.data.uiStatus).toBe('expired');

    const deleteReq = { user: adminUser, params: { policyId: '507f1f77bcf86cd799439143' }, query: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const deleteRes = createResponseMock(deleteReq);
    await controller.deleteInsurancePolicy(deleteReq, deleteRes, next);
    expect(policyForDelete.isActive).toBe(false);
    expect(deleteRes.payload.data).toBeNull();

    const createdClaim = { _id: '507f1f77bcf86cd799439146', status: 'open' };
    mockClaimModel.create.mockResolvedValue(createdClaim);

    const createClaimReq = {
      user: adminUser,
      params: { policyId: '507f1f77bcf86cd799439144' },
      body: { amountClaimed: 400, reason: 'Cold chain failure' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const createClaimRes = createResponseMock(createClaimReq);
    await controller.createInsuranceClaim(createClaimReq, createClaimRes, next);
    expect(createClaimRes.statusCode).toBe(201);
    expect(createClaimRes.payload.data.uiStatus).toBe('open');
    expect(policyForCreateClaim.status).toBe('claim_open');

    const claimForUpdate = {
      _id: '507f1f77bcf86cd799439147',
      policyId: policyForUpdateClaim._id,
      status: 'under_review',
      createdBy: { toString: () => adminUser.id },
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockClaimModel.findOne.mockResolvedValue(claimForUpdate);

    const updateClaimReq = {
      user: adminUser,
      params: { claimId: '507f1f77bcf86cd799439147' },
      body: { status: 'resolved', amountApproved: 350, resolutionNote: 'Approved' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const updateClaimRes = createResponseMock(updateClaimReq);
    await controller.updateInsuranceClaim(updateClaimReq, updateClaimRes, next);

    expect(updateClaimRes.payload.success).toBe(true);
    expect(updateClaimRes.payload.data.claim.uiStatus).toBe('resolved');
    expect(updateClaimRes.payload.data.policy.uiStatus).toBe('claim_resolved');
  });
});
