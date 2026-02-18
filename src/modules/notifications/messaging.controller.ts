import { Response, NextFunction } from 'express';
import messagingService from './messaging.service';
import { sendSuccess } from '../../common/utils/response';
import { AuthRequest } from '../../common/middleware/auth';
import auditService from '../audit/audit.service';
import { ICreateConversationInput, ISendMessageInput } from './notification.types';

// ── Conversations ─────────────────────────────────────────────────────────────

export const createConversation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input: ICreateConversationInput = req.body;
    const conversation = await messagingService.createConversation(input, req.user!.id);
    await auditService.log({
      userId:     req.user!.id,
      action:     'CREATE_CONVERSATION',
      resource:   'conversation',
      resourceId: (conversation as { id?: string }).id?.toString(),
      status:     'success',
    });
    sendSuccess(res, conversation, 'Conversation created', 201);
  } catch (error) { next(error); }
};

export const getMyConversations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await messagingService.getMyConversations(req.user!.id, req.query as Record<string, unknown>);
    sendSuccess(res, result, 'Conversations retrieved');
  } catch (error) { next(error); }
};

export const getConversation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const conversation = await messagingService.getConversation(req.params.id, req.user!.id);
    sendSuccess(res, conversation, 'Conversation retrieved');
  } catch (error) { next(error); }
};

export const archiveConversation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const conversation = await messagingService.archiveConversation(req.params.id, req.user!.id);
    sendSuccess(res, conversation, 'Conversation archived');
  } catch (error) { next(error); }
};

export const lockConversation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const conversation = await messagingService.lockConversation(
      req.params.id,
      req.user!.id,
      req.body.reason
    );
    await auditService.log({
      userId:     req.user!.id,
      action:     'LOCK_CONVERSATION',
      resource:   'conversation',
      resourceId: req.params.id,
      status:     'success',
    });
    sendSuccess(res, conversation, 'Conversation locked');
  } catch (error) { next(error); }
};

export const unlockConversation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const conversation = await messagingService.unlockConversation(req.params.id, req.user!.id);
    await auditService.log({
      userId:     req.user!.id,
      action:     'UNLOCK_CONVERSATION',
      resource:   'conversation',
      resourceId: req.params.id,
      status:     'success',
    });
    sendSuccess(res, conversation, 'Conversation unlocked');
  } catch (error) { next(error); }
};

export const markConversationRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await messagingService.markConversationRead(req.params.id, req.user!.id);
    sendSuccess(res, null, 'Conversation marked as read');
  } catch (error) { next(error); }
};

export const getMessagingUnreadCount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const count = await messagingService.getUnreadCount(req.user!.id);
    sendSuccess(res, { count }, 'Unread message count retrieved');
  } catch (error) { next(error); }
};

// ── Messages ──────────────────────────────────────────────────────────────────

export const sendMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input: ISendMessageInput = {
      conversationId: req.params.id,
      senderId:       req.user!.id,
      body:           req.body.body,
      contentType:    req.body.contentType,
      attachments:    req.body.attachments,
      replyToId:      req.body.replyToId,
    };
    const message = await messagingService.sendMessage(input);
    sendSuccess(res, message, 'Message sent', 201);
  } catch (error) { next(error); }
};

export const getMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await messagingService.getMessages(req.params.id, req.user!.id, req.query as Record<string, unknown>);
    sendSuccess(res, result, 'Messages retrieved');
  } catch (error) { next(error); }
};

export const editMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const message = await messagingService.editMessage(req.params.messageId, req.user!.id, req.body.body);
    sendSuccess(res, message, 'Message edited');
  } catch (error) { next(error); }
};

export const deleteMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await messagingService.deleteMessage(req.params.messageId, req.user!.id);
    sendSuccess(res, null, 'Message deleted');
  } catch (error) { next(error); }
};

export const addReaction = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const message = await messagingService.reactToMessage(req.params.messageId, req.user!.id, req.body.emoji);
    sendSuccess(res, message, 'Reaction toggled');
  } catch (error) { next(error); }
};

// ── Moderation (admin / platform_admin) ──────────────────────────────────────

export const flagMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const message = await messagingService.flagMessage(req.params.messageId, req.user!.id, req.body.note);
    await auditService.log({ userId: req.user!.id, action: 'FLAG_MESSAGE', resource: 'message', resourceId: req.params.messageId, status: 'success' });
    sendSuccess(res, message, 'Message flagged');
  } catch (error) { next(error); }
};

export const moderatorRemoveMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const message = await messagingService.removeMessage(req.params.messageId, req.user!.id, req.body.note);
    await auditService.log({ userId: req.user!.id, action: 'REMOVE_MESSAGE', resource: 'message', resourceId: req.params.messageId, status: 'success' });
    sendSuccess(res, message, 'Message removed by moderator');
  } catch (error) { next(error); }
};

export const getFlaggedMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await messagingService.getFlaggedMessages(req.query as Record<string, unknown>);
    sendSuccess(res, result, 'Flagged messages retrieved');
  } catch (error) { next(error); }
};
