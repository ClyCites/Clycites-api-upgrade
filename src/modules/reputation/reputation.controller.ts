import { Request, Response, NextFunction } from 'express';
import { reputationService } from './reputation.service';

export class ReputationController {
  /**
   * Create a rating for an order
   * POST /api/reputation/ratings
   */
  async createRating(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const rating = await reputationService.createRating(userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Rating created successfully',
        data: { rating },
      });
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
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      };

      const result = await reputationService.getUserRatings(userId, filters);

      res.json({
        success: true,
        message: 'Ratings retrieved successfully',
        data: result,
      });
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

      res.json({
        success: true,
        message: 'Reputation score retrieved successfully',
        data: { reputation },
      });
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

      res.json({
        success: true,
        message: 'Response added successfully',
        data: { rating },
      });
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

      res.json({
        success: true,
        message: 'Rating feedback recorded',
        data: null,
      });
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

      res.json({
        success: true,
        message: 'Top-rated users retrieved successfully',
        data: { users },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const reputationController = new ReputationController();
