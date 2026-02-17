# Production Readiness Checklist

Last updated: 2026-02-17
Status: Not production ready

## Executive Verdict
Core runtime stabilization improved (type checks pass and key auth/dispense paths were corrected), but this build is still blocked for production by failing tests, unresolved lint debt, and environment-dependent native module test failures.

## Current Validation Snapshot
- `npm run build` -> pass
- `npm run typecheck` -> pass
- `npm run typecheck:main` -> pass
- `npm run lint:main` -> fail (`2224` issues, dominated by `prettier/prettier`, plus `no-use-before-define`, `global-require`, and `no-restricted-syntax` in runtime files)
- `npm run test` -> fail (`6` failed suites, `6` passed suites, `15` failed tests / `493` total)

## Critical Fixes Completed
- [x] PIN verification flow fixed in key renderer flows to use `result.success`.
- [x] Backup scheduler call signature and backup IPC return-shape consistency fixed.
- [x] Backup path handling consolidated to app user-data flows.
- [x] Dispense creation now deducts inventory atomically.
- [x] Void and correction workflows restore inventory and write transaction records.
- [x] Main/renderer type mismatches in preload IPC wrappers significantly reduced.
- [x] Added runtime-focused type gate (`tsconfig.main-runtime.json` + `npm run typecheck:main`).
- [x] Removed dead service exports and several unused imports/locals in main/renderer.

## Release Blockers (Must Fix)

### P0 - Test Reliability and Behavior
- [ ] Resolve failing unit/integration tests.
  - Current hot spots: `src/__tests__/integration/dispensingWorkflow.test.ts`, `src/__tests__/integration/inventoryWorkflow.test.ts`, `src/__tests__/integration/patientSearch.test.ts`, `src/__tests__/components/Input.test.tsx`, `src/__tests__/components/Button.test.tsx`.
- [ ] Resolve encryption test environment mismatch for native SQLite module.
  - Current failure: `src/main/database/encryption.test.ts` due `better-sqlite3` binary compiled against a different Node module version.

### P0 - Lint Baseline for Runtime Paths
- [ ] Reduce `lint:main` failures to an enforceable baseline.
  - Most errors are formatting-only and auto-fixable, but some are runtime-quality issues in `src/main/backup/*` and `src/main/settings/*`.

### P1 - Data/Temporal Robustness
- [ ] Replace hard-coded date assumptions in test fixtures and checks.
  - Current date-sensitive assertions break as calendar time advances (notably inventory expiration flows).
- [ ] Refresh seed/sample inventory expirations to avoid shipping stale demo data.

## Recommended Release Criteria (Go/No-Go)
- [x] `npm run build:main` passes
- [x] `npm run build:renderer` passes
- [x] `npm run typecheck` passes
- [ ] `npm run lint:main` passes (or approved temporary non-format baseline)
- [ ] `npm run test` passes in CI
- [ ] Native module compatibility validated on target runtime/packaged app
- [ ] Backup/restore and audit/security sign-off completed
