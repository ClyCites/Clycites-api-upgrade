import { Request, Response, NextFunction } from 'express';
import { offerService } from './offer.service';
import { ResponseHandler } from '../../common/utils/response';

export class OfferController {
  private toUiStatus(status: string): 'open' | 'responded' | 'shortlisted' | 'closed' {
    switch (status) {
    case 'pending':
      return 'open';
    case 'countered':
      return 'responded';
    case 'accepted':
      return 'shortlisted';
    case 'rejected':
    case 'expired':
    case 'withdrawn':
    case 'superseded':
      return 'closed';
    default:
      return 'open';
    }
  }

  private mapOfferForUi(offer: any): any {
    const plain = typeof offer?.toObject === 'function'
      ? offer.toObject()
      : offer;

    return {
      ...plain,
      uiStatus: this.toUiStatus(plain.status),
    };
  }

  /**
   * Create a new offer
   * POST /api/offers
   */
  async createOffer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const offer = await offerService.createOffer(userId, req.body);

      ResponseHandler.created(
        res,
        { offer: this.mapOfferForUi(offer) },
        'Offer created successfully'
      );
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

      ResponseHandler.created(
        res,
        { offer: this.mapOfferForUi(counterOffer) },
        'Counter-offer created successfully'
      );
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

      ResponseHandler.success(
        res,
        {
          offer: this.mapOfferForUi(result.offer),
          order: result.order,
        },
        'Offer accepted and order created successfully'
      );
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

      ResponseHandler.success(
        res,
        { offer: this.mapOfferForUi(offer) },
        'Offer rejected successfully'
      );
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

      ResponseHandler.success(
        res,
        { offer: this.mapOfferForUi(offer) },
        'Offer withdrawn successfully'
      );
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
        uiStatus: req.query.uiStatus as 'open' | 'responded' | 'shortlisted' | 'closed' | undefined,
        listing: req.query.listing as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        sortBy: req.query.sortBy as string | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
      };

      const result = await offerService.getUserOffers(userId, filters);
      const offers = result.offers.map((offer: any) => this.mapOfferForUi(offer));
      const pagination = {
        page: result.pagination.page,
        limit: result.pagination.limit,
        total: result.pagination.total,
        totalPages: result.pagination.pages,
      };

      ResponseHandler.success(
        res,
        {
          offers,
          pagination: result.pagination,
        },
        'Offers retrieved successfully',
        200,
        { pagination }
      );
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

      ResponseHandler.success(
        res,
        { offer: this.mapOfferForUi(offer) },
        'Offer retrieved successfully'
      );
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

      ResponseHandler.success(
        res,
        { offer: this.mapOfferForUi(offer) },
        'Message added successfully'
      );
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

      ResponseHandler.success(res, null, 'Messages marked as read');
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

      ResponseHandler.success(res, stats, 'Offer statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const offerController = new OfferController();
