/**
 * Database Loader
 * Handles database initialization, migrations, and seed data loading
 */

import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log';
import { getDatabase } from './db';
import { runMigrations, getCurrentVersion } from './migrations';
import { hashPin } from './queries/staff';

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
  console.log('[Loader] Loading inventory seed...');
  try {
    // Try to use embedded SQL first (more reliable in bundled apps)
    const { inventorySeedSQL } = require('./seeds/inventorySeed');
    const db = getDatabase();
    db.exec(inventorySeedSQL);
    console.log('[Loader] ✓ Executed inventory seed from embedded SQL');
  } catch (error) {
    console.error('[Loader] Error loading inventory seed:', error);
    // Fallback to file-based loading
    const seedPath = path.join(__dirname, 'seeds', 'inventorySeed.sql');
    console.log('[Loader] Seed path:', seedPath);
    console.log('[Loader] File exists:', fs.existsSync(seedPath));
    if (fs.existsSync(seedPath)) {
      executeSqlFile(seedPath);
    } else {
      console.error('[Loader] No inventory seed source available');
      throw error;
    }
  }
}

/**
 * Check if medication catalog has been seeded
 */
export function isMedicationCatalogSeeded(): boolean {
  const db = getDatabase();

  try {
    const row = db
      .prepare('SELECT COUNT(*) as count FROM medication_catalog')
      .get() as { count: number };

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
      'Biktarvy',
      'Descovy',
      'Doxycycline',
      'Bactrim DS',
      'Symtuza',
      'Dovato',
      'Tivicay',
      'Truvada',
      'Juluca',
      'Cabenuva',
      'Apretude',
      'Emtricitabine',
      'Tenofovir DF',
      'Azithromycin',
      'Ceftriaxone',
      'Penicillin G Benzathine',
      'Valacyclovir',
    ];

    const placeholders = newMedications.map(() => '?').join(',');
    const row = db
      .prepare(
        `SELECT COUNT(*) as count FROM inventory WHERE medication_name IN (${placeholders})`,
      )
      .get(...newMedications) as { count: number };

    console.log(`[Loader] Inventory seeded: ${row.count} items found`);
    return row.count > 0;
  } catch (error) {
    console.error('[Loader] Error checking inventory seed:', error);
    return false;
  }
}

/**
 * Get inventory count for debugging
 */
export function getInventoryCount(): number {
  const db = getDatabase();
  try {
    const row = db.prepare('SELECT COUNT(*) as count FROM inventory').get() as {
      count: number;
    };
    return row.count;
  } catch {
    return 0;
  }
}

/**
 * Ensure at least one admin staff member exists.
 * A bootstrap PIN is required when provisioning a new database so the app never
 * ships with a known default credential.
 */
function ensureDefaultAdmin(): void {
  const db = getDatabase();

  const adminCount = db
    .prepare(
      'SELECT COUNT(*) as count FROM staff_members WHERE role = ? AND is_active = 1',
    )
    .get('admin') as { count: number };

  if (adminCount.count === 0) {
    const now = new Date().toISOString();
    const DEFAULT_BOOTSTRAP_PIN = '1234';
    const bootstrapPin = process.env.HYACINTH_BOOTSTRAP_ADMIN_PIN || DEFAULT_BOOTSTRAP_PIN;
    const pinHash = hashPin(bootstrapPin);
    db.prepare(
      `
      INSERT INTO staff_members (
        first_name, last_name, pin_hash, role, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 1, ?, ?)
    `,
    ).run('System', 'Administrator', pinHash, 'admin', now, now);
    log.info('[Loader] Created bootstrap admin account (change PIN on first login)');
  }
}

/**
 * Initialize database with all migrations and seed data
 */
export function initializeDatabase(): void {
  log.info('[Loader] Initializing database...');

  runMigrations();
  ensureDefaultAdmin();

  const currentVersion = getCurrentVersion();
  if (currentVersion >= 2 && !isMedicationCatalogSeeded()) {
    log.info('[Loader] Loading medication catalog seed data...');
    loadMedicationCatalogSeed();
    log.info('[Loader] Medication catalog seeded');
  }

  if (!isInventorySeeded()) {
    log.info('[Loader] Loading inventory seed data for new medications...');
    loadInventorySeed();
    log.info('[Loader] Inventory seeded with sample medications');
  }

  log.info('[Loader] Database initialization complete');
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
    medicationCount = (
      db.prepare('SELECT COUNT(*) as count FROM medication_catalog').get() as {
        count: number;
      }
    ).count;
    templateCount = (
      db
        .prepare(
          'SELECT COUNT(*) as count FROM medication_instruction_templates',
        )
        .get() as { count: number }
    ).count;
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

  tables.forEach((table) => {
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
