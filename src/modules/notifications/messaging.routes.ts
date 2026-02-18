import { Router } from 'express';
import * as ctrl from './messaging.controller';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import {
  conversationIdValidator,
  createConversationValidator,
  conversationQueryValidator,
  messageIdValidator,
  sendMessageValidator,
  editMessageValidator,
  addReactionValidator,
  lockConversationValidator,
} from './notification.validator';

const router = Router();

router.use(authenticate);

// ── Conversations ──────────────────────────────────────────────────────────────
router.get(  '/conversations',                validate(conversationQueryValidator),    ctrl.getMyConversations);
router.post( '/conversations',                validate(createConversationValidator),   ctrl.createConversation);
router.get(  '/conversations/unread',                                                  ctrl.getMessagingUnreadCount);
router.get(  '/conversations/:id',            validate(conversationIdValidator),       ctrl.getConversation);
router.post( '/conversations/:id/read',       validate(conversationIdValidator),       ctrl.markConversationRead);
router.patch('/conversations/:id/archive',    validate(conversationIdValidator),       ctrl.archiveConversation);

// Moderation: lock / unlock
router.post(  '/conversations/:id/lock',      authorize('platform_admin', 'expert'),
                                              validate(lockConversationValidator),     ctrl.lockConversation);
router.post(  '/conversations/:id/unlock',    authorize('platform_admin'),
                                              validate(conversationIdValidator),       ctrl.unlockConversation);

// ── Messages ───────────────────────────────────────────────────────────────────
router.post(  '/conversations/:id/messages',  validate(sendMessageValidator),          ctrl.sendMessage);
router.get(   '/conversations/:id/messages',  validate(conversationIdValidator),       ctrl.getMessages);
router.patch( '/messages/:messageId',         validate(editMessageValidator),          ctrl.editMessage);
router.delete('/messages/:messageId',         validate(messageIdValidator),            ctrl.deleteMessage);
router.post(  '/messages/:messageId/reactions', validate(addReactionValidator),        ctrl.addReaction);

// ── Admin moderation ───────────────────────────────────────────────────────────
router.get(  '/admin/flagged',                authorize('platform_admin'),             ctrl.getFlaggedMessages);
router.post( '/messages/:messageId/flag',     authorize('platform_admin', 'expert'),
                                              validate(messageIdValidator),            ctrl.flagMessage);
router.delete('/messages/:messageId/remove',  authorize('platform_admin'),
                                              validate(messageIdValidator),            ctrl.moderatorRemoveMessage);

export default router;
