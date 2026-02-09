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
      -- Schema is already created by schema.sql
      -- This migration just marks the initial version
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
  } catch {
    // Table might not exist yet
    return 0;
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
