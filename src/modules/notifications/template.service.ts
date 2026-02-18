/**
 * Notification Template Service
 *
 * Manages localised message templates:
 * - CRUD for NotificationTemplate documents
 * - Handlebars-compatible variable rendering ({{varName}})
 * - Locale fallback (requested → defaultLocale → 'en')
 * - Per-channel body selection (htmlBody for email, smsBody for SMS, body for rest)
 * - Seeding default platform templates
 */

import NotificationTemplate from './notificationTemplate.model';
import {
  INotificationTemplateDocument,
  ICreateTemplateInput,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  Locale,
  ITemplateTranslation,
} from './notification.types';
import { AppError } from '../../common/errors/AppError';
import { PaginationUtil } from '../../common/utils/pagination';
import logger from '../../common/utils/logger';
import mongoose from 'mongoose';

// ============================================================================
// Simple Handlebars-style renderer (no external dependency required)
// ============================================================================

function renderTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = vars[key];
    return val !== undefined ? String(val) : `{{${key}}}`;
  });
}

// ============================================================================
// Template Service
// ============================================================================

class TemplateService {

  // ── Lookup ──────────────────────────────────────────────────────────────────

  async getByCode(code: string): Promise<INotificationTemplateDocument | null> {
    return NotificationTemplate.findOne({ code: code.toLowerCase(), isActive: true });
  }

  async getById(id: string): Promise<INotificationTemplateDocument> {
    const t = await NotificationTemplate.findById(id);
    if (!t) throw new AppError('Notification template not found', 404);
    return t;
  }

  async list(query: Record<string, unknown>) {
    const { page, limit, sortBy, sortOrder } = PaginationUtil.getPaginationParams(query);
    const skip  = PaginationUtil.getSkip(page, limit);
    const sort  = PaginationUtil.getSortObject(sortBy || 'code', sortOrder || 'asc');

    const filter: Record<string, unknown> = {};
    if (query.type)     filter.type     = query.type;
    if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';

    const [data, total] = await Promise.all([
      NotificationTemplate.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      NotificationTemplate.countDocuments(filter),
    ]);
    return PaginationUtil.buildPaginationResult(data, total, page, limit);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  /**
   * Render a stored template into final strings for each channel.
   * Returns `null` if no template is found for the code.
   */
  async render(params: {
    code:        string;
    vars?:       Record<string, string | number>;
    locale?:     Locale;
    channel?:    NotificationChannel;
  }): Promise<{ title: string; body: string; htmlBody?: string; smsBody?: string } | null> {
    const template = await this.getByCode(params.code);
    if (!template) return null;

    const locale   = params.locale ?? Locale.EN;
    const translation = this.resolveTranslation(template, locale);
    if (!translation) return null;

    const vars = params.vars ?? {};
    const title    = renderTemplate(translation.title,   vars);
    const body     = renderTemplate(translation.body,    vars);
    const htmlBody = translation.htmlBody ? renderTemplate(translation.htmlBody, vars) : undefined;
    const smsBody  = translation.smsBody  ? renderTemplate(translation.smsBody,  vars) : undefined;

    return { title, body, htmlBody, smsBody };
  }

  private resolveTranslation(
    template: INotificationTemplateDocument,
    locale: Locale
  ): ITemplateTranslation | undefined {
    // Priority: requested locale → defaultLocale → EN → first available
    return (
      template.translations.find(t => t.locale === locale) ??
      template.translations.find(t => t.locale === template.defaultLocale) ??
      template.translations.find(t => t.locale === Locale.EN) ??
      template.translations[0]
    );
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async create(input: ICreateTemplateInput, createdBy: string): Promise<INotificationTemplateDocument> {
    const existing = await NotificationTemplate.findOne({ code: input.code.toLowerCase() });
    if (existing) throw new AppError(`Template with code '${input.code}' already exists`, 409);

    return NotificationTemplate.create({
      ...input,
      code:          input.code.toLowerCase(),
      defaultLocale: input.defaultLocale ?? Locale.EN,
      channels:      input.channels ?? [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      priority:      input.priority  ?? NotificationPriority.MEDIUM,
      createdBy:     new mongoose.Types.ObjectId(createdBy),
      isActive:      true,
      version:       1,
    });
  }

  async update(id: string, updates: Partial<ICreateTemplateInput>, updatedBy: string): Promise<INotificationTemplateDocument> {
    const t = await NotificationTemplate.findByIdAndUpdate(
      id,
      { $set: { ...updates, updatedBy: new mongoose.Types.ObjectId(updatedBy) }, $inc: { version: 1 } },
      { new: true }
    );
    if (!t) throw new AppError('Notification template not found', 404);
    return t;
  }

  async deactivate(id: string, updatedBy: string): Promise<INotificationTemplateDocument> {
    const t = await NotificationTemplate.findByIdAndUpdate(
      id,
      { $set: { isActive: false, deletedAt: new Date(), updatedBy: new mongoose.Types.ObjectId(updatedBy) } },
      { new: true }
    );
    if (!t) throw new AppError('Notification template not found', 404);
    return t;
  }

  // ── Seed defaults ────────────────────────────────────────────────────────────

  async seedDefaultTemplates(adminUserId: string): Promise<void> {
    const adminId = new mongoose.Types.ObjectId(adminUserId);

    const defaults: Array<Omit<ICreateTemplateInput, 'createdBy'> & { createdBy: mongoose.Types.ObjectId }> = [
      {
        code:         'order_created',
        type:         NotificationType.ORDER_CREATED,
        description:  'Sent to buyer and farmer when an order is created',
        defaultLocale: Locale.EN,
        channels:     [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
        priority:     NotificationPriority.HIGH,
        translations: [
          {
            locale:   Locale.EN,
            title:    'Order Created — #{{orderId}}',
            body:     'Your order #{{orderId}} for {{productName}} has been created successfully.',
            htmlBody: '<p>Your order <strong>#{{orderId}}</strong> for <em>{{productName}}</em> has been created. Total: {{currency}} {{amount}}.</p>',
            smsBody:  'ClyCites: Order #{{orderId}} created. {{productName}}. Total: {{currency}} {{amount}}.',
          },
          {
            locale:   Locale.SW,
            title:    'Agizo Limeundwa — #{{orderId}}',
            body:     'Agizo lako #{{orderId}} la {{productName}} limeundwa kwa mafanikio.',
            smsBody:  'ClyCites: Agizo #{{orderId}} limeundwa. {{productName}}. Jumla: {{currency}} {{amount}}.',
          },
        ],
        createdBy: adminId,
      },
      {
        code:         'payment_received',
        type:         NotificationType.PAYMENT_RECEIVED,
        description:  'Sent to seller/farmer when payment is confirmed',
        defaultLocale: Locale.EN,
        channels:     [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
        priority:     NotificationPriority.HIGH,
        translations: [
          {
            locale:   Locale.EN,
            title:    'Payment Received — {{currency}} {{amount}}',
            body:     'Payment of {{currency}} {{amount}} for order #{{orderId}} has been received.',
            htmlBody: '<p>Payment of <strong>{{currency}} {{amount}}</strong> for order <strong>#{{orderId}}</strong> has been received in your account.</p>',
            smsBody:  'ClyCites: Payment {{currency}} {{amount}} received for order #{{orderId}}.',
          },
        ],
        createdBy: adminId,
      },
      {
        code:         'weather_alert',
        type:         NotificationType.WEATHER_ALERT,
        description:  'Agricultural weather risk alert with advisory',
        defaultLocale: Locale.EN,
        channels:     [NotificationChannel.IN_APP, NotificationChannel.SMS, NotificationChannel.PUSH],
        priority:     NotificationPriority.URGENT,
        translations: [
          {
            locale:   Locale.EN,
            title:    '⚠️ Weather Alert: {{alertType}}',
            body:     '{{advisoryMessage}} Recommended: {{actions}}',
            smsBody:  'WEATHER ALERT: {{alertType}} at {{farmName}}. {{advisoryMessage}}',
          },
        ],
        createdBy: adminId,
      },
      {
        code:         'pest_alert',
        type:         NotificationType.PEST_ALERT,
        description:  'Pest or disease detection alert',
        defaultLocale: Locale.EN,
        channels:     [NotificationChannel.IN_APP, NotificationChannel.SMS],
        priority:     NotificationPriority.HIGH,
        translations: [
          {
            locale:   Locale.EN,
            title:    '🔴 Pest Alert: {{pestName}}',
            body:     '{{pestName}} detected on your farm with {{confidence}}% confidence. {{recommendation}}',
            smsBody:  'PEST ALERT: {{pestName}} detected. {{recommendation}}',
          },
        ],
        createdBy: adminId,
      },
      {
        code:         'new_message',
        type:         NotificationType.NEW_MESSAGE,
        description:  'New message in a conversation thread',
        defaultLocale: Locale.EN,
        channels:     [NotificationChannel.IN_APP, NotificationChannel.PUSH],
        priority:     NotificationPriority.MEDIUM,
        translations: [
          {
            locale:   Locale.EN,
            title:    'New message from {{senderName}}',
            body:     '{{senderName}}: {{messagePreview}}',
          },
        ],
        createdBy: adminId,
      },
      {
        code:         'consultation_request',
        type:         NotificationType.CONSULTATION_REQUEST,
        description:  'New expert consultation request',
        defaultLocale: Locale.EN,
        channels:     [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        priority:     NotificationPriority.HIGH,
        translations: [
          {
            locale:   Locale.EN,
            title:    'New Consultation Request from {{farmerName}}',
            body:     '{{farmerName}} is requesting expert advice on: {{topic}}',
            htmlBody: '<p><strong>{{farmerName}}</strong> has requested your expert advice on: <em>{{topic}}</em>. Please review and respond.</p>',
          },
        ],
        createdBy: adminId,
      },
    ];

    let seeded = 0;
    for (const tmpl of defaults) {
      const exists = await NotificationTemplate.findOne({ code: tmpl.code });
      if (!exists) {
        await NotificationTemplate.create(tmpl);
        seeded++;
      }
    }
    logger.info(`[TemplateService] Seeded ${seeded} default templates`);
  }
}

export const templateService = new TemplateService();
export default templateService;
