# Hyacinth Application — Comprehensive Code Review Prompt

> Use this prompt when submitting the codebase for a deep review.

---

Act as a **principal full-stack engineer, security architect, and clinical-software auditor** with deep expertise in **Electron, React, TypeScript, SQLite, HIPAA/HITECH compliance, and healthcare UX**. I'm sharing my complete application codebase — a desktop medication dispensing and inventory management system built on Electron 28 + React 19 + TypeScript 5.8 + SQLite.

Conduct an exhaustive review across **every dimension below**. For every finding, reference the **exact file path, function/component name, and line number**. Do not summarize generically — be forensic.

---

## 1. Architecture & Structural Integrity

- Evaluate the **separation of concerns** between `src/main/`, `src/renderer/`, and `src/shared/`. Are there cases where renderer code reaches into main-process concerns or vice-versa?
- Assess the **IPC boundary** (`ipc-handlers.ts`, `preload.ts`, `ipc-channels.ts`). Are all channels properly typed end-to-end? Are there any channels defined but never handled, or handled but never invoked?
- Review the **preload bridge** (`contextBridge` exposure). Is the attack surface minimized? Are there any overly permissive API exposures that violate the principle of least privilege?
- Check for **circular dependencies** between modules, contexts, and hooks.
- Evaluate whether **path aliases** (`@main/*`, `@renderer/*`, `@database/*`, `@services/*`) are consistently used or if raw relative imports leak through.
- Is the **module boundary** between database queries (`src/main/database/queries/`) and services (`src/main/services/`) clean, or are services bypassing the query layer?

## 2. Electron-Specific Security

- Is `nodeIntegration` disabled and `contextIsolation` enabled in all `BrowserWindow` configurations?
- Is `webSecurity` enabled? Are there any disabled security flags in dev that leak into production builds?
- Does the **Content Security Policy (CSP)** exist and is it restrictive enough? Check `meta` tags, `session.defaultSession.webRequest` headers, and webpack HTML plugin config.
- Are `shell.openExternal()` calls validated against an allowlist of URL schemes/domains?
- Is **remote module** disabled? Are there any uses of `@electron/remote` that should be replaced with IPC?
- Review `electron-builder` configuration for **code signing**, auto-update channel security (HTTPS pinning, signature verification via `electron-updater`), and ASAR integrity.
- Are **dangerous Electron APIs** (`protocol.registerFileProtocol`, `webContents.executeJavaScript`, `BrowserWindow.loadURL` with user-controlled input) used safely?
- Check that **dev tools** are disabled in production builds and that debug ports are not exposed.

## 3. HIPAA & Healthcare Regulatory Compliance

- **Audit Trail Integrity**: Review `auditService.ts` and the `audit_log` table. Is the SHA-256 checksum chain truly tamper-evident? Can an attacker with database access silently rewrite history by recomputing the chain? Is there an external anchor (e.g., periodic hash export)?
- **Access Controls**: Verify that every IPC handler that reads or mutates PHI (Protected Health Information) checks authentication state. Are there any endpoints reachable while the app is locked?
- **Session Management**: Review `AuthContext.tsx` and the 5-minute inactivity timeout. Is the timeout enforced in the main process or only the renderer? Can a compromised renderer bypass the lock screen?
- **PIN Security**: Review `src/main/security/pin.ts`. Is bcrypt configured with sufficient rounds (≥10)? Is the PIN comparison constant-time? Is the lockout state persisted across app restarts?
- **Data at Rest**: Is the SQLite database encrypted (e.g., SQLCipher)? If not, flag this as a critical HIPAA gap. Review `databaseEncryption.ts` for actual encryption vs. placeholder.
- **Data in Transit**: Even for local IPC, are there any network calls (auto-update, telemetry, crash reporting) that transmit data? Are they encrypted and do they avoid leaking PHI?
- **Minimum Necessary Standard**: Does the app ever expose more patient data than needed for the current operation? Check API responses and component props for over-fetching.
- **Backup Security**: Review `src/main/backup/`. Are backups encrypted? Are they written to a secure location with restricted filesystem permissions?
- **Data Retention & Disposal**: Is there any mechanism to purge records after a retention period? Can data be securely deleted (not just soft-deleted)?

## 4. Database & Data Integrity

- Review the **SQLite schema** (`schema.sql`) for missing indexes on frequently-queried columns (patient lookups, date-range queries on dispensing records, inventory searches).
- Are all **foreign key constraints** properly defined with appropriate `ON DELETE` and `ON UPDATE` actions? Are there any orphan-risk relationships?
- Check the **WAL journal mode** and `SYNCHRONOUS=FULL` settings. Are these applied on every database connection or only the first?
- Review the **migration system** (`src/main/database/migrations/`). Is there version tracking? Can migrations run out of order? Is there rollback support?
- Is `withTransaction<T>` used consistently for all multi-step mutations, or are there non-atomic multi-write operations?
- Are **parameterized queries** used everywhere, or are there string-interpolated SQL statements vulnerable to injection?
- Check for **race conditions** in concurrent read/write patterns. Is the SQLite connection configured with `WAL` mode to allow concurrent reads, and are writes serialized?
- Review seed data (`src/main/database/seeds/`). Does it contain realistic test data that could be mistaken for real PHI if shipped to production?

## 5. Complete User Journey Tracing

Trace each workflow **click-by-click** and flag every gap:

- **Authentication Flow**: App launch → lock screen → PIN entry → validation → unlock → session timeout → re-lock. What happens on app crash during an active session? Is the lock state recovered?
- **Dispensing Workflow**: Select patient → select medication → enter quantity → confirm → record created → audit logged → inventory decremented. Is inventory decremented atomically with the dispensing record? What happens if the write partially fails?
- **Quick Dispense**: Template selection → auto-fill → confirm → record. Are templates validated against current inventory before presenting them?
- **Inventory Management**: View stock → add/adjust → transaction logged. Can a user dispense more than available stock? Is there a real-time stock check or only at form submission?
- **Patient History**: Search → select patient → view history → print/export. Are there pagination limits? What happens with patients who have thousands of records?
- **Draft Saving**: Partial form → navigate away → draft saved → return → draft restored. Are drafts encrypted? Do they expire? Can another user see someone else's drafts?
- **Backup/Restore**: Trigger backup → file written → confirm. Trigger restore → file selected → validation → database replaced → app restarted. What happens if restore is interrupted? Is there a pre-restore backup?
- **Settings Management**: Change setting → save → effect applied. Do settings changes take effect immediately or require restart? Is this communicated to the user?

## 6. State Management & React Patterns

- Review **`AuthContext.tsx`** and **`AlertContext.tsx`**. Are there missing contexts that should exist (e.g., `InventoryContext`, `SettingsContext`)? Is prop-drilling happening where context would be cleaner?
- Check for **stale closures** in hooks — especially `useDatabase.ts`, `useInventory.ts`, and `useAlerts.ts`. Are effect dependency arrays correct and complete?
- Are there **memory leaks** from uncleared intervals/timeouts, unremoved event listeners, or uncancelled async operations in `useEffect` cleanup?
- Review `App.tsx` (450 lines). Is this component doing too much? Should tab routing, layout, and state orchestration be separated?
- Check for **unnecessary re-renders**. Are expensive components memoized (`React.memo`, `useMemo`, `useCallback`) where appropriate? Is context value stability maintained?
- Are **controlled vs. uncontrolled form components** used consistently? Are there mixed patterns that could cause bugs?
- Review `useForm.ts` — does it handle validation, dirty state tracking, submission guards (preventing double-submit), and reset correctly?
- Check `useBarcodeScanner.ts` — how are scan events debounced? What happens if the scanner fires during a modal or locked state?

## 7. Error Handling & Resilience

- Review the **IPC error handling wrapper** in `ipc-handlers.ts`. Does every handler return `{ success, data, error }` consistently? Are error messages sanitized before sending to the renderer (no stack traces leaking internal paths)?
- Are there **unhandled promise rejections** in the main process? Is there a global `unhandledRejection` handler?
- Check every `try/catch` block — are errors logged to `electron-log` with sufficient context (user ID, operation, timestamp)? Are they swallowed silently anywhere?
- What happens when the **SQLite database file is corrupted, locked, or missing**? Is there a recovery path or at minimum a clear error message?
- Review **form submission error handling** in every form component. Does the user always receive feedback on failure? Are error messages actionable?
- Are there **retry mechanisms** for transient failures (database busy, file system locks)?
- Check for **unhandled edge cases**: empty database, first-run experience, expired medications, zero-stock items, maximum integer overflows in quantities.

## 8. UX, Accessibility & Clinical Usability

- **Loading States**: Does every async operation show a loading indicator? Check all `useDatabase` and `useInventory` call sites.
- **Empty States**: What does the user see when there are no patients, no inventory, no dispensing records? Is it a blank screen or a helpful message with a call to action?
- **Error States**: Are error boundaries implemented? What happens when a component throws during render?
- **Keyboard Navigation**: Can the entire app be operated without a mouse? This is critical for clinical environments where staff wear gloves. Check `useKeyboardShortcuts.ts` — are all shortcuts documented and non-conflicting?
- **Focus Management**: After modal close, does focus return to the trigger element? After form submission, is focus moved to the success/error message?
- **ARIA Attributes**: Are all interactive custom components (dropdowns, modals, tabs, alerts) properly labeled with `role`, `aria-label`, `aria-expanded`, `aria-live`, etc.?
- **Color Contrast**: Does the medical color palette (primary, critical, warning, success) meet WCAG 2.1 AA contrast ratios? Check especially red/green indicators which are problematic for colorblind users.
- **Responsive Design**: As an Electron desktop app, is the window resizable? What happens at minimum window sizes? Do tables/forms break at narrow widths?
- **Destructive Action Safeguards**: Are delete/overwrite/adjust operations protected by confirmation dialogs? Is there undo support for reversible actions?
- **Clinical Context**: Are medication names displayed unambiguously (tall-man lettering for look-alike/sound-alike drugs)? Are dosage units always shown adjacent to quantities to prevent errors?
- **Time-Critical UX**: In a dispensing workflow, how many clicks/steps does it take to complete? Can it be done in under 15 seconds for emergency situations?

## 9. TypeScript Type Safety

- Search for `any` types across the entire codebase. Flag every instance and provide the correct type.
- Check for **type assertions** (`as Type`) that bypass the type system. Are they justified or hiding bugs?
- Review **IPC type safety** — is there a single source of truth for request/response types between main and renderer, or can they drift?
- Check `src/renderer/types/` and `src/shared/types.ts` — are there duplicate or conflicting type definitions?
- Are **generic constraints** used properly in hooks and utility functions?
- Review `tsconfig.json` strict flags — are all strict checks enabled? Are there any `@ts-ignore` or `@ts-expect-error` comments?
- Check for **implicit `any`** from untyped third-party libraries. Are there missing `@types/*` packages?

## 10. Testing Coverage & Quality

- What is the **actual test coverage** percentage? Are critical paths (dispensing, auth, inventory adjustment) tested?
- Review existing tests (`src/__tests__/`). Do they test behavior or implementation details? Are they brittle (coupled to DOM structure) or resilient?
- Are **IPC handlers tested** in isolation? Is the database query layer tested with a real SQLite instance or only mocked?
- Check E2E tests (`e2e/`). Do they cover the **happy path AND failure paths** for each workflow?
- Are there tests for **security boundaries** — locked app state, PIN lockout, session timeout, unauthorized IPC calls?
- Are there tests for **data integrity** — concurrent access, transaction rollback, audit chain validation?
- Review `setupTests.ts` and mock configurations. Are mocks realistic or do they mask real bugs?
- Are **edge cases** tested: empty inputs, maximum-length inputs, special characters in patient names, Unicode, SQL-injection attempts in search fields?

## 11. Performance & Resource Management

- Profile the **SQLite query performance**. Are there N+1 queries (e.g., loading dispensing records then fetching patient names individually)?
- Check **Electron memory usage**. Are large datasets (full patient list, complete inventory) loaded into renderer memory at once, or is there virtualization/pagination?
- Review **bundle size**. Run webpack-bundle-analyzer — are there unnecessary large dependencies included?
- Check for **memory leaks** in long-running sessions: uncleaned listeners, growing arrays, cached data that's never evicted.
- Is **IPC traffic** efficient? Are there chatty IPC calls that could be batched? Are large payloads (reports, full tables) serialized efficiently?
- Review `activityMonitoring.ts` — does the monitoring itself consume excessive resources (high-frequency polling, excessive event listeners)?

## 12. Build, Deployment & DevOps

- Review **webpack configurations** (`.erb/configs/`). Are source maps disabled in production? Are environment variables properly segregated between dev and prod?
- Check **electron-builder configuration**. Are all platforms targeted? Is code signing configured?
- Is there a **CI/CD pipeline** (`.github/workflows/`)? If missing, flag this as a gap.
- Review **dependency versions** in `package.json`. Are there known CVEs in any dependencies? Run `npm audit` mentally against the dependency list.
- Check for **dev dependencies leaking into production** builds.
- Is there a **versioning strategy**? Is the version in `package.json` updated consistently with `CHANGELOG.md`?

## 13. Code Quality & Maintainability

- Identify **dead code**: unused exports, unreachable branches, commented-out code blocks that aren't clearly documented TODOs.
- Check for **code duplication** — are there repeated patterns across components that should be extracted into shared utilities or hooks?
- Review **naming conventions** — are they consistent across the codebase (camelCase, PascalCase, SCREAMING_SNAKE)?
- Are **magic numbers and strings** extracted into named constants?
- Evaluate **file organization** — are files in the right directories? Are there files that have grown too large and should be split?
- Check for **TODO/FIXME/HACK comments** — list every one with its location and assess urgency.

## 14. Incomplete & Phantom Features

- Identify every **function/component that is declared but empty or returns placeholder content**.
- List every **UI element** (button, link, menu item, tab) that is rendered but has no handler or a no-op handler.
- Check every **IPC channel** defined in `ipc-channels.ts` — are all of them implemented in `ipc-handlers.ts` and consumed by the renderer?
- Flag any **database tables or columns** that are defined in the schema but never read from or written to by the application code.
- Identify **routes, views, or tabs** that are referenced in navigation but don't render meaningful content.
- Check if **print/export/report features** are fully functional or stub implementations.

## 15. Missing Features (Domain-Specific)

Based on the app's clinical medication dispensing purpose, flag if these are absent:

- **Drug interaction checking** when dispensing multiple medications to the same patient
- **Lot number and expiration date tracking** for inventory items
- **Controlled substance logging** with witness/co-sign requirements (DEA Schedule II-V)
- **Barcode/scan verification** matching scanned medication to selected medication before dispensing
- **Role-based access control** beyond admin/dispenser (e.g., pharmacist, nurse, supervisor)
- **Multi-facility or multi-location** inventory support
- **Automated reorder alerts** when stock drops below configurable thresholds
- **Patient allergy/contraindication alerts** during dispensing
- **Medication administration record (MAR)** integration or export
- **Reporting**: Usage trends, waste tracking, expiration forecasting, staff activity reports
- **Data export** in standard healthcare formats (HL7 FHIR, CSV, PDF)
- **Offline resilience** — does the app degrade gracefully if the filesystem is read-only or disk is full?

---

## Severity Classification

Rate each finding as:

| Severity | Criteria |
|---|---|
| **🔴 CRITICAL** | Security vulnerability, data loss risk, HIPAA violation, app-crashing bug, or silent data corruption |
| **🟠 HIGH** | Broken workflow, data integrity concern, significant functionality gap, or compliance risk |
| **🟡 MEDIUM** | Incomplete feature, poor UX that causes confusion/errors, missing validation, or technical debt that blocks future work |
| **🔵 LOW** | Code quality improvement, minor UX polish, performance optimization, or maintainability enhancement |
| **🟢 SUGGESTION** | Nice-to-have improvement, future feature consideration, or best-practice alignment |

---

## Response Format

For **each finding**, provide:

```
### [SEVERITY] Finding Title
**Location**: `file/path.ts:line_number` → `functionOrComponentName`
**Issue**: What is wrong, specifically.
**Impact**: Why this matters (clinical risk, data loss, security, user confusion, etc.)
**Fix**: Exact code change or implementation steps. Show before/after code where applicable.
**Priority**: Immediate / Next Sprint / Backlog
```

At the end, provide:
1. **Executive Summary**: Top 5 most critical findings ranked by risk
2. **Technical Debt Score**: Rate 1-10 with justification
3. **HIPAA Readiness Assessment**: Pass/Fail with gaps listed
4. **Recommended Priority Roadmap**: Ordered list of fixes grouped by sprint
