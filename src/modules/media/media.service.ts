/**
 * Media Service
 *
 * Orchestrates the full file lifecycle:
 *  1. Validate MIME type and size against per-type policy
 *  2. Virus scan (async gate)
 *  3. AES-256-GCM encrypt sensitive types
 *  4. Generate image variants (sharp) for image files
 *  5. Persist to storage backend
 *  6. Record immutable audit log entry
 *  7. Issue time-limited signed URLs for retrieval
 *
 * Access model:
 *  PUBLIC     → public URL, no auth
 *  PRIVATE    → signed URL, owner only
 *  RESTRICTED → signed URL, allowedViewers only
 */

import path from 'path';
import mongoose from 'mongoose';
import sharp from 'sharp';
import MediaFile from './media.model';
import MediaAuditLog from './mediaAudit.model';
import {
  IMediaFileDocument,
  IUploadInput,
  IUploadResult,
  ISignedUrlResult,
  MediaFileType,
  MediaAccessLevel,
  MediaStatus,
  ScanStatus,
  StorageBackend,
  ALLOWED_MIMES,
  ALWAYS_ENCRYPT,
  DEFAULT_TTL_DAYS,
  MAX_FILE_SIZE,
} from './media.types';
import {
  storageProvider,
  encryptBuffer,
  decryptBuffer,
  sha256Hex,
  buildStorageKey,
  scanBuffer,
  verifySignedUrl,
} from './storage.service';
import { AppError, ForbiddenError, NotFoundError } from '../../common/errors/AppError';
import { PaginationUtil } from '../../common/utils/pagination';
import logger from '../../common/utils/logger';

// ── Image variant config ──────────────────────────────────────────────────────
const IMAGE_VARIANTS = [
  { name: 'thumb',  width: 150,  height: 150  },
  { name: 'medium', width: 600,  height: 600  },
  { name: 'large',  width: 1200, height: 1200 },
];
const IMAGE_TYPES = new Set([
  MediaFileType.CROP_IMAGE, MediaFileType.PEST_IMAGE,
  MediaFileType.DISEASE_IMAGE, MediaFileType.PRODUCT_PHOTO,
  MediaFileType.PROFILE_PHOTO,
]);

// ── Default signed URL TTL (seconds) ─────────────────────────────────────────
const SIGNED_URL_TTL: Record<MediaAccessLevel, number> = {
  [MediaAccessLevel.PUBLIC]:     0,        // permanent public URL
  [MediaAccessLevel.PRIVATE]:    3600,     // 1 hour
  [MediaAccessLevel.RESTRICTED]: 1800,     // 30 minutes
};

// ============================================================================
// MediaService
// ============================================================================

class MediaService {

  // ── Upload ─────────────────────────────────────────────────────────────────

  async upload(
    file: Express.Multer.File,
    input: IUploadInput,
    userId: string,
    req?: { ip?: string; headers?: Record<string, string | string[] | undefined> }
  ): Promise<IUploadResult> {
    const { fileType, accessLevel = MediaAccessLevel.PRIVATE } = input;

    // 1. Validate MIME
    const allowed = ALLOWED_MIMES[fileType] ?? [];
    if (!allowed.includes(file.mimetype)) {
      throw new AppError(
        `File type ${file.mimetype} is not allowed for ${fileType}. Allowed: ${allowed.join(', ')}`,
        415
      );
    }

    // 2. Validate size
    const maxSize = MAX_FILE_SIZE[fileType];
    if (file.size > maxSize) {
      throw new AppError(
        `File too large: ${file.size} bytes. Max for ${fileType}: ${maxSize} bytes`,
        413
      );
    }

    // 3. Virus scan
    const scanResult = await scanBuffer(file.buffer, file.mimetype);
    if (scanResult === ScanStatus.INFECTED) {
      throw new AppError('File failed virus scan and was rejected', 422);
    }

    // 4. Compute checksum of the raw buffer
    const checksum = sha256Hex(file.buffer);

    // 5. Possibly encrypt
    const shouldEncrypt = input.encrypt ?? ALWAYS_ENCRYPT.includes(fileType);
    let storedBuffer = file.buffer;
    let encryptionMeta: IMediaFileDocument['encryption'];
    if (shouldEncrypt) {
      const { ciphertext, iv, authTag, keyId } = encryptBuffer(file.buffer);
      storedBuffer  = ciphertext;
      encryptionMeta = { enabled: true, algorithm: 'aes-256-gcm', keyId, iv, authTag };
    }

    // 6. Build storage key
    const ext = path.extname(file.originalname).replace('.', '') || 'bin';
    const key = buildStorageKey(fileType, ext);

    // 7. Persist primary file
    await storageProvider.put(key, storedBuffer, file.mimetype);

    // 8. Generate image variants (unencrypted originals → sharp)
    const variants: IMediaFileDocument['variants'] = [];
    if (IMAGE_TYPES.has(fileType) && file.mimetype.startsWith('image/')) {
      for (const v of IMAGE_VARIANTS) {
        const variantBuf = await sharp(file.buffer) // always use original for processing
          .resize(v.width, v.height, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        const variantKey = key.replace(/\.[^.]+$/, `_${v.name}.webp`);
        await storageProvider.put(variantKey, variantBuf, 'image/webp');
        const variantUrl  = await storageProvider.signedUrl(variantKey, SIGNED_URL_TTL[accessLevel] || 86400);
        variants.push({
          key:    variantKey,
          width:  v.width,
          height: v.height,
          size:   variantBuf.length,
          url:    variantUrl,
        });
      }
    }

    // 9. Compute TTL
    const ttlDays = input.ttlDays ?? DEFAULT_TTL_DAYS[fileType];
    const expiresAt = ttlDays > 0
      ? new Date(Date.now() + ttlDays * 86400_000)
      : undefined;

    // 10. Persist metadata document
    const doc = await MediaFile.create({
      originalName:    file.originalname,
      storageKey:      key,
      backend:         StorageBackend.LOCAL,
      mimeType:        file.mimetype,
      size:            file.size,
      fileType,
      accessLevel,
      checksum,
      scanStatus:      scanResult,
      scannedAt:       new Date(),
      status:          MediaStatus.ACTIVE,
      encryption:      encryptionMeta,
      variants,
      uploadedBy:      new mongoose.Types.ObjectId(userId),
      linkedTo:        input.linkedTo
        ? { model: input.linkedTo.model, id: new mongoose.Types.ObjectId(input.linkedTo.id) }
        : undefined,
      allowedViewers:  input.allowedViewers?.map(id => new mongoose.Types.ObjectId(id)),
      expiresAt,
    });

    // 11. Audit
    await this.audit(doc._id as mongoose.Types.ObjectId, 'upload', userId, req);

    // 12. Generate serving URL
    const url = accessLevel === MediaAccessLevel.PUBLIC
      ? storageProvider.publicUrl(key)
      : await storageProvider.signedUrl(key, SIGNED_URL_TTL[accessLevel]);

    return {
      fileId:     (doc._id as mongoose.Types.ObjectId).toString(),
      storageKey: key,
      url,
      mimeType:   file.mimetype,
      size:       file.size,
      checksum,
      scanStatus: scanResult,
      variants,
    };
  }

  // ── Retrieve / serve ───────────────────────────────────────────────────────

  async getSignedUrl(
    fileId: string,
    userId: string,
    ttlSeconds?: number
  ): Promise<ISignedUrlResult> {
    const doc = await this.findAndCheck(fileId, userId, 'download');
    const ttl = ttlSeconds ?? SIGNED_URL_TTL[doc.accessLevel];
    const url  = await storageProvider.signedUrl(doc.storageKey, ttl);
    await this.audit(doc._id as mongoose.Types.ObjectId, 'download', userId);
    return {
      fileId:    fileId,
      url,
      expiresAt: new Date(Date.now() + ttl * 1000),
    };
  }

  /** Serve raw bytes after verifying signed URL token */
  async serveFile(
    key: string,
    token: string,
    expires: number
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    if (!verifySignedUrl(key, token, expires)) {
      throw new AppError('Signed URL is invalid or has expired', 403);
    }

    const doc = await MediaFile.findOne({ storageKey: key });
    if (!doc || doc.status === MediaStatus.DELETED) throw new NotFoundError('File not found');
    if (doc.scanStatus === ScanStatus.INFECTED) throw new AppError('File is quarantined', 451);

    let buffer = await storageProvider.get(key);

    // Decrypt if needed
    if (doc.encryption?.enabled && doc.encryption.iv && doc.encryption.authTag) {
      buffer = decryptBuffer(buffer, doc.encryption.iv, doc.encryption.authTag);
    }

    return { buffer, mimeType: doc.mimeType };
  }

  /** Serve public file (PUBLIC access level, no auth) */
  async servePublicFile(key: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const doc = await MediaFile.findOne({ storageKey: key });
    if (!doc || doc.accessLevel !== MediaAccessLevel.PUBLIC) {
      throw new ForbiddenError('File is not publicly accessible');
    }
    if (doc.status === MediaStatus.DELETED) throw new NotFoundError('File not found');
    const buffer = await storageProvider.get(key);
    return { buffer, mimeType: doc.mimeType };
  }

  // ── List / metadata ────────────────────────────────────────────────────────

  async getFileMetadata(fileId: string, userId: string): Promise<IMediaFileDocument> {
    return this.findAndCheck(fileId, userId, 'download');
  }

  async listMyFiles(userId: string, query: Record<string, unknown>) {
    const { page, limit } = PaginationUtil.getPaginationParams(query);
    const skip = PaginationUtil.getSkip(page, limit);

    const filter: Record<string, unknown> = {
      uploadedBy: new mongoose.Types.ObjectId(userId),
      status:     { $ne: MediaStatus.DELETED },
    };
    if (query.fileType) filter.fileType = query.fileType;
    if (query.accessLevel) filter.accessLevel = query.accessLevel;

    const [data, total] = await Promise.all([
      MediaFile.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      MediaFile.countDocuments(filter),
    ]);
    return PaginationUtil.buildPaginationResult(data, total, page, limit);
  }

  async listLinkedFiles(model: string, id: string, userId: string, userRole: string) {
    const filter: Record<string, unknown> = {
      'linkedTo.model': model,
      'linkedTo.id':    new mongoose.Types.ObjectId(id),
      status:           { $ne: MediaStatus.DELETED },
    };

    // Non-admin callers can only see PUBLIC files or their own
    if (userRole !== 'platform_admin') {
      filter.$or = [
        { accessLevel: MediaAccessLevel.PUBLIC },
        { uploadedBy:  new mongoose.Types.ObjectId(userId) },
        { allowedViewers: new mongoose.Types.ObjectId(userId) },
      ];
    }

    return MediaFile.find(filter).sort({ createdAt: -1 }).lean();
  }

  // ── Delete (soft) ──────────────────────────────────────────────────────────

  async deleteFile(fileId: string, userId: string, userRole: string): Promise<void> {
    const doc = await MediaFile.findById(new mongoose.Types.ObjectId(fileId));
    if (!doc) throw new NotFoundError('File not found');

    const isOwner = doc.uploadedBy.toString() === userId;
    const isAdmin = userRole === 'platform_admin';
    if (!isOwner && !isAdmin) throw new ForbiddenError('Not authorised to delete this file');

    doc.status    = MediaStatus.DELETED;
    doc.deletedAt = new Date();
    doc.deletedBy = new mongoose.Types.ObjectId(userId);
    await doc.save();

    // Physical delete from storage (background, non-blocking)
    storageProvider.delete(doc.storageKey).catch(err =>
      logger.warn(`[MediaService] Physical delete failed for ${doc.storageKey}: ${err}`)
    );
    for (const v of doc.variants ?? []) {
      storageProvider.delete(v.key).catch(() => undefined);
    }

    await this.audit(doc._id as mongoose.Types.ObjectId, 'delete', userId);
  }

  // ── Admin: scan update ─────────────────────────────────────────────────────

  async updateScanResult(fileId: string, status: ScanStatus, adminId: string): Promise<void> {
    const doc = await MediaFile.findById(new mongoose.Types.ObjectId(fileId));
    if (!doc) throw new NotFoundError('File not found');

    doc.scanStatus = status;
    doc.scannedAt  = new Date();
    if (status === ScanStatus.INFECTED) {
      doc.status = MediaStatus.QUARANTINED;
    } else if (status === ScanStatus.CLEAN && doc.status === MediaStatus.QUARANTINED) {
      doc.status = MediaStatus.ACTIVE;
    }
    await doc.save();
    await this.audit(doc._id as mongoose.Types.ObjectId, 'scan_update', adminId, undefined, { status });
  }

  // ── Lifecycle: expire stale files ─────────────────────────────────────────

  async expireStaleFiles(): Promise<number> {
    const now    = new Date();
    const result = await MediaFile.updateMany(
      { expiresAt: { $lt: now }, status: MediaStatus.ACTIVE },
      { $set: { status: MediaStatus.EXPIRED } }
    );
    return result.modifiedCount;
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  private async findAndCheck(
    fileId: string,
    userId: string,
    _action: 'download'
  ): Promise<IMediaFileDocument> {
    const doc = await MediaFile.findOne({
      _id:    new mongoose.Types.ObjectId(fileId),
      status: { $nin: [MediaStatus.DELETED, MediaStatus.QUARANTINED] },
    });
    if (!doc) throw new NotFoundError('File not found');

    const allowed = this.canAccess(doc, userId);
    if (!allowed) {
      await this.audit(doc._id as mongoose.Types.ObjectId, 'access_denied', userId);
      throw new ForbiddenError('You do not have access to this file');
    }
    return doc;
  }

  private canAccess(doc: IMediaFileDocument, userId: string): boolean {
    if (doc.accessLevel === MediaAccessLevel.PUBLIC) return true;
    if (doc.uploadedBy.toString() === userId) return true;
    if (doc.accessLevel === MediaAccessLevel.RESTRICTED) {
      return (doc.allowedViewers ?? []).some(v => v.toString() === userId);
    }
    return false;
  }

  private async audit(
    fileId: mongoose.Types.ObjectId,
    action: 'upload' | 'download' | 'delete' | 'scan_update' | 'access_denied' | 'expire',
    userId: string,
    req?: { ip?: string; headers?: Record<string, string | string[] | undefined> },
    details?: Record<string, unknown>
  ): Promise<void> {
    try {
      await MediaAuditLog.create({
        fileId,
        action,
        performedBy: new mongoose.Types.ObjectId(userId),
        ipAddress:   req?.ip,
        userAgent:   typeof req?.headers?.['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
        details,
      });
    } catch (err) {
      logger.warn(`[MediaService] Audit write failed: ${err}`);
    }
  }
}

export const mediaService = new MediaService();
export default mediaService;
