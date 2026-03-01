
const auth = [{ BearerAuth: [] }];
const r = (s: object) => ({ required: true, content: { 'application/json': { schema: s } } });
const idParam = { $ref: '#/components/parameters/mongoIdPath' };
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };

export const notificationsPaths: Record<string, unknown> = {

  '/api/v1/notifications': {
    get: {
      tags: ['Notifications'],
      summary: 'Get my notifications',
      operationId: 'listNotifications',
      security: auth,
      parameters: [
        pageParam, limitParam,
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'sent', 'read', 'archived'] } },
        { name: 'channel', in: 'query', schema: { type: 'string', enum: ['in_app', 'email', 'sms', 'push'] } },
        { name: 'type', in: 'query', schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Notification list.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/notifications/unread-count': {
    get: {
      tags: ['Notifications'],
      summary: 'Unread notification count',
      operationId: 'notificationsUnreadCount',
      security: auth,
      responses: { 200: { description: 'Count.', content: { 'application/json': { schema: { type: 'object', properties: { count: { type: 'integer' } } } } } }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/notifications/mark-all-read': {
    patch: {
      tags: ['Notifications'],
      summary: 'Mark all as read',
      operationId: 'notificationsMarkAllRead',
      security: auth,
      responses: { 200: { description: 'All marked.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/notifications/{id}': {
    get: {
      tags: ['Notifications'],
      summary: 'Get notification by ID',
      operationId: 'getNotification',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Notification.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Notification' } } }] } } } }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    delete: {
      tags: ['Notifications'],
      summary: 'Delete notification',
      operationId: 'deleteNotification',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Deleted.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/notifications/{id}/read': {
    patch: {
      tags: ['Notifications'],
      summary: 'Mark notification as read',
      operationId: 'markNotificationRead',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Marked as read.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/notifications/{id}/archive': {
    patch: {
      tags: ['Notifications'],
      summary: 'Archive notification',
      operationId: 'archiveNotification',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Archived.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/notifications/preferences': {
    get: {
      tags: ['Notifications'],
      summary: 'Get notification preferences',
      operationId: 'getNotificationPrefs',
      security: auth,
      responses: { 200: { description: 'Preferences.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/NotificationPreferences' } } }] } } } }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
    patch: {
      tags: ['Notifications'],
      summary: 'Update notification preferences',
      operationId: 'updateNotificationPrefs',
      security: auth,
      requestBody: r({ $ref: '#/components/schemas/NotificationPreferences' }),
      responses: { 200: { description: 'Updated.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/notifications/preferences/fcm-token': {
    post: {
      tags: ['Notifications'],
      summary: 'Register FCM push token',
      description: 'Set the Firebase Cloud Messaging token for push notifications.',
      operationId: 'setFcmToken',
      security: auth,
      requestBody: r({ type: 'object', required: ['fcmToken'], properties: { fcmToken: { type: 'string' } } }),
      responses: { 200: { description: 'FCM token registered.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/notifications/templates': {
    get: {
      tags: ['Notifications', 'Admin'],
      summary: 'List notification templates',
      operationId: 'listNotificationTemplates',
      security: auth,
      responses: { 200: { description: 'Templates.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
    post: {
      tags: ['Notifications', 'Admin'],
      summary: 'Create notification template',
      description: 'Requires `platform_admin` role.',
      operationId: 'createNotificationTemplate',
      security: auth,
      requestBody: r({ type: 'object', required: ['key', 'title', 'body', 'channels'], properties: { key: { type: 'string', example: 'order_confirmed' }, title: { type: 'string' }, body: { type: 'string', description: 'Handlebars template with {{variables}}.' }, channels: { type: 'array', items: { type: 'string', enum: ['in_app', 'email', 'sms', 'push'] } } } }),
      responses: { 201: { description: 'Template created.' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/notifications/templates/{id}': {
    get: {
      tags: ['Notifications', 'Admin'],
      summary: 'Get template by ID',
      operationId: 'getNotificationTemplate',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Template.' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Notifications', 'Admin'],
      summary: 'Update notification template',
      operationId: 'updateNotificationTemplate',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { title: { type: 'string' }, body: { type: 'string' }, channels: { type: 'array', items: { type: 'string' } }, active: { type: 'boolean' } } }),
      responses: { 200: { description: 'Updated.' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
    delete: {
      tags: ['Notifications', 'Admin'],
      summary: 'Delete notification template',
      operationId: 'deleteNotificationTemplate',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Deleted.' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/notifications/admin/retry-failed': {
    post: {
      tags: ['Notifications', 'Admin'],
      summary: 'Retry failed notifications',
      description: '`platform_admin` only.',
      operationId: 'retryFailedNotifications',
      security: auth,
      responses: { 200: { description: 'Retry queued.' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/notifications/admin/expire-old': {
    post: {
      tags: ['Notifications', 'Admin'],
      summary: 'Expire old notifications',
      description: 'Marks old unread notifications as expired. `platform_admin` only.',
      operationId: 'expireOldNotifications',
      security: auth,
      responses: { 200: { description: 'Expiry job queued.' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/notifications/templates/seed': {
    post: {
      tags: ['Notifications', 'Admin'],
      summary: 'Seed notification templates',
      description: 'Seeds the default notification template set. `platform_admin` only.',
      operationId: 'seedNotificationTemplates',
      security: auth,
      responses: { 200: { description: 'Templates seeded.' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/notifications/preferences/reset': {
    post: {
      tags: ['Notifications'],
      summary: 'Reset notification preferences to defaults',
      description: 'Resets the authenticated user\'s notification preferences to the platform defaults.',
      operationId: 'resetNotificationPreferences',
      security: auth,
      responses: { 200: { description: 'Preferences reset.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },
};

export const messagingPaths: Record<string, unknown> = {

  '/api/v1/messaging/conversations': {
    get: {
      tags: ['Messaging'],
      summary: 'List my conversations',
      operationId: 'listConversations',
      security: auth,
      parameters: [pageParam, limitParam, { name: 'type', in: 'query', schema: { type: 'string', enum: ['farmer_expert', 'buyer_seller', 'support', 'group', 'system'] } }, { name: 'archived', in: 'query', schema: { type: 'boolean' } }],
      responses: { 200: { description: 'Conversations.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Conversation' } } } }] } } } }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
    post: {
      tags: ['Messaging'],
      summary: 'Create conversation',
      operationId: 'createConversation',
      security: auth,
      requestBody: r({
        type: 'object',
        required: ['participantIds', 'type'],
        properties: {
          participantIds: { type: 'array', items: { type: 'string', pattern: '^[a-f0-9]{24}$' }, minItems: 1 },
          type: { type: 'string', enum: ['farmer_expert', 'buyer_seller', 'support', 'group', 'system'] },
          title: { type: 'string' },
          contextType: { type: 'string', enum: ['order', 'listing', 'consultation', 'support'] },
          contextId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
          negotiationStatus: { type: 'string', enum: ['open', 'agreed', 'stalled', 'closed'] },
        },
      }),
      responses: { 201: { description: 'Conversation created.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Conversation' } } }] } } } }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/messaging/conversations/unread': {
    get: {
      tags: ['Messaging'],
      summary: 'Get total unread message count',
      operationId: 'messagingUnreadCount',
      security: auth,
      responses: { 200: { description: 'Unread count.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/messaging/conversations/{id}': {
    get: {
      tags: ['Messaging'],
      summary: 'Get conversation',
      operationId: 'getConversation',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Conversation.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },

  '/api/v1/messaging/conversations/{id}/messages': {
    get: {
      tags: ['Messaging'],
      summary: 'Get messages in conversation',
      operationId: 'getMessages',
      security: auth,
      parameters: [idParam, pageParam, limitParam],
      responses: { 200: { description: 'Messages.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Message' } } } }] } } } }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
    post: {
      tags: ['Messaging'],
      summary: 'Send message',
      operationId: 'sendMessage',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['body'], properties: { body: { type: 'string', maxLength: 4000 }, contentType: { type: 'string', enum: ['text', 'image', 'file', 'audio'], default: 'text' }, attachments: { type: 'array', items: { type: 'string', format: 'uri' } }, replyToId: { type: 'string', pattern: '^[a-f0-9]{24}$' } } }),
      responses: { 201: { description: 'Message sent.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/messaging/conversations/{id}/read': {
    post: {
      tags: ['Messaging'],
      summary: 'Mark conversation as read',
      operationId: 'markConversationRead',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Marked as read.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/messaging/conversations/{id}/archive': {
    patch: {
      tags: ['Messaging'],
      summary: 'Archive conversation',
      operationId: 'archiveConversation',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Archived.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/messaging/conversations/{id}/negotiation-status': {
    patch: {
      tags: ['Messaging'],
      summary: 'Update negotiation status',
      description: 'For buyer_seller conversations only. Invalid transitions return 400.',
      operationId: 'updateNegotiationStatus',
      security: auth,
      parameters: [idParam],
      requestBody: r({
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['open', 'agreed', 'stalled', 'closed'] },
        },
      }),
      responses: { 200: { description: 'Negotiation status updated.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/messaging/messages/{messageId}': {
    patch: {
      tags: ['Messaging'],
      summary: 'Edit message',
      operationId: 'editMessage',
      security: auth,
      parameters: [{ name: 'messageId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      requestBody: r({ type: 'object', required: ['body'], properties: { body: { type: 'string' } } }),
      responses: { 200: { description: 'Message updated.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
    delete: {
      tags: ['Messaging'],
      summary: 'Delete message',
      operationId: 'deleteMessage',
      security: auth,
      parameters: [{ name: 'messageId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }],
      responses: { 200: { description: 'Deleted.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/messaging/messages/{messageId}/reactions': {
    post: {
      tags: ['Messaging'],
      summary: 'Add reaction to message',
      operationId: 'addReaction',
      security: auth,
      parameters: [{ name: 'messageId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: r({ type: 'object', required: ['emoji'], properties: { emoji: { type: 'string', example: '👍' } } }),
      responses: { 200: { description: 'Reaction added.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },
};
