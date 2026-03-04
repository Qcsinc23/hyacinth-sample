# Changelog

All notable changes to the Hyacinth Medication Dispensing System are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] - 2026-03-04

### Added
- **Migration v5**: Added 25 new STI medications with complete CDC 2022 instruction templates
  - New antibiotics: Amoxicillin, Cefixime, Metronidazole (multiple forms), Tinidazole, Secnidazole, Clindamycin (multiple forms), Tetracycline, Ciprofloxacin, Erythromycin
  - New injectables: Ceftriaxone (1g/250mg), Benzathine Penicillin G (7.2M), Aqueous Penicillin G IV, Procaine Penicillin G
  - New antivirals: Acyclovir, Famciclovir, Valacyclovir (500mg)
  - New topical treatments: Podofilox, Imiquimod, Sinecatechins for genital warts
  - 40 instruction templates covering all STI treatment scenarios
- Expanded `dosage_form` CHECK constraint to include: gel, cream, ointment, ovule
- Enhanced medication catalog with new dosage forms for vaginal/topical treatments

### Changed
- Removed all debug instrumentation from production code
  - Eliminated HTTP debug logging (`_dbgPost`) from `main.ts`
  - Removed step-by-step debug logging from database loader
  - Cleaned up error handlers to use standard electron-log only
- Simplified initialization flow in `main.ts` whenReady handler
- Default admin PIN now configurable via `HYACINTH_BOOTSTRAP_ADMIN_PIN` environment variable
- Documentation updated to reflect production-ready status

### Fixed
- Migration runner now properly disables foreign keys before transaction to prevent FK constraint failures
- Database schema path resolution for packaged Electron apps
- Single-instance lock now uses file-based lock to prevent double-click spawning multiple processes
- Admin account creation no longer fails when no prior admin exists

### Security
- Production builds no longer contain debug HTTP endpoints
- All PHI remains encrypted with AES-256 at rest
- Audit logging continues to use tamper-evident checksums

---

## [2.0.0] - 2026-02-18

### Added
- **Quick Dispense Mode**: Streamlined dispensing workflow with templates
  - Pre-configured dispensing templates for nPEP, PrEP, Treatment, Prophylaxis
  - Favorite patients list with localStorage persistence
  - Recent patients panel (last 10 dispenses)
  - Template selector with category filtering
- **Backup & Restore UI**: Complete data protection interface
  - Manual backup trigger with progress indicator
  - Automated backup scheduler (configurable frequency)
  - Restore wizard with preview and confirmation
  - Export/Import functionality for patients, inventory, and dispensing records
- **Enhanced Search**: Advanced dispensing log search
  - Date range presets (Today, Yesterday, This Week, etc.)
  - Multi-select medication filter
  - Staff and status filters
  - Search history with localStorage persistence
- **Medication Instruction Templates**: Context-aware dosing instructions
  - Database-stored instruction templates
  - CDC guideline-based dosing for common STI medications
  - Warnings and contraindications display
  - Day supply calculation

### Added (Backend)
- **Database Migrations**: Versioned schema updates
  - Migration v1: Initial schema (patients, staff, dispensing, inventory)
  - Migration v2: Medication catalog and instruction templates
  - Migration v3: Additional STI medications (Gentamicin, Levofloxacin, Azithromycin 1g, Bicillin L-A)
  - Migration v4: Plain language dosing instructions update
- **Field-Level Encryption**: AES-256-GCM encryption for PHI
  - Automatic encryption of patient names, DOB, contact info, clinical notes
  - Secure key management with PBKDF2 derivation
  - Recovery key generation for password reset
- **Comprehensive Audit Logging**: Tamper-evident audit trail
  - SHA-256 checksums for all audit records
  - Access logging for patient data, dispensing, inventory changes
  - Failed authentication attempt tracking
  - 6-year retention compliance
- **Session Security**: Enhanced workstation security
  - Configurable session timeout (default: 5 minutes)
  - Visual countdown warning 1 minute before lock
  - Account lockout after 5 failed attempts (30-minute duration)
  - Automatic activity tracking and idle detection

### Changed
- Migrated from boilerplate example to full medication dispensing domain
- PIN authentication replaced email/password for clinical workflow
- Inventory management integrated with dispensing workflow
- Database encryption enabled by default for all PHI

### Security
- Role-based access control (RBAC) with admin and dispenser roles
- Automatic screen lock after inactivity
- All backups encrypted before storage
- Tamper-evident audit logs with integrity verification

---

## [1.0.0] - 2025-02-10

### Added
- Initial release of Hyacinth Medication Dispensing System
- Core dispensing workflow (patient lookup, medication selection, label printing)
- Inventory tracking with lot numbers and expiration dates
- Basic patient management (add, search, view history)
- Staff authentication with PIN
- SQLite database with better-sqlite3
- Electron + React + TypeScript architecture
- HIPAA compliance foundation (encryption, audit logging, access controls)

### Technical
- Electron 28.x with contextBridge security
- React 18 with TypeScript
- Tailwind CSS v4 for styling
- Webpack 5 for bundling
- Jest + React Testing Library for unit tests
- Playwright for E2E testing

---

## Release Notes Format

### Version Numbering
- **MAJOR**: Breaking changes requiring database migration or user retraining
- **MINOR**: New features, medications, or significant enhancements
- **PATCH**: Bug fixes, security updates, documentation improvements

### Categories
- **Added**: New features, medications, or capabilities
- **Changed**: Modifications to existing functionality
- **Deprecated**: Features scheduled for removal
- **Removed**: Deleted features or medications
- **Fixed**: Bug fixes
- **Security**: Security-related changes

---

**Document Notes:**
- This changelog follows healthcare software documentation standards
- All medication additions reference CDC STI Treatment Guidelines
- Security changes are explicitly called out for compliance tracking
- Migration notes included for database version changes
