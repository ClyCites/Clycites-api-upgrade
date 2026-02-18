import { Router } from 'express';
import { paymentController } from './payment.controller';
import { authenticate } from '../../common/middleware/auth';

const router = Router();

/**
 * Most routes require authentication
 */

/**
 * @route   GET /api/payments/wallet
 * @desc    Get user's wallet details
 * @access  Authenticated users
 */
router.get('/wallet', authenticate, paymentController.getWallet);

/**
 * @route   POST /api/payments/wallet/deposit
 * @desc    Initiate wallet deposit
 * @access  Authenticated users
 * @body    { amount, paymentMethod, reference }
 */
router.post('/wallet/deposit', authenticate, paymentController.depositFunds);

/**
 * @route   POST /api/payments/wallet/withdraw
 * @desc    Initiate wallet withdrawal
 * @access  Authenticated users
 * @body    { amount, withdrawalMethod, accountDetails }
 */
router.post('/wallet/withdraw', authenticate, paymentController.withdrawFunds);

/**
 * @route   GET /api/payments/transactions
 * @desc    Get user's transaction history
 * @access  Authenticated users
 * @query   page, limit, type, status
 */
router.get('/transactions', authenticate, paymentController.getTransactions);

/**
 * @route   POST /api/payments/escrow/initiate
 * @desc    Initiate escrow for an order
 * @access  Authenticated users (buyers)
 * @body    { orderId, amount }
 */
router.post('/escrow/initiate', authenticate, paymentController.initiateEscrow);

/**
 * @route   GET /api/payments/escrow
 * @desc    Get user's escrows
 * @access  Authenticated users
 * @query   status (active|released|refunded|disputed|all)
 */
router.get('/escrow', authenticate, paymentController.getUserEscrows);

/**
 * @route   GET /api/payments/escrow/:escrowId
 * @desc    Get escrow details
 * @access  Escrow parties
 */
router.get('/escrow/:escrowId', authenticate, paymentController.getEscrowDetails);

/**
 * @route   POST /api/payments/escrow/:escrowId/release
 * @desc    Release escrow funds to seller
 * @access  Buyer or Admin
 * @body    { releaseReason }
 */
router.post(
  '/escrow/:escrowId/release',
  authenticate,
  paymentController.releaseEscrow
);

/**
 * @route   POST /api/payments/escrow/:escrowId/refund
 * @desc    Refund escrow to buyer
 * @access  Parties involved or Admin
 * @body    { refundReason }
 */
router.post(
  '/escrow/:escrowId/refund',
  authenticate,
  paymentController.refundEscrow
);

/**
 * @route   POST /api/payments/webhook/:provider
 * @desc    Payment gateway webhook handler
 * @access  Public (with signature verification)
 * @params  provider (flutterwave|mtn|airtel|paystack)
 */
router.post('/webhook/:provider', paymentController.handleWebhook);

export default router;
