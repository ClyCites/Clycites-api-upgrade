
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
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'otp'], properties: { email: { type: 'string', format: 'email' }, otp: { type: 'string', minLength: 6, maxLength: 6, example: '123456' } } } } } },
      responses: { 200: { description: 'OTP verified successfully.' }, 400: { $ref: '#/components/responses/ValidationError' }, 429: { $ref: '#/components/responses/TooManyRequests' } },
    },
  },

  '/api/v1/auth/resend-otp': {
    post: {
      tags: ['Authentication'],
      summary: 'Resend OTP code',
      description: 'Resends the verification OTP to the user\'s registered email address.',
      operationId: 'authResendOTP',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } } },
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
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token', 'newPassword'], properties: { token: { type: 'string' }, newPassword: { type: 'string', format: 'password', minLength: 8 } } } } } },
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
};
