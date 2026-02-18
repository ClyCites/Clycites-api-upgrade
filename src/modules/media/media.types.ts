/**
 * Media & File Management — TypeScript Type Definitions
 *
 * Secure upload and storage for:
 *  - Crop / pest / disease images  (AI detection pipeline)
 *  - Farmer ID documents & certificates (verification)
 *  - Marketplace product photos  (e-Market listings)
 *  - Dispute resolution evidence  (arbitration workflow)
 *  - Profile photos
 *
 * Security model:
 *  - Every file has an IAM access level (PUBLIC | PRIVATE | RESTRICTED)
 *  - Sensitive files are AES-256-GCM encrypted at rest
 *  - Every download, upload and delete produces an immutable audit entry
 *  - Signed URLs expire after a configurable TTL
 *  - Virus scan status gate before serving files
 */

import { Document, Types } from 'mongoose';

// ============================================================================
// ENUMS
// ============================================================================

export enum MediaFileType {
  CROP_IMAGE       = 'crop_image',
  PEST_IMAGE       = 'pest_image',
  DISEASE_IMAGE    = 'disease_image',
  PRODUCT_PHOTO    = 'product_photo',
  ID_DOCUMENT      = 'id_document',
  CERTIFICATE      = 'certificate',
  PROFILE_PHOTO    = 'profile_photo',
  EVIDENCE_DOCUMENT= 'evidence_document',
  MARKET_REPORT    = 'market_report',
  OTHER            = 'other',
}

export enum MediaMimeType {
  JPEG = 'image/jpeg',
  PNG  = 'image/png',
  WEBP = 'image/webp',
  PDF  = 'application/pdf',
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  CSV  = 'text/csv',
  MP4  = 'video/mp4',
}

export enum MediaAccessLevel {
  PUBLIC     = 'public',     // No auth required
  PRIVATE    = 'private',    // Owner only
  RESTRICTED = 'restricted', // Specific roles / users
}

export enum ScanStatus {
  PENDING   = 'pending',
  CLEAN     = 'clean',
  INFECTED  = 'infected',
  ERROR     = 'scan_error',
  SKIPPED   = 'skipped',     // non-executable file types fast-tracked
}

export enum MediaStatus {
  UPLOADING   = 'uploading',
  PROCESSING  = 'processing',
  ACTIVE      = 'active',
  QUARANTINED = 'quarantined',
  DELETED     = 'deleted',
  EXPIRED     = 'expired',
}

export enum StorageBackend {
  LOCAL = 'local',
  S3    = 's3',
  GCS   = 'gcs',
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface IImageVariant {
  key:    string;   // storage key for this variant
  width:  number;
  height: number;
  size:   number;   // bytes
  url:    string;   // public URL or signed URL
}

export interface IMediaEncryption {
  enabled:     boolean;
  algorithm:   string;   // 'aes-256-gcm'
  keyId:       string;   // reference to key management entry
  iv:          string;   // hex-encoded IV
  authTag:     string;   // hex-encoded GCM auth tag
}

export interface IMediaFile {
  /** Human-readable slug, preserves original filename */
  originalName:  string;
  /** Unique storage key (path relative to bucket root) */
  storageKey:    string;
  /** Storage backend in use */
  backend:       StorageBackend;
  /** MIME type */
  mimeType:      string;
  /** File size in bytes */
  size:          number;
  /** Functional category */
  fileType:      MediaFileType;
  /** IAM access level */
  accessLevel:   MediaAccessLevel;
  /** SHA-256 hex digest for integrity verification */
  checksum:      string;
  /** Antivirus scan result */
  scanStatus:    ScanStatus;
  /** When the scan was last run */
  scannedAt?:    Date;
  /** File lifecycle status */
  status:        MediaStatus;
  /** AES-256-GCM encryption metadata (sensitive files) */
  encryption?:   IMediaEncryption;
  /** Resized variants for images */
  variants?:     IImageVariant[];
  /** Owner user ID */
  uploadedBy:    Types.ObjectId;
  /** Linked entity (order, listing, farmer profile, etc.) */
  linkedTo?: {
    model: string;  // e.g. 'Order', 'Listing', 'Farmer'
    id:    Types.ObjectId;
  };
  /** Allowed viewer user IDs (RESTRICTED level only) */
  allowedViewers?: Types.ObjectId[];
  /** When the file should be auto-deleted (lifecycle policy) */
  expiresAt?:    Date;
  /** Soft-delete */
  deletedAt?:    Date;
  deletedBy?:    Types.ObjectId;
  createdAt:     Date;
  updatedAt:     Date;
}

export interface IMediaFileDocument extends IMediaFile, Document {}

// ============================================================================
// SERVICE DTOs
// ============================================================================

export interface IUploadInput {
  fileType:     MediaFileType;
  accessLevel?: MediaAccessLevel;
  linkedTo?: {
    model: string;
    id:    string;
  };
  allowedViewers?: string[];
  ttlDays?:     number;   // lifecycle days; default per fileType
  encrypt?:     boolean;  // override auto-encrypt for sensitive types
}

export interface ISignedUrlResult {
  url:       string;
  expiresAt: Date;
  fileId:    string;
}

export interface IUploadResult {
  fileId:        string;
  storageKey:    string;
  url:           string;
  mimeType:      string;
  size:          number;
  checksum:      string;
  scanStatus:    ScanStatus;
  variants?:     IImageVariant[];
}

// ============================================================================
// ALLOWED MIME TYPE MATRIX PER FILE TYPE
// ============================================================================

export const ALLOWED_MIMES: Record<MediaFileType, string[]> = {
  [MediaFileType.CROP_IMAGE]:        ['image/jpeg', 'image/png', 'image/webp'],
  [MediaFileType.PEST_IMAGE]:        ['image/jpeg', 'image/png', 'image/webp'],
  [MediaFileType.DISEASE_IMAGE]:     ['image/jpeg', 'image/png', 'image/webp'],
  [MediaFileType.PRODUCT_PHOTO]:     ['image/jpeg', 'image/png', 'image/webp'],
  [MediaFileType.ID_DOCUMENT]:       ['image/jpeg', 'image/png', 'application/pdf'],
  [MediaFileType.CERTIFICATE]:       ['image/jpeg', 'image/png', 'application/pdf'],
  [MediaFileType.PROFILE_PHOTO]:     ['image/jpeg', 'image/png', 'image/webp'],
  [MediaFileType.EVIDENCE_DOCUMENT]: ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4'],
  [MediaFileType.MARKET_REPORT]:     ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
  [MediaFileType.OTHER]:             ['image/jpeg', 'image/png', 'application/pdf'],
};

/** File types that must always be encrypted at rest */
export const ALWAYS_ENCRYPT: MediaFileType[] = [
  MediaFileType.ID_DOCUMENT,
  MediaFileType.CERTIFICATE,
];

/** Default TTL in days per file type (0 = no expiry) */
export const DEFAULT_TTL_DAYS: Record<MediaFileType, number> = {
  [MediaFileType.CROP_IMAGE]:        0,
  [MediaFileType.PEST_IMAGE]:        365,
  [MediaFileType.DISEASE_IMAGE]:     365,
  [MediaFileType.PRODUCT_PHOTO]:     0,
  [MediaFileType.ID_DOCUMENT]:       0,
  [MediaFileType.CERTIFICATE]:       0,
  [MediaFileType.PROFILE_PHOTO]:     0,
  [MediaFileType.EVIDENCE_DOCUMENT]: 1825,  // 5 years for legal compliance
  [MediaFileType.MARKET_REPORT]:     730,
  [MediaFileType.OTHER]:             365,
};

/** Max upload size in bytes per file type */
export const MAX_FILE_SIZE: Record<MediaFileType, number> = {
  [MediaFileType.CROP_IMAGE]:        10 * 1024 * 1024,   // 10 MB
  [MediaFileType.PEST_IMAGE]:        10 * 1024 * 1024,
  [MediaFileType.DISEASE_IMAGE]:     10 * 1024 * 1024,
  [MediaFileType.PRODUCT_PHOTO]:     10 * 1024 * 1024,
  [MediaFileType.ID_DOCUMENT]:       5  * 1024 * 1024,   //  5 MB
  [MediaFileType.CERTIFICATE]:       5  * 1024 * 1024,
  [MediaFileType.PROFILE_PHOTO]:     5  * 1024 * 1024,
  [MediaFileType.EVIDENCE_DOCUMENT]: 100 * 1024 * 1024,  // 100 MB (video)
  [MediaFileType.MARKET_REPORT]:     20 * 1024 * 1024,
  [MediaFileType.OTHER]:             20 * 1024 * 1024,
};
