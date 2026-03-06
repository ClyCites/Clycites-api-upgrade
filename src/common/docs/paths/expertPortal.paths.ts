const auth = [{ BearerAuth: [] }];
const r = (s: object) => ({ required: true, content: { 'application/json': { schema: s } } });
const idParam = { $ref: '#/components/parameters/mongoIdPath' };
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };

export const expertPortalPaths: Record<string, unknown> = {

  // ── Expert Profiles ────────────────────────────────────────────────────────────

  '/api/v1/expert-portal/experts': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Register as an expert',
      operationId: 'registerExpert',
      security: auth,
      requestBody: r({ type: 'object', required: ['specializations', 'bio'], properties: { specializations: { type: 'array', items: { type: 'string' }, example: ['crop_diseases', 'soil_health'] }, bio: { type: 'string' }, qualifications: { type: 'array', items: { type: 'object', properties: { degree: { type: 'string' }, institution: { type: 'string' }, year: { type: 'integer' } } } }, yearsOfExperience: { type: 'integer', minimum: 0 }, languages: { type: 'array', items: { type: 'string' } }, country: { type: 'string' }, hourlyRate: { type: 'number' } } }),
      responses: { 201: { description: 'Expert profile created.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
    get: {
      tags: ['Expert Portal'],
      summary: 'Browse verified experts',
      operationId: 'listExperts',
      security: auth,
      parameters: [pageParam, limitParam, { name: 'specialization', in: 'query', schema: { type: 'string' } }, { name: 'country', in: 'query', schema: { type: 'string' } }, { name: 'language', in: 'query', schema: { type: 'string' } }, { name: 'minRating', in: 'query', schema: { type: 'number', minimum: 1, maximum: 5 } }, { name: 'available', in: 'query', schema: { type: 'boolean' } }],
      responses: { 200: { description: 'Expert list.' } },
    },
  },

  '/api/v1/expert-portal/experts/me': {
    get: {
      tags: ['Expert Portal'],
      summary: 'Get my expert profile',
      operationId: 'getMyExpertProfile',
      security: auth,
      responses: { 200: { description: 'My expert profile.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  '/api/v1/expert-portal/experts/{id}': {
    get: {
      tags: ['Expert Portal'],
      summary: 'Get expert by ID',
      operationId: 'getExpert',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Expert profile.' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Expert Portal'],
      summary: 'Update expert profile',
      operationId: 'updateExpertProfile',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { bio: { type: 'string' }, specializations: { type: 'array', items: { type: 'string' } }, hourlyRate: { type: 'number' }, available: { type: 'boolean' } } }),
      responses: { 200: { description: 'Updated.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/experts/{id}/verify': {
    post: {
      tags: ['Expert Portal', 'Admin'],
      summary: 'Verify or reject expert application',
      description: '`platform_admin` only.',
      operationId: 'verifyExpert',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['verified', 'rejected', 'suspended'] }, reason: { type: 'string' } } }),
      responses: { 200: { description: 'Expert status updated.' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/experts/{id}/suspend': {
    post: {
      tags: ['Expert Portal', 'Admin'],
      summary: 'Suspend an expert',
      description: '`platform_admin` only.',
      operationId: 'suspendExpert',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { reason: { type: 'string' } } }),
      responses: { 200: { description: 'Expert suspended.' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/experts/{id}/dashboard': {
    get: {
      tags: ['Expert Portal'],
      summary: 'Expert performance dashboard',
      operationId: 'expertDashboard',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Dashboard analytics.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  // ── Cases ──────────────────────────────────────────────────────────────────────

  '/api/v1/expert-portal/cases': {
    get: {
      tags: ['Expert Portal'],
      summary: 'List all field/legacy cases',
      operationId: 'listAllCases',
      security: auth,
      parameters: [
        pageParam,
        limitParam,
        { name: 'source', in: 'query', schema: { type: 'string', enum: ['all', 'field', 'legacy'], default: 'all' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['created', 'assigned', 'in_visit', 'resolved', 'closed', 'pending', 'in_review', 'escalated', 'reviewed'] } },
        { name: 'uiStatus', in: 'query', schema: { type: 'string', enum: ['created', 'assigned', 'in_visit', 'resolved', 'closed'] } },
      ],
      responses: { 200: { description: 'Cases.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
    post: {
      tags: ['Expert Portal'],
      summary: 'Create a field case',
      operationId: 'createFieldCase',
      security: auth,
      requestBody: r({
        type: 'object',
        required: ['title', 'description'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          region: { type: 'string' },
          cropType: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          expertId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          source: { type: 'string', enum: ['workspace', 'inquiry', 'ai_report'] },
          reportId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          inquiryId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          metadata: { type: 'object', additionalProperties: true },
        },
      }),
      responses: { 201: { description: 'Field case created.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/expert-portal/cases/my': {
    get: {
      tags: ['Expert Portal'],
      summary: 'Get cases assigned to me (expert)',
      operationId: 'getMyCases',
      security: auth,
      parameters: [pageParam, limitParam, { name: 'status', in: 'query', schema: { type: 'string' } }],
      responses: { 200: { description: 'My assigned cases.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/expert-portal/cases/outbreaks': {
    get: {
      tags: ['Expert Portal'],
      summary: 'Get confirmed outbreak cases',
      description: 'Returns cases that have been escalated or confirmed as outbreaks.',
      operationId: 'getOutbreakCases',
      security: auth,
      parameters: [pageParam, limitParam],
      responses: { 200: { description: 'Outbreak cases.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/cases/ai-feedback': {
    get: {
      tags: ['Expert Portal', 'Admin'],
      summary: 'Get AI model feedback data (ML pipeline)',
      description: '`platform_admin` only. Returns expert corrections used to retrain the AI.',
      operationId: 'getAIFeedbackData',
      security: auth,
      parameters: [pageParam, limitParam],
      responses: { 200: { description: 'AI feedback dataset.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/cases/{id}': {
    get: {
      tags: ['Expert Portal'],
      summary: 'Get case detail',
      operationId: 'getCaseDetail',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Case details.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Expert Portal'],
      summary: 'Update field case',
      description: 'Supports status transition validation and returns `400` on invalid transitions.',
      operationId: 'updateFieldCase',
      security: auth,
      parameters: [idParam],
      requestBody: r({
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          region: { type: 'string' },
          cropType: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          expertId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          status: { type: 'string', enum: ['created', 'assigned', 'in_visit', 'resolved', 'closed'] },
          resolution: { type: 'string' },
          closeReason: { type: 'string' },
          notes: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
        },
      }),
      responses: { 200: { description: 'Case updated.' }, 400: { $ref: '#/components/responses/ValidationError' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
    delete: {
      tags: ['Expert Portal'],
      summary: 'Delete field case',
      operationId: 'deleteFieldCase',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Field case deleted.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/cases/{id}/assign': {
    post: {
      tags: ['Expert Portal', 'Admin'],
      summary: 'Assign case to an expert',
      description: 'Assigns either field-case resources or legacy case-review records.',
      operationId: 'assignCase',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['expertId'], properties: { expertId: { type: 'string', pattern: '^[a-f0-9]{24}$' } } }),
      responses: { 200: { description: 'Case assigned.' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  '/api/v1/expert-portal/cases/{id}/assign-self': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Self-assign case to current expert',
      operationId: 'assignCaseSelf',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Case self-assigned.' }, 400: { $ref: '#/components/responses/ValidationError' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/cases/{id}/start': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Expert starts reviewing a case',
      operationId: 'startCaseReview',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Case review started.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/cases/{id}/submit': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Expert submits case review decision',
      operationId: 'submitCaseReview',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['diagnosis', 'recommendations'], properties: { diagnosis: { type: 'string' }, recommendations: { type: 'array', items: { type: 'string' } }, confidence: { type: 'number', minimum: 0, maximum: 1 }, treatmentPlan: { type: 'string' }, notes: { type: 'string' } } }),
      responses: { 200: { description: 'Review submitted.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/cases/{id}/close': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Close a case',
      operationId: 'closeCase',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { reason: { type: 'string' }, closeReason: { type: 'string' } } }),
      responses: { 200: { description: 'Case closed.' }, 400: { $ref: '#/components/responses/ValidationError' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/cases/{id}/escalate': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Escalate case to a senior expert',
      operationId: 'escalateCase',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['reason'], properties: { reason: { type: 'string' }, targetExpertId: { type: 'string', pattern: '^[a-f0-9]{24}$', description: 'Optional: direct escalation target.' } } }),
      responses: { 200: { description: 'Case escalated.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/cases/{id}/ai-feedback': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Submit AI detection feedback for a case',
      operationId: 'submitAIFeedback',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['aiWasCorrect'], properties: { aiWasCorrect: { type: 'boolean' }, corrections: { type: 'object', description: 'Field-level corrections for AI training.' }, confidenceAssessment: { type: 'string', enum: ['overconfident', 'appropriate', 'underconfident'] } } }),
      responses: { 200: { description: 'AI feedback recorded.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/expert-portal/assignments': {
    get: {
      tags: ['Expert Portal'],
      summary: 'List dedicated assignments',
      operationId: 'listAssignments',
      security: auth,
      parameters: [pageParam, limitParam, { name: 'expertId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }, { name: 'status', in: 'query', schema: { type: 'string', enum: ['created', 'assigned', 'completed', 'cancelled'] } }],
      responses: { 200: { description: 'Assignments list.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/expert-portal/assignments/{id}': {
    get: {
      tags: ['Expert Portal'],
      summary: 'Get assignment by ID',
      operationId: 'getAssignment',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Assignment detail.' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Expert Portal'],
      summary: 'Update assignment metadata or status',
      description: 'Supports assignment status transition validation and returns `400` on invalid transitions.',
      operationId: 'updateAssignment',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { expertId: { type: 'string', pattern: '^[a-f0-9]{24}$' }, status: { type: 'string', enum: ['created', 'assigned', 'completed', 'cancelled'] }, notes: { type: 'string' }, metadata: { type: 'object', additionalProperties: true } } }),
      responses: { 200: { description: 'Assignment updated.' }, 400: { $ref: '#/components/responses/ValidationError' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  '/api/v1/expert-portal/review-queue': {
    get: {
      tags: ['Expert Portal'],
      summary: 'List dedicated review queue',
      operationId: 'listReviewQueue',
      security: auth,
      parameters: [pageParam, limitParam, { name: 'itemType', in: 'query', schema: { type: 'string', enum: ['advisory', 'knowledge', 'field_case', 'research_report'] } }, { name: 'status', in: 'query', schema: { type: 'string', enum: ['queued', 'in_review', 'approved', 'rejected'] } }],
      responses: { 200: { description: 'Review queue list.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/expert-portal/review-queue/{id}': {
    get: {
      tags: ['Expert Portal'],
      summary: 'Get review queue item',
      operationId: 'getReviewQueueItem',
      security: auth,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'advisory:507f1f77bcf86cd799439011' } }],
      responses: { 200: { description: 'Queue item detail.' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  '/api/v1/expert-portal/review-queue/{id}/approve': {
    post: {
      tags: ['Expert Portal', 'Admin'],
      summary: 'Approve review queue item',
      operationId: 'approveReviewQueueItem',
      security: auth,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'knowledge:507f1f77bcf86cd799439011' } }],
      requestBody: r({ type: 'object', properties: { reason: { type: 'string' } } }),
      responses: { 200: { description: 'Queue item approved.' }, 400: { $ref: '#/components/responses/ValidationError' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  '/api/v1/expert-portal/review-queue/{id}/reject': {
    post: {
      tags: ['Expert Portal', 'Admin'],
      summary: 'Reject review queue item',
      operationId: 'rejectReviewQueueItem',
      security: auth,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'field_case:507f1f77bcf86cd799439011' } }],
      requestBody: r({ type: 'object', properties: { reason: { type: 'string' }, note: { type: 'string' } } }),
      responses: { 200: { description: 'Queue item rejected.' }, 400: { $ref: '#/components/responses/ValidationError' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  '/api/v1/expert-portal/research-reports': {
    get: {
      tags: ['Expert Portal'],
      summary: 'List research reports',
      operationId: 'listResearchReports',
      security: auth,
      parameters: [pageParam, limitParam, { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'in_review', 'published', 'archived'] } }, { name: 'relatedCaseId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      responses: { 200: { description: 'Research report list.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
    post: {
      tags: ['Expert Portal'],
      summary: 'Create research report',
      operationId: 'createResearchReport',
      security: auth,
      requestBody: r({ type: 'object', required: ['title', 'content'], properties: { title: { type: 'string' }, summary: { type: 'string' }, content: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, relatedCaseId: { type: 'string', pattern: '^[a-f0-9]{24}$' }, status: { type: 'string', enum: ['draft', 'in_review', 'published', 'archived'] } } }),
      responses: { 201: { description: 'Research report created.' }, 400: { $ref: '#/components/responses/ValidationError' } },
    },
  },

  '/api/v1/expert-portal/research-reports/{id}': {
    get: {
      tags: ['Expert Portal'],
      summary: 'Get research report',
      operationId: 'getResearchReport',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Research report.' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Expert Portal'],
      summary: 'Update research report',
      description: 'Supports status transition validation and returns `400` on invalid transitions.',
      operationId: 'updateResearchReport',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { title: { type: 'string' }, summary: { type: 'string' }, content: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, relatedCaseId: { type: 'string', pattern: '^[a-f0-9]{24}$' }, status: { type: 'string', enum: ['draft', 'in_review', 'published', 'archived'] }, metadata: { type: 'object', additionalProperties: true } } }),
      responses: { 200: { description: 'Research report updated.' }, 400: { $ref: '#/components/responses/ValidationError' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    delete: {
      tags: ['Expert Portal'],
      summary: 'Delete research report',
      operationId: 'deleteResearchReport',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Research report deleted.' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  '/api/v1/expert-portal/research-reports/{id}/submit': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Submit research report for review',
      operationId: 'submitResearchReport',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Report submitted.' }, 400: { $ref: '#/components/responses/ValidationError' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  '/api/v1/expert-portal/research-reports/{id}/publish': {
    post: {
      tags: ['Expert Portal', 'Admin'],
      summary: 'Publish research report',
      operationId: 'publishResearchReport',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Report published.' }, 400: { $ref: '#/components/responses/ValidationError' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  '/api/v1/expert-portal/research-reports/{id}/archive': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Archive research report',
      operationId: 'archiveResearchReport',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Report archived.' }, 400: { $ref: '#/components/responses/ValidationError' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  // ── Knowledge Base ─────────────────────────────────────────────────────────────

  '/api/v1/expert-portal/knowledge': {
    get: {
      tags: ['Expert Portal'],
      summary: 'Search / browse knowledge articles',
      operationId: 'searchKnowledgeArticles',
      parameters: [pageParam, limitParam, { name: 'category', in: 'query', schema: { type: 'string' } }, { name: 'cropType', in: 'query', schema: { type: 'string' } }, { name: 'search', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'under_review', 'approved', 'rejected', 'published', 'archived'] } }],
      responses: { 200: { description: 'Articles.' } },
    },
    post: {
      tags: ['Expert Portal'],
      summary: 'Create knowledge article',
      operationId: 'createKnowledgeArticle',
      security: auth,
      requestBody: r({ type: 'object', required: ['title', 'content', 'category'], properties: { title: { type: 'string' }, content: { type: 'string', description: 'Markdown body.' }, summary: { type: 'string' }, category: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, cropTypes: { type: 'array', items: { type: 'string' } } } }),
      responses: { 201: { description: 'Article created.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/expert-portal/knowledge/{id}': {
    get: {
      tags: ['Expert Portal'],
      summary: 'Get knowledge article by ID',
      operationId: 'getKnowledgeArticle',
      parameters: [idParam],
      responses: { 200: { description: 'Article.' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Expert Portal'],
      summary: 'Update knowledge article',
      description: 'Supports status transition validation and returns `400` on invalid transitions.',
      operationId: 'updateKnowledgeArticle',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' }, status: { type: 'string', enum: ['draft', 'under_review', 'approved', 'rejected', 'published', 'archived'] } } }),
      responses: { 200: { description: 'Updated.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
    delete: {
      tags: ['Expert Portal'],
      summary: 'Delete (archive) knowledge article',
      operationId: 'deleteKnowledgeArticle',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Article deleted.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  '/api/v1/expert-portal/knowledge/{id}/submit': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Submit article for editorial review',
      operationId: 'submitArticleForReview',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Submitted for review.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/expert-portal/knowledge/{id}/review': {
    post: {
      tags: ['Expert Portal', 'Admin'],
      summary: 'Approve or reject article',
      description: 'Admin / senior expert reviews and approves or rejects a submitted article.',
      operationId: 'reviewKnowledgeArticle',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['decision'], properties: { decision: { type: 'string', enum: ['approved', 'rejected'] }, feedback: { type: 'string' } } }),
      responses: { 200: { description: 'Review decision recorded.' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/knowledge/{id}/publish': {
    post: {
      tags: ['Expert Portal', 'Admin'],
      summary: 'Publish an approved article',
      description: '`platform_admin` only.',
      operationId: 'publishKnowledgeArticle',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Article published.' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/knowledge/{id}/rate': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Rate a knowledge article',
      operationId: 'rateKnowledgeArticle',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['rating'], properties: { rating: { type: 'integer', minimum: 1, maximum: 5 }, comment: { type: 'string' } } }),
      responses: { 200: { description: 'Rating submitted.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/expert-portal/knowledge/{id}/translate': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Add article translation',
      operationId: 'addArticleTranslation',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['language', 'title', 'content'], properties: { language: { type: 'string', example: 'sw' }, title: { type: 'string' }, content: { type: 'string' }, summary: { type: 'string' } } }),
      responses: { 200: { description: 'Translation added.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  // ── Advisories ──────────────────────────────────────────────────────────────────

  '/api/v1/expert-portal/advisories/feed': {
    get: {
      tags: ['Expert Portal'],
      summary: 'Farmer personalised advisory feed',
      operationId: 'advisoryFeed',
      security: auth,
      parameters: [pageParam, limitParam, { name: 'urgency', in: 'query', schema: { type: 'string', enum: ['info', 'warning', 'critical'] } }],
      responses: { 200: { description: 'Advisory feed.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/expert-portal/advisories/emergency': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Issue an immediate emergency alert',
      description: 'Broadcasts an urgent advisory immediately. Requires `expert` or `platform_admin` role.',
      operationId: 'issueEmergencyAlert',
      security: auth,
      requestBody: r({ type: 'object', required: ['title', 'message', 'affectedRegions'], properties: { title: { type: 'string' }, message: { type: 'string' }, affectedRegions: { type: 'array', items: { type: 'string' } }, affectedCrops: { type: 'array', items: { type: 'string' } }, severity: { type: 'string', enum: ['high', 'critical'], default: 'critical' } } }),
      responses: { 201: { description: 'Emergency alert issued and broadcast.' }, 400: { $ref: '#/components/responses/ValidationError' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/advisories': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Create expert advisory',
      description: 'Creates a draft or scheduled advisory for a targeted farmer audience.',
      operationId: 'createAdvisory',
      security: auth,
      requestBody: r({ type: 'object', required: ['title', 'content', 'category'], properties: { title: { type: 'string' }, content: { type: 'string' }, category: { type: 'string', enum: ['weather', 'pest_outbreak', 'market', 'best_practice', 'regulatory'] }, targetRegions: { type: 'array', items: { type: 'string' } }, targetCrops: { type: 'array', items: { type: 'string' } }, urgency: { type: 'string', enum: ['info', 'warning', 'critical'] }, expiresAt: { type: 'string', format: 'date-time' } } }),
      responses: { 201: { description: 'Advisory created.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
    get: {
      tags: ['Expert Portal'],
      summary: 'List advisories (expert / admin)',
      operationId: 'listAdvisories',
      security: auth,
      parameters: [
        pageParam,
        limitParam,
        { name: 'category', in: 'query', schema: { type: 'string' } },
        { name: 'urgency', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high', 'critical', 'emergency'] } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'submitted', 'approved', 'rejected', 'scheduled', 'sent', 'cancelled'] } },
        { name: 'uiStatus', in: 'query', schema: { type: 'string', enum: ['draft', 'in_review', 'approved', 'rejected', 'published', 'acknowledged'] } },
      ],
      responses: { 200: { description: 'Advisories.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/advisories/{id}': {
    get: {
      tags: ['Expert Portal'],
      summary: 'Get advisory by ID',
      operationId: 'getAdvisory',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Advisory details.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Expert Portal'],
      summary: 'Update advisory',
      operationId: 'updateAdvisory',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { title: { type: 'string' }, message: { type: 'string' }, urgency: { type: 'string', enum: ['low', 'medium', 'high', 'critical', 'emergency'] }, scheduledAt: { type: 'string', format: 'date-time' }, expiresAt: { type: 'string', format: 'date-time' }, targetRegions: { type: 'array', items: { type: 'string' } }, targetCrops: { type: 'array', items: { type: 'string' } }, targetDistricts: { type: 'array', items: { type: 'string' } } } }),
      responses: { 200: { description: 'Advisory updated.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    delete: {
      tags: ['Expert Portal'],
      summary: 'Delete advisory',
      operationId: 'deleteAdvisory',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Advisory deleted.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  '/api/v1/expert-portal/advisories/{id}/send': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Broadcast an advisory',
      description: 'Sends a draft advisory to the targeted audience.',
      operationId: 'sendAdvisory',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Advisory sent.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/advisories/{id}/submit': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Submit advisory for review',
      operationId: 'submitAdvisory',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Advisory submitted for review.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/advisories/{id}/review': {
    post: {
      tags: ['Expert Portal', 'Admin'],
      summary: 'Review advisory submission',
      description: '`platform_admin` approves or rejects a submitted advisory.',
      operationId: 'reviewAdvisory',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['decision'], properties: { decision: { type: 'string', enum: ['approved', 'rejected'] }, reason: { type: 'string' } } }),
      responses: { 200: { description: 'Review decision recorded.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/advisories/{id}/acknowledge': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Acknowledge receipt of an advisory',
      operationId: 'acknowledgeAdvisory',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Advisory acknowledged.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  // ── Inquiries ───────────────────────────────────────────────────────────────────

  '/api/v1/expert-portal/inquiries': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Submit a consultation inquiry',
      description: 'Farmers submit questions for expert review.',
      operationId: 'createInquiry',
      security: auth,
      requestBody: r({ type: 'object', required: ['title', 'description', 'category'], properties: { title: { type: 'string' }, description: { type: 'string' }, category: { type: 'string', enum: ['pest_disease', 'soil', 'irrigation', 'market', 'finance', 'general'] }, urgency: { type: 'string', enum: ['low', 'normal', 'high'] }, cropType: { type: 'string' }, farmId: { type: 'string', pattern: '^[a-f0-9]{24}$' } } }),
      responses: { 201: { description: 'Inquiry submitted.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/expert-portal/inquiries/my': {
    get: {
      tags: ['Expert Portal'],
      summary: "Get farmer's own inquiries",
      operationId: 'getMyInquiries',
      security: auth,
      parameters: [pageParam, limitParam, { name: 'status', in: 'query', schema: { type: 'string' } }],
      responses: { 200: { description: 'My inquiries.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/expert-portal/inquiries/assigned': {
    get: {
      tags: ['Expert Portal'],
      summary: 'Get inquiries assigned to me (expert)',
      operationId: 'getAssignedInquiries',
      security: auth,
      parameters: [pageParam, limitParam, { name: 'status', in: 'query', schema: { type: 'string' } }],
      responses: { 200: { description: 'Assigned inquiries.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/inquiries/unassigned': {
    get: {
      tags: ['Expert Portal', 'Admin'],
      summary: 'Get open unassigned inquiries (admin triage)',
      operationId: 'getUnassignedInquiries',
      security: auth,
      parameters: [pageParam, limitParam],
      responses: { 200: { description: 'Unassigned inquiries.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/inquiries/{id}/assign': {
    post: {
      tags: ['Expert Portal', 'Admin'],
      summary: 'Assign inquiry to an expert',
      description: '`platform_admin` only.',
      operationId: 'assignInquiry',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['expertId'], properties: { expertId: { type: 'string', pattern: '^[a-f0-9]{24}$' } } }),
      responses: { 200: { description: 'Inquiry assigned.' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/inquiries/{id}/respond': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Expert responds to an inquiry',
      operationId: 'respondToInquiry',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['response'], properties: { response: { type: 'string', minLength: 20 }, attachments: { type: 'array', items: { type: 'string', format: 'uri' } }, recommendedProducts: { type: 'array', items: { type: 'string' } } } }),
      responses: { 200: { description: 'Response submitted.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/inquiries/{id}/followup': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Add follow-up message (farmer or expert)',
      operationId: 'addFollowUp',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['message'], properties: { message: { type: 'string' } } }),
      responses: { 200: { description: 'Follow-up added.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/expert-portal/inquiries/{id}/rate': {
    post: {
      tags: ['Expert Portal'],
      summary: 'Farmer rates the expert response',
      operationId: 'rateExpertResponse',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['rating'], properties: { rating: { type: 'integer', minimum: 1, maximum: 5 }, comment: { type: 'string' } } }),
      responses: { 200: { description: 'Rating submitted.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/inquiries/{id}': {
    get: {
      tags: ['Expert Portal'],
      summary: 'Get inquiry by ID',
      operationId: 'getInquiry',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Inquiry details.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Expert Portal'],
      summary: 'Update inquiry',
      operationId: 'updateInquiry',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { subject: { type: 'string' }, description: { type: 'string' }, cropType: { type: 'string' }, region: { type: 'string' }, urgency: { type: 'string', enum: ['low', 'medium', 'high', 'critical', 'emergency'] }, status: { type: 'string', enum: ['open', 'assigned', 'in_progress', 'resolved', 'closed'] } } }),
      responses: { 200: { description: 'Inquiry updated.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    delete: {
      tags: ['Expert Portal'],
      summary: 'Delete inquiry',
      operationId: 'deleteInquiry',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Inquiry deleted.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  // ── Analytics ────────────────────────────────────────────────────────────────────

  '/api/v1/expert-portal/analytics/disease-spread': {
    get: {
      tags: ['Expert Portal', 'Analytics'],
      summary: 'Disease spread analysis',
      operationId: 'getDiseaseSpread',
      security: auth,
      parameters: [{ name: 'days', in: 'query', schema: { type: 'integer', default: 30 } }, { name: 'diseaseType', in: 'query', schema: { type: 'string' } }],
      responses: { 200: { description: 'Disease spread data.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/analytics/outbreaks/heatmap': {
    get: {
      tags: ['Expert Portal', 'Analytics'],
      summary: 'Outbreak heatmap data',
      operationId: 'getOutbreakHeatmap',
      security: auth,
      parameters: [{ name: 'days', in: 'query', schema: { type: 'integer', default: 30 } }, { name: 'region', in: 'query', schema: { type: 'string' } }],
      responses: { 200: { description: 'Heatmap point data.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/analytics/ai-accuracy': {
    get: {
      tags: ['Expert Portal', 'Analytics'],
      summary: 'AI detection accuracy metrics',
      operationId: 'getAIAccuracy',
      security: auth,
      parameters: [{ name: 'days', in: 'query', schema: { type: 'integer', default: 90 } }],
      responses: { 200: { description: 'Accuracy metrics (precision, recall, F1).' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/analytics/knowledge-base': {
    get: {
      tags: ['Expert Portal', 'Analytics'],
      summary: 'Knowledge base usage statistics',
      operationId: 'getKnowledgeBaseStats',
      security: auth,
      responses: { 200: { description: 'KB stats by category, views, and ratings.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/analytics/experts': {
    get: {
      tags: ['Expert Portal', 'Analytics'],
      summary: 'Expert performance report',
      description: '`platform_admin` only.',
      operationId: 'getExpertPerformanceReport',
      security: auth,
      parameters: [{ name: 'days', in: 'query', schema: { type: 'integer', default: 30 } }],
      responses: { 200: { description: 'Expert performance metrics.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/analytics/advisory-engagement': {
    get: {
      tags: ['Expert Portal', 'Analytics'],
      summary: 'Advisory engagement metrics',
      operationId: 'getAdvisoryEngagement',
      security: auth,
      parameters: [{ name: 'days', in: 'query', schema: { type: 'integer', default: 30 } }],
      responses: { 200: { description: 'Advisory reach, open rates, acknowledgment rates.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/expert-portal/analytics/dashboard': {
    get: {
      tags: ['Expert Portal', 'Analytics'],
      summary: 'Policy dashboard (directors / government)',
      description: '`platform_admin` only. High-level strategic overview.',
      operationId: 'getPolicyDashboard',
      security: auth,
      responses: { 200: { description: 'Policy dashboard.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },
};
