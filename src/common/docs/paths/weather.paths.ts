const auth = [{ BearerAuth: [] }];
const r = (s: object) => ({ required: true, content: { 'application/json': { schema: s } } });
const idParam = { $ref: '#/components/parameters/mongoIdPath' };
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };
const profileIdParam = { name: 'profileId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } };

export const weatherPaths: Record<string, unknown> = {

  // ── Farm Weather Profiles ─────────────────────────────────────────────────────

  '/api/v1/weather/profiles': {
    get: {
      tags: ['Weather'],
      summary: 'List weather profiles with org-aware scoping',
      operationId: 'listWeatherProfiles',
      security: auth,
      parameters: [
        pageParam,
        limitParam,
        { name: 'organizationId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'farmerId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'farmId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['createdAt', 'updatedAt', 'farmName', 'timezone'] } },
        { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
      ],
      responses: {
        200: { description: 'Profiles retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
    post: {
      tags: ['Weather'],
      summary: 'Create weather profile for a farm',
      operationId: 'createWeatherProfile',
      security: auth,
      requestBody: r({
        type: 'object',
        required: ['farmId', 'lat', 'lng'],
        properties: {
          farmId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          farmName: { type: 'string' },
          lat: { type: 'number', minimum: -90, maximum: 90 },
          lng: { type: 'number', minimum: -180, maximum: 180 },
          altitude: { type: 'number' },
          timezone: { type: 'string', example: 'Africa/Kampala' },
          preferredUnits: { type: 'string', enum: ['metric', 'imperial'] },
          primaryCropTypes: { type: 'array', items: { type: 'string' } },
        },
      }),
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
      requestBody: r({
        type: 'object',
        properties: {
          farmName: { type: 'string' },
          lat: { type: 'number', minimum: -90, maximum: 90 },
          lng: { type: 'number', minimum: -180, maximum: 180 },
          altitude: { type: 'number' },
          timezone: { type: 'string' },
          preferredUnits: { type: 'string', enum: ['metric', 'imperial'] },
          primaryCropTypes: { type: 'array', items: { type: 'string' } },
        },
      }),
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
    post: {
      tags: ['Weather'],
      summary: 'Capture a manual sensor reading for a farm profile',
      operationId: 'createCondition',
      security: auth,
      parameters: [profileIdParam],
      requestBody: r({
        type: 'object',
        required: ['reading'],
        properties: {
          timestamp: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['captured', 'flagged', 'verified'] },
          statusReason: { type: 'string' },
          qualityFlags: { type: 'array', items: { type: 'string' } },
          reading: {
            type: 'object',
            required: ['temperatureCelsius', 'humidity'],
            properties: {
              temperatureCelsius: { type: 'number' },
              humidity: { type: 'number', minimum: 0, maximum: 100 },
              rainfallMm: { type: 'number', minimum: 0 },
              rainfallMmPerHour: { type: 'number', minimum: 0 },
              windSpeedKph: { type: 'number', minimum: 0 },
              windDirectionDeg: { type: 'number', minimum: 0, maximum: 360 },
              uvIndex: { type: 'number', minimum: 0 },
              pressureHPa: { type: 'number' },
            },
          },
        },
      }),
      responses: { 201: { description: 'Sensor reading created.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
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

  '/api/v1/weather/conditions/{readingId}': {
    get: {
      tags: ['Weather'],
      summary: 'Get a single sensor reading by ID',
      operationId: 'getConditionById',
      security: auth,
      parameters: [{ name: 'readingId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      responses: { 200: { description: 'Sensor reading.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Weather'],
      summary: 'Update sensor reading workflow status (flag/verify)',
      operationId: 'updateConditionById',
      security: auth,
      parameters: [{ name: 'readingId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      requestBody: r({
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['captured', 'flagged', 'verified'] },
          statusReason: { type: 'string' },
          qualityFlags: { type: 'array', items: { type: 'string' } },
        },
      }),
      responses: { 200: { description: 'Sensor reading updated.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
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

  '/api/v1/weather/profiles/{profileId}/forecast/refresh': {
    post: {
      tags: ['Weather'],
      summary: 'Refresh forecast for a selected profile',
      operationId: 'refreshProfileForecast',
      security: auth,
      parameters: [profileIdParam],
      responses: {
        200: { description: 'Forecast refresh triggered.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/weather/profiles/{profileId}/forecast/history': {
    get: {
      tags: ['Weather'],
      summary: 'List historical forecast snapshots for a profile',
      operationId: 'getForecastHistory',
      security: auth,
      parameters: [
        profileIdParam,
        pageParam,
        limitParam,
        { name: 'horizon', in: 'query', schema: { type: 'string', enum: ['hourly', 'daily', 'weekly'] } },
        { name: 'includeSuperseded', in: 'query', schema: { type: 'boolean', default: true } },
      ],
      responses: {
        200: { description: 'Forecast history retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
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
      parameters: [
        profileIdParam,
        pageParam,
        limitParam,
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['new', 'sent', 'acknowledged', 'dismissed', 'expired'] } },
        { name: 'uiStatus', in: 'query', schema: { type: 'string', enum: ['new', 'acknowledged', 'escalated', 'resolved'] } },
        { name: 'severity', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] } },
        { name: 'alertType', in: 'query', schema: { type: 'string', enum: ['heavy_rain', 'drought_risk', 'heat_wave', 'frost', 'storm', 'strong_wind', 'flood_risk', 'high_humidity', 'low_humidity', 'uv_hazard', 'cold_snap', 'hail'] } },
      ],
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
      description: 'Transitions an alert to resolved state (`dismissed`) and returns resolution metadata (`resolvedBy`, `resolvedAt`, `reason`).',
      operationId: 'dismissWeatherAlert',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { reason: { type: 'string', maxLength: 1000 } } }),
      responses: { 200: { description: 'Alert dismissed.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/weather/alerts/{id}/escalate': {
    post: {
      tags: ['Weather', 'Alerts'],
      summary: 'Escalate a weather alert',
      description: 'Escalation keeps alert open, sets manual trigger metadata, and returns frontend `uiStatus` mapping.',
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
      parameters: [
        { name: 'orgId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        pageParam,
        limitParam,
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['new', 'sent', 'acknowledged', 'dismissed', 'expired'] } },
        { name: 'uiStatus', in: 'query', schema: { type: 'string', enum: ['new', 'acknowledged', 'escalated', 'resolved'] } },
        { name: 'severity', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] } },
      ],
      responses: { 200: { description: 'Org-wide alerts.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  // ── Alert Rules Engine ────────────────────────────────────────────────────────

  '/api/v1/weather/rules': {
    get: {
      tags: ['Weather'],
      summary: 'List weather alert rules',
      operationId: 'listWeatherRules',
      security: auth,
      parameters: [
        pageParam,
        limitParam,
        { name: 'organizationId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'active', 'disabled', 'all'], default: 'active' } },
        { name: 'severity', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] } },
      ],
      responses: { 200: { description: 'Rules list.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
    post: {
      tags: ['Weather', 'Admin'],
      summary: 'Create alert rule',
      description: '`platform_admin` only.',
      operationId: 'createWeatherRule',
      security: auth,
      requestBody: r({
        type: 'object',
        required: ['name', 'alertType', 'severity', 'conditions', 'advisoryTemplate'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          alertType: { type: 'string', enum: ['heavy_rain', 'drought_risk', 'heat_wave', 'frost', 'storm', 'strong_wind', 'flood_risk', 'high_humidity', 'low_humidity', 'uv_hazard', 'cold_snap', 'hail'] },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          conditions: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field', 'operator', 'value'],
              properties: {
                field: { type: 'string' },
                operator: { type: 'string', enum: ['gt', 'gte', 'lt', 'lte', 'eq', 'between'] },
                value: { type: 'number' },
                valueTo: { type: 'number' },
              },
            },
          },
          cropTypes: { type: 'array', items: { type: 'string' } },
          priority: { type: 'integer', minimum: 1, maximum: 100 },
          advisoryTemplate: { type: 'string' },
          recommendedActions: { type: 'array', items: { type: 'string' } },
          organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          status: { type: 'string', enum: ['draft', 'active', 'disabled'] },
          uiStatus: { type: 'string', enum: ['draft', 'active', 'disabled'] },
          active: { type: 'boolean' },
        },
      }),
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
      description: '`platform_admin` only. Validates status transition rules (`draft -> active|disabled`, `active -> disabled`, `disabled -> active`).',
      operationId: 'updateWeatherRule',
      security: auth,
      parameters: [idParam],
      requestBody: r({
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          conditions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                operator: { type: 'string', enum: ['gt', 'gte', 'lt', 'lte', 'eq', 'between'] },
                value: { type: 'number' },
                valueTo: { type: 'number' },
              },
            },
          },
          advisoryTemplate: { type: 'string' },
          recommendedActions: { type: 'array', items: { type: 'string' } },
          isActive: { type: 'boolean' },
          active: { type: 'boolean' },
          status: { type: 'string', enum: ['draft', 'active', 'disabled'] },
          uiStatus: { type: 'string', enum: ['draft', 'active', 'disabled'] },
          priority: { type: 'integer', minimum: 1, maximum: 100 },
        },
      }),
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

  '/api/v1/weather/rules/{id}/test': {
    post: {
      tags: ['Weather'],
      summary: 'Test rule against provided reading or latest profile snapshot',
      operationId: 'testWeatherRule',
      security: auth,
      parameters: [idParam],
      requestBody: r({
        type: 'object',
        properties: {
          profileId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          reading: {
            type: 'object',
            properties: {
              temperatureCelsius: { type: 'number' },
              humidity: { type: 'number' },
              rainfallMmPerHour: { type: 'number' },
              windSpeedKph: { type: 'number' },
              uvIndex: { type: 'number' },
            },
          },
        },
      }),
      responses: {
        200: { description: 'Rule evaluation completed.' },
        400: { $ref: '#/components/responses/ValidationError' },
        404: { $ref: '#/components/responses/NotFound' },
      },
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
