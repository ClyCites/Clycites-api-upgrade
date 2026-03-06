const mockFieldCaseModel = {
  find: jest.fn(),
  countDocuments: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
};

const mockResearchReportModel = {
  find: jest.fn(),
  countDocuments: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
};

const mockAdvisoryModel = {
  find: jest.fn(),
  findById: jest.fn(),
};

const mockKnowledgeArticleModel = {
  find: jest.fn(),
  findById: jest.fn(),
};

const mockCaseReviewService = {
  getAllCases: jest.fn(),
  getCaseById: jest.fn(),
  assignCase: jest.fn(),
  startReview: jest.fn(),
  submitReview: jest.fn(),
};

const mockAdvisoryService = {
  reviewAdvisory: jest.fn(),
};

const mockKnowledgeBaseService = {
  reviewArticle: jest.fn(),
};

jest.mock('../dist/modules/expert-portal/fieldCase.model', () => ({
  __esModule: true,
  default: mockFieldCaseModel,
}));

jest.mock('../dist/modules/expert-portal/researchReport.model', () => ({
  __esModule: true,
  default: mockResearchReportModel,
}));

jest.mock('../dist/modules/expert-portal/advisory.model', () => ({
  __esModule: true,
  default: mockAdvisoryModel,
}));

jest.mock('../dist/modules/expert-portal/knowledgeArticle.model', () => ({
  __esModule: true,
  default: mockKnowledgeArticleModel,
}));

jest.mock('../dist/modules/expert-portal/caseReview.service', () => ({
  __esModule: true,
  default: mockCaseReviewService,
}));

jest.mock('../dist/modules/expert-portal/advisory.service', () => ({
  __esModule: true,
  default: mockAdvisoryService,
}));

jest.mock('../dist/modules/expert-portal/knowledgeBase.service', () => ({
  __esModule: true,
  default: mockKnowledgeBaseService,
}));

const workspaceController = require('../dist/modules/expert-portal/expertWorkspace.controller').default;

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

const createSortLimitQuery = (rows) => {
  const limit = jest.fn().mockResolvedValue(rows);
  const sort = jest.fn().mockReturnValue({ limit });
  return { sort };
};

const createFieldCaseDoc = (overrides = {}) => {
  const doc = {
    _id: '507f1f77bcf86cd799439301',
    caseNumber: 'CASE-1001',
    title: 'Tomato blight case',
    description: 'Field observation pending review',
    status: 'created',
    isActive: true,
    organization: { toString: () => '507f1f77bcf86cd799439012' },
    createdBy: { toString: () => '507f1f77bcf86cd799439011' },
    assignedExpertUser: undefined,
    assignedBy: undefined,
    assignedAt: undefined,
    startedAt: undefined,
    submittedAt: undefined,
    resolvedAt: undefined,
    closedAt: undefined,
    notes: '',
    metadata: {},
    save: jest.fn().mockResolvedValue(undefined),
    toObject: jest.fn(function toObject() {
      return {
        _id: doc._id,
        caseNumber: doc.caseNumber,
        title: doc.title,
        description: doc.description,
        status: doc.status,
        isActive: doc.isActive,
        organization: doc.organization,
        createdBy: doc.createdBy,
        assignedExpertUser: doc.assignedExpertUser,
        assignedBy: doc.assignedBy,
        assignedAt: doc.assignedAt,
        resolvedAt: doc.resolvedAt,
        closedAt: doc.closedAt,
        metadata: doc.metadata,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      };
    }),
    ...overrides,
  };
  return doc;
};

const createResearchDoc = (overrides = {}) => {
  const doc = {
    _id: '507f1f77bcf86cd799439401',
    title: 'Coffee rust trend report',
    summary: 'Summary',
    content: 'Report content',
    tags: [],
    status: 'draft',
    isActive: true,
    createdBy: { toString: () => '507f1f77bcf86cd799439011' },
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return doc;
};

const adminUser = {
  id: '507f1f77bcf86cd799439011',
  role: 'platform_admin',
  orgId: '507f1f77bcf86cd799439012',
};

const expertUser = {
  id: '507f1f77bcf86cd799439021',
  role: 'expert',
  orgId: '507f1f77bcf86cd799439012',
};

describe('Expert workspace controller contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('field case lifecycle supports assign/start/submit/close and self-assign', async () => {
    const next = jest.fn();
    const caseDoc = createFieldCaseDoc();

    mockFieldCaseModel.findOne.mockResolvedValue(caseDoc);

    const assignReq = { user: adminUser, params: { id: caseDoc._id }, body: { expertId: expertUser.id }, query: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const assignRes = createResponseMock(assignReq);
    await workspaceController.assignCase(assignReq, assignRes, next);
    expect(assignRes.payload.success).toBe(true);
    expect(assignRes.payload.data.uiStatus).toBe('assigned');
    expect(caseDoc.status).toBe('assigned');

    const startReq = { user: expertUser, params: { id: caseDoc._id }, body: {}, query: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const startRes = createResponseMock(startReq);
    await workspaceController.startCaseReview(startReq, startRes, next);
    expect(startRes.payload.data.uiStatus).toBe('in_visit');
    expect(caseDoc.status).toBe('in_visit');

    const submitReq = { user: expertUser, params: { id: caseDoc._id }, body: { resolution: 'Resolved on site' }, query: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const submitRes = createResponseMock(submitReq);
    await workspaceController.submitCaseReview(submitReq, submitRes, next);
    expect(submitRes.payload.data.uiStatus).toBe('resolved');
    expect(caseDoc.status).toBe('resolved');

    const closeReq = { user: adminUser, params: { id: caseDoc._id }, body: { reason: 'Verification completed' }, query: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const closeRes = createResponseMock(closeReq);
    await workspaceController.closeCase(closeReq, closeRes, next);
    expect(closeRes.payload.data.uiStatus).toBe('closed');
    expect(caseDoc.status).toBe('closed');

    const selfAssignCase = createFieldCaseDoc({
      _id: '507f1f77bcf86cd799439302',
      createdBy: { toString: () => expertUser.id },
      status: 'created',
    });
    mockFieldCaseModel.findOne.mockResolvedValueOnce(selfAssignCase);

    const selfReq = { user: expertUser, params: { id: selfAssignCase._id }, body: {}, query: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const selfRes = createResponseMock(selfReq);
    await workspaceController.assignSelfCase(selfReq, selfRes, next);
    expect(selfRes.payload.data.uiStatus).toBe('assigned');
    expect(selfAssignCase.status).toBe('assigned');
  });

  test('assignments list/detail/update return deterministic status semantics', async () => {
    const next = jest.fn();
    const assignmentDoc = createFieldCaseDoc({
      status: 'in_visit',
      assignedExpertUser: { toString: () => expertUser.id },
      createdBy: { toString: () => adminUser.id },
    });

    mockFieldCaseModel.find.mockReturnValue(createPagedQuery([assignmentDoc]));
    mockFieldCaseModel.countDocuments.mockResolvedValue(1);

    const listReq = { user: adminUser, query: { page: '1', limit: '20' }, params: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const listRes = createResponseMock(listReq);
    await workspaceController.listAssignments(listReq, listRes, next);
    expect(listRes.payload.success).toBe(true);
    expect(listRes.payload.data[0].uiStatus).toBe('assigned');
    expect(listRes.payload.meta.pagination.total).toBe(1);

    const getDoc = createFieldCaseDoc({
      _id: '507f1f77bcf86cd799439303',
      status: 'assigned',
      assignedExpertUser: { toString: () => expertUser.id },
      createdBy: { toString: () => adminUser.id },
    });
    mockFieldCaseModel.findOne.mockResolvedValueOnce(getDoc);

    const getReq = { user: adminUser, query: {}, params: { id: getDoc._id }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const getRes = createResponseMock(getReq);
    await workspaceController.getAssignment(getReq, getRes, next);
    expect(getRes.payload.data.uiStatus).toBe('assigned');

    const updateDoc = createFieldCaseDoc({
      _id: '507f1f77bcf86cd799439304',
      status: 'assigned',
      assignedExpertUser: { toString: () => expertUser.id },
      createdBy: { toString: () => adminUser.id },
    });
    mockFieldCaseModel.findOne.mockResolvedValueOnce(updateDoc);

    const updateReq = { user: adminUser, query: {}, params: { id: updateDoc._id }, body: { status: 'completed' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const updateRes = createResponseMock(updateReq);
    await workspaceController.updateAssignment(updateReq, updateRes, next);
    expect(updateRes.payload.data.uiStatus).toBe('completed');
    expect(updateDoc.status).toBe('closed');
  });

  test('review queue list + approve/reject workflows are wired', async () => {
    const next = jest.fn();

    const advisoryDoc = {
      _id: '507f1f77bcf86cd799439501',
      title: 'Advisory draft',
      status: 'submitted',
      acknowledgedCount: 0,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T01:00:00.000Z'),
      toObject: jest.fn().mockReturnValue({ acknowledgedCount: 0 }),
    };
    const knowledgeDoc = {
      _id: '507f1f77bcf86cd799439502',
      title: 'Knowledge article',
      status: 'under_review',
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T01:00:00.000Z'),
    };
    const fieldCaseDoc = createFieldCaseDoc({
      _id: '507f1f77bcf86cd799439503',
      status: 'in_visit',
      createdBy: { toString: () => adminUser.id },
      createdAt: new Date('2026-01-03T00:00:00.000Z'),
      updatedAt: new Date('2026-01-03T01:00:00.000Z'),
    });
    const reportDoc = createResearchDoc({
      _id: '507f1f77bcf86cd799439504',
      status: 'in_review',
      createdAt: new Date('2026-01-04T00:00:00.000Z'),
      updatedAt: new Date('2026-01-04T01:00:00.000Z'),
    });

    mockAdvisoryModel.find.mockReturnValue(createSortLimitQuery([advisoryDoc]));
    mockKnowledgeArticleModel.find.mockReturnValue(createSortLimitQuery([knowledgeDoc]));
    mockFieldCaseModel.find.mockReturnValue(createSortLimitQuery([fieldCaseDoc]));
    mockResearchReportModel.find.mockReturnValue(createSortLimitQuery([reportDoc]));

    const listReq = { user: adminUser, query: { page: '1', limit: '20' }, params: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const listRes = createResponseMock(listReq);
    await workspaceController.listReviewQueue(listReq, listRes, next);

    expect(listRes.payload.success).toBe(true);
    expect(listRes.payload.data.length).toBeGreaterThanOrEqual(4);

    const approvedAdvisory = { _id: advisoryDoc._id, status: 'approved', acknowledgedCount: 0, toObject: jest.fn().mockReturnValue({ _id: advisoryDoc._id, status: 'approved', acknowledgedCount: 0 }) };
    mockAdvisoryService.reviewAdvisory.mockResolvedValue(approvedAdvisory);

    const approveReq = { user: adminUser, query: {}, params: { id: `advisory:${advisoryDoc._id}` }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const approveRes = createResponseMock(approveReq);
    await workspaceController.approveReviewQueueItem(approveReq, approveRes, next);
    expect(approveRes.payload.data.uiStatus).toBe('approved');

    const rejectedKnowledge = { _id: knowledgeDoc._id, status: 'rejected', toObject: jest.fn().mockReturnValue({ _id: knowledgeDoc._id, status: 'rejected' }) };
    mockKnowledgeBaseService.reviewArticle.mockResolvedValue(rejectedKnowledge);

    const rejectReq = { user: adminUser, query: {}, params: { id: `knowledge:${knowledgeDoc._id}` }, body: { reason: 'Needs revisions' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const rejectRes = createResponseMock(rejectReq);
    await workspaceController.rejectReviewQueueItem(rejectReq, rejectRes, next);
    expect(rejectRes.payload.data.uiStatus).toBe('rejected');
  });

  test('research reports CRUD + workflow transitions remain deterministic', async () => {
    const next = jest.fn();

    const listDoc = createResearchDoc({ status: 'draft' });
    mockResearchReportModel.find.mockReturnValue(createPagedQuery([listDoc]));
    mockResearchReportModel.countDocuments.mockResolvedValue(1);

    const listReq = { user: adminUser, query: { page: '1', limit: '20' }, params: {}, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const listRes = createResponseMock(listReq);
    await workspaceController.listResearchReports(listReq, listRes, next);
    expect(listRes.payload.data[0].uiStatus).toBe('draft');
    expect(listRes.payload.meta.pagination.total).toBe(1);

    const createdDoc = createResearchDoc({ _id: '507f1f77bcf86cd799439402', status: 'draft' });
    mockResearchReportModel.create.mockResolvedValue(createdDoc);
    const createReq = { user: adminUser, query: {}, params: {}, body: { title: 'Report', content: 'Content' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const createRes = createResponseMock(createReq);
    await workspaceController.createResearchReport(createReq, createRes, next);
    expect(createRes.statusCode).toBe(201);
    expect(createRes.payload.data.uiStatus).toBe('draft');

    const getDoc = createResearchDoc({ _id: '507f1f77bcf86cd799439403', status: 'in_review' });
    const updateDoc = createResearchDoc({ _id: '507f1f77bcf86cd799439404', status: 'draft' });
    const submitDoc = createResearchDoc({ _id: '507f1f77bcf86cd799439405', status: 'draft' });
    const publishDoc = createResearchDoc({ _id: '507f1f77bcf86cd799439406', status: 'in_review' });
    const archiveDoc = createResearchDoc({ _id: '507f1f77bcf86cd799439407', status: 'published' });
    const deleteDoc = createResearchDoc({ _id: '507f1f77bcf86cd799439408', status: 'draft', isActive: true });

    mockResearchReportModel.findOne
      .mockResolvedValueOnce(getDoc)
      .mockResolvedValueOnce(updateDoc)
      .mockResolvedValueOnce(submitDoc)
      .mockResolvedValueOnce(publishDoc)
      .mockResolvedValueOnce(archiveDoc)
      .mockResolvedValueOnce(deleteDoc);

    const getReq = { user: adminUser, query: {}, params: { id: getDoc._id }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const getRes = createResponseMock(getReq);
    await workspaceController.getResearchReport(getReq, getRes, next);
    expect(getRes.payload.data.uiStatus).toBe('in_review');

    const updateReq = { user: adminUser, query: {}, params: { id: updateDoc._id }, body: { status: 'in_review' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const updateRes = createResponseMock(updateReq);
    await workspaceController.updateResearchReport(updateReq, updateRes, next);
    expect(updateRes.payload.data.uiStatus).toBe('in_review');

    const submitReq = { user: adminUser, query: {}, params: { id: submitDoc._id }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const submitRes = createResponseMock(submitReq);
    await workspaceController.submitResearchReport(submitReq, submitRes, next);
    expect(submitRes.payload.data.uiStatus).toBe('in_review');

    const publishReq = { user: adminUser, query: {}, params: { id: publishDoc._id }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const publishRes = createResponseMock(publishReq);
    await workspaceController.publishResearchReport(publishReq, publishRes, next);
    expect(publishRes.payload.data.uiStatus).toBe('published');

    const archiveReq = { user: adminUser, query: {}, params: { id: archiveDoc._id }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const archiveRes = createResponseMock(archiveReq);
    await workspaceController.archiveResearchReport(archiveReq, archiveRes, next);
    expect(archiveRes.payload.data.uiStatus).toBe('archived');

    const deleteReq = { user: adminUser, query: {}, params: { id: deleteDoc._id }, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const deleteRes = createResponseMock(deleteReq);
    await workspaceController.deleteResearchReport(deleteReq, deleteRes, next);
    expect(deleteRes.payload.data).toBeNull();
    expect(deleteDoc.isActive).toBe(false);
  });
});
