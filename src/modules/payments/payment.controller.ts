import { Request, Response, NextFunction } from 'express';
import { paymentService } from './payment.service';
import Wallet from './wallet.model';
import Transaction from './transaction.model';
import Escrow from './escrow.model';
import { AppError } from '../../common/errors/AppError';

class PaymentController {
  /**
   * Get user's wallet
   * GET /api/payments/wallet
   */
  async getWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Authentication required', 401);
      }

      let wallet = await Wallet.findOne({ user: userId });

      // Create wallet if doesn't exist
      if (!wallet) {
        wallet = await Wallet.create({
          user: userId,
          balance: 0,
          escrowBalance: 0,
          currency: 'UGX',
        });
      }

      res.json({
        success: true,
        data: { wallet },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get wallet transactions
   * GET /api/payments/transactions
   */
  async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Authentication required', 401);
      }

      const { page = 1, limit = 20, type, status } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const query: Record<string, any> = {
        $or: [{ sender: userId }, { recipient: userId }],
      };

      if (type) query.type = type;
      if (status) query.status = status;

      const [transactions, total] = await Promise.all([
        Transaction.find(query)
          .sort('-createdAt')
          .limit(Number(limit))
          .skip(skip)
          .populate('sender recipient', 'name email')
          .populate('relatedOrder'),
        Transaction.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Initiate escrow for an order
   * POST /api/payments/escrow/initiate
   */
  async initiateEscrow(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Authentication required', 401);
      }

      const { orderId, amount, sellerId } = req.body;

      if (!orderId || !amount || !sellerId) {
        throw new AppError('Order ID, seller ID, and amount are required', 400);
      }

      const escrow = await paymentService.initiateEscrow(
        orderId,
        userId,
        sellerId,
        amount
      );

      res.status(201).json({
        success: true,
        message: 'Escrow initiated successfully',
        data: { escrow },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Release escrow funds
   * POST /api/payments/escrow/:escrowId/release
   */
  async releaseEscrow(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Authentication required', 401);
      }

      const { escrowId } = req.params;
      // releaseReason from body is optional, can be used for audit later

      const escrow = await Escrow.findById(escrowId).populate('order');

      if (!escrow) {
        throw new AppError('Escrow not found', 404);
      }

      // Verify user is authorized (buyer or admin)
      const order = escrow.order as any;
      if (
        order.buyer.toString() !== userId &&
        req.user?.role !== 'admin'
      ) {
        throw new AppError('Not authorized to release this escrow', 403);
      }

      const transaction = await paymentService.releaseEscrow(
        escrowId,
        userId
      );

      res.json({
        success: true,
        message: 'Escrow released successfully',
        data: { transaction },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refund escrow funds
   * POST /api/payments/escrow/:escrowId/refund
   */
  async refundEscrow(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Authentication required', 401);
      }

      const { escrowId } = req.params;
      const { refundReason } = req.body;

      const escrow = await Escrow.findById(escrowId).populate('order');

      if (!escrow) {
        throw new AppError('Escrow not found', 404);
      }

      // Verify user is authorized (seller, buyer, or admin)
      const order = escrow.order as any;
      if (
        order.buyer.toString() !== userId &&
        order.seller.toString() !== userId &&
        req.user?.role !== 'admin'
      ) {
        throw new AppError('Not authorized to refund this escrow', 403);
      }

      const transaction = await paymentService.refundEscrow(
        escrowId,
        userId,
        refundReason
      );

      res.json({
        success: true,
        message: 'Escrow refunded successfully',
        data: { transaction },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get escrow details
   * GET /api/payments/escrow/:escrowId
   */
  async getEscrowDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { escrowId } = req.params;

      const escrow = await Escrow.findById(escrowId)
        .populate('order')
        .populate('buyer seller', 'name email');

      if (!escrow) {
        throw new AppError('Escrow not found', 404);
      }

      // Verify user is involved in escrow
      if (
        escrow.buyer.toString() !== userId &&
        escrow.seller.toString() !== userId &&
        req.user?.role !== 'admin'
      ) {
        throw new AppError('Not authorized to view this escrow', 403);
      }

      res.json({
        success: true,
        data: { escrow },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's active escrows
   * GET /api/payments/escrow
   */
  async getUserEscrows(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Authentication required', 401);
      }

      const { status = 'active' } = req.query;

      const query: Record<string, any> = {
        $or: [{ buyer: userId }, { seller: userId }],
      };

      if (status !== 'all') {
        query.status = status;
      }

      const escrows = await Escrow.find(query)
        .populate('order', 'orderNumber status')
        .populate('buyer seller', 'name email')
        .sort('-createdAt');

      res.json({
        success: true,
        data: { escrows, total: escrows.length },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deposit funds to wallet (placeholder for payment gateway integration)
   * POST /api/payments/wallet/deposit
   */
  async depositFunds(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Authentication required', 401);
      }

      const { amount, paymentMethod, reference } = req.body;

      if (!amount || amount <= 0) {
        throw new AppError('Invalid amount', 400);
      }

      // TODO: Integrate with actual payment gateway (Flutterwave, MTN, etc.)
      // For now, create a pending transaction

      const transaction = await Transaction.create({
        type: 'deposit',
        amount,
        currency: 'UGX',
        sender: userId,
        recipient: userId, // Self deposit
        status: 'pending',
        paymentMethod: paymentMethod || 'mobile_money',
        reference,
        metadata: {
          gateway: 'placeholder',
          note: 'Pending payment gateway integration',
        },
      });

      res.status(201).json({
        success: true,
        message: 'Deposit initiated. Complete payment using the provided reference.',
        data: {
          transaction,
          paymentInstructions: {
            reference: transaction.transactionNumber,
            amount,
            currency: 'UGX',
            // TODO: Add actual payment gateway instructions
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Withdraw funds from wallet (placeholder)
   * POST /api/payments/wallet/withdraw
   */
  async withdrawFunds(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Authentication required', 401);
      }

      const { amount, withdrawalMethod, accountDetails } = req.body;

      if (!amount || amount <= 0) {
        throw new AppError('Invalid amount', 400);
      }

      const wallet = await Wallet.findOne({ user: userId });
      if (!wallet) {
        throw new AppError('Wallet not found', 404);
      }

      if (wallet.balance < amount) {
        throw new AppError('Insufficient balance', 400);
      }

      // TODO: Integrate with withdrawal service

      const transaction = await Transaction.create({
        type: 'withdrawal',
        amount,
        currency: 'UGX',
        sender: userId,
        recipient: userId,
        status: 'pending',
        paymentMethod: withdrawalMethod || 'bank_transfer',
        metadata: {
          accountDetails,
          note: 'Pending withdrawal processing',
        },
      });

      // Deduct from wallet
      wallet.balance -= amount;
      await wallet.save();

      res.status(201).json({
        success: true,
        message: 'Withdrawal initiated. Funds will be processed within 24 hours.',
        data: { transaction },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Webhook handler for payment gateway callbacks
   * POST /api/payments/webhook/:provider
   */
  async handleWebhook(_req: Request, res: Response, next: NextFunction) {
    try {
      // const { provider } = _req.params;
      // const payload = _req.body;

      // TODO: Implement webhook verification and processing
      // - Verify signature
      // - Update transaction status
      // - Update wallet balance
      // - Emit events

      res.json({ success: true, message: 'Webhook received' });
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();
