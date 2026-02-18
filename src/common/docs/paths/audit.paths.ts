const auth = [{ BearerAuth: [] }];
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };

export const auditPaths: Record<string, unknown> = {

  '/api/v1/audit/me': {
    get: {
      tags: ['Audit'],
      summary: 'Get my audit log',
      description: 'Returns a paginated list of all actions performed by the authenticated user.',
      operationId: 'getMyAuditLogs',
      security: auth,
      parameters: [
        pageParam, limitParam,
        { name: 'action', in: 'query', schema: { type: 'string' }, description: 'Filter by action type (e.g. `login`, `price.create`).' },
        { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
      ],
      responses: {
        200: {
          description: 'Audit log entries.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        action: { type: 'string', example: 'listing.create' },
                        resource: { type: 'string', example: 'Listing' },
                        resourceId: { type: 'string' },
                        changes: { type: 'object' },
                        ip: { type: 'string' },
                        userAgent: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/audit/organizations/{organizationId}': {
    get: {
      tags: ['Audit'],
      summary: 'Get organization audit logs',
      description: 'Requires `audit:read` permission within the organization.',
      operationId: 'getOrgAuditLogs',
      security: auth,
      parameters: [
        { name: 'organizationId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        pageParam, limitParam,
        { name: 'userId', in: 'query', schema: { type: 'string' }, description: 'Filter by specific org member.' },
        { name: 'action', in: 'query', schema: { type: 'string' } },
        { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
      ],
      responses: {
        200: { description: 'Organization audit log.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/audit/resources/{resource}/{resourceId}': {
    get: {
      tags: ['Audit'],
      summary: 'Get audit log for a specific resource',
      description: 'Shows the full change history of any entity (e.g. a listing, order, or farm profile). Requires `audit:read` permission.',
      operationId: 'getResourceAuditLogs',
      security: auth,
      parameters: [
        { name: 'resource', in: 'path', required: true, schema: { type: 'string', example: 'Listing' }, description: 'Model name.' },
        { name: 'resourceId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        pageParam, limitParam,
      ],
      responses: {
        200: { description: 'Resource audit history.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/audit/suspicious': {
    get: {
      tags: ['Audit', 'Admin'],
      summary: 'Get suspicious activity report',
      description: 'Aggregates anomalous events (multiple failed logins, bulk data exports, unusual IPs). Requires `audit:read` admin permission.',
      operationId: 'getSuspiciousActivities',
      security: auth,
      parameters: [
        pageParam, limitParam,
        { name: 'severity', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] } },
        { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
      ],
      responses: {
        200: { description: 'Suspicious activity list.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
};
