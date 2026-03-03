const mockAdvisoryService = {
  getAdvisoryById: jest.fn(),
  updateAdvisory: jest.fn(),
  deleteAdvisory: jest.fn(),
  submitAdvisory: jest.fn(),
  reviewAdvisory: jest.fn(),
  acknowledgeAdvisory: jest.fn(),
  getInquiryById: jest.fn(),
  updateInquiry: jest.fn(),
  deleteInquiry: jest.fn(),
};

const mockKnowledgeBaseService = {
  submitForReview: jest.fn(),
  reviewArticle: jest.fn(),
  publishArticle: jest.fn(),
  deleteArticle: jest.fn(),
};

jest.mock('../dist/modules/expert-portal/advisory.service', () => ({
  __esModule: true,
  default: mockAdvisoryService,
}));

jest.mock('../dist/modules/expert-portal/knowledgeBase.service', () => ({
  __esModule: true,
  default: mockKnowledgeBaseService,
}));

jest.mock('../dist/modules/expert-portal/expertIdentity.service', () => ({
  __esModule: true,
  default: {},
}));

const controller = require('../dist/modules/expert-portal/expert.controller');

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

const user = { id: '507f1f77bcf86cd799439011', role: 'platform_admin' };

describe('Expert portal advisory and inquiry workspace endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('advisory update/delete/submit/review return deterministic contracts', async () => {
    const advisory = { _id: '507f1f77bcf86cd799439061', status: 'draft', title: 'Alert' };
    const submitted = { ...advisory, status: 'submitted' };
    const approved = { ...advisory, status: 'approved' };
    const next = jest.fn();

    mockAdvisoryService.updateAdvisory.mockResolvedValue(advisory);
    mockAdvisoryService.submitAdvisory.mockResolvedValue(submitted);
    mockAdvisoryService.reviewAdvisory.mockResolvedValue(approved);
    mockAdvisoryService.deleteAdvisory.mockResolvedValue(undefined);

    const updateReq = { params: { id: advisory._id }, body: { title: 'Alert 2' }, user };
    const updateRes = createResponseMock(updateReq);
    await controller.updateAdvisory(updateReq, updateRes, next);
    expect(updateRes.payload.success).toBe(true);
    expect(updateRes.payload.data).toEqual({ ...advisory, uiStatus: 'draft' });

    const submitReq = { params: { id: advisory._id }, user };
    const submitRes = createResponseMock(submitReq);
    await controller.submitAdvisory(submitReq, submitRes, next);
    expect(submitRes.payload.data).toEqual({ ...submitted, uiStatus: 'in_review' });

    const reviewReq = {
      params: { id: advisory._id },
      body: { decision: 'approved', reason: 'Looks good' },
      user,
    };
    const reviewRes = createResponseMock(reviewReq);
    await controller.reviewAdvisory(reviewReq, reviewRes, next);
    expect(reviewRes.payload.data).toEqual({ ...approved, uiStatus: 'approved' });

    const deleteReq = { params: { id: advisory._id }, user };
    const deleteRes = createResponseMock(deleteReq);
    await controller.deleteAdvisory(deleteReq, deleteRes, next);
    expect(deleteRes.payload.success).toBe(true);
    expect(deleteRes.payload.data).toBeNull();
  });

  test('knowledge article submit/review/publish/delete expose frontend-aligned uiStatus', async () => {
    const next = jest.fn();
    const underReview = { _id: '507f1f77bcf86cd799439081', status: 'under_review' };
    const approved = { _id: '507f1f77bcf86cd799439081', status: 'approved' };
    const published = { _id: '507f1f77bcf86cd799439081', status: 'published' };

    mockKnowledgeBaseService.submitForReview.mockResolvedValue(underReview);
    mockKnowledgeBaseService.reviewArticle.mockResolvedValue(approved);
    mockKnowledgeBaseService.publishArticle.mockResolvedValue(published);
    mockKnowledgeBaseService.deleteArticle.mockResolvedValue(undefined);

    const submitReq = { params: { id: underReview._id }, user };
    const submitRes = createResponseMock(submitReq);
    await controller.submitArticleForReview(submitReq, submitRes, next);
    expect(submitRes.payload.success).toBe(true);
    expect(submitRes.payload.data.uiStatus).toBe('in_review');

    const reviewReq = { params: { id: approved._id }, user, body: { approve: true, reviewNotes: 'ok' } };
    const reviewRes = createResponseMock(reviewReq);
    await controller.reviewArticle(reviewReq, reviewRes, next);
    expect(reviewRes.payload.data.uiStatus).toBe('approved');

    const publishReq = { params: { id: published._id }, user };
    const publishRes = createResponseMock(publishReq);
    await controller.publishArticle(publishReq, publishRes, next);
    expect(publishRes.payload.data.uiStatus).toBe('published');

    const deleteReq = { params: { id: published._id }, user };
    const deleteRes = createResponseMock(deleteReq);
    await controller.deleteArticle(deleteReq, deleteRes, next);
    expect(deleteRes.payload.data).toBeNull();
  });

  test('inquiry get/update/delete return deterministic contracts', async () => {
    const inquiry = { _id: '507f1f77bcf86cd799439071', subject: 'Need help' };
    const updatedInquiry = { ...inquiry, subject: 'Need help urgently' };
    const next = jest.fn();

    mockAdvisoryService.getInquiryById.mockResolvedValue(inquiry);
    mockAdvisoryService.updateInquiry.mockResolvedValue(updatedInquiry);
    mockAdvisoryService.deleteInquiry.mockResolvedValue(undefined);

    const getReq = { params: { id: inquiry._id }, user };
    const getRes = createResponseMock(getReq);
    await controller.getInquiry(getReq, getRes, next);
    expect(getRes.payload.success).toBe(true);
    expect(getRes.payload.data).toEqual(inquiry);

    const updateReq = { params: { id: inquiry._id }, body: { subject: 'Need help urgently' }, user };
    const updateRes = createResponseMock(updateReq);
    await controller.updateInquiry(updateReq, updateRes, next);
    expect(updateRes.payload.data).toEqual(updatedInquiry);

    const deleteReq = { params: { id: inquiry._id }, user };
    const deleteRes = createResponseMock(deleteReq);
    await controller.deleteInquiry(deleteReq, deleteRes, next);
    expect(deleteRes.payload.success).toBe(true);
    expect(deleteRes.payload.data).toBeNull();
  });
});
