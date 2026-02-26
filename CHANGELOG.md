# Changelog

All notable changes to this project are documented in this file.

## [1.0.0] - 2026-02-26

### Added
- Centralized Super Admin middleware (`superAdmin`) for explicit mode, scope, and override checks.
- Super Admin audit middleware with actor/target/action/reason/timestamp/requestId metadata logging.
- Request context middleware with `X-Request-Id` passthrough/generation.
- Idempotency middleware and persistence model for mutation replay safety.
- Maintenance mode guard and platform control module (`/api/v1/admin/system/maintenance`, `/api/v1/admin/system/feature-flags`).
- Super Admin scoped token grant lifecycle endpoints.
- Super Admin impersonation session lifecycle endpoints.
- Health readiness/version endpoints (`/api/v1/ready`, `/api/v1/version`).
- Price freeze emergency guard via feature flags on mutating price endpoints.
- New tests for Super Admin behavior, response metadata, idempotency, and feature-flag safety.
- Enterprise API token platform:
  - token models (`apiToken`, `apiAccessLog`)
  - token lifecycle endpoints under `/api/v1/auth/tokens`
  - one-time secret creation/rotation semantics
  - scope and organization-boundary enforcement
  - token usage stats and access logging
- Logistics V1 module under `/api/v1/logistics`:
  - collection points/warehouses
  - shipment lifecycle + tracking updates
  - proof-of-delivery upload/metadata (5MB limit with file type validation)
- API token access logger middleware and token-aware authentication identity propagation.
- Supertest integration suite validating token lifecycle, scope/org boundaries, revocation/rotation, usage, and rate limits.

### Changed
- Standard response helper now includes request metadata and impersonation metadata.
- Authorization and permission middleware now use centralized Super Admin bypass checks.
- Auth token/session validation now supports revocable Super Admin grant and impersonation session context.
- OpenAPI components and path docs updated for admin/auth privileged controls.
- OpenAPI now documents logistics routes and API token access patterns/scopes.
- Seed script updated to use `super_admin` bootstrap role.

### Fixed
- Payments transaction schema mismatch issues (`sender`/`recipient` corrected to `from`/`to`).
- Refund service call argument ordering bug.
- Organization owner boolean type regression in authorization service.
- Farmer identity context propagation (`farmerId`) in token generation flow.

### Security
- Super Admin-only actions require explicit elevated mode with mandatory reason.
- Sensitive financial/order operations now enforce idempotency keys.
- Maintenance mode and feature flags allow emergency platform controls with auditability.

### Operational Notes
- Build: pass (`npm run build`).
- Tests: pass (`npm test -- --runInBand`).
- Lint on `src`: pass with warnings (`npx eslint src --ext .ts`).
