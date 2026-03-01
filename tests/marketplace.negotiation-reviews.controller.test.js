const mockMessagingService = {
  createConversation: jest.fn(),
  getMyConversations: jest.fn(),
  getConversation: jest.fn(),
  archiveConversation: jest.fn(),
  updateNegotiationStatus: jest.fn(),
  sendMessage: jest.fn(),
  getMessages: jest.fn(),
};

const mockAuditService = {
  log: jest.fn().mockResolvedValue(undefined),
};

const mockReputationService = {
  createRating: jest.fn(),
  getUserRatings: jest.fn(),
  getRatingById: jest.fn(),
  updateRating: jest.fn(),
  deleteRating: jest.fn(),
  moderateRating: jest.fn(),
};

jest.mock('../dist/modules/notifications/messaging.service', () => ({
  __esModule: true,
  default: mockMessagingService,
}));

jest.mock('../dist/modules/audit/audit.service', () => ({
  __esModule: true,
  default: mockAuditService,
}));

jest.mock('../dist/modules/reputation/reputation.service', () => ({
  __esModule: true,
  reputationService: mockReputationService,
}));

const messagingController = require('../dist/modules/notifications/messaging.controller');
const { reputationController } = require('../dist/modules/reputation/reputation.controller');

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
  role: 'platform_admin',
  orgId: '507f1f77bcf86cd799439012',
};

describe('Marketplace negotiations and reviews controllers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('negotiation conversation lifecycle + message actions return deterministic payloads', async () => {
    const next = jest.fn();

    const conversation = {
      _id: '507f1f77bcf86cd799439501',
      type: 'buyer_seller',
      negotiationStatus: 'open',
      isArchived: false,
      toObject() {
        return {
          _id: this._id,
          type: this.type,
          negotiationStatus: this.negotiationStatus,
          isArchived: this.isArchived,
        };
      },
    };

    const archivedConversation = {
      ...conversation,
      negotiationStatus: 'closed',
      isArchived: true,
      toObject() {
        return {
          _id: this._id,
          type: this.type,
          negotiationStatus: this.negotiationStatus,
          isArchived: this.isArchived,
        };
      },
    };

    const agreedConversation = {
      ...conversation,
      negotiationStatus: 'agreed',
      toObject() {
        return {
          _id: this._id,
          type: this.type,
          negotiationStatus: this.negotiationStatus,
          isArchived: this.isArchived,
        };
      },
    };

    mockMessagingService.createConversation.mockResolvedValue(conversation);
    mockMessagingService.getMyConversations.mockResolvedValue({
      data: [conversation],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    mockMessagingService.getConversation.mockResolvedValue(conversation);
    mockMessagingService.archiveConversation.mockResolvedValue(archivedConversation);
    mockMessagingService.updateNegotiationStatus.mockResolvedValue(agreedConversation);
    mockMessagingService.sendMessage.mockResolvedValue({ _id: '507f1f77bcf86cd799439511', body: 'Price update?' });
    mockMessagingService.getMessages.mockResolvedValue({
      data: [{ _id: '507f1f77bcf86cd799439511', body: 'Price update?' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const createReq = {
      body: { type: 'buyer_seller', participantIds: ['507f1f77bcf86cd799439021'] },
      user,
    };
    const createRes = createResponseMock(createReq);
    await messagingController.createConversation(createReq, createRes, next);
    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data.uiStatus).toBe('open');

    const listReq = { query: { page: '1', limit: '20' }, user };
    const listRes = createResponseMock(listReq);
    await messagingController.getMyConversations(listReq, listRes, next);
    expect(listRes.payload.success).toBe(true);
    expect(listRes.payload.data[0].uiStatus).toBe('open');
    expect(listRes.payload.meta.pagination.total).toBe(1);

    const updateStatusReq = {
      params: { id: '507f1f77bcf86cd799439501' },
      body: { status: 'agreed' },
      user,
    };
    const updateStatusRes = createResponseMock(updateStatusReq);
    await messagingController.updateNegotiationStatus(updateStatusReq, updateStatusRes, next);
    expect(updateStatusRes.payload.data.uiStatus).toBe('agreed');

    const archiveReq = {
      params: { id: '507f1f77bcf86cd799439501' },
      user,
    };
    const archiveRes = createResponseMock(archiveReq);
    await messagingController.archiveConversation(archiveReq, archiveRes, next);
    expect(archiveRes.payload.data.uiStatus).toBe('closed');

    const sendReq = {
      params: { id: '507f1f77bcf86cd799439501' },
      body: { body: 'Price update?' },
      user,
    };
    const sendRes = createResponseMock(sendReq);
    await messagingController.sendMessage(sendReq, sendRes, next);
    expect(sendRes.statusCode).toBe(201);
    expect(sendRes.payload.success).toBe(true);

    const messagesReq = {
      params: { id: '507f1f77bcf86cd799439501' },
      query: { page: '1', limit: '20' },
      user,
    };
    const messagesRes = createResponseMock(messagesReq);
    await messagingController.getMessages(messagesReq, messagesRes, next);
    expect(messagesRes.payload.data).toHaveLength(1);
    expect(messagesRes.payload.meta.pagination.totalPages).toBe(1);
  });

  test('reviews CRUD/moderation workflow returns deterministic contracts', async () => {
    const next = jest.fn();

    const draftRating = {
      _id: '507f1f77bcf86cd799439601',
      status: 'pending',
      review: 'Good transaction and prompt communication.',
    };
    const publishedRating = {
      ...draftRating,
      status: 'approved',
      uiStatus: 'published',
    };

    mockReputationService.createRating.mockResolvedValue(draftRating);
    mockReputationService.getUserRatings.mockResolvedValue({
      ratings: [publishedRating],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    mockReputationService.getRatingById.mockResolvedValue(publishedRating);
    mockReputationService.updateRating.mockResolvedValue(publishedRating);
    mockReputationService.moderateRating.mockResolvedValue({
      ...publishedRating,
      status: 'flagged',
      uiStatus: 'hidden',
    });
    mockReputationService.deleteRating.mockResolvedValue(undefined);

    const createReq = {
      body: {
        order: '507f1f77bcf86cd799439611',
        overallRating: 5,
        wouldRecommend: true,
        review: 'Good transaction and prompt communication.',
      },
      user,
    };
    const createRes = createResponseMock(createReq);
    await reputationController.createRating(createReq, createRes, next);

    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data.uiStatus).toBe('draft');

    const listReq = {
      params: { userId: '507f1f77bcf86cd799439021' },
      query: { uiStatus: 'published', page: '1', limit: '20' },
      user,
    };
    const listRes = createResponseMock(listReq);
    await reputationController.getUserRatings(listReq, listRes, next);

    expect(listRes.payload.success).toBe(true);
    expect(listRes.payload.data[0].uiStatus).toBe('published');
    expect(listRes.payload.meta.pagination.total).toBe(1);

    const getReq = { params: { ratingId: '507f1f77bcf86cd799439601' }, user };
    const getRes = createResponseMock(getReq);
    await reputationController.getRatingById(getReq, getRes, next);
    expect(getRes.payload.data.uiStatus).toBe('published');

    const updateReq = {
      params: { ratingId: '507f1f77bcf86cd799439601' },
      body: { review: 'Updated review text for moderation flow.' },
      user,
    };
    const updateRes = createResponseMock(updateReq);
    await reputationController.updateRating(updateReq, updateRes, next);
    expect(updateRes.payload.success).toBe(true);

    const moderateReq = {
      params: { ratingId: '507f1f77bcf86cd799439601' },
      body: { status: 'hidden', reason: 'Contains disallowed content' },
      user,
    };
    const moderateRes = createResponseMock(moderateReq);
    await reputationController.moderateRating(moderateReq, moderateRes, next);
    expect(moderateRes.payload.data.uiStatus).toBe('hidden');

    const deleteReq = { params: { ratingId: '507f1f77bcf86cd799439601' }, user };
    const deleteRes = createResponseMock(deleteReq);
    await reputationController.deleteRating(deleteReq, deleteRes, next);
    expect(deleteRes.payload.success).toBe(true);
    expect(deleteRes.payload.data).toBeNull();
  });
});
