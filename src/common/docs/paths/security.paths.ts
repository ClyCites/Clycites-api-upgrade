const auth = [{ BearerAuth: [] }];
const r = (s: object) => ({ required: true, content: { 'application/json': { schema: s } } });
const deviceIdParam = { name: 'deviceId', in: 'path' as const, required: true, schema: { type: 'string' as const } };

export const securityPaths: Record<string, unknown> = {

  // ─── MFA / TOTP ──────────────────────────────────────────────────────────────

  '/api/v1/security/mfa/totp/setup': {
    post: {
      tags: ['Security'],
      summary: 'Setup TOTP authenticator app',
      description: 'Returns a TOTP secret and QR code URI to be scanned into an authenticator app. Call `/mfa/totp/verify` afterwards to activate.',
      operationId: 'setupTOTP',
      security: auth,
      responses: {
        200: {
          description: 'TOTP setup data.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  secret: { type: 'string', description: 'Base32 TOTP secret.' },
                  qrCodeUri: { type: 'string', format: 'uri', description: 'otpauth:// URI for QR rendering.' },
                  backupCodes: { type: 'array', items: { type: 'string' }, description: 'One-time backup codes.' },
                },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/security/mfa/totp/verify': {
    post: {
      tags: ['Security'],
      summary: 'Verify and activate TOTP',
      operationId: 'verifyTOTP',
      security: auth,
      requestBody: r({ type: 'object', required: ['token'], properties: { token: { type: 'string', minLength: 6, maxLength: 8, description: '6-digit TOTP code.' } } }),
      responses: {
        200: { description: 'TOTP enabled.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/security/mfa/email/enable': {
    post: {
      tags: ['Security'],
      summary: 'Enable email OTP as second factor',
      operationId: 'enableEmailOTP',
      security: auth,
      responses: {
        200: { description: 'Email OTP enabled. A verification code has been sent.' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/security/mfa/email/request': {
    post: {
      tags: ['Security'],
      summary: 'Request a fresh email OTP',
      operationId: 'requestEmailOTP',
      security: auth,
      responses: {
        200: { description: 'OTP sent to registered email.' },
        429: { $ref: '#/components/responses/TooManyRequests' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/security/mfa': {
    delete: {
      tags: ['Security'],
      summary: 'Disable all MFA methods',
      description: 'Rate-limited (sensitive action). Requires current password or active MFA token for confirmation.',
      operationId: 'disableMFA',
      security: auth,
      requestBody: r({ type: 'object', required: ['confirmToken'], properties: { confirmToken: { type: 'string', description: 'Current MFA token or backup code to confirm intent.' }, password: { type: 'string', format: 'password' } } }),
      responses: {
        200: { description: 'MFA disabled.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        429: { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },

  // ─── Device Management ────────────────────────────────────────────────────────

  '/api/v1/security/devices': {
    get: {
      tags: ['Security'],
      summary: 'List trusted/known devices',
      operationId: 'getDevices',
      security: auth,
      responses: {
        200: {
          description: 'Device list.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        deviceId: { type: 'string' },
                        name: { type: 'string' },
                        userAgent: { type: 'string' },
                        ip: { type: 'string' },
                        isTrusted: { type: 'boolean' },
                        isBlocked: { type: 'boolean' },
                        lastSeenAt: { type: 'string', format: 'date-time' },
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

  '/api/v1/security/devices/{deviceId}/verify': {
    post: {
      tags: ['Security'],
      summary: 'Mark device as trusted',
      operationId: 'verifyDevice',
      security: auth,
      parameters: [deviceIdParam],
      responses: {
        200: { description: 'Device trusted.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/security/devices/{deviceId}/block': {
    post: {
      tags: ['Security'],
      summary: 'Block a device',
      operationId: 'blockDevice',
      security: auth,
      parameters: [deviceIdParam],
      responses: {
        200: { description: 'Device blocked.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/security/devices/{deviceId}': {
    delete: {
      tags: ['Security'],
      summary: 'Revoke device access (sign out that device)',
      operationId: 'revokeDevice',
      security: auth,
      parameters: [deviceIdParam],
      responses: {
        200: { description: 'Device revoked.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
};
