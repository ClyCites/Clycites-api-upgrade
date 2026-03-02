const mockWalletModel = {
  findById: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
};

const mockTransactionModel = {
  find: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
};

const mockEscrowModel = {
  findById: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
};

const mockPayoutModel = {
  find: jest.fn(),
  countDocuments: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
};

const mockPaymentService = {
  getOrCreateWallet: jest.fn(),
  initiateEscrow: jest.fn(),
  releaseEscrow: jest.fn(),
  refundEscrow: jest.fn(),
};

jest.mock('../dist/modules/payments/wallet.model', () => ({
  __esModule: true,
  default: mockWalletModel,
}));

jest.mock('../dist/modules/payments/transaction.model', () => ({
  __esModule: true,
  default: mockTransactionModel,
}));

jest.mock('../dist/modules/payments/escrow.model', () => ({
  __esModule: true,
  default: mockEscrowModel,
}));

jest.mock('../dist/modules/payments/payout.model', () => ({
  __esModule: true,
  default: mockPayoutModel,
}));

jest.mock('../dist/modules/payments/payment.service', () => ({
  __esModule: true,
  paymentService: mockPaymentService,
}));

jest.mock('../dist/modules/audit/audit.service', () => ({
  __esModule: true,
  default: { log: jest.fn().mockResolvedValue(undefined) },
}));

const { paymentController } = require('../dist/modules/payments/payment.controller');

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

const createTransactionFindQuery = (rows) => {
  const secondPopulate = jest.fn().mockResolvedValue(rows);
  const firstPopulate = jest.fn().mockReturnValue({ populate: secondPopulate });
  const skip = jest.fn().mockReturnValue({ populate: firstPopulate });
  const limit = jest.fn().mockReturnValue({ skip });
  const sort = jest.fn().mockReturnValue({ limit });
  return { sort };
};

const createEscrowFindQuery = (rows) => {
  const limit = jest.fn().mockResolvedValue(rows);
  const skip = jest.fn().mockReturnValue({ limit });
  const sort = jest.fn().mockReturnValue({ skip });
  const populateSecond = jest.fn().mockReturnValue({ sort });
  const populateFirst = jest.fn().mockReturnValue({ populate: populateSecond });
  return { populate: populateFirst };
};

const createSimplePagedQuery = (rows) => {
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

describe('Payments workspace controller contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('wallet read and deposit/withdraw workflows expose stable uiStatus contract', async () => {
    const next = jest.fn();

    const wallet = {
      _id: '507f1f77bcf86cd799439101',
      status: 'active',
      balance: 1000,
      availableBalance: 1000,
      escrowBalance: 0,
      currency: 'UGX',
      save: jest.fn().mockResolvedValue(undefined),
    };

    const depositTx = { _id: '507f1f77bcf86cd799439102', transactionNumber: 'TXN-1', status: 'pending' };
    const withdrawTx = { _id: '507f1f77bcf86cd799439103', transactionNumber: 'TXN-2', status: 'pending' };
    const payout = { _id: '507f1f77bcf86cd799439104', status: 'requested' };

    mockPaymentService.getOrCreateWallet
      .mockResolvedValueOnce(wallet)
      .mockResolvedValueOnce(wallet)
      .mockResolvedValueOnce(wallet);
    mockTransactionModel.create
      .mockResolvedValueOnce(depositTx)
      .mockResolvedValueOnce(withdrawTx);
    mockPayoutModel.create.mockResolvedValue(payout);

    const walletReq = { user: adminUser, query: {}, headers: {}, body: {}, socket: { remoteAddress: '127.0.0.1' } };
    const walletRes = createResponseMock(walletReq);
    await paymentController.getWallet(walletReq, walletRes, next);

    expect(walletRes.payload.success).toBe(true);
    expect(walletRes.payload.data.wallet.uiStatus).toBe('active');
    expect(walletRes.payload.data.workflow.canDeposit).toBe(true);

    const depositReq = {
      user: adminUser,
      body: { amount: 200, paymentMethod: 'mobile_money', reference: 'DEP-1' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const depositRes = createResponseMock(depositReq);
    await paymentController.depositFunds(depositReq, depositRes, next);

    expect(depositRes.statusCode).toBe(201);
    expect(depositRes.payload.data.transaction.uiStatus).toBe('pending');
    expect(depositRes.payload.data.wallet.uiStatus).toBe('active');

    const withdrawReq = {
      user: adminUser,
      body: { amount: 150, withdrawalMethod: 'bank_transfer', accountDetails: { accountNumber: '1234' }, reference: 'WDR-1' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const withdrawRes = createResponseMock(withdrawReq);
    await paymentController.withdrawFunds(withdrawReq, withdrawRes, next);

    expect(withdrawRes.statusCode).toBe(201);
    expect(wallet.balance).toBe(850);
    expect(wallet.save).toHaveBeenCalled();
    expect(withdrawRes.payload.data.transaction.uiStatus).toBe('pending');
    expect(withdrawRes.payload.data.payout.uiStatus).toBe('requested');
  });

  test('transactions list supports status/date filtering and canonical uiStatus mapping', async () => {
    const next = jest.fn();

    const rows = [
      { _id: '1', status: 'processing' },
      { _id: '2', status: 'cancelled' },
      { _id: '3', status: 'completed' },
    ];

    mockTransactionModel.find.mockReturnValue(createTransactionFindQuery(rows));
    mockTransactionModel.countDocuments.mockResolvedValue(3);

    const req = {
      user: adminUser,
      query: {
        page: '1',
        limit: '20',
        status: 'reversed',
        startDate: '2026-03-01T00:00:00.000Z',
        endDate: '2026-03-02T00:00:00.000Z',
      },
      headers: {},
      body: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const res = createResponseMock(req);

    await paymentController.getTransactions(req, res, next);

    expect(mockTransactionModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        status: { $in: ['reversed', 'cancelled'] },
        createdAt: expect.objectContaining({
          $gte: expect.any(Date),
          $lte: expect.any(Date),
        }),
      })
    );
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.transactions.map((tx) => tx.uiStatus)).toEqual(['pending', 'reversed', 'completed']);
    expect(res.payload.meta.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 3,
      totalPages: 1,
    });
  });

  test('escrow lifecycle exposes deterministic uiStatus and paginated list contract', async () => {
    const next = jest.fn();

    const initiatedEscrow = { _id: '507f1f77bcf86cd799439111', status: 'initiated' };
    const releaseEscrow = { _id: '507f1f77bcf86cd799439112', status: 'released' };
    const refundEscrow = { _id: '507f1f77bcf86cd799439113', status: 'refunded' };
    const escrowTx = { _id: '507f1f77bcf86cd799439114', status: 'completed' };

    mockPaymentService.initiateEscrow.mockResolvedValue(initiatedEscrow);
    mockPaymentService.releaseEscrow.mockResolvedValue({ escrow: releaseEscrow, transaction: escrowTx });
    mockPaymentService.refundEscrow.mockResolvedValue({ escrow: refundEscrow, transaction: escrowTx });

    mockEscrowModel.findById
      .mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue({
          _id: 'e1',
          order: { buyer: { toString: () => adminUser.id } },
          buyer: { toString: () => adminUser.id },
          seller: { toString: () => 'other' },
        }),
      })
      .mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue({
          _id: 'e2',
          order: { buyer: { toString: () => adminUser.id }, seller: { toString: () => adminUser.id } },
          buyer: { toString: () => adminUser.id },
          seller: { toString: () => adminUser.id },
        }),
      })
      .mockReturnValueOnce({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({
            _id: 'e3',
            status: 'disputed',
            buyer: { toString: () => adminUser.id },
            seller: { toString: () => 'other' },
          }),
        }),
      });

    const listRows = [
      { _id: '507f1f77bcf86cd799439115', status: 'initiated' },
      { _id: '507f1f77bcf86cd799439116', status: 'funded' },
    ];
    mockEscrowModel.find.mockReturnValue(createEscrowFindQuery(listRows));
    mockEscrowModel.countDocuments.mockResolvedValue(2);

    const initiateReq = {
      user: adminUser,
      body: { orderId: '507f1f77bcf86cd799439120', sellerId: '507f1f77bcf86cd799439121', amount: 500 },
      params: {},
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const initiateRes = createResponseMock(initiateReq);
    await paymentController.initiateEscrow(initiateReq, initiateRes, next);
    expect(initiateRes.statusCode).toBe(201);
    expect(initiateRes.payload.data.escrow.uiStatus).toBe('created');

    const releaseReq = {
      user: adminUser,
      params: { escrowId: '507f1f77bcf86cd799439112' },
      body: { releaseReason: 'Delivered' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const releaseRes = createResponseMock(releaseReq);
    await paymentController.releaseEscrow(releaseReq, releaseRes, next);
    expect(releaseRes.payload.data.escrow.uiStatus).toBe('released');

    const refundReq = {
      user: adminUser,
      params: { escrowId: '507f1f77bcf86cd799439113' },
      body: { refundReason: 'Cancelled order' },
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const refundRes = createResponseMock(refundReq);
    await paymentController.refundEscrow(refundReq, refundRes, next);
    expect(refundRes.payload.data.escrow.uiStatus).toBe('refunded');

    const detailReq = {
      user: adminUser,
      params: { escrowId: '507f1f77bcf86cd799439113' },
      body: {},
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const detailRes = createResponseMock(detailReq);
    await paymentController.getEscrowDetails(detailReq, detailRes, next);
    expect(detailRes.payload.data.escrow.uiStatus).toBe('closed');

    const listReq = {
      user: adminUser,
      params: {},
      body: {},
      query: { status: 'active', page: '1', limit: '20' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const listRes = createResponseMock(listReq);
    await paymentController.getUserEscrows(listReq, listRes, next);

    expect(mockEscrowModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        status: { $in: ['initiated', 'funded', 'held'] },
      })
    );
    expect(listRes.payload.meta.pagination.total).toBe(2);
    expect(listRes.payload.data.escrows.map((item) => item.uiStatus)).toEqual(['created', 'funded']);
  });

  test('payout CRUD and workflow endpoints validate transitions and return canonical statuses', async () => {
    const next = jest.fn();

    mockPayoutModel.find.mockReturnValue(createSimplePagedQuery([{ _id: '1', status: 'requested' }]));
    mockPayoutModel.countDocuments.mockResolvedValue(1);

    const listReq = {
      user: adminUser,
      params: {},
      body: {},
      query: { page: '1', limit: '20' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const listRes = createResponseMock(listReq);
    await paymentController.listPayouts(listReq, listRes, next);
    expect(listRes.payload.success).toBe(true);
    expect(listRes.payload.data[0].uiStatus).toBe('requested');

    const wallet = {
      _id: '507f1f77bcf86cd799439130',
      status: 'active',
      balance: 900,
      availableBalance: 900,
      currency: 'UGX',
      save: jest.fn().mockResolvedValue(undefined),
    };
    const tx = { _id: '507f1f77bcf86cd799439131', status: 'pending' };
    const createdPayout = {
      _id: { toString: () => '507f1f77bcf86cd799439132' },
      status: 'requested',
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      wallet: wallet._id,
      transaction: tx._id,
      amount: 100,
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockPaymentService.getOrCreateWallet.mockResolvedValue(wallet);
    mockTransactionModel.create.mockResolvedValue(tx);
    mockPayoutModel.create.mockResolvedValue(createdPayout);

    const createReq = {
      user: adminUser,
      body: { amount: 100, method: 'bank_transfer' },
      params: {},
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const createRes = createResponseMock(createReq);
    await paymentController.createPayout(createReq, createRes, next);
    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data.payout.uiStatus).toBe('requested');

    const payoutForGet = {
      _id: '507f1f77bcf86cd799439133',
      status: 'requested',
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
    };
    const payoutForUpdate = {
      _id: { toString: () => '507f1f77bcf86cd799439134' },
      status: 'requested',
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      save: jest.fn().mockResolvedValue(undefined),
    };
    const payoutForApprove = {
      _id: { toString: () => '507f1f77bcf86cd799439135' },
      status: 'processing',
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      transaction: '507f1f77bcf86cd799439136',
      save: jest.fn().mockResolvedValue(undefined),
    };
    const payoutForFail = {
      _id: { toString: () => '507f1f77bcf86cd799439137' },
      status: 'requested',
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      transaction: '507f1f77bcf86cd799439138',
      wallet: '507f1f77bcf86cd799439130',
      amount: 90,
      save: jest.fn().mockResolvedValue(undefined),
    };
    const payoutForDelete = {
      _id: { toString: () => '507f1f77bcf86cd799439139' },
      status: 'failed',
      createdBy: { toString: () => adminUser.id },
      organization: { toString: () => adminUser.orgId },
      isActive: true,
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockPayoutModel.findOne
      .mockResolvedValueOnce(payoutForGet)
      .mockResolvedValueOnce(payoutForUpdate)
      .mockResolvedValueOnce(payoutForApprove)
      .mockResolvedValueOnce(payoutForFail)
      .mockResolvedValueOnce(payoutForDelete);

    const txForApprove = { status: 'pending', save: jest.fn().mockResolvedValue(undefined) };
    const txForFail = { status: 'pending', save: jest.fn().mockResolvedValue(undefined) };
    mockTransactionModel.findById
      .mockResolvedValueOnce(txForApprove)
      .mockResolvedValueOnce(txForFail);

    const walletForRefund = { balance: 500, save: jest.fn().mockResolvedValue(undefined) };
    mockWalletModel.findById.mockResolvedValue(walletForRefund);

    const getReq = { user: adminUser, params: { payoutId: '507f1f77bcf86cd799439133' }, body: {}, query: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const getRes = createResponseMock(getReq);
    await paymentController.getPayout(getReq, getRes, next);
    expect(getRes.payload.data.uiStatus).toBe('requested');

    const updateReq = { user: adminUser, params: { payoutId: '507f1f77bcf86cd799439134' }, body: { status: 'processing' }, query: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const updateRes = createResponseMock(updateReq);
    await paymentController.updatePayout(updateReq, updateRes, next);
    expect(updateRes.payload.data.uiStatus).toBe('processing');

    const approveReq = { user: adminUser, params: { payoutId: '507f1f77bcf86cd799439135' }, body: {}, query: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const approveRes = createResponseMock(approveReq);
    await paymentController.approvePayout(approveReq, approveRes, next);
    expect(approveRes.payload.data.uiStatus).toBe('paid');
    expect(txForApprove.status).toBe('completed');

    const failReq = { user: adminUser, params: { payoutId: '507f1f77bcf86cd799439137' }, body: { reason: 'Gateway failure' }, query: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const failRes = createResponseMock(failReq);
    await paymentController.failPayout(failReq, failRes, next);
    expect(failRes.payload.data.uiStatus).toBe('failed');
    expect(txForFail.status).toBe('failed');
    expect(walletForRefund.balance).toBe(590);

    const deleteReq = { user: adminUser, params: { payoutId: '507f1f77bcf86cd799439139' }, body: {}, query: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const deleteRes = createResponseMock(deleteReq);
    await paymentController.deletePayout(deleteReq, deleteRes, next);
    expect(payoutForDelete.isActive).toBe(false);
    expect(deleteRes.payload.data).toBeNull();
  });
});
