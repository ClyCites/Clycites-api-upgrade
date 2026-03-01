const auth = [{ BearerAuth: [] }];
const r = (s: object) => ({ required: true, content: { 'application/json': { schema: s } } });
const reportIdParam = { name: 'reportId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } };
const farmerIdParam = { name: 'farmerId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } };
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };

export const pestDiseasePaths: Record<string, unknown> = {

  // ── Detection ─────────────────────────────────────────────────────────────────

  '/api/v1/pest-disease/detect': {
    post: {
      tags: ['Pest & Disease'],
      summary: 'Submit pest/disease detection request',
      description: 'Upload one or more crop images for AI-powered pest and disease analysis. Requires `farmer`, `extension_officer`, or `agronomist` role.',
      operationId: 'submitDetection',
      security: auth,
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['images', 'cropType'],
              properties: {
                images: { type: 'array', items: { type: 'string', format: 'binary' }, description: 'Up to 10 images (JPEG, PNG, WebP, HEIC). Max 10 MB each.' },
                cropType: { type: 'string', example: 'maize' },
                farmId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
                location: { type: 'string', description: 'JSON string: { "latitude": 0.3, "longitude": 32.5 }' },
                severity: { type: 'string', enum: ['mild', 'moderate', 'severe'] },
                symptoms: { type: 'string', description: 'Free-text description of observed symptoms.' },
                affectedArea: { type: 'number', description: 'Estimated affected area in hectares.' },
              },
            },
            encoding: { images: { contentType: 'image/jpeg, image/png, image/webp, image/heic' } },
          },
        },
      },
      responses: {
        201: { description: 'Detection report created. AI analysis results returned.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/PestDiseaseReport' } } }] } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  // ── Reports ───────────────────────────────────────────────────────────────────

  '/api/v1/pest-disease/reports/{reportId}': {
    get: {
      tags: ['Pest & Disease'],
      summary: 'Get detection report by ID',
      operationId: 'getPestDiseaseReport',
      security: auth,
      parameters: [reportIdParam],
      responses: {
        200: { description: 'Report details including AI diagnosis, confidence, and expert review if available.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/PestDiseaseReport' } } }] } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Pest & Disease'],
      summary: 'Update pest/disease report fields',
      operationId: 'updatePestDiseaseReport',
      security: auth,
      parameters: [reportIdParam],
      requestBody: r({
        type: 'object',
        properties: {
          farmerNotes: { type: 'string' },
          actionTaken: { type: 'string' },
          assignmentNotes: { type: 'string' },
          reportStatus: { type: 'string', enum: ['pending', 'processing', 'completed', 'expert_review', 'confirmed', 'rejected', 'archived'] },
          outcome: {
            type: 'object',
            properties: {
              isResolved: { type: 'boolean' },
              effectiveness: { type: 'string', enum: ['poor', 'fair', 'good', 'excellent'] },
              notes: { type: 'string' },
            },
          },
        },
      }),
      responses: {
        200: { description: 'Report updated.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    delete: {
      tags: ['Pest & Disease'],
      summary: 'Soft delete a pest/disease report',
      operationId: 'deletePestDiseaseReport',
      security: auth,
      parameters: [reportIdParam],
      responses: {
        200: { description: 'Report deleted.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/pest-disease/farmers/{farmerId}/reports': {
    get: {
      tags: ['Pest & Disease'],
      summary: 'List pest/disease reports for a specific farmer',
      operationId: 'getFarmerReports',
      security: auth,
      parameters: [
        farmerIdParam, pageParam, limitParam,
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'processing', 'completed', 'expert_review', 'confirmed', 'rejected', 'archived', 'created', 'assigned', 'resolved', 'closed'] } },
        { name: 'cropType', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Farmer detection reports.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
    post: {
      tags: ['Pest & Disease'],
      summary: 'Create pest/disease report via JSON payload',
      operationId: 'createPestDiseaseReportJson',
      security: auth,
      parameters: [farmerIdParam],
      requestBody: r({
        type: 'object',
        required: ['farmId', 'fieldContext'],
        properties: {
          farmId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          fieldContext: {
            type: 'object',
            required: ['cropType'],
            properties: {
              cropType: { type: 'string' },
              growthStage: { type: 'string', enum: ['germination', 'seedling', 'vegetative', 'flowering', 'fruiting', 'maturity', 'harvest', 'post_harvest'] },
              longitude: { type: 'number' },
              latitude: { type: 'number' },
            },
          },
          farmerNotes: { type: 'string' },
          actionTaken: { type: 'string' },
        },
      }),
      responses: {
        201: { description: 'JSON report created.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/pest-disease/reports/{reportId}/review': {
    post: {
      tags: ['Pest & Disease'],
      summary: 'Submit expert review for a detection report',
      description: 'Extension officers, agronomists, and admins can submit or override the AI diagnosis with an expert opinion.',
      operationId: 'submitExpertReview',
      security: auth,
      parameters: [reportIdParam],
      requestBody: r({
        type: 'object',
        required: ['diagnosis', 'confidence', 'recommendations'],
        properties: {
          diagnosis: { type: 'string', description: 'Expert-confirmed pest/disease identification.' },
          confidence: { type: 'number', minimum: 0, maximum: 1, example: 0.95 },
          recommendations: { type: 'array', items: { type: 'string' }, description: 'Actionable treatment steps.' },
          treatmentPlan: { type: 'string' },
          preventionMeasures: { type: 'array', items: { type: 'string' } },
          followUpRequired: { type: 'boolean' },
          notes: { type: 'string' },
        },
      }),
      responses: {
        200: { description: 'Expert review submitted.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/pest-disease/reports/{reportId}/feedback': {
    post: {
      tags: ['Pest & Disease'],
      summary: 'Submit farmer feedback on detection accuracy',
      description: 'Farmers can rate the accuracy of a diagnosis to improve AI model quality.',
      operationId: 'submitDetectionFeedback',
      security: auth,
      parameters: [reportIdParam],
      requestBody: r({
        type: 'object',
        required: ['accuracyRating'],
        properties: {
          accuracyRating: { type: 'integer', minimum: 1, maximum: 5, description: '1 = very inaccurate, 5 = very accurate.' },
          isCorrect: { type: 'boolean' },
          actualPestDisease: { type: 'string', description: 'What the farmer believes the actual issue was (if differs from diagnosis).' },
          comments: { type: 'string' },
          treatmentEffective: { type: 'boolean' },
        },
      }),
      responses: {
        200: { description: 'Feedback submitted. Used to improve AI model accuracy.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/pest-disease/reports/{reportId}/assign': {
    post: {
      tags: ['Pest & Disease'],
      summary: 'Assign pest/disease report',
      operationId: 'assignPestDiseaseReport',
      security: auth,
      parameters: [reportIdParam],
      requestBody: r({
        type: 'object',
        properties: {
          assigneeId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          notes: { type: 'string' },
        },
      }),
      responses: {
        200: { description: 'Report assigned.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/pest-disease/reports/{reportId}/close': {
    post: {
      tags: ['Pest & Disease'],
      summary: 'Close pest/disease report',
      operationId: 'closePestDiseaseReport',
      security: auth,
      parameters: [reportIdParam],
      requestBody: r({
        type: 'object',
        properties: {
          reason: { type: 'string' },
          resolutionNotes: { type: 'string' },
        },
      }),
      responses: {
        200: { description: 'Report closed.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  // ── Outbreaks ─────────────────────────────────────────────────────────────────

  '/api/v1/pest-disease/outbreaks': {
    get: {
      tags: ['Pest & Disease'],
      summary: 'Get active pest/disease outbreak map',
      description: 'Returns clusters of confirmed detections that qualify as outbreaks.',
      operationId: 'getActiveOutbreaks',
      security: auth,
      parameters: [
        { name: 'pestType', in: 'query', schema: { type: 'string' } },
        { name: 'region', in: 'query', schema: { type: 'string' } },
        { name: 'severity', in: 'query', schema: { type: 'string', enum: ['mild', 'moderate', 'severe'] } },
        { name: 'cropType', in: 'query', schema: { type: 'string' } },
        pageParam, limitParam,
      ],
      responses: { 200: { description: 'Active outbreaks with geographic data.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/pest-disease/outbreaks/hotspots': {
    get: {
      tags: ['Pest & Disease'],
      summary: 'Identify outbreak hotspots (clustering analysis)',
      description: 'Geographic clustering of detection reports to identify high-risk zones. Requires `extension_officer`, `agronomist`, or `platform_admin` role.',
      operationId: 'getOutbreakHotspots',
      security: auth,
      parameters: [
        { name: 'radius', in: 'query', schema: { type: 'number' }, description: 'Clustering radius in km.' },
        { name: 'minCases', in: 'query', schema: { type: 'integer' }, description: 'Minimum reports to qualify as a hotspot.' },
        { name: 'pestType', in: 'query', schema: { type: 'string' } },
        { name: 'days', in: 'query', schema: { type: 'integer', default: 30 } },
      ],
      responses: { 200: { description: 'Hotspot clusters with centroid coordinates and case counts.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  // ── Analytics ─────────────────────────────────────────────────────────────────

  '/api/v1/pest-disease/analytics/trends': {
    get: {
      tags: ['Pest & Disease'],
      summary: 'Pest/disease trend analysis',
      description: 'Compares current vs previous period detection rates, confidence trends, and top pests. Requires `extension_officer`, `agronomist`, or `platform_admin` role.',
      operationId: 'getPestDiseaseTrends',
      security: auth,
      parameters: [
        { name: 'days', in: 'query', schema: { type: 'integer', default: 30 }, description: 'Analysis window in days.' },
        { name: 'compareWindow', in: 'query', schema: { type: 'integer', default: 30 }, description: 'Comparison period in days.' },
        { name: 'region', in: 'query', schema: { type: 'string' } },
        { name: 'cropType', in: 'query', schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Trend data comparing current and previous periods.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/pest-disease/analytics/dashboard': {
    get: {
      tags: ['Pest & Disease'],
      summary: 'Comprehensive pest/disease analytics dashboard',
      description: 'High-level dashboard with KPIs, breakdown by crop, region, and AI performance metrics.',
      operationId: 'getPestDiseaseDashboard',
      security: auth,
      parameters: [
        { name: 'days', in: 'query', schema: { type: 'integer', default: 30 } },
        { name: 'region', in: 'query', schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Dashboard analytics.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  // ── Treatment Knowledge Base ───────────────────────────────────────────────────

  '/api/v1/pest-disease/treatments/search': {
    get: {
      tags: ['Pest & Disease'],
      summary: 'Search the treatment knowledge base',
      operationId: 'searchTreatments',
      security: auth,
      parameters: [
        { name: 'pestType', in: 'query', schema: { type: 'string' } },
        { name: 'cropType', in: 'query', schema: { type: 'string' } },
        { name: 'treatmentType', in: 'query', schema: { type: 'string', enum: ['organic', 'chemical', 'biological', 'cultural'] } },
        { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Free-text keyword search.' },
        pageParam, limitParam,
      ],
      responses: { 200: { description: 'Matching treatment entries.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/pest-disease/treatments': {
    post: {
      tags: ['Pest & Disease'],
      summary: 'Create treatment knowledge entry',
      description: 'Requires `agronomist` or `platform_admin` role.',
      operationId: 'createTreatmentKnowledge',
      security: auth,
      requestBody: r({
        type: 'object',
        required: ['pestDiseaseName', 'cropTypes', 'treatments'],
        properties: {
          pestDiseaseName: { type: 'string', example: 'Maize Lethal Necrosis' },
          cropTypes: { type: 'array', items: { type: 'string' }, example: ['maize'] },
          symptoms: { type: 'array', items: { type: 'string' } },
          treatments: { type: 'array', items: { type: 'object', required: ['name', 'type'], properties: { name: { type: 'string' }, type: { type: 'string', enum: ['organic', 'chemical', 'biological', 'cultural'] }, instructions: { type: 'string' }, dosage: { type: 'string' }, effectiveness: { type: 'number', minimum: 0, maximum: 1 } } } },
          preventionMeasures: { type: 'array', items: { type: 'string' } },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          references: { type: 'array', items: { type: 'string', format: 'uri' } },
        },
      }),
      responses: {
        201: { description: 'Treatment knowledge entry created.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
};
