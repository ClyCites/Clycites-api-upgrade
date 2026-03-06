const { openApiSpec } = require('../dist/common/docs');

describe('OpenAPI expert workspace contract coverage', () => {
  test('expert workspace endpoints are present', () => {
    expect(openApiSpec.paths['/api/v1/expert-portal/advisories']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/advisories/{id}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/advisories/{id}/submit']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/advisories/{id}/review']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/advisories/{id}/send']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/advisories/{id}/acknowledge']).toBeDefined();

    expect(openApiSpec.paths['/api/v1/expert-portal/knowledge']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/knowledge/{id}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/knowledge/{id}/submit']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/knowledge/{id}/review']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/knowledge/{id}/publish']).toBeDefined();

    expect(openApiSpec.paths['/api/v1/expert-portal/cases']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/cases/{id}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/cases/{id}/assign']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/cases/{id}/assign-self']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/cases/{id}/start']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/cases/{id}/submit']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/cases/{id}/close']).toBeDefined();

    expect(openApiSpec.paths['/api/v1/expert-portal/assignments']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/assignments/{id}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/review-queue']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/review-queue/{id}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/review-queue/{id}/approve']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/review-queue/{id}/reject']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/research-reports']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/research-reports/{id}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/research-reports/{id}/submit']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/research-reports/{id}/publish']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/expert-portal/research-reports/{id}/archive']).toBeDefined();
  });

  test('expert schemas document frontend-aligned status enums', () => {
    const advisorySchema = openApiSpec.components.schemas.ExpertAdvisory;
    const articleSchema = openApiSpec.components.schemas.KnowledgeArticle;
    const fieldCaseSchema = openApiSpec.components.schemas.FieldCase;
    const assignmentSchema = openApiSpec.components.schemas.ExpertAssignment;
    const reviewQueueSchema = openApiSpec.components.schemas.ExpertReviewQueueItem;
    const reportSchema = openApiSpec.components.schemas.ResearchReport;

    expect(advisorySchema.properties.uiStatus.enum).toEqual([
      'draft',
      'in_review',
      'approved',
      'rejected',
      'published',
      'acknowledged',
    ]);
    expect(articleSchema.properties.uiStatus.enum).toEqual([
      'draft',
      'in_review',
      'approved',
      'rejected',
      'published',
      'unpublished',
      'archived',
    ]);
    expect(fieldCaseSchema.properties.uiStatus.enum).toEqual([
      'created',
      'assigned',
      'in_visit',
      'resolved',
      'closed',
    ]);
    expect(assignmentSchema.properties.status.enum).toEqual([
      'created',
      'assigned',
      'completed',
      'cancelled',
    ]);
    expect(reviewQueueSchema.properties.status.enum).toEqual([
      'queued',
      'in_review',
      'approved',
      'rejected',
    ]);
    expect(reportSchema.properties.status.enum).toEqual([
      'draft',
      'in_review',
      'published',
      'archived',
    ]);
  });

  test('transition-sensitive expert endpoints document transition behavior', () => {
    const casePatch = openApiSpec.paths['/api/v1/expert-portal/cases/{id}'].patch;
    const assignmentPatch = openApiSpec.paths['/api/v1/expert-portal/assignments/{id}'].patch;
    const reportPatch = openApiSpec.paths['/api/v1/expert-portal/research-reports/{id}'].patch;
    const knowledgePatch = openApiSpec.paths['/api/v1/expert-portal/knowledge/{id}'].patch;

    expect(casePatch.description).toContain('status transition');
    expect(assignmentPatch.description).toContain('status transition');
    expect(reportPatch.description).toContain('status transition');
    expect(knowledgePatch.description).toContain('status transition');
  });
});
