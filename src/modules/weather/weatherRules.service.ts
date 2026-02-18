/**
 * Weather Rules Service
 *
 * Configurable rules engine that:
 * 1. Loads applicable WeatherRule documents for a farm (respects org policy overrides)
 * 2. Evaluates each rule's conditions against a live weather reading
 * 3. Deduplicates: won't create the same alert type twice within a TTL window
 * 4. Interpolates advisory message templates with actual values
 * 5. Calculates an overall risk score from active signals
 * 6. Ships ready-to-save IWeatherAlert objects to the alert service
 */

import mongoose from 'mongoose';
import logger from '../../common/utils/logger';
import WeatherRule from './weatherRule.model';
import WeatherAlert from './weatherAlert.model';
import {
  IFarmWeatherProfileDocument,
  IWeatherRuleDocument,
  IWeatherReading,
  IWeatherAlert,
  AlertStatus,
  AlertType,
  AlertSeverity,
  RuleOperator,
  IRuleCondition,
  ITriggerRule,
  IWeatherAlertDocument,
} from './weather.types';

// How soon the same alert type can re-fire for the same farm (ms)
const ALERT_DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Default alert TTL
const DEFAULT_ALERT_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// ============================================================================
// Rules Service
// ============================================================================

class WeatherRulesService {

  // ---- Public Entry Point --------------------------------------------------

  /**
   * Run the full rules evaluation pipeline for a farm profile.
   * Returns newly created WeatherAlert documents.
   */
  async generateAlertsForProfile(
    profile: IFarmWeatherProfileDocument,
    reading: IWeatherReading
  ): Promise<IWeatherAlertDocument[]> {
    const rules = await this.getApplicableRules(
      profile.primaryCropTypes ?? [],
      profile.organizationId?.toString()
    );

    const createdAlerts: IWeatherAlertDocument[] = [];

    for (const rule of rules) {
      // Evaluate all conditions (logical AND)
      if (!this.evaluateRule(rule, reading)) continue;

      // Check minimum severity from farmer preferences
      const minSeverity = profile.alertPreferences?.minimumSeverity ?? AlertSeverity.LOW;
      if (!this.meetsSeverityThreshold(rule.severity, minSeverity)) continue;

      // Deduplication: skip if a recent same-type alert already exists
      const isDuplicate = await this.isDuplicateAlert(profile.farmId, rule.alertType);
      if (isDuplicate) {
        logger.debug(`[WeatherRules] Dedup skip: ${rule.alertType} for farm ${profile.farmId}`);
        continue;
      }

      const actualValues = this.extractActualValues(rule.conditions, reading);
      const advisoryMessage = this.interpolateTemplate(rule.advisoryTemplate, {
        ...actualValues,
        farmName: profile.farmName ?? 'your farm',
        alertType: rule.alertType,
      });

      const triggerRule: ITriggerRule = {
        ruleId: rule._id as mongoose.Types.ObjectId,
        ruleName: rule.name,
        thresholds: this.extractThresholds(rule.conditions),
        actualValues,
      };

      const alertData: Omit<IWeatherAlert, 'createdAt' | 'updatedAt'> = {
        farmId:             profile.farmId,
        farmerId:           profile.farmerId,
        organizationId:     profile.organizationId,
        alertType:          rule.alertType,
        severity:           rule.severity,
        triggerRule,
        advisoryMessage,
        recommendedActions: rule.recommendedActions ?? [],
        status:             AlertStatus.NEW,
        deliveryAttempts:   [],
        expiresAt:          new Date(Date.now() + DEFAULT_ALERT_TTL_MS),
        triggeredBy:        'system',
      };

      try {
        const alert = await WeatherAlert.create(alertData);
        createdAlerts.push(alert);
        logger.info(`[WeatherRules] Alert created: ${rule.alertType} (${rule.severity}) for farm ${profile.farmId}`);
      } catch (err) {
        logger.error(`[WeatherRules] Failed to create alert for rule ${rule.name}:`, err);
      }
    }

    return createdAlerts;
  }

  // ---- Rule Evaluation -----------------------------------------------------

  evaluateRule(rule: IWeatherRuleDocument, reading: IWeatherReading): boolean {
    for (const condition of rule.conditions) {
      if (!this.evaluateCondition(condition, reading)) return false;
    }
    return true;
  }

  evaluateCondition(condition: IRuleCondition, reading: IWeatherReading): boolean {
    // Resolve field value from reading (supports nested dot-path)
    const value = this.resolveField(condition.field, reading as unknown as Record<string, unknown>);
    if (value == null) return false;

    const actual = Number(value);
    const threshold = condition.value;

    switch (condition.operator) {
      case RuleOperator.GT:      return actual >  threshold;
      case RuleOperator.GTE:     return actual >= threshold;
      case RuleOperator.LT:      return actual <  threshold;
      case RuleOperator.LTE:     return actual <= threshold;
      case RuleOperator.EQ:      return actual === threshold;
      case RuleOperator.BETWEEN: return actual >= threshold && actual <= (condition.valueTo ?? Infinity);
      default:                   return false;
    }
  }

  /** Resolve a dot-separated field path from an object */
  private resolveField(path: string, obj: Record<string, unknown>): unknown {
    return path.split('.').reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object') {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  // ---- Rule Loading --------------------------------------------------------

  async getApplicableRules(
    cropTypes: string[],
    organizationId?: string
  ): Promise<IWeatherRuleDocument[]> {
    const baseQuery = { isActive: true };

    // Load global rules (no org scope) + org-specific rules
    const orgFilter: Record<string, unknown>[] = [
      { organizationId: null },
    ];
    if (organizationId) {
      orgFilter.push({ organizationId: new mongoose.Types.ObjectId(organizationId) });
    }

    const rules = await WeatherRule.find({
      ...baseQuery,
      $or: orgFilter,
    }).sort({ priority: -1 });

    // Filter by crop type: rule applies if it has no crop restriction, or
    // the farm grows at least one matching crop
    return rules.filter((rule) => {
      if (!rule.cropTypes || rule.cropTypes.length === 0) return true;
      return cropTypes.some((ct) => rule.cropTypes!.includes(ct));
    });
  }

  // ---- Risk Score ----------------------------------------------------------

  /**
   * Calculate a 0-100 composite risk score from a weather reading.
   * Useful for dashboard widgets and summary cards.
   */
  async calculateRiskScore(
    reading: IWeatherReading,
    cropTypes: string[] = [],
    organizationId?: string
  ): Promise<{ score: number; signals: string[] }> {
    const rules = await this.getApplicableRules(cropTypes, organizationId);
    const signals: string[] = [];
    let totalWeight = 0;

    for (const rule of rules) {
      if (!this.evaluateRule(rule, reading)) continue;
      const weight = this.severityWeight(rule.severity);
      totalWeight += weight;
      signals.push(`${rule.alertType}(${rule.severity})`);
    }

    // Cap at 100
    const score = Math.min(100, totalWeight);
    return { score, signals };
  }

  // ---- Seeding Default Rules -----------------------------------------------

  /**
   * Insert the built-in agricultural safety rules if they don't exist.
   * Call once at application boot or via a migration script.
   */
  async seedDefaultRules(createdBy: mongoose.Types.ObjectId): Promise<void> {
    const defaults = this.buildDefaultRules(createdBy);

    for (const rule of defaults) {
      const exists = await WeatherRule.findOne({ name: rule.name, organizationId: null });
      if (!exists) {
        await WeatherRule.create(rule);
        logger.info(`[WeatherRules] Seeded default rule: ${rule.name}`);
      }
    }
  }

  private buildDefaultRules(createdBy: mongoose.Types.ObjectId) {
    return [
      {
        name: 'Heavy Rainfall Alert',
        description: 'Triggers when rainfall intensity exceeds 15 mm/hr',
        alertType: AlertType.HEAVY_RAIN,
        severity: AlertSeverity.HIGH,
        conditions: [{ field: 'rainfallMmPerHour', operator: RuleOperator.GTE, value: 15, unit: 'mm/hr' }],
        advisoryTemplate: 'Heavy rainfall ({{rainfallMmPerHour}} mm/hr) detected at {{farmName}}. Protect crops and ensure drainage.',
        recommendedActions: ['Check field drainage', 'Delay harvesting activities', 'Monitor for waterlogging'],
        priority: 80, isActive: true, version: 1, createdBy,
      },
      {
        name: 'Extreme Heat Alert',
        description: 'Triggers when temperature exceeds 38 °C',
        alertType: AlertType.HEAT_WAVE,
        severity: AlertSeverity.HIGH,
        conditions: [{ field: 'temperatureCelsius', operator: RuleOperator.GTE, value: 38, unit: '°C' }],
        advisoryTemplate: 'High temperature alert: {{temperatureCelsius}}°C at {{farmName}}. Heat stress risk for crops.',
        recommendedActions: ['Irrigate early morning or evening', 'Apply mulch to retain soil moisture', 'Monitor crop wilting'],
        priority: 80, isActive: true, version: 1, createdBy,
      },
      {
        name: 'Frost Warning',
        description: 'Triggers when temperature drops below 2 °C',
        alertType: AlertType.FROST,
        severity: AlertSeverity.HIGH,
        conditions: [{ field: 'temperatureCelsius', operator: RuleOperator.LTE, value: 2, unit: '°C' }],
        advisoryTemplate: 'Frost risk: temperature {{temperatureCelsius}}°C at {{farmName}}. Protect frost-sensitive crops.',
        recommendedActions: ['Cover frost-sensitive plants', 'Apply frost protection sprays', 'Harvest mature crops if possible'],
        priority: 90, isActive: true, version: 1, createdBy,
      },
      {
        name: 'Strong Wind Alert',
        description: 'Triggers when wind speed exceeds 60 km/h',
        alertType: AlertType.STRONG_WIND,
        severity: AlertSeverity.MEDIUM,
        conditions: [{ field: 'windSpeedKph', operator: RuleOperator.GTE, value: 60, unit: 'km/h' }],
        advisoryTemplate: 'Strong winds ({{windSpeedKph}} km/h) expected at {{farmName}}. Secure structures and cover crops.',
        recommendedActions: ['Secure farm structures', 'Stake tall crops', 'Avoid spraying pesticides'],
        priority: 70, isActive: true, version: 1, createdBy,
      },
      {
        name: 'Drought Risk Alert',
        description: 'Triggers when humidity is below 20% combined with high temperature',
        alertType: AlertType.DROUGHT_RISK,
        severity: AlertSeverity.MEDIUM,
        conditions: [
          { field: 'humidity', operator: RuleOperator.LTE, value: 20, unit: '%' },
          { field: 'temperatureCelsius', operator: RuleOperator.GTE, value: 30, unit: '°C' },
        ],
        advisoryTemplate: 'Drought risk conditions: humidity {{humidity}}%, temperature {{temperatureCelsius}}°C at {{farmName}}.',
        recommendedActions: ['Increase irrigation frequency', 'Apply organic mulch', 'Consider drought-resistant varieties'],
        priority: 75, isActive: true, version: 1, createdBy,
      },
      {
        name: 'High Humidity Alert',
        description: 'Triggers when humidity exceeds 90% — risk of fungal disease',
        alertType: AlertType.HIGH_HUMIDITY,
        severity: AlertSeverity.MEDIUM,
        conditions: [{ field: 'humidity', operator: RuleOperator.GTE, value: 90, unit: '%' }],
        advisoryTemplate: 'Very high humidity ({{humidity}}%) at {{farmName}} — conditions favour fungal and bacterial diseases.',
        recommendedActions: ['Inspect crops for disease signs', 'Improve airflow/spacing', 'Consider preventive fungicide'],
        priority: 65, isActive: true, version: 1, createdBy,
      },
      {
        name: 'UV Hazard Alert',
        description: 'Triggers when UV index exceeds 10',
        alertType: AlertType.UV_HAZARD,
        severity: AlertSeverity.LOW,
        conditions: [{ field: 'uvIndex', operator: RuleOperator.GTE, value: 10, unit: 'UVI' }],
        advisoryTemplate: 'Extreme UV radiation (index {{uvIndex}}) at {{farmName}}. Protect yourself and photosensitive crops.',
        recommendedActions: ['Wear sun protection', 'Schedule fieldwork early morning or evening', 'Use shade netting for sensitive seedlings'],
        priority: 50, isActive: true, version: 1, createdBy,
      },
    ];
  }

  // ---- Helpers -------------------------------------------------------------

  private async isDuplicateAlert(
    farmId: mongoose.Types.ObjectId,
    alertType: AlertType
  ): Promise<boolean> {
    const since = new Date(Date.now() - ALERT_DEDUP_WINDOW_MS);
    const count = await WeatherAlert.countDocuments({
      farmId,
      alertType,
      status: { $in: [AlertStatus.NEW, AlertStatus.SENT] },
      createdAt: { $gte: since },
    });
    return count > 0;
  }

  private extractActualValues(
    conditions: IRuleCondition[],
    reading: IWeatherReading
  ): Record<string, number> {
    const values: Record<string, number> = {};
    for (const condition of conditions) {
      const raw = this.resolveField(condition.field, reading as unknown as Record<string, unknown>);
      if (raw != null) values[condition.field] = Number(raw);
    }
    return values;
  }

  private extractThresholds(conditions: IRuleCondition[]): Record<string, number> {
    const thresholds: Record<string, number> = {};
    for (const condition of conditions) {
      thresholds[condition.field] = condition.value;
    }
    return thresholds;
  }

  private interpolateTemplate(
    template: string,
    values: Record<string, unknown>
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
      const val = values[key];
      if (val == null) return `{{${key}}}`;
      return typeof val === 'number' ? val.toFixed(1) : String(val);
    });
  }

  private meetsSeverityThreshold(ruleSeverity: AlertSeverity, minimum: AlertSeverity): boolean {
    const order = [AlertSeverity.LOW, AlertSeverity.MEDIUM, AlertSeverity.HIGH, AlertSeverity.CRITICAL];
    return order.indexOf(ruleSeverity) >= order.indexOf(minimum);
  }

  private severityWeight(severity: AlertSeverity): number {
    const weights: Record<AlertSeverity, number> = {
      [AlertSeverity.LOW]:      15,
      [AlertSeverity.MEDIUM]:   30,
      [AlertSeverity.HIGH]:     50,
      [AlertSeverity.CRITICAL]: 80,
    };
    return weights[severity] ?? 0;
  }
}

export const weatherRulesService = new WeatherRulesService();
export default weatherRulesService;
