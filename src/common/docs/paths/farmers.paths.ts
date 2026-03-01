const auth = [{ BearerAuth: [] }];
const r = (schema: object) => ({ required: true, content: { 'application/json': { schema } } });
const ok = (desc: string, data?: object) => ({
  200: {
    description: desc,
    content: {
      'application/json': {
        schema: {
          allOf: [
            { $ref: '#/components/schemas/SuccessResponse' },
            ...(data ? [{ type: 'object', properties: { data } }] : []),
          ],
        },
      },
    },
  },
  400: { $ref: '#/components/responses/ValidationError' },
  401: { $ref: '#/components/responses/Unauthorized' },
  500: { $ref: '#/components/responses/InternalError' },
});
const created = (desc: string, data: object) => ({
  201: {
    description: desc,
    content: {
      'application/json': {
        schema: {
          allOf: [
            { $ref: '#/components/schemas/SuccessResponse' },
            { type: 'object', properties: { data } },
          ],
        },
      },
    },
  },
  400: { $ref: '#/components/responses/ValidationError' },
  401: { $ref: '#/components/responses/Unauthorized' },
  500: { $ref: '#/components/responses/InternalError' },
});
const paged = (desc: string, itemRef: string) => ok(desc, { type: 'array', items: { $ref: itemRef } });
const idParam = { $ref: '#/components/parameters/mongoIdPath' };
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };
const farmerIdParam = {
  name: 'farmerId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};
const farmIdParam = {
  name: 'farmId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};
const plotIdParam = {
  name: 'plotId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};
const cropIdParam = {
  name: 'cropId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};
const inputIdParam = {
  name: 'inputId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};
const profileIdParam = {
  name: 'id',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[a-f0-9]{24}$' },
};

export const farmersPaths: Record<string, unknown> = {
  // == Enterprise Farmer Profiles ============================================

  '/api/v1/farmers/profiles': {
    post: {
      tags: ['Farmers'],
      summary: 'Create farmer profile',
      operationId: 'createFarmerProfile',
      security: auth,
      requestBody: r({ $ref: '#/components/schemas/FarmerCreateRequest' }),
      responses: {
        ...created('Farmer profile created.', { $ref: '#/components/schemas/FarmerProfile' }),
        409: { description: 'Farmer profile already exists.' },
      },
    },
    get: {
      tags: ['Farmers'],
      summary: 'List farmer profiles',
      operationId: 'listFarmerProfiles',
      security: auth,
      parameters: [
        pageParam,
        limitParam,
        { name: 'farmerType', in: 'query', schema: { type: 'string', enum: ['individual', 'cooperative_member', 'enterprise_grower', 'contract_farmer'] } },
        { name: 'region', in: 'query', schema: { type: 'string' } },
        { name: 'district', in: 'query', schema: { type: 'string' } },
        {
          name: 'verificationStatus',
          in: 'query',
          schema: { type: 'string', enum: ['draft', 'submitted', 'verified', 'rejected'] },
          description: 'Preferred lifecycle filter. If provided with verified, verificationStatus takes precedence.',
        },
        { name: 'verified', in: 'query', schema: { type: 'boolean' }, description: 'Legacy compatibility filter.' },
        { name: 'organizationId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
      ],
      responses: { ...paged('Farmer profiles list.', '#/components/schemas/FarmerProfile') },
    },
  },

  '/api/v1/farmers/profiles/me': {
    get: {
      tags: ['Farmers'],
      summary: 'Get my farmer profile',
      operationId: 'getMyFarmerProfile',
      security: auth,
      responses: {
        ...ok('My farmer profile.', { $ref: '#/components/schemas/FarmerProfile' }),
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/farmers/profiles/{id}': {
    get: {
      tags: ['Farmers'],
      summary: 'Get farmer profile by ID',
      operationId: 'getFarmerProfile',
      security: auth,
      parameters: [profileIdParam],
      responses: {
        ...ok('Farmer profile.', { $ref: '#/components/schemas/FarmerProfile' }),
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Farmers'],
      summary: 'Update farmer profile',
      operationId: 'updateFarmerProfile',
      security: auth,
      parameters: [profileIdParam],
      requestBody: r({ $ref: '#/components/schemas/FarmerCreateRequest' }),
      responses: {
        ...ok('Updated farmer profile.', { $ref: '#/components/schemas/FarmerProfile' }),
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
    delete: {
      tags: ['Farmers'],
      summary: 'Soft-delete farmer profile',
      operationId: 'deleteFarmerProfile',
      security: auth,
      parameters: [profileIdParam],
      responses: {
        ...ok('Farmer profile deleted.', { type: 'null' }),
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/farmers/profiles/{id}/verify/submit': {
    post: {
      tags: ['Farmers'],
      summary: 'Submit profile for verification',
      operationId: 'submitFarmerProfileForVerification',
      security: auth,
      parameters: [profileIdParam],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/FarmerVerificationSubmitRequest' },
            examples: {
              default: { value: { notes: 'Please review KYC documents.' } },
            },
          },
        },
      },
      responses: {
        ...ok('Submitted for verification.', { $ref: '#/components/schemas/FarmerProfile' }),
        400: { $ref: '#/components/responses/ValidationError' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/farmers/profiles/{id}/verify': {
    post: {
      tags: ['Farmers', 'Admin'],
      summary: 'Verify or reject farmer profile',
      operationId: 'verifyFarmerProfile',
      security: auth,
      parameters: [profileIdParam],
      requestBody: {
        ...r({ $ref: '#/components/schemas/FarmerVerificationDecisionRequest' }),
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/FarmerVerificationDecisionRequest' },
            examples: {
              verify: { value: { status: 'verified', reason: 'Identity validated.' } },
              reject: { value: { status: 'rejected', reason: 'Mismatched ID information.' } },
            },
          },
        },
      },
      responses: {
        ...ok('Verification decision applied.', { $ref: '#/components/schemas/FarmerProfile' }),
        400: { $ref: '#/components/responses/ValidationError' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  // == Farms ================================================================

  '/api/v1/farmers/{farmerId}/farms': {
    post: {
      tags: ['Farmers'],
      summary: 'Create a farm for a farmer',
      operationId: 'createFarmerFarm',
      security: auth,
      parameters: [farmerIdParam],
      requestBody: r({
        type: 'object',
        required: ['farmName', 'totalSize', 'ownershipType', 'location'],
        properties: {
          farmName: { type: 'string' },
          totalSize: { type: 'number', minimum: 0.01 },
          sizeUnit: { type: 'string', enum: ['acres', 'hectares', 'square_meters'] },
          ownershipType: { type: 'string', enum: ['owned', 'leased', 'communal', 'family_land', 'rented', 'sharecropping'] },
          location: {
            type: 'object',
            properties: {
              country: { type: 'string' },
              region: { type: 'string' },
              district: { type: 'string' },
            },
          },
        },
      }),
      responses: { ...created('Farm created.', { $ref: '#/components/schemas/FarmerFarm' }) },
    },
    get: {
      tags: ['Farmers'],
      summary: 'Get farms for a farmer',
      operationId: 'getFarmerFarms',
      security: auth,
      parameters: [farmerIdParam],
      responses: { ...paged('Farmer farms.', '#/components/schemas/FarmerFarm') },
    },
  },

  '/api/v1/farmers/farms/{farmId}': {
    get: {
      tags: ['Farmers'],
      summary: 'Get farm by ID',
      operationId: 'getFarmById',
      security: auth,
      parameters: [farmIdParam],
      responses: {
        ...ok('Farm retrieved.', { $ref: '#/components/schemas/FarmerFarm' }),
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Farmers'],
      summary: 'Update farm details',
      operationId: 'updateFarm',
      security: auth,
      parameters: [farmIdParam],
      requestBody: r({
        type: 'object',
        properties: {
          farmName: { type: 'string' },
          totalSize: { type: 'number', minimum: 0.01 },
          operationalStatus: { type: 'string', enum: ['active', 'inactive', 'fallow', 'under_development', 'abandoned'] },
        },
      }),
      responses: {
        ...ok('Farm updated.', { $ref: '#/components/schemas/FarmerFarm' }),
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
    delete: {
      tags: ['Farmers'],
      summary: 'Soft delete farm',
      operationId: 'deleteFarm',
      security: auth,
      parameters: [farmIdParam],
      responses: {
        ...ok('Farm deleted.', { type: 'null' }),
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  // == Plots ================================================================

  '/api/v1/farmers/{farmerId}/plots': {
    get: {
      tags: ['Farmers'],
      summary: 'List plots for farmer',
      operationId: 'listFarmerPlots',
      security: auth,
      parameters: [farmerIdParam],
      responses: { ...paged('Farmer plots.', '#/components/schemas/FarmerPlot') },
    },
    post: {
      tags: ['Farmers'],
      summary: 'Create plot for farmer',
      operationId: 'createFarmerPlot',
      security: auth,
      parameters: [farmerIdParam],
      requestBody: r({
        type: 'object',
        required: ['plotName', 'area', 'areaUnit'],
        properties: {
          farmId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          plotName: { type: 'string' },
          area: { type: 'number', minimum: 0.01 },
          areaUnit: { type: 'string', enum: ['acres', 'hectares', 'square_meters'] },
          soilType: { type: 'string' },
          status: { type: 'string', enum: ['active', 'fallow', 'inactive'] },
          notes: { type: 'string' },
        },
      }),
      responses: { ...created('Plot created.', { $ref: '#/components/schemas/FarmerPlot' }) },
    },
  },

  '/api/v1/farmers/plots/{plotId}': {
    get: {
      tags: ['Farmers'],
      summary: 'Get plot by ID',
      operationId: 'getPlotById',
      security: auth,
      parameters: [plotIdParam],
      responses: {
        ...ok('Plot retrieved.', { $ref: '#/components/schemas/FarmerPlot' }),
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Farmers'],
      summary: 'Update plot',
      operationId: 'updatePlot',
      security: auth,
      parameters: [plotIdParam],
      requestBody: r({
        type: 'object',
        properties: {
          farmId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          plotName: { type: 'string' },
          area: { type: 'number', minimum: 0.01 },
          areaUnit: { type: 'string', enum: ['acres', 'hectares', 'square_meters'] },
          soilType: { type: 'string' },
          status: { type: 'string', enum: ['active', 'fallow', 'inactive'] },
          notes: { type: 'string' },
        },
      }),
      responses: { ...ok('Plot updated.', { $ref: '#/components/schemas/FarmerPlot' }) },
    },
    delete: {
      tags: ['Farmers'],
      summary: 'Soft delete plot',
      operationId: 'deletePlot',
      security: auth,
      parameters: [plotIdParam],
      responses: { ...ok('Plot deleted.', { type: 'null' }) },
    },
  },

  // == Crops ================================================================

  '/api/v1/farmers/{farmerId}/production/crops': {
    get: {
      tags: ['Farmers'],
      summary: 'List crop production records',
      operationId: 'listFarmerCrops',
      security: auth,
      parameters: [
        farmerIdParam,
        pageParam,
        limitParam,
        { name: 'year', in: 'query', schema: { type: 'integer' } },
        { name: 'season', in: 'query', schema: { type: 'string' } },
        { name: 'cropName', in: 'query', schema: { type: 'string' } },
      ],
      responses: { ...paged('Crop production records.', '#/components/schemas/FarmerCropProduction') },
    },
    post: {
      tags: ['Farmers'],
      summary: 'Record crop production',
      operationId: 'recordCropProduction',
      security: auth,
      parameters: [farmerIdParam],
      requestBody: r({
        type: 'object',
        required: ['farmId', 'cropName', 'cropCategory', 'season', 'year', 'areaPlanted', 'areaUnit', 'estimatedYield', 'yieldUnit'],
        properties: {
          farmId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          cropName: { type: 'string' },
          cropCategory: { type: 'string', enum: ['cereals', 'legumes', 'vegetables', 'fruits', 'cash_crops', 'roots_tubers', 'fodder', 'other'] },
          season: { type: 'string', enum: ['season_a', 'season_b', 'dry_season', 'wet_season', 'year_round'] },
          year: { type: 'integer' },
          areaPlanted: { type: 'number' },
          areaUnit: { type: 'string', enum: ['acres', 'hectares', 'square_meters'] },
          estimatedYield: { type: 'number' },
          yieldUnit: { type: 'string', enum: ['kg', 'tons', 'bags', 'bunches', 'pieces'] },
          productionStatus: { type: 'string', enum: ['planned', 'in_progress', 'harvested', 'sold', 'stored', 'failed'] },
          uiStatus: { type: 'string', enum: ['planned', 'active', 'completed'] },
        },
      }),
      responses: { ...created('Crop production recorded.', { $ref: '#/components/schemas/FarmerCropProduction' }) },
    },
  },

  '/api/v1/farmers/production/crops/{cropId}': {
    get: {
      tags: ['Farmers'],
      summary: 'Get crop production by ID',
      operationId: 'getCropProductionById',
      security: auth,
      parameters: [cropIdParam],
      responses: {
        ...ok('Crop production retrieved.', { $ref: '#/components/schemas/FarmerCropProduction' }),
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Farmers'],
      summary: 'Update crop production',
      operationId: 'updateCropProduction',
      security: auth,
      parameters: [cropIdParam],
      requestBody: r({
        type: 'object',
        properties: {
          farmId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          cropName: { type: 'string' },
          productionStatus: { type: 'string', enum: ['planned', 'in_progress', 'harvested', 'sold', 'stored', 'failed'] },
          uiStatus: { type: 'string', enum: ['planned', 'active', 'completed'] },
          actualYield: { type: 'number' },
          notes: { type: 'string' },
        },
      }),
      responses: { ...ok('Crop production updated.', { $ref: '#/components/schemas/FarmerCropProduction' }) },
    },
    delete: {
      tags: ['Farmers'],
      summary: 'Soft delete crop production',
      operationId: 'deleteCropProduction',
      security: auth,
      parameters: [cropIdParam],
      responses: { ...ok('Crop production deleted.', { type: 'null' }) },
    },
  },

  '/api/v1/farmers/{farmerId}/production/growth-stages': {
    get: {
      tags: ['Farmers'],
      summary: 'List growth stages for a farmer',
      operationId: 'listFarmerGrowthStages',
      security: auth,
      parameters: [
        farmerIdParam,
        pageParam,
        limitParam,
        { name: 'cycleId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'cropId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'stage', in: 'query', schema: { type: 'string', enum: ['seed', 'vegetative', 'flowering', 'maturity', 'harvested'] } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['planned', 'active', 'completed'] } },
      ],
      responses: { ...paged('Growth stage records.', '#/components/schemas/FarmerGrowthStage') },
    },
    post: {
      tags: ['Farmers'],
      summary: 'Create growth stage for a farmer',
      operationId: 'createFarmerGrowthStage',
      security: auth,
      parameters: [farmerIdParam],
      requestBody: r({
        type: 'object',
        required: ['cycleId', 'stage'],
        properties: {
          cycleId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          cropId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          stage: { type: 'string', enum: ['seed', 'vegetative', 'flowering', 'maturity', 'harvested'] },
          observedAt: { type: 'string', format: 'date-time' },
          notes: { type: 'string' },
          status: { type: 'string', enum: ['planned', 'active', 'completed'] },
        },
      }),
      responses: { ...created('Growth stage created.', { $ref: '#/components/schemas/FarmerGrowthStage' }) },
    },
  },

  '/api/v1/farmers/production/growth-stages/{stageId}': {
    get: {
      tags: ['Farmers'],
      summary: 'Get growth stage by ID',
      operationId: 'getGrowthStageById',
      security: auth,
      parameters: [{ name: 'stageId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      responses: {
        ...ok('Growth stage retrieved.', { $ref: '#/components/schemas/FarmerGrowthStage' }),
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Farmers'],
      summary: 'Update growth stage',
      operationId: 'updateGrowthStage',
      security: auth,
      parameters: [{ name: 'stageId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      requestBody: r({
        type: 'object',
        properties: {
          cycleId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          cropId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          stage: { type: 'string', enum: ['seed', 'vegetative', 'flowering', 'maturity', 'harvested'] },
          observedAt: { type: 'string', format: 'date-time' },
          notes: { type: 'string' },
          status: { type: 'string', enum: ['planned', 'active', 'completed'] },
        },
      }),
      responses: { ...ok('Growth stage updated.', { $ref: '#/components/schemas/FarmerGrowthStage' }) },
    },
    delete: {
      tags: ['Farmers'],
      summary: 'Soft delete growth stage',
      operationId: 'deleteGrowthStage',
      security: auth,
      parameters: [{ name: 'stageId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      responses: { ...ok('Growth stage deleted.', { type: 'null' }) },
    },
  },

  '/api/v1/farmers/{farmerId}/production/yield-predictions': {
    get: {
      tags: ['Farmers'],
      summary: 'List yield predictions for a farmer',
      operationId: 'listFarmerYieldPredictions',
      security: auth,
      parameters: [
        farmerIdParam,
        pageParam,
        limitParam,
        { name: 'cropId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['generated', 'refreshed', 'archived'] } },
      ],
      responses: { ...paged('Yield prediction records.', '#/components/schemas/FarmerYieldPrediction') },
    },
    post: {
      tags: ['Farmers'],
      summary: 'Create yield prediction for a farmer',
      operationId: 'createYieldPrediction',
      security: auth,
      parameters: [farmerIdParam],
      requestBody: r({
        type: 'object',
        required: ['cropId', 'predictedYield', 'confidence', 'horizonDays'],
        properties: {
          cropId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          predictedYield: { type: 'number', minimum: 0 },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          horizonDays: { type: 'integer', minimum: 1, maximum: 3650 },
          modelVersion: { type: 'string' },
          status: { type: 'string', enum: ['generated', 'refreshed', 'archived'] },
          notes: { type: 'string' },
        },
      }),
      responses: { ...created('Yield prediction created.', { $ref: '#/components/schemas/FarmerYieldPrediction' }) },
    },
  },

  '/api/v1/farmers/production/yield-predictions/{predictionId}': {
    get: {
      tags: ['Farmers'],
      summary: 'Get yield prediction by ID',
      operationId: 'getYieldPredictionById',
      security: auth,
      parameters: [{ name: 'predictionId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      responses: {
        ...ok('Yield prediction retrieved.', { $ref: '#/components/schemas/FarmerYieldPrediction' }),
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Farmers'],
      summary: 'Update yield prediction',
      operationId: 'updateYieldPrediction',
      security: auth,
      parameters: [{ name: 'predictionId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      requestBody: r({
        type: 'object',
        properties: {
          cropId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          predictedYield: { type: 'number', minimum: 0 },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          horizonDays: { type: 'integer', minimum: 1, maximum: 3650 },
          modelVersion: { type: 'string' },
          status: { type: 'string', enum: ['generated', 'refreshed', 'archived'] },
          notes: { type: 'string' },
        },
      }),
      responses: { ...ok('Yield prediction updated.', { $ref: '#/components/schemas/FarmerYieldPrediction' }) },
    },
    delete: {
      tags: ['Farmers'],
      summary: 'Soft delete yield prediction',
      operationId: 'deleteYieldPrediction',
      security: auth,
      parameters: [{ name: 'predictionId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      responses: { ...ok('Yield prediction deleted.', { type: 'null' }) },
    },
  },

  '/api/v1/farmers/production/yield-predictions/{predictionId}/refresh': {
    post: {
      tags: ['Farmers'],
      summary: 'Refresh yield prediction',
      operationId: 'refreshYieldPrediction',
      security: auth,
      parameters: [{ name: 'predictionId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      requestBody: r({
        type: 'object',
        properties: {
          predictedYield: { type: 'number', minimum: 0 },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          horizonDays: { type: 'integer', minimum: 1, maximum: 3650 },
          modelVersion: { type: 'string' },
          notes: { type: 'string' },
        },
      }),
      responses: { ...ok('Yield prediction refreshed.', { $ref: '#/components/schemas/FarmerYieldPrediction' }) },
    },
  },

  '/api/v1/farmers/{farmerId}/production/livestock': {
    post: {
      tags: ['Farmers'],
      summary: 'Record livestock production',
      operationId: 'recordLivestockProduction',
      security: auth,
      parameters: [farmerIdParam],
      requestBody: r({
        type: 'object',
        required: ['farmId', 'animalType', 'productionSystem', 'totalAnimals', 'primaryPurpose', 'year', 'startDate'],
        properties: {
          farmId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          animalType: { type: 'string' },
          productionSystem: { type: 'string' },
          totalAnimals: { type: 'integer', minimum: 1 },
          primaryPurpose: { type: 'string' },
          year: { type: 'integer' },
          startDate: { type: 'string', format: 'date-time' },
        },
      }),
      responses: { ...created('Livestock production recorded.', { type: 'object', additionalProperties: true }) },
    },
  },

  '/api/v1/farmers/{farmerId}/production': {
    get: {
      tags: ['Farmers'],
      summary: 'Get combined production history',
      operationId: 'getFarmerProduction',
      security: auth,
      parameters: [
        farmerIdParam,
        { name: 'productionType', in: 'query', schema: { type: 'string', enum: ['crops', 'livestock', 'all'] } },
        { name: 'year', in: 'query', schema: { type: 'integer' } },
      ],
      responses: { ...ok('Production records.', { type: 'object', properties: { crops: { type: 'array', items: { $ref: '#/components/schemas/FarmerCropProduction' } }, livestock: { type: 'array', items: { type: 'object', additionalProperties: true } } } }) },
    },
  },

  // == Inputs ===============================================================

  '/api/v1/farmers/{farmerId}/inputs': {
    get: {
      tags: ['Farmers'],
      summary: 'List farmer inputs',
      operationId: 'listFarmerInputs',
      security: auth,
      parameters: [farmerIdParam],
      responses: { ...paged('Farmer input records.', '#/components/schemas/FarmerInput') },
    },
    post: {
      tags: ['Farmers'],
      summary: 'Create farmer input record',
      operationId: 'createFarmerInput',
      security: auth,
      parameters: [farmerIdParam],
      requestBody: r({
        type: 'object',
        required: ['inputName', 'inputType', 'quantity', 'unit'],
        properties: {
          farmId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          plotId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          inputName: { type: 'string' },
          inputType: { type: 'string', enum: ['seed', 'fertilizer', 'pesticide', 'herbicide', 'feed', 'equipment', 'other'] },
          quantity: { type: 'number', minimum: 0 },
          unit: { type: 'string' },
          cost: { type: 'number' },
          currency: { type: 'string' },
          status: { type: 'string', enum: ['planned', 'applied', 'consumed', 'cancelled'] },
        },
      }),
      responses: { ...created('Input created.', { $ref: '#/components/schemas/FarmerInput' }) },
    },
  },

  '/api/v1/farmers/inputs/{inputId}': {
    get: {
      tags: ['Farmers'],
      summary: 'Get input by ID',
      operationId: 'getInputById',
      security: auth,
      parameters: [inputIdParam],
      responses: {
        ...ok('Input retrieved.', { $ref: '#/components/schemas/FarmerInput' }),
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Farmers'],
      summary: 'Update input',
      operationId: 'updateInput',
      security: auth,
      parameters: [inputIdParam],
      requestBody: r({
        type: 'object',
        properties: {
          inputName: { type: 'string' },
          inputType: { type: 'string', enum: ['seed', 'fertilizer', 'pesticide', 'herbicide', 'feed', 'equipment', 'other'] },
          quantity: { type: 'number', minimum: 0 },
          unit: { type: 'string' },
          active: { type: 'boolean' },
          status: { type: 'string', enum: ['planned', 'applied', 'consumed', 'cancelled'] },
        },
      }),
      responses: { ...ok('Input updated.', { $ref: '#/components/schemas/FarmerInput' }) },
    },
    delete: {
      tags: ['Farmers'],
      summary: 'Soft delete input',
      operationId: 'deleteInput',
      security: auth,
      parameters: [inputIdParam],
      responses: { ...ok('Input deleted.', { type: 'null' }) },
    },
  },

  // == Membership Management ==================================================

  '/api/v1/farmers/{farmerId}/membership/join-organization': {
    post: {
      tags: ['Farmers'],
      summary: 'Join an organization/cooperative',
      operationId: 'joinOrganization',
      security: auth,
      parameters: [farmerIdParam],
      requestBody: r({
        type: 'object',
        required: ['organizationId'],
        properties: {
          organizationId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          role: { type: 'string' },
        },
      }),
      responses: { ...ok('Joined organization.', { type: 'object', additionalProperties: true }) },
    },
  },

  '/api/v1/farmers/{farmerId}/membership/leave-organization': {
    post: {
      tags: ['Farmers'],
      summary: 'Leave current organization',
      operationId: 'leaveOrganization',
      security: auth,
      parameters: [farmerIdParam],
      requestBody: r({ type: 'object', properties: { exitReason: { type: 'string' }, exitNotes: { type: 'string' } } }),
      responses: { ...ok('Left organization.', { type: 'object', additionalProperties: true }) },
    },
  },

  '/api/v1/farmers/{farmerId}/membership/eligibility': {
    patch: {
      tags: ['Farmers', 'Admin'],
      summary: 'Update service eligibility',
      operationId: 'updateFarmerEligibility',
      security: auth,
      parameters: [farmerIdParam],
      requestBody: r({
        type: 'object',
        properties: {
          eligibleForLoans: { type: 'boolean' },
          maxLoanAmount: { type: 'number' },
          eligibleForInsurance: { type: 'boolean' },
        },
      }),
      responses: {
        ...ok('Eligibility updated.', { type: 'object', additionalProperties: true }),
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  // == Analytics & Stats ======================================================

  '/api/v1/farmers/stats': {
    get: {
      tags: ['Farmers', 'Admin'],
      summary: 'Farmer module statistics',
      operationId: 'getFarmerStats',
      security: auth,
      parameters: [{ name: 'region', in: 'query', schema: { type: 'string' } }],
      responses: {
        ...ok('Farmer statistics.', {
          type: 'object',
          properties: {
            totalFarmers: { type: 'integer' },
            verifiedFarmers: { type: 'integer' },
            byVerificationStatus: {
              type: 'array',
              items: { type: 'object', properties: { status: { type: 'string' }, count: { type: 'integer' } } },
            },
          },
        }),
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  // == Legacy Farmer Routes ===================================================

  '/api/v1/farmers/legacy': {
    get: {
      tags: ['Farmers'],
      summary: '[Legacy] List all farmers',
      operationId: 'legacyListFarmers',
      parameters: [pageParam, limitParam, { name: 'region', in: 'query', schema: { type: 'string' } }],
      responses: { 200: { description: 'Farmers list.' } },
    },
    post: {
      tags: ['Farmers'],
      summary: '[Legacy] Create farmer profile',
      operationId: 'legacyCreateFarmer',
      security: auth,
      requestBody: r({ $ref: '#/components/schemas/FarmerCreateRequest' }),
      responses: { 201: { description: 'Farmer profile created.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/farmers/legacy/me': {
    get: {
      tags: ['Farmers'],
      summary: '[Legacy] Get my farmer profile',
      operationId: 'legacyGetMyFarmerProfile',
      security: auth,
      responses: { 200: { description: 'My farmer profile.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/farmers/legacy/{id}': {
    get: {
      tags: ['Farmers'],
      summary: '[Legacy] Get farmer by ID',
      operationId: 'legacyGetFarmerById',
      parameters: [idParam],
      responses: { 200: { description: 'Farmer profile.' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    put: {
      tags: ['Farmers'],
      summary: '[Legacy] Update farmer profile',
      operationId: 'legacyUpdateFarmer',
      security: auth,
      parameters: [idParam],
      requestBody: r({ $ref: '#/components/schemas/FarmerCreateRequest' }),
      responses: { 200: { description: 'Updated.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/farmers/legacy/farms': {
    post: {
      tags: ['Farmers'],
      summary: '[Legacy] Create a farm',
      operationId: 'legacyCreateFarm',
      security: auth,
      requestBody: r({ type: 'object', required: ['name', 'location'], properties: { name: { type: 'string' }, location: { type: 'string' }, sizeInHectares: { type: 'number' } } }),
      responses: { 201: { description: 'Farm created.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/farmers/legacy/farms/{id}': {
    get: {
      tags: ['Farmers'],
      summary: '[Legacy] Get farm by ID',
      operationId: 'legacyGetFarmById',
      parameters: [idParam],
      responses: { 200: { description: 'Farm.' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    put: {
      tags: ['Farmers'],
      summary: '[Legacy] Update farm',
      operationId: 'legacyUpdateFarm',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { name: { type: 'string' }, sizeInHectares: { type: 'number' } } }),
      responses: { 200: { description: 'Farm updated.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
    delete: {
      tags: ['Farmers'],
      summary: '[Legacy] Delete farm',
      operationId: 'legacyDeleteFarm',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Farm deleted.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/farmers/legacy/{farmerId}/farms': {
    get: {
      tags: ['Farmers'],
      summary: '[Legacy] Get all farms for a farmer',
      operationId: 'legacyGetFarmerFarms',
      security: auth,
      parameters: [farmerIdParam],
      responses: { 200: { description: 'Farm list.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },
};
