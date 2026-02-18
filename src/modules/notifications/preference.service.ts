/**
 * Notification Preference Service
 *
 * Manages per-user per-organisation notification delivery preferences:
 *  - Channel enables/disables and address overrides
 *  - Per-type preferences (can silence specific notification types)
 *  - Quiet hours (no dispatch outside working window)
 *  - FCM device token management
 *  - Marketing opt-in flag
 */

import mongoose from 'mongoose';
import NotificationPreference from './notificationPreference.model';
import {
  INotificationPreferenceDocument,
  IUpdatePreferencesInput,
  IChannelPreference,
  ITypePreference,
  NotificationChannel,
  NotificationType,
  Locale,
} from './notification.types';
import logger from '../../common/utils/logger';

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Build a default preference document for a new user.
 * All channels except in-app are disabled; no quiet hours.
 */
function buildDefaults(userId: string, organizationId?: string): Record<string, unknown> {
  return {
    userId:           new mongoose.Types.ObjectId(userId),
    organizationId:   organizationId ? new mongoose.Types.ObjectId(organizationId) : undefined,
    channelPrefs: [
      { channel: NotificationChannel.IN_APP,   enabled: true  },
      { channel: NotificationChannel.EMAIL,    enabled: true  },
      { channel: NotificationChannel.SMS,      enabled: false },
      { channel: NotificationChannel.PUSH,     enabled: false },
      { channel: NotificationChannel.WHATSAPP, enabled: false },
    ],
    typePrefs:        [],
    quietHours:       { enabled: false, startHour: 22, endHour: 7, timezone: 'UTC' },
    fcmToken:         undefined,
    pushEnabled:      false,
    locale:           Locale.EN,
    marketingEnabled: false,
  };
}

// ============================================================================
// PreferenceService
// ============================================================================

class PreferenceService {

  // ── Get / lazy-create ─────────────────────────────────────────────────────

  async getPreferences(userId: string, organizationId?: string): Promise<INotificationPreferenceDocument> {
    const filter: Record<string, unknown> = { userId: new mongoose.Types.ObjectId(userId) };
    if (organizationId) {
      filter.organizationId = new mongoose.Types.ObjectId(organizationId);
    } else {
      filter.organizationId = { $exists: false };
    }

    let prefs = await NotificationPreference.findOne(filter);
    if (!prefs) {
      prefs = await NotificationPreference.create(buildDefaults(userId, organizationId));
    }
    return prefs;
  }

  // ── Update (deep-merge) ───────────────────────────────────────────────────

  async updatePreferences(
    userId: string,
    organizationId: string | undefined,
    input: IUpdatePreferencesInput
  ): Promise<INotificationPreferenceDocument> {
    const prefs = await this.getPreferences(userId, organizationId);

    // Merge channelPrefs
    if (input.channelPrefs) {
      for (const incoming of input.channelPrefs) {
        if (!incoming.channel) continue;
        const idx = prefs.channelPrefs.findIndex((c: IChannelPreference) => c.channel === incoming.channel);
        if (idx >= 0) {
          if (incoming.enabled  !== undefined) prefs.channelPrefs[idx].enabled  = incoming.enabled;
          if (incoming.address  !== undefined) prefs.channelPrefs[idx].address  = incoming.address;
        } else {
          prefs.channelPrefs.push(incoming as IChannelPreference);
        }
      }
    }

    // Merge typePrefs
    if (input.typePrefs) {
      for (const incoming of input.typePrefs) {
        if (!incoming.type) continue;
        const idx = prefs.typePrefs.findIndex((t: ITypePreference) => t.type === incoming.type);
        if (idx >= 0) {
          if (incoming.enabled  !== undefined) prefs.typePrefs[idx].enabled  = incoming.enabled!;
          if (incoming.channels !== undefined) prefs.typePrefs[idx].channels = incoming.channels as NotificationChannel[];
        } else {
          prefs.typePrefs.push(incoming as ITypePreference);
        }
      }
    }

    // Quiet hours
    if (input.quietHours !== undefined) {
      Object.assign(prefs.quietHours, input.quietHours);
    }

    // Marketing opt-in
    if (input.marketingEnabled !== undefined) {
      prefs.marketingEnabled = input.marketingEnabled;
    }

    await prefs.save();
    return prefs;
  }

  // ── FCM token ─────────────────────────────────────────────────────────────

  async setFcmToken(userId: string, token: string, organizationId?: string): Promise<void> {
    const prefs = await this.getPreferences(userId, organizationId);
    prefs.fcmToken    = token;
    prefs.pushEnabled = true;

    const pushPref = prefs.channelPrefs.find((c: IChannelPreference) => c.channel === NotificationChannel.PUSH);
    if (pushPref) {
      pushPref.enabled = true;
    } else {
      prefs.channelPrefs.push({ channel: NotificationChannel.PUSH, enabled: true });
    }
    await prefs.save();
    logger.debug(`[PreferenceService] FCM token updated for user ${userId}`);
  }

  async clearFcmToken(userId: string, organizationId?: string): Promise<void> {
    const prefs = await this.getPreferences(userId, organizationId);
    prefs.fcmToken    = undefined;
    prefs.pushEnabled = false;
    await prefs.save();
  }

  // ── Reset to defaults ─────────────────────────────────────────────────────

  async resetToDefaults(userId: string, organizationId?: string): Promise<INotificationPreferenceDocument> {
    const filter: Record<string, unknown> = { userId: new mongoose.Types.ObjectId(userId) };
    if (organizationId) {
      filter.organizationId = new mongoose.Types.ObjectId(organizationId);
    } else {
      filter.organizationId = { $exists: false };
    }

    const prefs = await NotificationPreference.findOneAndUpdate(
      filter,
      { $set: buildDefaults(userId, organizationId) },
      { new: true, upsert: true }
    );
    return prefs;
  }

  // ── Channel-enabled check ─────────────────────────────────────────────────

  async isChannelEnabled(
    userId: string,
    channel: NotificationChannel,
    notificationType?: NotificationType
  ): Promise<boolean> {
    let prefs: INotificationPreferenceDocument | null = null;
    try {
      prefs = await NotificationPreference.findOne({
        userId:         new mongoose.Types.ObjectId(userId),
        organizationId: { $exists: false },
      });
    } catch {
      return channel === NotificationChannel.IN_APP;
    }
    if (!prefs) return channel === NotificationChannel.IN_APP;

    // Type-level override
    if (notificationType) {
      const typePref = prefs.typePrefs.find((t: ITypePreference) => t.type === notificationType);
      if (typePref) {
        if (!typePref.enabled) return false;
        if (typePref.channels?.length) return typePref.channels.includes(channel);
      }
    }

    // Channel-level
    const cp = prefs.channelPrefs.find((c: IChannelPreference) => c.channel === channel);
    return cp?.enabled ?? channel === NotificationChannel.IN_APP;
  }

  // ── Quiet hours check ─────────────────────────────────────────────────────

  /**
   * Returns true when `now` falls inside the user's quiet window
   * (caller should skip non-critical notifications).
   */
  async isInQuietHours(userId: string, now: Date = new Date()): Promise<boolean> {
    const prefs = await NotificationPreference.findOne({
      userId:         new mongoose.Types.ObjectId(userId),
      organizationId: { $exists: false },
    });
    if (!prefs?.quietHours?.enabled) return false;

    const { startHour, endHour, timezone, daysOfWeek } = prefs.quietHours;

    // Get local hour and weekday in user's timezone
    const parts = now.toLocaleString('en-US', {
      timeZone: timezone ?? 'UTC',
      hour12:   false,
      hour:     '2-digit',
      weekday:  'short',
    });
    // parts example: "Mon, 22" (weekday + hour)
    const pieces = parts.split(', ');
    const dayStr  = pieces[0] ?? 'Mon';
    const hourStr = pieces[1] ?? '0';
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayIndex   = dayMap[dayStr]   ?? now.getDay();
    const currentHour = parseInt(hourStr, 10);

    if (Array.isArray(daysOfWeek) && daysOfWeek.length && !daysOfWeek.includes(dayIndex)) return false;

    if (startHour <= endHour) {
      return currentHour >= startHour && currentHour < endHour;
    }
    // Overnight: e.g. 22 → 7
    return currentHour >= startHour || currentHour < endHour;
  }
}

export const preferenceService = new PreferenceService();
export default preferenceService;

