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
    badge?: string;
  }): string {
    const accentColor = input.accentColor || '#2f8f4e';
    const footerTitle = input.footerTitle || 'ClyCites';
    const footerSubtitle = input.footerSubtitle || 'Transforming Agriculture through Technology';
    const badge = input.badge || 'Notification';

    return `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${input.title}</title>
      </head>
      <body style="margin:0;padding:0;background:#eef3f8;font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
          ${input.preheader}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef3f8;padding:26px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #d8e1ec;box-shadow:0 8px 28px rgba(15,23,42,0.08);">
                <tr>
                  <td style="padding:12px 28px;background:#0f172a;color:#dbe3ef;">
                    <span style="font-size:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">ClyCites Platform</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 28px;background:${accentColor};color:#ffffff;">
                    <span style="display:inline-block;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,0.18);font-size:11px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;">
                      ${badge}
                    </span>
                    <h1 style="margin:12px 0 0 0;font-size:24px;line-height:1.28;">${input.title}</h1>
                    <p style="margin:10px 0 0 0;font-size:14px;line-height:1.6;opacity:0.98;">${input.subtitle}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:30px 28px 26px 28px;">
                    ${input.bodyHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 28px 26px 28px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;line-height:1.65;">
                    <strong style="color:#374151;font-size:12px;">${footerTitle}</strong><br />
                    ${footerSubtitle}<br />
                    <span style="color:#94a3b8;">Please do not reply to this automated message.</span>
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
      <div style="margin:24px 0 22px 0;text-align:center;">
        <a href="${href}" style="display:inline-block;padding:13px 24px;border-radius:10px;background:${color};border:1px solid rgba(0,0,0,0.08);box-shadow:0 4px 12px rgba(0,0,0,0.12);color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.2px;">
          ${label}
        </a>
      </div>
    `;
  }

  private renderDetailRow(label: string, value: string): string {
    return `
      <tr>
        <td style="padding:8px 0;font-size:13px;color:#4b5563;vertical-align:top;width:120px;">
          <strong style="color:#111827;">${label}</strong>
        </td>
        <td style="padding:8px 0;font-size:13px;color:#374151;word-break:break-word;">
          ${value}
        </td>
      </tr>
    `;
  }

  async sendOTP(email: string, otp: string): Promise<void> {
    const safeOtp = this.escapeHtml(otp);
    const expiry = this.escapeHtml(config.otp.expire);
    const html = this.renderTemplate({
      preheader: `Your verification code is ${safeOtp}.`,
      title: 'Email Verification Code',
      subtitle: 'Use the one-time code below to verify your account.',
      badge: 'Authentication',
      bodyHtml: `
        <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#334155;">
          Enter this verification code to continue:
        </p>
        <div style="margin:10px 0 18px 0;padding:20px;border:1px solid #d5deea;border-radius:12px;background:#f8fafc;text-align:center;">
          <span style="font-size:34px;letter-spacing:10px;font-weight:800;color:#0f172a;font-family:'Courier New',monospace;">
            ${safeOtp}
          </span>
        </div>
        <p style="margin:0 0 8px 0;font-size:14px;color:#334155;">
          This code expires in <strong>${expiry}</strong>.
        </p>
        <p style="margin:0 0 8px 0;font-size:13px;color:#64748b;">
          For your security, never share this code with anyone.
        </p>
        <p style="margin:0;font-size:13px;color:#64748b;">
          If you did not request this code, you can ignore this message.
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
      badge: 'Account Recovery',
      bodyHtml: `
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">
          Click the button below to set a new password.
        </p>
        ${this.renderButton('Reset Password', resetUrl)}
        <p style="margin:0 0 8px 0;font-size:14px;color:#334155;">
          This link expires in <strong>1 hour</strong>.
        </p>
        <p style="margin:0 0 10px 0;font-size:13px;color:#64748b;">
          If the button does not work, copy and paste this URL:
        </p>
        <p style="margin:0;padding:11px 12px;background:#f8fafc;border:1px solid #d5deea;border-radius:8px;word-break:break-all;font-size:12px;color:#334155;">
          ${resetUrl}
        </p>
        <p style="margin:12px 0 0 0;font-size:12px;color:#64748b;">
          If you did not request a reset, no further action is required.
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
      badge: 'Onboarding',
      bodyHtml: `
        <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#334155;">
          Hi <strong>${safeName}</strong>, thank you for joining ClyCites.
        </p>
        <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#334155;">
          To get started quickly:
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 4px 0;border:1px solid #d5deea;border-radius:10px;background:#f8fafc;">
          <tr>
            <td style="padding:12px 14px;font-size:14px;color:#334155;line-height:1.75;">
              <ul style="margin:0;padding-left:18px;">
          <li>Complete your profile details</li>
          <li>Explore prices and marketplace opportunities</li>
          <li>Set alerts and connect with experts</li>
              </ul>
            </td>
          </tr>
        </table>
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
      badge: 'Security',
      footerTitle: 'ClyCites Security Team',
      footerSubtitle: 'This is an automated security notification.',
      bodyHtml: `
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">
          We detected <strong>${safeEventType}</strong> on your account.
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px 0;background:#fff5f5;border:1px solid #fecaca;border-radius:10px;">
          <tr>
            <td style="padding:10px 14px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                ${this.renderDetailRow('Event', safeEventType)}
                ${this.renderDetailRow('Time', safeOccurredAt)}
                ${safeLocationOrIp ? this.renderDetailRow('IP/Location', safeLocationOrIp) : ''}
                ${safeDevice ? this.renderDetailRow('Device', safeDevice) : ''}
              </table>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 12px 0;font-size:14px;color:#334155;">
          If this was you, no action is needed.
        </p>
        <p style="margin:0 0 10px 0;font-size:14px;color:#334155;">
          If you do not recognize this activity:
        </p>
        <ul style="margin:0 0 0 18px;padding:0;color:#334155;font-size:14px;line-height:1.8;">
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
