/**
 * Media Access Audit Log
 * Immutable record of every upload, download, (attempted) delete, and
 * virus-scan update.  180-day TTL for compliance.
 */
import mongoose, { Document, Schema } from 'mongoose';

export type MediaAuditAction = 'upload' | 'download' | 'delete' | 'scan_update' | 'access_denied' | 'expire';

export interface IMediaAuditLog extends Document {
  fileId:      mongoose.Types.ObjectId;
  action:      MediaAuditAction;
  performedBy: mongoose.Types.ObjectId;
  ipAddress?:  string;
  userAgent?:  string;
  details?:    Record<string, unknown>;
  createdAt:   Date;
}

const schema = new Schema<IMediaAuditLog>(
  {
    fileId:      { type: Schema.Types.ObjectId, ref: 'MediaFile', required: true, index: true },
    action:      { type: String, enum: ['upload','download','delete','scan_update','access_denied','expire'], required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ipAddress:   String,
    userAgent:   String,
    details:     { type: Schema.Types.Mixed },
    createdAt:   { type: Date, default: Date.now, expires: 60 * 60 * 24 * 180 }, // 180 days
  },
  { timestamps: false, versionKey: false }
);

schema.index({ performedBy: 1, createdAt: -1 });

const MediaAuditLog = mongoose.model<IMediaAuditLog>('MediaAuditLog', schema);
export default MediaAuditLog;
