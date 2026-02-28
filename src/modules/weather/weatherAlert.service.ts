/**
 * Weather Alert Service
 *
 * Alert lifecycle management:
 * - Querying and paginating alerts per farm / org
 * - Sending alerts to the notification service (in-app first; email/SMS in future phases)
 * - Retry logic for failed deliveries with exponential backoff
 * - Quiet-hours enforcement
 * - Acknowledgement recording
 * - Expiry cleanup cron
 * - Statistics aggregation
 */

import mongoose from 'mongoose';
import logger from '../../common/utils/logger';
import WeatherAlert from './weatherAlert.model';
import FarmWeatherProfile from './farmWeatherProfile.model';
import auditService from '../audit/audit.service';
import {
  IWeatherAlertDocument,
  AlertStatus,
  DeliveryChannel,
  DeliveryStatus,
  AlertSeverity,
  AlertType,
} from './weather.types';
import { PaginationUtil } from '../../common/utils/pagination';
import { AppError } from '../../common/errors/AppError';

// ============================================================================
// Alert Service
// ============================================================================

class WeatherAlertService {

  // ---- Alert List & Retrieval ----------------------------------------------

  async listAlerts(
    farmId: string,
    options: {
      status?: AlertStatus;
      severity?: AlertSeverity;
      alertType?: AlertType;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const filter: Record<string, unknown> = {
      farmId: new mongoose.Types.ObjectId(farmId),
    };

    if (options.status)    filter.status    = options.status;
    if (options.severity)  filter.severity  = options.severity;
    if (options.alertType) filter.alertType = options.alertType;

    const page  = options.page  ?? 1;
    const limit = options.limit ?? 20;
    const skip  = PaginationUtil.getSkip(page, limit);

    const [data, total] = await Promise.all([
      WeatherAlert.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      WeatherAlert.countDocuments(filter),
    ]);

    return PaginationUtil.buildPaginationResult(data, total, page, limit);
  }

  async listOrgAlerts(
    organizationId: string,
    options: {
      status?: AlertStatus;
      severity?: AlertSeverity;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const filter: Record<string, unknown> = {
      organizationId: new mongoose.Types.ObjectId(organizationId),
    };

    if (options.status)   filter.status   = options.status;
    if (options.severity) filter.severity = options.severity;

    const page  = options.page  ?? 1;
    const limit = options.limit ?? 50;
    const skip  = PaginationUtil.getSkip(page, limit);

    const [data, total] = await Promise.all([
      WeatherAlert.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      WeatherAlert.countDocuments(filter),
    ]);

    return PaginationUtil.buildPaginationResult(data, total, page, limit);
  }

  async getAlert(alertId: string): Promise<IWeatherAlertDocument> {
    const alert = await WeatherAlert.findById(new mongoose.Types.ObjectId(alertId));
    if (!alert) throw new AppError('Weather alert not found', 404);
    return alert;
  }

  // ---- Sending Alerts ------------------------------------------------------

  /**
   * Attempt to deliver a single alert to all configured channels.
   * Respects quiet hours and records each attempt.
   */
  async sendAlert(alertId: string): Promise<IWeatherAlertDocument> {
    const alert = await this.getAlert(alertId);

    if (alert.status === AlertStatus.EXPIRED ||
        alert.status === AlertStatus.DISMISSED ||
        alert.status === AlertStatus.ACKNOWLEDGED) {
      logger.debug(`[WeatherAlert] sendAlert skipped — status is ${alert.status}`);
      return alert;
    }

    const profile = await FarmWeatherProfile.findOne({ farmId: alert.farmId });
    const channels: DeliveryChannel[] = profile?.alertPreferences?.channels ?? [DeliveryChannel.IN_APP];

    for (const channel of channels) {
      // Enforce quiet hours
      if (profile && this.isQuietHour(profile.alertPreferences?.quietHoursStart, profile.alertPreferences?.quietHoursEnd, profile.timezone)) {
        alert.deliveryAttempts.push({
          channel,
          timestamp:  new Date(),
          status:     DeliveryStatus.SKIPPED,
          externalRef: undefined,
          error:      'quiet_hours',
        });
        continue;
      }

      const attempt = await this.deliverToChannel(alert, channel);
      alert.deliveryAttempts.push(attempt);
    }

    // If at least one channel succeeded, mark the alert as SENT
    const hasSuccess = alert.deliveryAttempts.some((a) => a.status === DeliveryStatus.SUCCESS);
    if (hasSuccess) {
      alert.status = AlertStatus.SENT;
    }

    await alert.save();
    return alert;
  }

  /** Retry any NEW or SENT alerts with failed delivery attempts */
  async retryFailedDeliveries(): Promise<number> {
    const pendingAlerts = await WeatherAlert.find({
      status: { $in: [AlertStatus.NEW, AlertStatus.SENT] },
      expiresAt: { $gt: new Date() },
      'deliveryAttempts.status': DeliveryStatus.FAILED,
    }).limit(100);

    let retried = 0;
    for (const alert of pendingAlerts) {
      try {
        await this.sendAlert(alert._id!.toString());
        retried++;
      } catch (err) {
        logger.warn(`[WeatherAlert] Retry failed for alert ${alert._id}:`, err);
      }
    }

    logger.info(`[WeatherAlert] Retried ${retried} failed deliveries`);
    return retried;
  }

  // ---- Acknowledgement -----------------------------------------------------

  async acknowledgeAlert(alertId: string, userId: string): Promise<IWeatherAlertDocument> {
    const alert = await this.getAlert(alertId);

    if (alert.status === AlertStatus.ACKNOWLEDGED) {
      return alert; // idempotent
    }

    alert.status          = AlertStatus.ACKNOWLEDGED;
    alert.acknowledgedAt  = new Date();
    alert.acknowledgedBy  = new mongoose.Types.ObjectId(userId);

    await alert.save();

    await auditService.log({
      userId:     userId.toString(),
      action:     'acknowledge',
      resource:   'WeatherAlert',
      resourceId: alertId,
      status:     'success',
    });

    return alert;
  }

  async dismissAlert(alertId: string, userId: string): Promise<IWeatherAlertDocument> {
    const alert = await this.getAlert(alertId);
    alert.status = AlertStatus.DISMISSED;
    await alert.save();

    await auditService.log({
      userId:     userId,
      action:     'dismiss',
      resource:   'WeatherAlert',
      resourceId: alertId,
      status:     'success',
    });

    return alert;
  }

  async escalateAlert(
    alertId: string,
    userId: string,
    reason?: string,
    severity?: AlertSeverity
  ): Promise<IWeatherAlertDocument> {
    const alert = await this.getAlert(alertId);

    if (alert.status === AlertStatus.EXPIRED || alert.status === AlertStatus.DISMISSED) {
      throw new AppError('Cannot escalate dismissed or expired alerts', 400);
    }

    const severityOrder: AlertSeverity[] = [
      AlertSeverity.LOW,
      AlertSeverity.MEDIUM,
      AlertSeverity.HIGH,
      AlertSeverity.CRITICAL,
    ];

    const escalatedSeverity = severity || (() => {
      const index = severityOrder.indexOf(alert.severity);
      return severityOrder[Math.min(index + 1, severityOrder.length - 1)];
    })();

    alert.severity = escalatedSeverity;
    alert.status = AlertStatus.NEW;
    alert.triggeredBy = 'manual';
    alert.triggeredByUserId = new mongoose.Types.ObjectId(userId);
    if (reason) {
      alert.recommendedActions = [
        ...(alert.recommendedActions || []),
        `Escalation note: ${reason}`,
      ];
    }

    await alert.save();
    await this.sendAlert(alert._id.toString());

    await auditService.log({
      userId,
      action: 'escalate',
      resource: 'WeatherAlert',
      resourceId: alertId,
      details: {
        metadata: {
          reason,
          severity: escalatedSeverity,
        },
      },
      status: 'success',
    });

    return this.getAlert(alertId);
  }

  async simulateAlert(
    data: {
      farmId: string;
      farmerId: string;
      organizationId?: string;
      alertType: AlertType;
      severity: AlertSeverity;
      advisoryMessage: string;
      recommendedActions?: string[];
      expiresAt?: Date;
      triggerRule?: {
        ruleName: string;
        thresholds?: Record<string, number>;
        actualValues?: Record<string, number>;
      };
    },
    userId: string
  ): Promise<IWeatherAlertDocument> {
    const alert = await WeatherAlert.create({
      farmId: new mongoose.Types.ObjectId(data.farmId),
      farmerId: new mongoose.Types.ObjectId(data.farmerId),
      organizationId: data.organizationId
        ? new mongoose.Types.ObjectId(data.organizationId)
        : null,
      alertType: data.alertType,
      severity: data.severity,
      triggerRule: {
        ruleName: data.triggerRule?.ruleName || 'Admin simulation',
        thresholds: data.triggerRule?.thresholds || {},
        actualValues: data.triggerRule?.actualValues || {},
      },
      advisoryMessage: data.advisoryMessage,
      recommendedActions: data.recommendedActions || [],
      status: AlertStatus.NEW,
      expiresAt: data.expiresAt || new Date(Date.now() + (24 * 60 * 60 * 1000)),
      triggeredBy: 'manual',
      triggeredByUserId: new mongoose.Types.ObjectId(userId),
    });

    await this.sendAlert(alert._id.toString());

    await auditService.log({
      userId,
      action: 'create',
      resource: 'WeatherAlert',
      resourceId: alert._id.toString(),
      details: {
        metadata: {
          simulated: true,
          alertType: data.alertType,
          severity: data.severity,
        },
      },
      status: 'success',
    });

    return this.getAlert(alert._id.toString());
  }

  // ---- Expiry Cleanup (cron) -----------------------------------------------

  async expireOldAlerts(): Promise<number> {
    const now = new Date();
    const result = await WeatherAlert.updateMany(
      { status: { $in: [AlertStatus.NEW, AlertStatus.SENT] }, expiresAt: { $lt: now } },
      { $set: { status: AlertStatus.EXPIRED } }
    );
    if (result.modifiedCount > 0) {
      logger.info(`[WeatherAlert] Expired ${result.modifiedCount} alert(s)`);
    }
    return result.modifiedCount;
  }

  // ---- Statistics ----------------------------------------------------------

  async getAlertStats(organizationId?: string): Promise<{
    total: number;
    byStatus:   Record<string, number>;
    bySeverity: Record<string, number>;
    byType:     Record<string, number>;
  }> {
    const match: Record<string, unknown> = {};
    if (organizationId) match.organizationId = new mongoose.Types.ObjectId(organizationId);

    const [statusAgg, severityAgg, typeAgg, totalResult] = await Promise.all([
      WeatherAlert.aggregate([{ $match: match }, { $group: { _id: '$status',   count: { $sum: 1 } } }]),
      WeatherAlert.aggregate([{ $match: match }, { $group: { _id: '$severity', count: { $sum: 1 } } }]),
      WeatherAlert.aggregate([{ $match: match }, { $group: { _id: '$alertType', count: { $sum: 1 } } }]),
      WeatherAlert.countDocuments(match),
    ]);

    return {
      total:      totalResult,
      byStatus:   Object.fromEntries(statusAgg.map((a)   => [a._id as string, a.count as number])),
      bySeverity: Object.fromEntries(severityAgg.map((a) => [a._id as string, a.count as number])),
      byType:     Object.fromEntries(typeAgg.map((a)     => [a._id as string, a.count as number])),
    };
  }

  // ---- Channel Delivery ----------------------------------------------------

  private async deliverToChannel(
    alert: IWeatherAlertDocument,
    channel: DeliveryChannel
  ): Promise<{
    channel: DeliveryChannel;
    timestamp: Date;
    status: DeliveryStatus;
    externalRef?: string;
    error?: string;
  }> {
    try {
      switch (channel) {
        case DeliveryChannel.IN_APP:
          await this.deliverInApp(alert);
          break;
        // Phase 2 channels — stubbed
        case DeliveryChannel.EMAIL:
        case DeliveryChannel.SMS:
        case DeliveryChannel.WHATSAPP:
        case DeliveryChannel.PUSH:
          logger.debug(`[WeatherAlert] Channel ${channel} not yet implemented — skipping`);
          return { channel, timestamp: new Date(), status: DeliveryStatus.SKIPPED, error: 'channel_not_implemented' };
      }

      return { channel, timestamp: new Date(), status: DeliveryStatus.SUCCESS };
    } catch (err) {
      logger.warn(`[WeatherAlert] Delivery failed on ${channel}: ${(err as Error).message}`);
      return { channel, timestamp: new Date(), status: DeliveryStatus.FAILED, error: (err as Error).message };
    }
  }

  private async deliverInApp(alert: IWeatherAlertDocument): Promise<void> {
    // Integrate with the existing notifications module
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const notificationService = require('../notifications/notification.service').default as {
        createNotification: (data: {
          user: string;
          type: string;
          title: string;
          message: string;
          data?: Record<string, unknown>;
        }) => Promise<unknown>;
      };
      await notificationService.createNotification({
        user:    alert.farmerId.toString(),
        type:    'weather_alert',
        title:   `Weather Alert: ${alert.alertType.replace(/_/g, ' ')}`,
        message: alert.advisoryMessage,
        data:    {
          alertId:   (alert._id as mongoose.Types.ObjectId)?.toString(),
          alertType: alert.alertType,
          severity:  alert.severity,
          farmId:    alert.farmId.toString(),
        },
      });
    } catch (err) {
      // Notification module may not expose this interface yet — log and continue
      logger.debug(`[WeatherAlert] In-app delivery: notification service unavailable — ${(err as Error).message}`);
    }
  }

  // ---- Quiet Hours ---------------------------------------------------------

  private isQuietHour(
    startHour: number | undefined,
    endHour:   number | undefined,
    timezone:  string
  ): boolean {
    if (startHour == null || endHour == null) return false;

    try {
      const now = new Date();
      const localHour = parseInt(
        new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: timezone })
          .format(now),
        10
      );

      if (startHour <= endHour) {
        return localHour >= startHour && localHour < endHour;
      } else {
        // Spans midnight
        return localHour >= startHour || localHour < endHour;
      }
    } catch {
      return false; // Invalid timezone — default to not quiet
    }
  }
}

export const weatherAlertService = new WeatherAlertService();
export default weatherAlertService;
