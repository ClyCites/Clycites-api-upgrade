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
import { successResponse } from '../../common/utils/response';
import { AppError } from '../../common/errors/AppError';

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
      new Types.ObjectId(req.user!.id),
      new Types.ObjectId(req.user!.id),
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

    const report = await pestDiseaseService.getReport(
      new Types.ObjectId(reportId),
      new Types.ObjectId(req.user!.id)
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

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const result = await pestDiseaseService.getFarmerReports(
      farmerId,
      new Types.ObjectId(req.user!.id),
      {
        status: status as never,
        limit: limitNum,
        skip: (pageNum - 1) * limitNum
      }
    );

    successResponse(res, {
      reports: result.reports,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        pages: Math.ceil(result.total / limitNum)
      }
    }, 'Reports retrieved successfully');
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

    const updatedReport = await pestDiseaseService.submitExpertReview(
      new Types.ObjectId(reportId),
      new Types.ObjectId(req.user!.id),
      new Types.ObjectId(req.user!.id),
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

    await pestDiseaseService.submitFeedback(
      new Types.ObjectId(reportId),
      new Types.ObjectId(req.user!.id),
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

    const outbreaks = await pestDiseaseService.getActiveOutbreaks(
      new Types.ObjectId(req.user!.id),
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

    const hotspots = await outbreakAnalyticsService.identifyHotspots(
      new Types.ObjectId(req.user!.id),
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

    const trends = await outbreakAnalyticsService.analyzeTrends(
      new Types.ObjectId(req.user!.id),
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

    const analytics = await pestDiseaseService.getAnalytics(
      new Types.ObjectId(req.user!.id),
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

    if (!q) {
      throw new AppError('Search query required', 400, 'QUERY_REQUIRED');
    }

    const results = await pestDiseaseService.searchTreatmentKnowledge(
      new Types.ObjectId(req.user!.id),
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
    const knowledge = await pestDiseaseService.createTreatmentKnowledge(
      new Types.ObjectId(req.user!.id),
      new Types.ObjectId(req.user!.id),
      req.body
    );

    successResponse(res, knowledge, 'Treatment knowledge created successfully', 201);
  } catch (error) {
    next(error);
  }
};
