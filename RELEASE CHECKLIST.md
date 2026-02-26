# RELEASE CHECKLIST

Target Release: v1.0.0  
Date: 2026-02-26

## API and Contract
- [x] `/api/v1` contract retained.
- [x] Response envelope standardized (`success`, `data`/`error`, `meta`).
- [x] Request correlation (`X-Request-Id`) active.
- [x] Health/readiness/version endpoints active.

## Authentication and Authorization
- [x] JWT session auth retained.
- [x] API token auth integrated in shared Bearer pipeline.
- [x] Super Admin explicit mode + reason requirements enforced on Super Admin-only actions.
- [x] Scoped super-admin token and impersonation flows are revocable and audited.

## API Token System
- [x] Token types implemented: personal, organization, super_admin.
- [x] Secret shown once at create/rotate only.
- [x] Hash-only token secret storage (argon2).
- [x] Scope enforcement active.
- [x] Org-boundary enforcement active.
- [x] Per-token/org rate limiting active (V1 in-memory + global limiter keying).
- [x] Access logs captured and usage endpoint available.
- [x] Endpoints implemented:
  - [x] `POST /api/v1/auth/tokens`
  - [x] `GET /api/v1/auth/tokens`
  - [x] `GET /api/v1/auth/tokens/:id`
  - [x] `PATCH /api/v1/auth/tokens/:id`
  - [x] `POST /api/v1/auth/tokens/:id/rotate`
  - [x] `POST /api/v1/auth/tokens/:id/revoke`
  - [x] `GET /api/v1/auth/tokens/:id/usage`

## Core Module Readiness
- [x] Farmer, orders, payments, prices, weather, expert portal, analytics, admin modules are mounted and operational.
- [x] New logistics module mounted (`/api/v1/logistics`).
- [x] Idempotency enforced for order placement and payment writes.
- [x] Maintenance mode and feature flags enabled under admin controls.

## Security and Compliance
- [x] Helmet/CORS/body limits active.
- [x] Sensitive actions audited.
- [x] Super Admin privileged operations logged with actor/target/reason context.
- [x] No plaintext secrets persisted.

## Tests and Build
- [x] `npm run build` passes.
- [x] `npm test -- --runInBand` passes.
- [x] supertest integration tests added for API token lifecycle and enforcement.
- [x] `npx eslint src --ext .ts` passes (warnings only).

## Docs and Release Artifacts
- [x] OpenAPI updated (token auth scheme + token routes + logistics routes).
- [x] Gap report produced (`CLYCITES CONCEPT GAP REPORT.md`).
- [x] Implementation plan produced (`V1 IMPLEMENTATION PLAN.md`).
- [x] Release checklist produced (this file).
- [x] `CHANGELOG.md` includes v1.0.0 updates.

## Post-Release Monitoring
- [ ] Monitor token auth failures/scope denials and rate-limit events.
- [ ] Monitor logistics POD upload usage and error rates.
- [ ] Validate audit export flows with Super Admin in staging/prod.
