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
      quantity: { type: 'number' },
      price: { type: 'number', description: 'Price per unit in local currency' },
      currency: { type: 'string', example: 'UGX', default: 'UGX' },
      status: { type: 'string', enum: ['active', 'sold', 'expired', 'draft'] },
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
    required: ['product', 'quantity', 'price'],
    properties: {
      product: { ...mongoId, description: 'Product ID' },
      quantity: { type: 'number', example: 500, description: 'Available quantity' },
      price: { type: 'number', example: 1200, description: 'Price per unit' },
      currency: { type: 'string', example: 'UGX' },
      harvestDate: { type: 'string', format: 'date' },
      expiryDate: { type: 'string', format: 'date' },
      location: {
        type: 'object',
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
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'],
      },
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
    required: ['listingId', 'quantity', 'deliveryAddress'],
    properties: {
      listingId: mongoId,
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
      pricePerUnit: { type: 'number', example: 1500 },
      unit: { type: 'string', example: 'kg' },
      currency: { type: 'string', example: 'UGX' },
      date: { type: 'string', format: 'date' },
      source: { type: 'string', enum: ['market', 'user', 'api', 'survey'] },
      createdAt: isoDate,
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
      type: { type: 'string', enum: ['direct', 'group', 'support', 'expert_consultation', 'order_chat'] },
      title: { type: 'string' },
      lastMessage: { type: 'string' },
      unreadCount: { type: 'integer' },
      isArchived: { type: 'boolean' },
      createdAt: isoDate,
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

  KnowledgeArticle: {
    type: 'object',
    properties: {
      id: mongoId,
      title: { type: 'string' },
      category: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' } },
      content: { type: 'string' },
      authorId: mongoId,
      views: { type: 'integer' },
      published: { type: 'boolean' },
      createdAt: isoDate,
    },
  },

  // ── Weather ────────────────────────────────────────────────────────────────

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
      id: mongoId,
      alertType: { type: 'string', enum: ['drought', 'flood', 'frost', 'heatwave', 'storm', 'disease_risk'] },
      severity: { type: 'string', enum: ['advisory', 'watch', 'warning', 'emergency'] },
      region: { type: 'string' },
      message: { type: 'string' },
      startDate: isoDate,
      endDate: isoDate,
      isActive: { type: 'boolean' },
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
