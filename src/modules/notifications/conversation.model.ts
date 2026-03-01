/**
 * Conversation Model
 *
 * Supports:
 * - Farmer ↔ Expert consultation threads
 * - Buyer ↔ Seller negotiation threads
 * - Platform support threads
 * - Organisation group threads
 * - Context linking (order, listing, consultation, alert)
 * - Unread counts per participant
 * - Moderation locking
 * - Soft delete
 */

import mongoose, { Schema } from 'mongoose';
import {
  IConversationDocument,
  ConversationType,
  NegotiationStatus,
} from './notification.types';

const participantSchema = new Schema(
  {
    userId:             { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role:               { type: String },
    joinedAt:           { type: Date, default: Date.now },
    leftAt:             { type: Date },
    isActive:           { type: Boolean, default: true },
    lastReadAt:         { type: Date },
    lastReadMessageId:  { type: Schema.Types.ObjectId, ref: 'Message' },
  },
  { _id: false }
);

const conversationSchema = new Schema<IConversationDocument>(
  {
    type: {
      type:     String,
      enum:     Object.values(ConversationType),
      required: true,
      index:    true,
    },
    title:          { type: String, trim: true },
    participants:   { type: [participantSchema], default: [] },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },

    contextType: {
      type: String,
      enum: ['order', 'listing', 'consultation', 'weather_alert', 'pest_alert'],
    },
    contextId: { type: Schema.Types.ObjectId, index: true },

    lastMessage:   { type: Schema.Types.ObjectId, ref: 'Message' },
    lastMessageAt: { type: Date, index: true },
    messageCount:  { type: Number, default: 0 },
    unreadCounts:  { type: Schema.Types.Mixed, default: {} },   // { userId: count }

    // Moderation
    isLocked:     { type: Boolean, default: false },
    lockedReason: { type: String },
    lockedBy:     { type: Schema.Types.ObjectId, ref: 'User' },
    lockedAt:     { type: Date },

    isArchived:  { type: Boolean, default: false },
    archivedAt:  { type: Date },
    archivedBy:  { type: Schema.Types.ObjectId, ref: 'User' },

    negotiationStatus: {
      type: String,
      enum: Object.values(NegotiationStatus),
      default: undefined,
      index: true,
    },

    deletedAt: { type: Date },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
conversationSchema.index({ 'participants.userId': 1, lastMessageAt: -1 });
conversationSchema.index({ contextType: 1, contextId: 1 });
conversationSchema.index({ type: 1, organizationId: 1 });
conversationSchema.index({ deletedAt: 1 }, { sparse: true });

const Conversation = mongoose.model<IConversationDocument>('Conversation', conversationSchema);
export default Conversation;
