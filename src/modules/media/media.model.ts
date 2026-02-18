import mongoose, { Schema } from 'mongoose';
import {
  IMediaFileDocument,
  MediaFileType,
  MediaAccessLevel,
  ScanStatus,
  MediaStatus,
  StorageBackend,
} from './media.types';

const imageVariantSchema = new Schema(
  {
    key:    { type: String, required: true },
    width:  { type: Number, required: true },
    height: { type: Number, required: true },
    size:   { type: Number, required: true },
    url:    { type: String, required: true },
  },
  { _id: false }
);

const encryptionSchema = new Schema(
  {
    enabled:   { type: Boolean, default: false },
    algorithm: { type: String, default: 'aes-256-gcm' },
    keyId:     { type: String },
    iv:        { type: String },
    authTag:   { type: String },
  },
  { _id: false }
);

const mediaFileSchema = new Schema<IMediaFileDocument>(
  {
    originalName: { type: String, required: true, trim: true },
    storageKey:   { type: String, required: true, unique: true },
    backend:      { type: String, enum: Object.values(StorageBackend), default: StorageBackend.LOCAL },
    mimeType:     { type: String, required: true },
    size:         { type: Number, required: true, min: 0 },
    fileType:     { type: String, enum: Object.values(MediaFileType), required: true, index: true },
    accessLevel:  { type: String, enum: Object.values(MediaAccessLevel), default: MediaAccessLevel.PRIVATE, index: true },
    checksum:     { type: String, required: true },

    scanStatus: {
      type:    String,
      enum:    Object.values(ScanStatus),
      default: ScanStatus.PENDING,
      index:   true,
    },
    scannedAt: Date,

    status: {
      type:    String,
      enum:    Object.values(MediaStatus),
      default: MediaStatus.UPLOADING,
      index:   true,
    },

    encryption: { type: encryptionSchema },
    variants:   { type: [imageVariantSchema], default: [] },

    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    linkedTo: {
      model: { type: String },
      id:    { type: Schema.Types.ObjectId },
    },

    allowedViewers: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    expiresAt: { type: Date, index: true },   // TTL lifecycle
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
mediaFileSchema.index({ uploadedBy: 1, fileType: 1 });
mediaFileSchema.index({ 'linkedTo.model': 1, 'linkedTo.id': 1 });
mediaFileSchema.index({ status: 1, scanStatus: 1 });
mediaFileSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $exists: true } } });

const MediaFile = mongoose.model<IMediaFileDocument>('MediaFile', mediaFileSchema);
export default MediaFile;
