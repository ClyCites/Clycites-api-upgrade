import mongoose from 'mongoose';
import Rating, { IRating } from './rating.model';
import ReputationScore, { IReputationScore } from './reputation.model';
import Order from '../orders/order.model';
import User from '../users/user.model';
import Offer from '../offers/offer.model';
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
  status?: 'pending' | 'approved' | 'rejected' | 'flagged';
  uiStatus?: 'draft' | 'published' | 'hidden';
}

export class ReputationService {
  private isAdminLike(role: string): boolean {
    return ['admin', 'platform_admin', 'super_admin'].includes(role);
  }

  private toUiStatus(status: IRating['status']): 'draft' | 'published' | 'hidden' {
    switch (status) {
    case 'pending':
      return 'draft';
    case 'approved':
      return 'published';
    case 'rejected':
    case 'flagged':
      return 'hidden';
    default:
      return 'draft';
    }
  }

  private toInternalStatus(status?: string): IRating['status'] | undefined {
    if (!status) {
      return undefined;
    }

    const normalized = status.trim().toLowerCase();
    const uiMap: Record<string, IRating['status']> = {
      draft: 'pending',
      published: 'approved',
      hidden: 'flagged',
    };

    const nativeMap: Record<string, IRating['status']> = {
      pending: 'pending',
      approved: 'approved',
      rejected: 'rejected',
      flagged: 'flagged',
    };

    return uiMap[normalized] || nativeMap[normalized];
  }

  private mapRatingForUi<T extends Record<string, any>>(rating: T): T & { uiStatus: 'draft' | 'published' | 'hidden' } {
    const plain = typeof rating?.toObject === 'function'
      ? rating.toObject()
      : rating;

    return {
      ...plain,
      uiStatus: this.toUiStatus(plain.status),
    };
  }

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

      const existingRating = await Rating.findOne({
        order: data.order,
        ratedBy: userId,
        raterRole,
      }).session(session);

      if (existingRating) {
        throw new AppError('You have already rated this order', 400);
      }

      const requestedStatus = this.toInternalStatus(data.uiStatus || data.status);
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
        status: requestedStatus || 'approved',
      });

      await rating.save({ session });

      await this.updateReputationScore(ratedUserId.toString(), session);

      await session.commitTransaction();

      logger.info(`Rating created for order ${data.order} by user ${userId}`);

      // Send notification to rated user
      // Note: Implement when notification service is available
      // await notificationService.notifyNewRating(ratedUserId.toString(), {
      //   ratingId: rating._id,
      //   raterName: req.user.name,
      //   overallRating: rating.overallRating,
      // });

      return rating.populate(['ratedUser', 'ratedBy']);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async updateReputationScore(
    userId: string,
    session?: mongoose.ClientSession
  ): Promise<IReputationScore> {
    let reputation = await ReputationScore.findOne({ user: userId }).session(session || null);
    
    if (!reputation) {
      // Get user type from user profile
      const user = await User.findById(userId).select('role').session(session || null);
      const userType = user?.role === 'farmer' || user?.role === 'trader' ? 'farmer' : 'buyer';
      
      reputation = new ReputationScore({
        user: userId,
        userType,
      });
    }

    const ratings = await Rating.find({
      ratedUser: userId,
      status: 'approved',
      isActive: true,
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
    const behaviorMetrics = await this.calculateBehaviorMetrics(userId, allOrders, ratings, session);
    reputation.behavior.responseRate = behaviorMetrics.responseRate;
    reputation.behavior.onTimeDeliveryRate = behaviorMetrics.onTimeDeliveryRate;
    reputation.behavior.qualityComplaintRate = behaviorMetrics.qualityComplaintRate;
    reputation.behavior.activityScore = behaviorMetrics.activityScore;

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
   * Calculate behavioral metrics based on offers and orders
   */
  private async calculateBehaviorMetrics(
    userId: string,
    orders: Array<{ 
      status: string; 
      estimatedDeliveryDate?: Date; 
      actualDeliveryDate?: Date;
      farmer: mongoose.Types.ObjectId;
      createdAt: Date;
    }>,
    ratings: IRating[],
    session?: mongoose.ClientSession
  ): Promise<{
    responseRate: number;
    onTimeDeliveryRate: number;
    qualityComplaintRate: number;
    activityScore: number;
  }> {
    // Calculate response rate from offers
    const userOffers = await Offer.find({
      $or: [{ buyer: userId }, { seller: userId }],
    })
      .select('responseTime respondedAt createdAt')
      .session(session || null);

    let responseRate = 0;
    if (userOffers.length > 0) {
      const respondedOffers = userOffers.filter((o) => o.respondedAt);
      responseRate = (respondedOffers.length / userOffers.length) * 100;
      
      // Bonus for fast response times (< 24 hours)
      const fastResponses = respondedOffers.filter((o) => 
        o.responseTime && o.responseTime < 24 * 60 * 60 * 1000
      ).length;
      if (respondedOffers.length > 0) {
        const fastResponseBonus = (fastResponses / respondedOffers.length) * 10;
        responseRate = Math.min(100, responseRate + fastResponseBonus);
      }
    }

    // Calculate on-time delivery rate
    const deliveredOrders = orders.filter((o) => 
      o.status === 'delivered' || o.status === 'completed'
    );
    let onTimeDeliveryRate = 0;
    if (deliveredOrders.length > 0) {
      const onTimeDeliveries = deliveredOrders.filter((o) => {
        if (!o.estimatedDeliveryDate || !o.actualDeliveryDate) return false;
        return o.actualDeliveryDate <= o.estimatedDeliveryDate;
      }).length;
      onTimeDeliveryRate = (onTimeDeliveries / deliveredOrders.length) * 100;
    }

    // Calculate quality complaint rate from ratings
    let qualityComplaintRate = 0;
    if (ratings.length > 0) {
      const lowQualityRatings = ratings.filter((r) => {
        const productQuality = r.categoryRatings?.productQuality;
        return productQuality && productQuality < 3; // Rating below 3 is a complaint
      }).length;
      qualityComplaintRate = (lowQualityRatings / ratings.length) * 100;
    }

    // Calculate activity score
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const recentOrders = orders.filter((o) => o.createdAt >= thirtyDaysAgo).length;
    const recentOffers = userOffers.filter((o) => o.createdAt >= thirtyDaysAgo).length;
    const recentRatings = ratings.filter((r) => r.createdAt >= ninetyDaysAgo).length;

    // Activity score components:
    // - Recent orders (0-40 points)
    // - Recent offers (0-30 points)
    // - Recent ratings (0-30 points)
    const orderScore = Math.min(40, recentOrders * 4);
    const offerScore = Math.min(30, recentOffers * 3);
    const ratingScore = Math.min(30, recentRatings * 5);
    const activityScore = orderScore + offerScore + ratingScore;

    return {
      responseRate: Math.round(responseRate * 10) / 10,
      onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 10) / 10,
      qualityComplaintRate: Math.round(qualityComplaintRate * 10) / 10,
      activityScore: Math.round(activityScore),
    };
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
      status?: 'pending' | 'approved' | 'rejected' | 'flagged';
      uiStatus?: 'draft' | 'published' | 'hidden';
      page?: number;
      limit?: number;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const { role, status, uiStatus, page = 1, limit = 20 } = filters;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { ratedUser: userId, isActive: true };
    if (role) {
      query.raterRole = role;
    }
    const requestedStatus = this.toInternalStatus(uiStatus || status);
    if (requestedStatus) {
      query.status = requestedStatus;
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
    const normalizedRatings = ratings.map((rating) => this.mapRatingForUi(rating));

    return {
      ratings: normalizedRatings,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRatingById(
    ratingId: string,
    requesterId: string,
    requesterRole: string
  ): Promise<any> {
    const rating = await Rating.findOne({ _id: ratingId, isActive: true })
      .populate('ratedUser', 'name email')
      .populate('ratedBy', 'name email')
      .populate('order', 'orderNumber')
      .populate('offer', 'offerNumber');

    if (!rating) {
      throw new AppError('Rating not found', 404);
    }

    const isOwner = rating.ratedBy.toString() === requesterId || rating.ratedUser.toString() === requesterId;
    if (!isOwner && !this.isAdminLike(requesterRole)) {
      throw new AppError('You are not authorized to view this rating', 403);
    }

    return this.mapRatingForUi(rating);
  }

  async updateRating(
    ratingId: string,
    requesterId: string,
    requesterRole: string,
    updates: Partial<CreateRatingDTO>
  ): Promise<any> {
    const rating = await Rating.findOne({ _id: ratingId, isActive: true });
    if (!rating) {
      throw new AppError('Rating not found', 404);
    }

    const isOwner = rating.ratedBy.toString() === requesterId;
    if (!isOwner && !this.isAdminLike(requesterRole)) {
      throw new AppError('Only the rating author or admin can update this rating', 403);
    }

    if (updates.overallRating !== undefined) rating.overallRating = updates.overallRating;
    if (updates.categoryRatings !== undefined) rating.categoryRatings = updates.categoryRatings;
    if (updates.review !== undefined) rating.review = updates.review;
    if (updates.pros !== undefined) rating.pros = updates.pros;
    if (updates.cons !== undefined) rating.cons = updates.cons;
    if (updates.wouldRecommend !== undefined) rating.wouldRecommend = updates.wouldRecommend;
    if (updates.wouldBuyAgain !== undefined) rating.wouldBuyAgain = updates.wouldBuyAgain;
    if (updates.images !== undefined) rating.images = updates.images;

    if (updates.uiStatus || updates.status) {
      const nextStatus = this.toInternalStatus(updates.uiStatus || updates.status);
      if (!nextStatus) {
        throw new AppError('Invalid rating status', 400);
      }

      rating.status = nextStatus;
    }

    await rating.save();
    await this.updateReputationScore(rating.ratedUser.toString());

    return this.mapRatingForUi(await rating.populate(['ratedUser', 'ratedBy', 'order']));
  }

  async deleteRating(
    ratingId: string,
    requesterId: string,
    requesterRole: string
  ): Promise<void> {
    const rating = await Rating.findOne({ _id: ratingId, isActive: true });
    if (!rating) {
      throw new AppError('Rating not found', 404);
    }

    const isOwner = rating.ratedBy.toString() === requesterId;
    if (!isOwner && !this.isAdminLike(requesterRole)) {
      throw new AppError('Only the rating author or admin can delete this rating', 403);
    }

    rating.isActive = false;
    rating.deletedAt = new Date();
    rating.deletedBy = new mongoose.Types.ObjectId(requesterId);
    rating.status = 'rejected';
    await rating.save();

    await this.updateReputationScore(rating.ratedUser.toString());
  }

  async moderateRating(
    ratingId: string,
    moderatorId: string,
    moderatorRole: string,
    payload: {
      status: 'draft' | 'published' | 'hidden';
      reason?: string;
    }
  ): Promise<any> {
    if (!this.isAdminLike(moderatorRole)) {
      throw new AppError('Only admins can moderate ratings', 403);
    }

    const rating = await Rating.findOne({ _id: ratingId, isActive: true });
    if (!rating) {
      throw new AppError('Rating not found', 404);
    }

    const status = this.toInternalStatus(payload.status);
    if (!status) {
      throw new AppError('Invalid moderation status', 400);
    }

    rating.status = status;
    rating.flagReason = payload.reason;
    rating.moderatedBy = new mongoose.Types.ObjectId(moderatorId);
    rating.moderatedAt = new Date();
    await rating.save();

    await this.updateReputationScore(rating.ratedUser.toString());

    return this.mapRatingForUi(await rating.populate(['ratedUser', 'ratedBy', 'order']));
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
    const rating = await Rating.findOne({ _id: ratingId, isActive: true });
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
    const rating = await Rating.findOne({ _id: ratingId, isActive: true });
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
