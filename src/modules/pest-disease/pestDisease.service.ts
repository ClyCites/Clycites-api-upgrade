/**
 * Pest & Disease Service
 * 
 * Main business logic service for the Pest & Disease Detection Module.
 * Orchestrates AI detection, image storage, treatment recommendations,
 * outbreak analytics, and farmer notifications.
 */

import { Types } from 'mongoose';
import PestDiseaseReport from './pestDiseaseReport.model';
import RegionalOutbreak from './regionalOutbreak.model';
import TreatmentKnowledgeBase from './treatmentKnowledgeBase.model';
import aiDetectionService from './aiDetection.service';
import imageStorageService from './imageStorage.service';
import outbreakAnalyticsService from './outbreakAnalytics.service';
import {
  IDetectionResponse,
  IOutbreakQuery,
  IAnalyticsResult,
  DetectionType,
  ReportStatus,
  SeverityLevel,
  ConfidenceLevel,
  OutbreakSeverity,
  IConsentMetadata,
  IFieldContext,
  ITreatmentRecommendation,
  IRetrainingFeedback
} from './pestDisease.types';
import logger from '../../common/utils/logger';
import { AppError } from '../../common/errors/AppError';
import AuditService from '../audit/audit.service';

// ============================================================================
// PEST & DISEASE SERVICE
// ============================================================================

class PestDiseaseService {
  /**
   * Submit detection request with images
   */
  async submitDetectionRequest(
    tenantId: Types.ObjectId,
    userId: Types.ObjectId,
    farmerId: Types.ObjectId | string,
    farmId: Types.ObjectId | string,
    files: Express.Multer.File[],
    fieldContext: IFieldContext,
    consent: IConsentMetadata,
    farmerNotes?: string
  ): Promise<IDetectionResponse> {
    try {
      logger.info('Processing detection request', {
        farmerId,
        farmId,
        imageCount: files.length
      });

      // Validate consent
      if (!consent.agreedToAIAnalysis) {
        throw new AppError(
          'Farmer must consent to AI analysis',
          400,
          'CONSENT_REQUIRED'
        );
      }

      // Upload images
      const uploadedImages = await imageStorageService.uploadMultipleImages(
        files,
        userId
      );

      if (uploadedImages.length === 0) {
        throw new AppError('No valid images uploaded', 400, 'NO_IMAGES');
      }

      // Create initial report
      const report = await PestDiseaseReport.create({
        tenantId,
        farmerId,
        farmId,
        reportStatus: ReportStatus.PENDING,
        fieldContext,
        images: uploadedImages,
        primaryImage: uploadedImages[0],
        aiDetection: {
          processedAt: undefined,
          processingTime: undefined,
          requiresReview: false
        },
        consent,
        farmerNotes,
        isActive: true,
        createdBy: userId
      });

      await AuditService.log({
        userId: userId.toString(),
        organizationId: tenantId.toString(),
        action: 'pest_disease_detection.create',
        resource: 'PestDiseaseReport',
        resourceId: report._id.toString(),
        details: {
          metadata: {
            farmerId,
            farmId,
            cropType: fieldContext.cropType,
            imageCount: uploadedImages.length
          }
        }
      });

      // Queue AI detection (async processing)
      this.processAIDetection(report._id, tenantId, userId).catch(error => {
        logger.error('AI detection processing failed', {
          reportId: report._id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      });

      return {
        reportId: report._id,
        reportCode: report.reportCode,
        status: ReportStatus.PROCESSING,
        detection: {
          detectedEntity: 'Processing...',
          detectionType: DetectionType.UNKNOWN,
          scientificName: undefined,
          commonNames: [],
          confidenceScore: 0,
          confidenceLevel: ConfidenceLevel.VERY_LOW,
          severityLevel: SeverityLevel.NONE
        },
        requiresExpertReview: false,
        estimatedProcessingTime: 30000 // 30 seconds
      };

    } catch (error) {
      logger.error('Detection request failed', { error });
      
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        'Failed to process detection request',
        500,
        'DETECTION_REQUEST_FAILED',
        true,
        { originalError: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Process AI detection (async)
   */
  private async processAIDetection(
    reportId: Types.ObjectId,
    tenantId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<void> {
    try {
      const report = await PestDiseaseReport.findById(reportId);
      if (!report) {
        throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
      }

      // Update status
      report.reportStatus = ReportStatus.PROCESSING;
      await report.save();

      // Run AI detection on primary image
      const detectionResult = await aiDetectionService.detectFromImage(
        report.primaryImage,
        {
          cropType: report.fieldContext.cropType,
          location: report.fieldContext.farmLocation.coordinates,
          season: report.environmentalContext?.season
        }
      );

      // Update report with AI results
      report.aiDetection = {
        primaryResult: detectionResult.primaryResult,
        alternativePredictions: detectionResult.alternativePredictions,
        modelMetadata: detectionResult.modelMetadata,
        processedAt: new Date(),
        processingTime: detectionResult.processingTime,
        requiresReview: aiDetectionService.requiresReview(detectionResult.primaryResult)
      };

      // Get treatment recommendation
      const treatmentKB = await TreatmentKnowledgeBase.findOne({
        tenantId,
        pestOrDiseaseName: new RegExp(detectionResult.primaryResult.detectedEntity, 'i'),
        isPublished: true,
        isActive: true
      });

      if (treatmentKB) {
        report.recommendedTreatment = treatmentKB.generateRecommendation(
          detectionResult.primaryResult.severityLevel,
          report.fieldContext.cropType
        );
      }

      // Save report
      await report.save();

      await AuditService.log({
        userId: userId.toString(),
        organizationId: tenantId.toString(),
        action: 'pest_disease_detection.ai_processed',
        resource: 'PestDiseaseReport',
        resourceId: report._id.toString(),
        details: {
          metadata: {
            detectedEntity: detectionResult.primaryResult.detectedEntity,
            confidence: detectionResult.primaryResult.confidenceScore,
            severity: detectionResult.primaryResult.severityLevel,
            requiresReview: report.aiDetection.requiresReview
          }
        }
      });

      // Check for outbreak patterns (async, non-blocking)
      this.checkOutbreakPatterns(tenantId, report).catch(error => {
        logger.warn('Outbreak pattern check failed', { error });
      });

    } catch (error) {
      logger.error('AI detection processing failed', {
        reportId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Update report status to failed
      try {
        await PestDiseaseReport.findByIdAndUpdate(reportId, {
          reportStatus: ReportStatus.EXPERT_REVIEW,
          'aiDetection.requiresReview': true
        });
      } catch (updateError) {
        logger.error('Failed to update report status', { updateError });
      }
    }
  }

  /**
   * Check for outbreak patterns and create/update outbreak records
   */
  private async checkOutbreakPatterns(
    tenantId: Types.ObjectId,
    report: InstanceType<typeof PestDiseaseReport>
  ): Promise<void> {
    try {
      // This would integrate with a regional boundary service
      // For now, using simplified logic
      const regionName = 'Default Region'; // TODO: Get from geospatial service
      const regionGeometry = {
        type: 'Polygon' as const,
        coordinates: [[
          [report.fieldContext.farmLocation.coordinates[0] - 0.5, report.fieldContext.farmLocation.coordinates[1] - 0.5],
          [report.fieldContext.farmLocation.coordinates[0] + 0.5, report.fieldContext.farmLocation.coordinates[1] - 0.5],
          [report.fieldContext.farmLocation.coordinates[0] + 0.5, report.fieldContext.farmLocation.coordinates[1] + 0.5],
          [report.fieldContext.farmLocation.coordinates[0] - 0.5, report.fieldContext.farmLocation.coordinates[1] + 0.5],
          [report.fieldContext.farmLocation.coordinates[0] - 0.5, report.fieldContext.farmLocation.coordinates[1] - 0.5]
        ]]
      };

      const outbreakAnalysis = await outbreakAnalyticsService.detectOutbreak({
        tenantId,
        regionName,
        regionGeometry,
        regionCenter: report.fieldContext.farmLocation,
        adminLevel: 3,
        timeWindowDays: 14,
        minReportsThreshold: 5
      });

      if (outbreakAnalysis) {
        // Check if outbreak already exists
        const existingOutbreak = await RegionalOutbreak.findOne({
          tenantId,
          pestOrDisease: outbreakAnalysis.pestOrDisease,
          'region.name': regionName,
          status: 'active',
          isActive: true
        });

        if (existingOutbreak) {
          // Update existing outbreak
          existingOutbreak.totalReports = outbreakAnalysis.reportCount;
          existingOutbreak.confirmedReports = outbreakAnalysis.confirmedCount;
          existingOutbreak.farmsAffected = outbreakAnalysis.farmsAffected;
          existingOutbreak.affectedCrops = outbreakAnalysis.affectedCrops;
          existingOutbreak.outbreakSeverity = outbreakAnalysis.severity;
          await existingOutbreak.save();

          logger.info('Outbreak updated', {
            outbreakId: existingOutbreak._id,
            severity: outbreakAnalysis.severity
          });
        } else {
          // Create new outbreak
          const newOutbreak = await RegionalOutbreak.create({
            tenantId,
            pestOrDisease: outbreakAnalysis.pestOrDisease,
            detectionType: outbreakAnalysis.detectionType,
            region: {
              name: regionName,
              adminLevel: 3,
              geometry: regionGeometry,
              centerPoint: report.fieldContext.farmLocation
            },
            outbreakSeverity: outbreakAnalysis.severity,
            startDate: new Date(),
            status: 'active',
            affectedCrops: outbreakAnalysis.affectedCrops,
            timeline: outbreakAnalysis.timeline,
            totalReports: outbreakAnalysis.reportCount,
            confirmedReports: outbreakAnalysis.confirmedCount,
            farmsAffected: outbreakAnalysis.farmsAffected,
            advisoryMessage: this.generateAdvisoryMessage(outbreakAnalysis),
            actionableRecommendations: this.generateRecommendations(outbreakAnalysis),
            predictedSpread: outbreakAnalysis.estimatedSpread,
            isActive: true,
            createdBy: report.createdBy
          });

          logger.info('New outbreak detected and created', {
            outbreakId: newOutbreak._id,
            pestOrDisease: outbreakAnalysis.pestOrDisease,
            severity: outbreakAnalysis.severity
          });
        }
      }

    } catch (error) {
      logger.error('Outbreak pattern check failed', { error });
      // Don't throw - this is non-critical background process
    }
  }

  /**
   * Generate advisory message for outbreak
   */
  private generateAdvisoryMessage(analysis: {
    pestOrDisease: string;
    severity: OutbreakSeverity;
    reportCount: number;
    farmsAffected: number;
  }): string {
    return `OUTBREAK ALERT: ${analysis.pestOrDisease} detected across ${analysis.farmsAffected} farms ` +
           `with ${analysis.reportCount} confirmed reports. Severity level: ${analysis.severity.toUpperCase()}. ` +
           `Immediate action recommended to prevent further spread.`;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(analysis: {
    pestOrDisease: string;
    severity: OutbreakSeverity;
    affectedCrops: Array<{ cropType: string }>;
  }): string[] {
    const recommendations = [
      `Monitor ${analysis.affectedCrops.map(c => c.cropType).join(', ')} crops daily for symptoms`,
      'Implement recommended treatment measures immediately',
      'Report any new detections to local agricultural extension office',
      'Avoid moving plant materials between farms to prevent spread'
    ];

    if ([OutbreakSeverity.EPIDEMIC, OutbreakSeverity.PANDEMIC].includes(analysis.severity)) {
      recommendations.push('Consider emergency quarantine measures');
      recommendations.push('Contact agricultural authorities for coordinated response');
    }

    return recommendations;
  }

  /**
   * Get detection report by ID
   */
  async getReport(
    reportId: Types.ObjectId | string,
    tenantId: Types.ObjectId
  ): Promise<InstanceType<typeof PestDiseaseReport> | null> {
    return await PestDiseaseReport.findOne({
      _id: reportId,
      tenantId,
      isActive: true
    })
      .populate('farmerId', 'personalInfo.fullName contactInfo.primaryPhone')
      .populate('farmId', 'basicInfo.farmName location.centerPoint')
      .populate('expertReview.reviewerId', 'name email');
  }

  /**
   * Get farmer's detection reports
   */
  async getFarmerReports(
    farmerId: Types.ObjectId | string,
    tenantId: Types.ObjectId,
    options: {
      status?: ReportStatus;
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<{ reports: InstanceType<typeof PestDiseaseReport>[]; total: number }> {
    const query: Record<string, unknown> = {
      farmerId,
      tenantId,
      isActive: true
    };

    if (options.status) {
      query.reportStatus = options.status;
    }

    const total = await PestDiseaseReport.countDocuments(query);
    const reports = await PestDiseaseReport.find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit || 50)
      .skip(options.skip || 0)
      .populate('farmId', 'basicInfo.farmName');

    return { reports: reports as unknown as InstanceType<typeof PestDiseaseReport>[], total };
  }

  /**
   * Submit expert review
   */
  async submitExpertReview(
    reportId: Types.ObjectId | string,
    tenantId: Types.ObjectId,
    reviewerId: Types.ObjectId,
    review: {
      decision: 'confirm' | 'reject' | 'reclassify';
      correctedDiagnosis?: string;
      correctedSeverity?: SeverityLevel;
      notes: string;
      confidence: number;
      treatmentOverride?: ITreatmentRecommendation;
    }
  ): Promise<InstanceType<typeof PestDiseaseReport>> {
    const report = await PestDiseaseReport.findOne({
      _id: reportId,
      tenantId,
      isActive: true
    });

    if (!report) {
      throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
    }

    report.expertReview = {
      reviewerId,
      reviewedAt: new Date(),
      ...review
    };

    report.reportStatus = review.decision === 'confirm' 
      ? ReportStatus.CONFIRMED 
      : review.decision === 'reject'
      ? ReportStatus.REJECTED
      : ReportStatus.COMPLETED;

    await report.save();

    await AuditService.log({
      userId: reviewerId.toString(),
      organizationId: tenantId.toString(),
      action: 'pest_disease_detection.expert_review',
      resource: 'PestDiseaseReport',
      resourceId: report._id.toString(),
      details: {
        metadata: {
          decision: review.decision,
          correctedDiagnosis: review.correctedDiagnosis
        }
      }
    });

    return report as unknown as InstanceType<typeof PestDiseaseReport>;
  }

  /**
   * Submit farmer feedback
   */
  async submitFeedback(
    reportId: Types.ObjectId | string,
    tenantId: Types.ObjectId,
    feedback: IRetrainingFeedback
  ): Promise<void> {
    const report = await PestDiseaseReport.findOne({
      _id: reportId,
      tenantId,
      isActive: true
    });

    if (!report) {
      throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
    }

    await report.submitFeedback(feedback);

    await AuditService.log({
      userId: report.createdBy.toString(),
      organizationId: tenantId.toString(),
      action: 'pest_disease_detection.feedback_submitted',
      resource: 'PestDiseaseReport',
      resourceId: report._id.toString(),
      details: {
        metadata: {
          isCorrect: feedback.isCorrect,
          feedbackSource: feedback.feedbackSource
        }
      }
    });
  }

  /**
   * Get active outbreaks
   */
  async getActiveOutbreaks(
    tenantId: Types.ObjectId,
    query: IOutbreakQuery = {}
  ): Promise<InstanceType<typeof RegionalOutbreak>[]> {
    const filter: Record<string, unknown> = {
      tenantId,
      isActive: true
    };

    if (query.status) {
      filter.status = query.status;
    } else {
      filter.status = 'active';
    }

    if (query.region) {
      filter['region.name'] = query.region;
    }

    if (query.pestOrDisease) {
      filter.pestOrDisease = new RegExp(query.pestOrDisease, 'i');
    }

    if (query.severity) {
      filter.outbreakSeverity = query.severity;
    }

    if (query.cropType) {
      filter['affectedCrops.cropType'] = query.cropType;
    }

    if (query.startDate || query.endDate) {
      filter.startDate = {};
      if (query.startDate) (filter.startDate as Record<string, unknown>).$gte = query.startDate;
      if (query.endDate) (filter.startDate as Record<string, unknown>).$lte = query.endDate;
    }

    // Location-based query
    if (query.location) {
      filter['region.centerPoint'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: query.location.coordinates
          },
          $maxDistance: query.location.maxDistance || 100000
        }
      };
    }

    return await RegionalOutbreak.find(filter)
      .sort({ severityIndex: -1, startDate: -1 })
      .populate('issuedBy', 'name email') as unknown as InstanceType<typeof RegionalOutbreak>[];
  }

  /**
   * Get analytics
   */
  async getAnalytics(
    tenantId: Types.ObjectId,
    startDate?: Date,
    endDate?: Date
  ): Promise<IAnalyticsResult> {
    const query: Record<string, unknown> = {
      tenantId,
      isActive: true
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) (query.createdAt as Record<string, unknown>).$gte = startDate;
      if (endDate) (query.createdAt as Record<string, unknown>).$lte = endDate;
    }

    const reports = await PestDiseaseReport.find(query);

    const result: IAnalyticsResult = {
      totalReports: reports.length,
      byDetectionType: {} as Record<DetectionType, number>,
      bySeverity: {} as Record<SeverityLevel, number>,
      byStatus: {} as Record<ReportStatus, number>,
      topPests: [],
      topDiseases: [],
      averageConfidence: 0,
      expertReviewRate: 0,
      resolutionRate: 0,
      timeRange: {
        start: startDate || new Date(0),
        end: endDate || new Date()
      }
    };

    // Initialize counters
    Object.values(DetectionType).forEach(type => {
      result.byDetectionType[type] = 0;
    });
    Object.values(SeverityLevel).forEach(sev => {
      result.bySeverity[sev] = 0;
    });
    Object.values(ReportStatus).forEach(status => {
      result.byStatus[status] = 0;
    });

    const pestCounts: Record<string, number> = {};
    const diseaseCounts: Record<string, number> = {};
    let totalConfidence = 0;
    let expertReviewCount = 0;
    let resolvedCount = 0;

    for (const report of reports) {
      const typedReport = report as unknown as InstanceType<typeof PestDiseaseReport>;
      
      if (typedReport.aiDetection?.primaryResult) {
        const detection = typedReport.aiDetection.primaryResult;
        
        result.byDetectionType[detection.detectionType]++;
        result.bySeverity[detection.severityLevel]++;
        totalConfidence += detection.confidenceScore;

        if (detection.detectionType === DetectionType.PEST) {
          pestCounts[detection.detectedEntity] = (pestCounts[detection.detectedEntity] || 0) + 1;
        } else if (detection.detectionType === DetectionType.DISEASE) {
          diseaseCounts[detection.detectedEntity] = (diseaseCounts[detection.detectedEntity] || 0) + 1;
        }
      }

      result.byStatus[typedReport.reportStatus]++;

      if (typedReport.expertReview) {
        expertReviewCount++;
      }

      if (typedReport.outcome?.isResolved) {
        resolvedCount++;
      }
    }

    result.averageConfidence = reports.length > 0 ? totalConfidence / reports.length : 0;
    result.expertReviewRate = reports.length > 0 ? (expertReviewCount / reports.length) * 100 : 0;
    result.resolutionRate = reports.length > 0 ? (resolvedCount / reports.length) * 100 : 0;

    result.topPests = Object.entries(pestCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    result.topDiseases = Object.entries(diseaseCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return result;
  }

  /**
   * Create treatment knowledge entry
   */
  async createTreatmentKnowledge(
    tenantId: Types.ObjectId,
    userId: Types.ObjectId,
    data: Partial<InstanceType<typeof TreatmentKnowledgeBase>>
  ): Promise<InstanceType<typeof TreatmentKnowledgeBase>> {
    const knowledge = await TreatmentKnowledgeBase.create({
      ...data,
      tenantId,
      createdBy: userId,
      isActive: true
    });

    await AuditService.log({
      userId: userId.toString(),
      organizationId: tenantId.toString(),
      action: 'treatment_knowledge.create',
      resource: 'TreatmentKnowledgeBase',
      resourceId: knowledge._id.toString(),
      details: {
        metadata: {
          pestOrDiseaseName: knowledge.pestOrDiseaseName,
          detectionType: knowledge.detectionType
        }
      }
    });

    return knowledge as unknown as InstanceType<typeof TreatmentKnowledgeBase>;
  }

  /**
   * Search treatment knowledge
   */
  async searchTreatmentKnowledge(
    tenantId: Types.ObjectId,
    searchTerm: string
  ): Promise<InstanceType<typeof TreatmentKnowledgeBase>[]> {
    return await TreatmentKnowledgeBase.find({
      tenantId,
      $or: [
        { pestOrDiseaseName: new RegExp(searchTerm, 'i') },
        { scientificName: new RegExp(searchTerm, 'i') },
        { commonNames: new RegExp(searchTerm, 'i') },
        { aliases: searchTerm.toLowerCase() }
      ],
      isPublished: true,
      isActive: true
    })
      .sort({ pestOrDiseaseName: 1 }) as unknown as InstanceType<typeof TreatmentKnowledgeBase>[];
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export default new PestDiseaseService();
export { PestDiseaseService };
