import nodemailer from 'nodemailer';
import config from '../config';
import logger from './logger';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: false,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }

  async send(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: config.email.from,
        to: Array.isArray(options.to) ? options.to.join(',') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      logger.info(`Email sent to ${options.to}`);
    } catch (error) {
      logger.error(`Failed to send email: ${error}`);
      throw error;
    }
  }

  private getAppUrl(): string {
    const firstOrigin = config.cors.allowedOrigins[0];
    if (typeof firstOrigin === 'string' && firstOrigin.trim().length > 0) {
      return firstOrigin.trim();
    }
    return 'http://localhost:3000';
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private renderTemplate(input: {
    preheader: string;
    title: string;
    subtitle: string;
    bodyHtml: string;
    accentColor?: string;
    footerTitle?: string;
    footerSubtitle?: string;
  }): string {
    const accentColor = input.accentColor || '#2f8f4e';
    const footerTitle = input.footerTitle || 'ClyCites';
    const footerSubtitle = input.footerSubtitle || 'Transforming Agriculture through Technology';

    return `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${input.title}</title>
      </head>
      <body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,sans-serif;color:#1f2937;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
          ${input.preheader}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fb;padding:24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
                <tr>
                  <td style="padding:24px 28px;background:${accentColor};color:#ffffff;">
                    <h1 style="margin:0;font-size:22px;line-height:1.3;">${input.title}</h1>
                    <p style="margin:8px 0 0 0;font-size:14px;opacity:0.95;">${input.subtitle}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    ${input.bodyHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 28px 24px 28px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;line-height:1.5;">
                    <strong style="color:#374151;">${footerTitle}</strong><br />
                    ${footerSubtitle}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  private renderButton(label: string, href: string, color = '#2f8f4e'): string {
    return `
      <div style="margin:24px 0;text-align:center;">
        <a href="${href}" style="display:inline-block;padding:13px 22px;border-radius:10px;background:${color};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">
          ${label}
        </a>
      </div>
    `;
  }

  async sendOTP(email: string, otp: string): Promise<void> {
    const safeOtp = this.escapeHtml(otp);
    const expiry = this.escapeHtml(config.otp.expire);
    const html = this.renderTemplate({
      preheader: `Your verification code is ${safeOtp}.`,
      title: 'Email Verification Code',
      subtitle: 'Use the one-time code below to verify your account.',
      bodyHtml: `
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;">
          Enter this verification code to continue:
        </p>
        <div style="margin:12px 0 20px 0;padding:18px;border:1px solid #d1d5db;border-radius:12px;background:#f9fafb;text-align:center;">
          <span style="font-size:34px;letter-spacing:10px;font-weight:800;color:#111827;font-family:'Courier New',monospace;">
            ${safeOtp}
          </span>
        </div>
        <p style="margin:0 0 8px 0;font-size:14px;color:#374151;">
          This code expires in <strong>${expiry}</strong>.
        </p>
        <p style="margin:0;font-size:13px;color:#6b7280;">
          If you did not request this, you can ignore this email.
        </p>
      `,
    });

    await this.send({
      to: email,
      subject: 'ClyCites - Email Verification',
      text: `Your ClyCites verification code is ${otp}. This code expires in ${config.otp.expire}.`,
      html,
    });
  }

  async sendPasswordReset(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.getAppUrl()}/reset-password?token=${encodeURIComponent(resetToken)}`;
    const html = this.renderTemplate({
      preheader: 'Reset your ClyCites password.',
      title: 'Password Reset Request',
      subtitle: 'A password reset was requested for your account.',
      bodyHtml: `
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;">
          Click the button below to set a new password.
        </p>
        ${this.renderButton('Reset Password', resetUrl)}
        <p style="margin:0 0 8px 0;font-size:14px;color:#374151;">
          This link expires in <strong>1 hour</strong>.
        </p>
        <p style="margin:0 0 10px 0;font-size:13px;color:#6b7280;">
          If the button does not work, copy and paste this URL:
        </p>
        <p style="margin:0;padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;word-break:break-all;font-size:12px;color:#374151;">
          ${resetUrl}
        </p>
      `,
    });

    await this.send({
      to: email,
      subject: 'ClyCites - Password Reset',
      text: `Reset your password using this link (expires in 1 hour): ${resetUrl}`,
      html,
    });
  }

  async sendWelcome(email: string, name: string): Promise<void> {
    const appUrl = this.getAppUrl();
    const safeName = this.escapeHtml(name);
    const html = this.renderTemplate({
      preheader: `Welcome to ClyCites, ${safeName}.`,
      title: 'Welcome to ClyCites',
      subtitle: 'Your digital agriculture workspace is ready.',
      bodyHtml: `
        <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;">
          Hi <strong>${safeName}</strong>, thank you for joining ClyCites.
        </p>
        <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;">
          To get started quickly:
        </p>
        <ul style="margin:0 0 0 18px;padding:0;color:#374151;font-size:14px;line-height:1.8;">
          <li>Complete your profile details</li>
          <li>Explore prices and marketplace opportunities</li>
          <li>Set alerts and connect with experts</li>
        </ul>
        ${this.renderButton('Open Dashboard', `${appUrl}/dashboard`)}
      `,
    });

    await this.send({
      to: email,
      subject: 'Welcome to ClyCites!',
      text: `Welcome to ClyCites, ${name}. Open your dashboard: ${appUrl}/dashboard`,
      html,
    });
  }

  async sendSecurityAlert(
    email: string,
    details: {
      eventType: string;
      location?: string;
      device?: string;
      timestamp?: Date;
      ipAddress?: string;
    }
  ): Promise<void> {
    const appUrl = this.getAppUrl();
    const occurredAt = details.timestamp ? details.timestamp.toLocaleString() : new Date().toLocaleString();
    const locationOrIp = details.ipAddress || details.location;
    const safeEventType = this.escapeHtml(details.eventType);
    const safeOccurredAt = this.escapeHtml(occurredAt);
    const safeLocationOrIp = locationOrIp ? this.escapeHtml(locationOrIp) : '';
    const safeDevice = details.device ? this.escapeHtml(details.device) : '';

    const html = this.renderTemplate({
      preheader: `Security alert: ${safeEventType}`,
      title: 'Security Alert',
      subtitle: 'We detected important activity on your account.',
      accentColor: '#b42318',
      footerTitle: 'ClyCites Security Team',
      footerSubtitle: 'This is an automated security notification.',
      bodyHtml: `
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;">
          We detected <strong>${safeEventType}</strong> on your account.
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px 0;background:#fff5f5;border:1px solid #fecaca;border-radius:10px;">
          <tr>
            <td style="padding:12px 14px;font-size:14px;color:#7f1d1d;line-height:1.7;">
              <div><strong>Event:</strong> ${safeEventType}</div>
              <div><strong>Time:</strong> ${safeOccurredAt}</div>
              ${safeLocationOrIp ? `<div><strong>IP/Location:</strong> ${safeLocationOrIp}</div>` : ''}
              ${safeDevice ? `<div><strong>Device:</strong> ${safeDevice}</div>` : ''}
            </td>
          </tr>
        </table>
        <p style="margin:0 0 12px 0;font-size:14px;color:#374151;">
          If this was you, no action is needed.
        </p>
        <p style="margin:0 0 10px 0;font-size:14px;color:#374151;">
          If you do not recognize this activity:
        </p>
        <ul style="margin:0 0 0 18px;padding:0;color:#374151;font-size:14px;line-height:1.8;">
          <li>Change your password immediately</li>
          <li>Review recent account activity</li>
          <li>Enable two-factor authentication</li>
          <li>Contact support if needed</li>
        </ul>
        ${this.renderButton('Review Security Settings', `${appUrl}/security`, '#b42318')}
      `,
    });

    await this.send({
      to: email,
      subject: 'ClyCites - Security Alert',
      text: `Security alert: ${details.eventType} at ${occurredAt}. Review your security settings: ${appUrl}/security`,
      html,
    });
  }
}

export default new EmailService();
