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

  async sendOTP(email: string, otp: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>ClyCites Email Verification</h2>
        <p>Your verification code is:</p>
        <h1 style="background-color: #f0f0f0; padding: 20px; text-align: center; letter-spacing: 5px;">
          ${otp}
        </h1>
        <p>This code will expire in ${config.otp.expire}.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <hr>
        <p style="color: #888; font-size: 12px;">
          ClyCites - Transforming Agriculture through Technology
        </p>
      </div>
    `;

    await this.send({
      to: email,
      subject: 'ClyCites - Email Verification',
      html,
    });
  }

  async sendPasswordReset(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${config.cors.allowedOrigins[0]}/reset-password?token=${resetToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Click the button below to reset it:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="background-color: #f0f0f0; padding: 10px; word-break: break-all;">
          ${resetUrl}
        </p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr>
        <p style="color: #888; font-size: 12px;">
          ClyCites - Transforming Agriculture through Technology
        </p>
      </div>
    `;

    await this.send({
      to: email,
      subject: 'ClyCites - Password Reset',
      html,
    });
  }

  async sendWelcome(email: string, name: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to ClyCites! 🌾</h2>
        <p>Hello ${name},</p>
        <p>Thank you for joining ClyCites, the digital agriculture ecosystem that's transforming farming in Africa.</p>
        <p>Get started by:</p>
        <ul>
          <li>Completing your profile</li>
          <li>Exploring the marketplace</li>
          <li>Connecting with buyers and experts</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${config.cors.allowedOrigins[0]}/dashboard" style="background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Go to Dashboard
          </a>
        </div>
        <hr>
        <p style="color: #888; font-size: 12px;">
          ClyCites - Transforming Agriculture through Technology
        </p>
      </div>
    `;

    await this.send({
      to: email,
      subject: 'Welcome to ClyCites!',
      html,
    });
  }
}

export default new EmailService();
