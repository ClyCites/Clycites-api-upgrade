import { Request, Response, NextFunction } from 'express';
import { reputationService } from './reputation.service';
import { ResponseHandler } from '../../common/utils/response';

export class ReputationController {
  private toUiStatus(status: string): 'draft' | 'published' | 'hidden' {
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

  private mapRatingForUi(rating: any): any {
    const plain = typeof rating?.toObject === 'function'
      ? rating.toObject()
      : rating;

    return {
      ...plain,
      uiStatus: plain.uiStatus || this.toUiStatus(plain.status),
    };
  }

  /**
   * Create a rating for an order
   * POST /api/reputation/ratings
   */
  async createRating(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const rating = await reputationService.createRating(userId, req.body);

      ResponseHandler.created(
        res,
        this.mapRatingForUi(rating),
        'Rating created successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get ratings for a user
   * GET /api/reputation/users/:userId/ratings
   */
  async getUserRatings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const filters = {
        role: req.query.role as 'buyer' | 'seller' | undefined,
        status: req.query.status as 'pending' | 'approved' | 'rejected' | 'flagged' | undefined,
        uiStatus: req.query.uiStatus as 'draft' | 'published' | 'hidden' | undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      };

      const result = await reputationService.getUserRatings(userId, filters);

      ResponseHandler.success(
        res,
        result.ratings,
        'Ratings retrieved successfully',
        200,
        {
          pagination: {
            page: result.pagination.page,
            limit: result.pagination.limit,
            total: result.pagination.total,
            totalPages: result.pagination.totalPages,
          },
        }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get reputation score for a user
   * GET /api/reputation/users/:userId/score
   */
  async getReputationScore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const reputation = await reputationService.getReputationScore(userId);

      ResponseHandler.success(res, { reputation }, 'Reputation score retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add seller response to a rating
   * POST /api/reputation/ratings/:ratingId/response
   */
  async addSellerResponse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { ratingId } = req.params;
      const { message } = req.body;

      const rating = await reputationService.addSellerResponse(userId, ratingId, message);

      ResponseHandler.success(
        res,
        this.mapRatingForUi(rating),
        'Response added successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark rating as helpful/not helpful
   * POST /api/reputation/ratings/:ratingId/helpful
   */
  async markHelpful(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ratingId } = req.params;
      const { helpful } = req.body;

      await reputationService.markHelpful(ratingId, helpful);

      ResponseHandler.success(res, null, 'Rating feedback recorded');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get top-rated users
   * GET /api/reputation/top-rated
   */
  async getTopRatedUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userType = req.query.userType as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const users = await reputationService.getTopRatedUsers(userType, limit);

      ResponseHandler.success(res, { users }, 'Top-rated users retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rating by ID
   * GET /api/reputation/ratings/:ratingId
   */
  async getRatingById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rating = await reputationService.getRatingById(
        req.params.ratingId,
        req.user!.id,
        req.user!.role
      );

      ResponseHandler.success(res, rating, 'Rating retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update rating
   * PATCH /api/reputation/ratings/:ratingId
   */
  async updateRating(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rating = await reputationService.updateRating(
        req.params.ratingId,
        req.user!.id,
        req.user!.role,
        req.body
      );

      ResponseHandler.success(res, rating, 'Rating updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete rating (soft)
   * DELETE /api/reputation/ratings/:ratingId
   */
  async deleteRating(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await reputationService.deleteRating(
        req.params.ratingId,
        req.user!.id,
        req.user!.role
      );

      ResponseHandler.success(res, null, 'Rating deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Moderate rating
   * POST /api/reputation/ratings/:ratingId/moderate
   */
  async moderateRating(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rating = await reputationService.moderateRating(
        req.params.ratingId,
        req.user!.id,
        req.user!.role,
        {
          status: req.body.status,
          reason: req.body.reason,
        }
      );

      ResponseHandler.success(res, rating, 'Rating moderated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const reputationController = new ReputationController();
