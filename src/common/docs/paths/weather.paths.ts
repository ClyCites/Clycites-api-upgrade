const auth = [{ BearerAuth: [] }];
const r = (s: object) => ({ required: true, content: { 'application/json': { schema: s } } });
const idParam = { $ref: '#/components/parameters/mongoIdPath' };
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };
const profileIdParam = { name: 'profileId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } };

export const weatherPaths: Record<string, unknown> = {

  // ── Farm Weather Profiles ─────────────────────────────────────────────────────

  '/api/v1/weather/profiles': {
    post: {
      tags: ['Weather'],
      summary: 'Create weather profile for a farm',
      operationId: 'createWeatherProfile',
      security: auth,
      requestBody: r({ type: 'object', required: ['farmId', 'name', 'location'], properties: { farmId: { type: 'string', pattern: '^[a-f0-9]{24}$' }, name: { type: 'string' }, location: { type: 'object', required: ['latitude', 'longitude'], properties: { latitude: { type: 'number' }, longitude: { type: 'number' }, altitude: { type: 'number' } } }, timezone: { type: 'string', example: 'Africa/Kampala' }, cropTypes: { type: 'array', items: { type: 'string' } } } }),
      responses: { 201: { description: 'Weather profile created.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/weather/profiles/me': {
    get: {
      tags: ['Weather'],
      summary: 'List my weather profiles',
      operationId: 'getMyWeatherProfiles',
      security: auth,
      parameters: [pageParam, limitParam],
      responses: { 200: { description: 'My profiles.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/weather/profiles/{id}': {
    get: {
      tags: ['Weather'],
      summary: 'Get weather profile by ID',
      operationId: 'getWeatherProfile',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Profile details.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Weather'],
      summary: 'Update weather profile',
      operationId: 'updateWeatherProfile',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { name: { type: 'string' }, cropTypes: { type: 'array', items: { type: 'string' } }, timezone: { type: 'string' } } }),
      responses: { 200: { description: 'Updated.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
    delete: {
      tags: ['Weather'],
      summary: 'Delete weather profile',
      operationId: 'deleteWeatherProfile',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Deleted (soft).' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  // ── Conditions / Snapshots ────────────────────────────────────────────────────

  '/api/v1/weather/profiles/{profileId}/conditions': {
    get: {
      tags: ['Weather'],
      summary: 'Get current conditions for a farm profile',
      operationId: 'getCurrentConditions',
      security: auth,
      parameters: [profileIdParam],
      responses: { 200: { description: 'Latest weather snapshot.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  '/api/v1/weather/profiles/{profileId}/conditions/history': {
    get: {
      tags: ['Weather'],
      summary: 'Get conditions history for a farm profile',
      operationId: 'getConditionsHistory',
      security: auth,
      parameters: [profileIdParam, pageParam, limitParam, { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } }],
      responses: { 200: { description: 'Paginated snapshot history.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  // ── Forecasts ─────────────────────────────────────────────────────────────────

  '/api/v1/weather/profiles/{profileId}/forecast': {
    get: {
      tags: ['Weather'],
      summary: 'Get latest forecast for a farm profile',
      operationId: 'getLatestForecast',
      security: auth,
      parameters: [profileIdParam, { name: 'horizon', in: 'query', schema: { type: 'string', enum: ['hourly', 'daily', 'weekly'] } }],
      responses: { 200: { description: 'Forecast data.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/weather/profiles/{profileId}/forecast/summary': {
    get: {
      tags: ['Weather'],
      summary: 'Get forecast summary (today / tomorrow / week)',
      operationId: 'getForecastSummary',
      security: auth,
      parameters: [profileIdParam],
      responses: { 200: { description: 'Summary forecast.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/weather/profiles/{profileId}/forecast/risk': {
    get: {
      tags: ['Weather'],
      summary: 'Get agricultural risk forecast breakdown',
      operationId: 'getRiskForecast',
      security: auth,
      parameters: [profileIdParam, { name: 'horizon', in: 'query', schema: { type: 'string', enum: ['hourly', 'daily', 'weekly'] } }],
      responses: { 200: { description: 'Risk breakdown by type (drought, frost, flood, pest).' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/weather/profiles/{profileId}/forecast/accuracy': {
    get: {
      tags: ['Weather'],
      summary: 'Compare forecast accuracy vs actuals',
      operationId: 'compareForecastVsActual',
      security: auth,
      parameters: [profileIdParam, { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } }],
      responses: { 200: { description: 'Forecast accuracy metrics.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/weather/profiles/{profileId}/dashboard': {
    get: {
      tags: ['Weather'],
      summary: 'Combined weather dashboard for a farm',
      description: 'Returns current conditions, latest forecast, active alerts, and risk scores in a single call.',
      operationId: 'getWeatherDashboard',
      security: auth,
      parameters: [profileIdParam],
      responses: { 200: { description: 'Dashboard data.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  // ── Alerts ────────────────────────────────────────────────────────────────────

  '/api/v1/weather/profiles/{profileId}/alerts': {
    get: {
      tags: ['Weather', 'Alerts'],
      summary: 'List alerts for a farm profile',
      operationId: 'listFarmAlerts',
      security: auth,
      parameters: [profileIdParam, pageParam, limitParam, { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'acknowledged', 'dismissed', 'expired'] } }, { name: 'severity', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] } }],
      responses: { 200: { description: 'Farm alerts.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/weather/alerts/stats': {
    get: {
      tags: ['Weather', 'Alerts'],
      summary: 'Alert statistics by severity and type',
      operationId: 'getAlertStats',
      security: auth,
      responses: { 200: { description: 'Alert counts.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/weather/alerts/{id}': {
    get: {
      tags: ['Weather', 'Alerts'],
      summary: 'Get a single weather alert',
      operationId: 'getWeatherAlert',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Alert details.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  '/api/v1/weather/alerts/{id}/acknowledge': {
    post: {
      tags: ['Weather', 'Alerts'],
      summary: 'Acknowledge a weather alert',
      operationId: 'acknowledgeWeatherAlert',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Alert acknowledged.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/weather/alerts/{id}/dismiss': {
    post: {
      tags: ['Weather', 'Alerts'],
      summary: 'Dismiss a weather alert',
      operationId: 'dismissWeatherAlert',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Alert dismissed.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/weather/alerts/{id}/escalate': {
    post: {
      tags: ['Weather', 'Alerts'],
      summary: 'Escalate a weather alert',
      operationId: 'escalateWeatherAlert',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { reason: { type: 'string' }, severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] } } }),
      responses: { 200: { description: 'Alert escalated.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/weather/org/{orgId}/alerts': {
    get: {
      tags: ['Weather', 'Alerts'],
      summary: 'List all alerts for an organization',
      operationId: 'getOrgAlerts',
      security: auth,
      parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }, pageParam, limitParam],
      responses: { 200: { description: 'Org-wide alerts.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  // ── Alert Rules Engine ────────────────────────────────────────────────────────

  '/api/v1/weather/rules': {
    get: {
      tags: ['Weather'],
      summary: 'List active alert rules',
      operationId: 'listWeatherRules',
      security: auth,
      parameters: [pageParam, limitParam],
      responses: { 200: { description: 'Rules list.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
    post: {
      tags: ['Weather', 'Admin'],
      summary: 'Create alert rule',
      description: '`platform_admin` only.',
      operationId: 'createWeatherRule',
      security: auth,
      requestBody: r({ type: 'object', required: ['name', 'condition', 'severity'], properties: { name: { type: 'string' }, condition: { type: 'object' }, severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }, message: { type: 'string' } } }),
      responses: { 201: { description: 'Rule created.' }, 400: { $ref: '#/components/responses/ValidationError' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/weather/rules/seed': {
    post: {
      tags: ['Weather', 'Admin'],
      summary: 'Seed default alert rules',
      description: 'Seeds the platform default rule set. `platform_admin` only.',
      operationId: 'seedWeatherRules',
      security: auth,
      responses: { 200: { description: 'Default rules seeded.' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/weather/rules/{id}': {
    get: {
      tags: ['Weather'],
      summary: 'Get alert rule by ID',
      operationId: 'getWeatherRule',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Rule details.' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Weather', 'Admin'],
      summary: 'Update alert rule',
      description: '`platform_admin` only.',
      operationId: 'updateWeatherRule',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { name: { type: 'string' }, condition: { type: 'object' }, severity: { type: 'string' }, active: { type: 'boolean' } } }),
      responses: { 200: { description: 'Updated.' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
    delete: {
      tags: ['Weather', 'Admin'],
      summary: 'Delete alert rule',
      description: '`platform_admin` only.',
      operationId: 'deleteWeatherRule',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Deleted (soft).' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  // ── Admin / Ingest ────────────────────────────────────────────────────────────

  '/api/v1/weather/admin/refresh': {
    post: {
      tags: ['Weather', 'Admin'],
      summary: 'Refresh weather data for all profiles',
      operationId: 'adminRefreshAllProfiles',
      security: auth,
      responses: { 200: { description: 'Refresh triggered.' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/weather/admin/profiles/{profileId}/refresh': {
    post: {
      tags: ['Weather', 'Admin'],
      summary: 'Manually refresh a single farm profile',
      operationId: 'adminRefreshProfile',
      security: auth,
      parameters: [profileIdParam],
      responses: { 200: { description: 'Profile refreshed.' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  '/api/v1/weather/admin/retry-deliveries': {
    post: {
      tags: ['Weather', 'Admin'],
      summary: 'Retry failed alert deliveries',
      operationId: 'adminRetryAlertDeliveries',
      security: auth,
      responses: { 200: { description: 'Retry queued.' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/weather/admin/expire-alerts': {
    post: {
      tags: ['Weather', 'Admin'],
      summary: 'Expire old weather alerts',
      operationId: 'adminExpireWeatherAlerts',
      security: auth,
      responses: { 200: { description: 'Expiry job ran.' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/weather/admin/prune-snapshots': {
    post: {
      tags: ['Weather', 'Admin'],
      summary: 'Prune old condition snapshots',
      operationId: 'adminPruneSnapshots',
      security: auth,
      responses: { 200: { description: 'Pruning complete.' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/weather/admin/providers': {
    get: {
      tags: ['Weather', 'Admin'],
      summary: 'Get weather provider health status',
      operationId: 'adminGetProviderStatus',
      security: auth,
      responses: { 200: { description: 'Provider health metrics.' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/weather/admin/simulate': {
    post: {
      tags: ['Weather', 'Admin'],
      summary: 'Simulate weather alert',
      description: 'Creates and dispatches a manual alert simulation for testing workflows.',
      operationId: 'adminSimulateWeatherAlert',
      security: auth,
      requestBody: r({ type: 'object', required: ['farmId', 'farmerId', 'alertType', 'severity', 'advisoryMessage'], properties: { farmId: { type: 'string', pattern: '^[a-f0-9]{24}$' }, farmerId: { type: 'string', pattern: '^[a-f0-9]{24}$' }, organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' }, alertType: { type: 'string' }, severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }, advisoryMessage: { type: 'string' }, recommendedActions: { type: 'array', items: { type: 'string' } }, expiresAt: { type: 'string', format: 'date-time' } } }),
      responses: { 201: { description: 'Simulation alert created.' }, 400: { $ref: '#/components/responses/ValidationError' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },
};
