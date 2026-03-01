# CLYCITES CONCEPT GAP REPORT

Date: 2026-02-26  
Repository: `d:\projects\ClyCites\Clycites-api-upgrade`

## Assumptions (Inferred Defaults)
- V1 prioritizes secure API parity and platform coherence over deep ERP-grade workflows.
- Existing modules with broad route coverage (weather, expert portal, analytics, prices, orders, notifications, media, security) are retained and hardened, not rewritten.
- Logistics V1 is implemented as a first-class module for shipment lifecycle + proof of delivery (POD) and can evolve into provider adapters in V2.
- API token auth is additive and must coexist with JWT session auth without breaking existing clients.
- Super Admin is a dedicated role (`super_admin`) and all privileged overrides remain explicit + audited.

## Repository Scan Summary

### Mounted Route Groups (`/api/v1/...`)
- `auth`, `farmers`, `farmers/legacy`, `products`, `listings`, `orders`, `disputes`, `offers`, `payments`, `prices`, `pricing`, `markets`, `market-intelligence`, `organizations`, `users`, `security`, `audit`, `notifications`, `messaging`, `analytics`, `weather`, `pest-disease`, `expert-portal`, `media`, `reputation`, `admin`, `logistics`, `health`, `ready`, `version`.

### Controllers discovered
- 27 controller files across modules (including new `logistics.controller.ts`).

### Models discovered
- 68 model files (including new `apiToken.model.ts`, `apiAccessLog.model.ts`, `collectionPoint.model.ts`, `shipment.model.ts`, and idempotency/platform models).

### Middleware discovered
- 13 middleware files (including request context, super-admin controls, idempotency, maintenance mode, feature-flag guard, API token usage logging).

## Module Gap Matrix

### 1) Farmer & Farm Management
- Exists: Farmer profile, farm entities, farmer enterprise and production records, legacy compatibility routes.
- Missing pre-audit: Cross-cutting consistency for response metadata and privileged override path.
- Implemented now:
  - Standardized response meta (`requestId`, impersonation marker).
  - Centralized super-admin override compatibility through shared authz middleware.
- Residual V2: Expanded offline sync conflict-resolution endpoints and i18n payload packs.

### 2) Extension & Expert Support
- Exists: Expert profiles, case workflows, advisory feed, inquiries, knowledge base and article operations.
- Missing pre-audit: Uniform token-scope based integration access.
- Implemented now:
  - API token auth applies to expert endpoints via shared auth middleware and scope enforcement.
- Residual V2: Minimal community forum module not yet added.

### 3) E-Market Core
- Exists: Product catalog, listings, offers, orders, disputes, returns-like dispute flow.
- Missing pre-audit: Idempotency and super-admin coverage consistency in some critical paths.
- Implemented now:
  - Idempotency on order placement.
  - Admin-like checks expanded to include Super Admin in orders/disputes.
- Residual V2: RFQ buyer procurement module and richer invoicing templates.

### 4) Pricing + Market Intelligence
- Exists: Historical prices, analytics, trend endpoints, prediction stubs.
- Missing pre-audit: Emergency price freeze control.
- Implemented now:
  - Feature-flag controlled `priceFreeze` guard on mutating price endpoints.
  - Scoped Super Admin override support.
- Residual V2: Explainability payload expansion and model registry depth.

### 5) Logistics & Distribution
- Exists pre-audit: No dedicated logistics bounded context.
- Missing pre-audit: Collection points, shipments, tracking, POD.
- Implemented now:
  - New `logistics` module:
    - Collection points and warehouse management
    - Shipment creation/list/get
    - Shipment status updates and tracking events
    - Proof-of-delivery upload/metadata endpoint with file limits/type validation
  - Mounted under `/api/v1/logistics` and documented in OpenAPI.
- Residual V2: Provider adapters, route optimization, SLA dashboards.

### 6) Weather + Alerts
- Exists: Weather ingestion, forecasts, alert rules/subscriptions, weather analytics.
- Missing pre-audit: Global admin suppression/broadcast abstraction clarity.
- Implemented now:
  - Shared token scope + auth framework coverage for weather protected routes.
- Residual V2: Carrier-grade channel routing and advanced alert suppression policy editor.

### 7) Payments & Transactions
- Exists: Wallet, transaction, escrow, webhook stubs.
- Missing pre-audit: Idempotency consistency and data-shape defects.
- Implemented now:
  - Idempotency on payment mutations.
  - Fixed payment transaction schema field mismatches and refund argument ordering.
  - Improved sensitive audit logging paths.
- Residual V2: Deeper reconciliation dashboard and payout provider adapters.

### 8) Analytics (Enterprise + Admin)
- Exists: KPI-style analytics endpoints, chart schema + dashboards + sharing/export.
- Missing pre-audit: Super-admin global analytics gating consistency.
- Implemented now:
  - Super-admin effective permission path and scoped privileged access compatibility.
- Residual V2: Query governance UI and workload budgets.

### 9) Admin & Compliance
- Exists: User admin routes, audit module, moderation-adjacent controls.
- Missing pre-audit: Maintenance/feature flag operations and centralized privileged audit semantics.
- Implemented now:
  - Platform control endpoints for maintenance mode and feature flags.
  - Centralized super-admin action auditing middleware.
  - Request correlation IDs throughout.
- Residual V2: Compliance-ready export orchestration workflows.

## Token Access Coverage (Required)

### Implemented Capabilities
- Token types: `personal`, `organization`, `super_admin`.
- Properties implemented:
  - `tokenId`, `name`, `description`, `tokenPrefix`, `tokenHash`, `createdBy`, `organization`, `scopes`, `rateLimit`, `status`, `expiresAt`, `lastUsedAt`, `lastUsedIp`, `allowedIps`, timestamps, revoke metadata.
- Security rules implemented:
  - Secret shown once at create/rotate.
  - Hash-only storage (argon2).
  - Bearer token auth support in shared auth middleware.
  - Scope enforcement by resource/action and wildcard rules.
  - Org boundary enforcement for org-bound tokens.
  - In-memory per-token/org minute rate limiting + global limiter keying by token/user/IP.
  - API access logs collection and usage aggregation endpoint.
  - Audit logs for create/update/rotate/revoke.
- Endpoints implemented (`/api/v1/auth/...`):
  - `POST /tokens`
  - `GET /tokens`
  - `GET /tokens/:id`
  - `PATCH /tokens/:id`
  - `POST /tokens/:id/rotate`
  - `POST /tokens/:id/revoke`
  - `GET /tokens/:id/usage`

### Test Coverage Added
- supertest integration for:
  - creation + one-time secret visibility
  - scope enforcement
  - org boundary enforcement
  - per-token rate limiting
  - rotation + revocation
  - usage stats
  - audit event emission

## New/Updated Deliverables in Repo
- `CLYCITES CONCEPT GAP REPORT.md` (this file)
- `V1 IMPLEMENTATION PLAN.md`
- `RELEASE CHECKLIST.md`
- `CHANGELOG.md` updated for v1.0.0
