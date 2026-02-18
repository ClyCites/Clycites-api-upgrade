
const auth = [{ BearerAuth: [] }];
const r = (schema: object) => ({ required: true, content: { 'application/json': { schema } } });
const idParam = { $ref: '#/components/parameters/mongoIdPath' };
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };
const daysParam = { $ref: '#/components/parameters/daysParam' };

export const analyticsPaths: Record<string, unknown> = {

  // ── Market Analytics (public) ───────────────────────────────────────────────

  '/api/v1/analytics/overview': {
    get: {
      tags: ['Analytics'],
      summary: 'Market overview',
      description: 'High-level platform statistics. No authentication required.',
      operationId: 'analyticsMarketOverview',
      responses: { 200: { description: 'Market overview.' } },
    },
  },

  '/api/v1/analytics/price-trends': {
    get: {
      tags: ['Analytics'],
      summary: 'Price trends',
      operationId: 'analyticsPriceTrends',
      parameters: [daysParam, { name: 'product', in: 'query', schema: { type: 'string' } }, { name: 'region', in: 'query', schema: { type: 'string' } }],
      responses: { 200: { description: 'Price trend series.' } },
    },
  },

  '/api/v1/analytics/demand': {
    get: {
      tags: ['Analytics'],
      summary: 'Product demand analysis',
      operationId: 'analyticsProductDemand',
      parameters: [daysParam, { name: 'category', in: 'query', schema: { type: 'string' } }, { name: 'region', in: 'query', schema: { type: 'string' } }],
      responses: { 200: { description: 'Demand data.' } },
    },
  },

  '/api/v1/analytics/supply': {
    get: {
      tags: ['Analytics'],
      summary: 'Supply analysis',
      operationId: 'analyticsSupply',
      parameters: [{ name: 'category', in: 'query', schema: { type: 'string' } }, { name: 'region', in: 'query', schema: { type: 'string' } }],
      responses: { 200: { description: 'Supply data.' } },
    },
  },

  '/api/v1/analytics/regional': {
    get: {
      tags: ['Analytics'],
      summary: 'Regional market analysis',
      operationId: 'analyticsRegional',
      responses: { 200: { description: 'Regional breakdown.' } },
    },
  },

  '/api/v1/analytics/market-health': {
    get: {
      tags: ['Analytics'],
      summary: 'Market health score',
      operationId: 'analyticsMarketHealth',
      responses: { 200: { description: 'Health metrics including fulfillment rate and return buyer rate.' } },
    },
  },

  // ── Semantic Query Engine ────────────────────────────────────────────────────

  '/api/v1/analytics/datasets': {
    get: {
      tags: ['Analytics', 'Custom Charts'],
      summary: 'List accessible datasets',
      description: 'Returns the curated dataset registry filtered by the caller\'s access scope.',
      operationId: 'analyticsListDatasets',
      security: auth,
      responses: { 200: { description: 'Dataset definitions.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  // ── Custom Charts ────────────────────────────────────────────────────────────

  '/api/v1/analytics/charts/preview': {
    post: {
      tags: ['Analytics', 'Custom Charts'],
      summary: 'Preview chart query',
      description: 'Execute a chart definition without saving it. Returns up to 50 rows.',
      operationId: 'analyticsPreviewChart',
      security: auth,
      requestBody: r({ $ref: '#/components/schemas/ChartDefinition' }),
      responses: {
        200: { description: 'Query result preview.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/QueryResult' } } }] } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/analytics/charts/preview/export': {
    post: {
      tags: ['Analytics', 'Custom Charts'],
      summary: 'Export preview result',
      description: 'Execute a chart definition and stream the result as CSV or JSON.',
      operationId: 'analyticsPreviewExport',
      security: auth,
      requestBody: r({ type: 'object', required: ['definition'], properties: { definition: { $ref: '#/components/schemas/ChartDefinition' }, format: { type: 'string', enum: ['csv', 'json'], default: 'csv' }, filename: { type: 'string' } } }),
      responses: {
        200: { description: 'File stream.', content: { 'text/csv': {}, 'application/json': {} } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/analytics/charts': {
    get: {
      tags: ['Analytics', 'Custom Charts'],
      summary: 'List saved charts',
      operationId: 'analyticsListCharts',
      security: auth,
      parameters: [pageParam, limitParam, { name: 'dataset', in: 'query', schema: { type: 'string' } }, { name: 'tags', in: 'query', schema: { type: 'string' }, description: 'Comma-separated tag filter.' }],
      responses: { 200: { description: 'Charts with pagination.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
    post: {
      tags: ['Analytics', 'Custom Charts'],
      summary: 'Save chart',
      operationId: 'analyticsCreateChart',
      security: auth,
      requestBody: r({ type: 'object', required: ['name', 'definition'], properties: { name: { type: 'string' }, description: { type: 'string' }, definition: { $ref: '#/components/schemas/ChartDefinition' }, tags: { type: 'array', items: { type: 'string' } }, shareScope: { type: 'string', enum: ['owner_only', 'org_members', 'specific_roles', 'specific_users', 'public'] } } }),
      responses: { 201: { description: 'Chart saved.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Chart' } } }] } } } }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/analytics/charts/{id}': {
    get: {
      tags: ['Analytics', 'Custom Charts'],
      summary: 'Get chart by ID',
      operationId: 'analyticsGetChart',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Chart definition.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Chart' } } }] } } } }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    put: {
      tags: ['Analytics', 'Custom Charts'],
      summary: 'Update chart (creates new version)',
      operationId: 'analyticsUpdateChart',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, definition: { $ref: '#/components/schemas/ChartDefinition' }, shareScope: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } } }),
      responses: { 200: { description: 'Updated.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    delete: {
      tags: ['Analytics', 'Custom Charts'],
      summary: 'Delete chart',
      operationId: 'analyticsDeleteChart',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Deleted.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/analytics/charts/{id}/export': {
    post: {
      tags: ['Analytics', 'Custom Charts'],
      summary: 'Export chart data',
      description: 'Run the saved chart query and download result as CSV or JSON.',
      operationId: 'analyticsExportChart',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { format: { type: 'string', enum: ['csv', 'json'], default: 'csv' }, filename: { type: 'string' } } }),
      responses: { 200: { description: 'File stream.', content: { 'text/csv': {}, 'application/json': {} } }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  // ── Dashboards ────────────────────────────────────────────────────────────────

  '/api/v1/analytics/dashboards/templates': {
    get: {
      tags: ['Analytics', 'Dashboards'],
      summary: 'List dashboard templates',
      operationId: 'analyticsDashboardTemplates',
      parameters: [{ name: 'category', in: 'query', schema: { type: 'string' } }],
      responses: { 200: { description: 'Templates.' } },
    },
  },

  '/api/v1/analytics/dashboards': {
    get: {
      tags: ['Analytics', 'Dashboards'],
      summary: 'List my dashboards',
      operationId: 'analyticsListDashboards',
      security: auth,
      parameters: [pageParam, limitParam],
      responses: { 200: { description: 'Dashboards.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
    post: {
      tags: ['Analytics', 'Dashboards'],
      summary: 'Create dashboard',
      operationId: 'analyticsCreateDashboard',
      security: auth,
      requestBody: r({ type: 'object', required: ['name'], properties: { name: { type: 'string' }, description: { type: 'string' }, shareScope: { type: 'string', enum: ['owner_only', 'org_members', 'specific_roles', 'specific_users', 'public'] }, tags: { type: 'array', items: { type: 'string' } }, isDefault: { type: 'boolean' } } }),
      responses: { 201: { description: 'Dashboard created.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Dashboard' } } }] } } } }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/analytics/dashboards/{id}': {
    get: {
      tags: ['Analytics', 'Dashboards'],
      summary: 'Get dashboard',
      operationId: 'analyticsGetDashboard',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Dashboard with populated charts.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Dashboard' } } }] } } } }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    delete: {
      tags: ['Analytics', 'Dashboards'],
      summary: 'Delete dashboard',
      operationId: 'analyticsDeleteDashboard',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Deleted.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/analytics/dashboards/{id}/charts': {
    post: {
      tags: ['Analytics', 'Dashboards'],
      summary: 'Add chart to dashboard',
      operationId: 'analyticsDashboardAddChart',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['chartId', 'position', 'size'], properties: { chartId: { type: 'string', pattern: '^[a-f0-9]{24}$' }, position: { type: 'object', properties: { col: { type: 'integer', minimum: 0, maximum: 11 }, row: { type: 'integer', minimum: 0 } } }, size: { type: 'object', properties: { w: { type: 'integer', minimum: 1, maximum: 12 }, h: { type: 'integer', minimum: 1 } } } } }),
      responses: { 200: { description: 'Chart added.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/analytics/dashboards/{id}/charts/{chartId}': {
    delete: {
      tags: ['Analytics', 'Dashboards'],
      summary: 'Remove chart from dashboard',
      operationId: 'analyticsDashboardRemoveChart',
      security: auth,
      parameters: [idParam, { name: 'chartId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      responses: { 200: { description: 'Removed.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/analytics/dashboards/{id}/sharing': {
    patch: {
      tags: ['Analytics', 'Dashboards'],
      summary: 'Update dashboard sharing',
      operationId: 'analyticsDashboardUpdateSharing',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['scope'], properties: { scope: { type: 'string', enum: ['owner_only', 'org_members', 'specific_roles', 'specific_users', 'public'] }, roles: { type: 'array', items: { type: 'string' } }, userIds: { type: 'array', items: { type: 'string', pattern: '^[a-f0-9]{24}$' } } } }),
      responses: { 200: { description: 'Sharing updated.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  // ── Domain Dashboards ─────────────────────────────────────────────────────────

  '/api/v1/analytics/farmer/dashboard': {
    get: {
      tags: ['Analytics', 'Dashboards'],
      summary: 'Farmer performance dashboard',
      description: 'Returns pre-aggregated KPIs for the authenticated farmer.',
      operationId: 'analyticsFarmerDashboard',
      security: auth,
      parameters: [daysParam],
      responses: { 200: { description: 'Farmer dashboard data.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/analytics/org/dashboard': {
    get: {
      tags: ['Analytics', 'Dashboards'],
      summary: 'Organization dashboard',
      description: 'Aggregated KPIs for an organization/cooperative (org_admin or admin).',
      operationId: 'analyticsOrgDashboard',
      security: auth,
      parameters: [daysParam, { name: 'orgId', in: 'query', schema: { type: 'string' } }],
      responses: { 200: { description: 'Org dashboard data.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/analytics/admin/dashboard': {
    get: {
      tags: ['Analytics', 'Dashboards'],
      summary: 'Platform admin dashboard',
      description: 'Platform-wide health and adoption metrics. Requires `admin` or `platform_admin` role.',
      operationId: 'analyticsAdminDashboard',
      security: auth,
      responses: { 200: { description: 'Admin dashboard data.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/analytics/my-performance': {
    get: {
      tags: ['Analytics'],
      summary: 'My performance metrics',
      description: 'Farmer-role performance stats for the authenticated user.',
      operationId: 'analyticsMyPerformance',
      security: auth,
      parameters: [daysParam],
      responses: { 200: { description: 'Performance data.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },
};
