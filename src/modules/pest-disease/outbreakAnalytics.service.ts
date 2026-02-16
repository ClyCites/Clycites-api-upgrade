/**
 * Outbreak Analytics Service
 * 
 * Regional outbreak intelligence and analytics service. Analyzes pest and disease
 * report patterns to detect emerging outbreaks, predict spread, and generate
 * actionable advisories for agricultural authorities and farmers.
 */

import { Types } from 'mongoose';
import PestDiseaseReport from './pestDiseaseReport.model';
import {
  DetectionType,
  SeverityLevel,
  OutbreakSeverity,
  IOutbreakTimeline,
  IAffectedCrop,
  IOutbreakRegion
} from './pestDisease.types';
import logger from '../../common/utils/logger';
import { AppError } from '../../common/errors/AppError';

// ============================================================================
// ANALYTICS INTERFACES
// ============================================================================

interface OutbreakDetectionParams {
  tenantId: Types.ObjectId;
  regionName: string;
  regionGeometry: IOutbreakRegion['geometry'];
  regionCenter: IOutbreakRegion['centerPoint'];
  adminLevel: number;
  timeWindowDays?: number;
  minReportsThreshold?: number;
  minConfidenceScore?: number;
}

interface OutbreakAnalysis {
  isOutbreak: boolean;
  severity: OutbreakSeverity;
  pestOrDisease: string;
  detectionType: DetectionType;
  reportCount: number;
  confirmedCount: number;
  farmsAffected: number;
  affectedCrops: IAffectedCrop[];
  averageConfidence: number;
  timeline: IOutbreakTimeline[];
  estimatedSpread?: {
    direction: string;
    speed: string;
    riskAreas: string[];
  };
}

interface HotspotResult {
  location: [number, number];
  pestOrDisease: string;
  reportCount: number;
  severityIndex: number;
  radius: number;
}

interface TrendAnalysis {
  pestOrDisease: string;
  detectionType: DetectionType;
  currentPeriod: {
    reportCount: number;
    averageSeverity: number;
  };
  previousPeriod: {
    reportCount: number;
    averageSeverity: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercentage: number;
}

// ============================================================================
// OUTBREAK ANALYTICS SERVICE
// ============================================================================

class OutbreakAnalyticsService {
  /**
   * Detect potential outbreak from recent reports
   */
  async detectOutbreak(params: OutbreakDetectionParams): Promise<OutbreakAnalysis | null> {
    try {
      const {
        tenantId,
        regionName,
        regionGeometry,
        regionCenter,
        adminLevel,
        timeWindowDays = 14,
        minReportsThreshold = 5,
        minConfidenceScore = 60
      } = params;

      logger.info('Analyzing outbreak potential', {
        region: regionName,
        timeWindowDays,
        minReportsThreshold
      });

      // Calculate time range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeWindowDays);

      // Find reports within region and time range
      const reports = await PestDiseaseReport.find({
        tenantId,
        'fieldContext.farmLocation': {
          $geoWithin: {
            $geometry: regionGeometry
          }
        },
        'aiDetection.primaryResult.confidenceScore': { $gte: minConfidenceScore },
        createdAt: { $gte: startDate, $lte: endDate },
        isActive: true
      }).populate('farmerId farmId');

      if (reports.length < minReportsThreshold) {
        logger.info('Insufficient reports for outbreak detection', {
          reportCount: reports.length,
          threshold: minReportsThreshold
        });
        return null;
      }

      // Group by pest/disease
      const groupedReports = this.groupReportsByPestDisease(reports as unknown as InstanceType<typeof PestDiseaseReport>[]);

      // Find the most prevalent pest/disease
      let maxCount = 0;
      let primaryPestDisease = '';
      let primaryDetectionType = DetectionType.UNKNOWN;

      for (const [pestDisease, reportList] of Object.entries(groupedReports)) {
        if (reportList.length > maxCount) {
          maxCount = reportList.length;
          primaryPestDisease = pestDisease;
          primaryDetectionType = reportList[0].aiDetection.primaryResult.detectionType;
        }
      }

      const relevantReports = groupedReports[primaryPestDisease];

      // Check if meets outbreak threshold
      if (relevantReports.length < minReportsThreshold) {
        return null;
      }

      // Calculate outbreak metrics
      const confirmedCount = relevantReports.filter(
        r => r.reportStatus === 'confirmed'
      ).length;

      const farmsAffected = new Set(
        relevantReports.map(r => r.farmId.toString())
      ).size;

      const averageConfidence = relevantReports.reduce(
        (sum, r) => sum + r.aiDetection.primaryResult.confidenceScore,
        0
      ) / relevantReports.length;

      // Analyze affected crops
      const affectedCrops = this.analyzeAffectedCrops(relevantReports);

      // Generate timeline
      const timeline = this.generateTimeline(relevantReports, startDate, endDate);

      // Determine severity
      const severity = this.calculateOutbreakSeverity(
        relevantReports.length,
        farmsAffected,
        affectedCrops,
        adminLevel
      );

      // Predict spread (basic implementation)
      const estimatedSpread = await this.predictSpread(
        relevantReports,
        regionName,
        regionCenter
      );

      const analysis: OutbreakAnalysis = {
        isOutbreak: true,
        severity,
        pestOrDisease: primaryPestDisease,
        detectionType: primaryDetectionType,
        reportCount: relevantReports.length,
        confirmedCount,
        farmsAffected,
        affectedCrops,
        averageConfidence,
        timeline,
        estimatedSpread
      };

      logger.info('Outbreak detected', {
        pestOrDisease: primaryPestDisease,
        severity,
        reportCount: relevantReports.length
      });

      return analysis;

    } catch (error) {
      logger.error('Outbreak detection failed', { error });
      throw new AppError(
        'Outbreak analysis failed',
        500,
        'OUTBREAK_ANALYSIS_ERROR'
      );
    }
  }

  /**
   * Group reports by pest/disease
   */
  private groupReportsByPestDisease(
    reports: Array<InstanceType<typeof PestDiseaseReport>>
  ): Record<string, Array<InstanceType<typeof PestDiseaseReport>>> {
    const grouped: Record<string, Array<InstanceType<typeof PestDiseaseReport>>> = {};

    for (const report of reports) {
      const entity = report.aiDetection.primaryResult.detectedEntity;
      if (!grouped[entity]) {
        grouped[entity] = [];
      }
      grouped[entity].push(report);
    }

    return grouped;
  }

  /**
   * Analyze affected crops
   */
  private analyzeAffectedCrops(
    reports: Array<InstanceType<typeof PestDiseaseReport>>
  ): IAffectedCrop[] {
    const cropMap: Record<string, { count: number; severities: SeverityLevel[] }> = {};

    for (const report of reports) {
      const cropType = report.fieldContext.cropType;
      const severity = report.aiDetection.primaryResult.severityLevel;

      if (!cropMap[cropType]) {
        cropMap[cropType] = { count: 0, severities: [] };
      }

      cropMap[cropType].count++;
      cropMap[cropType].severities.push(severity);
    }

    return Object.entries(cropMap).map(([cropType, data]) => ({
      cropType,
      reportCount: data.count,
      averageSeverity: this.calculateAverageSeverity(data.severities)
    }));
  }

  /**
   * Calculate average severity level
   */
  private calculateAverageSeverity(severities: SeverityLevel[]): SeverityLevel {
    const severityScores: Record<SeverityLevel, number> = {
      [SeverityLevel.NONE]: 0,
      [SeverityLevel.LOW]: 1,
      [SeverityLevel.MODERATE]: 2,
      [SeverityLevel.HIGH]: 3,
      [SeverityLevel.SEVERE]: 4,
      [SeverityLevel.CRITICAL]: 5
    };

    const avgScore = severities.reduce(
      (sum, sev) => sum + severityScores[sev],
      0
    ) / severities.length;

    // Map back to severity level
    if (avgScore >= 4.5) return SeverityLevel.CRITICAL;
    if (avgScore >= 3.5) return SeverityLevel.SEVERE;
    if (avgScore >= 2.5) return SeverityLevel.HIGH;
    if (avgScore >= 1.5) return SeverityLevel.MODERATE;
    if (avgScore >= 0.5) return SeverityLevel.LOW;
    return SeverityLevel.NONE;
  }

  /**
   * Generate outbreak timeline
   */
  private generateTimeline(
    reports: Array<InstanceType<typeof PestDiseaseReport>>,
    startDate: Date,
    endDate: Date
  ): IOutbreakTimeline[] {
    const timeline: Map<string, IOutbreakTimeline> = new Map();

    // Initialize timeline with all dates
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      timeline.set(dateKey, {
        date: new Date(currentDate),
        reportCount: 0,
        confirmedCount: 0,
        severityIndex: 0
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Populate with report data
    for (const report of reports) {
      const dateKey = report.createdAt.toISOString().split('T')[0];
      const entry = timeline.get(dateKey);
      
      if (entry) {
        entry.reportCount++;
        if (report.reportStatus === 'confirmed') {
          entry.confirmedCount++;
        }
        
        // Update severity index (composite score)
        const severityScore = this.getSeverityScore(
          report.aiDetection.primaryResult.severityLevel
        );
        entry.severityIndex = Math.round(
          ((entry.severityIndex * (entry.reportCount - 1)) + severityScore) / entry.reportCount
        );
      }
    }

    return Array.from(timeline.values()).sort((a, b) => 
      a.date.getTime() - b.date.getTime()
    );
  }

  /**
   * Get numeric score for severity level
   */
  private getSeverityScore(severity: SeverityLevel): number {
    const scores: Record<SeverityLevel, number> = {
      [SeverityLevel.NONE]: 0,
      [SeverityLevel.LOW]: 20,
      [SeverityLevel.MODERATE]: 40,
      [SeverityLevel.HIGH]: 60,
      [SeverityLevel.SEVERE]: 80,
      [SeverityLevel.CRITICAL]: 100
    };
    return scores[severity] || 40;
  }

  /**
   * Calculate outbreak severity based on metrics
   */
  private calculateOutbreakSeverity(
    reportCount: number,
    farmsAffected: number,
    affectedCrops: IAffectedCrop[],
    adminLevel: number
  ): OutbreakSeverity {
    // Score factors
    let score = 0;

    // Report volume
    if (reportCount >= 100) score += 40;
    else if (reportCount >= 50) score += 30;
    else if (reportCount >= 20) score += 20;
    else if (reportCount >= 10) score += 10;

    // Farms affected
    if (farmsAffected >= 50) score += 30;
    else if (farmsAffected >= 20) score += 20;
    else if (farmsAffected >= 10) score += 15;
    else if (farmsAffected >= 5) score += 10;

    // Multiple crops affected
    if (affectedCrops.length >= 5) score += 20;
    else if (affectedCrops.length >= 3) score += 15;
    else if (affectedCrops.length >= 2) score += 10;

    // Administrative level (higher level = wider area)
    if (adminLevel === 1) score += 10; // Country level
    else if (adminLevel === 2) score += 5; // State/province

    // Map score to severity
    if (score >= 80) return OutbreakSeverity.PANDEMIC;
    if (score >= 60) return OutbreakSeverity.EPIDEMIC;
    if (score >= 40) return OutbreakSeverity.WIDESPREAD;
    if (score >= 20) return OutbreakSeverity.LOCALIZED;
    return OutbreakSeverity.SPORADIC;
  }

  /**
   * Predict outbreak spread (basic implementation)
   */
  private async predictSpread(
    reports: Array<InstanceType<typeof PestDiseaseReport>>,
    regionName: string,
    regionCenter: IOutbreakRegion['centerPoint']
  ): Promise<{ direction: string; speed: string; riskAreas: string[] }> {
    // This is a simplified implementation
    // In production, this would use more sophisticated algorithms
    // (spatial interpolation, time-series analysis, weather data, etc.)

    // Calculate center of mass of reports
    let avgLon = 0;
    let avgLat = 0;
    let count = 0;

    for (const report of reports) {
      const coords = report.fieldContext.farmLocation.coordinates;
      avgLon += coords[0];
      avgLat += coords[1];
      count++;
    }

    avgLon /= count;
    avgLat /= count;

    // Direction from region center to report center
    const direction = this.calculateDirection(
      regionCenter.coordinates,
      [avgLon, avgLat]
    );

    // Estimate speed based on report frequency
    const sortedReports = reports.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
    
    const timeSpan = sortedReports[sortedReports.length - 1].createdAt.getTime() - 
                    sortedReports[0].createdAt.getTime();
    const daysSpan = timeSpan / (1000 * 60 * 60 * 24);
    
    let speed = 'slow';
    if (daysSpan < 7 && reports.length > 20) speed = 'rapid';
    else if (daysSpan < 14 && reports.length > 10) speed = 'moderate';

    // Risk areas (simplified - would use geospatial neighbors in production)
    const riskAreas = [`${regionName} neighboring regions`];

    return {
      direction,
      speed,
      riskAreas
    };
  }

  /**
   * Calculate direction between two points
   */
  private calculateDirection(from: [number, number], to: [number, number]): string {
    const deltaLon = to[0] - from[0];
    const deltaLat = to[1] - from[1];

    const angle = Math.atan2(deltaLat, deltaLon) * (180 / Math.PI);

    if (angle >= -22.5 && angle < 22.5) return 'E';
    if (angle >= 22.5 && angle < 67.5) return 'NE';
    if (angle >= 67.5 && angle < 112.5) return 'N';
    if (angle >= 112.5 && angle < 157.5) return 'NW';
    if (angle >= 157.5 || angle < -157.5) return 'W';
    if (angle >= -157.5 && angle < -112.5) return 'SW';
    if (angle >= -112.5 && angle < -67.5) return 'S';
    if (angle >= -67.5 && angle < -22.5) return 'SE';

    return 'Unknown';
  }

  /**
   * Identify hotspots (clustering of reports)
   */
  async identifyHotspots(
    tenantId: Types.ObjectId,
    detectionType?: DetectionType,
    days = 30,
    radiusKm = 50
  ): Promise<HotspotResult[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const query: Record<string, unknown> = {
        tenantId,
        createdAt: { $gte: startDate },
        isActive: true
      };

      if (detectionType) {
        query['aiDetection.primaryResult.detectionType'] = detectionType;
      }

      const reports = await PestDiseaseReport.find(query);

      // Use simple grid-based clustering
      const clusters = this.clusterReports(reports as unknown as InstanceType<typeof PestDiseaseReport>[], radiusKm);

      const hotspots: HotspotResult[] = clusters.map(cluster => ({
        location: cluster.center,
        pestOrDisease: cluster.primaryPestDisease,
        reportCount: cluster.reports.length,
        severityIndex: cluster.severityIndex,
        radius: radiusKm
      }));

      return hotspots.sort((a, b) => b.severityIndex - a.severityIndex);

    } catch (error) {
      logger.error('Hotspot identification failed', { error });
      throw new AppError(
        'Hotspot analysis failed',
        500,
        'HOTSPOT_ANALYSIS_ERROR'
      );
    }
  }

  /**
   * Simple clustering algorithm
   */
  private clusterReports(
    reports: Array<InstanceType<typeof PestDiseaseReport>>,
    radiusKm: number
  ): Array<{
    center: [number, number];
    primaryPestDisease: string;
    reports: Array<InstanceType<typeof PestDiseaseReport>>;
    severityIndex: number;
  }> {
    const clusters: Array<{
      center: [number, number];
      primaryPestDisease: string;
      reports: Array<InstanceType<typeof PestDiseaseReport>>;
      severityIndex: number;
    }> = [];

    const used = new Set<number>();

    for (let i = 0; i < reports.length; i++) {
      if (used.has(i)) continue;

      const clusterReports: Array<InstanceType<typeof PestDiseaseReport>> = [reports[i]];
      used.add(i);

      const baseCoords = reports[i].fieldContext.farmLocation.coordinates;

      // Find nearby reports
      for (let j = i + 1; j < reports.length; j++) {
        if (used.has(j)) continue;

        const coords = reports[j].fieldContext.farmLocation.coordinates;
        const distance = this.calculateDistance(baseCoords, coords);

        if (distance <= radiusKm) {
          clusterReports.push(reports[j]);
          used.add(j);
        }
      }

      // Only create cluster if multiple reports
      if (clusterReports.length >= 3) {
        const center = this.calculateCentroid(clusterReports);
        const primaryPestDisease = this.getMostCommonPestDisease(clusterReports);
        const severityIndex = this.calculateClusterSeverity(clusterReports);

        clusters.push({
          center,
          primaryPestDisease,
          reports: clusterReports,
          severityIndex
        });
      }
    }

    return clusters;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(point1: [number, number], point2: [number, number]): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(point2[1] - point1[1]);
    const dLon = this.toRad(point2[0] - point1[0]);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1[1])) *
      Math.cos(this.toRad(point2[1])) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate centroid of report cluster
   */
  private calculateCentroid(
    reports: Array<InstanceType<typeof PestDiseaseReport>>
  ): [number, number] {
    let sumLon = 0;
    let sumLat = 0;

    for (const report of reports) {
      const coords = report.fieldContext.farmLocation.coordinates;
      sumLon += coords[0];
      sumLat += coords[1];
    }

    return [sumLon / reports.length, sumLat / reports.length];
  }

  /**
   * Get most common pest/disease in cluster
   */
  private getMostCommonPestDisease(
    reports: Array<InstanceType<typeof PestDiseaseReport>>
  ): string {
    const counts: Record<string, number> = {};

    for (const report of reports) {
      const entity = report.aiDetection.primaryResult.detectedEntity;
      counts[entity] = (counts[entity] || 0) + 1;
    }

    return Object.entries(counts).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  }

  /**
   * Calculate cluster severity index
   */
  private calculateClusterSeverity(
    reports: Array<InstanceType<typeof PestDiseaseReport>>
  ): number {
    const avgConfidence = reports.reduce(
      (sum, r) => sum + r.aiDetection.primaryResult.confidenceScore,
      0
    ) / reports.length;

    const avgSeverity = reports.reduce(
      (sum, r) => sum + this.getSeverityScore(r.aiDetection.primaryResult.severityLevel),
      0
    ) / reports.length;

    // Combine report count, confidence, and severity
    return Math.min(
      Math.round((reports.length * 2) + (avgConfidence / 5) + (avgSeverity / 2)),
      100
    );
  }

  /**
   * Analyze trends over time
   */
  async analyzeTrends(
    tenantId: Types.ObjectId,
    currentPeriodDays = 30,
    previousPeriodDays = 30
  ): Promise<TrendAnalysis[]> {
    const currentEnd = new Date();
    const currentStart = new Date();
    currentStart.setDate(currentStart.getDate() - currentPeriodDays);

    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - previousPeriodDays);

    // Aggregate data for both periods
    const [currentData, previousData] = await Promise.all([
      this.aggregatePeriodData(tenantId, currentStart, currentEnd),
      this.aggregatePeriodData(tenantId, previousStart, currentStart)
    ]);

    // Compare and generate trends
    const trends: TrendAnalysis[] = [];

    for (const entity of Object.keys(currentData)) {
      const current = currentData[entity];
      const previous = previousData[entity] || { count: 0, avgSeverity: 0 };

      const changePercentage = previous.count > 0
        ? ((current.count - previous.count) / previous.count) * 100
        : 100;

      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (changePercentage > 20) trend = 'increasing';
      else if (changePercentage < -20) trend = 'decreasing';

      trends.push({
        pestOrDisease: entity,
        detectionType: current.detectionType,
        currentPeriod: {
          reportCount: current.count,
          averageSeverity: current.avgSeverity
        },
        previousPeriod: {
          reportCount: previous.count,
          averageSeverity: previous.avgSeverity
        },
        trend,
        changePercentage: Math.round(changePercentage)
      });
    }

    return trends.sort((a, b) => b.currentPeriod.reportCount - a.currentPeriod.reportCount);
  }

  /**
   * Aggregate data for a time period
   */
  private async aggregatePeriodData(
    tenantId: Types.ObjectId,
    startDate: Date,
    endDate: Date
  ): Promise<Record<string, { count: number; avgSeverity: number; detectionType: DetectionType }>> {
    const reports = await PestDiseaseReport.find({
      tenantId,
      createdAt: { $gte: startDate, $lte: endDate },
      isActive: true
    });

    const data: Record<string, { count: number; totalSeverity: number; detectionType: DetectionType }> = {};

    for (const report of reports) {
      const entity = (report as unknown as InstanceType<typeof PestDiseaseReport>).aiDetection.primaryResult.detectedEntity;
      const severity = (report as unknown as InstanceType<typeof PestDiseaseReport>).aiDetection.primaryResult.severityLevel;
      const detectionType = (report as unknown as InstanceType<typeof PestDiseaseReport>).aiDetection.primaryResult.detectionType;

      if (!data[entity]) {
        data[entity] = { count: 0, totalSeverity: 0, detectionType };
      }

      data[entity].count++;
      data[entity].totalSeverity += this.getSeverityScore(severity);
    }

    const result: Record<string, { count: number; avgSeverity: number; detectionType: DetectionType }> = {};
    for (const [entity, stats] of Object.entries(data)) {
      result[entity] = {
        count: stats.count,
        avgSeverity: stats.totalSeverity / stats.count,
        detectionType: stats.detectionType
      };
    }

    return result;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export default new OutbreakAnalyticsService();
export {
  OutbreakAnalyticsService,
  OutbreakDetectionParams,
  OutbreakAnalysis,
  HotspotResult,
  TrendAnalysis
};
