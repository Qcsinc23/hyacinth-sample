# Hyacinth Medication Dispensing System — Desktop Redesign PRD

**Version:** 1.0
**Date:** 2026-03-03
**Status:** Draft
**Author:** Engineering Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Background & Motivation](#2-background--motivation)
3. [New Technology Stack](#3-new-technology-stack)
4. [System Architecture](#4-system-architecture)
5. [Data Model & Database](#5-data-model--database)
6. [Medication Catalog & Seeding](#6-medication-catalog--seeding)
7. [New Jersey Label Compliance](#7-new-jersey-label-compliance)
8. [Editable WYSIWYG Label Workflow](#8-editable-wysiwyg-label-workflow)
9. [Feature Requirements](#9-feature-requirements)
10. [UI/UX Design Specifications](#10-uiux-design-specifications)
11. [Security & HIPAA Compliance](#11-security--hipaa-compliance)
12. [Printing Subsystem](#12-printing-subsystem)
13. [Migration Strategy](#13-migration-strategy)
14. [Testing Strategy](#14-testing-strategy)
15. [Deployment & Distribution](#15-deployment--distribution)
16. [Success Metrics](#16-success-metrics)
17. [Risks & Mitigations](#17-risks--mitigations)
18. [Appendices](#appendices)

---

## 1. Executive Summary

Hyacinth is a medication dispensing, inventory tracking, and clinical workflow desktop application purpose-built for the **Hyacinth Health & Wellness Clinic** in New Jersey. The current implementation is built on **Electron + React + TypeScript + Webpack + Tailwind CSS + better-sqlite3**. This PRD defines a complete redesign onto a new technology stack — **Tauri v2 + SvelteKit + Rust + SQLite (via rusqlite)** — to achieve dramatically smaller binaries, stronger security boundaries, native OS printing, and a faster development loop, while preserving every clinical feature and adding the three pillars described in the clinic's blueprint:

1. **Comprehensive CDC-aligned medication catalog seeding** — every regimen from the clinic's treatment protocols seeded with exact strengths, forms, and directions.
2. **New Jersey Board of Pharmacy label compliance (N.J.A.C. 13:39-7.12)** — labels that satisfy every mandatory field.
3. **Editable WYSIWYG label preview** — clinicians see and modify exactly what will print before sending to the printer.

---

## 2. Background & Motivation

### 2.1 Current State

| Dimension | Current Stack | Pain Point |
|---|---|---|
| Runtime | Electron 28 (Chromium + Node.js) | ~150 MB installer; ships full browser engine |
| UI Framework | React 19 + TypeScript | Adequate, but heavy for a single-user desktop tool |
| Bundler | Webpack 5 + Sass + Tailwind | Slow cold builds (~30 s), complex configuration (8 webpack configs) |
| Database | better-sqlite3 via Electron IPC | Works, but Node native module rebuilds are fragile across Electron upgrades |
| Printing | pdf-lib (manual PDF generation) + HTML template | No native printer dialog; label layout done pixel-by-pixel in code |
| Security | Custom PIN auth + SHA-256 audit checksums | Full Node.js runtime in renderer is a wide attack surface |
| Package Size | ~150–200 MB installed | Unacceptable for clinic machines with limited disk |

### 2.2 Why Redesign

- **Bundle size**: Tauri apps ship at 5–15 MB vs. 150+ MB for Electron.
- **Security**: Tauri's Rust backend has no full Node runtime exposed to the renderer; IPC is allow-listed per command.
- **Native printing**: Tauri v2 exposes native OS print dialogs and printer enumeration.
- **Performance**: Rust-backed SQLite (rusqlite) is 2-5x faster than better-sqlite3 for batch operations.
- **Developer experience**: SvelteKit has sub-second HMR and dramatically less boilerplate than React + Webpack.
- **Compliance**: A ground-up redesign lets us bake NJ pharmacy label requirements into the architecture rather than patching them onto legacy templates.

---

## 3. New Technology Stack

### 3.1 Stack Overview

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Desktop Shell** | Tauri v2 | 2.x | Lightweight native window, IPC, system tray, auto-updater |
| **Backend / Core** | Rust | 1.75+ | IPC command handlers, database, PDF generation, encryption |
| **Frontend Framework** | SvelteKit | 2.x | Reactive UI, routing, component library |
| **Styling** | UnoCSS (Tailwind-compatible) | latest | Utility-first CSS with near-zero runtime overhead |
| **Database** | SQLite via rusqlite | 0.31+ | Local encrypted database, FTS5 full-text search |
| **PDF Generation** | printpdf (Rust) | 0.7+ | NJ-compliant label PDFs generated in Rust |
| **Label Printing** | Tauri print plugin + native OS | — | Native printer selection, Avery 5160 and 4x6 support |
| **Testing** | Vitest (unit) + Playwright (E2E) | latest | Fast unit tests, cross-platform E2E |
| **Build** | Vite (via SvelteKit) | 6.x | Sub-second HMR, <5 s production builds |
| **Packaging** | Tauri Bundler | 2.x | NSIS (Windows), DMG (macOS), AppImage (Linux) |

### 3.2 Key Technical Decisions

**Why Tauri over Electron?**
- 10x smaller binaries (5–15 MB vs. 150+ MB)
- No Chromium bundled — uses the OS webview (WebView2 on Windows, WebKit on macOS/Linux)
- Rust backend provides memory safety without garbage collection
- Allow-list IPC model: renderer can only call explicitly exposed Rust commands

**Why SvelteKit over React?**
- Compiles away the framework at build time — smaller JS bundle, faster rendering
- Built-in reactivity without `useState`/`useEffect` ceremony
- Native two-way binding ideal for the editable label form workflow
- File-based routing eliminates react-router boilerplate

**Why rusqlite over better-sqlite3?**
- No native Node module rebuilds on OS/arch changes
- Direct Rust integration — no IPC serialization overhead for db calls
- Built-in SQLCipher support for encrypted-at-rest database
- Compile-time SQL checking via `rusqlite::params!`

---

## 4. System Architecture

### 4.1 High-Level Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      Tauri v2 Shell                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                 OS WebView (Renderer)                 │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │              SvelteKit Frontend                 │  │  │
│  │  │                                                │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌───────────────┐  │  │  │
│  │  │  │DispenseUI│ │Inventory │ │  Label Editor  │  │  │  │
│  │  │  │  Module   │ │  Module  │ │   (WYSIWYG)   │  │  │  │
│  │  │  └──────────┘ └──────────┘ └───────────────┘  │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌───────────────┐  │  │  │
│  │  │  │ Reports  │ │ Settings │ │  Med Guide    │  │  │  │
│  │  │  └──────────┘ └──────────┘ └───────────────┘  │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                        │ invoke()                     │  │
│  └────────────────────────┼──────────────────────────────┘  │
│                           │ Tauri IPC (JSON-RPC)            │
│  ┌────────────────────────┼──────────────────────────────┐  │
│  │              Rust Backend (src-tauri/)                 │  │
│  │                                                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │  │
│  │  │  Auth &      │  │  Dispensing  │  │   Printing   │  │  │
│  │  │  Security    │  │  Service     │  │   Service    │  │  │
│  │  └─────────────┘  └─────────────┘  └──────────────┘  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │  │
│  │  │  Inventory   │  │  Audit &    │  │   Backup &   │  │  │
│  │  │  Service     │  │  Logging    │  │   Restore    │  │  │
│  │  └─────────────┘  └─────────────┘  └──────────────┘  │  │
│  │                        │                              │  │
│  │  ┌─────────────────────┴──────────────────────────┐  │  │
│  │  │         Database Layer (rusqlite + SQLCipher)    │  │  │
│  │  │         ┌──────────────────────────────────┐    │  │  │
│  │  │         │        hyacinth.db (encrypted)    │    │  │  │
│  │  │         └──────────────────────────────────┘    │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### 4.2 Directory Structure

```
hyacinth-desktop/
├── src-tauri/                          # Rust backend
│   ├── Cargo.toml
│   ├── tauri.conf.json                 # Tauri config, IPC allow-list
│   ├── src/
│   │   ├── main.rs                     # Entry point, Tauri builder
│   │   ├── commands/                   # IPC command handlers
│   │   │   ├── mod.rs
│   │   │   ├── auth.rs                 # PIN auth, session management
│   │   │   ├── dispensing.rs           # Dispense CRUD, line items
│   │   │   ├── inventory.rs            # Stock receive, adjust, alerts
│   │   │   ├── patients.rs             # Patient CRUD, search
│   │   │   ├── staff.rs                # Staff management
│   │   │   ├── reports.rs              # Report generation
│   │   │   ├── settings.rs             # App settings
│   │   │   └── backup.rs              # Backup/restore
│   │   ├── db/                         # Database layer
│   │   │   ├── mod.rs
│   │   │   ├── connection.rs           # SQLCipher connection pool
│   │   │   ├── schema.rs              # Schema definitions
│   │   │   ├── migrations.rs          # Schema migrations
│   │   │   ├── seed.rs                # Medication catalog seeding
│   │   │   └── queries/
│   │   │       ├── mod.rs
│   │   │       ├── patients.rs
│   │   │       ├── dispensing.rs
│   │   │       ├── inventory.rs
│   │   │       ├── medication_catalog.rs
│   │   │       ├── audit.rs
│   │   │       └── alerts.rs
│   │   ├── print/                      # Printing subsystem
│   │   │   ├── mod.rs
│   │   │   ├── label_generator.rs      # NJ-compliant PDF labels
│   │   │   ├── receipt_generator.rs    # Dispensing receipts
│   │   │   ├── avery5160.rs           # Avery 5160 label layout
│   │   │   └── printer.rs            # Native printer integration
│   │   ├── security/
│   │   │   ├── mod.rs
│   │   │   ├── pin.rs                 # Argon2id PIN hashing
│   │   │   ├── encryption.rs          # SQLCipher key management
│   │   │   └── audit.rs              # Tamper-evident audit log
│   │   └── services/
│   │       ├── mod.rs
│   │       ├── instruction_service.rs  # Medication instruction resolution
│   │       └── alert_service.rs       # Stock/expiry alert engine
│   └── seeds/
│       ├── medication_catalog.sql      # Comprehensive medication data
│       └── dispensing_templates.json   # Template definitions
│
├── src/                                # SvelteKit frontend
│   ├── app.html                        # HTML shell
│   ├── app.css                         # Global styles (UnoCSS entry)
│   ├── lib/
│   │   ├── stores/                     # Svelte stores (state management)
│   │   │   ├── auth.ts
│   │   │   ├── dispensing.ts
│   │   │   ├── inventory.ts
│   │   │   ├── patients.ts
│   │   │   ├── templates.ts
│   │   │   └── toast.ts
│   │   ├── components/
│   │   │   ├── common/                 # Shared UI primitives
│   │   │   │   ├── Button.svelte
│   │   │   │   ├── Input.svelte
│   │   │   │   ├── Select.svelte
│   │   │   │   ├── Modal.svelte
│   │   │   │   ├── Toast.svelte
│   │   │   │   ├── PinInput.svelte
│   │   │   │   ├── DatePicker.svelte
│   │   │   │   └── ConfirmDialog.svelte
│   │   │   ├── layout/
│   │   │   │   ├── Header.svelte
│   │   │   │   ├── TabNav.svelte
│   │   │   │   ├── AlertBanner.svelte
│   │   │   │   └── Footer.svelte
│   │   │   ├── entry-form/
│   │   │   │   ├── EntryFormContainer.svelte
│   │   │   │   ├── PatientLookup.svelte
│   │   │   │   ├── MedicationSelector.svelte
│   │   │   │   ├── MedicationLineItem.svelte
│   │   │   │   ├── ReasonSelector.svelte
│   │   │   │   ├── StaffPinEntry.svelte
│   │   │   │   ├── DaySupplyCalculator.svelte
│   │   │   │   ├── InstructionPreviewCard.svelte   # WYSIWYG label preview
│   │   │   │   └── FormActions.svelte
│   │   │   ├── label-editor/
│   │   │   │   ├── LabelPreview.svelte             # NJ-compliant label preview
│   │   │   │   ├── EditableLabelField.svelte       # Inline-editable field
│   │   │   │   ├── AuxiliaryWarnings.svelte        # Warning badge display
│   │   │   │   └── PrintConfirmation.svelte        # Pre-print review
│   │   │   ├── dispensing-log/
│   │   │   │   ├── SearchBar.svelte
│   │   │   │   ├── LogTable.svelte
│   │   │   │   ├── RecordDetailModal.svelte
│   │   │   │   ├── CorrectionModal.svelte
│   │   │   │   └── VoidModal.svelte
│   │   │   ├── inventory/
│   │   │   │   ├── InventoryDashboard.svelte
│   │   │   │   ├── StockTable.svelte
│   │   │   │   ├── ReceiveStockModal.svelte
│   │   │   │   └── AdjustStockModal.svelte
│   │   │   ├── quick-dispense/
│   │   │   │   ├── QuickDispensePanel.svelte
│   │   │   │   ├── TemplateSelector.svelte
│   │   │   │   ├── FavoritePatients.svelte
│   │   │   │   └── RecentPatients.svelte
│   │   │   ├── reports/
│   │   │   │   ├── ReportsPage.svelte
│   │   │   │   ├── DailySummary.svelte
│   │   │   │   ├── InventoryUsage.svelte
│   │   │   │   ├── Reconciliation.svelte
│   │   │   │   ├── StaffActivity.svelte
│   │   │   │   └── Expiration.svelte
│   │   │   ├── settings/
│   │   │   │   ├── SettingsPanel.svelte
│   │   │   │   ├── BackupPanel.svelte
│   │   │   │   ├── RestorePanel.svelte
│   │   │   │   ├── StaffManagement.svelte
│   │   │   │   └── ProfilePanel.svelte
│   │   │   ├── patient-history/
│   │   │   │   ├── PatientHistoryModal.svelte
│   │   │   │   ├── MedicationTimeline.svelte
│   │   │   │   └── AllergyWarnings.svelte
│   │   │   └── medication-guide/
│   │   │       ├── GuideCard.svelte
│   │   │       └── GuideModal.svelte
│   │   ├── types/
│   │   │   ├── index.ts                # All shared TypeScript types
│   │   │   ├── database.ts             # DB entity types
│   │   │   ├── dispensing.ts           # Dispensing-specific types
│   │   │   └── labels.ts              # Label data types
│   │   ├── utils/
│   │   │   ├── validators.ts
│   │   │   ├── formatters.ts
│   │   │   ├── sanitize.ts
│   │   │   └── constants.ts
│   │   └── tauri/
│   │       ├── commands.ts             # Typed wrappers around invoke()
│   │       └── events.ts              # Tauri event listeners
│   └── routes/
│       ├── +layout.svelte             # Root layout (auth guard, header, nav)
│       ├── +page.svelte               # Redirect to /entry
│       ├── entry/+page.svelte         # Entry form tab
│       ├── log/+page.svelte           # Dispensing log tab
│       ├── inventory/+page.svelte     # Inventory tab
│       ├── guide/+page.svelte         # Medication guide tab
│       └── reports/+page.svelte       # Reports tab
│
├── tests/
│   ├── unit/                          # Vitest unit tests
│   └── e2e/                           # Playwright E2E tests
│
├── uno.config.ts                      # UnoCSS configuration
├── svelte.config.js                   # SvelteKit config (static adapter)
├── vite.config.ts                     # Vite config with Tauri plugin
├── package.json
├── tsconfig.json
└── README.md
```

### 4.3 IPC Contract

All frontend-to-backend communication goes through Tauri's `invoke()` mechanism. Every command is explicitly registered in `tauri.conf.json` under the allow-list.

```rust
// Example Rust command (src-tauri/src/commands/dispensing.rs)
#[tauri::command]
async fn create_dispense(
    state: tauri::State<'_, AppState>,
    input: CreateDispenseInput,
) -> Result<DispenseWithDetails, String> {
    // Validate, insert, decrement inventory, log audit, return
}
```

```typescript
// Example frontend call (src/lib/tauri/commands.ts)
import { invoke } from '@tauri-apps/api/core';

export async function createDispense(input: CreateDispenseInput): Promise<DispenseWithDetails> {
  return invoke('create_dispense', { input });
}
```

---

## 5. Data Model & Database

### 5.1 Database Engine

- **Engine**: SQLite 3.45+ compiled with SQLCipher extension for AES-256-CBC encryption at rest.
- **Rust binding**: `rusqlite` with `bundled-sqlcipher` feature flag.
- **Location**: `{app_data_dir}/hyacinth/hyacinth.db` (encrypted).
- **Full-text search**: FTS5 virtual tables for patient name and medication name searches.

### 5.2 Core Tables

The schema preserves the existing data model with additions for NJ label compliance:

| Table | Purpose | Key Additions for Redesign |
|---|---|---|
| `patients` | Patient demographics | `allergies TEXT` (JSON array), `insurance_info TEXT` |
| `staff` | Clinic staff with PIN auth | `credentials TEXT` (NPI number for prescriber labels) |
| `dispensing_records` | Dispense header | `prescriber_id INTEGER` (NJ label requires prescriber name) |
| `dispensing_line_items` | Medications per dispense | `strength TEXT`, `form TEXT`, `generic_name TEXT`, `generic_substitution_text TEXT` |
| `record_reasons` | Reasons per dispense | No change |
| `medication_catalog` | Master medication list | `brand_name TEXT`, `generic_for TEXT` (NJ requires "Generic for [Brand]") |
| `medication_instruction_templates` | Dosing instructions per context | `auxiliary_warnings TEXT` (JSON array for NJ auxiliary labels) |
| `inventory` | Stock tracking | No change |
| `inventory_transactions` | Stock movement audit | No change |
| `inventory_alerts` | Low stock/expiry alerts | No change |
| `audit_log` | Tamper-evident audit trail | `hmac TEXT` (HMAC-SHA256 replaces plain SHA-256) |
| `app_settings` | Key-value settings | `clinic_name`, `clinic_address`, `clinic_phone`, `clinic_license` |
| `drafts` | Saved form drafts | No change |
| `label_print_history` | NEW: Tracks every printed label | `label_data TEXT`, `printed_at TEXT`, `printed_by INTEGER` |

### 5.3 Schema Additions for NJ Compliance

```sql
-- New columns on dispensing_line_items
ALTER TABLE dispensing_line_items ADD COLUMN strength TEXT;
ALTER TABLE dispensing_line_items ADD COLUMN form TEXT;
ALTER TABLE dispensing_line_items ADD COLUMN generic_name TEXT;
ALTER TABLE dispensing_line_items ADD COLUMN generic_substitution_text TEXT;

-- New columns on dispensing_records
ALTER TABLE dispensing_records ADD COLUMN prescriber_id INTEGER REFERENCES staff(id);

-- New columns on medication_catalog
ALTER TABLE medication_catalog ADD COLUMN brand_name TEXT;
ALTER TABLE medication_catalog ADD COLUMN generic_for TEXT;

-- New table: label print history
CREATE TABLE label_print_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dispensing_record_id INTEGER NOT NULL REFERENCES dispensing_records(id),
    line_item_id INTEGER NOT NULL REFERENCES dispensing_line_items(id),
    label_data TEXT NOT NULL,          -- JSON snapshot of label at print time
    template_used TEXT,                -- Template ID if from quick dispense
    was_edited INTEGER DEFAULT 0,      -- 1 if clinician modified before print
    edit_diff TEXT,                     -- JSON diff of what changed
    printed_at TEXT NOT NULL,
    printed_by INTEGER NOT NULL REFERENCES staff(id),
    printer_name TEXT,
    copies_printed INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);
```

---

## 6. Medication Catalog & Seeding

### 6.1 Objective

Every medication referenced in the clinic's CDC-aligned treatment protocols must exist in the database with its **exact default strength, form, generic name, and brand mapping** so that:
- Quick Dispense templates auto-populate correctly
- NJ labels display the precise medication identity
- Generic substitution text is generated automatically

### 6.2 Comprehensive Catalog

The following medications must be seeded. Items marked with **NEW** are additions beyond the current catalog:

| Medication | Generic Name | Strength | Form | Category | NDC |
|---|---|---|---|---|---|
| Biktarvy | bictegravir/emtricitabine/TAF | 50mg/200mg/25mg | Tablet | ARV | 61958-2001-1 |
| Descovy | emtricitabine/TAF | 200mg/25mg | Tablet | ARV | 61958-1801-1 |
| Doxycycline | doxycycline hyclate | 100mg | Capsule | Antibiotic | 68180-0565-1 |
| Bactrim DS | sulfamethoxazole/trimethoprim | 800mg/160mg | Tablet | Antibiotic | 54868-4898-0 |
| Symtuza | darunavir/cobicistat/FTC/TAF | 800mg/150mg/200mg/10mg | Tablet | ARV | 61958-2201-1 |
| Dovato | dolutegravir/lamivudine | 50mg/300mg | Tablet | ARV | 0173-0870-0 |
| Tivicay | dolutegravir | 50mg | Tablet | ARV | 0173-0840-0 |
| Truvada | emtricitabine/TDF | 200mg/300mg | Tablet | ARV | 61958-0901-1 |
| Juluca | dolutegravir/rilpivirine | 25mg/300mg | Tablet | ARV | 0173-0880-0 |
| Cabenuva | cabotegravir/rilpivirine | 400mg/600mg | Injection | ARV | 0007-4893-01 |
| Apretude | cabotegravir ER | 600mg | Injection | ARV | 0007-4985-01 |
| Emtricitabine | emtricitabine | 200mg | Capsule | ARV | 58168-0215-1 |
| Tenofovir DF | tenofovir disoproxil fumarate | 300mg | Tablet | ARV | 61958-0801-1 |
| Azithromycin | azithromycin dihydrate | 250mg | Tablet | Antibiotic | 68180-0545-5 |
| **Azithromycin 1g** | azithromycin dihydrate | **1g** | **Packet** | Antibiotic | **NEW** |
| Ceftriaxone | ceftriaxone sodium | 500mg | Injection | Antibiotic | 0703-0647-11 |
| **Ceftriaxone 250mg** | ceftriaxone sodium | **250mg** | **Injection** | Antibiotic | **NEW** |
| Penicillin G Benzathine (Bicillin L-A) | penicillin G benzathine | 2.4M units | Injection | Antibiotic | 0025-1081-10 |
| Valacyclovir | valacyclovir HCl | 1g | Tablet | Antiviral | 68180-0563-5 |
| **Gentamicin** | gentamicin sulfate | **240mg** | **Injection** | **Antibiotic** | **NEW** |
| **Levofloxacin** | levofloxacin | **500mg** | **Tablet** | **Antibiotic** | **NEW** |
| **Metronidazole** | metronidazole | **500mg** | **Tablet** | **Antibiotic** | **NEW** |
| **Fluconazole** | fluconazole | **150mg** | **Tablet** | **Antifungal** | **NEW** |
| **Acyclovir** | acyclovir | **400mg** | **Tablet** | **Antiviral** | **NEW** |

### 6.3 Dispensing Templates

All templates map to catalog entries and carry full CDC directions. Example additions:

```json
{
  "id": "gentamicin-gonorrhea-alt",
  "name": "Gentamicin + Azithromycin (Gonorrhea Alt)",
  "category": "STI",
  "medicationName": "Gentamicin",
  "strength": "240mg",
  "form": "Injection",
  "quantity": 1,
  "unit": "dose",
  "daySupply": 1,
  "directions": "Inject 240mg intramuscularly as a single dose. MUST be given with Azithromycin 2g PO.",
  "instructions": [
    "For patients with cephalosporin allergy",
    "Observe patient for 30 minutes post-injection",
    "Azithromycin 2g must be co-administered orally"
  ],
  "warnings": ["CDC Alternative Regimen", "Monitor for ototoxicity and nephrotoxicity"],
  "commonReasons": ["Gonorrhea Treatment"]
}
```

```json
{
  "id": "ceftriaxone-gonorrhea",
  "name": "Ceftriaxone (Gonorrhea - CDC Recommended)",
  "category": "STI",
  "medicationName": "Ceftriaxone",
  "strength": "500mg",
  "form": "Injection",
  "quantity": 1,
  "unit": "dose",
  "daySupply": 1,
  "directions": "Administer 500mg intramuscularly as a single dose.",
  "instructions": [
    "CDC recommended first-line therapy for uncomplicated gonorrhea",
    "Administer via intramuscular injection in the deltoid or gluteal muscle",
    "Reconstitute with 1% lidocaine for IM injection to reduce pain"
  ],
  "warnings": [
    "Ask about cephalosporin and penicillin allergies before administration",
    "Test of cure recommended 7-14 days post-treatment for pharyngeal gonorrhea"
  ],
  "commonReasons": ["Gonorrhea Treatment"]
}
```

```json
{
  "id": "azithromycin-chlamydia-pregnant",
  "name": "Azithromycin (Chlamydia - Pregnant)",
  "category": "STI",
  "medicationName": "Azithromycin",
  "strength": "1g",
  "form": "Packet",
  "quantity": 1,
  "unit": "dose",
  "daySupply": 1,
  "directions": "Take 1g (1000mg) by mouth as a single dose.",
  "instructions": [
    "Preferred regimen for pregnant patients with chlamydia",
    "Mix packet contents in water and drink entirely",
    "Take with food to reduce nausea"
  ],
  "warnings": [
    "Test of cure recommended 4 weeks after treatment in pregnant patients",
    "Retest 3 months after treatment"
  ],
  "commonReasons": ["Chlamydia Treatment (Pregnant)"]
}
```

```json
{
  "id": "levofloxacin-pid",
  "name": "Levofloxacin (PID Alternative)",
  "category": "STI",
  "medicationName": "Levofloxacin",
  "strength": "500mg",
  "form": "Tablet",
  "quantity": 14,
  "unit": "tablets",
  "daySupply": 14,
  "directions": "Take 1 tablet by mouth once daily for 14 days.",
  "instructions": [
    "Alternative regimen for Pelvic Inflammatory Disease",
    "Must be combined with Metronidazole 500mg BID x14 days",
    "Take 2 hours before or 2 hours after antacids"
  ],
  "warnings": [
    "Do not take with antacids, iron, or calcium supplements",
    "FDA Black Box: Risk of tendinitis and tendon rupture",
    "Avoid prolonged sun exposure"
  ],
  "commonReasons": ["PID Treatment"]
}
```

```json
{
  "id": "bicillin-la-syphilis",
  "name": "Bicillin L-A (Primary/Secondary Syphilis)",
  "category": "STI",
  "medicationName": "Penicillin G Benzathine",
  "strength": "2.4M units",
  "form": "Injection",
  "quantity": 1,
  "unit": "dose",
  "daySupply": 1,
  "directions": "Administer 2.4 million units by intramuscular injection as a single dose.",
  "instructions": [
    "CDC recommended first-line for primary, secondary, and early latent syphilis",
    "Deep intramuscular injection into the upper outer quadrant of the gluteus",
    "Aspirate before injecting to avoid intravascular administration",
    "Do NOT administer intravenously"
  ],
  "warnings": [
    "Penicillin allergy: MUST assess before administration (anaphylaxis risk)",
    "Jarisch-Herxheimer reaction may occur within 24 hours",
    "Observe patient for 30 minutes post-injection"
  ],
  "commonReasons": ["Syphilis Treatment", "Primary Syphilis", "Secondary Syphilis"]
}
```

### 6.4 Template-to-Catalog Mapping

Every template's `medicationName` + `strength` must resolve to exactly one `medication_catalog` row. The seeding process validates this at startup:

```rust
// src-tauri/src/db/seed.rs (pseudocode)
fn validate_template_catalog_links(conn: &Connection) -> Result<()> {
    for template in load_dispensing_templates()? {
        let count = conn.query_row(
            "SELECT COUNT(*) FROM medication_catalog
             WHERE medication_name = ?1 AND strength = ?2",
            params![template.medication_name, template.strength],
            |row| row.get::<_, i64>(0),
        )?;
        if count == 0 {
            return Err(format!(
                "Template '{}' references medication '{}' {} which is not in the catalog",
                template.id, template.medication_name, template.strength
            ));
        }
    }
    Ok(())
}
```

---

## 7. New Jersey Label Compliance

### 7.1 Regulatory Basis

**N.J.A.C. 13:39-7.12** — New Jersey Board of Pharmacy regulations require the following elements on every prescription label dispensed in the state:

### 7.2 Required Label Fields

| # | Field | Source | Notes |
|---|---|---|---|
| 1 | **Clinic Name** | `app_settings.clinic_name` | "Hyacinth Health & Wellness Clinic" |
| 2 | **Clinic Address** | `app_settings.clinic_address` | Full street address |
| 3 | **Clinic Phone** | `app_settings.clinic_phone` | "(862) 240-1461" |
| 4 | **Patient Full Name** | `patients.first_name + last_name` | UPPERCASE per convention |
| 5 | **Prescriber Name** | `staff.first_name + last_name` (prescriber) | The attending clinician, not the dispensing tech |
| 6 | **Date of Dispensing** | `dispensing_records.dispensing_date` | MM/DD/YYYY format |
| 7 | **Medication Name** | `dispensing_line_items.medication_name` | Brand or generic |
| 8 | **Strength** | `dispensing_line_items.strength` | e.g., "500mg", "2.4M units" |
| 9 | **Dosage Form** | `dispensing_line_items.form` | e.g., "Tablet", "Injection", "Capsule" |
| 10 | **Generic Substitution** | `medication_catalog.generic_for` | "Generic for [Brand Name]" — required when dispensing generic |
| 11 | **Quantity Dispensed** | `dispensing_line_items.amount_value + amount_unit` | e.g., "14 tablets" |
| 12 | **Directions for Use** | `dispensing_line_items.dosing_instructions` | Full text, never truncated |
| 13 | **Rx Number** | Auto-generated | Sequential, prefixed with clinic code |
| 14 | **Use By / Expiration Date** | `inventory.expiration_date` | From the lot dispensed |
| 15 | **Auxiliary Warnings** | `medication_instruction_templates.auxiliary_warnings` | Mandatory auxiliary labels (e.g., "Do not take with antacids") |
| 16 | **Lot Number** | `inventory.lot_number` | Traceable to source |

### 7.3 Label Layout Specification

```
┌──────────────────────────────────────────────────────┐
│  HYACINTH HEALTH & WELLNESS CLINIC                    │
│  [Address Line]                                       │
│  Phone: (862) 240-1461                                │
├──────────────────────────────────────────────────────┤
│  Patient: JOHN DOE                                    │
│  Prescriber: Dr. Jane Smith, NP                       │
│  Date: 03/03/2026           Rx #: HYA-2026-001234    │
├──────────────────────────────────────────────────────┤
│                                                       │
│  DOXYCYCLINE 100mg CAPSULES                           │
│  Generic for: Vibramycin                              │
│                                                       │
│  QTY: 14 capsules (7-day supply)                      │
│                                                       │
│  DIRECTIONS:                                          │
│  Take ONE capsule by mouth twice daily for 7 days.    │
│  Take with food and full glass of water.              │
│  Do NOT lie down for 1 hour after taking.             │
│                                                       │
├──────────────────────────────────────────────────────┤
│  ⚠ AUXILIARY WARNINGS:                                │
│  • Complete FULL 7 days even if feeling better        │
│  • Avoid dairy, antacids, iron for 2 hours            │
│  • Use sunscreen — increases sun sensitivity          │
│  • Sexual partners must also be treated               │
├──────────────────────────────────────────────────────┤
│  Lot: AB12345    Exp: 12/2027    Use By: 12/2027     │
│                                                       │
│  ████████████████████████████ (Barcode)               │
│  HYA-2026-001234                                      │
└──────────────────────────────────────────────────────┘
```

### 7.4 Label Validation Engine

Before any label prints, the Rust backend validates that all 16 NJ-required fields are present and non-empty. If any field is missing, the print is blocked and the UI displays a specific error indicating which field is missing.

```rust
// src-tauri/src/print/label_generator.rs (pseudocode)
pub fn validate_nj_label(data: &LabelData) -> Result<(), Vec<String>> {
    let mut missing = Vec::new();

    if data.clinic_name.is_empty() { missing.push("Clinic Name"); }
    if data.clinic_address.is_empty() { missing.push("Clinic Address"); }
    if data.clinic_phone.is_empty() { missing.push("Clinic Phone"); }
    if data.patient_name.is_empty() { missing.push("Patient Name"); }
    if data.prescriber_name.is_empty() { missing.push("Prescriber Name"); }
    if data.dispense_date.is_empty() { missing.push("Dispense Date"); }
    if data.medication_name.is_empty() { missing.push("Medication Name"); }
    if data.strength.is_empty() { missing.push("Strength"); }
    if data.form.is_empty() { missing.push("Dosage Form"); }
    if data.quantity == 0 { missing.push("Quantity"); }
    if data.directions.is_empty() { missing.push("Directions"); }
    if data.rx_number.is_empty() { missing.push("Rx Number"); }

    if missing.is_empty() { Ok(()) } else { Err(missing) }
}
```

---

## 8. Editable WYSIWYG Label Workflow

### 8.1 Objective

Even with intelligent templates, the clinician **must** be able to alter the dose, quantity, or directions on the fly **before** printing the label. The UI presents a card that looks **exactly like the physical NJ pharmacy label**.

### 8.2 UX Flow

```
Step 1: Clinician selects condition → e.g., "Chlamydia (Pregnant)"
    ↓
Step 2: Template auto-populates → Azithromycin 1g, single dose, directions pre-filled
    ↓
Step 3: WYSIWYG Label Preview Card appears
        - Looks exactly like the physical NJ label
        - All 16 NJ-required fields populated
        - Patient name, prescriber, date auto-filled from context
    ↓
Step 4: Clinician reviews the label preview
        - Everything looks correct? → Click "Print Label"
        - Need to change something? → Click ✏️ Edit icon
    ↓
Step 5 (if editing):
        - Directions field becomes an editable textarea
        - Quantity field becomes an editable number input
        - Warnings can be added/removed
        - Changes are highlighted with a blue border
        - Click "Save Changes" to update the preview
    ↓
Step 6: Click "Print Label"
        - Rust backend validates all 16 NJ fields
        - Generates PDF using printpdf
        - Sends to native printer via Tauri print plugin
        - Records the print in label_print_history (including any edits)
```

### 8.3 Component Design

```svelte
<!-- src/lib/components/label-editor/LabelPreview.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import EditableLabelField from './EditableLabelField.svelte';
  import AuxiliaryWarnings from './AuxiliaryWarnings.svelte';

  export let template;          // DispensingTemplate
  export let patient;           // Patient record
  export let prescriber;        // Staff record (prescriber)
  export let clinicInfo;        // From app_settings
  export let inventoryLot;      // Selected inventory lot

  let isEditing = false;
  let customDirections = template.directions;
  let customQuantity = template.quantity;
  let customWarnings = [...(template.warnings || [])];

  const dispatch = createEventDispatcher();

  function handleSave() {
    isEditing = false;
    dispatch('save', {
      directions: customDirections,
      quantity: customQuantity,
      warnings: customWarnings,
    });
  }

  function handlePrint() {
    dispatch('print', {
      directions: customDirections,
      quantity: customQuantity,
      warnings: customWarnings,
      wasEdited: customDirections !== template.directions
              || customQuantity !== template.quantity,
    });
  }
</script>

<div class="border-2 border-gray-800 rounded-md bg-white shadow-sm font-mono max-w-md">
  <!-- Clinic Header -->
  <div class="border-b-2 border-gray-800 p-3">
    <div class="flex justify-between items-start">
      <div>
        <h4 class="font-bold text-sm">{clinicInfo.name}</h4>
        <p class="text-xs">{clinicInfo.address}</p>
        <p class="text-xs">Phone: {clinicInfo.phone}</p>
      </div>
      <button on:click={() => isEditing = !isEditing} class="text-blue-500 p-1">
        ✏️
      </button>
    </div>
  </div>

  <!-- Patient & Prescriber -->
  <div class="border-b border-gray-400 p-3">
    <p class="font-bold">{patient.firstName} {patient.lastName}</p>
    <p class="text-xs">Prescriber: {prescriber.name}</p>
    <p class="text-xs">
      Date: {new Date().toLocaleDateString()} &nbsp;&nbsp;
      Rx #: {rxNumber}
    </p>
  </div>

  <!-- Medication -->
  <div class="p-3">
    <p class="font-bold text-lg uppercase">
      {template.medicationName} {template.strength}
    </p>
    {#if template.genericFor}
      <p class="text-xs italic">Generic for: {template.genericFor}</p>
    {/if}
    <div class="mt-2">
      <EditableLabelField
        label="QTY"
        bind:value={customQuantity}
        type="number"
        editable={isEditing}
        suffix="{template.unit} ({template.daySupply}-day supply)"
      />
    </div>
  </div>

  <!-- Directions -->
  <div class="bg-gray-100 p-3">
    <p class="text-xs text-gray-500 mb-1 font-bold">DIRECTIONS:</p>
    <EditableLabelField
      bind:value={customDirections}
      editable={isEditing}
      multiline={true}
    />
  </div>

  <!-- Auxiliary Warnings -->
  <AuxiliaryWarnings
    bind:warnings={customWarnings}
    editable={isEditing}
  />

  <!-- Lot & Expiry -->
  {#if inventoryLot}
    <div class="border-t border-gray-400 p-2 text-xs flex justify-between">
      <span>Lot: {inventoryLot.lotNumber}</span>
      <span>Exp: {inventoryLot.expirationDate}</span>
    </div>
  {/if}

  <!-- Actions -->
  <div class="border-t-2 border-gray-800 p-3 flex gap-2">
    {#if isEditing}
      <button on:click={handleSave} class="btn-primary flex-1">
        Save Changes
      </button>
      <button on:click={() => isEditing = false} class="btn-secondary">
        Cancel
      </button>
    {:else}
      <button on:click={handlePrint} class="btn-primary flex-1">
        🖨️ Print Label
      </button>
    {/if}
  </div>
</div>
```

### 8.4 Edit Tracking

All edits are tracked for audit purposes:

```typescript
interface LabelEditRecord {
  originalDirections: string;
  modifiedDirections: string;
  originalQuantity: number;
  modifiedQuantity: number;
  warningsAdded: string[];
  warningsRemoved: string[];
  editedBy: number;        // staff_id
  editedAt: string;        // ISO timestamp
}
```

This record is stored in `label_print_history.edit_diff` as JSON, providing a complete audit trail of any label modifications.

---

## 9. Feature Requirements

### 9.1 Feature Parity Matrix

Every feature from the current Electron app must be preserved:

| Feature | Current Status | Redesign Status | Priority |
|---|---|---|---|
| PIN-based authentication | ✅ | Port to Rust (Argon2id) | P0 |
| Session timeout & auto-lock | ✅ | Port to Rust timer | P0 |
| Patient CRUD + search | ✅ | Port with FTS5 search | P0 |
| Dispensing entry form | ✅ | Port to Svelte with WYSIWYG | P0 |
| Quick Dispense templates | ✅ | Port + expand templates | P0 |
| NJ-compliant label printing | Partial | **Full NJ compliance (NEW)** | P0 |
| WYSIWYG label editor | ❌ | **New feature** | P0 |
| Dispensing log + search | ✅ | Port with advanced filters | P0 |
| Record void/correction | ✅ | Port | P0 |
| Inventory management | ✅ | Port | P0 |
| Inventory alerts | ✅ | Port | P1 |
| Medication guide | ✅ | Port | P1 |
| Reports (5 report types) | ✅ | Port | P1 |
| Patient medication history | ✅ | Port | P1 |
| Allergy warnings | ✅ | Port | P1 |
| Backup & restore | ✅ | Port (Rust file I/O) | P1 |
| Staff management | ✅ | Port | P1 |
| Keyboard shortcuts | ✅ | Port | P2 |
| Accessibility panel | ✅ | Port | P2 |
| Dark mode | ❌ | Add | P2 |
| Favorite patients | ✅ | Port | P2 |
| Recent patients | ✅ | Port | P2 |
| Receipt printing | ✅ | Port | P2 |
| QR code on labels | Partial | Complete | P2 |
| Auto-updater | ✅ | Tauri built-in | P2 |

### 9.2 New Features (Beyond Parity)

| Feature | Description | Priority |
|---|---|---|
| NJ Label Validation Engine | Pre-print validation of all 16 required fields | P0 |
| WYSIWYG Label Preview | Editable preview matching physical label layout | P0 |
| Generic Substitution Text | Automatic "Generic for [Brand]" on labels | P0 |
| Prescriber Field on Labels | Separate from dispenser; NJ requires prescriber name | P0 |
| Expanded Medication Catalog | Gentamicin, Levofloxacin, Metronidazole, Fluconazole, Acyclovir | P0 |
| Expanded Templates | Gonorrhea Alt (Gentamicin), Chlamydia Pregnant, PID, etc. | P0 |
| Label Print History | Audit trail of every printed label with edit diffs | P0 |
| Auxiliary Warning Management | Add/remove/reorder auxiliary warning labels | P1 |
| Multi-medication Labels | Print labels for combination regimens (e.g., Gentamicin + Azithromycin) | P1 |
| Clinic Branding Settings | Configure clinic name, address, logo for labels | P1 |
| Dark Mode | System-aware dark theme | P2 |

---

## 10. UI/UX Design Specifications

### 10.1 Design Principles

1. **Clinical efficiency first** — Minimize clicks from patient selection to printed label.
2. **WYSIWYG fidelity** — The on-screen label preview must be a pixel-accurate representation of the printed output.
3. **Error prevention** — Required fields are visually distinct; the print button is disabled until all NJ fields are populated.
4. **Accessibility** — WCAG 2.1 AA compliance; high contrast mode; keyboard-navigable throughout.
5. **Defensive design** — Destructive actions (void, delete) require confirmation and PIN re-entry.

### 10.2 Navigation Structure

```
┌─────────────────────────────────────────────────────┐
│  [Logo] Hyacinth            [Alerts] [Settings] [🔒] │
├─────────────────────────────────────────────────────┤
│  [Entry] [Log] [Inventory] [Guide] [Reports]         │
├─────────────────────────────────────────────────────┤
│                                                       │
│   ┌───────────────────┐  ┌────────────────────────┐  │
│   │   Patient Lookup   │  │   Quick Dispense Panel │  │
│   │   + Entry Form     │  │   (Templates, Favs,    │  │
│   │                    │  │    Recent Patients)    │  │
│   │   Medication       │  │                        │  │
│   │   Selection        │  │   ┌──────────────────┐ │  │
│   │                    │  │   │  WYSIWYG Label   │ │  │
│   │   Reason           │  │   │  Preview Card    │ │  │
│   │   Selection        │  │   │                  │ │  │
│   │                    │  │   │  [Edit] [Print]  │ │  │
│   │   Staff PIN        │  │   └──────────────────┘ │  │
│   └───────────────────┘  └────────────────────────┘  │
│                                                       │
├─────────────────────────────────────────────────────┤
│  Footer: Session info, version                        │
└─────────────────────────────────────────────────────┘
```

### 10.3 Color Palette

| Token | Value | Usage |
|---|---|---|
| `--primary` | `#2563eb` (Blue 600) | Primary actions, header, active states |
| `--primary-dark` | `#1d4ed8` (Blue 700) | Hover states |
| `--success` | `#059669` (Emerald 600) | Confirmations, completed states |
| `--warning` | `#d97706` (Amber 600) | Warnings, auxiliary labels |
| `--danger` | `#dc2626` (Red 600) | Errors, voids, critical warnings |
| `--surface` | `#f9fafb` (Gray 50) | Background |
| `--surface-card` | `#ffffff` | Card backgrounds |
| `--text-primary` | `#111827` (Gray 900) | Primary text |
| `--text-secondary` | `#6b7280` (Gray 500) | Secondary text |

### 10.4 Typography

| Element | Font | Size | Weight |
|---|---|---|---|
| Label Preview (monospace) | `'Courier New', monospace` | 11pt | Normal/Bold |
| UI Headers | `'Inter', system-ui` | 18–24px | 600–700 |
| UI Body | `'Inter', system-ui` | 14px | 400 |
| UI Small | `'Inter', system-ui` | 12px | 400 |
| Warning Badges | `'Inter', system-ui` | 10px | 600 |

---

## 11. Security & HIPAA Compliance

### 11.1 Authentication

| Mechanism | Implementation |
|---|---|
| PIN Hashing | Argon2id (memory-hard) via `argon2` Rust crate |
| Session Management | Rust-side timer, configurable timeout (default 15 min) |
| Account Lockout | 5 failed PINs → 5-minute lockout, exponential backoff |
| Auto-lock | Screen lock after inactivity timeout |

### 11.2 Data Protection

| Mechanism | Implementation |
|---|---|
| Encryption at Rest | SQLCipher (AES-256-CBC) for entire database |
| Key Management | Derived from clinic master key using PBKDF2 |
| Audit Trail | HMAC-SHA256 chained entries (tamper-evident) |
| Data Sanitization | All user input sanitized before rendering (XSS prevention) |
| IPC Security | Tauri allow-list: only declared commands are callable |

### 11.3 HIPAA Technical Safeguards

| HIPAA Requirement | Implementation |
|---|---|
| Access Control (§164.312(a)) | PIN-based auth with role-based access (admin/dispenser) |
| Audit Controls (§164.312(b)) | Tamper-evident audit log with HMAC chain |
| Integrity (§164.312(c)) | Database encryption + audit log checksums |
| Transmission Security (§164.312(e)) | All data local — no network transmission |
| Automatic Logoff (§164.312(a)(2)(iii)) | Configurable session timeout |

---

## 12. Printing Subsystem

### 12.1 Supported Label Formats

| Format | Dimensions | Use Case |
|---|---|---|
| **Avery 5160** | 1" × 2.625" (30 per sheet) | Quick small labels for vials/bottles |
| **4" × 6" Single** | 4" × 6" | Full-size NJ-compliant pharmacy label |
| **Custom** | Configurable | Future: thermal label printers |

### 12.2 PDF Generation (Rust)

Labels are generated as PDF using the `printpdf` Rust crate:

```rust
// Pseudocode for NJ-compliant label generation
pub fn generate_nj_label(data: &ValidatedLabelData) -> Result<Vec<u8>> {
    let (doc, page, layer) = PdfDocument::new("Label", Mm(101.6), Mm(152.4), "Layer 1");
    let current_layer = doc.get_page(page).get_layer(layer);

    // Clinic header
    draw_text(&current_layer, &data.clinic_name, bold_font, 12.0, x, y);
    draw_text(&current_layer, &data.clinic_address, regular_font, 9.0, x, y);
    draw_text(&current_layer, &format!("Phone: {}", data.clinic_phone), regular_font, 9.0, x, y);

    // Separator line
    draw_line(&current_layer, x_start, y, x_end, y);

    // Patient & prescriber
    draw_text(&current_layer, &data.patient_name.to_uppercase(), bold_font, 14.0, x, y);
    draw_text(&current_layer, &format!("Prescriber: {}", data.prescriber_name), regular_font, 9.0, x, y);
    draw_text(&current_layer, &format!("Date: {}  Rx #: {}", data.dispense_date, data.rx_number), regular_font, 9.0, x, y);

    // Medication block
    draw_text(&current_layer, &format!("{} {} {}", data.medication_name, data.strength, data.form).to_uppercase(), bold_font, 11.0, x, y);
    if let Some(generic_for) = &data.generic_substitution_text {
        draw_text(&current_layer, generic_for, italic_font, 8.0, x, y);
    }
    draw_text(&current_layer, &format!("QTY: {} {} ({}-day supply)", data.quantity, data.unit, data.day_supply), regular_font, 10.0, x, y);

    // Directions
    draw_text(&current_layer, "DIRECTIONS:", bold_font, 9.0, x, y);
    draw_wrapped_text(&current_layer, &data.directions, regular_font, 10.0, x, y, max_width);

    // Auxiliary warnings box
    draw_warning_box(&current_layer, &data.auxiliary_warnings, x, y, max_width);

    // Lot & expiry footer
    draw_text(&current_layer, &format!("Lot: {}  Exp: {}", data.lot_number, data.expiration_date), regular_font, 8.0, x, y);

    // Barcode
    draw_barcode(&current_layer, &data.rx_number, x, y);

    doc.save_to_bytes()
}
```

### 12.3 Print Flow

```
Frontend (Svelte)           →    Tauri IPC    →    Rust Backend
                                                      │
1. User clicks "Print"                                 │
2. invoke('print_label', data)  ──────────────────→   3. validate_nj_label(data)
                                                      4. generate_nj_label(data)
                                                      5. save_to_temp_file(pdf_bytes)
                                                      6. open_native_print_dialog(file_path)
                                                      7. record_in_label_print_history()
8. UI shows "Label printed" ←──────────────────────   return Ok(print_result)
```

---

## 13. Migration Strategy

### 13.1 Data Migration

Since the existing app uses SQLite (better-sqlite3), migration is straightforward:

1. **Export**: The existing Electron app's backup feature exports the full database.
2. **Schema migration**: A Rust migration script transforms the schema to the new format (adding NJ compliance columns, label_print_history table, etc.).
3. **Import**: The new Tauri app imports the migrated database and re-encrypts with SQLCipher.

### 13.2 Migration Script

```rust
pub fn migrate_from_v1(old_db_path: &Path, new_db_path: &Path) -> Result<()> {
    // 1. Open old unencrypted DB
    // 2. Create new encrypted DB with SQLCipher
    // 3. Copy all tables with schema transformations
    // 4. Seed any missing medication catalog entries
    // 5. Validate template-catalog links
    // 6. Generate Rx numbers for existing records
    Ok(())
}
```

### 13.3 Rollout Plan

| Phase | Duration | Scope |
|---|---|---|
| Phase 1: Foundation | 4 weeks | Tauri scaffold, Rust backend, DB layer, auth, core commands |
| Phase 2: Core UI | 4 weeks | SvelteKit pages, entry form, dispensing log, inventory |
| Phase 3: NJ Labels | 3 weeks | Label generator, WYSIWYG editor, print integration, validation |
| Phase 4: Templates & Catalog | 2 weeks | Full catalog seeding, expanded templates, template-catalog validation |
| Phase 5: Reports & Settings | 2 weeks | All 5 report types, settings, backup/restore |
| Phase 6: Polish & Testing | 3 weeks | E2E tests, accessibility audit, performance tuning, data migration tool |
| Phase 7: Deployment | 1 week | Windows NSIS installer, macOS DMG, auto-updater config |

---

## 14. Testing Strategy

### 14.1 Test Pyramid

| Level | Tool | Coverage Target | Key Scenarios |
|---|---|---|---|
| **Rust Unit Tests** | `cargo test` | 90%+ for business logic | Label validation, PIN hashing, audit HMAC, template-catalog linking |
| **Svelte Unit Tests** | Vitest + Testing Library | 80%+ for components | LabelPreview editing, form validation, template selection |
| **Integration Tests** | Vitest | All IPC commands | Full dispense flow, inventory decrement, audit logging |
| **E2E Tests** | Playwright + Tauri Driver | Critical paths | Login → Quick Dispense → Edit Label → Print → Verify in Log |

### 14.2 NJ Compliance Tests

Dedicated test suite that validates every NJ label field:

```rust
#[cfg(test)]
mod nj_compliance_tests {
    #[test]
    fn test_all_16_nj_fields_present() { /* ... */ }

    #[test]
    fn test_generic_substitution_text_generated() { /* ... */ }

    #[test]
    fn test_label_blocked_when_fields_missing() { /* ... */ }

    #[test]
    fn test_auxiliary_warnings_printed() { /* ... */ }

    #[test]
    fn test_prescriber_not_same_as_dispenser() { /* ... */ }
}
```

### 14.3 Template Validation Tests

```rust
#[test]
fn test_all_templates_resolve_to_catalog_entries() {
    // Every template's medicationName + strength must match a catalog row
}

#[test]
fn test_no_orphaned_catalog_entries() {
    // Every catalog entry should be referenced by at least one template
}
```

---

## 15. Deployment & Distribution

### 15.1 Build Targets

| Platform | Format | Signing | Auto-Update |
|---|---|---|---|
| Windows 10/11 | NSIS Installer + ZIP | Code signing via DigiCert | Tauri updater plugin |
| macOS 12+ | DMG + pkg | Apple Developer ID + Notarization | Tauri updater plugin |
| Linux (Ubuntu 22+) | AppImage + .deb | GPG signed | Tauri updater plugin |

### 15.2 Binary Size Target

| Component | Estimated Size |
|---|---|
| Rust backend (compiled) | ~5 MB |
| SvelteKit frontend (bundled) | ~500 KB |
| SQLCipher library | ~2 MB |
| Fonts + assets | ~1 MB |
| **Total installer** | **~8–12 MB** |

Compare: Current Electron app is ~150–200 MB.

### 15.3 CI/CD Pipeline

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        platform: [windows-latest, macos-latest, ubuntu-22.04]
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: cargo test --manifest-path src-tauri/Cargo.toml
      - run: pnpm test
      - uses: tauri-apps/tauri-action@v0
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'Hyacinth v__VERSION__'
```

---

## 16. Success Metrics

| Metric | Target | Measurement |
|---|---|---|
| Installer size | < 15 MB | CI build artifact size |
| Cold start time | < 2 seconds | E2E test measurement |
| Template → Print time | < 10 seconds (3 clicks) | UX timing study |
| NJ label compliance | 100% (all 16 fields) | Automated compliance test suite |
| Label validation failures | 0 labels printed with missing fields | Rust validation engine |
| Data migration success | 100% of existing records migrated | Migration test suite |
| Test coverage (Rust) | > 90% | `cargo tarpaulin` |
| Test coverage (Svelte) | > 80% | `vitest --coverage` |
| WCAG 2.1 AA compliance | Pass | axe-core audit |

---

## 17. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| WebView2 not installed on Windows | Medium | High | Tauri bundles WebView2 bootstrapper; NSIS installer auto-installs it |
| SQLCipher build complexity | Medium | Medium | Use `bundled-sqlcipher` feature flag in rusqlite (statically links) |
| macOS WebKit rendering differences | Low | Medium | E2E tests on macOS CI runner; use CSS feature queries |
| Clinician resistance to new UI | Medium | High | Maintain identical workflow; pilot with 2-3 clinicians before full rollout |
| Thermal printer compatibility | Medium | Medium | Phase 1 targets standard printers; thermal support in Phase 2 |
| Rust learning curve for team | Medium | Medium | SvelteKit handles 80% of daily development; Rust code is stable backend |

---

## Appendices

### A. Glossary

| Term | Definition |
|---|---|
| **ARV** | Antiretroviral (HIV medication) |
| **CDC** | Centers for Disease Control and Prevention |
| **nPEP** | Non-occupational Post-Exposure Prophylaxis |
| **PrEP** | Pre-Exposure Prophylaxis |
| **Doxy-PEP** | Doxycycline Post-Exposure Prophylaxis (STI prevention) |
| **NJ** | New Jersey |
| **N.J.A.C. 13:39-7.12** | NJ Board of Pharmacy regulation on prescription labeling |
| **NDC** | National Drug Code |
| **Avery 5160** | Standard address label sheet (30 labels, 1" × 2.625") |
| **WYSIWYG** | What You See Is What You Get |
| **FTS5** | SQLite Full-Text Search version 5 |
| **SQLCipher** | Open-source extension providing AES-256 encryption for SQLite |

### B. Reference Documents

- Current application: `IMPLEMENTATION_SUMMARY.md`, `QUICK_DISPENSE_IMPLEMENTATION.md`
- HIPAA documentation: `docs/HIPAA_README.md`, `docs/HIPAA_COMPLIANCE.md`
- Security procedures: `docs/SECURITY_PROCEDURES.md`
- Privacy notice: `docs/PRIVACY_NOTICE.md`

### C. Current → Redesigned Tech Stack Mapping

| Current | Redesigned | Rationale |
|---|---|---|
| Electron 28 | Tauri v2 | 10x smaller, native security model |
| React 19 | SvelteKit 2 | Less boilerplate, compiled reactivity, two-way binding |
| TypeScript + Webpack 5 | TypeScript + Vite 6 | 10x faster builds, native ESM |
| Tailwind CSS v4 | UnoCSS | Tailwind-compatible syntax, smaller runtime |
| better-sqlite3 | rusqlite + SQLCipher | No native module rebuilds, built-in encryption |
| pdf-lib (JS) | printpdf (Rust) | Faster PDF generation, no JS overhead |
| Custom HTML label template | Rust PDF generator + WYSIWYG Svelte component | NJ compliance baked in |
| Jest + RTL | Vitest + Testing Library | 10x faster test runs |
| Playwright (E2E) | Playwright + Tauri Driver | Same E2E framework, native Tauri support |
| electron-builder | Tauri Bundler | Smaller installers, built-in code signing |

---

*End of PRD — Hyacinth Desktop Redesign v1.0*
