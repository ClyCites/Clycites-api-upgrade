/**
 * Weather Module Routes
 *
 * Base: /api/v1/weather
 *
 * Profiles:
 *   POST   /profiles                       → create profile
 *   GET    /profiles/me                    → my profiles
 *   GET    /profiles/:id                   → get profile
 *   PATCH  /profiles/:id                   → update profile
 *   DELETE /profiles/:id                   → soft-delete profile
 *
 * Conditions / Snapshots:
 *   GET    /profiles/:profileId/conditions          → latest reading
 *   GET    /profiles/:profileId/conditions/history  → paginated history
 *
 * Forecasts:
 *   GET    /profiles/:profileId/forecast            → latest forecast (?horizon=daily)
 *   GET    /profiles/:profileId/forecast/summary    → today/tomorrow/weekly
 *   GET    /profiles/:profileId/forecast/risk       → risk breakdown
 *   GET    /profiles/:profileId/forecast/accuracy   → vs actual (?date=)
 *   GET    /profiles/:profileId/dashboard           → combined dashboard
 *
 * Alerts:
 *   GET    /profiles/:profileId/alerts        → alerts for a farm
 *   GET    /alerts/:id                        → single alert
 *   POST   /alerts/:id/acknowledge            → acknowledge
 *   POST   /alerts/:id/dismiss                → dismiss
 *   GET    /org/:orgId/alerts                 → org-wide alerts
 *   GET    /alerts/stats                      → counts by severity/type
 *
 * Rules:
 *   GET    /rules                             → list active rules
 *   POST   /rules                             → create rule
 *   GET    /rules/:id                         → get rule
 *   PATCH  /rules/:id                         → update rule
 *   DELETE /rules/:id                         → soft-delete rule
 *   POST   /rules/seed                        → seed defaults (admin)
 *
 * Admin / Ingest:
 *   POST   /admin/refresh                           → refresh all profiles
 *   POST   /admin/profiles/:profileId/refresh       → refresh one profile
 *   POST   /admin/retry-deliveries                  → retry failed alerts
 *   POST   /admin/expire-alerts                     → expire old alerts
 *   POST   /admin/prune-snapshots                   → prune old snapshots
 *   GET    /admin/providers                         → provider health
 */

import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';

import * as controller from './weather.controller';
import * as validators from './weather.validator';

const router = Router();

// ============================================================================
// Profiles
// ============================================================================

router.post(
  '/profiles',
  authenticate,
  authorize('farmer', 'platform_admin'),
  validate(validators.createProfileValidator),
  controller.createProfile
);

router.get(
  '/profiles/me',
  authenticate,
  controller.getMyProfiles
);

router.get(
  '/profiles',
  authenticate,
  validate(validators.listProfilesValidator),
  controller.listProfiles
);

router.get(
  '/profiles/:id',
  authenticate,
  validate(validators.profileIdValidator),
  controller.getProfileById
);

router.patch(
  '/profiles/:id',
  authenticate,
  validate(validators.updateProfileValidator),
  controller.updateProfile
);

router.delete(
  '/profiles/:id',
  authenticate,
  validate(validators.profileIdValidator),
  controller.deleteProfile
);

// ============================================================================
// Current Conditions & Snapshot History
// ============================================================================

router.get(
  '/profiles/:profileId/conditions',
  authenticate,
  validate(validators.profileIdParamValidator),
  controller.getCurrentConditions
);

router.post(
  '/profiles/:profileId/conditions',
  authenticate,
  validate(validators.createConditionValidator),
  controller.createCondition
);

router.get(
  '/profiles/:profileId/conditions/history',
  authenticate,
  validate(validators.profileIdParamValidator),
  controller.getSnapshotHistory
);

router.get(
  '/conditions/:readingId',
  authenticate,
  validate(validators.readingIdValidator),
  controller.getConditionById
);

router.patch(
  '/conditions/:readingId',
  authenticate,
  validate(validators.updateConditionValidator),
  controller.updateConditionById
);

// ============================================================================
// Forecasts
// ============================================================================

router.get(
  '/profiles/:profileId/forecast',
  authenticate,
  validate([...validators.profileIdParamValidator, ...validators.forecastQueryValidator]),
  controller.getLatestForecast
);

router.post(
  '/profiles/:profileId/forecast/refresh',
  authenticate,
  validate(validators.profileIdParamValidator),
  controller.refreshForecast
);

router.get(
  '/profiles/:profileId/forecast/history',
  authenticate,
  validate([...validators.profileIdParamValidator, ...validators.forecastHistoryValidator]),
  controller.getForecastHistory
);

router.get(
  '/profiles/:profileId/forecast/summary',
  authenticate,
  validate(validators.profileIdParamValidator),
  controller.getForecastSummary
);

router.get(
  '/profiles/:profileId/forecast/risk',
  authenticate,
  validate([...validators.profileIdParamValidator, ...validators.forecastQueryValidator]),
  controller.getRiskForecast
);

router.get(
  '/profiles/:profileId/forecast/accuracy',
  authenticate,
  validate(validators.profileIdParamValidator),
  controller.compareForecastVsActual
);

router.get(
  '/profiles/:profileId/dashboard',
  authenticate,
  validate(validators.profileIdParamValidator),
  controller.getDashboard
);

// ============================================================================
// Alerts
// ============================================================================

router.get(
  '/profiles/:profileId/alerts',
  authenticate,
  validate([...validators.profileIdParamValidator, ...validators.listAlertsValidator]),
  controller.listAlerts
);

router.get(
  '/alerts/stats',
  authenticate,
  controller.getAlertStats
);

router.get(
  '/alerts/:id',
  authenticate,
  validate(validators.alertIdValidator),
  controller.getAlert
);

router.post(
  '/alerts/:id/acknowledge',
  authenticate,
  validate(validators.alertIdValidator),
  controller.acknowledgeAlert
);

router.post(
  '/alerts/:id/dismiss',
  authenticate,
  validate(validators.alertIdValidator),
  controller.dismissAlert
);

router.post(
  '/alerts/:id/escalate',
  authenticate,
  validate(validators.escalateAlertValidator),
  controller.escalateAlert
);

router.get(
  '/org/:orgId/alerts',
  authenticate,
  authorize('platform_admin', 'trader'),
  validate([...validators.orgIdParamValidator, ...validators.listAlertsValidator]),
  controller.getOrgAlerts
);

// ============================================================================
// Rules Engine
// ============================================================================

router.get(
  '/rules',
  authenticate,
  controller.listRules
);

router.post(
  '/rules/seed',
  authenticate,
  authorize('platform_admin'),
  controller.seedDefaultRules
);

router.post(
  '/rules',
  authenticate,
  authorize('platform_admin'),
  validate(validators.createRuleValidator),
  controller.createRule
);

router.post(
  '/rules/:id/test',
  authenticate,
  validate(validators.testRuleValidator),
  controller.testRule
);

router.get(
  '/rules/:id',
  authenticate,
  validate(validators.ruleIdValidator),
  controller.getRuleById
);

router.patch(
  '/rules/:id',
  authenticate,
  authorize('platform_admin'),
  validate(validators.updateRuleValidator),
  controller.updateRule
);

router.delete(
  '/rules/:id',
  authenticate,
  authorize('platform_admin'),
  validate(validators.ruleIdValidator),
  controller.deleteRule
);

// ============================================================================
// Admin / Ingest
// ============================================================================

router.post(
  '/admin/refresh',
  authenticate,
  authorize('platform_admin'),
  controller.refreshAllProfiles
);

router.post(
  '/admin/profiles/:profileId/refresh',
  authenticate,
  authorize('platform_admin'),
  validate(validators.profileIdParamValidator),
  controller.manualRefresh
);

router.post(
  '/admin/retry-deliveries',
  authenticate,
  authorize('platform_admin'),
  controller.retryFailedDeliveries
);

router.post(
  '/admin/expire-alerts',
  authenticate,
  authorize('platform_admin'),
  controller.expireOldAlerts
);

router.post(
  '/admin/prune-snapshots',
  authenticate,
  authorize('platform_admin'),
  controller.pruneSnapshots
);

router.get(
  '/admin/providers',
  authenticate,
  authorize('platform_admin'),
  controller.getProviderStatus
);

router.post(
  '/admin/simulate',
  authenticate,
  authorize('platform_admin'),
  validate(validators.simulateAlertValidator),
  controller.simulateAlert
);

export default router;
