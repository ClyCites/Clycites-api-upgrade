/**
 * Pest & Disease Controller
 * 
 * HTTP request handlers for the Pest & Disease Detection Module.
 */

import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import pestDiseaseService from './pestDisease.service';
import outbreakAnalyticsService from './outbreakAnalytics.service';
import { IConsentMetadata, IFieldContext, GrowthStage } from './pestDisease.types';
import { successResponse, ResponseHandler } from '../../common/utils/response';
import { AppError } from '../../common/errors/AppError';

const privilegedRoles = new Set(['super_admin', 'platform_admin', 'admin', 'org:manager']);

const isPrivilegedRole = (role?: string): boolean => !!role && privilegedRoles.has(role);

const resolveTenantId = (req: Request): Types.ObjectId => {
  const tenantCandidate = req.user?.orgId || req.user?.id;

  if (!tenantCandidate) {
    throw new AppError('Authentication context missing tenant scope', 401, 'UNAUTHORIZED');
  }

  if (!Types.ObjectId.isValid(tenantCandidate)) {
    throw new AppError('Invalid tenant scope', 400, 'VALIDATION_ERROR');
  }

  return new Types.ObjectId(tenantCandidate);
};

/**
 * Submit detection request with images
 * POST /api/v1/pest-disease/detect
 */
export const submitDetection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { farmerId, farmId, fieldContext, consent, farmerNotes } = req.body;
    const files = req.files as Express.Multer.File[];
    const tenantId = resolveTenantId(req);
    const actorId = new Types.ObjectId(req.user!.id);

    if (!files || files.length === 0) {
      throw new AppError('Please upload at least one image', 400, 'NO_IMAGES');
    }

    // Parse field context
    const parsedFieldContext: IFieldContext = {
      cropType: fieldContext.cropType,
      cropVariety: fieldContext.cropVariety,
      growthStage: fieldContext.growthStage as GrowthStage,
      plantingDate: fieldContext.plantingDate ? new Date(fieldContext.plantingDate) : undefined,
      farmLocation: {
        type: 'Point',
        coordinates: [
          parseFloat(fieldContext.longitude),
          parseFloat(fieldContext.latitude)
        ]
      },
      farmSize: fieldContext.farmSize ? parseFloat(fieldContext.farmSize) : undefined,
      soilType: fieldContext.soilType,
      irrigationType: fieldContext.irrigationType
    };

    // Parse consent
    const parsedConsent: IConsentMetadata = {
      agreedToAIAnalysis: consent.agreedToAIAnalysis === true || consent.agreedToAIAnalysis === 'true',
      agreedToDataSharing: consent.agreedToDataSharing === true || consent.agreedToDataSharing === 'true',
      consentVersion: consent.consentVersion || 'v1.0',
      consentedAt: new Date(),
      ipAddress: req.ip
    };

    const result = await pestDiseaseService.submitDetectionRequest(
      tenantId,
      actorId,
      farmerId,
      farmId,
      files,
      parsedFieldContext,
      parsedConsent,
      farmerNotes
    );

    successResponse(res, result, 'Detection request submitted successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Get detection report by ID
 * GET /api/v1/pest-disease/reports/:reportId
 */
export const getReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { reportId } = req.params;
    const tenantId = resolveTenantId(req);

    const report = await pestDiseaseService.getReport(
      new Types.ObjectId(reportId),
      tenantId
    );

    if (!report) {
      throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
    }

    successResponse(res, report, 'Report retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get farmer's detection reports
 * GET /api/v1/pest-disease/farmers/:farmerId/reports
 */
export const getFarmerReports = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { farmerId } = req.params;
    const { status, page = '1', limit = '20' } = req.query;
    const tenantId = resolveTenantId(req);

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const result = await pestDiseaseService.getFarmerReports(
      farmerId,
      tenantId,
      {
        status: status as string | undefined,
        limit: limitNum,
        skip: (pageNum - 1) * limitNum
      }
    );

    ResponseHandler.paginated(
      res,
      result.reports,
      {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum),
      },
      'Reports retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Create pest/disease report via JSON (no multipart upload required)
 * POST /api/v1/pest-disease/farmers/:farmerId/reports
 */
export const createReportJson = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { farmerId } = req.params;
    const tenantId = resolveTenantId(req);
    const actorId = new Types.ObjectId(req.user!.id);

    if (!isPrivilegedRole(req.user?.role) && req.user?.farmerId && req.user.farmerId !== farmerId) {
      throw new AppError('Access denied to create incidents for this farmer', 403, 'FORBIDDEN');
    }

    const report = await pestDiseaseService.createReportJson(
      tenantId,
      actorId,
      farmerId,
      req.body.farmId,
      req.body
    );

    successResponse(res, report, 'Report created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update report fields via JSON
 * PATCH /api/v1/pest-disease/reports/:reportId
 */
export const updateReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { reportId } = req.params;
    const tenantId = resolveTenantId(req);
    const actorId = new Types.ObjectId(req.user!.id);

    const report = await pestDiseaseService.updateReportJson(
      new Types.ObjectId(reportId),
      tenantId,
      actorId,
      req.body
    );

    successResponse(res, report, 'Report updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Soft delete report
 * DELETE /api/v1/pest-disease/reports/:reportId
 */
export const deleteReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { reportId } = req.params;
    const tenantId = resolveTenantId(req);
    const actorId = new Types.ObjectId(req.user!.id);

    await pestDiseaseService.deleteReport(
      new Types.ObjectId(reportId),
      tenantId,
      actorId
    );

    successResponse(res, null, 'Report deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Assign report lifecycle step
 * POST /api/v1/pest-disease/reports/:reportId/assign
 */
export const assignReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { reportId } = req.params;
    const tenantId = resolveTenantId(req);
    const actorId = new Types.ObjectId(req.user!.id);

    const report = await pestDiseaseService.assignReport(
      new Types.ObjectId(reportId),
      tenantId,
      actorId,
      {
        assigneeId: req.body.assigneeId,
        notes: req.body.notes,
      }
    );

    successResponse(res, report, 'Report assigned successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Close report lifecycle step
 * POST /api/v1/pest-disease/reports/:reportId/close
 */
export const closeReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { reportId } = req.params;
    const tenantId = resolveTenantId(req);
    const actorId = new Types.ObjectId(req.user!.id);

    const report = await pestDiseaseService.closeReport(
      new Types.ObjectId(reportId),
      tenantId,
      actorId,
      {
        reason: req.body.reason,
        resolutionNotes: req.body.resolutionNotes,
      }
    );

    successResponse(res, report, 'Report closed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Submit expert review
 * POST /api/v1/pest-disease/reports/:reportId/review
 */
export const submitExpertReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { reportId } = req.params;
    const review = req.body;
    const tenantId = resolveTenantId(req);
    const actorId = new Types.ObjectId(req.user!.id);

    const updatedReport = await pestDiseaseService.submitExpertReview(
      new Types.ObjectId(reportId),
      tenantId,
      actorId,
      review
    );

    successResponse(res, updatedReport, 'Expert review submitted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Submit farmer feedback
 * POST /api/v1/pest-disease/reports/:reportId/feedback
 */
export const submitFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { reportId } = req.params;
    const { isCorrect, actualDiagnosis, notes } = req.body;
    const tenantId = resolveTenantId(req);

    await pestDiseaseService.submitFeedback(
      new Types.ObjectId(reportId),
      tenantId,
      {
        isCorrect,
        actualDiagnosis,
        feedbackSource: 'farmer',
        submittedAt: new Date(),
        notes
      }
    );

    successResponse(res, null, 'Feedback submitted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get active outbreaks
 * GET /api/v1/pest-disease/outbreaks
 */
export const getActiveOutbreaks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { region, pestOrDisease, status, severity, cropType } = req.query;
    const tenantId = resolveTenantId(req);

    const outbreaks = await pestDiseaseService.getActiveOutbreaks(
      tenantId,
      {
        region: region as string,
        pestOrDisease: pestOrDisease as string,
        status: status as never,
        severity: severity as never,
        cropType: cropType as string
      }
    );

    successResponse(res, outbreaks, 'Outbreaks retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get outbreak hotspots
 * GET /api/v1/pest-disease/outbreaks/hotspots
 */
export const getHotspots = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { detectionType, days = '30', radius = '50' } = req.query;
    const tenantId = resolveTenantId(req);

    const hotspots = await outbreakAnalyticsService.identifyHotspots(
      tenantId,
      detectionType as never,
      parseInt(days as string),
      parseInt(radius as string)
    );

    successResponse(res, hotspots, 'Hotspots identified successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get trend analysis
 * GET /api/v1/pest-disease/analytics/trends
 */
export const getTrends = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { currentPeriod = '30', previousPeriod = '30' } = req.query;
    const tenantId = resolveTenantId(req);

    const trends = await outbreakAnalyticsService.analyzeTrends(
      tenantId,
      parseInt(currentPeriod as string),
      parseInt(previousPeriod as string)
    );

    successResponse(res, trends, 'Trends analyzed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get analytics dashboard data
 * GET /api/v1/pest-disease/analytics/dashboard
 */
export const getDashboardAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const tenantId = resolveTenantId(req);

    const analytics = await pestDiseaseService.getAnalytics(
      tenantId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    successResponse(res, analytics, 'Analytics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Search treatment knowledge
 * GET /api/v1/pest-disease/treatments/search
 */
export const searchTreatments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { q } = req.query;
    const tenantId = resolveTenantId(req);

    if (!q) {
      throw new AppError('Search query required', 400, 'QUERY_REQUIRED');
    }

    const results = await pestDiseaseService.searchTreatmentKnowledge(
      tenantId,
      q as string
    );

    successResponse(res, results, 'Treatment knowledge retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create treatment knowledge entry (admin only)
 * POST /api/v1/pest-disease/treatments
 */
export const createTreatmentKnowledge = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = resolveTenantId(req);
    const actorId = new Types.ObjectId(req.user!.id);
    const knowledge = await pestDiseaseService.createTreatmentKnowledge(
      tenantId,
      actorId,
      req.body
    );

    successResponse(res, knowledge, 'Treatment knowledge created successfully', 201);
  } catch (error) {
    next(error);
  }
};
