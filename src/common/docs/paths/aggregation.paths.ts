const auth = [{ BearerAuth: [] }];
const r = (schema: object) => ({ required: true, content: { 'application/json': { schema } } });
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };

const warehouseIdParam = {
  name: 'warehouseId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};

const binIdParam = {
  name: 'binId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};

const batchIdParam = {
  name: 'batchId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};

const gradeIdParam = {
  name: 'gradeId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};

const movementIdParam = {
  name: 'movementId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};

const reportIdParam = {
  name: 'reportId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};

export const aggregationPaths: Record<string, unknown> = {
  '/api/v1/aggregation/warehouses/{warehouseId}/bins': {
    get: {
      tags: ['Aggregation'],
      summary: 'List storage bins for a warehouse',
      operationId: 'listAggregationStorageBins',
      security: auth,
      parameters: [
        warehouseIdParam,
        pageParam,
        limitParam,
        { name: 'organizationId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['available', 'occupied', 'maintenance'] } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Storage bins retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
    post: {
      tags: ['Aggregation'],
      summary: 'Create storage bin under a warehouse',
      operationId: 'createAggregationStorageBin',
      security: auth,
      parameters: [warehouseIdParam],
      requestBody: r({
        type: 'object',
        required: ['name', 'capacity'],
        properties: {
          organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          name: { type: 'string' },
          capacity: { type: 'number', minimum: 0 },
          capacityUnit: { type: 'string', enum: ['kg', 'tons', 'bags', 'liters', 'units'] },
          temperatureControl: { type: 'boolean' },
          currentLoad: { type: 'number', minimum: 0 },
          status: { type: 'string', enum: ['available', 'occupied', 'maintenance'] },
          notes: { type: 'string' },
        },
      }),
      responses: {
        201: { description: 'Storage bin created.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/aggregation/bins/{binId}': {
    get: {
      tags: ['Aggregation'],
      summary: 'Get storage bin by ID',
      operationId: 'getAggregationStorageBin',
      security: auth,
      parameters: [binIdParam],
      responses: {
        200: { description: 'Storage bin retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Aggregation'],
      summary: 'Update storage bin',
      operationId: 'updateAggregationStorageBin',
      security: auth,
      parameters: [binIdParam],
      requestBody: r({
        type: 'object',
        properties: {
          name: { type: 'string' },
          capacity: { type: 'number', minimum: 0 },
          capacityUnit: { type: 'string', enum: ['kg', 'tons', 'bags', 'liters', 'units'] },
          temperatureControl: { type: 'boolean' },
          currentLoad: { type: 'number', minimum: 0 },
          status: { type: 'string', enum: ['available', 'occupied', 'maintenance'] },
          notes: { type: 'string' },
        },
      }),
      responses: {
        200: { description: 'Storage bin updated.' },
        400: { $ref: '#/components/responses/ValidationError' },
      },
    },
    delete: {
      tags: ['Aggregation'],
      summary: 'Soft delete storage bin',
      operationId: 'deleteAggregationStorageBin',
      security: auth,
      parameters: [binIdParam],
      responses: {
        200: { description: 'Storage bin deleted.' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/aggregation/batches': {
    get: {
      tags: ['Aggregation'],
      summary: 'List aggregation batches',
      operationId: 'listAggregationBatches',
      security: auth,
      parameters: [
        pageParam,
        limitParam,
        { name: 'organizationId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['received', 'stored', 'dispatched', 'closed'] } },
        { name: 'commodity', in: 'query', schema: { type: 'string' } },
        { name: 'warehouseId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'binId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
      ],
      responses: {
        200: { description: 'Batches retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    post: {
      tags: ['Aggregation'],
      summary: 'Create aggregation batch',
      operationId: 'createAggregationBatch',
      security: auth,
      requestBody: r({
        type: 'object',
        required: ['commodity', 'quantity', 'unit', 'warehouseId'],
        properties: {
          organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          commodity: { type: 'string' },
          quantity: { type: 'number', minimum: 0 },
          unit: { type: 'string', enum: ['kg', 'tons', 'bags', 'liters', 'units'] },
          grade: { type: 'string' },
          warehouseId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          binId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          receivedAt: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['received', 'stored', 'dispatched', 'closed'] },
          notes: { type: 'string' },
        },
      }),
      responses: {
        201: { description: 'Batch created.' },
        400: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },

  '/api/v1/aggregation/batches/{batchId}': {
    get: {
      tags: ['Aggregation'],
      summary: 'Get aggregation batch by ID',
      operationId: 'getAggregationBatch',
      security: auth,
      parameters: [batchIdParam],
      responses: {
        200: { description: 'Batch retrieved.' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Aggregation'],
      summary: 'Update aggregation batch',
      operationId: 'updateAggregationBatch',
      security: auth,
      parameters: [batchIdParam],
      requestBody: r({
        type: 'object',
        properties: {
          commodity: { type: 'string' },
          quantity: { type: 'number', minimum: 0 },
          unit: { type: 'string', enum: ['kg', 'tons', 'bags', 'liters', 'units'] },
          grade: { type: 'string' },
          warehouseId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          binId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          receivedAt: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['received', 'stored', 'dispatched', 'closed'] },
          notes: { type: 'string' },
        },
      }),
      responses: {
        200: { description: 'Batch updated.' },
        400: { $ref: '#/components/responses/ValidationError' },
      },
    },
    delete: {
      tags: ['Aggregation'],
      summary: 'Soft delete aggregation batch',
      operationId: 'deleteAggregationBatch',
      security: auth,
      parameters: [batchIdParam],
      responses: { 200: { description: 'Batch deleted.' } },
    },
  },

  '/api/v1/aggregation/quality-grades': {
    get: {
      tags: ['Aggregation'],
      summary: 'List quality grades',
      operationId: 'listAggregationQualityGrades',
      security: auth,
      parameters: [
        pageParam,
        limitParam,
        { name: 'organizationId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'batchId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'verified', 'final'] } },
        { name: 'grade', in: 'query', schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Quality grades retrieved.' } },
    },
    post: {
      tags: ['Aggregation'],
      summary: 'Create quality grade',
      operationId: 'createAggregationQualityGrade',
      security: auth,
      requestBody: r({
        type: 'object',
        required: ['batchId', 'grade'],
        properties: {
          organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          batchId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          grade: { type: 'string' },
          notes: { type: 'string' },
          assessedBy: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          assessedAt: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['draft', 'verified', 'final'] },
        },
      }),
      responses: { 201: { description: 'Quality grade created.' } },
    },
  },

  '/api/v1/aggregation/quality-grades/{gradeId}': {
    get: {
      tags: ['Aggregation'],
      summary: 'Get quality grade by ID',
      operationId: 'getAggregationQualityGrade',
      security: auth,
      parameters: [gradeIdParam],
      responses: { 200: { description: 'Quality grade retrieved.' } },
    },
    patch: {
      tags: ['Aggregation'],
      summary: 'Update quality grade',
      operationId: 'updateAggregationQualityGrade',
      security: auth,
      parameters: [gradeIdParam],
      requestBody: r({
        type: 'object',
        properties: {
          batchId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          grade: { type: 'string' },
          notes: { type: 'string' },
          assessedBy: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          assessedAt: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['draft', 'verified', 'final'] },
        },
      }),
      responses: { 200: { description: 'Quality grade updated.' } },
    },
    delete: {
      tags: ['Aggregation'],
      summary: 'Soft delete quality grade',
      operationId: 'deleteAggregationQualityGrade',
      security: auth,
      parameters: [gradeIdParam],
      responses: { 200: { description: 'Quality grade deleted.' } },
    },
  },

  '/api/v1/aggregation/stock-movements/{movementId}': {
    get: {
      tags: ['Aggregation'],
      summary: 'Get stock movement projection by shipment ID',
      operationId: 'getAggregationStockMovement',
      security: auth,
      parameters: [movementIdParam],
      responses: { 200: { description: 'Stock movement retrieved.' } },
    },
    patch: {
      tags: ['Aggregation'],
      summary: 'Update stock movement projection status/metadata',
      description: 'Allowed transitions: draft -> confirmed|rejected, confirmed -> completed|rejected.',
      operationId: 'updateAggregationStockMovement',
      security: auth,
      parameters: [movementIdParam],
      requestBody: r({
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['draft', 'confirmed', 'completed', 'rejected'] },
          quantity: { type: 'number', minimum: 0 },
          note: { type: 'string' },
          location: { type: 'string' },
        },
      }),
      responses: {
        200: { description: 'Stock movement updated.' },
        400: { $ref: '#/components/responses/ValidationError' },
      },
    },
    delete: {
      tags: ['Aggregation'],
      summary: 'Soft delete stock movement projection',
      operationId: 'deleteAggregationStockMovement',
      security: auth,
      parameters: [movementIdParam],
      responses: { 200: { description: 'Stock movement deleted.' } },
    },
  },

  '/api/v1/aggregation/spoilage-reports': {
    get: {
      tags: ['Aggregation'],
      summary: 'List spoilage reports',
      operationId: 'listAggregationSpoilageReports',
      security: auth,
      parameters: [
        pageParam,
        limitParam,
        { name: 'organizationId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'batchId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['reported', 'approved', 'closed'] } },
      ],
      responses: { 200: { description: 'Spoilage reports retrieved.' } },
    },
    post: {
      tags: ['Aggregation'],
      summary: 'Create spoilage report',
      operationId: 'createAggregationSpoilageReport',
      security: auth,
      requestBody: r({
        type: 'object',
        required: ['batchId', 'quantity', 'unit', 'cause'],
        properties: {
          organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          batchId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          quantity: { type: 'number', minimum: 0 },
          unit: { type: 'string', enum: ['kg', 'tons', 'bags', 'liters', 'units'] },
          cause: { type: 'string' },
          reportedAt: { type: 'string', format: 'date-time' },
          reportedBy: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          status: { type: 'string', enum: ['reported', 'approved', 'closed'] },
          notes: { type: 'string' },
        },
      }),
      responses: { 201: { description: 'Spoilage report created.' } },
    },
  },

  '/api/v1/aggregation/spoilage-reports/{reportId}': {
    get: {
      tags: ['Aggregation'],
      summary: 'Get spoilage report by ID',
      operationId: 'getAggregationSpoilageReport',
      security: auth,
      parameters: [reportIdParam],
      responses: { 200: { description: 'Spoilage report retrieved.' } },
    },
    patch: {
      tags: ['Aggregation'],
      summary: 'Update spoilage report',
      description: 'Allowed transitions: reported -> approved|closed, approved -> closed.',
      operationId: 'updateAggregationSpoilageReport',
      security: auth,
      parameters: [reportIdParam],
      requestBody: r({
        type: 'object',
        properties: {
          batchId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          quantity: { type: 'number', minimum: 0 },
          unit: { type: 'string', enum: ['kg', 'tons', 'bags', 'liters', 'units'] },
          cause: { type: 'string' },
          reportedAt: { type: 'string', format: 'date-time' },
          reportedBy: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          status: { type: 'string', enum: ['reported', 'approved', 'closed'] },
          notes: { type: 'string' },
        },
      }),
      responses: {
        200: { description: 'Spoilage report updated.' },
        400: { $ref: '#/components/responses/ValidationError' },
      },
    },
    delete: {
      tags: ['Aggregation'],
      summary: 'Soft delete spoilage report',
      operationId: 'deleteAggregationSpoilageReport',
      security: auth,
      parameters: [reportIdParam],
      responses: { 200: { description: 'Spoilage report deleted.' } },
    },
  },
};
