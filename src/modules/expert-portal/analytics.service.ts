/**
 * Analytics & Intelligence Service
 *
 * Provides regional disease intelligence, expert performance reports,
 * AI model accuracy trends, knowledge base usage statistics, and
 * policy priority insights for the Expert Portal decision layer.
 */

import CaseAssignment from './caseAssignment.model';
import ExpertProfile from './expertProfile.model';
import KnowledgeArticle from './knowledgeArticle.model';
import Advisory from './advisory.model';
import FarmerInquiry from './farmerInquiry.model';
import logger from '../../common/utils/logger';
import {
  CaseReviewStatus,
  CaseReviewDecision,
  ExpertStatus,
  PublicationStatus,
} from './expert.types';

// DTO Types ------------------------------------------------------------------

interface DateRangeDTO {
  from: Date;
  to: Date;
}

// ============================================================================

export class AnalyticsService {

  // ---------------------------------------------------------------------------
  // Regional Disease Intelligence
  // ---------------------------------------------------------------------------

  /**
   * Aggregate disease spread by region within a date range
   */
  async getRegionalDiseaseSpread(region: string, dateRange: DateRangeDTO) {
    const matchStage: Record<string, unknown> = {
      createdAt: { $gte: dateRange.from, $lte: dateRange.to },
    };
    if (region !== 'all') {
      matchStage['pestDiseaseReport.location.region'] = region;
    }

    const spreadData = await CaseAssignment.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'pestdiseasereports',
          localField: 'pestDiseaseReport',
          foreignField: '_id',
          as: 'report',
        },
      },
      { $unwind: '$report' },
      {
        $group: {
          _id: {
            region: '$report.location.region',
            pesticideOrDisease: '$report.detectedIssue.name',
            severity: '$report.severity',
          },
          caseCount: { $sum: 1 },
          outbreakCount: {
            $sum: { $cond: [{ $eq: ['$isOutbreak', true] }, 1, 0] },
          },
          confirmedCount: {
            $sum: {
              $cond: [{ $eq: ['$status', CaseReviewStatus.REVIEWED] }, 1, 0],
            },
          },
          avgResponseHours: {
            $avg: {
              $cond: [
                { $and: ['$assignedAt', '$reviewedAt'] },
                {
                  $divide: [
                    { $subtract: ['$reviewedAt', '$assignedAt'] },
                    3600000,
                  ],
                },
                null,
              ],
            },
          },
        },
      },
      { $sort: { caseCount: -1 } },
    ]);

    logger.info(`Regional disease spread query for region=${region}`);
    return spreadData;
  }

  /**
   * Outbreak hotspot map data
   */
  async getOutbreakHeatmap(dateRange: DateRangeDTO) {
    const data = await CaseAssignment.aggregate([
      {
        $match: {
          isOutbreak: true,
          createdAt: { $gte: dateRange.from, $lte: dateRange.to },
        },
      },
      {
        $lookup: {
          from: 'pestdiseasereports',
          localField: 'pestDiseaseReport',
          foreignField: '_id',
          as: 'report',
        },
      },
      { $unwind: '$report' },
      {
        $project: {
          _id: 0,
          region: '$report.location.region',
          district: '$report.location.district',
          lat: '$report.location.coordinates.lat',
          lng: '$report.location.coordinates.lng',
          disease: '$report.detectedIssue.name',
          severity: '$report.severity',
          reportDate: '$createdAt',
        },
      },
    ]);

    return data;
  }

  // ---------------------------------------------------------------------------
  // Expert Performance Reports
  // ---------------------------------------------------------------------------

  /**
   * Aggregate performance metrics for all active experts
   */
  async getExpertPerformanceReport(dateRange: DateRangeDTO) {
    const [casesData, inquiryData, experts] = await Promise.all([
      CaseAssignment.aggregate([
        {
          $match: {
            assignedAt: { $gte: dateRange.from, $lte: dateRange.to },
            assignedExpert: { $exists: true },
          },
        },
        {
          $group: {
            _id: '$assignedExpert',
            totalCases: { $sum: 1 },
            completedCases: {
              $sum: { $cond: [{ $eq: ['$status', CaseReviewStatus.REVIEWED] }, 1, 0] },
            },
            escalatedCases: {
              $sum: { $cond: [{ $eq: ['$status', CaseReviewStatus.ESCALATED] }, 1, 0] },
            },
            accurateCases: {
              $sum: {
                $cond: [
                  {
                    $eq: ['$decision', CaseReviewDecision.APPROVED],
                  },
                  1,
                  0,
                ],
              },
            },
            avgTurnaroundHours: {
              $avg: {
                $cond: [
                  { $and: ['$assignedAt', '$reviewedAt'] },
                  {
                    $divide: [
                      { $subtract: ['$reviewedAt', '$assignedAt'] },
                      3600000,
                    ],
                  },
                  null,
                ],
              },
            },
          },
        },
      ]),
      FarmerInquiry.aggregate([
        {
          $match: {
            assignedAt: { $gte: dateRange.from, $lte: dateRange.to },
          },
        },
        {
          $group: {
            _id: '$assignedExpert',
            inquiries: { $sum: 1 },
            avgRating: { $avg: '$farmerRating' },
            ratedCount: {
              $sum: { $cond: [{ $ne: ['$farmerRating', null] }, 1, 0] },
            },
          },
        },
      ]),
      ExpertProfile.find({ status: ExpertStatus.ACTIVE })
        .select('_id displayName title specializations performance')
        .lean(),
    ]);

    // Merge data
    const caseMap = new Map(casesData.map((d) => [d._id.toString(), d]));
    const inquiryMap = new Map(inquiryData.map((d) => [d._id?.toString(), d]));

    return experts.map((expert) => {
      const id = expert._id.toString();
      const caseStats = caseMap.get(id) || {};
      const inquiryStats = inquiryMap.get(id) || {};
      return {
        expertId: id,
        displayName: expert.displayName,
        title: expert.title,
        specializations: expert.specializations,
        cases: caseStats,
        inquiries: inquiryStats,
        storedPerformance: expert.performance,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // AI Model Accuracy
  // ---------------------------------------------------------------------------

  /**
   * AI detection accuracy trend over time
   */
  async getAIAccuracyTrend(dateRange: DateRangeDTO, period: 'day' | 'week' | 'month' = 'week') {
    const groupId: Record<string, unknown> = {};

    if (period === 'day') {
      groupId.year = { $year: '$reviewedAt' };
      groupId.month = { $month: '$reviewedAt' };
      groupId.day = { $dayOfMonth: '$reviewedAt' };
    } else if (period === 'week') {
      groupId.year = { $year: '$reviewedAt' };
      groupId.week = { $week: '$reviewedAt' };
    } else {
      groupId.year = { $year: '$reviewedAt' };
      groupId.month = { $month: '$reviewedAt' };
    }

    const data = await CaseAssignment.aggregate([
      {
        $match: {
          reviewedAt: { $gte: dateRange.from, $lte: dateRange.to },
          status: CaseReviewStatus.REVIEWED,
        },
      },
      {
        $group: {
          _id: groupId,
          totalReviewed: { $sum: 1 },
          confirmed: {
            $sum: {
              $cond: [
                { $eq: ['$decision', CaseReviewDecision.APPROVED] },
                1,
                0,
              ],
            },
          },
          corrected: {
            $sum: {
              $cond: [
                { $eq: ['$decision', CaseReviewDecision.MODIFIED] },
                1,
                0,
              ],
            },
          },
          rejected: {
            $sum: {
              $cond: [
                { $eq: ['$decision', CaseReviewDecision.REJECTED] },
                1,
                0,
              ],
            },
          },
          avgAIConfidence: { $avg: '$aiConfidenceScore' },
        },
      },
      {
        $addFields: {
          accuracyRate: {
            $cond: [
              { $gt: ['$totalReviewed', 0] },
              { $divide: ['$confirmed', '$totalReviewed'] },
              0,
            ],
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1, '_id.day': 1 } },
    ]);

    return data;
  }

  // ---------------------------------------------------------------------------
  // Knowledge Base Analytics
  // ---------------------------------------------------------------------------

  /**
   * Knowledge base usage stats
   */
  async getKnowledgeBaseStats(dateRange?: DateRangeDTO) {
    const match: Record<string, unknown> = {
      publicationStatus: PublicationStatus.PUBLISHED,
    };
    if (dateRange) {
      match.publishedAt = { $gte: dateRange.from, $lte: dateRange.to };
    }

    const [categoryStats, topArticles, engagement] = await Promise.all([
      KnowledgeArticle.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$category',
            articleCount: { $sum: 1 },
            totalViews: { $sum: '$viewCount' },
            totalRatings: { $sum: '$ratingCount' },
            avgRating: { $avg: '$averageRating' },
          },
        },
        { $sort: { totalViews: -1 } },
      ]),
      KnowledgeArticle.find({
        publicationStatus: PublicationStatus.PUBLISHED,
        ...(dateRange ? { publishedAt: { $gte: dateRange.from, $lte: dateRange.to } } : {}),
      })
        .select('title category viewCount averageRating ratingCount')
        .sort({ viewCount: -1 })
        .limit(10),
      KnowledgeArticle.aggregate([
        { $match: { publicationStatus: PublicationStatus.PUBLISHED } },
        {
          $group: {
            _id: null,
            totalArticles: { $sum: 1 },
            totalViews: { $sum: '$viewCount' },
            avgRating: { $avg: '$averageRating' },
          },
        },
      ]),
    ]);

    return {
      overall: engagement[0] || { totalArticles: 0, totalViews: 0, avgRating: 0 },
      byCategory: categoryStats,
      topArticles,
    };
  }

  /**
   * Tag frequency analysis
   */
  async getPopularTags(limit = 20) {
    return KnowledgeArticle.aggregate([
      { $match: { publicationStatus: PublicationStatus.PUBLISHED } },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);
  }

  // ---------------------------------------------------------------------------
  // Advisory Engagement
  // ---------------------------------------------------------------------------

  /**
   * Advisory engagement metrics
   */
  async getAdvisoryEngagement(dateRange: DateRangeDTO) {
    return Advisory.aggregate([
      {
        $match: {
          sentAt: { $gte: dateRange.from, $lte: dateRange.to },
        },
      },
      {
        $group: {
          _id: '$type',
          sent: { $sum: 1 },
          totalRecipients: { $sum: '$totalRecipients' },
          totalDelivered: { $sum: '$deliveredCount' },
          totalAcknowledged: { $sum: '$acknowledgedCount' },
        },
      },
      {
        $addFields: {
          deliveryRate: {
            $cond: [
              { $gt: ['$totalRecipients', 0] },
              { $divide: ['$totalDelivered', '$totalRecipients'] },
              0,
            ],
          },
          ackRate: {
            $cond: [
              { $gt: ['$totalDelivered', 0] },
              { $divide: ['$totalAcknowledged', '$totalDelivered'] },
              0,
            ],
          },
        },
      },
    ]);
  }

  // ---------------------------------------------------------------------------
  // Farmer Inquiry Metrics
  // ---------------------------------------------------------------------------

  async getInquiryMetrics(dateRange: DateRangeDTO) {
    return FarmerInquiry.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange.from, $lte: dateRange.to },
        },
      },
      {
        $facet: {
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ],
          byCategory: [
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 },
                avgRating: { $avg: '$farmerRating' },
              },
            },
          ],
          responseTime: [
            {
              $match: {
                respondedAt: { $exists: true },
                assignedAt: { $exists: true },
              },
            },
            {
              $group: {
                _id: null,
                avgResponseHours: {
                  $avg: {
                    $divide: [
                      { $subtract: ['$respondedAt', '$assignedAt'] },
                      3600000,
                    ],
                  },
                },
              },
            },
          ],
          satisfaction: [
            { $match: { farmerRating: { $exists: true } } },
            {
              $group: {
                _id: null,
                avgRating: { $avg: '$farmerRating' },
                ratedCount: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);
  }

  // ---------------------------------------------------------------------------
  // Policy & Priority Dashboard
  // ---------------------------------------------------------------------------

  /**
   * High-level dashboard for directors/policy makers
   */
  async getPolicyDashboard(dateRange: DateRangeDTO) {
    const [spread, aiAccuracy, expertPerformance, knowledgeStats, inquiryMetrics] =
      await Promise.all([
        this.getRegionalDiseaseSpread('all', dateRange),
        this.getAIAccuracyTrend(dateRange, 'month'),
        this.getExpertPerformanceReport(dateRange),
        this.getKnowledgeBaseStats(dateRange),
        this.getInquiryMetrics(dateRange),
      ]);

    // Compute aggregate KPIs
    const totalCases = spread.reduce((sum: number, r: { caseCount: number }) => sum + r.caseCount, 0);
    const totalOutbreaks = spread.reduce(
      (sum: number, r: { outbreakCount: number }) => sum + r.outbreakCount,
      0
    );
    const lastAccuracyEntry = aiAccuracy[aiAccuracy.length - 1];
    const currentAIAccuracy = lastAccuracyEntry ? lastAccuracyEntry.accuracyRate : null;

    return {
      summary: {
        totalCasesInPeriod: totalCases,
        totalOutbreaks,
        currentAIAccuracy: currentAIAccuracy
          ? `${(currentAIAccuracy * 100).toFixed(1)}%`
          : 'N/A',
        knowledgeArticles: knowledgeStats.overall?.totalArticles ?? 0,
      },
      regionalSpread: spread,
      aiAccuracyTrend: aiAccuracy,
      expertPerformance: expertPerformance.slice(0, 10), // top 10
      knowledgeBaseStats: knowledgeStats,
      inquiryMetrics,
    };
  }

  // ---------------------------------------------------------------------------
  // Category shortcuts
  // ---------------------------------------------------------------------------

  async getCategoryBreakdown() {
    return KnowledgeArticle.aggregate([
      { $match: { publicationStatus: PublicationStatus.PUBLISHED } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgViews: { $avg: '$viewCount' },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }
}

export default new AnalyticsService();
