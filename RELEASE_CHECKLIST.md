# RELEASE CHECKLIST - v1.0.0

Release target date: 2026-02-26

## API Contract and Compatibility
- [x] `/api/v1` route namespace is active.
- [x] Standard response envelope is active for success/error helpers.
- [x] Request correlation metadata (`requestId`) is included in response meta.
- [x] Backward-compatible legacy farmer routes remain mounted under `/api/v1/farmers/legacy`.

## Security and Authorization
- [x] Centralized Super Admin middleware exists.
- [x] Super Admin-only routes require explicit mode and reason headers.
- [x] Scoped Super Admin token grant issuance/revocation exists.
- [x] Impersonation sessions are temporary and revocable.
- [x] Sensitive Super Admin actions are audited with actor/target/action/reason/timestamp/requestId.
- [x] Rate limiting active (auth + sensitive + API).
- [x] Maintenance mode guard implemented.
- [x] Feature flag controls implemented.

## Financial and Order Safety
- [x] Idempotency enforcement on order placement.
- [x] Idempotency enforcement on payment mutations.
- [x] Payment transaction schema usage fixed (`from`/`to`).
- [x] Refund flow argument order fixed.
- [x] Price freeze guard available for mutating price endpoints.

## Data and Multi-Tenancy
- [x] Super Admin override and scope checks are centralized.
- [x] Non-Super-Admin tenant/resource checks remain enforced by existing RBAC/ownership middleware.
- [ ] Dedicated cross-tenant analytics export endpoint family (V2).
- [ ] Dedicated logistics tenant model and constraints (V2).

## Platform Readiness
- [x] `/api/v1/health` endpoint active.
- [x] `/api/v1/ready` endpoint active.
- [x] `/api/v1/version` endpoint active.
- [x] OpenAPI updated for new admin/auth privileged endpoints.
- [x] Seed updates include `super_admin` bootstrap role user.

## Quality Gates
- [x] `npm run build` passes.
- [x] `npm test -- --runInBand` passes.
- [x] `npx eslint src --ext .ts` passes with warnings only.

## Release Decision
- [x] V1.0.0 approved for merge/release candidate.
- [ ] Production rollout completed.
