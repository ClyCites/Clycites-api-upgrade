import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import {
  createDisputeValidator,
  disputeIdValidator,
  submitEvidenceValidator,
  assignMediatorValidator,
  resolveDisputeValidator,
  noteActionValidator,
  listDisputesValidator,
} from './dispute.validator';
import {
  createDispute,
  getDisputeById,
  getMyDisputes,
  getAdminDisputes,
  getDisputeStats,
  submitEvidence,
  reviewDispute,
  assignMediator,
  resolveDispute,
  escalateDispute,
  closeDispute,
} from './dispute.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Participant routes ────────────────────────────────────────────────────────

router.post(
  '/',
  authorize('buyer', 'farmer', 'admin', 'platform_admin'),
  validate(createDisputeValidator),
  createDispute
);

router.get(
  '/',
  authorize('buyer', 'farmer', 'admin', 'platform_admin'),
  validate(listDisputesValidator),
  getMyDisputes
);

router.get(
  '/:id',
  validate(disputeIdValidator),
  getDisputeById
);

router.post(
  '/:id/evidence',
  validate(submitEvidenceValidator),
  submitEvidence
);

// ── Admin / platform_admin routes ─────────────────────────────────────────────

router.get(
  '/admin/all',
  authorize('admin', 'platform_admin'),
  validate(listDisputesValidator),
  getAdminDisputes
);

router.get(
  '/admin/stats',
  authorize('admin', 'platform_admin'),
  getDisputeStats
);

router.post(
  '/:id/review',
  authorize('admin', 'platform_admin'),
  validate(noteActionValidator),
  reviewDispute
);

router.post(
  '/:id/mediator',
  authorize('admin', 'platform_admin'),
  validate(assignMediatorValidator),
  assignMediator
);

router.post(
  '/:id/resolve',
  authorize('admin', 'platform_admin', 'expert'),
  validate(resolveDisputeValidator),
  resolveDispute
);

router.post(
  '/:id/escalate',
  authorize('admin', 'platform_admin'),
  validate(noteActionValidator),
  escalateDispute
);

router.post(
  '/:id/close',
  authorize('admin', 'platform_admin'),
  validate(noteActionValidator),
  closeDispute
);

export default router;
