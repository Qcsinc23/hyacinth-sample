/**
 * Database Loader
 * Handles database initialization, migrations, and seed data loading
 */

import * as fs from 'fs';
import * as path from 'path';
import { getDatabase } from './db';
import { runMigrations, getCurrentVersion } from './migrations';

/**
 * Read and execute SQL file
 */
function executeSqlFile(sqlPath: string): void {
  if (!fs.existsSync(sqlPath)) {
    console.warn(`[Loader] SQL file not found: ${sqlPath}`);
    return;
  }

  const sql = fs.readFileSync(sqlPath, 'utf-8');
  const db = getDatabase();

  try {
    db.exec(sql);
    console.log(`[Loader] ✓ Executed: ${path.basename(sqlPath)}`);
  } catch (error) {
    console.error(`[Loader] ✗ Error executing ${sqlPath}:`, error);
    throw error;
  }
}

/**
 * Load seed data for medication catalog
 */
export function loadMedicationCatalogSeed(): void {
  const seedPath = path.join(__dirname, 'seeds', 'medicationCatalog.sql');
  executeSqlFile(seedPath);
}

/**
 * Load seed data for inventory (sample lots for new medications)
 */
export function loadInventorySeed(): void {
  const seedPath = path.join(__dirname, 'seeds', 'inventorySeed.sql');
  executeSqlFile(seedPath);
}

/**
 * Check if medication catalog has been seeded
 */
export function isMedicationCatalogSeeded(): boolean {
  const db = getDatabase();

  try {
    const row = db.prepare(
      'SELECT COUNT(*) as count FROM medication_catalog'
    ).get() as { count: number };

    return row.count > 0;
  } catch {
    return false;
  }
}

/**
 * Check if inventory has been seeded with new medications
 */
export function isInventorySeeded(): boolean {
  const db = getDatabase();

  try {
    // Check for any of the new medications in inventory
    const newMedications = [
      'Biktarvy', 'Descovy', 'Doxycycline', 'Bactrim DS', 'Symtuza',
      'Dovato', 'Tivicay', 'Truvada', 'Juluca', 'Cabenuva', 'Apretude',
      'Emtricitabine', 'Tenofovir DF', 'Azithromycin', 'Ceftriaxone',
      'Penicillin G Benzathine', 'Valacyclovir'
    ];

    const placeholders = newMedications.map(() => '?').join(',');
    const row = db.prepare(
      `SELECT COUNT(*) as count FROM inventory WHERE medication_name IN (${placeholders})`
    ).get(...newMedications) as { count: number };

    return row.count > 0;
  } catch {
    return false;
  }
}

/**
 * Initialize database with all migrations and seed data
 */
export function initializeDatabase(): void {
  console.log('[Loader] Initializing database...');

  // Run migrations
  runMigrations();

  // Load seed data if needed
  const currentVersion = getCurrentVersion();
  if (currentVersion >= 2 && !isMedicationCatalogSeeded()) {
    console.log('[Loader] Loading medication catalog seed data...');
    loadMedicationCatalogSeed();
    console.log('[Loader] ✓ Medication catalog seeded');
  }

  // Load inventory seed data for new medications
  if (!isInventorySeeded()) {
    console.log('[Loader] Loading inventory seed data for new medications...');
    loadInventorySeed();
    console.log('[Loader] ✓ Inventory seeded with sample medications');
  }

  console.log('[Loader] Database initialization complete');
}

/**
 * Re-seed medication catalog (use with caution)
 */
export function reseedMedicationCatalog(): void {
  console.log('[Loader] Re-seeding medication catalog...');

  const db = getDatabase();

  // Clear existing data
  db.prepare('DELETE FROM medication_instruction_templates').run();
  db.prepare('DELETE FROM medication_catalog').run();

  // Load fresh seed data
  loadMedicationCatalogSeed();

  console.log('[Loader] ✓ Medication catalog re-seeded');
}

/**
 * Get database status information
 */
export function getDatabaseStatus(): {
  version: number;
  catalogSeeded: boolean;
  medicationCount: number;
  templateCount: number;
} {
  const db = getDatabase();
  const version = getCurrentVersion();

  let medicationCount = 0;
  let templateCount = 0;

  try {
    medicationCount = (db.prepare('SELECT COUNT(*) as count FROM medication_catalog').get() as { count: number }).count;
    templateCount = (db.prepare('SELECT COUNT(*) as count FROM medication_instruction_templates').get() as { count: number }).count;
  } catch {
    // Tables might not exist yet
  }

  return {
    version,
    catalogSeeded: medicationCount > 0,
    medicationCount,
    templateCount,
  };
}

/**
 * Force reset database (development only)
 */
export function resetDatabase(): void {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Database reset only allowed in development');
  }

  console.log('[Loader] Resetting database...');

  const db = getDatabase();

  // Drop all tables (in dependency order)
  const tables = [
    'medication_instruction_templates',
    'medication_catalog',
    'inventory_alerts',
    'inventory_transactions',
    'inventory',
    'record_reasons',
    'dispensing_line_items',
    'dispensing_records',
    'access_log',
    'audit_log',
    'drafts',
    'custom_reasons',
    'custom_medications',
    'app_settings',
    'staff_members',
    'patients',
    'db_metadata',
  ];

  tables.forEach(table => {
    try {
      db.prepare(`DROP TABLE IF EXISTS ${table}`).run();
    } catch (error) {
      console.warn(`[Loader] Warning: Could not drop table ${table}`);
    }
  });

  // Re-initialize
  initializeDatabase();

  console.log('[Loader] ✓ Database reset complete');
}
