const mockFarmerProfileModel = {
  findOne: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  findById: jest.fn(),
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

jest.mock('../dist/modules/farmers/production.model', () => ({
  __esModule: true,
  CropProduction: {
    find: jest.fn(),
  },
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

const { BadRequestError } = require('../dist/common/errors/AppError');
const farmersService = require('../dist/modules/farmers/farmersEnterprise.service').default;

const createProfileDoc = (status = 'draft') => ({
  _id: { toString: () => '507f1f77bcf86cd799439012' },
  userId: { toString: () => '507f1f77bcf86cd799439011' },
  verificationStatus: status,
  verificationSubmittedAt: undefined,
  verificationReviewedAt: undefined,
  verificationReason: undefined,
  verificationNotes: undefined,
  rejectionReason: undefined,
  verifiedAt: undefined,
  verifiedBy: undefined,
  save: jest.fn().mockResolvedValue(undefined),
});

describe('FarmersEnterpriseService verification lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('submitForVerification allows draft -> submitted', async () => {
    const profile = createProfileDoc('draft');
    jest.spyOn(farmersService, 'getFarmerProfile').mockResolvedValue(profile);

    const result = await farmersService.submitForVerification(
      '507f1f77bcf86cd799439012',
      'Ready for review'
    );

    expect(result.verificationStatus).toBe('submitted');
    expect(result.verificationSubmittedAt).toBeInstanceOf(Date);
    expect(result.verificationReviewedAt).toBeUndefined();
    expect(profile.save).toHaveBeenCalledTimes(1);
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'farmers.verification_submitted' })
    );
  });

  test('submitForVerification rejects invalid submitted -> submitted transition', async () => {
    const profile = createProfileDoc('submitted');
    jest.spyOn(farmersService, 'getFarmerProfile').mockResolvedValue(profile);

    await expect(
      farmersService.submitForVerification('507f1f77bcf86cd799439012')
    ).rejects.toThrow(BadRequestError);

    await expect(
      farmersService.submitForVerification('507f1f77bcf86cd799439012')
    ).rejects.toThrow('only draft or rejected profiles can be submitted');
  });

  test('verifyFarmer allows submitted -> verified', async () => {
    const profile = createProfileDoc('submitted');
    jest.spyOn(farmersService, 'getFarmerProfile').mockResolvedValue(profile);

    const result = await farmersService.verifyFarmer(
      '507f1f77bcf86cd799439012',
      '507f1f77bcf86cd799439013',
      'verified',
      'All checks passed'
    );

    expect(result.verificationStatus).toBe('verified');
    expect(result.verificationReviewedAt).toBeInstanceOf(Date);
    expect(result.verificationReason).toBe('All checks passed');
    expect(profile.save).toHaveBeenCalledTimes(1);
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'farmers.verification_approved' })
    );
  });

  test('verifyFarmer rejects transition when status is not submitted', async () => {
    const profile = createProfileDoc('draft');
    jest.spyOn(farmersService, 'getFarmerProfile').mockResolvedValue(profile);

    await expect(
      farmersService.verifyFarmer(
        '507f1f77bcf86cd799439012',
        '507f1f77bcf86cd799439013',
        'rejected',
        'Missing documents'
      )
    ).rejects.toThrow('only submitted profiles can be verified or rejected');
  });
});

describe('FarmersEnterpriseService list filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  const mockQueryChain = (rows) => {
    const sort = jest.fn().mockResolvedValue(rows);
    const limit = jest.fn().mockReturnValue({ sort });
    const skip = jest.fn().mockReturnValue({ limit });
    const populate = jest.fn().mockReturnValue({ skip });
    mockFarmerProfileModel.find.mockReturnValue({ populate });
  };

  test('verificationStatus filter takes precedence over verified when both are provided', async () => {
    mockQueryChain([]);
    mockFarmerProfileModel.countDocuments.mockResolvedValue(0);

    await farmersService.listFarmers({
      page: 1,
      limit: 20,
      verificationStatus: 'submitted',
      verified: true,
    });

    const filter = mockFarmerProfileModel.find.mock.calls[0][0];
    expect(filter.verificationStatus).toEqual({ $in: ['submitted', 'pending'] });
  });

  test('legacy verified=true filter still works', async () => {
    mockQueryChain([]);
    mockFarmerProfileModel.countDocuments.mockResolvedValue(0);

    await farmersService.listFarmers({
      page: 1,
      limit: 20,
      verified: true,
    });

    const filter = mockFarmerProfileModel.find.mock.calls[0][0];
    expect(filter.verificationStatus).toEqual({ $in: ['verified'] });
  });
});
