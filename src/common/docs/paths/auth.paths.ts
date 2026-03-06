
const ok = (description: string, dataSchema: object | object) => ({
  200: { description, content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: dataSchema } }] } } } },
  400: { $ref: '#/components/responses/ValidationError' },
  401: { $ref: '#/components/responses/Unauthorized' },
  429: { $ref: '#/components/responses/TooManyRequests' },
});

export const authPaths: Record<string, unknown> = {

  '/api/v1/auth/register': {
    post: {
      tags: ['Authentication'],
      summary: 'Register new account',
      description: 'Create a new user account with optional enterprise profile metadata. Sends a verification email upon success.',
      operationId: 'authRegister',
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } } },
      responses: {
        201: { description: 'Account created. Check email for verification link.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        409: { description: 'Email already registered.' },
      },
    },
  },

  '/api/v1/auth/login': {
    post: {
      tags: ['Authentication'],
      summary: 'Login',
      description: 'Authenticate with email + password. Applies account lockout rules and returns profile + security context with JWT tokens.',
      operationId: 'authLogin',
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
      responses: {
        200: {
          description: 'Login successful.',
          content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/AuthTokens' } } }] } } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        423: { description: 'Account locked due to too many failed attempts.' },
      },
    },
  },

  '/api/v1/auth/refresh-token': {
    post: {
      tags: ['Authentication'],
      summary: 'Refresh access token',
      description: 'Exchange a valid refresh token for a new access token.',
      operationId: 'authRefreshToken',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['refreshToken'],
              properties: {
                refreshToken: { type: 'string' },
              },
            },
          },
        },
      },
      responses: { ...ok('New tokens issued.', { $ref: '#/components/schemas/AuthTokens' }) },
    },
  },

  '/api/v1/auth/logout': {
    post: {
      tags: ['Authentication'],
      summary: 'Logout',
      description: 'Invalidate the current refresh token and clear the cookie.',
      operationId: 'authLogout',
      security: [{ BearerAuth: [] }],
      responses: { 200: { description: 'Logged out successfully.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/auth/verify-otp': {
    post: {
      tags: ['Authentication'],
      summary: 'Verify OTP code',
      description: 'Verifies the OTP sent to the user\'s email after registration.',
      operationId: 'authVerifyOTP',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'code', 'purpose'],
              properties: {
                email: { type: 'string', format: 'email' },
                code: { type: 'string', minLength: 6, maxLength: 6, example: '123456' },
                purpose: { type: 'string', enum: ['verification', 'password_reset', 'login'] },
              },
            },
          },
        },
      },
      responses: { 200: { description: 'OTP verified successfully.' }, 400: { $ref: '#/components/responses/ValidationError' }, 429: { $ref: '#/components/responses/TooManyRequests' } },
    },
  },

  '/api/v1/auth/resend-otp': {
    post: {
      tags: ['Authentication'],
      summary: 'Resend OTP code',
      description: 'Resends the verification OTP to the user\'s registered email address.',
      operationId: 'authResendOTP',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'purpose'],
              properties: {
                email: { type: 'string', format: 'email' },
                purpose: { type: 'string', enum: ['verification', 'password_reset', 'login'] },
              },
            },
          },
        },
      },
      responses: { 200: { description: 'OTP resent.' }, 400: { $ref: '#/components/responses/ValidationError' }, 429: { $ref: '#/components/responses/TooManyRequests' } },
    },
  },

  '/api/v1/auth/forgot-password': {
    post: {
      tags: ['Authentication'],
      summary: 'Request password reset',
      description: 'Sends a password reset OTP/link to the provided email address.',
      operationId: 'authForgotPassword',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } } },
      responses: { 200: { description: 'Reset instructions sent if the email exists.' } },
    },
  },

  '/api/v1/auth/reset-password': {
    post: {
      tags: ['Authentication'],
      summary: 'Reset password',
      operationId: 'authResetPassword',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'code', 'newPassword'],
              properties: {
                email: { type: 'string', format: 'email' },
                code: { type: 'string', minLength: 6, maxLength: 6, example: '123456' },
                newPassword: { type: 'string', format: 'password', minLength: 12 },
              },
            },
          },
        },
      },
      responses: { 200: { description: 'Password reset successfully.' }, 400: { $ref: '#/components/responses/ValidationError' } },
    },
  },

  '/api/v1/auth/me': {
    get: {
      tags: ['Authentication'],
      summary: 'Get current user profile',
      operationId: 'authMe',
      security: [{ BearerAuth: [] }],
      responses: { ...ok('Current user.', { $ref: '#/components/schemas/User' }), 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/auth/me/profile': {
    patch: {
      tags: ['Authentication'],
      summary: 'Update current user profile',
      description: 'Authenticated users can update their enterprise profile fields (preferences, identity metadata, contact details).',
      operationId: 'authUpdateMyProfile',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                phone: { type: 'string' },
                timezone: { type: 'string' },
                language: { type: 'string' },
                profile: { type: 'object', additionalProperties: true },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Profile updated successfully.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/auth/change-password': {
    post: {
      tags: ['Authentication'],
      summary: 'Change password',
      description: 'Authenticated password change. Revokes all active refresh-token sessions.',
      operationId: 'authChangePassword',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['currentPassword', 'newPassword'],
              properties: {
                currentPassword: { type: 'string', format: 'password' },
                newPassword: { type: 'string', format: 'password', minLength: 12 },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Password changed successfully.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/auth/tokens': {
    get: {
      tags: ['Authentication'],
      summary: 'List API tokens',
      description: 'Returns API token metadata (masked). Token secret values are never returned. Payload includes canonical `status` and `uiStatus` (`active|revoked|expired`).',
      operationId: 'listApiTokens',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'tokenType', in: 'query', schema: { type: 'string', enum: ['personal', 'organization', 'super_admin'] } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'revoked', 'expired'] } },
        { name: 'orgId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
      ],
      responses: {
        200: { description: 'API tokens retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
    post: {
      tags: ['Authentication'],
      summary: 'Create API token',
      description:
        'Creates personal, organization, or super-admin API token. The token secret is returned only once.',
      operationId: 'createApiToken',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'scopes'],
              properties: {
                tokenType: {
                  type: 'string',
                  enum: ['personal', 'organization', 'super_admin'],
                  default: 'personal',
                },
                name: { type: 'string', minLength: 2, maxLength: 120 },
                description: { type: 'string', maxLength: 500 },
                orgId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
                scopes: { type: 'array', items: { type: 'string' } },
                rateLimit: {
                  type: 'object',
                  properties: {
                    requestsPerMinute: { type: 'integer', minimum: 1, maximum: 5000 },
                    burst: { type: 'integer', minimum: 1, maximum: 10000 },
                  },
                },
                expiresAt: { type: 'string', format: 'date-time' },
                allowedIps: { type: 'array', items: { type: 'string' } },
                reason: { type: 'string', minLength: 3, maxLength: 1000 },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'API token created (secret returned once).' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/auth/tokens/{id}': {
    get: {
      tags: ['Authentication'],
      summary: 'Get API token metadata',
      description: 'Returns token metadata with deterministic `status` and `uiStatus` values.',
      operationId: 'getApiTokenById',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      responses: {
        200: { description: 'API token retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Authentication'],
      summary: 'Update API token metadata and policies',
      operationId: 'updateApiToken',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', minLength: 2, maxLength: 120 },
                description: { type: 'string', maxLength: 500 },
                scopes: { type: 'array', items: { type: 'string' } },
                rateLimit: {
                  type: 'object',
                  properties: {
                    requestsPerMinute: { type: 'integer', minimum: 1, maximum: 5000 },
                    burst: { type: 'integer', minimum: 1, maximum: 10000 },
                  },
                },
                allowedIps: { type: 'array', items: { type: 'string' } },
                expiresAt: { oneOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
                reason: { type: 'string', minLength: 3, maxLength: 1000 },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'API token updated.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/auth/tokens/{id}/rotate': {
    post: {
      tags: ['Authentication'],
      summary: 'Rotate API token secret',
      description: 'Revokes previous secret and returns a new secret once. Invalid lifecycle requests return `400` errors.',
      operationId: 'rotateApiToken',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['reason'],
              properties: {
                reason: { type: 'string', minLength: 3, maxLength: 1000 },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'API token rotated (new secret returned once).' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/auth/tokens/{id}/revoke': {
    post: {
      tags: ['Authentication'],
      summary: 'Revoke API token',
      description: 'Revokes token and returns metadata with `status/uiStatus=revoked`.',
      operationId: 'revokeApiToken',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['reason'],
              properties: {
                reason: { type: 'string', minLength: 3, maxLength: 1000 },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'API token revoked.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/auth/tokens/{id}/usage': {
    get: {
      tags: ['Authentication'],
      summary: 'Get API token usage',
      operationId: 'getApiTokenUsage',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'sinceDays', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 90, default: 7 } },
      ],
      responses: {
        200: { description: 'Usage metrics retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/auth/super-admin/tokens': {
    get: {
      tags: ['Authentication', 'Admin'],
      summary: 'List my Super Admin scoped tokens',
      description: 'Super Admin only. Returns active and historical scoped grants issued by the current actor.',
      operationId: 'listSuperAdminTokens',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Scoped token grants retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
    post: {
      tags: ['Authentication', 'Admin'],
      summary: 'Create Super Admin scoped token',
      description: 'Super Admin only. Issues a short-lived, scoped, revocable token.',
      operationId: 'createSuperAdminToken',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['scopes', 'reason'],
              properties: {
                scopes: { type: 'array', items: { type: 'string' } },
                reason: { type: 'string', minLength: 3, maxLength: 1000 },
                expiresInMinutes: { type: 'integer', minimum: 1, maximum: 30, default: 10 },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Scoped token created.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/auth/super-admin/tokens/{grantId}': {
    delete: {
      tags: ['Authentication', 'Admin'],
      summary: 'Revoke Super Admin scoped token',
      description: 'Super Admin only. Revokes a previously issued scoped token grant.',
      operationId: 'revokeSuperAdminToken',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'grantId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['reason'],
              properties: {
                reason: { type: 'string', minLength: 3, maxLength: 1000 },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Scoped token revoked.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/auth/super-admin/impersonation': {
    get: {
      tags: ['Authentication', 'Admin'],
      summary: 'List my impersonation sessions',
      description: 'Super Admin only. Returns recent impersonation sessions issued by current actor.',
      operationId: 'listImpersonationSessions',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Impersonation sessions retrieved.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
    post: {
      tags: ['Authentication', 'Admin'],
      summary: 'Start user impersonation',
      description: 'Super Admin only. Creates a temporary, revocable impersonation session with mandatory reason.',
      operationId: 'startImpersonation',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['targetUserId', 'reason'],
              properties: {
                targetUserId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
                reason: { type: 'string', minLength: 3, maxLength: 1000 },
                ttlMinutes: { type: 'integer', minimum: 1, maximum: 60, default: 15 },
                scopes: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Impersonation session created.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/auth/super-admin/impersonation/{sessionId}': {
    delete: {
      tags: ['Authentication', 'Admin'],
      summary: 'Revoke impersonation session',
      description: 'Super Admin only. Immediately revokes an impersonation session.',
      operationId: 'revokeImpersonationSession',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['reason'],
              properties: {
                reason: { type: 'string', minLength: 3, maxLength: 1000 },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Impersonation session revoked.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
};
