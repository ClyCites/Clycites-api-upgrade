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
    description: 'JWT access token issued on login. Expires in 15 minutes.',
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
        properties: { timestamp: { type: 'string', format: 'date-time' } },
      },
    },
  },

  SuccessResponse: {
    type: 'object',
    required: ['success', 'message'],
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Success' },
      data: {},
      meta: {
        type: 'object',
        properties: {
          timestamp: isoDate,
          pagination: paginationMeta,
        },
      },
    },
  },

  PaginationMeta: paginationMeta,

  // ── Auth ───────────────────────────────────────────────────────────────────

  RegisterRequest: {
    type: 'object',
    required: ['email', 'password', 'firstName', 'lastName', 'role'],
    properties: {
      firstName: { type: 'string', example: 'Amara' },
      lastName: { type: 'string', example: 'Nakato' },
      email: { type: 'string', format: 'email', example: 'amara@clycites.com' },
      phone: { type: 'string', example: '+256700123456' },
      password: { type: 'string', format: 'password', minLength: 8, example: 'P@ssw0rd123' },
      role: { type: 'string', enum: ['farmer', 'buyer', 'trader', 'expert', 'org_admin', 'admin'], example: 'farmer' },
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
      role: { type: 'string', enum: ['farmer', 'buyer', 'trader', 'expert', 'org_admin', 'admin', 'platform_admin'] },
      isVerified: { type: 'boolean' },
      isActive: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },

  // ── Farmers ────────────────────────────────────────────────────────────────

  FarmerProfile: {
    type: 'object',
    properties: {
      id: mongoId,
      userId: mongoId,
      businessName: { type: 'string', example: 'Green Valley Farm' },
      description: { type: 'string' },
      location: {
        type: 'object',
        properties: {
          region: { type: 'string', example: 'Central Uganda' },
          district: { type: 'string', example: 'Kampala' },
          village: { type: 'string' },
          coordinates: {
            type: 'object',
            properties: { lat: { type: 'number' }, lng: { type: 'number' } },
          },
        },
      },
      farmSize: { type: 'number', description: 'Size in acres' },
      cropTypes: { type: 'array', items: { type: 'string' } },
      verified: { type: 'boolean' },
      rating: { type: 'number', minimum: 0, maximum: 5 },
      organizationId: mongoId,
      createdAt: isoDate,
    },
  },

  FarmerCreateRequest: {
    type: 'object',
    required: ['businessName', 'location'],
    properties: {
      businessName: { type: 'string', example: 'Green Valley Farm' },
      description: { type: 'string' },
      location: {
        type: 'object',
        required: ['region', 'district'],
        properties: {
          region: { type: 'string' },
          district: { type: 'string' },
          village: { type: 'string' },
          coordinates: {
            type: 'object',
            properties: { lat: { type: 'number' }, lng: { type: 'number' } },
          },
        },
      },
      farmSize: { type: 'number' },
      cropTypes: { type: 'array', items: { type: 'string' } },
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
      status: { type: 'string', enum: ['pending', 'analyzed', 'verified', 'resolved'] },
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
