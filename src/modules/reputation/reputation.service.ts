import mongoose from 'mongoose';
import Rating, { IRating } from './rating.model';
import ReputationScore, { IReputationScore } from './reputation.model';
import Order from '../orders/order.model';
import { AppError } from '../../common/errors/AppError';
import logger from '../../common/utils/logger';

interface CreateRatingDTO {
  order: string;
  overallRating: number;
  categoryRatings?: {
    productQuality?: number;
    communication?: number;
    packaging?: number;
    delivery?: number;
    pricing?: number;
    professionalism?: number;
    responsiveness?: number;
  };
  review?: string;
  pros?: string[];
  cons?: string[];
  wouldRecommend: boolean;
  wouldBuyAgain?: boolean;
  images?: string[];
}

export class ReputationService {

  async createRating(userId: string, data: CreateRatingDTO): Promise<IRating> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {

      const order = await Order.findById(data.order).session(session);
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      if (order.status !== 'completed') {
        throw new AppError('Can only rate completed orders', 400);
      }

      // Determine rater role and rated user
      let raterRole: 'buyer' | 'seller';
      let ratedUserId: mongoose.Types.ObjectId;

      if (order.buyer.toString() === userId) {
        raterRole = 'buyer';
        ratedUserId = order.farmer;
      } else if (order.farmer.toString() === userId) {
        raterRole = 'seller';
        ratedUserId = order.buyer;
      } else {
        throw new AppError('You are not part of this order', 403);
      }

      // Check if already rated
      const existingRating = await Rating.findOne({
        order: data.order,
        ratedBy: userId,
        raterRole,
      }).session(session);

      if (existingRating) {
        throw new AppError('You have already rated this order', 400);
      }

      // Create rating
      const rating = new Rating({
        order: data.order,
        ratedUser: ratedUserId,
        ratedBy: userId,
        raterRole,
        overallRating: data.overallRating,
        categoryRatings: data.categoryRatings || {},
        review: data.review,
        pros: data.pros || [],
        cons: data.cons || [],
        wouldRecommend: data.wouldRecommend,
        wouldBuyAgain: data.wouldBuyAgain,
        images: data.images || [],
        verified: true,
        status: 'approved',
      });

      await rating.save({ session });

      // Update reputation score
      await this.updateReputationScore(ratedUserId.toString(), session);

      await session.commitTransaction();

      logger.info(`Rating created for order ${data.order} by user ${userId}`);

      // TODO: Send notification to rated user
      // await notificationService.notifyNewRating(rating);

      return rating.populate(['ratedUser', 'ratedBy']);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Update reputation score for a user
   */
  async updateReputationScore(
    userId: string,
    session?: mongoose.ClientSession
  ): Promise<IReputationScore> {
    // Get or create reputation score
    let reputation = await ReputationScore.findOne({ user: userId }).session(session || null);
    
    if (!reputation) {
      reputation = new ReputationScore({
        user: userId,
        userType: 'farmer', // TODO: Get from user profile
      });
    }

    // Calculate rating statistics
    const ratings = await Rating.find({
      ratedUser: userId,
      status: 'approved',
    }).session(session || null);

    const ratingCount = ratings.length;
    if (ratingCount > 0) {
      const sumRating = ratings.reduce((sum, r) => sum + r.overallRating, 0);
      reputation.ratings.average = sumRating / ratingCount;
      reputation.ratings.count = ratingCount;

      // Rating distribution
      reputation.ratings.distribution = {
        five: ratings.filter((r) => r.overallRating === 5).length,
        four: ratings.filter((r) => r.overallRating === 4).length,
        three: ratings.filter((r) => r.overallRating === 3).length,
        two: ratings.filter((r) => r.overallRating === 2).length,
        one: ratings.filter((r) => r.overallRating === 1).length,
      };

      // Recent ratings (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      reputation.ratings.recent30Days = ratings.filter(
        (r) => r.createdAt >= thirtyDaysAgo
      ).length;
    }

    // Calculate transaction statistics
    const allOrders = await Order.find({
      $or: [{ buyer: userId }, { farmer: userId }],
    }).session(session || null);

    const completedOrders = allOrders.filter((o) => o.status === 'completed');
    const cancelledOrders = allOrders.filter((o) => o.status === 'cancelled');
    // Note: 'disputed' status not in current Order model, placeholder for future
    const disputedOrders = [];

    reputation.transactions.total = allOrders.length;
    reputation.transactions.completed = completedOrders.length;
    reputation.transactions.cancelled = cancelledOrders.length;
    reputation.transactions.disputed = disputedOrders.length;
    
    reputation.transactions.completionRate = allOrders.length > 0
      ? (completedOrders.length / allOrders.length) * 100
      : 0;
    reputation.transactions.cancellationRate = allOrders.length > 0
      ? (cancelledOrders.length / allOrders.length) * 100
      : 0;
    reputation.transactions.disputeRate = allOrders.length > 0
      ? (disputedOrders.length / allOrders.length) * 100
      : 0;

    // Calculate transaction value
    const totalValue = completedOrders.reduce((sum, o) => sum + o.finalAmount, 0);
    reputation.transactions.totalValue = totalValue;
    reputation.transactions.averageOrderValue = completedOrders.length > 0
      ? totalValue / completedOrders.length
      : 0;

    // Count as seller vs buyer
    reputation.transactions.asSellerCount = allOrders.filter(
      (o) => o.farmer.toString() === userId
    ).length;
    reputation.transactions.asBuyerCount = allOrders.filter(
      (o) => o.buyer.toString() === userId
    ).length;

    // Calculate behavioral metrics
    // TODO: Implement these based on offer and order data
    reputation.behavior.responseRate = 85; // Placeholder
    reputation.behavior.onTimeDeliveryRate = 90; // Placeholder
    reputation.behavior.qualityComplaintRate = 5; // Placeholder
    reputation.behavior.activityScore = 75; // Placeholder

    // Calculate account age
    const createdAt = reputation.createdAt || new Date();
    const now = new Date();
    reputation.behavior.accountAge = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Assess risk
    reputation.risk.score = this.calculateRiskScore(reputation);
    reputation.risk.level = this.getRiskLevel(reputation.risk.score);
    reputation.risk.lastAssessedAt = new Date();

    // Calculate trends
    reputation.trends.ratingTrend = this.calculateRatingTrend(ratings);
    reputation.trends.transactionVolumeTrend = this.calculateTransactionTrend(allOrders);
    reputation.trends.lastCalculated = new Date();

    // Calculate overall score and trust level using schema methods
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (reputation as any).overallScore = (reputation as any).calculateOverallScore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (reputation as any).trustLevel = (reputation as any).calculateTrustLevel();

    reputation.lastUpdated = new Date();

    if (session) {
      await reputation.save({ session });
    } else {
      await reputation.save();
    }

    logger.info(`Reputation score updated for user ${userId}: ${reputation.overallScore}`);

    return reputation;
  }

  /**
   * Calculate risk score (0-100, higher is riskier)
   */
  private calculateRiskScore(reputation: IReputationScore): number {
    let riskScore = 0;

    // High cancellation rate
    if (reputation.transactions.cancellationRate > 20) {
      riskScore += 30;
    } else if (reputation.transactions.cancellationRate > 10) {
      riskScore += 15;
    }

    // High dispute rate
    if (reputation.transactions.disputeRate > 10) {
      riskScore += 40;
    } else if (reputation.transactions.disputeRate > 5) {
      riskScore += 20;
    }

    // Low rating
    if (reputation.ratings.average < 3 && reputation.ratings.count > 5) {
      riskScore += 25;
    }

    // Fraud flags
    riskScore += Math.min(reputation.risk.fraudFlags * 10, 50);

    return Math.min(riskScore, 100);
  }

  /**
   * Get risk level from score
   */
  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  /**
   * Calculate rating trend
   */
  private calculateRatingTrend(
    ratings: IRating[]
  ): 'improving' | 'stable' | 'declining' {
    if (ratings.length < 5) return 'stable';

    const sortedRatings = ratings.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
    
    const recentAvg = sortedRatings.slice(0, 5).reduce((sum, r) => sum + r.overallRating, 0) / 5;
    const olderAvg = sortedRatings.slice(5, 10).reduce((sum, r) => sum + r.overallRating, 0) / 
      Math.min(5, sortedRatings.length - 5);

    const diff = recentAvg - olderAvg;

    if (diff > 0.3) return 'improving';
    if (diff < -0.3) return 'declining';
    return 'stable';
  }

  /**
   * Calculate transaction volume trend
   */
  private calculateTransactionTrend(
    orders: Array<{ status: string; createdAt: Date }>
  ): 'growing' | 'stable' | 'declining' {
    if (orders.length < 10) return 'stable';

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentCount = orders.filter((o) => o.createdAt >= thirtyDaysAgo).length;
    const previousCount = orders.filter(
      (o) => o.createdAt >= sixtyDaysAgo && o.createdAt < thirtyDaysAgo
    ).length;

    if (previousCount === 0) return 'growing';

    const growthRate = ((recentCount - previousCount) / previousCount) * 100;

    if (growthRate > 20) return 'growing';
    if (growthRate < -20) return 'declining';
    return 'stable';
  }

  /**
   * Get user ratings
   */
  async getUserRatings(
    userId: string,
    filters: {
      role?: 'buyer' | 'seller';
      page?: number;
      limit?: number;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const { role, page = 1, limit = 20 } = filters;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { ratedUser: userId, status: 'approved' };
    if (role) {
      query.raterRole = role;
    }

    const skip = (page - 1) * limit;

    const [ratings, total] = await Promise.all([
      Rating.find(query)
        .populate('ratedBy', 'name email')
        .populate('order', 'orderNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Rating.countDocuments(query),
    ]);

    return {
      ratings,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get reputation score
   */
  async getReputationScore(userId: string): Promise<IReputationScore | null> {
    const reputation = await ReputationScore.findOne({ user: userId });
    
    // If doesn't exist, create and calculate
    if (!reputation) {
      return await this.updateReputationScore(userId);
    }

    return reputation;
  }

  /**
   * Add seller response to rating
   */
  async addSellerResponse(
    userId: string,
    ratingId: string,
    message: string
  ): Promise<IRating> {
    const rating = await Rating.findById(ratingId);
    if (!rating) {
      throw new AppError('Rating not found', 404);
    }

    // Verify user is the rated user (seller)
    if (rating.ratedUser.toString() !== userId) {
      throw new AppError('Only the seller can respond to this rating', 403);
    }

    if (rating.sellerResponse) {
      throw new AppError('Seller has already responded to this rating', 400);
    }

    rating.sellerResponse = {
      message,
      respondedAt: new Date(),
    };

    await rating.save();

    logger.info(`Seller response added to rating ${ratingId}`);

    return rating.populate(['ratedUser', 'ratedBy']);
  }

  /**
   * Mark rating as helpful/not helpful
   */
  async markHelpful(ratingId: string, helpful: boolean): Promise<void> {
    // userId parameter removed as it's not used
    const rating = await Rating.findById(ratingId);
    if (!rating) {
      throw new AppError('Rating not found', 404);
    }

    if (helpful) {
      rating.helpful += 1;
    } else {
      rating.notHelpful += 1;
    }

    await rating.save();
  }

  /**
   * Get top-rated users
   */
  async getTopRatedUsers(userType?: string, limit: number = 10): Promise<IReputationScore[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};
    if (userType) {
      query.userType = userType;
    }

    return ReputationScore.find(query)
      .populate('user', 'name email')
      .sort({ overallScore: -1 })
      .limit(limit)
      .lean() as unknown as IReputationScore[];
  }
}

export const reputationService = new ReputationService();
