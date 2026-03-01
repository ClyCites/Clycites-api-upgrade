import mongoose from 'mongoose';
import Wallet from './wallet.model';
import Transaction from './transaction.model';
import Escrow from './escrow.model';
import { AppError } from '../../common/errors/AppError';
import logger from '../../common/utils/logger';

/**
 * Payment Service
 * Handles wallet operations, transactions, and escrow management
 * 
 * Note: This is a foundation implementation.
 * Production integration requires:
 * - Mobile money API integration (MTN, Airtel, etc.)
 * - Bank transfer API integration
 * - PCI-compliant card processing
 * - Webhook handlers for payment confirmations
 * - Advanced fraud detection
 * - Compliance with financial regulations
 */
export class PaymentService {
  /**
   * Create or get wallet for user
   */
  async getOrCreateWallet(userId: string): Promise<any> {
    let wallet = await Wallet.findOne({ user: userId });
    
    if (!wallet) {
      wallet = await Wallet.create({
        user: userId,
        balance: 0,
        escrowBalance: 0,
        availableBalance: 0,
        status: 'active',
      });
      
      logger.info(`Wallet created for user ${userId}`);
    }
    
    return wallet;
  }

  /**
   * Initiate escrow for an order
   */
  async initiateEscrow(orderId: string, buyerId: string, sellerId: string, amount: number): Promise<any> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Calculate fees
      const platformFee = (amount * 2.5) / 100;
      const totalAmount = amount + platformFee;

      // Get buyer wallet
      const buyerWallet = await Wallet.findOne({ user: buyerId }).session(session);
      if (!buyerWallet || buyerWallet.availableBalance < totalAmount) {
        throw new AppError('Insufficient wallet balance', 400);
      }

      // Create escrow
      const escrow = new Escrow({
        order: orderId,
        buyer: buyerId,
        seller: sellerId,
        amount,
        platformFee,
        status: 'initiated',
        releaseConditions: [
          { condition: 'order_delivered', met: false },
          { condition: 'buyer_confirmation', met: false },
        ],
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        timeline: [
          {
            event: 'escrow_initiated',
            timestamp: new Date(),
            by: new mongoose.Types.ObjectId(buyerId),
          },
        ],
      });

      await escrow.save({ session });

      // Hold funds in buyer's escrow balance
      buyerWallet.escrowBalance += totalAmount;
      buyerWallet.availableBalance -= totalAmount;
      await buyerWallet.save({ session });

      // Create escrow hold transaction
      const transaction = new Transaction({
        from: buyerId,
        to: buyerId, // Held on buyer wallet under escrow balance
        type: 'escrow_hold',
        amount: totalAmount,
        currency: 'UGX',
        order: orderId,
        paymentMethod: 'wallet',
        status: 'completed',
        isEscrow: true,
        platformFee,
        processingFee: 0,
        totalFees: platformFee,
        description: `Escrow hold for order ${orderId}`,
        balanceBefore: buyerWallet.balance + totalAmount,
        balanceAfter: buyerWallet.balance,
        processedAt: new Date(),
      } as any);

      await transaction.save({ session });

      escrow.fundingTransaction = transaction._id as any;
      escrow.fundedAt = new Date();
      escrow.status = 'funded';
      escrow.timeline.push({
        event: 'escrow_funded',
        timestamp: new Date(),
        by: new mongoose.Types.ObjectId(buyerId),
      } as any);

      await escrow.save({ session });

      await session.commitTransaction();

      logger.info(`Escrow ${escrow.escrowNumber} initiated for order ${orderId}`);

      return escrow;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Release escrow to seller
   */
  async releaseEscrow(escrowId: string, releasedBy: string): Promise<any> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const escrow = await Escrow.findById(escrowId).session(session);
      if (!escrow) {
        throw new AppError('Escrow not found', 404);
      }

      if (escrow.status !== 'funded') {
        throw new AppError('Escrow cannot be released', 400);
      }

      // Get wallets
      const buyerWallet = await Wallet.findOne({ user: escrow.buyer }).session(session);
      const sellerWallet = await Wallet.findOne({ user: escrow.seller }).session(session);

      if (!buyerWallet || !sellerWallet) {
        throw new AppError('Wallet not found', 404);
      }

      const totalAmount = escrow.amount + escrow.platformFee;

      // Release from buyer's escrow
      buyerWallet.escrowBalance -= totalAmount;
      await buyerWallet.save({ session });

      // Transfer to seller (minus platform fee)
      sellerWallet.balance += escrow.amount;
      sellerWallet.availableBalance += escrow.amount;
      await sellerWallet.save({ session });

      // Create release transaction
      const transaction = new Transaction({
        from: escrow.buyer,
        to: escrow.seller,
        type: 'escrow_release',
        amount: escrow.amount,
        currency: escrow.currency,
        order: escrow.order,
        paymentMethod: 'wallet',
        status: 'completed',
        isEscrow: true,
        escrowReleasedAt: new Date(),
        platformFee: escrow.platformFee,
        processingFee: 0,
        totalFees: escrow.platformFee,
        description: `Escrow release for ${escrow.escrowNumber}`,
        balanceBefore: sellerWallet.balance - escrow.amount,
        balanceAfter: sellerWallet.balance,
        processedAt: new Date(),
      } as any);

      await transaction.save({ session });

      // Update escrow
      escrow.status = 'released';
      escrow.releasedAt = new Date();
      escrow.releasedTo = escrow.seller;
      escrow.releaseTransaction = transaction._id as any;
      escrow.timeline.push({
        event: 'escrow_released',
        timestamp: new Date(),
        by: new mongoose.Types.ObjectId(releasedBy),
      } as any);

      await escrow.save({ session });

      await session.commitTransaction();

      logger.info(`Escrow ${escrow.escrowNumber} released to seller`);

      return { escrow, transaction };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Refund escrow to buyer
   */
  async refundEscrow(escrowId: string, reason: string, refundedBy: string): Promise<any> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const escrow = await Escrow.findById(escrowId).session(session);
      if (!escrow) {
        throw new AppError('Escrow not found', 404);
      }

      if (!['funded', 'disputed'].includes(escrow.status)) {
        throw new AppError('Escrow cannot be refunded', 400);
      }

      const buyerWallet = await Wallet.findOne({ user: escrow.buyer }).session(session);
      if (!buyerWallet) {
        throw new AppError('Wallet not found', 404);
      }

      const totalAmount = escrow.amount + escrow.platformFee;

      // Refund to buyer
      buyerWallet.escrowBalance -= totalAmount;
      buyerWallet.availableBalance += totalAmount;
      await buyerWallet.save({ session });

      // Create refund transaction
      const transaction = new Transaction({
        from: escrow.buyer,
        to: escrow.buyer,
        type: 'refund',
        amount: totalAmount,
        currency: escrow.currency,
        order: escrow.order,
        paymentMethod: 'wallet',
        status: 'completed',
        isEscrow: true,
        platformFee: 0,
        processingFee: 0,
        totalFees: 0,
        description: `Escrow refund: ${reason}`,
        balanceBefore: buyerWallet.balance - totalAmount,
        balanceAfter: buyerWallet.balance,
        processedAt: new Date(),
      } as any);

      await transaction.save({ session });

      // Update escrow
      escrow.status = 'refunded';
      escrow.refundedAt = new Date();
      escrow.refundTransaction = transaction._id as any;
      escrow.refundReason = reason;
      escrow.timeline.push({
        event: 'escrow_refunded',
        timestamp: new Date(),
        by: new mongoose.Types.ObjectId(refundedBy),
      } as any);

      await escrow.save({ session });

      await session.commitTransaction();

      logger.info(`Escrow ${escrow.escrowNumber} refunded to buyer`);

      return { escrow, transaction };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(userId: string): Promise<any> {
    const wallet = await this.getOrCreateWallet(userId);
    return {
      balance: wallet.balance,
      escrowBalance: wallet.escrowBalance,
      availableBalance: wallet.availableBalance,
      currency: wallet.currency,
    };
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(userId: string, filters: any = {}): Promise<any> {
    const { page = 1, limit = 20, type, status } = filters;

    const query: any = {
      $or: [{ from: userId }, { to: userId }],
    };

    if (type) query.type = type;
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate('from', 'name email')
        .populate('to', 'name email')
        .populate('order', 'orderNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(query),
    ]);

    return {
      transactions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

export const paymentService = new PaymentService();
