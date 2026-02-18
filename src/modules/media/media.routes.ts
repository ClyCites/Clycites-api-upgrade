import { Router } from 'express';
import * as ctrl from './media.controller';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import {
  uploadValidator,
  fileIdValidator,
  signedUrlValidator,
  listFilesValidator,
  linkedFilesValidator,
  scanUpdateValidator,
} from './media.validator';

const router = Router();

// ── Public file serving (no auth) ─────────────────────────────────────────────
router.get('/public/:key(*)',            ctrl.servePublicFile);
router.get('/serve/:key(*)',             ctrl.serveSignedFile);

// ── All routes below require authentication ───────────────────────────────────
router.use(authenticate);

// ── Upload ────────────────────────────────────────────────────────────────────
router.post(
  '/upload',
  ctrl.upload.single('file'),
  validate(uploadValidator),
  ctrl.uploadFile
);

// ── Signed URL ────────────────────────────────────────────────────────────────
router.get('/:id/signed-url',           validate(signedUrlValidator),   ctrl.getSignedUrl);

// ── Metadata & list ───────────────────────────────────────────────────────────
router.get('/',                         validate(listFilesValidator),    ctrl.listMyFiles);
router.get('/:id',                      validate(fileIdValidator),       ctrl.getFileMetadata);
router.get('/linked/:model/:id',        validate(linkedFilesValidator),  ctrl.listLinkedFiles);

// ── Delete ────────────────────────────────────────────────────────────────────
router.delete('/:id',                   validate(fileIdValidator),       ctrl.deleteFile);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.patch(
  '/:id/scan',
  authorize('platform_admin'),
  validate(scanUpdateValidator),
  ctrl.updateScanResult
);
router.post(
  '/admin/expire',
  authorize('platform_admin'),
  ctrl.expireStaleFiles
);

export default router;
