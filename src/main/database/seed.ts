/**
 * Seed Data
 * Initial data for the application
 */

import { getDatabase } from './db';
import { hashPin } from './queries/staff';

/**
 * Default medications to seed
 */
const DEFAULT_MEDICATIONS = [
  {
    name: 'Biktarvy (30 count)',
    commonDosing: '1 tablet PO daily',
    instructions: 'Take one tablet by mouth once daily with or without food.',
  },
  {
    name: 'Biktarvy (90 count)',
    commonDosing: '1 tablet PO daily',
    instructions: 'Take one tablet by mouth once daily with or without food.',
  },
  {
    name: 'Descovy (30 count)',
    commonDosing: '1 tablet PO daily',
    instructions: 'Take one tablet by mouth once daily with or without food.',
  },
  {
    name: 'Descovy (90 count)',
    commonDosing: '1 tablet PO daily',
    instructions: 'Take one tablet by mouth once daily with or without food.',
  },
  {
    name: 'Symtuza (30 count)',
    commonDosing: '1 tablet PO daily',
    instructions: 'Take one tablet by mouth once daily with food.',
  },
  {
    name: 'Symtuza (90 count)',
    commonDosing: '1 tablet PO daily',
    instructions: 'Take one tablet by mouth once daily with food.',
  },
  {
    name: 'Dovato (30 count)',
    commonDosing: '1 tablet PO daily',
    instructions: 'Take one tablet by mouth once daily with or without food.',
  },
  {
    name: 'Dovato (90 count)',
    commonDosing: '1 tablet PO daily',
    instructions: 'Take one tablet by mouth once daily with or without food.',
  },
  {
    name: 'Bactrim DS (14 count)',
    commonDosing: '1 tablet PO BID',
    instructions: 'Take one tablet by mouth twice daily.',
  },
  {
    name: 'Bactrim DS (30 count)',
    commonDosing: '1 tablet PO BID',
    instructions: 'Take one tablet by mouth twice daily.',
  },
  {
    name: 'Doxycycline (14 count)',
    commonDosing: '1 capsule PO BID',
    instructions:
      'Take one capsule by mouth twice daily. Take with plenty of fluids.',
  },
  {
    name: 'Doxycycline (30 count)',
    commonDosing: '1 capsule PO BID',
    instructions:
      'Take one capsule by mouth twice daily. Take with plenty of fluids.',
  },
];

/**
 * Default dispensing reasons
 */
const DEFAULT_REASONS = [
  'New Patient Start',
  'Regular Refill',
  'Emergency Supply',
  'Lost Medication',
  'Damaged Medication',
  'Travel Supply',
  'Provider Visit',
  'Lab Work Related',
  'Side Effect Management',
  'Dose Change',
];

/**
 * Default app settings
 */
const DEFAULT_SETTINGS = {
  'app.name': 'Hyacinth',
  'app.version': '1.0.0',
  'dispensing.default_label_quantity': '1',
  'inventory.low_stock_threshold_days': '30',
  'inventory.expiration_warning_days': '30',
  'audit.retention_days': '2555', // 7 years
  'backup.enabled': 'true',
  'backup.interval_days': '1',
};

/**
 * Run seed data
 */
export function runSeedData(): void {
  // Only run seed data in development to prevent accidental production seeding
  if (process.env.NODE_ENV !== 'development') {
    const log = require('electron-log');
    log.warn('[Seed] Skipping seed data in production environment');
    return;
  }
  const db = getDatabase();
  const now = new Date().toISOString();

  console.log('[Seed] Starting seed data...');

  db.transaction(() => {
    // Seed default medications
    console.log('[Seed] Seeding medications...');
    const medStmt = db.prepare(`
      INSERT OR IGNORE INTO custom_medications (
        medication_name, usage_count, short_dosing, full_instructions, is_promoted, created_at, updated_at
      ) VALUES (?, 0, ?, ?, 1, ?, ?)
    `);

    for (const med of DEFAULT_MEDICATIONS) {
      medStmt.run(med.name, med.commonDosing, med.instructions, now, now);
    }

    // Seed default reasons
    console.log('[Seed] Seeding reasons...');
    const reasonStmt = db.prepare(`
      INSERT OR IGNORE INTO custom_reasons (
        reason_name, usage_count, is_promoted, created_at, updated_at
      ) VALUES (?, 0, 1, ?, ?)
    `);

    for (const reason of DEFAULT_REASONS) {
      reasonStmt.run(reason, now, now);
    }

    // Seed default admin staff
    console.log('[Seed] Seeding admin staff...');
    const existingAdmin = db
      .prepare('SELECT id FROM staff_members WHERE role = ?')
      .get('admin') as { id: number } | undefined;

    if (!existingAdmin) {
      const bootstrapPin = process.env.HYACINTH_BOOTSTRAP_ADMIN_PIN;
      if (!bootstrapPin) {
        throw new Error(
          'HYACINTH_BOOTSTRAP_ADMIN_PIN must be set before running seed data.',
        );
      }

      const pinHash = hashPin(bootstrapPin);
      db.prepare(
        `
        INSERT INTO staff_members (
          first_name, last_name, pin_hash, role, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 1, ?, ?)
      `,
      ).run('System', 'Administrator', pinHash, 'admin', now, now);
      console.log('[Seed] Created bootstrap admin account');
    }

    // Seed default settings
    console.log('[Seed] Seeding app settings...');
    const settingStmt = db.prepare(`
      INSERT OR IGNORE INTO app_settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `);

    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      settingStmt.run(key, value, now);
    }
  })();

  console.log('[Seed] Seed data complete');
}

/**
 * Check if seed data has been run
 */
export function hasSeedData(): boolean {
  const db = getDatabase();
  const adminCount = db
    .prepare('SELECT COUNT(*) as count FROM staff_members WHERE role = ?')
    .get('admin') as { count: number };
  return adminCount.count > 0;
}
