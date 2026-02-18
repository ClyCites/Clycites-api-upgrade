
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
      description: 'Create a new user account. Sends a verification email upon success.',
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
      description: 'Authenticate with email + password. Returns JWT access token and sets refresh token cookie.',
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

  '/api/v1/auth/verify-email': {
    post: {
      tags: ['Authentication'],
      summary: 'Verify email address',
      operationId: 'authVerifyEmail',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token'], properties: { token: { type: 'string' } } } } } },
      responses: { 200: { description: 'Email verified.' }, 400: { $ref: '#/components/responses/ValidationError' } },
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
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token', 'newPassword'], properties: { token: { type: 'string' }, newPassword: { type: 'string', format: 'password', minLength: 8 } } } } } },
      responses: { 200: { description: 'Password reset successfully.' }, 400: { $ref: '#/components/responses/ValidationError' } },
    },
  },

  '/api/v1/auth/change-password': {
    post: {
      tags: ['Authentication'],
      summary: 'Change password (authenticated)',
      operationId: 'authChangePassword',
      security: [{ BearerAuth: [] }],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['currentPassword', 'newPassword'], properties: { currentPassword: { type: 'string', format: 'password' }, newPassword: { type: 'string', format: 'password', minLength: 8 } } } } } },
      responses: { 200: { description: 'Password changed.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
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

  '/api/v1/auth/setup-mfa': {
    post: {
      tags: ['Authentication', 'Security'],
      summary: 'Set up multi-factor authentication',
      description: 'Returns a TOTP secret and QR code URI to register with an authenticator app.',
      operationId: 'authSetupMFA',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'MFA setup data.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { type: 'object', properties: { secret: { type: 'string' }, qrCodeUrl: { type: 'string' } } } } }] } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/auth/verify-mfa': {
    post: {
      tags: ['Authentication', 'Security'],
      summary: 'Verify MFA token',
      operationId: 'authVerifyMFA',
      security: [{ BearerAuth: [] }],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token'], properties: { token: { type: 'string', minLength: 6, maxLength: 6, example: '123456' } } } } } },
      responses: { 200: { description: 'MFA verified.' }, 400: { description: 'Invalid or expired TOTP token.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },
};
