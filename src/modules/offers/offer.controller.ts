import { Request, Response, NextFunction } from 'express';
import { offerService } from './offer.service';

export class OfferController {
  /**
   * Create a new offer
   * POST /api/offers
   */
  async createOffer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const offer = await offerService.createOffer(userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Offer created successfully',
        data: { offer },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a counter-offer
   * POST /api/offers/:offerId/counter
   */
  async counterOffer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { offerId } = req.params;

      const counterOffer = await offerService.counterOffer(userId, offerId, req.body);

      res.status(201).json({
        success: true,
        message: 'Counter-offer created successfully',
        data: { offer: counterOffer },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Accept an offer
   * POST /api/offers/:offerId/accept
   */
  async acceptOffer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { offerId } = req.params;
      const { notes } = req.body;

      const result = await offerService.acceptOffer(userId, offerId, notes);

      res.json({
        success: true,
        message: 'Offer accepted and order created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject an offer
   * POST /api/offers/:offerId/reject
   */
  async rejectOffer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { offerId } = req.params;
      const { reason } = req.body;

      const offer = await offerService.rejectOffer(userId, offerId, reason);

      res.json({
        success: true,
        message: 'Offer rejected successfully',
        data: { offer },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Withdraw an offer
   * POST /api/offers/:offerId/withdraw
   */
  async withdrawOffer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { offerId } = req.params;
      const { reason } = req.body;

      const offer = await offerService.withdrawOffer(userId, offerId, reason);

      res.json({
        success: true,
        message: 'Offer withdrawn successfully',
        data: { offer },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's offers
   * GET /api/offers
   */
  async getUserOffers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const filters = {
        type: req.query.type as 'sent' | 'received' | undefined,
        status: req.query.status as string | undefined,
        listing: req.query.listing as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        sortBy: req.query.sortBy as string | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
      };

      const result = await offerService.getUserOffers(userId, filters);

      res.json({
        success: true,
        message: 'Offers retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get offer by ID
   * GET /api/offers/:offerId
   */
  async getOfferById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { offerId } = req.params;

      const offer = await offerService.getOfferById(userId, offerId);

      res.json({
        success: true,
        message: 'Offer retrieved successfully',
        data: { offer },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add message to offer
   * POST /api/offers/:offerId/messages
   */
  async addMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { offerId } = req.params;
      const { message } = req.body;

      const offer = await offerService.addMessage(userId, offerId, message);

      res.json({
        success: true,
        message: 'Message added successfully',
        data: { offer },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark messages as read
   * PUT /api/offers/:offerId/messages/read
   */
  async markMessagesAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { offerId } = req.params;

      await offerService.markMessagesAsRead(userId, offerId);

      res.json({
        success: true,
        message: 'Messages marked as read',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user offer statistics
   * GET /api/offers/stats
   */
  async getUserOfferStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const stats = await offerService.getUserOfferStats(userId);

      res.json({
        success: true,
        message: 'Offer statistics retrieved successfully',
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const offerController = new OfferController();
