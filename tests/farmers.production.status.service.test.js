const mockFarmerProfileModel = {
  findOne: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
};

const mockCropProductionModel = {
  find: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
};

jest.mock('../dist/modules/farmers/farmerProfile.model', () => ({
  __esModule: true,
  default: mockFarmerProfileModel,
}));

jest.mock('../dist/modules/farmers/farmEnterprise.model', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    find: jest.fn(),
    aggregate: jest.fn(),
  },
}));

jest.mock('../dist/modules/farmers/plot.model', () => ({
  __esModule: true,
  default: { findOne: jest.fn(), find: jest.fn() },
}));

jest.mock('../dist/modules/farmers/input.model', () => ({
  __esModule: true,
  default: { findOne: jest.fn(), find: jest.fn() },
}));

jest.mock('../dist/modules/farmers/growthStage.model', () => ({
  __esModule: true,
  default: { findOne: jest.fn(), find: jest.fn(), countDocuments: jest.fn() },
}));

jest.mock('../dist/modules/farmers/yieldPrediction.model', () => ({
  __esModule: true,
  default: { findOne: jest.fn(), find: jest.fn(), countDocuments: jest.fn() },
}));

jest.mock('../dist/modules/farmers/production.model', () => ({
  __esModule: true,
  CropProduction: mockCropProductionModel,
  LivestockProduction: {
    find: jest.fn(),
  },
}));

jest.mock('../dist/modules/farmers/farmerMembership.model', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

const mockAuditLog = jest.fn().mockResolvedValue(undefined);
jest.mock('../dist/modules/audit', () => ({
  __esModule: true,
  AuditService: {
    log: mockAuditLog,
  },
}));

jest.mock('../dist/common/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const farmersService = require('../dist/modules/farmers/farmersEnterprise.service').default;

describe('Farmers production status mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getFarmerCrops returns canonical uiStatus mapping', async () => {
    const docs = [
      {
        _id: '507f1f77bcf86cd799439201',
        cropName: 'Maize',
        productionStatus: 'in_progress',
      },
      {
        _id: '507f1f77bcf86cd799439202',
        cropName: 'Beans',
        productionStatus: 'harvested',
      },
    ];

    const limit = jest.fn().mockResolvedValue(docs);
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    mockCropProductionModel.find.mockReturnValue({ sort });
    mockCropProductionModel.countDocuments.mockResolvedValue(2);

    const result = await farmersService.getFarmerCrops('507f1f77bcf86cd799439012', {
      page: 1,
      limit: 20,
    });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.total).toBe(2);
    expect(result.totalPages).toBe(1);
    expect(result.crops[0].uiStatus).toBe('active');
    expect(result.crops[1].uiStatus).toBe('completed');
  });

  test('updateCropProduction accepts uiStatus and maps to productionStatus', async () => {
    const cropDoc = {
      _id: { toString: () => '507f1f77bcf86cd799439203' },
      farmerId: '507f1f77bcf86cd799439012',
      productionStatus: 'planned',
      version: 1,
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockCropProductionModel.findOne.mockResolvedValue(cropDoc);

    const result = await farmersService.updateCropProduction(
      '507f1f77bcf86cd799439203',
      { uiStatus: 'completed' },
      '507f1f77bcf86cd799439011'
    );

    expect(cropDoc.productionStatus).toBe('harvested');
    expect(result.uiStatus).toBe('completed');
    expect(cropDoc.save).toHaveBeenCalledTimes(1);
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'farmers.crop_production_updated' })
    );
  });
});
