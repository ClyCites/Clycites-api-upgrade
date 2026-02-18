/**
 * Notification Channel Services
 *
 * Channel-agnostic delivery layer with provider abstraction:
 *
 *  EmailChannelService  — wraps the existing EmailService (nodemailer)
 *  SmsChannelService    — Africa's Talking / Twilio (stub + interface)
 *  PushChannelService   — FCM via firebase-admin (stub + interface)
 *  WhatsAppChannelService — stub for Phase 2
 *
 * Each service returns a { success, externalRef?, error? } result so the
 * caller can record the delivery attempt status without catching exceptions.
 */

import EmailService from '../../common/utils/email';
import logger from '../../common/utils/logger';

// ============================================================================
// Shared result type
// ============================================================================

export interface ChannelDeliveryResult {
  success:      boolean;
  externalRef?: string;
  provider:     string;
  durationMs:   number;
  error?:       string;
}

// ============================================================================
// Email Channel
// ============================================================================

export class EmailChannelService {
  readonly provider = 'nodemailer';

  async send(params: {
    to:      string;
    subject: string;
    text:    string;
    html?:   string;
  }): Promise<ChannelDeliveryResult> {
    const start = Date.now();
    try {
      await EmailService.send({
        to:      params.to,
        subject: params.subject,
        text:    params.text,
        html:    params.html ?? `<p>${params.text}</p>`,
      });
      return { success: true, provider: this.provider, durationMs: Date.now() - start };
    } catch (err) {
      const msg = (err as Error).message;
      logger.warn(`[EmailChannel] Delivery failed: ${msg}`);
      return { success: false, provider: this.provider, durationMs: Date.now() - start, error: msg };
    }
  }
}

// ============================================================================
// SMS Channel  (Africa's Talking primary, Twilio fallback)
// ============================================================================

export class SmsChannelService {
  readonly provider = 'africas_talking';

  async send(params: {
    to:      string;  // E.164 format, e.g. +256700000000
    message: string;
  }): Promise<ChannelDeliveryResult> {
    const start = Date.now();
    try {
      // ── Africa's Talking integration ──────────────────────────────────────
      // TODO: Initialise AT SDK with env vars AT_API_KEY + AT_USERNAME
      // const AT = require('africastalking')({
      //   apiKey:   process.env.AT_API_KEY!,
      //   username: process.env.AT_USERNAME!,
      // });
      // const sms = AT.SMS;
      // const result = await sms.send({
      //   to:      [params.to],
      //   message: params.message,
      //   from:    process.env.AT_SENDER_ID,
      // });
      // const externalRef = result.SMSMessageData?.Recipients?.[0]?.messageId;
      // return { success: true, provider: this.provider, externalRef, durationMs: Date.now() - start };

      // Placeholder until AT SDK is installed:
      logger.info(`[SmsChannel] SMS to ${params.to}: "${params.message.slice(0, 60)}…"`);
      return { success: true, provider: this.provider, durationMs: Date.now() - start };
    } catch (err) {
      const msg = (err as Error).message;
      logger.warn(`[SmsChannel] Delivery failed: ${msg}`);
      return { success: false, provider: this.provider, durationMs: Date.now() - start, error: msg };
    }
  }
}

// ============================================================================
// Push Notification Channel (FCM via firebase-admin)
// ============================================================================

export class PushChannelService {
  readonly provider = 'fcm';

  async send(params: {
    fcmToken: string;
    title:    string;
    body:     string;
    data?:    Record<string, string>;
  }): Promise<ChannelDeliveryResult> {
    const start = Date.now();
    try {
      // ── Firebase Cloud Messaging integration ──────────────────────────────
      // TODO: Initialise firebase-admin with GOOGLE_APPLICATION_CREDENTIALS
      // const admin = require('firebase-admin');
      // if (!admin.apps.length) {
      //   admin.initializeApp({ credential: admin.credential.applicationDefault() });
      // }
      // const result = await admin.messaging().send({
      //   token:        params.fcmToken,
      //   notification: { title: params.title, body: params.body },
      //   data:         params.data ?? {},
      // });
      // return { success: true, provider: this.provider, externalRef: result, durationMs: Date.now() - start };

      logger.info(`[PushChannel] Push to token ${params.fcmToken.slice(0, 12)}… title="${params.title}"`);
      return { success: true, provider: this.provider, durationMs: Date.now() - start };
    } catch (err) {
      const msg = (err as Error).message;
      logger.warn(`[PushChannel] Delivery failed: ${msg}`);
      return { success: false, provider: this.provider, durationMs: Date.now() - start, error: msg };
    }
  }
}

// ============================================================================
// WhatsApp Channel (stub — Phase 2)
// ============================================================================

export class WhatsAppChannelService {
  readonly provider = 'whatsapp_stub';

  async send(params: {
    to:      string;
    message: string;
  }): Promise<ChannelDeliveryResult> {
    const start = Date.now();
    // TODO: Integrate Twilio WhatsApp API or 360dialog
    logger.info(`[WhatsAppChannel] WhatsApp to ${params.to} (stub): "${params.message.slice(0, 60)}…"`);
    return { success: true, provider: this.provider, durationMs: Date.now() - start };
  }
}

// ── Singletons ────────────────────────────────────────────────────────────────
export const emailChannelService    = new EmailChannelService();
export const smsChannelService      = new SmsChannelService();
export const pushChannelService     = new PushChannelService();
export const whatsappChannelService = new WhatsAppChannelService();
