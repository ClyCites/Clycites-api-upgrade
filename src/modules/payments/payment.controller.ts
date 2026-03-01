import { Request, Response, NextFunction } from 'express';
import { paymentService } from './payment.service';
import Wallet from './wallet.model';
import Transaction from './transaction.model';
import Escrow from './escrow.model';
import { AppError } from '../../common/errors/AppError';
import { ResponseHandler } from '../../common/utils/response';
import AuditService from '../audit/audit.service';
import { canBypassAuthorization, isSuperAdminRole } from '../../common/middleware/superAdmin';
import { getClientIp } from '../../common/middleware/rateLimiter';

class PaymentController {
  private getUserId(req: Request): string {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    return userId;
  }

  private async logSensitiveAction(
    req: Request,
    action: string,
    targetId: string | undefined,
    reason?: string
  ): Promise<void> {
    if (!req.user?.id) {
      return;
    }

    const userAgentHeader = req.headers['user-agent'];
    const userAgent = typeof userAgentHeader === 'string' ? userAgentHeader : 'unknown';

    await AuditService.log({
      action,
      resource: 'payment',
      resourceId: targetId,
      userId: req.user.id,
      ipAddress: getClientIp(req),
      userAgent,
      risk: 'high',
      details: {
        metadata: {
          actorId: req.user.impersonatedBy || req.user.id,
          targetId,
          reason,
          requestId: req.requestId,
          superAdminMode: isSuperAdminRole(req.user.role),
        },
      },
    });
  }

  /**
   * Get user's wallet
   * GET /api/payments/wallet
   */
  async getWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = this.getUserId(req);

      let wallet = await Wallet.findOne({ user: userId });

      // Create wallet if doesn't exist
      if (!wallet) {
        wallet = await Wallet.create({
          user: userId,
          balance: 0,
          escrowBalance: 0,
          availableBalance: 0,
          currency: 'UGX',
        });
      }

      ResponseHandler.success(res, { wallet }, 'Wallet retrieved successfully');
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
      const userId = this.getUserId(req);

      const { page = 1, limit = 20, type, status } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const query: Record<string, any> = {
        $or: [{ from: userId }, { to: userId }],
      };

      if (type) query.type = type;
      if (status) query.status = status;

      const [transactions, total] = await Promise.all([
        Transaction.find(query)
          .sort('-createdAt')
          .limit(Number(limit))
          .skip(skip)
          .populate('from to', 'firstName lastName email')
          .populate('order', 'orderNumber'),
        Transaction.countDocuments(query),
      ]);

      ResponseHandler.success(
        res,
        {
          transactions,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
        'Transactions retrieved successfully'
      );
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
      const userId = this.getUserId(req);

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

      await this.logSensitiveAction(req, 'payment.escrow_initiated', escrow?._id?.toString(), 'Escrow funded');

      ResponseHandler.created(res, { escrow }, 'Escrow initiated successfully');
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
      const userId = this.getUserId(req);

      const { escrowId } = req.params;
      const { releaseReason } = req.body;
      // releaseReason from body is optional, can be used for audit later

      const escrow = await Escrow.findById(escrowId).populate('order');

      if (!escrow) {
        throw new AppError('Escrow not found', 404);
      }

      // Verify user is authorized (buyer or admin)
      const order = escrow.order as any;
      const isAdmin = req.user ? isSuperAdminRole(req.user.role) || req.user.role === 'admin' : false;
      const bypass = canBypassAuthorization(req, ['super_admin:payments:override']);
      if (
        order.buyer.toString() !== userId &&
        !isAdmin &&
        !bypass
      ) {
        throw new AppError('Not authorized to release this escrow', 403);
      }

      const transaction = await paymentService.releaseEscrow(
        escrowId,
        userId
      );

      await this.logSensitiveAction(req, 'payment.escrow_released', escrowId, releaseReason);

      ResponseHandler.success(res, { transaction }, 'Escrow released successfully');
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
      const userId = this.getUserId(req);

      const { escrowId } = req.params;
      const { refundReason } = req.body;

      const escrow = await Escrow.findById(escrowId).populate('order');

      if (!escrow) {
        throw new AppError('Escrow not found', 404);
      }

      // Verify user is authorized (seller, buyer, or admin)
      const order = escrow.order as any;
      const isAdmin = req.user ? isSuperAdminRole(req.user.role) || req.user.role === 'admin' : false;
      const bypass = canBypassAuthorization(req, ['super_admin:payments:override']);
      if (
        order.buyer.toString() !== userId &&
        order.seller.toString() !== userId &&
        !isAdmin &&
        !bypass
      ) {
        throw new AppError('Not authorized to refund this escrow', 403);
      }

      const transaction = await paymentService.refundEscrow(
        escrowId,
        refundReason,
        userId
      );

      await this.logSensitiveAction(req, 'payment.escrow_refunded', escrowId, refundReason);

      ResponseHandler.success(res, { transaction }, 'Escrow refunded successfully');
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
      const userId = this.getUserId(req);
      const { escrowId } = req.params;

      const escrow = await Escrow.findById(escrowId)
        .populate('order')
        .populate('buyer seller', 'name email');

      if (!escrow) {
        throw new AppError('Escrow not found', 404);
      }

      const bypass = canBypassAuthorization(req, ['super_admin:payments:override']);
      const isAdmin = req.user ? isSuperAdminRole(req.user.role) || req.user.role === 'admin' : false;
      // Verify user is involved in escrow
      if (
        escrow.buyer.toString() !== userId &&
        escrow.seller.toString() !== userId &&
        !isAdmin &&
        !bypass
      ) {
        throw new AppError('Not authorized to view this escrow', 403);
      }

      ResponseHandler.success(res, { escrow }, 'Escrow details retrieved successfully');
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
      const userId = this.getUserId(req);

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

      ResponseHandler.success(
        res,
        { escrows, total: escrows.length },
        'Escrows retrieved successfully'
      );
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
      const userId = this.getUserId(req);

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
        from: userId,
        to: userId, // Self deposit
        status: 'pending',
        paymentMethod: paymentMethod || 'mobile_money',
        externalReference: reference,
        description: 'Wallet deposit initiated',
        metadata: {
          gateway: 'placeholder',
          note: 'Pending payment gateway integration',
        },
      });

      await this.logSensitiveAction(req, 'payment.wallet_deposit_initiated', transaction._id.toString());

      ResponseHandler.created(
        res,
        {
          transaction,
          paymentInstructions: {
            reference: transaction.transactionNumber,
            amount,
            currency: 'UGX',
            // TODO: Add actual payment gateway instructions
          },
        },
        'Deposit initiated. Complete payment using the provided reference.'
      );
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
      const userId = this.getUserId(req);

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
        from: userId,
        to: userId,
        status: 'pending',
        paymentMethod: withdrawalMethod || 'bank_transfer',
        description: 'Wallet withdrawal initiated',
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance - amount,
        metadata: {
          accountDetails,
          note: 'Pending withdrawal processing',
        },
      } as any);

      // Deduct from wallet
      wallet.balance -= amount;
      await wallet.save();

      await this.logSensitiveAction(req, 'payment.wallet_withdrawal_initiated', transaction._id.toString());

      ResponseHandler.created(
        res,
        { transaction },
        'Withdrawal initiated. Funds will be processed within 24 hours.'
      );
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

      ResponseHandler.success(res, null, 'Webhook received');
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();
