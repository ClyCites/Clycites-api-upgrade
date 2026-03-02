import { Request, Response, NextFunction } from 'express';
import { paymentService } from './payment.service';
import Wallet from './wallet.model';
import Transaction from './transaction.model';
import Escrow from './escrow.model';
import Payout, { PayoutStatus } from './payout.model';
import { AppError, ForbiddenError } from '../../common/errors/AppError';
import { ResponseHandler } from '../../common/utils/response';
import AuditService from '../audit/audit.service';
import { canBypassAuthorization, isSuperAdminRole } from '../../common/middleware/superAdmin';
import { getClientIp } from '../../common/middleware/rateLimiter';

type WalletUiStatus = 'active' | 'frozen';
type TransactionUiStatus = 'pending' | 'completed' | 'failed' | 'reversed';
type EscrowUiStatus = 'created' | 'funded' | 'released' | 'refunded' | 'closed';

const PAYOUT_TRANSITIONS: Record<PayoutStatus, PayoutStatus[]> = {
  requested: ['requested', 'processing', 'paid', 'failed'],
  processing: ['processing', 'paid', 'failed'],
  paid: ['paid'],
  failed: ['failed'],
};

const toInt = (value: unknown, fallback: number, max?: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  if (typeof max === 'number') return Math.min(parsed, max);
  return parsed;
};

const toPlainObject = <T>(value: T): T => {
  if (value && typeof (value as { toObject?: () => T }).toObject === 'function') {
    return (value as { toObject: () => T }).toObject();
  }
  return value;
};

const toWalletUiStatus = (status?: string): WalletUiStatus => (status === 'active' ? 'active' : 'frozen');

const toTransactionUiStatus = (status?: string): TransactionUiStatus => {
  if (status === 'completed') return 'completed';
  if (status === 'failed') return 'failed';
  if (status === 'reversed' || status === 'cancelled') return 'reversed';
  return 'pending';
};

const toEscrowUiStatus = (status?: string): EscrowUiStatus => {
  if (status === 'initiated') return 'created';
  if (status === 'funded' || status === 'held') return 'funded';
  if (status === 'released') return 'released';
  if (status === 'refunded') return 'refunded';
  return 'closed';
};

const mapWallet = <T extends Record<string, unknown>>(wallet: T): T & { uiStatus: WalletUiStatus } => {
  const plain = toPlainObject(wallet);
  return { ...plain, uiStatus: toWalletUiStatus(typeof plain.status === 'string' ? plain.status : undefined) };
};

const mapTransaction = <T extends Record<string, unknown>>(tx: T): T & { uiStatus: TransactionUiStatus } => {
  const plain = toPlainObject(tx);
  return { ...plain, uiStatus: toTransactionUiStatus(typeof plain.status === 'string' ? plain.status : undefined) };
};

const mapEscrow = <T extends Record<string, unknown>>(escrow: T): T & { uiStatus: EscrowUiStatus } => {
  const plain = toPlainObject(escrow);
  return { ...plain, uiStatus: toEscrowUiStatus(typeof plain.status === 'string' ? plain.status : undefined) };
};

const mapPayout = <T extends Record<string, unknown>>(payout: T): T & { uiStatus: unknown } => {
  const plain = toPlainObject(payout);
  return { ...plain, uiStatus: plain.status };
};

const pagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit) || 1,
});

const readOrgId = (req: Request): string | undefined => {
  const fromQuery = typeof req.query.organizationId === 'string' ? req.query.organizationId.trim() : undefined;
  const fromHeader = typeof req.headers['x-organization-id'] === 'string' ? req.headers['x-organization-id'].trim() : undefined;
  const fromBody = typeof req.body === 'object' && req.body && typeof (req.body as any).organizationId === 'string'
    ? (req.body as any).organizationId.trim()
    : undefined;
  const value = fromQuery || fromBody || fromHeader;
  return value && value.length > 0 ? value : undefined;
};

class PaymentController {
  private getUserId(req: Request): string {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    return userId;
  }

  private isPrivileged(role?: string): boolean {
    return role === 'admin' || role === 'platform_admin' || isSuperAdminRole(role);
  }

  private resolveOrgId(req: Request): string | undefined {
    const requested = readOrgId(req);
    const actorOrg = req.user?.orgId;

    if (isSuperAdminRole(req.user?.role)) return requested || actorOrg;

    if (actorOrg) {
      if (requested && requested !== actorOrg) {
        throw new ForbiddenError('Cannot access payments resources outside your organization context');
      }
      return actorOrg;
    }

    return requested;
  }

  private assertPayoutAccess(req: Request, payout: { organization?: { toString: () => string } | string; createdBy: { toString: () => string } | string }) {
    if (isSuperAdminRole(req.user?.role)) return;

    const actorId = this.getUserId(req);
    const actorOrg = req.user?.orgId;
    const payoutOrg = payout.organization ? payout.organization.toString() : undefined;
    const owner = payout.createdBy.toString();

    if (this.isPrivileged(req.user?.role)) {
      if (payoutOrg && actorOrg && payoutOrg !== actorOrg) {
        throw new ForbiddenError('Cannot access payouts outside your organization context');
      }
      return;
    }

    if (owner !== actorId) {
      throw new ForbiddenError('You can only access your own payouts');
    }

    if (payoutOrg && actorOrg && payoutOrg !== actorOrg) {
      throw new ForbiddenError('Cannot access payouts outside your organization context');
    }
  }

  private parseTransactionStatusFilter(value: unknown): string[] | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'pending') return ['pending', 'processing'];
    if (normalized === 'completed') return ['completed'];
    if (normalized === 'failed') return ['failed'];
    if (normalized === 'reversed') return ['reversed', 'cancelled'];
    if (normalized === 'processing' || normalized === 'cancelled') return [normalized];
    throw new AppError('Invalid transaction status filter', 400, 'BAD_REQUEST');
  }

  private parseEscrowStatusFilter(value: unknown): string[] | undefined {
    if (typeof value !== 'string') return ['initiated', 'funded', 'held'];
    const normalized = value.trim().toLowerCase();
    if (normalized === 'all') return undefined;
    if (normalized === 'active') return ['initiated', 'funded', 'held'];
    if (normalized === 'created') return ['initiated'];
    if (normalized === 'funded') return ['funded', 'held'];
    if (normalized === 'released') return ['released'];
    if (normalized === 'refunded') return ['refunded'];
    if (normalized === 'disputed') return ['disputed'];
    if (normalized === 'closed') return ['released', 'refunded', 'disputed'];
    if (normalized === 'initiated' || normalized === 'held') return [normalized];
    throw new AppError('Invalid escrow status filter', 400, 'BAD_REQUEST');
  }

  private assertPayoutTransition(currentStatus: PayoutStatus, nextStatus: PayoutStatus): void {
    if (!(PAYOUT_TRANSITIONS[currentStatus] || []).includes(nextStatus)) {
      throw new AppError(`Invalid payout status transition: ${currentStatus} -> ${nextStatus}`, 400, 'BAD_REQUEST');
    }
  }

  private async setPayoutPaid(payout: any): Promise<void> {
    this.assertPayoutTransition(payout.status as PayoutStatus, 'paid');
    payout.status = 'paid';
    payout.processedAt = new Date();
    payout.paidAt = new Date();

    if (payout.transaction) {
      const tx = await Transaction.findById(payout.transaction);
      if (tx) {
        tx.status = 'completed';
        tx.processedAt = new Date();
        await tx.save();
      }
    }
  }

  private async setPayoutFailed(payout: any, reason: string): Promise<void> {
    this.assertPayoutTransition(payout.status as PayoutStatus, 'failed');
    payout.status = 'failed';
    payout.failureReason = reason;
    payout.processedAt = new Date();

    if (payout.transaction) {
      const tx = await Transaction.findById(payout.transaction);
      if (tx) {
        tx.status = 'failed';
        tx.failureReason = reason;
        await tx.save();
      }
    }

    const wallet = payout.wallet ? await Wallet.findById(payout.wallet) : await Wallet.findOne({ user: payout.createdBy });
    if (wallet) {
      wallet.balance += payout.amount;
      await wallet.save();
    }
  }

  private async logSensitiveAction(req: Request, action: string, targetId: string | undefined, reason?: string): Promise<void> {
    if (!req.user?.id) return;

    await AuditService.log({
      action,
      resource: 'payment',
      resourceId: targetId,
      userId: req.user.id,
      organizationId: req.user.orgId,
      ipAddress: getClientIp(req),
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : 'unknown',
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

  async getWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = this.getUserId(req);
      const wallet = await paymentService.getOrCreateWallet(userId);
      const mapped = mapWallet(wallet as Record<string, unknown>);

      ResponseHandler.success(
        res,
        {
          wallet: mapped,
          workflow: {
            canDeposit: mapped.uiStatus === 'active',
            canWithdraw: mapped.uiStatus === 'active' && Number((mapped as any).availableBalance || 0) > 0,
          },
        },
        'Wallet retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = this.getUserId(req);
      const page = toInt(req.query.page, 1, 10000);
      const limit = toInt(req.query.limit, 20, 100);
      const skip = (page - 1) * limit;

      const query: Record<string, any> = { $or: [{ from: userId }, { to: userId }] };
      if (typeof req.query.type === 'string') query.type = req.query.type;

      const statusFilter = this.parseTransactionStatusFilter(req.query.uiStatus || req.query.status);
      if (statusFilter) query.status = statusFilter.length === 1 ? statusFilter[0] : { $in: statusFilter };

      if (typeof req.query.startDate === 'string' || typeof req.query.endDate === 'string') {
        const createdAt: Record<string, Date> = {};
        if (typeof req.query.startDate === 'string') {
          const startDate = new Date(req.query.startDate);
          if (Number.isNaN(startDate.getTime())) throw new AppError('Invalid startDate query parameter', 400, 'BAD_REQUEST');
          createdAt.$gte = startDate;
        }
        if (typeof req.query.endDate === 'string') {
          const endDate = new Date(req.query.endDate);
          if (Number.isNaN(endDate.getTime())) throw new AppError('Invalid endDate query parameter', 400, 'BAD_REQUEST');
          createdAt.$lte = endDate;
        }
        query.createdAt = createdAt;
      }

      const [transactions, total] = await Promise.all([
        Transaction.find(query)
          .sort('-createdAt')
          .limit(limit)
          .skip(skip)
          .populate('from to', 'firstName lastName email')
          .populate('order', 'orderNumber'),
        Transaction.countDocuments(query),
      ]);

      const rows = transactions.map((tx) => mapTransaction(tx as unknown as Record<string, unknown>));
      const pageInfo = pagination(page, limit, total);

      ResponseHandler.success(
        res,
        { transactions: rows, pagination: pageInfo },
        'Transactions retrieved successfully',
        200,
        { pagination: pageInfo }
      );
    } catch (error) {
      next(error);
    }
  }

  async initiateEscrow(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = this.getUserId(req);
      const { orderId, amount, sellerId } = req.body;

      if (!orderId || !amount || !sellerId) {
        throw new AppError('Order ID, seller ID, and amount are required', 400);
      }

      const escrow = await paymentService.initiateEscrow(orderId, userId, sellerId, amount);
      await this.logSensitiveAction(req, 'payment.escrow_initiated', escrow?._id?.toString(), 'Escrow funded');

      ResponseHandler.created(res, { escrow: mapEscrow(escrow as unknown as Record<string, unknown>) }, 'Escrow initiated successfully');
    } catch (error) {
      next(error);
    }
  }

  async releaseEscrow(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = this.getUserId(req);
      const { escrowId } = req.params;
      const { releaseReason } = req.body;

      const escrow = await Escrow.findById(escrowId).populate('order');
      if (!escrow) throw new AppError('Escrow not found', 404);

      const order = escrow.order as any;
      const isAdmin = req.user ? isSuperAdminRole(req.user.role) || req.user.role === 'admin' : false;
      const bypass = canBypassAuthorization(req, ['super_admin:payments:override']);
      if (order.buyer.toString() !== userId && !isAdmin && !bypass) {
        throw new AppError('Not authorized to release this escrow', 403);
      }

      const result = await paymentService.releaseEscrow(escrowId, userId);
      await this.logSensitiveAction(req, 'payment.escrow_released', escrowId, releaseReason);

      ResponseHandler.success(
        res,
        {
          escrow: mapEscrow(result.escrow as Record<string, unknown>),
          transaction: mapTransaction(result.transaction as Record<string, unknown>),
        },
        'Escrow released successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  async refundEscrow(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = this.getUserId(req);
      const { escrowId } = req.params;
      const { refundReason } = req.body;

      const escrow = await Escrow.findById(escrowId).populate('order');
      if (!escrow) throw new AppError('Escrow not found', 404);

      const order = escrow.order as any;
      const isAdmin = req.user ? isSuperAdminRole(req.user.role) || req.user.role === 'admin' : false;
      const bypass = canBypassAuthorization(req, ['super_admin:payments:override']);
      if (order.buyer.toString() !== userId && order.seller.toString() !== userId && !isAdmin && !bypass) {
        throw new AppError('Not authorized to refund this escrow', 403);
      }

      const result = await paymentService.refundEscrow(escrowId, refundReason, userId);
      await this.logSensitiveAction(req, 'payment.escrow_refunded', escrowId, refundReason);

      ResponseHandler.success(
        res,
        {
          escrow: mapEscrow(result.escrow as Record<string, unknown>),
          transaction: mapTransaction(result.transaction as Record<string, unknown>),
        },
        'Escrow refunded successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  async getEscrowDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = this.getUserId(req);
      const { escrowId } = req.params;

      const escrow = await Escrow.findById(escrowId)
        .populate('order')
        .populate('buyer seller', 'name email');

      if (!escrow) throw new AppError('Escrow not found', 404);

      const bypass = canBypassAuthorization(req, ['super_admin:payments:override']);
      const isAdmin = req.user ? isSuperAdminRole(req.user.role) || req.user.role === 'admin' : false;
      if (escrow.buyer.toString() !== userId && escrow.seller.toString() !== userId && !isAdmin && !bypass) {
        throw new AppError('Not authorized to view this escrow', 403);
      }

      ResponseHandler.success(res, { escrow: mapEscrow(escrow as unknown as Record<string, unknown>) }, 'Escrow details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getUserEscrows(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = this.getUserId(req);
      const page = toInt(req.query.page, 1, 10000);
      const limit = toInt(req.query.limit, 20, 100);
      const skip = (page - 1) * limit;

      const query: Record<string, any> = { $or: [{ buyer: userId }, { seller: userId }] };
      const statusFilter = this.parseEscrowStatusFilter(req.query.status);
      if (statusFilter) query.status = statusFilter.length === 1 ? statusFilter[0] : { $in: statusFilter };

      const [escrows, total] = await Promise.all([
        Escrow.find(query)
          .populate('order', 'orderNumber status')
          .populate('buyer seller', 'name email')
          .sort('-createdAt')
          .skip(skip)
          .limit(limit),
        Escrow.countDocuments(query),
      ]);

      const rows = escrows.map((escrow) => mapEscrow(escrow as unknown as Record<string, unknown>));
      const pageInfo = pagination(page, limit, total);

      ResponseHandler.success(
        res,
        { escrows: rows, total, pagination: pageInfo },
        'Escrows retrieved successfully',
        200,
        { pagination: pageInfo }
      );
    } catch (error) {
      next(error);
    }
  }

  async depositFunds(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = this.getUserId(req);
      const { amount, paymentMethod, reference } = req.body;

      if (!amount || amount <= 0) throw new AppError('Invalid amount', 400);

      const wallet = await paymentService.getOrCreateWallet(userId);
      if (toWalletUiStatus(wallet.status) !== 'active') {
        throw new AppError('Wallet is frozen. Deposits are currently disabled', 400, 'BAD_REQUEST');
      }

      const transaction = await Transaction.create({
        type: 'deposit',
        amount,
        currency: 'UGX',
        from: userId,
        to: userId,
        status: 'pending',
        paymentMethod: paymentMethod || 'mobile_money',
        externalReference: reference,
        description: 'Wallet deposit initiated',
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance,
        metadata: {
          gateway: 'placeholder',
          note: 'Pending payment gateway integration',
        },
      } as any);

      await this.logSensitiveAction(req, 'payment.wallet_deposit_initiated', transaction._id.toString());

      ResponseHandler.created(
        res,
        {
          transaction: mapTransaction(transaction as unknown as Record<string, unknown>),
          wallet: mapWallet(wallet as unknown as Record<string, unknown>),
          paymentInstructions: {
            reference: transaction.transactionNumber,
            amount,
            currency: 'UGX',
          },
        },
        'Deposit initiated. Complete payment using the provided reference.'
      );
    } catch (error) {
      next(error);
    }
  }

  async withdrawFunds(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = this.getUserId(req);
      const { amount, withdrawalMethod, accountDetails, reference } = req.body;

      if (!amount || amount <= 0) throw new AppError('Invalid amount', 400);

      const wallet = await paymentService.getOrCreateWallet(userId);
      if (toWalletUiStatus(wallet.status) !== 'active') {
        throw new AppError('Wallet is frozen. Withdrawals are currently disabled', 400, 'BAD_REQUEST');
      }

      if (wallet.availableBalance < amount) {
        throw new AppError('Insufficient balance', 400);
      }

      const transaction = await Transaction.create({
        type: 'withdrawal',
        amount,
        currency: wallet.currency || 'UGX',
        from: userId,
        to: userId,
        status: 'pending',
        paymentMethod: withdrawalMethod || 'bank_transfer',
        description: 'Wallet withdrawal initiated',
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance - amount,
        externalReference: reference,
        metadata: {
          accountDetails,
          note: 'Pending withdrawal processing',
        },
      } as any);

      wallet.balance -= amount;
      await wallet.save();

      const payout = await Payout.create({
        organization: this.resolveOrgId(req),
        createdBy: userId,
        wallet: wallet._id,
        transaction: transaction._id,
        amount,
        currency: wallet.currency || 'UGX',
        method: withdrawalMethod || 'bank_transfer',
        accountDetails: accountDetails || {},
        reference,
        status: 'requested',
        notes: 'Generated via wallet withdrawal flow',
      });

      await this.logSensitiveAction(req, 'payment.wallet_withdrawal_initiated', transaction._id.toString());

      ResponseHandler.created(
        res,
        {
          transaction: mapTransaction(transaction as unknown as Record<string, unknown>),
          payout: mapPayout(payout as unknown as Record<string, unknown>),
          wallet: mapWallet(wallet as unknown as Record<string, unknown>),
        },
        'Withdrawal initiated. Funds will be processed within 24 hours.'
      );
    } catch (error) {
      next(error);
    }
  }

  async listPayouts(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = this.getUserId(req);
      const organizationId = this.resolveOrgId(req);
      const page = toInt(req.query.page, 1, 10000);
      const limit = toInt(req.query.limit, 20, 100);
      const skip = (page - 1) * limit;

      const filter: Record<string, unknown> = { isActive: true };
      if (organizationId) filter.organization = organizationId;

      if (!this.isPrivileged(req.user?.role) && !isSuperAdminRole(req.user?.role)) {
        filter.createdBy = userId;
      }

      if (typeof req.query.status === 'string') {
        if (!['requested', 'processing', 'paid', 'failed'].includes(req.query.status)) {
          throw new AppError('Invalid payout status filter', 400, 'BAD_REQUEST');
        }
        filter.status = req.query.status;
      }

      if (typeof req.query.method === 'string') {
        if (!['bank_transfer', 'mobile_money', 'cash'].includes(req.query.method)) {
          throw new AppError('Invalid payout method filter', 400, 'BAD_REQUEST');
        }
        filter.method = req.query.method;
      }

      const [payouts, total] = await Promise.all([
        Payout.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Payout.countDocuments(filter),
      ]);

      const rows = payouts.map((payout) => mapPayout(payout as unknown as Record<string, unknown>));
      const pageInfo = pagination(page, limit, total);

      ResponseHandler.success(res, rows, 'Payouts retrieved successfully', 200, { pagination: pageInfo });
    } catch (error) {
      next(error);
    }
  }

  async createPayout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = this.getUserId(req);
      const organizationId = this.resolveOrgId(req);
      const amount = Number(req.body.amount);
      const method = typeof req.body.method === 'string' ? req.body.method : 'bank_transfer';

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new AppError('amount must be greater than 0', 400, 'BAD_REQUEST');
      }

      if (!['bank_transfer', 'mobile_money', 'cash'].includes(method)) {
        throw new AppError('method must be bank_transfer, mobile_money, or cash', 400, 'BAD_REQUEST');
      }

      const wallet = await paymentService.getOrCreateWallet(userId);
      if (toWalletUiStatus(wallet.status) !== 'active') {
        throw new AppError('Wallet is frozen. Payout request is not allowed', 400, 'BAD_REQUEST');
      }

      if (wallet.availableBalance < amount) {
        throw new AppError('Insufficient balance', 400, 'BAD_REQUEST');
      }

      const transaction = await Transaction.create({
        type: 'withdrawal',
        amount,
        currency: wallet.currency || 'UGX',
        from: userId,
        to: userId,
        status: 'pending',
        paymentMethod: method,
        description: req.body.description || 'Payout requested',
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance - amount,
        externalReference: req.body.reference,
        metadata: {
          accountDetails: req.body.accountDetails || {},
          source: 'payout_endpoint',
        },
      } as any);

      wallet.balance -= amount;
      await wallet.save();

      const payout = await Payout.create({
        organization: organizationId,
        createdBy: userId,
        wallet: wallet._id,
        transaction: transaction._id,
        amount,
        currency: wallet.currency || 'UGX',
        method,
        accountDetails: req.body.accountDetails || {},
        reference: req.body.reference,
        status: 'requested',
        notes: req.body.notes,
        metadata: req.body.metadata || {},
      });

      await this.logSensitiveAction(req, 'payment.payout_requested', payout._id.toString());

      ResponseHandler.created(
        res,
        {
          payout: mapPayout(payout as unknown as Record<string, unknown>),
          transaction: mapTransaction(transaction as unknown as Record<string, unknown>),
        },
        'Payout created successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  async getPayout(req: Request, res: Response, next: NextFunction) {
    try {
      const payout = await Payout.findOne({ _id: req.params.payoutId, isActive: true });
      if (!payout) throw new AppError('Payout not found', 404, 'NOT_FOUND');

      this.assertPayoutAccess(req, payout);
      ResponseHandler.success(res, mapPayout(payout as unknown as Record<string, unknown>), 'Payout retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async updatePayout(req: Request, res: Response, next: NextFunction) {
    try {
      const payout = await Payout.findOne({ _id: req.params.payoutId, isActive: true });
      if (!payout) throw new AppError('Payout not found', 404, 'NOT_FOUND');

      this.assertPayoutAccess(req, payout);

      if (typeof req.body.status === 'string') {
        const nextStatus = req.body.status as PayoutStatus;
        if (!['requested', 'processing', 'paid', 'failed'].includes(nextStatus)) {
          throw new AppError('Invalid payout status', 400, 'BAD_REQUEST');
        }

        if (nextStatus === 'paid') {
          await this.setPayoutPaid(payout);
        } else if (nextStatus === 'failed') {
          await this.setPayoutFailed(payout, req.body.failureReason || 'Payout failed');
        } else {
          this.assertPayoutTransition(payout.status as PayoutStatus, nextStatus);
          payout.status = nextStatus;
          if (nextStatus === 'processing') payout.processedAt = new Date();
        }
      }

      if (req.body.method !== undefined) {
        if (!['bank_transfer', 'mobile_money', 'cash'].includes(req.body.method)) {
          throw new AppError('Invalid payout method', 400, 'BAD_REQUEST');
        }
        payout.method = req.body.method;
      }
      if (req.body.accountDetails !== undefined) payout.accountDetails = req.body.accountDetails;
      if (req.body.reference !== undefined) payout.reference = req.body.reference;
      if (req.body.notes !== undefined) payout.notes = req.body.notes;
      if (req.body.metadata !== undefined) payout.metadata = req.body.metadata;
      if (req.body.failureReason !== undefined) payout.failureReason = req.body.failureReason;

      await payout.save();
      await this.logSensitiveAction(req, 'payment.payout_updated', payout._id.toString());

      ResponseHandler.success(res, mapPayout(payout as unknown as Record<string, unknown>), 'Payout updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deletePayout(req: Request, res: Response, next: NextFunction) {
    try {
      const payout = await Payout.findOne({ _id: req.params.payoutId, isActive: true });
      if (!payout) throw new AppError('Payout not found', 404, 'NOT_FOUND');

      this.assertPayoutAccess(req, payout);

      payout.isActive = false;
      await payout.save();

      await this.logSensitiveAction(req, 'payment.payout_deleted', payout._id.toString());
      ResponseHandler.success(res, null, 'Payout deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async approvePayout(req: Request, res: Response, next: NextFunction) {
    try {
      const payout = await Payout.findOne({ _id: req.params.payoutId, isActive: true });
      if (!payout) throw new AppError('Payout not found', 404, 'NOT_FOUND');

      this.assertPayoutAccess(req, payout);
      await this.setPayoutPaid(payout);
      await payout.save();

      await this.logSensitiveAction(req, 'payment.payout_approved', payout._id.toString());
      ResponseHandler.success(res, mapPayout(payout as unknown as Record<string, unknown>), 'Payout approved successfully');
    } catch (error) {
      next(error);
    }
  }

  async failPayout(req: Request, res: Response, next: NextFunction) {
    try {
      const payout = await Payout.findOne({ _id: req.params.payoutId, isActive: true });
      if (!payout) throw new AppError('Payout not found', 404, 'NOT_FOUND');

      this.assertPayoutAccess(req, payout);
      const reason = typeof req.body.reason === 'string' && req.body.reason.trim().length > 0
        ? req.body.reason.trim()
        : 'Payout failed';

      await this.setPayoutFailed(payout, reason);
      await payout.save();

      await this.logSensitiveAction(req, 'payment.payout_failed', payout._id.toString(), reason);
      ResponseHandler.success(res, mapPayout(payout as unknown as Record<string, unknown>), 'Payout marked as failed');
    } catch (error) {
      next(error);
    }
  }

  async handleWebhook(_req: Request, res: Response, next: NextFunction) {
    try {
      ResponseHandler.success(res, null, 'Webhook received');
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();
