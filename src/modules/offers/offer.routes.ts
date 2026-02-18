import { Router } from 'express';
import { offerController } from './offer.controller';
import { authenticate } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import {
  createOfferValidator,
  counterOfferValidator,
  acceptOfferValidator,
  rejectOfferValidator,
  withdrawOfferValidator,
  addMessageValidator,
  getOffersQueryValidator,
  getOfferByIdValidator,
  markMessagesReadValidator,
} from './offer.validator';

const router = Router();

/**
 * All routes require authentication
 */
router.use(authenticate);

/**
 * @route   GET /api/offers/stats
 * @desc    Get user's offer statistics
 * @access  Private
 */
router.get('/stats', offerController.getUserOfferStats.bind(offerController));

/**
 * @route   GET /api/offers
 * @desc    Get user's offers (sent or received)
 * @access  Private
 */
router.get(
  '/',
  validate(getOffersQueryValidator),
  offerController.getUserOffers.bind(offerController)
);

/**
 * @route   POST /api/offers
 * @desc    Create a new offer for a listing
 * @access  Private
 */
router.post(
  '/',
  validate(createOfferValidator),
  offerController.createOffer.bind(offerController)
);

/**
 * @route   GET /api/offers/:offerId
 * @desc    Get offer details by ID
 * @access  Private
 */
router.get(
  '/:offerId',
  validate(getOfferByIdValidator),
  offerController.getOfferById.bind(offerController)
);

/**
 * @route   POST /api/offers/:offerId/counter
 * @desc    Create a counter-offer
 * @access  Private
 */
router.post(
  '/:offerId/counter',
  validate(counterOfferValidator),
  offerController.counterOffer.bind(offerController)
);

/**
 * @route   POST /api/offers/:offerId/accept
 * @desc    Accept an offer and convert to order
 * @access  Private
 */
router.post(
  '/:offerId/accept',
  validate(acceptOfferValidator),
  offerController.acceptOffer.bind(offerController)
);

/**
 * @route   POST /api/offers/:offerId/reject
 * @desc    Reject an offer
 * @access  Private
 */
router.post(
  '/:offerId/reject',
  validate(rejectOfferValidator),
  offerController.rejectOffer.bind(offerController)
);

/**
 * @route   POST /api/offers/:offerId/withdraw
 * @desc    Withdraw an offer (buyer only)
 * @access  Private
 */
router.post(
  '/:offerId/withdraw',
  validate(withdrawOfferValidator),
  offerController.withdrawOffer.bind(offerController)
);

/**
 * @route   POST /api/offers/:offerId/messages
 * @desc    Add a message to offer negotiation
 * @access  Private
 */
router.post(
  '/:offerId/messages',
  validate(addMessageValidator),
  offerController.addMessage.bind(offerController)
);

/**
 * @route   PUT /api/offers/:offerId/messages/read
 * @desc    Mark all messages in an offer as read
 * @access  Private
 */
router.put(
  '/:offerId/messages/read',
  validate(markMessagesReadValidator),
  offerController.markMessagesAsRead.bind(offerController)
);

export default router;
