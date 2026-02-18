import { Router } from 'express';
import { reputationController } from './reputation.controller';
import { authenticate } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import {
  createRatingValidator,
  addSellerResponseValidator,
  markHelpfulValidator,
  getUserRatingsValidator,
  getReputationScoreValidator,
} from './reputation.validator';

const router = Router();

/**
 * All routes require authentication
 */
router.use(authenticate);

/**
 * @route   GET /api/reputation/top-rated
 * @desc    Get top-rated users
 * @access  Private
 */
router.get('/top-rated', reputationController.getTopRatedUsers.bind(reputationController));

/**
 * @route   POST /api/reputation/ratings
 * @desc    Create a rating for a completed order
 * @access  Private
 */
router.post(
  '/ratings',
  validate(createRatingValidator),
  reputationController.createRating.bind(reputationController)
);

/**
 * @route   GET /api/reputation/users/:userId/ratings
 * @desc    Get all ratings for a user
 * @access  Private
 */
router.get(
  '/users/:userId/ratings',
  validate(getUserRatingsValidator),
  reputationController.getUserRatings.bind(reputationController)
);

/**
 * @route   GET /api/reputation/users/:userId/score
 * @desc    Get reputation score for a user
 * @access  Private
 */
router.get(
  '/users/:userId/score',
  validate(getReputationScoreValidator),
  reputationController.getReputationScore.bind(reputationController)
);

/**
 * @route   POST /api/reputation/ratings/:ratingId/response
 * @desc    Add seller response to a rating
 * @access  Private
 */
router.post(
  '/ratings/:ratingId/response',
  validate(addSellerResponseValidator),
  reputationController.addSellerResponse.bind(reputationController)
);

/**
 * @route   POST /api/reputation/ratings/:ratingId/helpful
 * @desc    Mark a rating as helpful or not helpful
 * @access  Private
 */
router.post(
  '/ratings/:ratingId/helpful',
  validate(markHelpfulValidator),
  reputationController.markHelpful.bind(reputationController)
);

export default router;
