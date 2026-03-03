/**
 * OpenAPI 3.1 Reusable Components
 * Schemas, responses, parameters, and security definitions for the ClyCites API.
 */
import type { OpenAPIV3_1 } from 'openapi-types';

// ─── Security Schemes ──────────────────────────────────────────────────────────

export const securitySchemes: Record<string, OpenAPIV3_1.SecuritySchemeObject> = {
  BearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'JWT access token issued on login, or API token secret issued from /api/v1/auth/tokens.',
  },
  ApiTokenAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'API_TOKEN',
    description: 'Hashed API token secret. Returned once at creation/rotation and used as Authorization Bearer.',
  },
  RefreshToken: {
    type: 'apiKey',
    in: 'cookie',
    name: 'refreshToken',
    description: 'HTTP-only refresh token cookie. Used to obtain new access tokens.',
  },
};

// ─── Common Parameters ─────────────────────────────────────────────────────────

export const parameters: Record<string, OpenAPIV3_1.ParameterObject> = {
  pageParam: {
    name: 'page',
    in: 'query',
    schema: { type: 'integer', minimum: 1, default: 1 },
    description: 'Page number for pagination.',
  },
  limitParam: {
    name: 'limit',
    in: 'query',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    description: 'Number of items per page.',
  },
  sortByParam: {
    name: 'sortBy',
    in: 'query',
    schema: { type: 'string' },
    description: 'Field name to sort results by.',
  },
  sortOrderParam: {
    name: 'sortOrder',
    in: 'query',
    schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
    description: 'Sort direction.',
  },
  mongoIdPath: {
    name: 'id',
    in: 'path',
    required: true,
    schema: { type: 'string', pattern: '^[a-f0-9]{24}$' },
    description: 'MongoDB ObjectId (24-character hex string).',
  },
  daysParam: {
    name: 'days',
    in: 'query',
    schema: { type: 'integer', minimum: 1, maximum: 365, default: 30 },
    description: 'Lookback window in days.',
  },
};

// ─── Shared Schema Helpers ─────────────────────────────────────────────────────

const mongoId: OpenAPIV3_1.SchemaObject = {
  type: 'string',
  pattern: '^[a-f0-9]{24}$',
  example: '64f1b2c3d4e5f6a7b8c9d0e1',
};

const isoDate: OpenAPIV3_1.SchemaObject = {
  type: 'string',
  format: 'date-time',
  example: '2026-02-19T08:30:00.000Z',
};

const paginationMeta: OpenAPIV3_1.SchemaObject = {
  type: 'object',
  properties: {
    page: { type: 'integer' },
    limit: { type: 'integer' },
    total: { type: 'integer' },
    totalPages: { type: 'integer' },
  },
};

// ─── Core Schemas ──────────────────────────────────────────────────────────────

export const schemas: Record<string, OpenAPIV3_1.SchemaObject> = {

  // ── Utility ────────────────────────────────────────────────────────────────

  MongoId: mongoId,

  Error: {
    type: 'object',
    required: ['success', 'error'],
    properties: {
      success: { type: 'boolean', example: false },
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'NOT_FOUND' },
          message: { type: 'string', example: 'Resource not found' },
          details: {},
        },
      },
      meta: {
        type: 'object',
        properties: {
          requestId: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          impersonatedUserId: mongoId,
        },
      },
    },
  },

  SuccessResponse: {
    type: 'object',
    required: ['success'],
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Success' },
      data: {},
      meta: {
        type: 'object',
        properties: {
          requestId: { type: 'string', example: 'req_01HXYZ...' },
          timestamp: isoDate,
          impersonatedUserId: mongoId,
          pagination: paginationMeta,
        },
      },
    },
  },

  PaginationMeta: paginationMeta,

  // ── Auth ───────────────────────────────────────────────────────────────────

  RegisterRequest: {
    type: 'object',
    required: ['email', 'password', 'firstName', 'lastName'],
    properties: {
      firstName: { type: 'string', example: 'Amara' },
      lastName: { type: 'string', example: 'Nakato' },
      email: { type: 'string', format: 'email', example: 'amara@clycites.com' },
      phone: { type: 'string', example: '+256700123456' },
      password: { type: 'string', format: 'password', minLength: 12, example: 'P@ssw0rd1234!' },
      role: { type: 'string', enum: ['farmer', 'buyer', 'trader', 'expert'], example: 'farmer' },
      timezone: { type: 'string', example: 'Africa/Kampala' },
      language: { type: 'string', example: 'en' },
      profile: {
        type: 'object',
        properties: {
          displayName: { type: 'string', example: 'Amara Nakato' },
          nationality: { type: 'string', example: 'Ugandan' },
          address: {
            type: 'object',
            properties: {
              city: { type: 'string', example: 'Kampala' },
              country: { type: 'string', example: 'Uganda' },
            },
          },
          preferences: {
            type: 'object',
            properties: {
              preferredContactMethod: { type: 'string', enum: ['email', 'phone', 'sms', 'whatsapp', 'in_app'] },
            },
          },
        },
      },
    },
  },

  LoginRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', example: 'amara@clycites.com' },
      password: { type: 'string', format: 'password', example: 'P@ssw0rd123' },
    },
  },

  AuthTokens: {
    type: 'object',
    properties: {
      accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
      refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
      expiresIn: { type: 'string', example: '15m' },
    },
  },

  User: {
    type: 'object',
    properties: {
      id: mongoId,
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      email: { type: 'string', format: 'email' },
      phone: { type: 'string' },
      role: { type: 'string', enum: ['super_admin', 'platform_admin', 'admin', 'farmer', 'buyer', 'trader', 'expert'] },
      isEmailVerified: { type: 'boolean' },
      isPhoneVerified: { type: 'boolean' },
      isMfaEnabled: { type: 'boolean' },
      isActive: { type: 'boolean' },
      timezone: { type: 'string' },
      language: { type: 'string' },
      profile: {
        type: 'object',
        properties: {
          displayName: { type: 'string' },
          dateOfBirth: { type: 'string', format: 'date-time' },
          completionScore: { type: 'number', minimum: 0, maximum: 100 },
          identity: {
            type: 'object',
            properties: {
              kycStatus: { type: 'string', enum: ['not_started', 'pending', 'verified', 'rejected', 'expired'] },
              documentType: { type: 'string' },
            },
          },
          preferences: {
            type: 'object',
            properties: {
              preferredContactMethod: { type: 'string', enum: ['email', 'phone', 'sms', 'whatsapp', 'in_app'] },
            },
          },
          compliance: {
            type: 'object',
            properties: {
              termsAccepted: { type: 'boolean' },
              privacyPolicyAccepted: { type: 'boolean' },
            },
          },
        },
      },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  ApiToken: {
    type: 'object',
    properties: {
      id: mongoId,
      tokenId: { type: 'string', example: '4d85f5f3-6250-4d13-8bf8-754df2de6fb5' },
      tokenType: { type: 'string', enum: ['personal', 'organization', 'super_admin'] },
      name: { type: 'string', example: 'Mobile App Token' },
      description: { type: 'string' },
      tokenPrefix: { type: 'string', example: 'ct_a1b2c3d4' },
      createdBy: mongoId,
      orgId: mongoId,
      scopes: {
        type: 'array',
        items: { type: 'string' },
        example: ['orders:read', 'orders:write', 'pricing:read'],
      },
      rateLimit: {
        type: 'object',
        properties: {
          requestsPerMinute: { type: 'integer', example: 120 },
          burst: { type: 'integer', example: 240 },
        },
      },
      status: { type: 'string', enum: ['active', 'revoked', 'expired'] },
      expiresAt: isoDate,
      allowedIps: { type: 'array', items: { type: 'string' } },
      lastUsedAt: isoDate,
      lastUsedIp: { type: 'string', example: '41.210.148.1' },
      revokedAt: isoDate,
      revokeReason: { type: 'string' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  ApiTokenUsage: {
    type: 'object',
    properties: {
      token: { $ref: '#/components/schemas/ApiToken' },
      summary: {
        type: 'object',
        properties: {
          totalRequests: { type: 'integer' },
          successResponses: { type: 'integer' },
          clientErrors: { type: 'integer' },
          serverErrors: { type: 'integer' },
        },
      },
      since: isoDate,
      days: { type: 'integer' },
      requestsByDay: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: { type: 'string', example: '2026-02-26' },
            count: { type: 'integer' },
          },
        },
      },
      lastUsedAt: isoDate,
      lastUsedIp: { type: 'string' },
    },
  },

  // ── Farmers ────────────────────────────────────────────────────────────────

  FarmerProfile: {
    type: 'object',
    properties: {
      _id: mongoId,
      userId: mongoId,
      farmerCode: { type: 'string', example: 'FM-CEN-LMNV6S7A-ABCD' },
      farmerType: {
        type: 'string',
        enum: ['individual', 'cooperative_member', 'enterprise_grower', 'contract_farmer'],
        example: 'individual',
      },
      farmingExperience: { type: 'number', minimum: 0, example: 6 },
      verificationStatus: {
        type: 'string',
        enum: ['draft', 'submitted', 'verified', 'rejected'],
        example: 'submitted',
      },
      verificationLevel: {
        type: 'string',
        enum: ['basic', 'intermediate', 'advanced'],
        example: 'basic',
      },
      verificationSubmittedAt: isoDate,
      verificationReviewedAt: isoDate,
      verificationReason: { type: 'string', example: 'National ID mismatch' },
      contactDetails: {
        type: 'object',
        required: ['primaryPhone'],
        properties: {
          primaryPhone: { type: 'string', example: '+256700123456' },
          secondaryPhone: { type: 'string' },
          whatsapp: { type: 'string' },
          email: { type: 'string', format: 'email' },
          preferredContactMethod: { type: 'string', enum: ['phone', 'sms', 'whatsapp', 'email'] },
        },
      },
      primaryLocation: {
        type: 'object',
        required: ['country', 'region', 'district'],
        properties: {
          country: { type: 'string', example: 'Uganda' },
          region: { type: 'string', example: 'Central' },
          district: { type: 'string', example: 'Wakiso' },
          subCounty: { type: 'string' },
          parish: { type: 'string' },
          village: { type: 'string' },
          coordinates: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['Point'] },
              coordinates: {
                type: 'array',
                items: { type: 'number' },
                minItems: 2,
                maxItems: 2,
                example: [32.5825, 0.3476],
              },
            },
          },
        },
      },
      profileCompleteness: { type: 'number', minimum: 0, maximum: 100 },
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  FarmerCreateRequest: {
    type: 'object',
    required: ['contactDetails', 'primaryLocation'],
    properties: {
      farmerType: {
        type: 'string',
        enum: ['individual', 'cooperative_member', 'enterprise_grower', 'contract_farmer'],
      },
      farmingExperience: { type: 'number', minimum: 0 },
      contactDetails: {
        type: 'object',
        required: ['primaryPhone'],
        properties: {
          primaryPhone: { type: 'string', example: '+256700123456' },
          secondaryPhone: { type: 'string' },
          whatsapp: { type: 'string' },
          email: { type: 'string', format: 'email' },
          preferredContactMethod: { type: 'string', enum: ['phone', 'sms', 'whatsapp', 'email'] },
        },
      },
      primaryLocation: {
        type: 'object',
        required: ['country', 'region', 'district'],
        properties: {
          country: { type: 'string', example: 'Uganda' },
          region: { type: 'string', example: 'Central' },
          district: { type: 'string', example: 'Wakiso' },
          village: { type: 'string' },
          coordinates: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['Point'] },
              coordinates: {
                type: 'array',
                items: { type: 'number' },
                minItems: 2,
                maxItems: 2,
              },
            },
          },
        },
      },
    },
  },

  FarmerVerificationSubmitRequest: {
    type: 'object',
    properties: {
      notes: { type: 'string', example: 'Profile is complete and ready for review.' },
    },
  },

  FarmerVerificationDecisionRequest: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: ['verified', 'rejected'] },
      reason: { type: 'string', example: 'Verified against submitted identity documents.' },
    },
  },

  FarmerFarm: {
    type: 'object',
    properties: {
      _id: mongoId,
      farmerId: mongoId,
      farmName: { type: 'string', example: 'North Farm' },
      farmCode: { type: 'string', example: 'FRM-CEN-LMNV6S7A-ABC' },
      totalSize: { type: 'number', example: 8.5 },
      sizeUnit: { type: 'string', enum: ['acres', 'hectares', 'square_meters'] },
      ownershipType: { type: 'string', enum: ['owned', 'leased', 'communal', 'family_land', 'rented', 'sharecropping'] },
      operationalStatus: { type: 'string', enum: ['active', 'inactive', 'fallow', 'under_development', 'abandoned'] },
      location: {
        type: 'object',
        properties: {
          country: { type: 'string' },
          region: { type: 'string' },
          district: { type: 'string' },
          village: { type: 'string' },
        },
      },
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  FarmerPlot: {
    type: 'object',
    properties: {
      _id: mongoId,
      farmerId: mongoId,
      farmId: mongoId,
      plotName: { type: 'string', example: 'Plot A' },
      plotCode: { type: 'string', example: 'PLT-LMNV6S7A-ABCD' },
      area: { type: 'number', example: 2.2 },
      areaUnit: { type: 'string', enum: ['acres', 'hectares', 'square_meters'] },
      soilType: { type: 'string', example: 'loam' },
      status: { type: 'string', enum: ['active', 'fallow', 'inactive'] },
      notes: { type: 'string' },
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  FarmerCropProduction: {
    type: 'object',
    properties: {
      _id: mongoId,
      farmerId: mongoId,
      farmId: mongoId,
      cropName: { type: 'string', example: 'Maize' },
      cropCategory: { type: 'string', enum: ['cereals', 'legumes', 'vegetables', 'fruits', 'cash_crops', 'roots_tubers', 'fodder', 'other'] },
      season: { type: 'string', enum: ['season_a', 'season_b', 'dry_season', 'wet_season', 'year_round'] },
      year: { type: 'integer', example: 2026 },
      areaPlanted: { type: 'number', example: 4.5 },
      areaUnit: { type: 'string', enum: ['acres', 'hectares', 'square_meters'] },
      estimatedYield: { type: 'number', example: 4200 },
      actualYield: { type: 'number', example: 3800 },
      yieldUnit: { type: 'string', enum: ['kg', 'tons', 'bags', 'bunches', 'pieces'] },
      productionStatus: { type: 'string', enum: ['planned', 'in_progress', 'harvested', 'sold', 'stored', 'failed'] },
      uiStatus: { type: 'string', enum: ['planned', 'active', 'completed'], example: 'active' },
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  FarmerGrowthStage: {
    type: 'object',
    properties: {
      _id: mongoId,
      farmerId: mongoId,
      cycleId: mongoId,
      cropId: mongoId,
      stage: { type: 'string', enum: ['seed', 'vegetative', 'flowering', 'maturity', 'harvested'] },
      observedAt: isoDate,
      notes: { type: 'string' },
      status: { type: 'string', enum: ['planned', 'active', 'completed'] },
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  FarmerYieldPrediction: {
    type: 'object',
    properties: {
      _id: mongoId,
      farmerId: mongoId,
      cropId: mongoId,
      predictedYield: { type: 'number', minimum: 0 },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      horizonDays: { type: 'integer', minimum: 1, maximum: 3650 },
      modelVersion: { type: 'string', example: 'v1.0' },
      status: { type: 'string', enum: ['generated', 'refreshed', 'archived'] },
      refreshedAt: isoDate,
      notes: { type: 'string' },
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  FarmerInput: {
    type: 'object',
    properties: {
      _id: mongoId,
      farmerId: mongoId,
      farmId: mongoId,
      plotId: mongoId,
      inputName: { type: 'string', example: 'NPK Fertilizer' },
      inputType: { type: 'string', enum: ['seed', 'fertilizer', 'pesticide', 'herbicide', 'feed', 'equipment', 'other'] },
      quantity: { type: 'number', example: 25 },
      unit: { type: 'string', example: 'kg' },
      cost: { type: 'number', example: 150000 },
      currency: { type: 'string', example: 'UGX' },
      supplier: { type: 'string', example: 'Agro Inputs Ltd' },
      purchasedAt: isoDate,
      applicationDate: isoDate,
      status: { type: 'string', enum: ['planned', 'applied', 'consumed', 'cancelled'] },
      notes: { type: 'string' },
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  // ── Logistics ─────────────────────────────────────────────────────────────

  LogisticsShipment: {
    type: 'object',
    properties: {
      _id: mongoId,
      shipmentNumber: { type: 'string' },
      organization: mongoId,
      from: { type: 'object', additionalProperties: true },
      to: { type: 'object', additionalProperties: true },
      status: { type: 'string', enum: ['created', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'returned'] },
      uiStatus: { type: 'string', enum: ['planned', 'in_transit', 'delivered', 'cancelled'] },
      expectedDeliveryAt: isoDate,
      actualDeliveredAt: isoDate,
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  LogisticsRoute: {
    type: 'object',
    properties: {
      _id: mongoId,
      organization: mongoId,
      origin: { type: 'string' },
      destination: { type: 'string' },
      distanceKm: { type: 'number', minimum: 0 },
      waypoints: { type: 'array', items: { type: 'string' } },
      status: { type: 'string', enum: ['draft', 'active', 'archived'] },
      uiStatus: { type: 'string', enum: ['draft', 'active', 'archived'] },
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  LogisticsVehicle: {
    type: 'object',
    properties: {
      _id: mongoId,
      organization: mongoId,
      registration: { type: 'string' },
      capacityKg: { type: 'number', minimum: 0 },
      coldChainEnabled: { type: 'boolean' },
      available: { type: 'boolean' },
      status: { type: 'string', enum: ['available', 'assigned', 'maintenance', 'inactive'] },
      uiStatus: { type: 'string', enum: ['available', 'assigned', 'maintenance', 'inactive'] },
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  LogisticsDriver: {
    type: 'object',
    properties: {
      _id: mongoId,
      organization: mongoId,
      name: { type: 'string' },
      phone: { type: 'string' },
      licenseNumber: { type: 'string' },
      available: { type: 'boolean' },
      status: { type: 'string', enum: ['available', 'assigned', 'inactive'] },
      uiStatus: { type: 'string', enum: ['available', 'assigned', 'inactive'] },
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  LogisticsTrackingEvent: {
    type: 'object',
    properties: {
      _id: mongoId,
      shipmentId: mongoId,
      organization: mongoId,
      location: { type: 'string' },
      note: { type: 'string' },
      eventType: { type: 'string' },
      recordedAt: isoDate,
      status: { type: 'string', enum: ['created', 'verified', 'closed'] },
      uiStatus: { type: 'string', enum: ['created', 'verified', 'closed'] },
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  LogisticsColdChainLog: {
    type: 'object',
    properties: {
      _id: mongoId,
      shipmentId: mongoId,
      organization: mongoId,
      temperatureC: { type: 'number' },
      thresholdC: { type: 'number' },
      violation: { type: 'boolean' },
      capturedAt: isoDate,
      status: { type: 'string', enum: ['normal', 'violation', 'resolved'] },
      uiStatus: { type: 'string', enum: ['normal', 'violation', 'resolved'] },
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  // ── Finance & Payments ───────────────────────────────────────────────────

  PaymentWallet: {
    type: 'object',
    properties: {
      _id: mongoId,
      user: mongoId,
      organization: mongoId,
      balance: { type: 'number', minimum: 0 },
      escrowBalance: { type: 'number', minimum: 0 },
      availableBalance: { type: 'number', minimum: 0 },
      currency: { type: 'string', example: 'UGX' },
      status: { type: 'string', enum: ['active', 'suspended', 'frozen', 'closed'] },
      uiStatus: { type: 'string', enum: ['active', 'frozen'] },
      kycVerified: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  PaymentTransaction: {
    type: 'object',
    properties: {
      _id: mongoId,
      transactionNumber: { type: 'string' },
      from: mongoId,
      to: mongoId,
      type: {
        type: 'string',
        enum: ['deposit', 'withdrawal', 'payment', 'refund', 'escrow_hold', 'escrow_release', 'fee', 'commission', 'transfer'],
      },
      amount: { type: 'number', minimum: 0 },
      currency: { type: 'string', example: 'UGX' },
      status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed', 'reversed', 'cancelled'] },
      uiStatus: { type: 'string', enum: ['pending', 'completed', 'failed', 'reversed'] },
      paymentMethod: { type: 'string', enum: ['wallet', 'mobile_money', 'bank_transfer', 'card', 'cash'] },
      description: { type: 'string' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  PaymentEscrow: {
    type: 'object',
    properties: {
      _id: mongoId,
      escrowNumber: { type: 'string' },
      order: mongoId,
      buyer: mongoId,
      seller: mongoId,
      amount: { type: 'number', minimum: 0 },
      currency: { type: 'string', example: 'UGX' },
      platformFee: { type: 'number', minimum: 0 },
      status: { type: 'string', enum: ['initiated', 'funded', 'held', 'released', 'refunded', 'disputed'] },
      uiStatus: { type: 'string', enum: ['created', 'funded', 'released', 'refunded', 'closed'] },
      fundedAt: isoDate,
      releasedAt: isoDate,
      refundedAt: isoDate,
      expiresAt: isoDate,
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  PaymentPayout: {
    type: 'object',
    properties: {
      _id: mongoId,
      organization: mongoId,
      createdBy: mongoId,
      wallet: mongoId,
      transaction: mongoId,
      amount: { type: 'number', minimum: 0.01 },
      currency: { type: 'string', example: 'UGX' },
      method: { type: 'string', enum: ['bank_transfer', 'mobile_money', 'cash'] },
      accountDetails: { type: 'object', additionalProperties: true },
      reference: { type: 'string' },
      status: { type: 'string', enum: ['requested', 'processing', 'paid', 'failed'] },
      uiStatus: { type: 'string', enum: ['requested', 'processing', 'paid', 'failed'] },
      failureReason: { type: 'string' },
      requestedAt: isoDate,
      processedAt: isoDate,
      paidAt: isoDate,
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  FinanceInvoice: {
    type: 'object',
    properties: {
      _id: mongoId,
      organization: mongoId,
      createdBy: mongoId,
      customerId: mongoId,
      customerName: { type: 'string' },
      invoiceNumber: { type: 'string' },
      amount: { type: 'number', minimum: 0 },
      currency: { type: 'string', example: 'UGX' },
      dueDate: isoDate,
      issuedAt: isoDate,
      paidAt: isoDate,
      status: { type: 'string', enum: ['draft', 'issued', 'paid', 'overdue', 'cancelled'] },
      uiStatus: { type: 'string', enum: ['draft', 'issued', 'paid', 'overdue', 'cancelled'] },
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  FinanceCredit: {
    type: 'object',
    properties: {
      _id: mongoId,
      organization: mongoId,
      createdBy: mongoId,
      applicantId: mongoId,
      applicantName: { type: 'string' },
      referenceCode: { type: 'string' },
      amountRequested: { type: 'number', minimum: 0.01 },
      amountApproved: { type: 'number', minimum: 0.01 },
      currency: { type: 'string', example: 'UGX' },
      status: { type: 'string', enum: ['applied', 'under_review', 'approved', 'rejected', 'disbursed'] },
      uiStatus: { type: 'string', enum: ['applied', 'under_review', 'approved', 'rejected', 'disbursed'] },
      reviewedAt: isoDate,
      disbursedAt: isoDate,
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  FinanceInsurancePolicy: {
    type: 'object',
    properties: {
      _id: mongoId,
      organization: mongoId,
      createdBy: mongoId,
      policyNumber: { type: 'string' },
      insuredEntityId: mongoId,
      insuredEntityName: { type: 'string' },
      providerName: { type: 'string' },
      coverageType: { type: 'string' },
      premiumAmount: { type: 'number', minimum: 0 },
      coverageAmount: { type: 'number', minimum: 0 },
      startDate: isoDate,
      endDate: isoDate,
      status: { type: 'string', enum: ['active', 'claim_open', 'claim_resolved', 'expired'] },
      uiStatus: { type: 'string', enum: ['active', 'claim_open', 'claim_resolved', 'expired'] },
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  FinanceInsuranceClaim: {
    type: 'object',
    properties: {
      _id: mongoId,
      policyId: mongoId,
      organization: mongoId,
      createdBy: mongoId,
      reviewedBy: mongoId,
      claimNumber: { type: 'string' },
      amountClaimed: { type: 'number', minimum: 0.01 },
      amountApproved: { type: 'number', minimum: 0 },
      reason: { type: 'string' },
      status: { type: 'string', enum: ['open', 'under_review', 'resolved', 'rejected'] },
      uiStatus: { type: 'string', enum: ['open', 'under_review', 'resolved', 'rejected'] },
      filedAt: isoDate,
      resolvedAt: isoDate,
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  // ── Aggregation ───────────────────────────────────────────────────────────

  AggregationWarehouse: {
    type: 'object',
    properties: {
      _id: mongoId,
      name: { type: 'string', example: 'Kampala Warehouse A' },
      type: { type: 'string', enum: ['collection_point', 'warehouse'] },
      status: { type: 'string', enum: ['active', 'maintenance', 'inactive'] },
      uiStatus: { type: 'string', enum: ['active', 'maintenance', 'inactive'] },
      isActive: { type: 'boolean' },
      organization: mongoId,
      address: {
        type: 'object',
        properties: {
          country: { type: 'string' },
          district: { type: 'string' },
          subCounty: { type: 'string' },
          parish: { type: 'string' },
          village: { type: 'string' },
          line1: { type: 'string' },
          line2: { type: 'string' },
        },
      },
      coordinates: {
        type: 'object',
        properties: {
          lat: { type: 'number' },
          lng: { type: 'number' },
        },
      },
      capacityTons: { type: 'number', minimum: 0 },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  AggregationStorageBin: {
    type: 'object',
    properties: {
      _id: mongoId,
      organization: mongoId,
      warehouseId: mongoId,
      name: { type: 'string' },
      capacity: { type: 'number', minimum: 0 },
      capacityUnit: { type: 'string', enum: ['kg', 'tons', 'bags', 'liters', 'units'] },
      temperatureControl: { type: 'boolean' },
      currentLoad: { type: 'number', minimum: 0 },
      status: { type: 'string', enum: ['available', 'occupied', 'maintenance'] },
      notes: { type: 'string' },
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  AggregationBatch: {
    type: 'object',
    properties: {
      _id: mongoId,
      organization: mongoId,
      commodity: { type: 'string' },
      quantity: { type: 'number', minimum: 0 },
      unit: { type: 'string', enum: ['kg', 'tons', 'bags', 'liters', 'units'] },
      grade: { type: 'string' },
      warehouseId: mongoId,
      binId: mongoId,
      receivedAt: isoDate,
      status: { type: 'string', enum: ['received', 'stored', 'dispatched', 'closed'] },
      notes: { type: 'string' },
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  AggregationQualityGrade: {
    type: 'object',
    properties: {
      _id: mongoId,
      organization: mongoId,
      batchId: mongoId,
      grade: { type: 'string' },
      notes: { type: 'string' },
      assessedBy: mongoId,
      assessedAt: isoDate,
      status: { type: 'string', enum: ['draft', 'verified', 'final'] },
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  AggregationStockMovement: {
    type: 'object',
    properties: {
      id: mongoId,
      shipmentId: mongoId,
      movementType: { type: 'string', enum: ['receive', 'transfer', 'dispatch'] },
      sourceId: mongoId,
      destinationId: mongoId,
      quantity: { type: 'number', minimum: 0 },
      status: { type: 'string', enum: ['draft', 'confirmed', 'completed', 'rejected'] },
      shipmentStatus: { type: 'string', enum: ['created', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'returned'] },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  AggregationSpoilageReport: {
    type: 'object',
    properties: {
      _id: mongoId,
      organization: mongoId,
      batchId: mongoId,
      quantity: { type: 'number', minimum: 0 },
      unit: { type: 'string', enum: ['kg', 'tons', 'bags', 'liters', 'units'] },
      cause: { type: 'string' },
      reportedAt: isoDate,
      reportedBy: mongoId,
      status: { type: 'string', enum: ['reported', 'approved', 'closed'] },
      notes: { type: 'string' },
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  // ── Organizations ──────────────────────────────────────────────────────────

  Organization: {
    type: 'object',
    properties: {
      id: mongoId,
      name: { type: 'string', example: 'Buganda Farmers Cooperative' },
      type: { type: 'string', enum: ['cooperative', 'association', 'company', 'ngo'] },
      status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
      adminId: mongoId,
      memberCount: { type: 'integer' },
      region: { type: 'string' },
      createdAt: isoDate,
    },
  },

  // ── Products ───────────────────────────────────────────────────────────────

  Product: {
    type: 'object',
    properties: {
      id: mongoId,
      name: { type: 'string', example: 'Maize' },
      category: { type: 'string', example: 'Cereals & Grains' },
      unit: { type: 'string', example: 'kg', enum: ['kg', 'ton', 'bag', 'crate', 'litre', 'piece'] },
      description: { type: 'string' },
      imageUrl: { type: 'string', format: 'uri' },
    },
  },

  ProductCreateRequest: {
    type: 'object',
    required: ['name', 'category', 'unit'],
    properties: {
      name: { type: 'string', example: 'Maize' },
      category: { type: 'string', example: 'Cereals & Grains' },
      unit: { type: 'string', enum: ['kg', 'ton', 'bag', 'crate', 'litre', 'piece'] },
      description: { type: 'string' },
    },
  },

  // ── Marketplace Listings ───────────────────────────────────────────────────

  Listing: {
    type: 'object',
    properties: {
      id: mongoId,
      farmer: mongoId,
      product: { $ref: '#/components/schemas/Product' },
      title: { type: 'string' },
      description: { type: 'string' },
      quantity: { type: 'number' },
      price: { type: 'number', description: 'Price per unit in local currency' },
      currency: { type: 'string', example: 'UGX', default: 'UGX' },
      status: { type: 'string', enum: ['active', 'pending', 'sold', 'expired', 'cancelled'] },
      uiStatus: { type: 'string', enum: ['draft', 'published', 'paused', 'closed'] },
      quality: { type: 'string', enum: ['premium', 'standard', 'economy'] },
      harvestDate: { type: 'string', format: 'date' },
      expiryDate: { type: 'string', format: 'date' },
      location: {
        type: 'object',
        properties: { region: { type: 'string' }, district: { type: 'string' } },
      },
      images: { type: 'array', items: { type: 'string', format: 'uri' } },
      createdAt: isoDate,
    },
  },

  ListingCreateRequest: {
    type: 'object',
    required: ['product', 'title', 'quantity', 'price', 'quality', 'deliveryOptions', 'location'],
    properties: {
      product: { ...mongoId, description: 'Product ID' },
      title: { type: 'string', minLength: 5, maxLength: 200 },
      description: { type: 'string' },
      quantity: { type: 'number', example: 500, description: 'Available quantity' },
      price: { type: 'number', example: 1200, description: 'Price per unit' },
      quality: { type: 'string', enum: ['premium', 'standard', 'economy'] },
      deliveryOptions: { type: 'array', items: { type: 'string' } },
      status: { type: 'string', enum: ['active', 'pending', 'sold', 'expired', 'cancelled', 'draft', 'published', 'paused', 'closed'] },
      uiStatus: { type: 'string', enum: ['draft', 'published', 'paused', 'closed'] },
      harvestDate: { type: 'string', format: 'date' },
      availableFrom: { type: 'string', format: 'date-time' },
      availableUntil: { type: 'string', format: 'date-time' },
      location: {
        type: 'object',
        required: ['region', 'district'],
        properties: { region: { type: 'string' }, district: { type: 'string' } },
      },
    },
  },

  // ── Orders ─────────────────────────────────────────────────────────────────

  Order: {
    type: 'object',
    properties: {
      id: mongoId,
      buyer: mongoId,
      farmer: mongoId,
      listing: mongoId,
      product: mongoId,
      quantity: { type: 'number' },
      unitPrice: { type: 'number' },
      totalAmount: { type: 'number' },
      finalAmount: { type: 'number' },
      currency: { type: 'string', example: 'UGX' },
      status: {
        type: 'string',
        enum: ['pending', 'confirmed', 'processing', 'in_transit', 'delivered', 'completed', 'cancelled'],
      },
      uiStatus: { type: 'string', enum: ['created', 'accepted', 'rejected', 'fulfilled', 'cancelled'] },
      paymentStatus: { type: 'string', enum: ['pending', 'paid', 'failed', 'refunded'] },
      deliveryAddress: {
        type: 'object',
        properties: { region: { type: 'string' }, district: { type: 'string' }, address: { type: 'string' } },
      },
      createdAt: isoDate,
    },
  },

  OrderCreateRequest: {
    type: 'object',
    required: ['listing', 'quantity', 'deliveryAddress'],
    properties: {
      listing: mongoId,
      quantity: { type: 'number', example: 100 },
      deliveryAddress: {
        type: 'object',
        required: ['region', 'district', 'address'],
        properties: {
          region: { type: 'string' },
          district: { type: 'string' },
          address: { type: 'string' },
        },
      },
      notes: { type: 'string' },
    },
  },

  // ── Disputes ───────────────────────────────────────────────────────────────

  Dispute: {
    type: 'object',
    properties: {
      id: mongoId,
      orderId: mongoId,
      raisedBy: mongoId,
      type: { type: 'string', enum: ['quality', 'delivery', 'payment', 'quantity', 'fraud', 'other'] },
      status: { type: 'string', enum: ['open', 'under_review', 'mediation', 'resolved', 'closed', 'escalated'] },
      description: { type: 'string' },
      evidence: { type: 'array', items: { type: 'string', format: 'uri' } },
      resolution: { type: 'string' },
      createdAt: isoDate,
    },
  },

  DisputeCreateRequest: {
    type: 'object',
    required: ['orderId', 'type', 'description'],
    properties: {
      orderId: mongoId,
      type: { type: 'string', enum: ['quality', 'delivery', 'payment', 'quantity', 'fraud', 'other'] },
      description: { type: 'string', minLength: 20, example: 'The delivered maize was of lower quality than expected.' },
      evidence: { type: 'array', items: { type: 'string', format: 'uri' } },
    },
  },

  // ── Prices ─────────────────────────────────────────────────────────────────

  Price: {
    type: 'object',
    properties: {
      id: mongoId,
      product: mongoId,
      market: mongoId,
      organization: mongoId,
      pricePerUnit: { type: 'number', example: 1500 },
      unit: { type: 'string', example: 'kg' },
      currency: { type: 'string', example: 'UGX' },
      date: { type: 'string', format: 'date' },
      source: { type: 'string', enum: ['market', 'user', 'api', 'survey'] },
      status: { type: 'string', enum: ['captured', 'validated', 'published'] },
      uiStatus: { type: 'string', enum: ['captured', 'validated', 'published'] },
      createdAt: isoDate,
    },
  },

  PriceEstimation: {
    type: 'object',
    properties: {
      _id: mongoId,
      organization: mongoId,
      createdBy: mongoId,
      productId: mongoId,
      marketId: mongoId,
      estimatedPrice: { type: 'number', minimum: 0 },
      currency: { type: 'string', example: 'UGX' },
      basis: { type: 'string' },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      status: { type: 'string', enum: ['draft', 'submitted', 'approved'] },
      uiStatus: { type: 'string', enum: ['draft', 'submitted', 'approved'] },
      submittedAt: isoDate,
      approvedAt: isoDate,
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  PricePrediction: {
    type: 'object',
    properties: {
      _id: mongoId,
      organization: mongoId,
      createdBy: mongoId,
      productId: mongoId,
      marketId: mongoId,
      horizonDays: { type: 'integer', minimum: 1, maximum: 365 },
      predictedPrice: { type: 'number', minimum: 0 },
      lowerBound: { type: 'number', minimum: 0 },
      upperBound: { type: 'number', minimum: 0 },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      modelVersion: { type: 'string' },
      currency: { type: 'string', example: 'UGX' },
      status: { type: 'string', enum: ['generated', 'compared', 'archived'] },
      uiStatus: { type: 'string', enum: ['generated', 'compared', 'archived'] },
      generatedAt: isoDate,
      comparedAt: isoDate,
      archivedAt: isoDate,
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  MarketSignal: {
    type: 'object',
    properties: {
      _id: mongoId,
      user: mongoId,
      organization: mongoId,
      product: mongoId,
      region: { type: 'string' },
      district: { type: 'string' },
      alertType: { type: 'string', enum: ['price_drop', 'price_increase', 'target_price', 'availability'] },
      condition: {
        type: 'object',
        properties: {
          operator: { type: 'string', enum: ['below', 'above', 'equals', 'changes_by'] },
          threshold: { type: 'number' },
          percentage: { type: 'number' },
        },
      },
      notificationChannels: {
        type: 'array',
        items: { type: 'string', enum: ['email', 'sms', 'push', 'in_app'] },
      },
      active: { type: 'boolean' },
      status: { type: 'string', enum: ['new', 'investigating', 'investigated', 'dismissed'] },
      uiStatus: { type: 'string', enum: ['new', 'investigating', 'investigated', 'dismissed'] },
      lastTriggered: isoDate,
      triggerCount: { type: 'integer' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  MarketRecommendation: {
    type: 'object',
    properties: {
      _id: mongoId,
      organization: mongoId,
      createdBy: mongoId,
      productId: mongoId,
      marketId: mongoId,
      region: { type: 'string' },
      recommendationType: { type: 'string' },
      recommendedPrice: { type: 'number', minimum: 0 },
      currency: { type: 'string', example: 'UGX' },
      rationale: { type: 'string' },
      status: { type: 'string', enum: ['draft', 'approved', 'published', 'retracted'] },
      uiStatus: { type: 'string', enum: ['draft', 'approved', 'published', 'retracted'] },
      approvedAt: isoDate,
      publishedAt: isoDate,
      retractedAt: isoDate,
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  MarketDataSource: {
    type: 'object',
    properties: {
      _id: mongoId,
      organization: mongoId,
      createdBy: mongoId,
      name: { type: 'string' },
      provider: { type: 'string' },
      endpoint: { type: 'string' },
      status: { type: 'string', enum: ['active', 'paused', 'disabled'] },
      uiStatus: { type: 'string', enum: ['active', 'paused', 'disabled'] },
      authType: { type: 'string', enum: ['none', 'api_key', 'oauth2'] },
      pullIntervalMinutes: { type: 'integer', minimum: 1 },
      lastRefreshAt: isoDate,
      lastRefreshStatus: { type: 'string', enum: ['success', 'failed'] },
      lastError: { type: 'string' },
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  // ── Markets ────────────────────────────────────────────────────────────────

  Market: {
    type: 'object',
    properties: {
      id: mongoId,
      name: { type: 'string', example: 'Owino Market' },
      location: {
        type: 'object',
        properties: { region: { type: 'string' }, district: { type: 'string' }, coordinates: { type: 'object', properties: { lat: { type: 'number' }, lng: { type: 'number' } } } },
      },
      type: { type: 'string', enum: ['wholesale', 'retail', 'terminal'] },
      active: { type: 'boolean' },
      createdAt: isoDate,
    },
  },

  // ── Notifications ──────────────────────────────────────────────────────────

  Notification: {
    type: 'object',
    properties: {
      id: mongoId,
      userId: mongoId,
      type: { type: 'string', example: 'order_confirmed' },
      channel: { type: 'string', enum: ['in_app', 'email', 'sms', 'push'] },
      title: { type: 'string' },
      body: { type: 'string' },
      status: { type: 'string', enum: ['pending', 'sent', 'delivered', 'read', 'failed', 'archived'] },
      readAt: isoDate,
      createdAt: isoDate,
    },
  },

  NotificationPreferences: {
    type: 'object',
    properties: {
      channels: {
        type: 'object',
        properties: {
          email: { type: 'boolean' },
          sms: { type: 'boolean' },
          push: { type: 'boolean' },
          inApp: { type: 'boolean' },
        },
      },
      types: {
        type: 'object',
        additionalProperties: { type: 'boolean' },
        description: 'Map of notification type keys to enabled/disabled',
      },
    },
  },

  // ── Messaging ──────────────────────────────────────────────────────────────

  Conversation: {
    type: 'object',
    properties: {
      id: mongoId,
      participants: { type: 'array', items: mongoId },
      type: { type: 'string', enum: ['farmer_expert', 'buyer_seller', 'support', 'group', 'system'] },
      title: { type: 'string' },
      lastMessage: { type: 'string' },
      unreadCount: { type: 'integer' },
      isLocked: { type: 'boolean' },
      isArchived: { type: 'boolean' },
      negotiationStatus: { type: 'string', enum: ['open', 'agreed', 'stalled', 'closed'] },
      uiStatus: { type: 'string', enum: ['open', 'agreed', 'stalled', 'closed'] },
      createdAt: isoDate,
    },
  },

  MarketplaceContract: {
    type: 'object',
    properties: {
      _id: mongoId,
      contractNumber: { type: 'string', example: 'CTR-2603-000001' },
      organization: mongoId,
      listing: mongoId,
      order: mongoId,
      offer: mongoId,
      title: { type: 'string' },
      terms: { type: 'string' },
      valueAmount: { type: 'number' },
      currency: { type: 'string', example: 'UGX' },
      startDate: isoDate,
      endDate: isoDate,
      parties: { type: 'array', items: mongoId },
      signatures: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            user: mongoId,
            signedAt: isoDate,
            note: { type: 'string' },
          },
        },
      },
      status: { type: 'string', enum: ['draft', 'under_review', 'active', 'completed', 'terminated'] },
      uiStatus: { type: 'string', enum: ['draft', 'under_review', 'active', 'completed', 'terminated'] },
      isActive: { type: 'boolean' },
      createdBy: mongoId,
      lastModifiedBy: mongoId,
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  Message: {
    type: 'object',
    properties: {
      id: mongoId,
      conversationId: mongoId,
      senderId: mongoId,
      content: { type: 'string' },
      contentType: { type: 'string', enum: ['text', 'image', 'file', 'audio', 'system'] },
      isFlagged: { type: 'boolean' },
      isDeleted: { type: 'boolean' },
      reactions: {
        type: 'array',
        items: {
          type: 'object',
          properties: { emoji: { type: 'string' }, userId: mongoId, count: { type: 'integer' } },
        },
      },
      createdAt: isoDate,
    },
  },

  // ── Analytics ─────────────────────────────────────────────────────────────

  ChartDefinition: {
    type: 'object',
    required: ['datasetId', 'metrics', 'chartType'],
    properties: {
      datasetId: {
        type: 'string',
        enum: [
          'market_sales_daily', 'market_sales_weekly', 'farmer_performance', 'org_performance',
          'product_demand', 'price_trends', 'pest_disease_outbreaks', 'weather_alerts',
          'user_adoption', 'order_funnel', 'advisory_engagement', 'export_data',
          'dispute_resolution', 'payment_metrics', 'listing_analytics',
          'notification_delivery', 'platform_health',
        ],
        example: 'price_trends',
      },
      metrics: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['type'],
          properties: {
            type: { type: 'string', enum: ['count', 'sum', 'avg', 'min', 'max', 'distinct_count', 'rate', 'growth_rate', 'percentile', 'stddev'] },
            field: { type: 'string', example: 'totalAmount' },
            alias: { type: 'string', example: 'revenue' },
          },
        },
      },
      dimensions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['date_day', 'date_week', 'date_month', 'date_quarter', 'date_year', 'region', 'district', 'product', 'category', 'farmer', 'organization', 'status', 'channel', 'role', 'crop_type', 'market', 'expert', 'disease_type', 'alert_type', 'payment_method', 'dispute_type'] },
            field: { type: 'string' },
            alias: { type: 'string' },
          },
        },
      },
      chartType: {
        type: 'string',
        enum: ['line', 'bar', 'pie', 'donut', 'scatter', 'heatmap', 'funnel', 'gauge', 'table', 'area', 'stacked_bar', 'combo'],
        example: 'line',
      },
      filters: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            operator: { type: 'string', enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'contains', 'between'] },
            value: {},
          },
        },
      },
      vizOptions: {
        type: 'object',
        properties: {
          limit: { type: 'integer', maximum: 1000, default: 100 },
          showLegend: { type: 'boolean' },
          title: { type: 'string' },
          colorScheme: { type: 'string', enum: ['default', 'green', 'earth', 'blue', 'muted'] },
        },
      },
    },
  },

  Chart: {
    type: 'object',
    properties: {
      id: mongoId,
      name: { type: 'string' },
      description: { type: 'string' },
      ownerId: mongoId,
      definition: { $ref: '#/components/schemas/ChartDefinition' },
      currentVersion: { type: 'integer' },
      shareScope: { type: 'string', enum: ['owner_only', 'org_members', 'specific_roles', 'specific_users', 'public'] },
      tags: { type: 'array', items: { type: 'string' } },
      isTemplate: { type: 'boolean' },
      createdAt: isoDate,
    },
  },

  Dashboard: {
    type: 'object',
    properties: {
      id: mongoId,
      name: { type: 'string' },
      ownerId: mongoId,
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            chartId: mongoId,
            position: { type: 'object', properties: { col: { type: 'integer' }, row: { type: 'integer' } } },
            size: { type: 'object', properties: { w: { type: 'integer' }, h: { type: 'integer' } } },
          },
        },
      },
      sharing: {
        type: 'object',
        properties: {
          scope: { type: 'string', enum: ['owner_only', 'org_members', 'specific_roles', 'specific_users', 'public'] },
          roles: { type: 'array', items: { type: 'string' } },
        },
      },
      isTemplate: { type: 'boolean' },
      createdAt: isoDate,
    },
  },

  QueryResult: {
    type: 'object',
    properties: {
      rows: { type: 'array', items: { type: 'object', additionalProperties: true } },
      total: { type: 'integer' },
      truncated: { type: 'boolean', description: 'True if privacy threshold suppressed some rows' },
      cached: { type: 'boolean' },
      executionMs: { type: 'integer' },
    },
  },

  // ── Pest & Disease ─────────────────────────────────────────────────────────

  PestDiseaseReport: {
    type: 'object',
    properties: {
      id: mongoId,
      farmerId: mongoId,
      farmId: mongoId,
      cropType: { type: 'string', example: 'Maize' },
      reportType: { type: 'string', enum: ['pest', 'disease', 'nutrient_deficiency', 'weather_damage'] },
      aiDetection: {
        type: 'object',
        properties: {
          detectedIssue: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          recommendations: { type: 'array', items: { type: 'string' } },
        },
      },
      reportStatus: { type: 'string', enum: ['pending', 'processing', 'completed', 'expert_review', 'confirmed', 'rejected', 'archived'] },
      uiStatus: { type: 'string', enum: ['created', 'assigned', 'resolved', 'closed'] },
      assignedTo: mongoId,
      assignedBy: mongoId,
      assignedAt: isoDate,
      assignmentNotes: { type: 'string' },
      closedAt: isoDate,
      closeReason: { type: 'string' },
      location: { type: 'object', properties: { region: { type: 'string' } } },
      imageUrls: { type: 'array', items: { type: 'string', format: 'uri' } },
      createdAt: isoDate,
    },
  },

  // ── Expert Portal ──────────────────────────────────────────────────────────

  ExpertProfile: {
    type: 'object',
    properties: {
      id: mongoId,
      userId: mongoId,
      specializations: { type: 'array', items: { type: 'string' }, example: ['soil health', 'pest control'] },
      yearsExperience: { type: 'integer' },
      certifications: { type: 'array', items: { type: 'string' } },
      hourlyRate: { type: 'number' },
      currency: { type: 'string', example: 'UGX' },
      rating: { type: 'number', minimum: 0, maximum: 5 },
      totalCases: { type: 'integer' },
      availability: { type: 'string', enum: ['available', 'busy', 'away', 'offline'] },
      createdAt: isoDate,
    },
  },

  ExpertAdvisory: {
    type: 'object',
    properties: {
      _id: mongoId,
      title: { type: 'string' },
      message: { type: 'string' },
      type: { type: 'string' },
      urgency: { type: 'string', enum: ['low', 'medium', 'high', 'critical', 'emergency'] },
      status: { type: 'string', enum: ['draft', 'submitted', 'approved', 'rejected', 'scheduled', 'sent', 'cancelled'] },
      uiStatus: { type: 'string', enum: ['draft', 'in_review', 'approved', 'rejected', 'published', 'acknowledged'] },
      targetRegions: { type: 'array', items: { type: 'string' } },
      targetCrops: { type: 'array', items: { type: 'string' } },
      acknowledgedCount: { type: 'integer' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  KnowledgeArticle: {
    type: 'object',
    properties: {
      _id: mongoId,
      title: { type: 'string' },
      slug: { type: 'string' },
      summary: { type: 'string' },
      content: { type: 'string' },
      category: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' } },
      cropTypes: { type: 'array', items: { type: 'string' } },
      regions: { type: 'array', items: { type: 'string' } },
      status: { type: 'string', enum: ['draft', 'under_review', 'approved', 'rejected', 'published', 'archived'] },
      uiStatus: { type: 'string', enum: ['draft', 'in_review', 'approved', 'rejected', 'published', 'unpublished', 'archived'] },
      viewCount: { type: 'integer' },
      helpfulCount: { type: 'integer' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  FieldCase: {
    type: 'object',
    properties: {
      _id: mongoId,
      caseNumber: { type: 'string' },
      title: { type: 'string' },
      description: { type: 'string' },
      source: { type: 'string', enum: ['workspace', 'inquiry', 'ai_report', 'legacy_case_review'] },
      region: { type: 'string' },
      cropType: { type: 'string' },
      assignedExpertUser: mongoId,
      status: { type: 'string', enum: ['created', 'assigned', 'in_visit', 'resolved', 'closed', 'pending', 'in_review', 'escalated', 'reviewed'] },
      uiStatus: { type: 'string', enum: ['created', 'assigned', 'in_visit', 'resolved', 'closed'] },
      priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      resolution: { type: 'string' },
      closeReason: { type: 'string' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  ExpertAssignment: {
    type: 'object',
    properties: {
      assignmentId: mongoId,
      caseId: mongoId,
      caseNumber: { type: 'string' },
      title: { type: 'string' },
      expertId: mongoId,
      assignedBy: mongoId,
      assignedAt: isoDate,
      completedAt: isoDate,
      status: { type: 'string', enum: ['created', 'assigned', 'completed', 'cancelled'] },
      uiStatus: { type: 'string', enum: ['created', 'assigned', 'completed', 'cancelled'] },
      metadata: { type: 'object', additionalProperties: true },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  ExpertReviewQueueItem: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'advisory:507f1f77bcf86cd799439011' },
      itemType: { type: 'string', enum: ['advisory', 'knowledge', 'field_case', 'research_report'] },
      resourceId: mongoId,
      title: { type: 'string' },
      status: { type: 'string', enum: ['queued', 'in_review', 'approved', 'rejected'] },
      uiStatus: { type: 'string', enum: ['queued', 'in_review', 'approved', 'rejected'] },
      createdAt: isoDate,
      submittedAt: isoDate,
      metadata: { type: 'object', additionalProperties: true },
    },
  },

  ResearchReport: {
    type: 'object',
    properties: {
      _id: mongoId,
      title: { type: 'string' },
      summary: { type: 'string' },
      content: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' } },
      relatedCaseId: mongoId,
      status: { type: 'string', enum: ['draft', 'in_review', 'published', 'archived'] },
      uiStatus: { type: 'string', enum: ['draft', 'in_review', 'published', 'archived'] },
      submittedAt: isoDate,
      publishedAt: isoDate,
      archivedAt: isoDate,
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  // ── Weather ────────────────────────────────────────────────────────────────

  WeatherProfile: {
    type: 'object',
    properties: {
      _id: mongoId,
      farmId: mongoId,
      farmerId: mongoId,
      organizationId: mongoId,
      farmName: { type: 'string' },
      geoLocation: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['Point'] },
          coordinates: { type: 'array', minItems: 2, maxItems: 2, items: { type: 'number' } },
        },
      },
      altitude: { type: 'number' },
      timezone: { type: 'string' },
      preferredUnits: { type: 'string', enum: ['metric', 'imperial'] },
      primaryCropTypes: { type: 'array', items: { type: 'string' } },
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  WeatherSensorReading: {
    type: 'object',
    properties: {
      _id: mongoId,
      farmId: mongoId,
      profileId: mongoId,
      timestamp: isoDate,
      status: { type: 'string', enum: ['captured', 'flagged', 'verified'] },
      statusReason: { type: 'string' },
      flaggedAt: isoDate,
      flaggedBy: mongoId,
      verifiedAt: isoDate,
      verifiedBy: mongoId,
      reading: {
        type: 'object',
        properties: {
          temperatureCelsius: { type: 'number' },
          humidity: { type: 'number' },
          rainfallMm: { type: 'number' },
          rainfallMmPerHour: { type: 'number' },
          windSpeedKph: { type: 'number' },
          windDirectionDeg: { type: 'number' },
          uvIndex: { type: 'number' },
          pressureHPa: { type: 'number' },
        },
      },
      qualityFlags: { type: 'array', items: { type: 'string' } },
      dataSource: { type: 'string', enum: ['open_weather_map', 'tomorrow_io', 'weatherapi', 'meteomatics', 'manual', 'cached', 'iot_device'] },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  WeatherAlert: {
    type: 'object',
    properties: {
      _id: mongoId,
      farmId: mongoId,
      farmerId: mongoId,
      organizationId: mongoId,
      alertType: { type: 'string', enum: ['heavy_rain', 'drought_risk', 'heat_wave', 'frost', 'storm', 'strong_wind', 'flood_risk', 'high_humidity', 'low_humidity', 'uv_hazard', 'cold_snap', 'hail'] },
      severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      status: { type: 'string', enum: ['new', 'sent', 'acknowledged', 'expired', 'dismissed'] },
      uiStatus: { type: 'string', enum: ['new', 'acknowledged', 'escalated', 'resolved'] },
      advisoryMessage: { type: 'string' },
      recommendedActions: { type: 'array', items: { type: 'string' } },
      triggeredBy: { type: 'string', enum: ['system', 'manual'] },
      acknowledgedAt: isoDate,
      acknowledgedBy: mongoId,
      resolvedAt: isoDate,
      resolvedBy: mongoId,
      reason: { type: 'string' },
      expiresAt: isoDate,
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  WeatherRule: {
    type: 'object',
    properties: {
      _id: mongoId,
      organizationId: mongoId,
      name: { type: 'string' },
      description: { type: 'string' },
      alertType: { type: 'string', enum: ['heavy_rain', 'drought_risk', 'heat_wave', 'frost', 'storm', 'strong_wind', 'flood_risk', 'high_humidity', 'low_humidity', 'uv_hazard', 'cold_snap', 'hail'] },
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
      priority: { type: 'number' },
      isActive: { type: 'boolean' },
      status: { type: 'string', enum: ['draft', 'active', 'disabled'] },
      uiStatus: { type: 'string', enum: ['draft', 'active', 'disabled'] },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  // ── Media ──────────────────────────────────────────────────────────────────

  MediaFile: {
    type: 'object',
    properties: {
      id: mongoId,
      originalName: { type: 'string' },
      mimeType: { type: 'string', example: 'image/jpeg' },
      size: { type: 'integer', description: 'Size in bytes' },
      url: { type: 'string', format: 'uri' },
      key: { type: 'string', description: 'Storage key for signed URL retrieval' },
      scope: { type: 'string', enum: ['public', 'private', 'org'] },
      linkedModel: { type: 'string', example: 'PestDiseaseReport' },
      linkedId: mongoId,
      uploadedBy: mongoId,
      createdAt: isoDate,
    },
  },

};

// ─── Common Responses ──────────────────────────────────────────────────────────

export const responses: Record<string, OpenAPIV3_1.ResponseObject> = {
  Unauthorized: {
    description: 'Authentication required or token expired.',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } } } },
  },
  Forbidden: {
    description: 'Insufficient permissions to perform this action.',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } } } },
  },
  NotFound: {
    description: 'The requested resource was not found.',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: { success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } } } },
  },
  ValidationError: {
    description: 'Request body or query parameters failed validation.',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: { success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: [{ field: 'email', message: 'Invalid email format' }] } } } },
  },
  TooManyRequests: {
    description: 'Rate limit exceeded. Default: 100 requests per 15 minutes.',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
  InternalError: {
    description: 'An unexpected server error occurred.',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
};
