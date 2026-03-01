import mongoose from 'mongoose';
import Offer, { IOffer } from './offer.model';
import Listing from '../marketplace/listing.model';
import Order from '../orders/order.model';
import { AppError } from '../../common/errors/AppError';
import logger from '../../common/utils/logger';

interface CreateOfferDTO {
  listing: string;
  quantity: number;
  unitPrice: number;
  deliveryOption: 'pickup' | 'seller_delivery' | 'third_party';
  deliveryAddress?: any;
  deliveryDate?: Date;
  deliveryLocation?: { coordinates: [number, number] };
  terms?: {
    paymentTerms?: string;
    deliveryTerms?: string;
    qualityRequirements?: string;
    inspectionRights?: boolean;
    returnPolicy?: string;
  };
  notes?: string;
  expiresIn?: number; // hours
  buyerOrganization?: string;
}

interface CounterOfferDTO {
  quantity?: number;
  unitPrice?: number;
  deliveryOption?: string;
  deliveryDate?: Date;
  terms?: any;
  notes?: string;
  expiresIn?: number;
}

export class OfferService {
  private resolveStatusesForUiStatus(uiStatus: string): string[] {
    switch (uiStatus) {
    case 'open':
      return ['pending'];
    case 'responded':
      return ['countered'];
    case 'shortlisted':
      return ['accepted'];
    case 'closed':
      return ['rejected', 'expired', 'withdrawn', 'superseded'];
    default:
      return [];
    }
  }

  /**
   * Create a new offer for a listing
   */
  async createOffer(buyerId: string, data: CreateOfferDTO): Promise<IOffer> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate listing exists and is active
      const listing = await Listing.findById(data.listing).session(session);
      if (!listing) {
        throw new AppError('Listing not found', 404);
      }

      if (listing.status !== 'active') {
        throw new AppError('Listing is not active', 400);
      }

      // Prevent self-offers
      if (listing.farmer.toString() === buyerId) {
        throw new AppError('You cannot make an offer on your own listing', 400);
      }

      // Validate quantity
      if (data.quantity > listing.quantity) {
        throw new AppError(`Requested quantity exceeds available quantity (${listing.quantity})`, 400);
      }

      // Calculate amounts
      const totalAmount = data.quantity * data.unitPrice;
      const platformFeePercentage = 2.5;
      const platformFee = (totalAmount * platformFeePercentage) / 100;

      // Set expiration (default 48 hours)
      const expiresIn = data.expiresIn || 48;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresIn);

      // Create offer
      const offer = new Offer({
        buyer: buyerId,
        buyerOrganization: data.buyerOrganization,
        seller: listing.farmer,
        listing: data.listing,
        product: listing.product,
        offerType: 'direct',
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalAmount,
        currency: 'UGX',
        terms: data.terms || {},
        deliveryOption: data.deliveryOption,
        deliveryAddress: data.deliveryAddress,
        deliveryLocation: data.deliveryLocation,
        deliveryDate: data.deliveryDate,
        status: 'pending',
        expiresAt,
        platformFee,
        platformFeePercentage,
        escrowRequired: totalAmount > 1000000, // Escrow for orders > 1M UGX
        responseBy: listing.farmer,
        negotiationHistory: [
          {
            action: 'created',
            by: new mongoose.Types.ObjectId(buyerId),
            price: data.unitPrice,
            quantity: data.quantity,
            notes: data.notes,
            timestamp: new Date(),
          },
        ],
        notes: data.notes,
        counterOffers: [],
        messages: [],
        flagged: false,
      });

      await offer.save({ session });

      // Update listing metrics
      await Listing.findByIdAndUpdate(
        data.listing,
        { $inc: { inquiries: 1 } },
        { session }
      );

      await session.commitTransaction();
      
      logger.info(`Offer created: ${offer.offerNumber} by user ${buyerId}`);

      // TODO: Send notification to seller
      // await notificationService.notifyNewOffer(offer);

      return offer.populate(['buyer', 'seller', 'listing', 'product']);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Create a counter-offer
   */
  async counterOffer(
    userId: string,
    offerId: string,
    data: CounterOfferDTO
  ): Promise<IOffer> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const originalOffer = await Offer.findById(offerId).session(session);
      if (!originalOffer) {
        throw new AppError('Offer not found', 404);
      }

      // Verify user is the seller
      if (originalOffer.seller.toString() !== userId) {
        throw new AppError('Only the seller can counter this offer', 403);
      }

      // Validate offer can be countered
      if (!['pending', 'countered'].includes(originalOffer.status)) {
        throw new AppError('This offer cannot be countered', 400);
      }

      if (originalOffer.expiresAt < new Date()) {
        throw new AppError('This offer has expired', 400);
      }

      // Get listing for validation
      const listing = await Listing.findById(originalOffer.listing).session(session);
      if (!listing || listing.status !== 'active') {
        throw new AppError('Listing is no longer available', 400);
      }

      // Use original values if not provided in counter
      const quantity = data.quantity ?? originalOffer.quantity;
      const unitPrice = data.unitPrice ?? originalOffer.unitPrice;
      const deliveryOption = data.deliveryOption ?? originalOffer.deliveryOption;

      // Validate quantity
      if (quantity > listing.quantity) {
        throw new AppError(`Requested quantity exceeds available quantity (${listing.quantity})`, 400);
      }

      // Calculate amounts
      const totalAmount = quantity * unitPrice;
      const platformFeePercentage = originalOffer.platformFeePercentage;
      const platformFee = (totalAmount * platformFeePercentage) / 100;

      // Set expiration
      const expiresIn = data.expiresIn || 48;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresIn);

      // Create counter-offer
      const counterOffer = new Offer({
        buyer: originalOffer.buyer,
        buyerOrganization: originalOffer.buyerOrganization,
        seller: originalOffer.seller,
        listing: originalOffer.listing,
        product: originalOffer.product,
        offerType: 'counter',
        quantity,
        unitPrice,
        totalAmount,
        currency: originalOffer.currency,
        terms: data.terms || originalOffer.terms,
        deliveryOption,
        deliveryAddress: originalOffer.deliveryAddress,
        deliveryLocation: originalOffer.deliveryLocation,
        deliveryDate: data.deliveryDate || originalOffer.deliveryDate,
        status: 'pending',
        expiresAt,
        platformFee,
        platformFeePercentage,
        escrowRequired: totalAmount > 1000000,
        responseBy: originalOffer.buyer,
        parentOffer: originalOffer._id,
        negotiationHistory: [
          ...originalOffer.negotiationHistory,
          {
            action: 'countered',
            by: new mongoose.Types.ObjectId(userId),
            price: unitPrice,
            quantity,
            notes: data.notes,
            timestamp: new Date(),
          },
        ],
        notes: data.notes,
        counterOffers: [],
        messages: [],
        flagged: false,
      });

      await counterOffer.save({ session });

      // Update original offer
      originalOffer.status = 'countered';
      originalOffer.counterOffers.push(counterOffer._id as any);
      originalOffer.respondedAt = new Date();
      await originalOffer.save({ session });

      await session.commitTransaction();

      logger.info(`Counter-offer created: ${counterOffer.offerNumber} for offer ${offerId}`);

      // TODO: Send notification to buyer
      // await notificationService.notifyCounterOffer(counterOffer);

      return counterOffer.populate(['buyer', 'seller', 'listing', 'product']);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Accept an offer and convert to order
   */
  async acceptOffer(userId: string, offerId: string, notes?: string): Promise<any> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const offer = await Offer.findById(offerId).session(session);
      if (!offer) {
        throw new AppError('Offer not found', 404);
      }

      // Verify user is authorized (seller for direct offers, buyer for counter-offers)
      const isAuthorized =
        (offer.offerType === 'direct' && offer.seller.toString() === userId) ||
        (offer.offerType === 'counter' && offer.buyer.toString() === userId);

      if (!isAuthorized) {
        throw new AppError('You are not authorized to accept this offer', 403);
      }

      // Validate offer status
      if (offer.status !== 'pending') {
        throw new AppError('This offer cannot be accepted', 400);
      }

      if (offer.expiresAt < new Date()) {
        throw new AppError('This offer has expired', 400);
      }

      // Get listing and validate
      const listing = await Listing.findById(offer.listing).session(session);
      if (!listing || listing.status !== 'active') {
        throw new AppError('Listing is no longer available', 400);
      }

      if (offer.quantity > listing.quantity) {
        throw new AppError('Insufficient quantity available', 400);
      }

      // Update offer status
      offer.status = 'accepted';
      offer.respondedAt = new Date();
      offer.negotiationHistory.push({
        action: 'accepted',
        by: new mongoose.Types.ObjectId(userId),
        price: offer.unitPrice,
        quantity: offer.quantity,
        notes,
        timestamp: new Date(),
      } as any);
      await offer.save({ session });

      // Supersede all related counter-offers
      if (offer.parentOffer) {
        await Offer.updateOne(
          { _id: offer.parentOffer },
          { status: 'superseded' },
          { session }
        );
      }

      await Offer.updateMany(
        { parentOffer: offerId, status: { $in: ['pending', 'countered'] } },
        { status: 'superseded' },
        { session }
      );

      // Create order from offer
      const order = await Order.create(
        [
          {
            buyer: offer.buyer,
            farmer: offer.seller,
            listing: offer.listing,
            product: offer.product,
            quantity: offer.quantity,
            unitPrice: offer.unitPrice,
            totalAmount: offer.totalAmount,
            deliveryFee: 0, // Calculate based on distance/provider
            platformFee: offer.platformFee,
            finalAmount: offer.totalAmount + offer.platformFee,
            status: 'pending',
            paymentStatus: 'pending',
            deliveryAddress: offer.deliveryAddress,
            deliveryOption: offer.deliveryOption,
            estimatedDeliveryDate: offer.deliveryDate,
            notes: `Created from offer ${offer.offerNumber}. ${notes || ''}`,
          },
        ],
        { session }
      );

      // Link offer to order
      offer.convertedToOrder = order[0]._id as any;
      offer.convertedAt = new Date();
      await offer.save({ session });

      // Update listing quantity
      const newQuantity = listing.quantity - offer.quantity;
      listing.quantity = newQuantity;
      if (newQuantity === 0) {
        listing.status = 'sold';
      }
      await listing.save({ session });

      await session.commitTransaction();

      logger.info(`Offer ${offer.offerNumber} accepted and converted to order ${order[0].orderNumber}`);

      // TODO: Send notifications
      // await notificationService.notifyOfferAccepted(offer, order[0]);

      return {
        offer: await offer.populate(['buyer', 'seller', 'listing', 'product']),
        order: await order[0].populate(['buyer', 'farmer', 'listing', 'product']),
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Reject an offer
   */
  async rejectOffer(userId: string, offerId: string, reason: string): Promise<IOffer> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const offer = await Offer.findById(offerId).session(session);
      if (!offer) {
        throw new AppError('Offer not found', 404);
      }

      // Verify user is authorized
      const isAuthorized =
        (offer.offerType === 'direct' && offer.seller.toString() === userId) ||
        (offer.offerType === 'counter' && offer.buyer.toString() === userId);

      if (!isAuthorized) {
        throw new AppError('You are not authorized to reject this offer', 403);
      }

      // Validate offer status
      if (!['pending', 'countered'].includes(offer.status)) {
        throw new AppError('This offer cannot be rejected', 400);
      }

      // Update offer
      offer.status = 'rejected';
      offer.respondedAt = new Date();
      offer.negotiationHistory.push({
        action: 'rejected',
        by: new mongoose.Types.ObjectId(userId),
        price: offer.unitPrice,
        quantity: offer.quantity,
        notes: reason,
        timestamp: new Date(),
      } as any);

      await offer.save({ session });

      await session.commitTransaction();

      logger.info(`Offer ${offer.offerNumber} rejected by user ${userId}`);

      // TODO: Send notification
      // await notificationService.notifyOfferRejected(offer, reason);

      return offer.populate(['buyer', 'seller', 'listing', 'product']);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Withdraw an offer (by buyer only)
   */
  async withdrawOffer(userId: string, offerId: string, reason?: string): Promise<IOffer> {
    const offer = await Offer.findById(offerId);
    if (!offer) {
      throw new AppError('Offer not found', 404);
    }

    // Only buyer can withdraw
    if (offer.buyer.toString() !== userId) {
      throw new AppError('Only the buyer can withdraw this offer', 403);
    }

    // Validate offer status
    if (!['pending', 'countered'].includes(offer.status)) {
      throw new AppError('This offer cannot be withdrawn', 400);
    }

    offer.status = 'withdrawn';
    offer.negotiationHistory.push({
      action: 'withdrawn',
      by: new mongoose.Types.ObjectId(userId),
      price: offer.unitPrice,
      quantity: offer.quantity,
      notes: reason,
      timestamp: new Date(),
    } as any);

    await offer.save();

    logger.info(`Offer ${offer.offerNumber} withdrawn by user ${userId}`);

    return offer.populate(['buyer', 'seller', 'listing', 'product']);
  }

  /**
   * Get user's offers (sent or received)
   */
  async getUserOffers(
    userId: string,
    filters: {
      type?: 'sent' | 'received';
      status?: string;
      uiStatus?: 'open' | 'responded' | 'shortlisted' | 'closed';
      listing?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<any> {
    const { type, status, uiStatus, listing, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

    const query: any = {};

    // Type filter
    if (type === 'sent') {
      query.buyer = userId;
    } else if (type === 'received') {
      query.seller = userId;
    } else {
      query.$or = [{ buyer: userId }, { seller: userId }];
    }

    // Status filter
    if (uiStatus) {
      const statuses = this.resolveStatusesForUiStatus(uiStatus);
      query.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    } else if (status) {
      query.status = status;
    }

    // Listing filter
    if (listing) {
      query.listing = listing;
    }

    const skip = (page - 1) * limit;
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [offers, total] = await Promise.all([
      Offer.find(query)
        .populate('buyer', 'name email')
        .populate('seller', 'name email')
        .populate('listing', 'title quantity price')
        .populate('product', 'name category')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Offer.countDocuments(query),
    ]);

    return {
      offers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get offer by ID
   */
  async getOfferById(userId: string, offerId: string): Promise<IOffer> {
    const offer = await Offer.findById(offerId)
      .populate('buyer', 'name email phone')
      .populate('seller', 'name email phone')
      .populate('listing')
      .populate('product')
      .populate('parentOffer')
      .populate('counterOffers');

    if (!offer) {
      throw new AppError('Offer not found', 404);
    }

    // Verify user is involved in the offer
    const isInvolved = offer.buyer.toString() === userId || offer.seller.toString() === userId;
    if (!isInvolved) {
      throw new AppError('You are not authorized to view this offer', 403);
    }

    return offer;
  }

  /**
   * Add message to offer
   */
  async addMessage(userId: string, offerId: string, message: string): Promise<IOffer> {
    const offer = await Offer.findById(offerId);
    if (!offer) {
      throw new AppError('Offer not found', 404);
    }

    // Verify user is involved
    const isInvolved = offer.buyer.toString() === userId || offer.seller.toString() === userId;
    if (!isInvolved) {
      throw new AppError('You are not authorized to message on this offer', 403);
    }

    offer.messages.push({
      from: new mongoose.Types.ObjectId(userId),
      message,
      timestamp: new Date(),
      read: false,
    } as any);

    await offer.save();

    // TODO: Send notification
    // await notificationService.notifyNewMessage(offer, message);

    return offer.populate(['buyer', 'seller', 'messages.from']);
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(userId: string, offerId: string): Promise<void> {
    const offer = await Offer.findById(offerId);
    if (!offer) {
      throw new AppError('Offer not found', 404);
    }

    // Mark all messages not from current user as read
    offer.messages.forEach((msg: any) => {
      if (msg.from.toString() !== userId && !msg.read) {
        msg.read = true;
      }
    });

    await offer.save();
  }

  /**
   * Get offer statistics for a user
   */
  async getUserOfferStats(userId: string): Promise<any> {
    const stats = await Offer.aggregate([
      {
        $match: {
          $or: [{ buyer: new mongoose.Types.ObjectId(userId) }, { seller: new mongoose.Types.ObjectId(userId) }],
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' },
        },
      },
    ]);

    const sent = await Offer.countDocuments({ buyer: userId });
    const received = await Offer.countDocuments({ seller: userId });
    const accepted = await Offer.countDocuments({
      $or: [{ buyer: userId }, { seller: userId }],
      status: 'accepted',
    });

    return {
      sent,
      received,
      accepted,
      byStatus: stats,
    };
  }
}

export const offerService = new OfferService();
