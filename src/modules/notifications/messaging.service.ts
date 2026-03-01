/**
 * Messaging Service
 *
 * Thread-based asynchronous messaging between platform actors:
 *
 *  Farmer ↔ Expert consultation threads
 *  Buyer  ↔ Seller negotiation threads
 *  Support / group threads
 *
 * Key features:
 *  - Conversation CRUD with participant management
 *  - Message send, edit, delete (soft), and reactions
 *  - Per-user read receipts and unread counts
 *  - Moderation: flag, remove, and review messages
 *  - Automatic new-message notification dispatch
 *  - System message injection (context events)
 *  - Pagination for both conversation list and message history
 *  - Permission checks: only participants can read/write
 *  - Conversation locking by moderators
 */

import mongoose from 'mongoose';
import Conversation from './conversation.model';
import Message from './message.model';
import {
  IConversationDocument,
  IMessageDocument,
  ConversationType,
  MessageContentType,
  ModerationStatus,
  NegotiationStatus,
  ICreateConversationInput,
  ISendMessageInput,
} from './notification.types';
import { AppError, NotFoundError, ForbiddenError } from '../../common/errors/AppError';
import { PaginationUtil } from '../../common/utils/pagination';
import logger from '../../common/utils/logger';

// ============================================================================
// Messaging Service
// ============================================================================

class MessagingService {
  private resolveNegotiationStatus(conversation: {
    type?: string;
    negotiationStatus?: string;
    isArchived?: boolean;
    isLocked?: boolean;
  }): NegotiationStatus | undefined {
    if (conversation.type !== ConversationType.BUYER_SELLER) {
      return undefined;
    }

    if (conversation.negotiationStatus) {
      return conversation.negotiationStatus as NegotiationStatus;
    }

    if (conversation.isArchived) {
      return NegotiationStatus.CLOSED;
    }

    if (conversation.isLocked) {
      return NegotiationStatus.STALLED;
    }

    return NegotiationStatus.OPEN;
  }

  private withNegotiationUiStatus<T extends Record<string, unknown>>(conversation: T): T & {
    negotiationStatus?: NegotiationStatus;
    uiStatus?: NegotiationStatus;
  } {
    const resolvedStatus = this.resolveNegotiationStatus(conversation as {
      type?: string;
      negotiationStatus?: string;
      isArchived?: boolean;
      isLocked?: boolean;
    });

    if (!resolvedStatus) {
      return conversation;
    }

    return {
      ...conversation,
      negotiationStatus: resolvedStatus,
      uiStatus: resolvedStatus,
    };
  }

  // ── Conversations ─────────────────────────────────────────────────────────

  async createConversation(input: ICreateConversationInput, createdByUserId: string): Promise<IConversationDocument> {
    const participantIds = [...new Set([createdByUserId, ...input.participantIds])];

    // Deduplicate: for buyer-seller / farmer-expert, reuse existing open thread
    if (
      input.type !== ConversationType.GROUP &&
      input.contextType &&
      input.contextId
    ) {
      const existing = await Conversation.findOne({
        type:       input.type,
        contextType: input.contextType,
        contextId:  new mongoose.Types.ObjectId(input.contextId),
        deletedAt:  { $exists: false },
      });
      if (existing) return existing;
    }

    const participants = participantIds.map(uid => ({
      userId:   new mongoose.Types.ObjectId(uid),
      joinedAt: new Date(),
      isActive: true,
    }));

    const conv = await Conversation.create({
      type:           input.type,
      title:          input.title,
      participants,
      organizationId: input.organizationId ? new mongoose.Types.ObjectId(input.organizationId) : undefined,
      contextType:    input.contextType,
      contextId:      input.contextId ? new mongoose.Types.ObjectId(input.contextId) : undefined,
      messageCount:   0,
      unreadCounts:   {},
      isLocked:       false,
      isArchived:     false,
      negotiationStatus: input.type === ConversationType.BUYER_SELLER
        ? input.negotiationStatus || NegotiationStatus.OPEN
        : undefined,
    });

    return conv;
  }

  async getConversation(conversationId: string, userId: string): Promise<IConversationDocument> {
    const conv = await Conversation.findOne({
      _id:      new mongoose.Types.ObjectId(conversationId),
      deletedAt: { $exists: false },
    });
    if (!conv) throw new NotFoundError('Conversation not found');

    if (!this.isParticipant(conv, userId)) {
      throw new ForbiddenError('You are not a participant of this conversation');
    }
    if (conv.type === ConversationType.BUYER_SELLER && !conv.negotiationStatus) {
      conv.negotiationStatus = this.resolveNegotiationStatus(conv) as NegotiationStatus;
    }

    return conv;
  }

  async getMyConversations(userId: string, query: Record<string, unknown>) {
    const { page, limit } = PaginationUtil.getPaginationParams(query);
    const skip = PaginationUtil.getSkip(page, limit);

    const filter: Record<string, unknown> = {
      'participants.userId': new mongoose.Types.ObjectId(userId),
      'participants.isActive': true,
      deletedAt: { $exists: false },
      isArchived: false,
    };
    if (query.type) filter.type = query.type;

    const [data, total] = await Promise.all([
      Conversation.find(filter)
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('lastMessage', 'body contentType createdAt sender')
        .lean(),
      Conversation.countDocuments(filter),
    ]);
    const mapped = data.map((conversation) => this.withNegotiationUiStatus(conversation));
    return PaginationUtil.buildPaginationResult(mapped, total, page, limit);
  }

  async archiveConversation(conversationId: string, userId: string): Promise<IConversationDocument> {
    const conv = await this.getConversation(conversationId, userId);
    conv.isArchived = true;
    conv.archivedAt = new Date();
    conv.archivedBy = new mongoose.Types.ObjectId(userId);
    if (conv.type === ConversationType.BUYER_SELLER) {
      conv.negotiationStatus = NegotiationStatus.CLOSED;
    }
    await conv.save();
    return conv;
  }

  async lockConversation(conversationId: string, moderatorId: string, reason?: string): Promise<IConversationDocument> {
    const conv = await Conversation.findById(new mongoose.Types.ObjectId(conversationId));
    if (!conv) throw new NotFoundError('Conversation not found');
    conv.isLocked     = true;
    conv.lockedReason = reason;
    conv.lockedBy     = new mongoose.Types.ObjectId(moderatorId);
    conv.lockedAt     = new Date();
    if (conv.type === ConversationType.BUYER_SELLER && conv.negotiationStatus !== NegotiationStatus.CLOSED) {
      conv.negotiationStatus = NegotiationStatus.STALLED;
    }
    await conv.save();
    return conv;
  }

  async unlockConversation(conversationId: string, _moderatorId: string): Promise<IConversationDocument> {
    const conv = await Conversation.findById(new mongoose.Types.ObjectId(conversationId));
    if (!conv) throw new NotFoundError('Conversation not found');
    conv.isLocked = false;
    conv.lockedBy = undefined;
    conv.lockedAt = undefined;
    conv.lockedReason = undefined;
    if (conv.type === ConversationType.BUYER_SELLER && conv.negotiationStatus === NegotiationStatus.STALLED) {
      conv.negotiationStatus = NegotiationStatus.OPEN;
    }
    await conv.save();
    return conv;
  }

  async updateNegotiationStatus(
    conversationId: string,
    userId: string,
    status: NegotiationStatus
  ): Promise<IConversationDocument> {
    const conv = await this.getConversation(conversationId, userId);
    if (conv.type !== ConversationType.BUYER_SELLER) {
      throw new AppError('Negotiation status is only supported for buyer_seller conversations', 400);
    }

    const currentStatus = this.resolveNegotiationStatus(conv) as NegotiationStatus;
    const transitions: Record<NegotiationStatus, NegotiationStatus[]> = {
      [NegotiationStatus.OPEN]: [NegotiationStatus.OPEN, NegotiationStatus.AGREED, NegotiationStatus.STALLED, NegotiationStatus.CLOSED],
      [NegotiationStatus.STALLED]: [NegotiationStatus.STALLED, NegotiationStatus.OPEN, NegotiationStatus.AGREED, NegotiationStatus.CLOSED],
      [NegotiationStatus.AGREED]: [NegotiationStatus.AGREED, NegotiationStatus.CLOSED],
      [NegotiationStatus.CLOSED]: [NegotiationStatus.CLOSED],
    };

    if (!transitions[currentStatus].includes(status)) {
      throw new AppError(`Invalid negotiation transition: ${currentStatus} -> ${status}`, 400);
    }

    conv.negotiationStatus = status;

    if (status === NegotiationStatus.CLOSED) {
      conv.isArchived = true;
      conv.archivedAt = conv.archivedAt || new Date();
      conv.archivedBy = conv.archivedBy || new mongoose.Types.ObjectId(userId);
      conv.isLocked = false;
      conv.lockedAt = undefined;
      conv.lockedBy = undefined;
      conv.lockedReason = undefined;
    } else {
      conv.isArchived = false;
      conv.archivedAt = undefined;
      conv.archivedBy = undefined;
      if (status === NegotiationStatus.STALLED) {
        conv.isLocked = true;
        conv.lockedAt = conv.lockedAt || new Date();
      } else {
        conv.isLocked = false;
        conv.lockedAt = undefined;
        conv.lockedBy = undefined;
        conv.lockedReason = undefined;
      }
    }

    await conv.save();
    return conv;
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  async sendMessage(input: ISendMessageInput): Promise<IMessageDocument> {
    const conv = await this.getConversation(input.conversationId, input.senderId);

    if (conv.isLocked) {
      throw new AppError('This conversation is locked', 403);
    }

    const message = await Message.create({
      conversationId: new mongoose.Types.ObjectId(input.conversationId),
      sender:         new mongoose.Types.ObjectId(input.senderId),
      contentType:    input.contentType ?? MessageContentType.TEXT,
      body:           input.body,
      attachments:    input.attachments ?? [],
      reactions:      [],
      readReceipts:   [],
      replyToId:      input.replyToId ? new mongoose.Types.ObjectId(input.replyToId) : undefined,
      moderation:     ModerationStatus.CLEAN,
      isEdited:       false,
      isDeleted:      false,
    });

    // Update conversation summary + unread counts for other participants
    const unreadUpdates: Record<string, number> = { ...(conv.unreadCounts as Record<string, number> ?? {}) };
    for (const p of conv.participants) {
      if (p.userId.toString() !== input.senderId && p.isActive) {
        const uid = p.userId.toString();
        unreadUpdates[uid] = (unreadUpdates[uid] ?? 0) + 1;
      }
    }

    await Conversation.findByIdAndUpdate(conv._id, {
      $set: {
        lastMessage:   message._id,
        lastMessageAt: message.createdAt,
        unreadCounts:  unreadUpdates,
      },
      $inc: { messageCount: 1 },
    });

    // Dispatch new-message notifications to other active participants
    this.notifyParticipants(conv, input.senderId, message).catch(err =>
      logger.warn(`[MessagingService] Notification dispatch error: ${err}`)
    );

    return message;
  }

  async getMessages(conversationId: string, userId: string, query: Record<string, unknown>) {
    await this.getConversation(conversationId, userId); // access check

    const { page, limit } = PaginationUtil.getPaginationParams(query);
    const skip = PaginationUtil.getSkip(page, limit);

    const filter: Record<string, unknown> = {
      conversationId: new mongoose.Types.ObjectId(conversationId),
      isDeleted:      false,
    };

    const [data, total] = await Promise.all([
      Message.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'firstName lastName profileImage')
        .populate('replyToId', 'body sender contentType')
        .lean(),
      Message.countDocuments(filter),
    ]);
    return PaginationUtil.buildPaginationResult(data, total, page, limit);
  }

  async getMessage(messageId: string, userId: string): Promise<IMessageDocument> {
    const msg = await Message.findOne({
      _id:       new mongoose.Types.ObjectId(messageId),
      isDeleted: false,
    });
    if (!msg) throw new NotFoundError('Message not found');

    // Verify user is a participant of the conversation
    await this.getConversation(msg.conversationId.toString(), userId);
    return msg;
  }

  async editMessage(messageId: string, userId: string, newBody: string): Promise<IMessageDocument> {
    const msg = await Message.findOne({
      _id:       new mongoose.Types.ObjectId(messageId),
      isDeleted: false,
    });
    if (!msg) throw new NotFoundError('Message not found');
    if (msg.sender.toString() !== userId) throw new ForbiddenError('Cannot edit another user\'s message');

    msg.body     = newBody;
    msg.isEdited = true;
    msg.editedAt = new Date();
    await msg.save();
    return msg;
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const msg = await Message.findOne({
      _id:       new mongoose.Types.ObjectId(messageId),
      isDeleted: false,
    });
    if (!msg) throw new NotFoundError('Message not found');
    if (msg.sender.toString() !== userId) throw new ForbiddenError('Cannot delete another user\'s message');

    msg.isDeleted = true;
    msg.deletedAt = new Date();
    msg.deletedBy = new mongoose.Types.ObjectId(userId);
    msg.body      = '[Message deleted]';
    await msg.save();
  }

  // ── Read Receipts & Unread ────────────────────────────────────────────────

  async markConversationRead(conversationId: string, userId: string): Promise<void> {
    const conv = await this.getConversation(conversationId, userId);

    // Add read receipts to all unread messages
    const unread = await Message.find({
      conversationId: conv._id,
      isDeleted:      false,
      'readReceipts.userId': { $ne: new mongoose.Types.ObjectId(userId) },
    }).select('_id').lean();

    if (unread.length > 0) {
      await Message.updateMany(
        { _id: { $in: unread.map(m => m._id) } },
        { $push: { readReceipts: { userId: new mongoose.Types.ObjectId(userId), readAt: new Date() } } }
      );
    }

    // Reset unread count for this user
    await Conversation.findByIdAndUpdate(conv._id, {
      $set: {
        [`unreadCounts.${userId}`]: 0,
        'participants.$[elem].lastReadAt': new Date(),
        'participants.$[elem].lastReadMessageId': conv.lastMessage,
      },
    }, {
      arrayFilters: [{ 'elem.userId': new mongoose.Types.ObjectId(userId) }],
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    const convs = await Conversation.find({
      'participants.userId': new mongoose.Types.ObjectId(userId),
      'participants.isActive': true,
      deletedAt: { $exists: false },
    }).select('unreadCounts').lean();

    return convs.reduce((sum, c) => {
      const counts = c.unreadCounts as Record<string, number>;
      return sum + (counts?.[userId] ?? 0);
    }, 0);
  }

  // ── Reactions ─────────────────────────────────────────────────────────────

  async reactToMessage(messageId: string, userId: string, emoji: string): Promise<IMessageDocument> {
    const msg = await Message.findOne({ _id: new mongoose.Types.ObjectId(messageId), isDeleted: false });
    if (!msg) throw new NotFoundError('Message not found');

    // Toggle: remove if already reacted with same emoji, add otherwise
    const existing = msg.reactions.find(r => r.userId.toString() === userId && r.emoji === emoji);
    if (existing) {
      msg.reactions = msg.reactions.filter(r => !(r.userId.toString() === userId && r.emoji === emoji));
    } else {
      msg.reactions.push({ userId: new mongoose.Types.ObjectId(userId), emoji, reactedAt: new Date() });
    }
    await msg.save();
    return msg;
  }

  // ── Moderation ────────────────────────────────────────────────────────────

  async flagMessage(messageId: string, moderatorId: string, note?: string): Promise<IMessageDocument> {
    const msg = await Message.findByIdAndUpdate(
      new mongoose.Types.ObjectId(messageId),
      { $set: { moderation: ModerationStatus.FLAGGED, moderatedBy: new mongoose.Types.ObjectId(moderatorId), moderatedAt: new Date(), moderationNote: note } },
      { new: true }
    );
    if (!msg) throw new NotFoundError('Message not found');
    return msg;
  }

  async removeMessage(messageId: string, moderatorId: string, note?: string): Promise<IMessageDocument> {
    const msg = await Message.findByIdAndUpdate(
      new mongoose.Types.ObjectId(messageId),
      { $set: {
        moderation:     ModerationStatus.REMOVED,
        moderatedBy:    new mongoose.Types.ObjectId(moderatorId),
        moderatedAt:    new Date(),
        moderationNote: note,
        isDeleted:      true,
        deletedAt:      new Date(),
        deletedBy:      new mongoose.Types.ObjectId(moderatorId),
        body:           '[Removed by moderator]',
      }},
      { new: true }
    );
    if (!msg) throw new NotFoundError('Message not found');
    return msg;
  }

  async getFlaggedMessages(query: Record<string, unknown>) {
    const { page, limit } = PaginationUtil.getPaginationParams(query);
    const skip = PaginationUtil.getSkip(page, limit);

    const [data, total] = await Promise.all([
      Message.find({ moderation: ModerationStatus.FLAGGED, isDeleted: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'firstName lastName email')
        .lean(),
      Message.countDocuments({ moderation: ModerationStatus.FLAGGED, isDeleted: false }),
    ]);
    return PaginationUtil.buildPaginationResult(data, total, page, limit);
  }

  // ── System messages ────────────────────────────────────────────────────────

  /** Inject a system-generated event message into a conversation */
  async systemMessage(
    conversationId: string,
    systemUserId: string,
    eventType: string,
    body: string
  ): Promise<IMessageDocument> {
    return Message.create({
      conversationId:  new mongoose.Types.ObjectId(conversationId),
      sender:          new mongoose.Types.ObjectId(systemUserId),
      contentType:     MessageContentType.SYSTEM,
      body,
      attachments:     [],
      reactions:       [],
      readReceipts:    [],
      moderation:      ModerationStatus.CLEAN,
      isEdited:        false,
      isDeleted:       false,
      systemEventType: eventType,
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private isParticipant(conv: IConversationDocument, userId: string): boolean {
    return conv.participants.some(p => p.userId.toString() === userId && p.isActive);
  }

  private async notifyParticipants(
    conv: IConversationDocument,
    senderId: string,
    message: IMessageDocument
  ): Promise<void> {
    // Lazy-require to avoid circular dependency
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const svc = require('./notification.service').default as {
      notifyNewMessage: (p: {
        recipientId: string; senderName: string; preview: string; conversationId: string;
      }) => Promise<void>;
    };

    // Get sender name from User model lazily
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const User = require('../users/user.model').default;
    const sender = await User.findById(message.sender).select('firstName lastName').lean() as { firstName?: string; lastName?: string } | null;
    const senderName = sender ? `${sender.firstName ?? ''} ${sender.lastName ?? ''}`.trim() : 'Someone';

    for (const p of conv.participants) {
      if (p.userId.toString() === senderId || !p.isActive) continue;
      await svc.notifyNewMessage({
        recipientId:    p.userId.toString(),
        senderName,
        preview:        message.body.slice(0, 120),
        conversationId: conv._id!.toString(),
      }).catch(err => logger.warn(`[MessagingService] Notify failed for ${p.userId}: ${err}`));
    }
  }
}

export const messagingService = new MessagingService();
export default messagingService;
