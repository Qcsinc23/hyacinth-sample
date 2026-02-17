/**
 * Database Migration System
 * Versioned migrations for schema updates
 */

import { getDatabase } from './db';

interface Migration {
  version: number;
  name: string;
  up: string;
  down?: string;
}

// Migration registry - add new migrations at the end
const migrations: Migration[] = [
  {
    version: 1,
    name: 'Initial schema',
    up: `
      -- Core tables
      CREATE TABLE IF NOT EXISTS patients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chart_number TEXT NOT NULL UNIQUE,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          dob TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          address TEXT,
          notes TEXT,
          is_active BOOLEAN NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_patients_chart_number ON patients(chart_number);
      CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name);
      CREATE INDEX IF NOT EXISTS idx_patients_active ON patients(is_active);

      CREATE TABLE IF NOT EXISTS staff_members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          pin_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('admin', 'dispenser')),
          is_active BOOLEAN NOT NULL DEFAULT 1,
          last_login_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_staff_active ON staff_members(is_active);
      CREATE INDEX IF NOT EXISTS idx_staff_role ON staff_members(role);

      -- Dispensing tables
      CREATE TABLE IF NOT EXISTS dispensing_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_id INTEGER NOT NULL,
          dispensing_date TEXT NOT NULL,
          dispensing_time TEXT NOT NULL,
          staff_id INTEGER NOT NULL,
          label_quantity INTEGER NOT NULL DEFAULT 1,
          additional_notes TEXT,
          status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'voided', 'corrected')),
          void_reason TEXT,
          voided_by INTEGER,
          voided_at TEXT,
          correction_of INTEGER,
          corrected_by INTEGER,
          correction_reason TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
          FOREIGN KEY (staff_id) REFERENCES staff_members(id) ON DELETE RESTRICT,
          FOREIGN KEY (voided_by) REFERENCES staff_members(id) ON DELETE RESTRICT,
          FOREIGN KEY (corrected_by) REFERENCES staff_members(id) ON DELETE RESTRICT,
          FOREIGN KEY (correction_of) REFERENCES dispensing_records(id) ON DELETE RESTRICT
      );
      CREATE INDEX IF NOT EXISTS idx_dispensing_patient ON dispensing_records(patient_id);
      CREATE INDEX IF NOT EXISTS idx_dispensing_date ON dispensing_records(dispensing_date);
      CREATE INDEX IF NOT EXISTS idx_dispensing_staff ON dispensing_records(staff_id);
      CREATE INDEX IF NOT EXISTS idx_dispensing_status ON dispensing_records(status);
      CREATE INDEX IF NOT EXISTS idx_dispensing_correction ON dispensing_records(correction_of);

      CREATE TABLE IF NOT EXISTS dispensing_line_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          record_id INTEGER NOT NULL,
          medication_name TEXT NOT NULL,
          is_custom_medication BOOLEAN NOT NULL DEFAULT 0,
          amount_value REAL NOT NULL,
          amount_unit TEXT NOT NULL,
          lot_number TEXT,
          expiration_date TEXT,
          inventory_id INTEGER,
          dosing_instructions TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (record_id) REFERENCES dispensing_records(id) ON DELETE CASCADE,
          FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_line_items_record ON dispensing_line_items(record_id);
      CREATE INDEX IF NOT EXISTS idx_line_items_medication ON dispensing_line_items(medication_name);
      CREATE INDEX IF NOT EXISTS idx_line_items_inventory ON dispensing_line_items(inventory_id);

      CREATE TABLE IF NOT EXISTS record_reasons (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          record_id INTEGER NOT NULL,
          reason_name TEXT NOT NULL,
          is_custom BOOLEAN NOT NULL DEFAULT 0,
          FOREIGN KEY (record_id) REFERENCES dispensing_records(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_record_reasons_record ON record_reasons(record_id);
      CREATE INDEX IF NOT EXISTS idx_record_reasons_name ON record_reasons(reason_name);

      -- Inventory tables
      CREATE TABLE IF NOT EXISTS inventory (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          medication_name TEXT NOT NULL,
          lot_number TEXT NOT NULL,
          ndc_code TEXT,
          expiration_date TEXT NOT NULL,
          quantity_received INTEGER NOT NULL,
          quantity_on_hand INTEGER NOT NULL,
          unit TEXT NOT NULL,
          supplier TEXT,
          supplier_invoice TEXT,
          cost_per_unit REAL,
          received_date TEXT NOT NULL,
          received_by INTEGER NOT NULL,
          reorder_threshold INTEGER,
          storage_location TEXT,
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'depleted', 'quarantined')),
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (received_by) REFERENCES staff_members(id) ON DELETE RESTRICT
      );
      CREATE INDEX IF NOT EXISTS idx_inventory_medication ON inventory(medication_name);
      CREATE INDEX IF NOT EXISTS idx_inventory_lot ON inventory(lot_number);
      CREATE INDEX IF NOT EXISTS idx_inventory_expiration ON inventory(expiration_date);
      CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);
      CREATE INDEX IF NOT EXISTS idx_inventory_ndc ON inventory(ndc_code);

      CREATE TABLE IF NOT EXISTS inventory_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          inventory_id INTEGER NOT NULL,
          transaction_type TEXT NOT NULL CHECK (transaction_type IN ('receive', 'dispense', 'adjustment', 'return', 'waste')),
          quantity_change INTEGER NOT NULL,
          quantity_before INTEGER NOT NULL,
          quantity_after INTEGER NOT NULL,
          reference_type TEXT,
          reference_id INTEGER,
          reason TEXT,
          performed_by INTEGER NOT NULL,
          timestamp TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE RESTRICT,
          FOREIGN KEY (performed_by) REFERENCES staff_members(id) ON DELETE RESTRICT
      );
      CREATE INDEX IF NOT EXISTS idx_transactions_inventory ON inventory_transactions(inventory_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON inventory_transactions(transaction_type);
      CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON inventory_transactions(timestamp);
      CREATE INDEX IF NOT EXISTS idx_transactions_reference ON inventory_transactions(reference_type, reference_id);

      CREATE TABLE IF NOT EXISTS inventory_alerts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          inventory_id INTEGER NOT NULL,
          alert_type TEXT NOT NULL CHECK (alert_type IN ('expiring_soon', 'low_stock', 'expired')),
          severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
          message TEXT NOT NULL,
          is_acknowledged BOOLEAN NOT NULL DEFAULT 0,
          acknowledged_by INTEGER,
          acknowledged_at TEXT,
          auto_resolved BOOLEAN NOT NULL DEFAULT 0,
          resolved_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
          FOREIGN KEY (acknowledged_by) REFERENCES staff_members(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_alerts_inventory ON inventory_alerts(inventory_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON inventory_alerts(is_acknowledged);
      CREATE INDEX IF NOT EXISTS idx_alerts_type ON inventory_alerts(alert_type);
      CREATE INDEX IF NOT EXISTS idx_alerts_severity ON inventory_alerts(severity);

      -- Audit and config tables
      CREATE TABLE IF NOT EXISTS audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id INTEGER NOT NULL,
          staff_id INTEGER,
          staff_name TEXT,
          timestamp TEXT NOT NULL DEFAULT (datetime('now')),
          details TEXT NOT NULL,
          checksum TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (staff_id) REFERENCES staff_members(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_staff ON audit_log(staff_id);

      CREATE TABLE IF NOT EXISTS access_log (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL DEFAULT (datetime('now')),
          action TEXT NOT NULL,
          staff_id INTEGER,
          staff_name TEXT,
          ip_address TEXT,
          user_agent TEXT,
          entity_type TEXT,
          entity_id TEXT,
          details TEXT NOT NULL,
          success INTEGER NOT NULL DEFAULT 1,
          failure_reason TEXT,
          checksum TEXT NOT NULL,
          FOREIGN KEY (staff_id) REFERENCES staff_members(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_access_action ON access_log(action);
      CREATE INDEX IF NOT EXISTS idx_access_timestamp ON access_log(timestamp);
      CREATE INDEX IF NOT EXISTS idx_access_staff ON access_log(staff_id);
      CREATE INDEX IF NOT EXISTS idx_access_entity ON access_log(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_access_success ON access_log(success);

      CREATE TABLE IF NOT EXISTS drafts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          draft_type TEXT NOT NULL CHECK (draft_type IN ('dispense', 'inventory')),
          form_data TEXT NOT NULL,
          staff_id INTEGER NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (staff_id) REFERENCES staff_members(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_drafts_staff ON drafts(staff_id);
      CREATE INDEX IF NOT EXISTS idx_drafts_type ON drafts(draft_type);

      CREATE TABLE IF NOT EXISTS custom_medications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          medication_name TEXT NOT NULL UNIQUE,
          usage_count INTEGER NOT NULL DEFAULT 1,
          short_dosing TEXT,
          full_instructions TEXT,
          is_promoted BOOLEAN NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_custom_meds_usage ON custom_medications(usage_count DESC);
      CREATE INDEX IF NOT EXISTS idx_custom_meds_promoted ON custom_medications(is_promoted);

      CREATE TABLE IF NOT EXISTS custom_reasons (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          reason_name TEXT NOT NULL UNIQUE,
          usage_count INTEGER NOT NULL DEFAULT 1,
          is_promoted BOOLEAN NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_custom_reasons_usage ON custom_reasons(usage_count DESC);
      CREATE INDEX IF NOT EXISTS idx_custom_reasons_promoted ON custom_reasons(is_promoted);

      CREATE TABLE IF NOT EXISTS app_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);
    `,
  },
  {
    version: 2,
    name: 'Add medication catalog and instruction templates',
    up: `
      -- Create medication_catalog table
      CREATE TABLE IF NOT EXISTS medication_catalog (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          medication_name TEXT NOT NULL,
          generic_name TEXT,
          strength TEXT,
          dosage_form TEXT NOT NULL CHECK (dosage_form IN ('tablet', 'capsule', 'injection', 'solution', 'suspension', 'powder', 'other')),
          category TEXT NOT NULL CHECK (category IN ('ARV', 'Antibiotic', 'Antiviral', 'Prophylactic', 'Other')),
          ndc_code TEXT UNIQUE,
          default_unit TEXT NOT NULL DEFAULT 'tablet',
          is_controlled BOOLEAN NOT NULL DEFAULT 0,
          schedule TEXT CHECK (schedule IN ('II', 'III', 'IV', 'V')),
          storage_requirements TEXT,
          is_active BOOLEAN NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_med_catalog_name ON medication_catalog(medication_name);
      CREATE INDEX IF NOT EXISTS idx_med_catalog_generic ON medication_catalog(generic_name);
      CREATE INDEX IF NOT EXISTS idx_med_catalog_ndc ON medication_catalog(ndc_code);
      CREATE INDEX IF NOT EXISTS idx_med_catalog_category ON medication_catalog(category);
      CREATE INDEX IF NOT EXISTS idx_med_catalog_active ON medication_catalog(is_active);

      -- Create medication_instruction_templates table
      CREATE TABLE IF NOT EXISTS medication_instruction_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          medication_catalog_id INTEGER NOT NULL,
          context TEXT NOT NULL CHECK (context IN ('treatment', 'prevention', 'prophylaxis', 'pep', 'prep')),
          indication TEXT NOT NULL,
          short_dosing TEXT NOT NULL,
          full_instructions TEXT,
          warnings TEXT,
          day_supply_calculation TEXT,
          common_reasons TEXT,
          is_active BOOLEAN NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (medication_catalog_id) REFERENCES medication_catalog(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_instruction_template_medication ON medication_instruction_templates(medication_catalog_id);
      CREATE INDEX IF NOT EXISTS idx_instruction_template_context ON medication_instruction_templates(context);
      CREATE INDEX IF NOT EXISTS idx_instruction_template_active ON medication_instruction_templates(is_active);

      -- Add context column to record_reasons if not exists
      ALTER TABLE record_reasons ADD COLUMN context TEXT CHECK (context IN ('treatment', 'prevention', 'prophylaxis', 'pep', 'prep', 'other'));
      ALTER TABLE record_reasons ADD COLUMN links_to_instruction BOOLEAN NOT NULL DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_record_reasons_context ON record_reasons(context);

      -- Add columns to dispensing_line_items if not exists
      ALTER TABLE dispensing_line_items ADD COLUMN instruction_context TEXT CHECK (instruction_context IN ('treatment', 'prevention', 'prophylaxis', 'pep', 'prep', 'other'));
      ALTER TABLE dispensing_line_items ADD COLUMN day_supply INTEGER;
      ALTER TABLE dispensing_line_items ADD COLUMN medication_strength TEXT;
      ALTER TABLE dispensing_line_items ADD COLUMN warnings TEXT;
      CREATE INDEX IF NOT EXISTS idx_line_items_instruction_context ON dispensing_line_items(instruction_context);
    `,
  },
  // Add future migrations here
];

/**
 * Ensure db_metadata table exists
 */
function ensureMetadataTable(): void {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS db_metadata (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

/**
 * Get current database version
 */
export function getCurrentVersion(): number {
  const db = getDatabase();
  
  try {
    ensureMetadataTable();
    const row = db.prepare(
      'SELECT version FROM db_metadata WHERE id = 1'
    ).get() as { version: number } | undefined;
    return row?.version || 0;
  } catch (error) {
    // Table might not exist yet (expected on first run)
    const errorMessage = (error as Error).message || '';
    if (errorMessage.includes('no such table')) {
      return 0;
    }
    // Log and rethrow unexpected errors
    const log = require('electron-log');
    log.error('[Migrations] Unexpected error getting current version:', error);
    throw error;
  }
}

/**
 * Set database version
 */
function setVersion(version: number): void {
  const db = getDatabase();
  ensureMetadataTable();
  
  // Check if row exists
  const exists = db.prepare('SELECT 1 FROM db_metadata WHERE id = 1').get();
  if (exists) {
    db.prepare(
      'UPDATE db_metadata SET version = ?, updated_at = datetime(\'now\') WHERE id = 1'
    ).run(version);
  } else {
    db.prepare(
      'INSERT INTO db_metadata (id, version, updated_at) VALUES (1, ?, datetime(\'now\'))'
    ).run(version);
  }
}

/**
 * Run all pending migrations
 */
export function runMigrations(): void {
  const currentVersion = getCurrentVersion();
  const pendingMigrations = migrations.filter(m => m.version > currentVersion);

  if (pendingMigrations.length === 0) {
    console.log(`[Migrations] Database is at version ${currentVersion}, no migrations needed`);
    return;
  }

  console.log(`[Migrations] Running ${pendingMigrations.length} migration(s)...`);

  for (const migration of pendingMigrations) {
    console.log(`[Migrations] Applying v${migration.version}: ${migration.name}`);
    
    const transaction = getDatabase().transaction(() => {
      const db = getDatabase();
      
      // Run migration
      db.exec(migration.up);
      
      // Update version
      setVersion(migration.version);
    });

    transaction();
    console.log(`[Migrations] ✓ v${migration.version} applied`);
  }

  console.log(`[Migrations] Database now at version ${getCurrentVersion()}`);
}

/**
 * Check if migrations are needed
 */
export function needsMigration(): boolean {
  const currentVersion = getCurrentVersion();
  const pendingCount = migrations.filter(m => m.version > currentVersion).length;
  return pendingCount > 0;
}

/**
 * Get migration status
 */
export function getMigrationStatus(): {
  currentVersion: number;
  latestVersion: number;
  pendingCount: number;
} {
  const currentVersion = getCurrentVersion();
  const latestVersion = migrations.length > 0 
    ? Math.max(...migrations.map(m => m.version)) 
    : 0;
  const pendingCount = migrations.filter(m => m.version > currentVersion).length;

  return {
    currentVersion,
    latestVersion,
    pendingCount,
  };
}

/**
 * Reset database version (use with caution - for development only)
 */
export function resetVersion(version = 0): void {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Version reset only allowed in development');
  }
  setVersion(version);
}
