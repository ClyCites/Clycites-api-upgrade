const request = require('supertest');
const express = require('express');

const ADMIN_USER_ID = '507f1f77bcf86cd799439011';
const SUPER_ADMIN_USER_ID = '507f1f77bcf86cd799439012';
const ORG_ID = '507f1f77bcf86cd799439021';
const OTHER_ORG_ID = '507f1f77bcf86cd799439022';

let mockTokenStore = [];
let mockAccessLogStore = [];
let mockAuditEvents = [];

const mockMakeId = (() => {
  let counter = 2000;
  return () => `${counter++}`.padStart(24, '0');
})();

const mockNow = () => new Date();

const mockClone = (obj) => JSON.parse(JSON.stringify(obj));

const mockMatchQuery = (record, query = {}) => {
  if (!query || Object.keys(query).length === 0) {
    return true;
  }

  if (query.$or) {
    return query.$or.some((subQuery) => mockMatchQuery(record, subQuery));
  }

  return Object.entries(query).every(([key, expected]) => {
    if (key === '$or') {
      return true;
    }

    const actual = record[key];

    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      if ('$gte' in expected || '$lte' in expected) {
        if ('$gte' in expected && !(actual >= expected.$gte)) return false;
        if ('$lte' in expected && !(actual <= expected.$lte)) return false;
        return true;
      }

      if ('$regex' in expected) {
        return new RegExp(expected.$regex, expected.$options || '').test(String(actual || ''));
      }

      if ('$in' in expected) {
        return expected.$in.includes(actual);
      }
    }

    return String(actual) === String(expected);
  });
};

const mockBuildDoc = (seed) => {
  const doc = {
    ...seed,
    createdAt: seed.createdAt || mockNow(),
    updatedAt: seed.updatedAt || mockNow(),
    save: jest.fn(async function save() {
      this.updatedAt = mockNow();
      const idx = mockTokenStore.findIndex((item) => String(item._id) === String(this._id));
      if (idx >= 0) {
        mockTokenStore[idx] = this;
      }
      return this;
    }),
  };

  return doc;
};

const mockBuildQueryChain = (value) => {
  const resolved = Promise.resolve(value);

  return {
    select: jest.fn(() => mockBuildQueryChain(value)),
    populate: jest.fn(() => mockBuildQueryChain(value)),
    sort: jest.fn(() => mockBuildQueryChain(value)),
    skip: jest.fn(() => mockBuildQueryChain(value)),
    limit: jest.fn(() => mockBuildQueryChain(value)),
    lean: jest.fn(() => Promise.resolve(mockClone(value))),
    then: resolved.then.bind(resolved),
    catch: resolved.catch.bind(resolved),
  };
};

jest.mock('../dist/modules/auth/apiToken.model', () => ({
  __esModule: true,
  default: {
    create: jest.fn(async (data) => {
      const doc = mockBuildDoc({
        _id: mockMakeId(),
        ...data,
      });
      mockTokenStore.push(doc);
      return doc;
    }),
    find: jest.fn((query = {}) => {
      let rows = mockTokenStore.filter((item) => mockMatchQuery(item, query));

      const chain = {
        sort: jest.fn((sortObject = { createdAt: -1 }) => {
          const [field, direction] = Object.entries(sortObject)[0];
          rows = rows.sort((a, b) => {
            const av = a[field];
            const bv = b[field];
            if (av === bv) return 0;
            return direction === 1 ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
          });
          return chain;
        }),
        skip: jest.fn((offset = 0) => {
          rows = rows.slice(offset);
          return chain;
        }),
        limit: jest.fn((amount = rows.length) => {
          rows = rows.slice(0, amount);
          return Promise.resolve(rows);
        }),
      };

      return chain;
    }),
    findOne: jest.fn((query = {}) => {
      const found = mockTokenStore.find((item) => mockMatchQuery(item, query)) || null;
      return mockBuildQueryChain(found);
    }),
    findById: jest.fn((id) => {
      const found = mockTokenStore.find((item) => String(item._id) === String(id)) || null;
      return mockBuildQueryChain(found);
    }),
  },
}));

jest.mock('../dist/modules/auth/apiAccessLog.model', () => ({
  __esModule: true,
  default: {
    create: jest.fn(async (payload) => {
      const row = {
        _id: mockMakeId(),
        ...payload,
        createdAt: mockNow(),
        updatedAt: mockNow(),
      };
      mockAccessLogStore.push(row);
      return row;
    }),
    aggregate: jest.fn(async (pipeline) => {
      const matchStage = pipeline.find((stage) => stage.$match)?.$match || {};
      const tokenId = matchStage.token;
      const fromDate = matchStage.createdAt?.$gte || new Date(0);

      const rows = mockAccessLogStore.filter(
        (item) =>
          String(item.token) === String(tokenId) &&
          new Date(item.createdAt) >= new Date(fromDate)
      );

      const hasSummary = pipeline.some((stage) => stage.$group?.totalRequests);
      if (hasSummary) {
        return [{
          totalRequests: rows.length,
          successResponses: rows.filter((item) => item.statusCode >= 200 && item.statusCode < 400).length,
          clientErrors: rows.filter((item) => item.statusCode >= 400 && item.statusCode < 500).length,
          serverErrors: rows.filter((item) => item.statusCode >= 500).length,
        }];
      }

      const byDay = new Map();
      for (const row of rows) {
        const date = new Date(row.createdAt);
        const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
        byDay.set(key, (byDay.get(key) || 0) + 1);
      }

      return Array.from(byDay.entries())
        .sort((a, b) => (a[0] > b[0] ? 1 : -1))
        .map(([date, count]) => {
          const [y, m, d] = date.split('-').map((v) => Number(v));
          return { _id: { y, m, d }, count };
        });
    }),
  },
}));

jest.mock('../dist/modules/users/user.model', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn((query = {}) => {
      const users = [
        { _id: ADMIN_USER_ID, email: 'admin@clycites.test', role: 'admin', isActive: true },
        { _id: SUPER_ADMIN_USER_ID, email: 'super@clycites.test', role: 'super_admin', isActive: true },
      ];

      const found = users.find((user) => String(user._id) === String(query._id)) || null;
      return {
        select: jest.fn(async () => found),
      };
    }),
  },
}));

jest.mock('../dist/modules/organizations/organization.model', () => ({
  __esModule: true,
  default: {
    findById: jest.fn((id) => ({
      select: jest.fn(async () => {
        if (String(id) !== ORG_ID && String(id) !== OTHER_ORG_ID) {
          return null;
        }

        return {
          _id: id,
          owner: ADMIN_USER_ID,
          status: 'active',
        };
      }),
    })),
  },
}));

jest.mock('../dist/modules/organizations/organizationMember.model', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(() => ({
      populate: jest.fn(async () => ({
        user: ADMIN_USER_ID,
        organization: ORG_ID,
        role: { level: 10 },
        status: 'active',
      })),
    })),
  },
}));

jest.mock('../dist/modules/audit/audit.service', () => ({
  __esModule: true,
  default: {
    log: jest.fn(async (payload) => {
      mockAuditEvents.push(payload);
      return payload;
    }),
  },
}));

jest.mock('../dist/modules/security/device.service', () => ({
  __esModule: true,
  default: {
    registerDevice: jest.fn(async () => ({
      lastActiveAt: new Date(),
      save: jest.fn(async () => ({})),
    })),
    detectSuspiciousActivity: jest.fn(async () => []),
  },
}));

jest.mock('../dist/modules/security/mfa.service', () => ({
  __esModule: true,
  default: {
    isMFARequired: jest.fn(async () => false),
  },
}));

jest.mock('../dist/modules/auth/superAdminGrant.model', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(async () => null),
  },
}));

jest.mock('../dist/modules/auth/impersonationSession.model', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(async () => null),
  },
}));

describe('API token integration', () => {
  let app;
  let authController;
  let authenticate;
  let apiTokenAccessLogger;
  let validate;
  let validators;
  let errorHandler;
  let AuditService;

  const attachAdminSession = (req, _res, next) => {
    req.user = {
      id: ADMIN_USER_ID,
      email: 'admin@clycites.test',
      role: 'admin',
      authType: 'jwt',
    };
    next();
  };

  beforeAll(() => {
    authController = require('../dist/modules/auth/auth.controller').default;
    ({ authenticate } = require('../dist/common/middleware/auth'));
    ({ apiTokenAccessLogger } = require('../dist/common/middleware/apiTokenAccess'));
    ({ validate } = require('../dist/common/middleware/validate'));
    validators = require('../dist/modules/auth/auth.validator');
    ({ errorHandler } = require('../dist/common/middleware/errorHandler'));
    AuditService = require('../dist/modules/audit/audit.service').default;

    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.requestId = 'req-test-token';
      next();
    });
    app.use(apiTokenAccessLogger);

    app.post('/api/v1/auth/tokens', attachAdminSession, validate(validators.createApiTokenValidator), authController.createApiToken);
    app.get('/api/v1/auth/tokens', attachAdminSession, validate(validators.listApiTokensValidator), authController.listApiTokens);
    app.get('/api/v1/auth/tokens/:id', attachAdminSession, validate(validators.tokenIdParamValidator), authController.getApiTokenById);
    app.patch('/api/v1/auth/tokens/:id', attachAdminSession, validate(validators.updateApiTokenValidator), authController.updateApiToken);
    app.post('/api/v1/auth/tokens/:id/rotate', attachAdminSession, validate(validators.rotateOrRevokeApiTokenValidator), authController.rotateApiToken);
    app.post('/api/v1/auth/tokens/:id/revoke', attachAdminSession, validate(validators.rotateOrRevokeApiTokenValidator), authController.revokeApiToken);
    app.get('/api/v1/auth/tokens/:id/usage', attachAdminSession, validate(validators.tokenIdParamValidator), authController.getApiTokenUsage);

    app.get('/api/v1/orders', authenticate, (_req, res) => {
      res.status(200).json({ success: true, data: { ok: true } });
    });

    app.use(errorHandler);
  });

  beforeEach(() => {
    mockTokenStore = [];
    mockAccessLogStore = [];
    mockAuditEvents = [];
    AuditService.log.mockClear();
  });

  test('creates token and returns secret once (metadata does not expose secret)', async () => {
    const createRes = await request(app)
      .post('/api/v1/auth/tokens')
      .send({
        name: 'Integration Token',
        scopes: ['orders:read'],
      })
      .expect(201);

    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.secret).toBeDefined();
    expect(createRes.body.data.secretShown).toBe(true);
    expect(createRes.body.data.token.uiStatus).toBe('active');

    const tokenDocId = createRes.body.data.token.id;

    const getRes = await request(app)
      .get(`/api/v1/auth/tokens/${tokenDocId}`)
      .expect(200);

    expect(getRes.body.data.secret).toBeUndefined();
    expect(getRes.body.data.tokenHash).toBeUndefined();
    expect(getRes.body.data.uiStatus).toBe('active');
  });

  test('supports list and update while preserving status/uiStatus contract', async () => {
    const createRes = await request(app)
      .post('/api/v1/auth/tokens')
      .send({
        name: 'Updatable Token',
        scopes: ['orders:read'],
      })
      .expect(201);

    const tokenId = createRes.body.data.token.id;

    const updateRes = await request(app)
      .patch(`/api/v1/auth/tokens/${tokenId}`)
      .send({
        name: 'Updated Token Name',
        reason: 'Name cleanup',
      })
      .expect(200);

    expect(updateRes.body.data.name).toBe('Updated Token Name');
    expect(updateRes.body.data.uiStatus).toBe('active');

    const listRes = await request(app)
      .get('/api/v1/auth/tokens')
      .expect(200);

    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data[0].uiStatus).toBe('active');
  });

  test('enforces scope and organization boundary for API token auth', async () => {
    const limitedToken = await request(app)
      .post('/api/v1/auth/tokens')
      .send({
        name: 'Limited Token',
        scopes: ['pricing:read'],
      })
      .expect(201);

    await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${limitedToken.body.data.secret}`)
      .expect(403);

    const orgToken = await request(app)
      .post('/api/v1/auth/tokens')
      .send({
        tokenType: 'organization',
        name: 'Org Token',
        orgId: ORG_ID,
        scopes: ['orders:read'],
      })
      .expect(201);

    await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${orgToken.body.data.secret}`)
      .set('x-organization-id', OTHER_ORG_ID)
      .expect(403);

    await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${orgToken.body.data.secret}`)
      .set('x-organization-id', ORG_ID)
      .expect(200);
  });

  test('enforces per-token rate limits', async () => {
    const tokenRes = await request(app)
      .post('/api/v1/auth/tokens')
      .send({
        name: 'Rate Limited Token',
        scopes: ['orders:read'],
        rateLimit: {
          requestsPerMinute: 2,
          burst: 2,
        },
      })
      .expect(201);

    const bearer = `Bearer ${tokenRes.body.data.secret}`;

    await request(app).get('/api/v1/orders').set('Authorization', bearer).expect(200);
    await request(app).get('/api/v1/orders').set('Authorization', bearer).expect(200);
    await request(app).get('/api/v1/orders').set('Authorization', bearer).expect(429);
  });

  test('supports rotation and revocation lifecycle', async () => {
    const createRes = await request(app)
      .post('/api/v1/auth/tokens')
      .send({
        name: 'Rotatable Token',
        scopes: ['orders:read'],
      })
      .expect(201);

    const tokenId = createRes.body.data.token.id;
    const oldSecret = createRes.body.data.secret;

    const rotateRes = await request(app)
      .post(`/api/v1/auth/tokens/${tokenId}/rotate`)
      .send({ reason: 'Routine key rotation' })
      .expect(200);

    const newSecret = rotateRes.body.data.secret;
    expect(newSecret).toBeDefined();
    expect(newSecret).not.toBe(oldSecret);
    expect(rotateRes.body.data.token.uiStatus).toBe('active');

    await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${oldSecret}`)
      .expect(401);

    await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${newSecret}`)
      .expect(200);

    const revokeRes = await request(app)
      .post(`/api/v1/auth/tokens/${tokenId}/revoke`)
      .send({ reason: 'Compromised integration endpoint' })
      .expect(200);
    expect(revokeRes.body.data.uiStatus).toBe('revoked');

    await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${newSecret}`)
      .expect(401);
  });

  test('records usage and returns usage stats', async () => {
    const createRes = await request(app)
      .post('/api/v1/auth/tokens')
      .send({
        name: 'Usage Token',
        scopes: ['orders:read'],
      })
      .expect(201);

    const tokenId = createRes.body.data.token.id;
    const bearer = `Bearer ${createRes.body.data.secret}`;

    await request(app).get('/api/v1/orders').set('Authorization', bearer).expect(200);
    await request(app).get('/api/v1/orders').set('Authorization', bearer).expect(200);

    const usageRes = await request(app)
      .get(`/api/v1/auth/tokens/${tokenId}/usage`)
      .expect(200);

    expect(usageRes.body.data.summary.totalRequests).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(usageRes.body.data.requestsByDay)).toBe(true);
    expect(usageRes.body.data.token.uiStatus).toBe('active');
  });

  test('writes audit events for token lifecycle actions', async () => {
    const createRes = await request(app)
      .post('/api/v1/auth/tokens')
      .send({
        name: 'Audited Token',
        scopes: ['orders:read'],
      })
      .expect(201);

    const tokenId = createRes.body.data.token.id;

    await request(app)
      .post(`/api/v1/auth/tokens/${tokenId}/rotate`)
      .send({ reason: 'Scheduled rotation' })
      .expect(200);

    await request(app)
      .post(`/api/v1/auth/tokens/${tokenId}/revoke`)
      .send({ reason: 'Integration retired' })
      .expect(200);

    const actions = mockAuditEvents.map((event) => event.action);
    expect(actions).toContain('auth.api_token_created');
    expect(actions).toContain('auth.api_token_rotated');
    expect(actions).toContain('auth.api_token_revoked');
  });
});

