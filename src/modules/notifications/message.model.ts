/**
 * Message Model
 *
 * Supports:
 * - Text, image, audio, file, and system message types
 * - Reply threading (replyToId)
 * - Emoji reactions per user
 * - Per-user read receipts
 * - File attachments with metadata
 * - In-place editing with edit history flag
 * - Soft delete (sender can retract, admin can moderate)
 * - Moderation workflow (flagged → reviewed / removed)
 */

import mongoose, { Schema } from 'mongoose';
import {
  IMessageDocument,
  MessageContentType,
  ModerationStatus,
} from './notification.types';

const attachmentSchema = new Schema(
  {
    filename:  { type: String, required: true },
    url:       { type: String, required: true },
    mimeType:  { type: String, required: true },
    sizeBytes: { type: Number, required: true },
  },
  { _id: false }
);

const reactionSchema = new Schema(
  {
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    emoji:     { type: String, required: true, maxlength: 8 },
    reactedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const readReceiptSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const messageSchema = new Schema<IMessageDocument>(
  {
    conversationId: {
      type:     Schema.Types.ObjectId,
      ref:      'Conversation',
      required: true,
      index:    true,
    },
    sender: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    contentType: {
      type:    String,
      enum:    Object.values(MessageContentType),
      default: MessageContentType.TEXT,
    },
    body:        { type: String, required: true, maxlength: 10000 },
    attachments: { type: [attachmentSchema], default: [] },
    reactions:   { type: [reactionSchema],   default: [] },
    readReceipts:{ type: [readReceiptSchema], default: [] },

    replyToId: { type: Schema.Types.ObjectId, ref: 'Message' },

    moderation:      { type: String, enum: Object.values(ModerationStatus), default: ModerationStatus.CLEAN, index: true },
    moderatedBy:     { type: Schema.Types.ObjectId, ref: 'User' },
    moderatedAt:     { type: Date },
    moderationNote:  { type: String },

    isEdited:  { type: Boolean, default: false },
    editedAt:  { type: Date },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    systemEventType: { type: String },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, isDeleted: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ moderation: 1 }, { sparse: true });

const Message = mongoose.model<IMessageDocument>('Message', messageSchema);
export default Message;
