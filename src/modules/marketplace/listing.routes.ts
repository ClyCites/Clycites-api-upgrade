import { Router } from 'express';
import listingController from './listing.controller';
import { authenticate, optionalAuth } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import {
  createListingValidator,
  updateListingValidator,
  updateStatusValidator,
  listingIdValidator,
  searchListingsValidator,
} from './listing.validator';

const router = Router();

// Public routes
router.get(
  '/',
  optionalAuth,
  validate(searchListingsValidator),
  listingController.getAllListings
);

router.get(
  '/:id',
  optionalAuth,
  validate(listingIdValidator),
  listingController.getListingById
);

router.post(
  '/:id/inquire',
  optionalAuth,
  validate(listingIdValidator),
  listingController.incrementInquiries
);

// Protected routes (farmer only)
router.use(authenticate);

router.get(
  '/my/listings',
  authorize('farmer'),
  listingController.getMyListings
);

router.get(
  '/my/stats',
  authorize('farmer'),
  listingController.getMyStats
);

router.post(
  '/',
  authorize('farmer'),
  validate(createListingValidator),
  listingController.createListing
);

router.put(
  '/:id',
  authorize('farmer'),
  validate(updateListingValidator),
  listingController.updateListing
);

router.patch(
  '/:id/status',
  authorize('farmer'),
  validate(updateStatusValidator),
  listingController.updateListingStatus
);

router.delete(
  '/:id',
  authorize('farmer'),
  validate(listingIdValidator),
  listingController.deleteListing
);

export default router;
