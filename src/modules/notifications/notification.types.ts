/**
 * Notifications & Messaging Module — TypeScript Type Definitions
 *
 * Enterprise-grade multi-channel communication:
 * - In-app, email, SMS, WhatsApp, push notification delivery
 * - Farmer ↔ Expert messaging with thread support
 * - Buyer ↔ Seller negotiation threads
 * - System alerts (weather, pest, orders, payments)
 * - Notification templates with localisation
 * - User & organisation delivery preferences
 * - Delivery tracking with retry logic
 * - Event-driven publishing from other services
 * - Conversation moderation hooks
 * - IAM-scoped access control
 */

import { Document, Types } from 'mongoose';

// ============================================================================
// ENUMS
// ============================================================================

/** All notification categories across the platform */
export enum NotificationType {
  // Transactional
  ORDER_CREATED         = 'order_created',
  ORDER_STATUS_CHANGED  = 'order_status_changed',
  ORDER_CANCELLED       = 'order_cancelled',
  ORDER_DELIVERED       = 'order_delivered',
  PAYMENT_RECEIVED      = 'payment_received',
  PAYMENT_FAILED        = 'payment_failed',
  PAYMENT_REFUNDED      = 'payment_refunded',

  // Marketplace
  LISTING_EXPIRING      = 'listing_expiring',
  LISTING_EXPIRED       = 'listing_expired',
  LISTING_APPROVED      = 'listing_approved',
  NEW_OFFER             = 'new_offer',
  OFFER_ACCEPTED        = 'offer_accepted',
  OFFER_REJECTED        = 'offer_rejected',

  // Messaging
  NEW_MESSAGE           = 'new_message',
  MESSAGE_REACTION      = 'message_reaction',
  THREAD_RESOLVED       = 'thread_resolved',

  // Expert Portal
  CONSULTATION_REQUEST  = 'consultation_request',
  CONSULTATION_ACCEPTED = 'consultation_accepted',
  CONSULTATION_COMPLETED = 'consultation_completed',
  EXPERT_REPLY          = 'expert_reply',

  // Weather / Pest
  WEATHER_ALERT         = 'weather_alert',
  PEST_ALERT            = 'pest_alert',
  DISEASE_ALERT         = 'disease_alert',

  // System
  ACCOUNT_VERIFIED      = 'account_verified',
  PASSWORD_CHANGED      = 'password_changed',
  SECURITY_ALERT        = 'security_alert',
  SYSTEM_ANNOUNCEMENT   = 'system_announcement',
  BROADCAST             = 'broadcast',

  // Marketing (opt-in)
  PROMOTION             = 'promotion',
  PRODUCT_RECOMMENDATION = 'product_recommendation',
}

/** Priority drives urgency of delivery and in-app prominence */
export enum NotificationPriority {
  LOW     = 'low',
  MEDIUM  = 'medium',
  HIGH    = 'high',
  URGENT  = 'urgent',
}

/** Delivery channel identifiers */
export enum NotificationChannel {
  IN_APP   = 'in_app',
  EMAIL    = 'email',
  SMS      = 'sms',
  PUSH     = 'push',
  WHATSAPP = 'whatsapp',
}

/** Status of a single delivery attempt */
export enum DeliveryStatus {
  PENDING   = 'pending',
  SENT      = 'sent',
  DELIVERED = 'delivered',
  FAILED    = 'failed',
  SKIPPED   = 'skipped',
}

/** Notification lifecycle state */
export enum NotificationStatus {
  PENDING  = 'pending',
  SENT     = 'sent',
  READ     = 'read',
  ARCHIVED = 'archived',
  EXPIRED  = 'expired',
}

// ============================================================================
// MESSAGING ENUMS
// ============================================================================

/** Type of conversation/thread */
export enum ConversationType {
  FARMER_EXPERT     = 'farmer_expert',     // Expert consultation thread
  BUYER_SELLER      = 'buyer_seller',       // Negotiation thread
  SUPPORT           = 'support',            // Platform support
  GROUP             = 'group',              // Org-wide or broadcast group
  SYSTEM            = 'system',             // System-initiated thread
}

/** Message content types */
export enum MessageContentType {
  TEXT     = 'text',
  IMAGE    = 'image',
  AUDIO    = 'audio',
  FILE     = 'file',
  SYSTEM   = 'system',   // automated message (e.g. "Order #123 created")
}

/** Message moderation status */
export enum ModerationStatus {
  CLEAN    = 'clean',
  FLAGGED  = 'flagged',
  REMOVED  = 'removed',
  REVIEWED = 'reviewed',
}

// ============================================================================
// TEMPLATE ENUMS
// ============================================================================

/** Supported locales */
export enum Locale {
  EN = 'en',    // English
  SW = 'sw',    // Swahili
  FR = 'fr',    // French
  LG = 'lg',    // Luganda
  RW = 'rw',    // Kinyarwanda
}

// ============================================================================
// NOTIFICATION TYPES (core)
// ============================================================================

export interface IDeliveryAttempt {
  channel:      NotificationChannel;
  status:       DeliveryStatus;
  attemptedAt:  Date;
  deliveredAt?: Date;
  externalRef?: string;   // provider message ID (SID, FCM token, etc.)
  errorMessage?: string;
  retryCount:   number;
}

export interface INotificationV2 {
  user:          Types.ObjectId;           // recipient
  organizationId?: Types.ObjectId;         // scope (optional — org-level alerts)
  type:          NotificationType;
  priority:      NotificationPriority;
  title:         string;
  message:       string;
  data?:         Record<string, unknown>;  // contextual metadata (orderId, etc.)
  templateId?:   Types.ObjectId;
  locale:        Locale;

  // Channels
  requestedChannels: NotificationChannel[];
  deliveryAttempts:  IDeliveryAttempt[];

  // State
  status:    NotificationStatus;
  read:      boolean;
  readAt?:   Date;
  archivedAt?: Date;
  expiresAt?:  Date;

  // Source
  triggeredBy: 'system' | 'user' | 'event';
  triggeredByUserId?: Types.ObjectId;
  sourceService?: string;   // e.g. 'weather', 'pest-disease', 'orders'

  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationDocument extends INotificationV2, Document {}

// ============================================================================
// CONVERSATION TYPES (messaging)
// ============================================================================

export interface IParticipant {
  userId:    Types.ObjectId;
  role?:     string;       // 'farmer' | 'expert' | 'buyer' | 'seller'
  joinedAt:  Date;
  leftAt?:   Date;
  isActive:  boolean;
  lastReadAt?: Date;
  lastReadMessageId?: Types.ObjectId;
}

export interface IConversation {
  type:          ConversationType;
  title?:        string;
  participants:  IParticipant[];
  organizationId?: Types.ObjectId;

  // Context reference
  contextType?:  'order' | 'listing' | 'consultation' | 'weather_alert' | 'pest_alert';
  contextId?:    Types.ObjectId;

  // Summary
  lastMessage?:  Types.ObjectId;
  lastMessageAt?: Date;
  messageCount:  number;
  unreadCounts:  Record<string, number>;  // { userId: count }

  // Moderation
  isLocked:      boolean;    // no new messages allowed
  lockedReason?: string;
  lockedBy?:     Types.ObjectId;
  lockedAt?:     Date;

  isArchived:    boolean;
  archivedAt?:   Date;
  archivedBy?:   Types.ObjectId;

  deletedAt?:    Date;
  createdAt:     Date;
  updatedAt:     Date;
}

export interface IConversationDocument extends IConversation, Document {}

// ============================================================================
// MESSAGE TYPES
// ============================================================================

export interface IAttachment {
  filename:    string;
  url:         string;
  mimeType:    string;
  sizeBytes:   number;
}

export interface IReaction {
  userId:   Types.ObjectId;
  emoji:    string;
  reactedAt: Date;
}

export interface IReadReceipt {
  userId:   Types.ObjectId;
  readAt:   Date;
}

export interface IMessage {
  conversationId: Types.ObjectId;
  sender:         Types.ObjectId;
  contentType:    MessageContentType;
  body:           string;
  attachments:    IAttachment[];
  reactions:      IReaction[];
  readReceipts:   IReadReceipt[];

  // Threading
  replyToId?:     Types.ObjectId;

  // Moderation
  moderation:     ModerationStatus;
  moderatedBy?:   Types.ObjectId;
  moderatedAt?:   Date;
  moderationNote?: string;

  // State
  isEdited:       boolean;
  editedAt?:      Date;
  isDeleted:      boolean;
  deletedAt?:     Date;
  deletedBy?:     Types.ObjectId;

  // System message metadata
  systemEventType?: string;   // e.g. 'order_updated', 'participant_joined'

  createdAt: Date;
  updatedAt: Date;
}

export interface IMessageDocument extends IMessage, Document {}

// ============================================================================
// DELIVERY LOG (per-channel audit trail)
// ============================================================================

export interface IDeliveryLog {
  notificationId: Types.ObjectId;
  userId:         Types.ObjectId;
  channel:        NotificationChannel;
  status:         DeliveryStatus;
  provider:       string;           // 'nodemailer', 'twilio', 'africas_talking', 'fcm'
  externalRef?:   string;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  errorMessage?:  string;
  attemptNumber:  number;
  attemptedAt:    Date;
  deliveredAt?:   Date;
  durationMs?:    number;
}

export interface IDeliveryLogDocument extends IDeliveryLog, Document {}

// ============================================================================
// NOTIFICATION TEMPLATE
// ============================================================================

export interface ITemplateTranslation {
  locale:      Locale;
  title:       string;     // Handlebars template string
  body:        string;     // Handlebars template string
  htmlBody?:   string;     // HTML template for email
  smsBody?:    string;     // SMS-friendly (plain text, short)
}

export interface INotificationTemplate {
  code:          string;            // unique identifier, e.g. 'order_created'
  type:          NotificationType;
  description?:  string;
  translations:  ITemplateTranslation[];
  defaultLocale: Locale;
  channels:      NotificationChannel[];
  priority:      NotificationPriority;
  isActive:      boolean;
  version:       number;
  createdBy:     Types.ObjectId;
  updatedBy?:    Types.ObjectId;
  deletedAt?:    Date;
  createdAt:     Date;
  updatedAt:     Date;
}

export interface INotificationTemplateDocument extends INotificationTemplate, Document {}

// ============================================================================
// NOTIFICATION PREFERENCES (per user / per organisation)
// ============================================================================

export interface IChannelPreference {
  channel:   NotificationChannel;
  enabled:   boolean;
  address?:  string;    // override email/phone for the channel
}

export interface ITypePreference {
  type:     NotificationType;
  enabled:  boolean;
  channels: NotificationChannel[];
}

export interface IQuietHours {
  enabled:    boolean;
  startHour:  number;   // 0-23
  endHour:    number;   // 0-23
  timezone:   string;
  daysOfWeek?: number[]; // 0=Sun … 6=Sat; null = all days
}

export interface INotificationPreference {
  userId:           Types.ObjectId;
  organizationId?:  Types.ObjectId;

  // Global channel switches
  channelPrefs:     IChannelPreference[];

  // Per-type overrides
  typePrefs:        ITypePreference[];

  // Quiet hours
  quietHours:       IQuietHours;

  // Push token
  fcmToken?:        string;
  pushEnabled:      boolean;

  // Preferred locale
  locale:           Locale;

  // Marketing opt-in
  marketingEnabled: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationPreferenceDocument extends INotificationPreference, Document {}

// ============================================================================
// SERVICE DTOs
// ============================================================================

export interface ICreateNotificationInput {
  user:        string;
  type:        NotificationType;
  title:       string;
  message:     string;
  data?:       Record<string, unknown>;
  priority?:   NotificationPriority;
  channels?:   NotificationChannel[];
  locale?:     Locale;
  expiresAt?:  Date;
  /** Use a stored template instead of inline title/message */
  templateCode?: string;
  templateVars?: Record<string, string | number>;
  organizationId?: string;
  sourceService?:  string;
  triggeredByUserId?: string;
}

export interface IBulkNotificationInput {
  userIds:      string[];
  type:         NotificationType;
  title:        string;
  message:      string;
  data?:        Record<string, unknown>;
  priority?:    NotificationPriority;
  channels?:    NotificationChannel[];
  templateCode?: string;
  templateVars?: Record<string, string | number>;
}

export interface ICreateConversationInput {
  type:          ConversationType;
  title?:        string;
  participantIds: string[];
  contextType?:  IConversation['contextType'];
  contextId?:    string;
  organizationId?: string;
}

export interface ISendMessageInput {
  conversationId: string;
  senderId:       string;
  contentType?:   MessageContentType;
  body:           string;
  attachments?:   Omit<IAttachment, never>[];
  replyToId?:     string;
}

export interface IUpdatePreferencesInput {
  channelPrefs?:    Partial<IChannelPreference>[];
  typePrefs?:       Partial<ITypePreference>[];
  quietHours?:      Partial<IQuietHours>;
  fcmToken?:        string;
  pushEnabled?:     boolean;
  locale?:          Locale;
  marketingEnabled?: boolean;
}

export interface ICreateTemplateInput {
  code:          string;
  type:          NotificationType;
  description?:  string;
  translations:  ITemplateTranslation[];
  defaultLocale?: Locale;
  channels?:     NotificationChannel[];
  priority?:     NotificationPriority;
}
