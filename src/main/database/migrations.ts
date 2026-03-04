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
  {
    version: 3,
    name: 'Add STI meds (Gentamicin, Levofloxacin, Azithromycin 1g, Bicillin L-A) and packet dosage form',
    up: `
      PRAGMA foreign_keys = OFF;

      -- Recreate medication_catalog with 'packet' added to dosage_form for Azithromycin 1g
      CREATE TABLE IF NOT EXISTS medication_catalog_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          medication_name TEXT NOT NULL,
          generic_name TEXT,
          strength TEXT,
          dosage_form TEXT NOT NULL CHECK (dosage_form IN ('tablet', 'capsule', 'injection', 'solution', 'suspension', 'powder', 'packet', 'other')),
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
      INSERT INTO medication_catalog_new SELECT * FROM medication_catalog;
      DROP TABLE medication_catalog;
      ALTER TABLE medication_catalog_new RENAME TO medication_catalog;
      CREATE INDEX IF NOT EXISTS idx_med_catalog_name ON medication_catalog(medication_name);
      CREATE INDEX IF NOT EXISTS idx_med_catalog_generic ON medication_catalog(generic_name);
      CREATE INDEX IF NOT EXISTS idx_med_catalog_ndc ON medication_catalog(ndc_code);
      CREATE INDEX IF NOT EXISTS idx_med_catalog_category ON medication_catalog(category);
      CREATE INDEX IF NOT EXISTS idx_med_catalog_active ON medication_catalog(is_active);

      PRAGMA foreign_keys = ON;

      -- Insert new STI medications (CDC regimens)
      INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, ndc_code, default_unit, is_controlled, storage_requirements) VALUES
      ('Gentamicin', 'gentamicin sulfate', '240mg', 'injection', 'Antibiotic', '0641-6110-10', 'vial', 0, 'Store at 20°C to 25°C (68°F to 77°F)'),
      ('Levofloxacin', 'levofloxacin', '500mg', 'tablet', 'Antibiotic', '68180-0547-1', 'tablet', 0, 'Store below 30°C (86°F); protect from light'),
      ('Azithromycin 1g', 'azithromycin dihydrate', '1g', 'packet', 'Antibiotic', '68180-0546-1', 'packet', 0, 'Store below 30°C (86°F)'),
      ('Bicillin L-A', 'penicillin G benzathine', '2.4M units', 'injection', 'Antibiotic', '0005-7792-01', 'vial', 0, 'Store refrigerated at 2°C to 8°C (36°F to 46°F); protect from light');

      -- Gentamicin - Gonorrhea alternative
      INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
      SELECT (SELECT id FROM medication_catalog WHERE medication_name = 'Gentamicin'), 'treatment', 'Gonorrhea - Alternative Regimen (CDC 2021)',
      'Inject 240mg intramuscularly as a single dose. MUST be given with Azithromycin 2g PO.',
      '["For patients with cephalosporin allergy only", "Single dose - must be combined with Azithromycin 2g PO", "Inject IM in upper outer quadrant of buttock", "Observe patient for 30 minutes post-injection", "Renal function consideration - check if impaired"]',
      '["⚠️ CDC Alternative Regimen - use only when ceftriaxone contraindicated", "⚠️ MUST be given with Azithromycin 2g PO - never alone", "⚠️ Observe patient for 30 minutes post-injection", "⚠️ Ototoxicity and nephrotoxicity risk - avoid if renal impairment"]',
      '1', '["STI Treatment - Gonorrhea", "Gonorrhea Alternative", "Cephalosporin Allergy"]';

      -- Levofloxacin - Chlamydia alternative
      INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
      SELECT (SELECT id FROM medication_catalog WHERE medication_name = 'Levofloxacin'), 'treatment', 'Chlamydia - Alternative Regimen (CDC 2021)',
      'Take 1 tablet (500mg) by mouth once daily for 7 days.',
      '["Alternative when doxycycline and azithromycin not suitable", "Take at same time each day", "Take with or without food", "Do NOT take with antacids, sucralfate, or multivitamins containing iron/zinc - separate by 2 hours", "Complete FULL 7 days even if feeling better"]',
      '["⚠️ Do NOT take with antacids - separate by at least 2 hours", "⚠️ May increase sun sensitivity - use sunscreen", "⚠️ Avoid in pregnancy - tendon rupture risk", "⚠️ Stop and contact provider if tendon pain or swelling", "⚠️ Complete FULL 7 days even if feeling better"]',
      '7', '["STI Treatment - Chlamydia", "Chlamydia Alternative"]';

      -- Azithromycin 1g - Gonorrhea dual therapy
      INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
      SELECT (SELECT id FROM medication_catalog WHERE medication_name = 'Azithromycin 1g'), 'treatment', 'Gonorrhea Dual Therapy (CDC 2021)',
      'Take 2g (entire packet) by mouth as a single dose. MUST be given with Ceftriaxone 500mg IM.',
      '["Given with ceftriaxone for gonorrhea - NEVER use azithromycin alone for gonorrhea", "Single dose - take entire packet", "May take with or without food", "Observe for 30 min if given in clinic"]',
      '["⚠️ Do NOT use alone for gonorrhea - always with ceftriaxone", "⚠️ May cause GI upset - take with food if needed", "⚠️ Report severe diarrhea or allergic reaction"]',
      '1', '["STI Treatment - Gonorrhea", "Gonorrhea Dual Therapy"]';

      -- Azithromycin 1g - Chlamydia single dose
      INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
      SELECT (SELECT id FROM medication_catalog WHERE medication_name = 'Azithromycin 1g'), 'treatment', 'Chlamydia - Single Dose (CDC 2021)',
      'Take 1g (entire packet) by mouth as a single dose.',
      '["Single dose for uncomplicated urogenital chlamydia", "May take with or without food", "Preferred when doxycycline adherence is a concern", "Complete full dose"]',
      '["⚠️ May cause diarrhea or stomach upset", "⚠️ Avoid if history of ventricular arrhythmias", "⚠️ Report irregular heartbeat or severe diarrhea"]',
      '1', '["STI Treatment - Chlamydia", "Chlamydia Alternative"]';

      -- Bicillin L-A - Early Syphilis
      INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
      SELECT (SELECT id FROM medication_catalog WHERE medication_name = 'Bicillin L-A'), 'treatment', 'Early Syphilis (CDC 2021)',
      'Administer 2.4 million units by deep intramuscular injection as a single dose.',
      '["Single dose for primary, secondary, or early latent syphilis (<1 year)", "Inject deep IM in upper outer quadrant of buttock", "May divide into 2 injections of 1.2M units each buttock", "Warm to room temperature before injection; inject slowly over 20-30 seconds", "Observe patient 15-20 minutes (30 min if allergy history)"]',
      '["⚠️ Severe allergic reactions possible (anaphylaxis) - penicillin allergy", "⚠️ Jarisch-Herxheimer reaction may occur within 24 hours", "⚠️ Must be administered by healthcare professional", "⚠️ Never give IV - injection injury risk"]',
      '1', '["STI Treatment - Syphilis", "Primary Syphilis", "Secondary Syphilis", "Early Latent Syphilis"]';

      -- Seed inventory for new STI medications (sample lots)
      INSERT OR IGNORE INTO inventory (medication_name, lot_number, ndc_code, expiration_date, quantity_received, quantity_on_hand, unit, supplier, received_date, received_by, reorder_threshold, storage_location, status) VALUES
      ('Gentamicin', 'GTM2024001', '0641-6110-10', '2025-12-31', 30, 30, 'vial', 'Generic Pharm', '2024-04-01', 1, 15, 'C1-E01', 'active'),
      ('Gentamicin', 'GTM2024002', '0641-6110-10', '2026-06-30', 35, 35, 'vial', 'Generic Pharm', '2024-08-15', 1, 15, 'C1-E02', 'active'),
      ('Levofloxacin', 'LVX2024001', '68180-0547-1', '2026-03-15', 80, 80, 'tablet', 'Generic Pharm', '2024-02-20', 1, 25, 'B1-E01', 'active'),
      ('Levofloxacin', 'LVX2024002', '68180-0547-1', '2026-11-30', 90, 90, 'tablet', 'Generic Pharm', '2024-07-01', 1, 25, 'B1-E02', 'active'),
      ('Azithromycin 1g', 'AZM1G2024001', '68180-0546-1', '2025-10-31', 50, 50, 'packet', 'Pfizer', '2024-03-01', 1, 20, 'B1-F01', 'active'),
      ('Azithromycin 1g', 'AZM1G2024002', '68180-0546-1', '2026-05-15', 60, 60, 'packet', 'Pfizer', '2024-07-15', 1, 20, 'B1-F02', 'active'),
      ('Bicillin L-A', 'BCL2024001', '0005-7792-01', '2025-09-30', 25, 25, 'vial', 'Pfizer', '2024-02-10', 1, 10, 'C1-F01', 'active'),
      ('Bicillin L-A', 'BCL2024002', '0005-7792-01', '2026-04-15', 30, 30, 'vial', 'Pfizer', '2024-06-20', 1, 10, 'C1-F02', 'active');
    `,
  },
  {
    version: 4,
    name: 'Update dispensing instructions to plain language (CDC dosing)',
    up: `
      -- Ceftriaxone Gonorrhea - simple terms
      UPDATE medication_instruction_templates SET
        short_dosing = 'Get one injection (500mg) in the buttock. One dose only. If you may have chlamydia too: Take doxycycline 100mg by mouth twice daily for 7 days.',
        full_instructions = '["One injection for gonorrhea (throat, rectum, or urinary tract)", "If you weigh 330 lbs or more: use 1 gram injection instead", "Given in upper outer part of buttock", "Stay at clinic for 30 minutes after injection"]'
      WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Ceftriaxone')
        AND indication = 'Uncomplicated Gonorrhea (CDC 2021)';

      -- Doxycycline Chlamydia - simple terms
      UPDATE medication_instruction_templates SET
        short_dosing = 'Take 1 capsule by mouth twice daily for 7 days.',
        full_instructions = '["Take with food and a full glass of water", "Do not lie down for 1 hour after taking", "Avoid dairy, antacids, or iron supplements for 2 hours", "Finish all 7 days even if you feel better"]'
      WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Doxycycline')
        AND indication = 'Chlamydia Treatment';

      -- Azithromycin 1g Chlamydia - simple terms
      UPDATE medication_instruction_templates SET
        short_dosing = 'Take the entire packet by mouth as a single dose.',
        full_instructions = '["One dose only - take the whole packet", "May take with or without food", "Good option if taking pills daily is hard", "May cause stomach upset or diarrhea"]'
      WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Azithromycin 1g')
        AND indication = 'Chlamydia - Single Dose (CDC 2021)';

      -- Azithromycin 1g Gonorrhea dual therapy - simple terms
      UPDATE medication_instruction_templates SET
        short_dosing = 'Take 2 packets by mouth as a single dose. Must be given with ceftriaxone injection.',
        full_instructions = '["Used together with ceftriaxone shot - never use this alone for gonorrhea", "Take both packets at once", "May take with or without food", "Stay at clinic 30 min if given there"]'
      WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Azithromycin 1g')
        AND indication = 'Gonorrhea Dual Therapy (CDC 2021)';

      -- Gentamicin Gonorrhea alternative - simple terms
      UPDATE medication_instruction_templates SET
        short_dosing = 'Get one injection (240mg) in the buttock. Must also take azithromycin 2g by mouth.',
        full_instructions = '["For people allergic to ceftriaxone only", "You must also take azithromycin 2g by mouth - never use this shot alone", "Given in upper outer part of buttock", "Stay at clinic for 30 minutes after injection"]'
      WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Gentamicin')
        AND indication = 'Gonorrhea - Alternative Regimen (CDC 2021)';

      -- Levofloxacin Chlamydia alternative - simple terms
      UPDATE medication_instruction_templates SET
        short_dosing = 'Take 1 tablet (500mg) by mouth once daily for 7 days.',
        full_instructions = '["Take at the same time each day", "Take with or without food", "Do not take with antacids - wait 2 hours before or after", "Finish all 7 days even if you feel better"]'
      WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Levofloxacin')
        AND indication = 'Chlamydia - Alternative Regimen (CDC 2021)';

      -- Bicillin L-A / Penicillin G Syphilis - simple terms
      UPDATE medication_instruction_templates SET
        short_dosing = 'Get one injection (2.4 million units) in the buttock. One dose only.',
        full_instructions = '["One shot for early syphilis (primary, secondary, or early latent)", "Given in upper outer part of buttock - may use 2 shots (one per side)", "Warm to room temperature before injection", "Stay at clinic 15-20 min after (30 min if allergy history)"]'
      WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Bicillin L-A')
        AND indication = 'Early Syphilis (CDC 2021)';

      UPDATE medication_instruction_templates SET
        short_dosing = 'Get one injection (2.4 million units) in the buttock. One dose only.',
        full_instructions = '["One shot for early syphilis (primary, secondary, or early latent)", "Given in upper outer part of buttock - may use 2 shots (one per side)", "Warm to room temperature before injection", "Stay at clinic 15-20 min after (30 min if allergy history)"]'
      WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Penicillin G Benzathine')
        AND indication = 'Early Syphilis (CDC 2021)';
    `,
  },
  {
    version: 5,
    name: 'Add CDC 2022 STI medications and dispensing instruction templates',
    up: `
      -- =====================================================================
      -- PART A: Expand dosage_form CHECK to include gel, cream, ointment, ovule
      -- (Same recreate-and-rename approach as migration v3)
      -- =====================================================================
      CREATE TABLE IF NOT EXISTS medication_catalog_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          medication_name TEXT NOT NULL,
          generic_name TEXT,
          strength TEXT,
          dosage_form TEXT NOT NULL CHECK (dosage_form IN ('tablet', 'capsule', 'injection', 'solution', 'suspension', 'powder', 'packet', 'gel', 'cream', 'ointment', 'ovule', 'other')),
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
      INSERT INTO medication_catalog_new SELECT * FROM medication_catalog;
      DROP TABLE medication_catalog;
      ALTER TABLE medication_catalog_new RENAME TO medication_catalog;
      CREATE INDEX IF NOT EXISTS idx_med_catalog_name ON medication_catalog(medication_name);
      CREATE INDEX IF NOT EXISTS idx_med_catalog_generic ON medication_catalog(generic_name);
      CREATE INDEX IF NOT EXISTS idx_med_catalog_ndc ON medication_catalog(ndc_code);
      CREATE INDEX IF NOT EXISTS idx_med_catalog_category ON medication_catalog(category);
      CREATE INDEX IF NOT EXISTS idx_med_catalog_active ON medication_catalog(is_active);

      -- =====================================================================
      -- PART B: Insert new medications into medication_catalog
      -- All use INSERT OR IGNORE for idempotency
      -- =====================================================================

      -- Antibiotics - oral
      INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, default_unit, is_controlled, storage_requirements) VALUES
      ('Amoxicillin', 'amoxicillin trihydrate', '500mg', 'capsule', 'Antibiotic', 'capsule', 0, 'Store at room temperature; keep dry'),
      ('Cefixime', 'cefixime', '800mg', 'tablet', 'Antibiotic', 'tablet', 0, 'Store below 30°C (86°F)'),
      ('Metronidazole', 'metronidazole', '500mg', 'tablet', 'Antibiotic', 'tablet', 0, 'Store below 25°C (77°F); protect from light'),
      ('Metronidazole 2g', 'metronidazole', '2g', 'tablet', 'Antibiotic', 'tablet', 0, 'Store below 25°C (77°F); protect from light'),
      ('Tinidazole', 'tinidazole', '2g', 'tablet', 'Antibiotic', 'tablet', 0, 'Store below 30°C (86°F)'),
      ('Secnidazole', 'secnidazole', '2g', 'powder', 'Antibiotic', 'packet', 0, 'Store at room temperature'),
      ('Clindamycin', 'clindamycin hydrochloride', '300mg', 'capsule', 'Antibiotic', 'capsule', 0, 'Store at room temperature'),
      ('Tetracycline', 'tetracycline hydrochloride', '500mg', 'capsule', 'Antibiotic', 'capsule', 0, 'Store below 30°C; protect from light and moisture'),
      ('Ciprofloxacin', 'ciprofloxacin hydrochloride', '500mg', 'tablet', 'Antibiotic', 'tablet', 0, 'Store below 30°C (86°F)'),
      ('Erythromycin Base', 'erythromycin base', '500mg', 'tablet', 'Antibiotic', 'tablet', 0, 'Store below 30°C; protect from moisture'),
      ('Probenecid', 'probenecid', '500mg', 'tablet', 'Other', 'tablet', 0, 'Store at room temperature');

      -- Antibiotics - topical/vaginal
      INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, default_unit, is_controlled, storage_requirements) VALUES
      ('Metronidazole Gel', 'metronidazole', '0.75%', 'gel', 'Antibiotic', 'applicator', 0, 'Store at room temperature; do not freeze'),
      ('Clindamycin Cream', 'clindamycin phosphate', '2%', 'cream', 'Antibiotic', 'applicator', 0, 'Store at room temperature; do not freeze'),
      ('Clindamycin Ovules', 'clindamycin phosphate', '100mg', 'ovule', 'Antibiotic', 'ovule', 0, 'Store below 25°C (77°F)');

      -- Antibiotics - injectable
      INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, default_unit, is_controlled, storage_requirements) VALUES
      ('Ceftriaxone 1g IM', 'ceftriaxone sodium', '1g', 'injection', 'Antibiotic', 'vial', 0, 'Store below 25°C (77°F); protect from light'),
      ('Ceftriaxone 250mg IM', 'ceftriaxone sodium', '250mg', 'injection', 'Antibiotic', 'vial', 0, 'Store below 25°C (77°F); protect from light'),
      ('Benzathine Penicillin G 7.2M', 'penicillin G benzathine', '7.2M units (3x2.4M)', 'injection', 'Antibiotic', 'vial', 0, 'Store refrigerated at 2°C to 8°C (36°F to 46°F); protect from light'),
      ('Aqueous Penicillin G IV', 'penicillin G potassium', '18-24M units/day', 'injection', 'Antibiotic', 'vial', 0, 'Store refrigerated; prepare fresh for each infusion'),
      ('Procaine Penicillin G', 'procaine penicillin G', '2.4M units', 'injection', 'Antibiotic', 'vial', 0, 'Store refrigerated at 2°C to 8°C (36°F to 46°F)');

      -- Antivirals - oral
      INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, default_unit, is_controlled, storage_requirements) VALUES
      ('Acyclovir', 'acyclovir', '400mg', 'tablet', 'Antiviral', 'tablet', 0, 'Store at room temperature; protect from moisture'),
      ('Famciclovir', 'famciclovir', '250mg', 'tablet', 'Antiviral', 'tablet', 0, 'Store at room temperature'),
      ('Valacyclovir 500mg', 'valacyclovir hydrochloride', '500mg', 'tablet', 'Antiviral', 'tablet', 0, 'Store at room temperature');

      -- Topical wart treatments
      INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, default_unit, is_controlled, storage_requirements) VALUES
      ('Podofilox', 'podofilox', '0.5%', 'solution', 'Other', 'applicator', 0, 'Store at room temperature; keep away from open flame'),
      ('Imiquimod', 'imiquimod', '5%', 'cream', 'Other', 'packet', 0, 'Store at room temperature; do not freeze'),
      ('Sinecatechins', 'sinecatechins (green tea extract)', '15%', 'ointment', 'Other', 'tube', 0, 'Store at room temperature');

      -- =====================================================================
      -- PART C: Insert instruction templates
      -- All use INSERT OR IGNORE keyed on (medication_catalog_id, indication)
      -- Note: medication_instruction_templates has no unique constraint on
      -- (medication_catalog_id, indication) so we rely on the indication text
      -- being unique per medication to avoid duplicates via OR IGNORE on id.
      -- We use a NOT EXISTS guard pattern for safety.
      -- =====================================================================

      -- ----- Azithromycin 1g: new indications (Chlamydia, Cervicitis, Chancroid, LGV) -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Chlamydia - Single Dose (CDC 2022)',
        'Take the entire packet by mouth as a single dose.',
        '["One dose only - take the whole packet at one time","May take with or without food","Good option if taking pills daily is hard","May cause stomach upset or diarrhea"]',
        '["⚠️ May cause diarrhea or stomach upset","⚠️ Avoid if history of ventricular arrhythmias or QT prolongation","⚠️ Report irregular heartbeat or severe diarrhea to your provider"]',
        '1', '["STI Treatment - Chlamydia","Chlamydia Single Dose"]', 1
      FROM medication_catalog WHERE medication_name = 'Azithromycin 1g'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Azithromycin 1g')
            AND indication = 'Chlamydia - Single Dose (CDC 2022)');

      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Cervicitis / Urethritis - Single Dose Alternative (CDC 2022)',
        'Take the entire packet by mouth as a single dose.',
        '["One dose only - take the whole packet at one time","May take with or without food","Return to clinic if symptoms persist beyond 7 days","Avoid sexual contact until you and your partner(s) have completed treatment"]',
        '["⚠️ May cause nausea, vomiting, or stomach cramps","⚠️ Avoid if history of QT prolongation or arrhythmias","⚠️ Not recommended as first-line therapy for gonorrhea"]',
        '1', '["STI Treatment - Cervicitis","STI Treatment - Urethritis"]', 1
      FROM medication_catalog WHERE medication_name = 'Azithromycin 1g'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Azithromycin 1g')
            AND indication = 'Cervicitis / Urethritis - Single Dose Alternative (CDC 2022)');

      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Chancroid - Single Dose (CDC 2022)',
        'Take the entire packet by mouth as a single dose.',
        '["One dose only - take the whole packet at one time","May take with or without food","Ulcers should begin healing within 7 days; return if they do not","All sexual partners in past 10 days should be evaluated and treated"]',
        '["⚠️ May cause stomach upset or diarrhea","⚠️ Avoid if history of cardiac arrhythmia","⚠️ Report new or worsening ulcers to your provider"]',
        '1', '["STI Treatment - Chancroid"]', 1
      FROM medication_catalog WHERE medication_name = 'Azithromycin 1g'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Azithromycin 1g')
            AND indication = 'Chancroid - Single Dose (CDC 2022)');

      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Lymphogranuloma Venereum (LGV) - Once Weekly x 3 Weeks Alternative (CDC 2022)',
        'Take the entire packet by mouth once a week for 3 weeks (3 total doses, one week apart).',
        '["Take one dose (1g) once per week for 3 consecutive weeks","May take with or without food","Do not miss a weekly dose; if you miss one, take it as soon as possible","Avoid sexual contact until treatment is complete and symptoms resolve"]',
        '["⚠️ May cause nausea, vomiting, or abdominal pain","⚠️ Avoid if history of QT prolongation or liver disease","⚠️ Report worsening lymph node swelling or fever to your provider"]',
        '21', '["STI Treatment - LGV","Lymphogranuloma Venereum"]', 1
      FROM medication_catalog WHERE medication_name = 'Azithromycin 1g'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Azithromycin 1g')
            AND indication = 'Lymphogranuloma Venereum (LGV) - Once Weekly x 3 Weeks Alternative (CDC 2022)');

      -- ----- Doxycycline: new indications (PID/14-day, LGV/21-day, Syphilis/28-day) -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'PID / Gonorrhea Oral / Proctitis - 14-Day Course (CDC 2022)',
        'Take one tablet by mouth twice a day for 14 days.',
        '["Take every 12 hours with a full glass of water","Remain upright for at least 30 minutes after taking","Avoid dairy, antacids, and iron supplements within 2 hours of dose","Complete the full course; stopping early may cause treatment failure","Return to clinic if symptoms worsen or do not improve within 72 hours"]',
        '["⚠️ Do NOT take if pregnant","⚠️ May cause photosensitivity - use sunscreen daily","⚠️ May cause nausea, vomiting, or esophageal ulceration","⚠️ Avoid taking at bedtime without water"]',
        '14', '["STI Treatment - PID","Pelvic Inflammatory Disease","STI Treatment - Proctitis"]', 1
      FROM medication_catalog WHERE medication_name = 'Doxycycline'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Doxycycline')
            AND indication = 'PID / Gonorrhea Oral / Proctitis - 14-Day Course (CDC 2022)');

      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Lymphogranuloma Venereum (LGV) / Acute Proctitis - 21-Day Course (CDC 2022)',
        'Take one tablet by mouth twice a day for 21 days.',
        '["Take every 12 hours with a full glass of water; remain upright for 30 minutes","Do not skip doses; completing the full 21-day course is critical for LGV","Avoid dairy, antacids, and iron within 2 hours of dose","Return to clinic if rectal bleeding, fever, or tenesmus worsens"]',
        '["⚠️ Do NOT use if pregnant","⚠️ May cause significant photosensitivity; avoid sun exposure","⚠️ May cause nausea, esophageal irritation, or diarrhea","⚠️ Avoid alcohol to reduce risk of stomach upset"]',
        '21', '["STI Treatment - LGV","Lymphogranuloma Venereum","STI Treatment - Proctitis"]', 1
      FROM medication_catalog WHERE medication_name = 'Doxycycline'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Doxycycline')
            AND indication = 'Lymphogranuloma Venereum (LGV) / Acute Proctitis - 21-Day Course (CDC 2022)');

      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Syphilis Late Latent / Latent of Unknown Duration - Alternative 28-Day Course (CDC 2022)',
        'Take one tablet by mouth twice a day for 28 days.',
        '["Take every 12 hours; do not miss doses - this is a long course","Take with a full glass of water; stay upright for 30 minutes after","Avoid dairy, antacids, calcium, and iron within 2 hours of each dose","Follow-up serologic testing (RPR/VDRL) is required after treatment"]',
        '["⚠️ Do NOT use in pregnancy - benzathine penicillin G is required for pregnant patients","⚠️ May cause sun sensitivity, nausea, and esophageal irritation","⚠️ Not recommended for neurosyphilis - consult ID"]',
        '28', '["STI Treatment - Syphilis","Late Latent Syphilis","Syphilis Alternative Regimen"]', 1
      FROM medication_catalog WHERE medication_name = 'Doxycycline'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Doxycycline')
            AND indication = 'Syphilis Late Latent / Latent of Unknown Duration - Alternative 28-Day Course (CDC 2022)');

      -- ----- Levofloxacin: new indication (Persistent Urethritis 10-day) -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Recurrent / Persistent Urethritis or Proctitis - 10-Day Course (CDC 2022)',
        'Take one tablet by mouth once a day for 10 days.',
        '["Take at the same time each day","May take with or without food; drink plenty of water","Complete all 10 days; do not stop early","Avoid antacids, calcium, iron within 2 hours before or after dose"]',
        '["⚠️ Risk of tendon rupture - stop and call provider if tendon pain develops","⚠️ May cause CNS effects: dizziness, confusion, or anxiety","⚠️ Avoid in pregnancy","⚠️ May worsen myasthenia gravis"]',
        '10', '["STI Treatment - Urethritis","Recurrent Urethritis","STI Treatment - Proctitis"]', 1
      FROM medication_catalog WHERE medication_name = 'Levofloxacin'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Levofloxacin')
            AND indication = 'Recurrent / Persistent Urethritis or Proctitis - 10-Day Course (CDC 2022)');

      -- ----- Valacyclovir 1g: new indications (First Episode, Recurrent) -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Genital Herpes (HSV-2) - First Episode (CDC 2022)',
        'For first episode: Take one tablet by mouth twice a day for 7-10 days.',
        '["Take with or without food; drink plenty of fluids","Begin as soon as possible after symptom onset","For recurrent episodes, start at first sign of recurrence (tingling, itching, burning)","Complete the full prescribed course","Keep a supply of medication available to start immediately with next outbreak"]',
        '["⚠️ High doses may cause kidney problems - stay well hydrated and inform provider of renal history","⚠️ Rare but serious: TTP/HUS in immunocompromised patients - report unusual bruising or confusion","⚠️ May cause headache, nausea, or dizziness","⚠️ Does not cure herpes; suppressive therapy can be discussed with provider"]',
        '10', '["Genital Herpes - First Episode","HSV-2 First Episode","Herpes Treatment"]', 1
      FROM medication_catalog WHERE medication_name = 'Valacyclovir'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Valacyclovir')
            AND indication = 'Genital Herpes (HSV-2) - First Episode (CDC 2022)');

      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Genital Herpes (HSV-2) - Recurrent Episodes (CDC 2022)',
        'For recurrent episodes: Take one tablet by mouth once a day for 5 days.',
        '["Take with or without food; drink plenty of fluids","Start at first sign of recurrence - tingling, itching, or burning","Complete the full 5-day course","Keep a supply of medication available to start at next outbreak"]',
        '["⚠️ High doses may cause kidney problems - stay well hydrated","⚠️ May cause headache, nausea, or dizziness","⚠️ Does not cure herpes; suppressive therapy available","⚠️ Does not completely prevent transmission to partners"]',
        '5', '["Genital Herpes - Recurrent","HSV-2 Recurrent Episode","Herpes Recurrence"]', 1
      FROM medication_catalog WHERE medication_name = 'Valacyclovir'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Valacyclovir')
            AND indication = 'Genital Herpes (HSV-2) - Recurrent Episodes (CDC 2022)');

      -- ----- Amoxicillin: Chlamydia in pregnancy -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Chlamydia - Pregnant Women (CDC 2022)',
        'Take one capsule by mouth three times a day for 7 days.',
        '["Take every 8 hours (e.g., morning, afternoon, evening)","May be taken with or without food; taking with food reduces stomach upset","Complete the full 7-day course even if you feel better","A test of cure is recommended 3-4 weeks after completing therapy"]',
        '["⚠️ Tell your provider if you have a penicillin allergy before taking","⚠️ May cause diarrhea, rash, or yeast infection","⚠️ Stop and call your provider if you develop a rash or difficulty breathing","⚠️ Safe in pregnancy; do not substitute with doxycycline"]',
        '7', '["STI Treatment - Chlamydia","Chlamydia in Pregnancy"]', 1
      FROM medication_catalog WHERE medication_name = 'Amoxicillin'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Amoxicillin')
            AND indication = 'Chlamydia - Pregnant Women (CDC 2022)');

      -- ----- Ceftriaxone 1g IM: Gonorrhea high-weight -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Gonorrhea - Single Dose for Patients 150kg or More (CDC 2022)',
        'Administered by healthcare provider as a single intramuscular injection.',
        '["This higher dose is used for patients weighing 150kg (330 lbs) or more","Administered as a single shot by your provider","Avoid sexual contact until treatment is complete and symptoms resolve","Return to clinic if symptoms persist after 3-5 days"]',
        '["⚠️ Inform provider of any cephalosporin or penicillin allergy before injection","⚠️ May cause injection site pain or discomfort","⚠️ Report signs of allergic reaction (rash, hives, swelling, difficulty breathing) immediately"]',
        '1', '["STI Treatment - Gonorrhea","Gonorrhea High Weight"]', 1
      FROM medication_catalog WHERE medication_name = 'Ceftriaxone 1g IM'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Ceftriaxone 1g IM')
            AND indication = 'Gonorrhea - Single Dose for Patients 150kg or More (CDC 2022)');

      -- ----- Ceftriaxone 250mg IM: Chancroid -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Chancroid - Single Dose Intramuscular Injection (CDC 2022)',
        'Administered by healthcare provider as a single intramuscular injection.',
        '["Given as a single shot by your healthcare provider","Ulcers should begin to improve within 7 days of treatment","Sexual partners from the past 10 days should be evaluated","Use condoms to prevent reinfection"]',
        '["⚠️ Inform provider of cephalosporin or penicillin allergy before receiving","⚠️ May cause injection site discomfort","⚠️ Report signs of allergic reaction immediately"]',
        '1', '["STI Treatment - Chancroid"]', 1
      FROM medication_catalog WHERE medication_name = 'Ceftriaxone 250mg IM'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Ceftriaxone 250mg IM')
            AND indication = 'Chancroid - Single Dose Intramuscular Injection (CDC 2022)');

      -- ----- Cefixime: Gonorrhea oral alternative -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Gonorrhea - Oral Alternative When Injection Contraindicated (CDC 2022)',
        'Take by mouth as a single dose as directed by your provider.',
        '["Take all tablets at one time as a single dose","May be taken with or without food","Used only when ceftriaxone injection cannot be given","Return for test of cure in 1-2 weeks - this regimen has reduced efficacy for pharyngeal gonorrhea","Avoid sexual contact until you and your partner(s) complete treatment"]',
        '["⚠️ Not recommended as first-line - use only when ceftriaxone is contraindicated","⚠️ May cause diarrhea, stomach upset, or rash","⚠️ Confirm with provider if you have a cephalosporin allergy before taking","⚠️ Test of cure is required after this regimen"]',
        '1', '["STI Treatment - Gonorrhea","Gonorrhea Oral Alternative","Cephalosporin Allergy"]', 1
      FROM medication_catalog WHERE medication_name = 'Cefixime'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Cefixime')
            AND indication = 'Gonorrhea - Oral Alternative When Injection Contraindicated (CDC 2022)');

      -- ----- Metronidazole 500mg: BV / Trichomoniasis 7-day -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Bacterial Vaginosis / Trichomoniasis - 7-Day Course (CDC 2022)',
        'Take one tablet by mouth twice a day for 7 days.',
        '["Take every 12 hours, with food to reduce stomach upset","Do NOT drink alcohol during treatment or for 24 hours after the last dose","Complete the full 7-day course even if symptoms resolve early","For trichomoniasis, sexual partners must also be treated"]',
        '["⚠️ Do NOT consume alcohol during treatment or for 24 hours after - severe reaction (nausea, vomiting, flushing) may occur","⚠️ May cause metallic taste in mouth, nausea, or headache","⚠️ May cause darkening of urine - this is harmless","⚠️ Use with caution in first trimester of pregnancy; consult provider"]',
        '7', '["Bacterial Vaginosis","BV Treatment","STI Treatment - Trichomoniasis","Trichomoniasis"]', 1
      FROM medication_catalog WHERE medication_name = 'Metronidazole'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Metronidazole')
            AND indication = 'Bacterial Vaginosis / Trichomoniasis - 7-Day Course (CDC 2022)');

      -- ----- Metronidazole 2g: Trichomoniasis single dose (men) -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Trichomoniasis - Single Dose (CDC 2022)',
        'Take all tablets by mouth at one time as a single dose.',
        '["Take all tablets together as one single dose","Take with food to reduce stomach upset","Do NOT drink alcohol for at least 24 hours after taking this dose","Sexual partner(s) must also be treated to prevent reinfection"]',
        '["⚠️ Do NOT drink alcohol for 24 hours after this dose - may cause severe reaction","⚠️ May cause metallic taste, nausea, vomiting, or headache","⚠️ May cause darkening of urine - this is temporary and harmless","⚠️ Consult provider before use in first trimester of pregnancy"]',
        '1', '["STI Treatment - Trichomoniasis","Trichomoniasis Single Dose"]', 1
      FROM medication_catalog WHERE medication_name = 'Metronidazole 2g'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Metronidazole 2g')
            AND indication = 'Trichomoniasis - Single Dose (CDC 2022)');

      -- ----- Metronidazole Gel: BV intravaginal -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Bacterial Vaginosis - Intravaginal 5-Night Course (CDC 2022)',
        'Insert one full applicator (5g) intravaginally at bedtime for 5 days.',
        '["Use the applicator to insert the gel deep into the vagina at bedtime","Use for 5 consecutive nights","Wash hands before and after use","Avoid sexual intercourse during treatment","Do not use tampons during treatment"]',
        '["⚠️ Do NOT consume alcohol during treatment or for 24 hours after last dose","⚠️ May cause vaginal irritation, discharge, or yeast overgrowth","⚠️ May weaken latex condoms and diaphragms - do not rely on them during treatment","⚠️ Contact provider if symptoms worsen"]',
        '5', '["Bacterial Vaginosis","BV Intravaginal","BV Treatment"]', 1
      FROM medication_catalog WHERE medication_name = 'Metronidazole Gel'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Metronidazole Gel')
            AND indication = 'Bacterial Vaginosis - Intravaginal 5-Night Course (CDC 2022)');

      -- ----- Tinidazole: Trichomoniasis / BV single dose -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Trichomoniasis / Bacterial Vaginosis - Single Dose (CDC 2022)',
        'Take all tablets by mouth at one time as a single dose with food.',
        '["Take all tablets together at one time, with food","Do NOT drink alcohol during treatment or for 72 hours after the dose","For trichomoniasis, partner(s) must also be treated","A longer course (1g daily x 5 days) may be used for BV - follow your provider instructions"]',
        '["⚠️ Do NOT drink alcohol for 72 hours after taking this medication - severe reaction may occur","⚠️ May cause metallic taste, nausea, or dizziness","⚠️ Avoid use in first trimester of pregnancy","⚠️ May cause darkening of urine temporarily"]',
        '1', '["STI Treatment - Trichomoniasis","Bacterial Vaginosis","BV Treatment","Trichomoniasis Single Dose"]', 1
      FROM medication_catalog WHERE medication_name = 'Tinidazole'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Tinidazole')
            AND indication = 'Trichomoniasis / Bacterial Vaginosis - Single Dose (CDC 2022)');

      -- ----- Secnidazole: BV single dose granules -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Bacterial Vaginosis - Single Dose Oral Granules (CDC 2022)',
        'Sprinkle the entire packet of granules onto soft food (yogurt, applesauce, or pudding) and consume all of it at once within 30 minutes. Do not chew the granules.',
        '["Sprinkle the full packet onto a small amount of soft food and eat immediately","Do not chew the granules - swallow with the food","Do not take with alcohol; wait at least 24 hours after completing before drinking","A single dose is the full course - no additional pills needed","Contact provider if symptoms return within 2 weeks"]',
        '["⚠️ Avoid alcohol for 24 hours after taking","⚠️ May cause headache, nausea, vaginal yeast infection, or diarrhea","⚠️ May cause darkening of urine temporarily","⚠️ Safety in pregnancy not well established - consult provider"]',
        '1', '["Bacterial Vaginosis","BV Treatment","BV Single Dose"]', 1
      FROM medication_catalog WHERE medication_name = 'Secnidazole'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Secnidazole')
            AND indication = 'Bacterial Vaginosis - Single Dose Oral Granules (CDC 2022)');

      -- ----- Clindamycin 300mg: BV oral 7-day -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Bacterial Vaginosis - 7-Day Oral Course (CDC 2022)',
        'Take one capsule by mouth twice a day for 7 days.',
        '["Take every 12 hours; may take with food to reduce stomach upset","Complete the full 7-day course","Avoid sexual intercourse until treatment is complete","Avoid alcohol during treatment"]',
        '["⚠️ May cause diarrhea, including severe colitis (C. difficile) - report severe or bloody diarrhea immediately","⚠️ May cause nausea, abdominal cramps, or rash","⚠️ Report any signs of severe allergic reaction (throat swelling, difficulty breathing)"]',
        '7', '["Bacterial Vaginosis","BV Treatment","BV Oral"]', 1
      FROM medication_catalog WHERE medication_name = 'Clindamycin'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Clindamycin')
            AND indication = 'Bacterial Vaginosis - 7-Day Oral Course (CDC 2022)');

      -- ----- Clindamycin Cream: BV intravaginal 7-night -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Bacterial Vaginosis - Intravaginal 7-Night Course (CDC 2022)',
        'Insert one full applicator (5g) intravaginally at bedtime for 7 days.',
        '["Use the applicator to insert cream deep into the vagina at bedtime","Use for 7 consecutive nights","Wash hands before and after use","Avoid sexual intercourse during treatment","Do not use tampons during treatment"]',
        '["⚠️ May weaken latex condoms and diaphragms - do not rely on them during or for 72 hours after treatment","⚠️ May cause vaginal burning, itching, or yeast overgrowth","⚠️ Do not use if allergic to clindamycin or lincomycin","⚠️ Contact provider if vaginal symptoms worsen"]',
        '7', '["Bacterial Vaginosis","BV Intravaginal","BV Treatment"]', 1
      FROM medication_catalog WHERE medication_name = 'Clindamycin Cream'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Clindamycin Cream')
            AND indication = 'Bacterial Vaginosis - Intravaginal 7-Night Course (CDC 2022)');

      -- ----- Clindamycin Ovules: BV intravaginal 3-night -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Bacterial Vaginosis - Intravaginal 3-Night Course (CDC 2022)',
        'Insert one ovule intravaginally at bedtime for 3 days.',
        '["Insert one ovule deep into the vagina at bedtime for 3 consecutive nights","Wash hands before and after use","Do not use tampons during treatment","Avoid sexual intercourse during treatment"]',
        '["⚠️ May weaken latex condoms and diaphragms for up to 72 hours after last use","⚠️ May cause local irritation, burning, or yeast overgrowth","⚠️ Report worsening symptoms or severe irritation to provider"]',
        '3', '["Bacterial Vaginosis","BV Intravaginal","BV Treatment"]', 1
      FROM medication_catalog WHERE medication_name = 'Clindamycin Ovules'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Clindamycin Ovules')
            AND indication = 'Bacterial Vaginosis - Intravaginal 3-Night Course (CDC 2022)');

      -- ----- Benzathine Penicillin G 7.2M: Syphilis late latent 3 weekly doses -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Syphilis Late Latent / Latent of Unknown Duration - 3 Weekly Doses (CDC 2022)',
        'Administered by healthcare provider as 3 intramuscular injections of 2.4 million units each, given once per week for 3 consecutive weeks.',
        '["You will receive one injection per week for 3 weeks (3 total injections)","Do not miss any scheduled weekly injection - missing a dose may require restarting","Remain in clinic for 30 minutes after each injection","Follow-up serologic testing (RPR) is required at 6, 12, and 24 months"]',
        '["⚠️ Do NOT receive if you have a documented penicillin allergy - consult provider for desensitization","⚠️ Jarisch-Herxheimer reaction may occur after each injection - use acetaminophen for relief","⚠️ Report signs of allergic reaction (rash, hives, difficulty breathing) immediately after injection","⚠️ This is the only recommended regimen in pregnancy for this stage"]',
        '21', '["STI Treatment - Syphilis","Late Latent Syphilis","Syphilis 3-Dose"]', 1
      FROM medication_catalog WHERE medication_name = 'Benzathine Penicillin G 7.2M'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Benzathine Penicillin G 7.2M')
            AND indication = 'Syphilis Late Latent / Latent of Unknown Duration - 3 Weekly Doses (CDC 2022)');

      -- ----- Aqueous Penicillin G IV: Neurosyphilis IV -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Neurosyphilis - IV Infusion 10-14 Days (CDC 2022)',
        'Administered by healthcare provider intravenously as 3-4 million units every 4 hours, or as a continuous infusion of 18-24 million units per day, for 10-14 days.',
        '["This medication must be given in a hospital or clinical setting by IV","Treatment lasts 10-14 days and requires daily medical supervision","Follow-up lumbar puncture and blood tests are required after treatment","Notify provider immediately if you develop a rash, itching, or difficulty breathing during infusion"]',
        '["⚠️ Do NOT receive if you have a severe penicillin allergy - desensitization required","⚠️ May cause electrolyte imbalances (especially high potassium with high doses)","⚠️ Monitor renal function during treatment","⚠️ Jarisch-Herxheimer reaction may occur"]',
        '14', '["Neurosyphilis","STI Treatment - Syphilis","Syphilis IV Treatment"]', 1
      FROM medication_catalog WHERE medication_name = 'Aqueous Penicillin G IV'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Aqueous Penicillin G IV')
            AND indication = 'Neurosyphilis - IV Infusion 10-14 Days (CDC 2022)');

      -- ----- Procaine Penicillin G: Neurosyphilis IM alternative -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Neurosyphilis - Alternative IM Injection with Probenecid 10-14 Days (CDC 2022)',
        'Administered by healthcare provider as a daily intramuscular injection for 10-14 days. Must be given together with Probenecid 500mg by mouth four times a day.',
        '["Injection is given once daily at the clinic for 10-14 consecutive days","Must be taken with probenecid tablets to be effective","Do not miss daily injections - this is a required course for neurosyphilis","Follow up blood and spinal fluid tests will be needed after treatment"]',
        '["⚠️ Inform your provider of penicillin allergy before receiving","⚠️ May cause immediate systemic reaction (Hoigne syndrome) - dizziness, fear, confusion after injection","⚠️ Probenecid may interact with other medications - inform provider of all drugs you take","⚠️ Probenecid may cause gout flares in susceptible patients"]',
        '14', '["Neurosyphilis","STI Treatment - Syphilis","Syphilis IM Alternative"]', 1
      FROM medication_catalog WHERE medication_name = 'Procaine Penicillin G'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Procaine Penicillin G')
            AND indication = 'Neurosyphilis - Alternative IM Injection with Probenecid 10-14 Days (CDC 2022)');

      -- ----- Probenecid: Adjunct to penicillin -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Adjunct to Penicillin - Used with Procaine Penicillin G or Cefoxitin (CDC 2022)',
        'Take one tablet by mouth four times a day for the duration of antibiotic treatment as directed.',
        '["Take 4 times daily, evenly spaced throughout the day","Take with food or milk to reduce stomach upset","Drink plenty of fluids (6-8 glasses of water per day) to prevent kidney stones","Do not stop taking without provider instruction"]',
        '["⚠️ May cause gout flares in patients with history of gout","⚠️ Avoid aspirin while taking probenecid - it reduces its effectiveness","⚠️ May interact with many medications - inform provider of all current medicines","⚠️ May cause kidney stones - drink plenty of water"]',
        '14', '["Antibiotic Adjunct","Probenecid Adjunct","Neurosyphilis"]', 1
      FROM medication_catalog WHERE medication_name = 'Probenecid'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Probenecid')
            AND indication = 'Adjunct to Penicillin - Used with Procaine Penicillin G or Cefoxitin (CDC 2022)');

      -- ----- Tetracycline: Syphilis alternative -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Syphilis Alternative - Penicillin Allergy Non-Pregnant 14 or 28 Days (CDC 2022)',
        'Take one capsule by mouth four times a day for 14 days (early syphilis) or 28 days (late latent/unknown duration).',
        '["Take every 6 hours on an empty stomach (1 hour before or 2 hours after meals)","Take with a full glass of water; remain upright for 30 minutes after","Avoid dairy products, antacids, calcium, iron, and zinc within 2 hours of dose","Complete the full prescribed course; follow-up serologic testing is required"]',
        '["⚠️ Do NOT take if pregnant - may harm fetal bone and tooth development","⚠️ May cause significant sun sensitivity; use sunscreen and protective clothing","⚠️ May cause esophageal irritation or ulceration if not taken with water upright","⚠️ Not for use in children under 8 years"]',
        '28', '["STI Treatment - Syphilis","Syphilis Alternative Regimen","Penicillin Allergy"]', 1
      FROM medication_catalog WHERE medication_name = 'Tetracycline'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Tetracycline')
            AND indication = 'Syphilis Alternative - Penicillin Allergy Non-Pregnant 14 or 28 Days (CDC 2022)');

      -- ----- Ciprofloxacin: Chancroid 3-day -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Chancroid - 3-Day Oral Course (CDC 2022)',
        'Take one tablet by mouth twice a day for 3 days.',
        '["Take every 12 hours; may be taken with or without food","Avoid antacids, calcium, iron, or zinc within 2 hours of each dose","Drink plenty of fluids throughout treatment","Ulcers should show improvement within 7 days; return to clinic if not"]',
        '["⚠️ Risk of tendon rupture - stop and contact provider if you develop tendon pain or swelling","⚠️ Avoid in pregnancy and patients under 18","⚠️ May cause dizziness, nausea, or diarrhea","⚠️ May prolong QT interval - report palpitations or irregular heartbeat"]',
        '3', '["STI Treatment - Chancroid","Chancroid Oral"]', 1
      FROM medication_catalog WHERE medication_name = 'Ciprofloxacin'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Ciprofloxacin')
            AND indication = 'Chancroid - 3-Day Oral Course (CDC 2022)');

      -- ----- Erythromycin Base: Chancroid 7-day and LGV 21-day -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Chancroid - 7-Day Course (CDC 2022)',
        'Take one tablet by mouth three times a day for 7 days.',
        '["Take on an empty stomach if possible; if stomach upset occurs, may take with food","Complete the full prescribed course even if symptoms improve","Return to clinic if symptoms worsen or do not improve","Ulcers should begin healing within 7 days"]',
        '["⚠️ May cause nausea, vomiting, abdominal cramping, or diarrhea (very common)","⚠️ May prolong QT interval - report irregular heartbeat or fainting","⚠️ May cause liver toxicity with prolonged use - report yellowing of skin or eyes","⚠️ Interacts with many medications; inform provider of all drugs you take"]',
        '7', '["STI Treatment - Chancroid","Chancroid Oral"]', 1
      FROM medication_catalog WHERE medication_name = 'Erythromycin Base'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Erythromycin Base')
            AND indication = 'Chancroid - 7-Day Course (CDC 2022)');

      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Lymphogranuloma Venereum (LGV) - 21-Day Course (CDC 2022)',
        'Take one tablet by mouth four times a day for 21 days.',
        '["Take every 6 hours; on an empty stomach if possible","Complete the full 21-day course - do not stop early for LGV","Incomplete treatment may cause relapse","Return to clinic if symptoms worsen or do not improve"]',
        '["⚠️ May cause nausea, vomiting, abdominal cramping, or diarrhea (very common)","⚠️ May prolong QT interval - report irregular heartbeat or fainting","⚠️ May cause liver toxicity with prolonged use - report yellowing of skin or eyes","⚠️ Interacts with many medications; inform provider of all drugs you take"]',
        '21', '["STI Treatment - LGV","Lymphogranuloma Venereum"]', 1
      FROM medication_catalog WHERE medication_name = 'Erythromycin Base'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Erythromycin Base')
            AND indication = 'Lymphogranuloma Venereum (LGV) - 21-Day Course (CDC 2022)');

      -- ----- Podofilox: External genital warts -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'External Genital Warts - Patient-Applied (CDC 2022)',
        'Apply to visible warts twice a day for 3 consecutive days, then allow 4 days with no treatment. Repeat this cycle up to 4 times as needed.',
        '["Apply only to visible wart tissue; avoid surrounding healthy skin","Use a cotton swab or applicator; allow to dry before touching treated area","Wash hands thoroughly before and after application","Do not apply to open wounds, inside the vagina, cervix, rectum, or urethra","Maximum treatment area is 10 cm2; do not exceed 0.5 mL per day","Complete up to 4 treatment cycles (each = 3 days on, 4 days off)"]',
        '["⚠️ Do NOT use during pregnancy - may cause fetal harm","⚠️ May cause local burning, pain, erosion, or inflammation at the application site","⚠️ Avoid contact with eyes; if contact occurs, flush thoroughly with water","⚠️ Do not apply inside the vagina, anus, cervix, or urethra","⚠️ Warts may not disappear completely; follow up with provider"]',
        '28', '["Genital Warts","External Genital Warts","HPV Warts"]', 1
      FROM medication_catalog WHERE medication_name = 'Podofilox'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Podofilox')
            AND indication = 'External Genital Warts - Patient-Applied (CDC 2022)');

      -- ----- Imiquimod: External genital warts -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'External Genital Warts - Patient-Applied 3x Weekly Up to 16 Weeks (CDC 2022)',
        'Apply a thin layer to affected wart area at bedtime, 3 times per week (e.g., Monday, Wednesday, Friday). Leave on skin for 6-10 hours, then wash off with mild soap and water.',
        '["Apply at bedtime 3 nights per week - not every night","Wash the treated area 6-10 hours after application (in the morning)","Do not cover the treated area with bandages after applying","Allow skin to fully dry before applying; do not apply too much cream","New wart tissue may appear before improvement is seen; be patient and continue treatment","Sexual contact should be avoided while cream is on the skin"]',
        '["⚠️ Safety in pregnancy not established - consult provider before use","⚠️ May cause local redness, flaking, swelling, erosion, or severe skin irritation","⚠️ May weaken condoms and diaphragms - do not use latex protection while cream is applied","⚠️ Avoid sun exposure to treated areas; may increase sensitivity to UV light","⚠️ Report severe skin reactions or systemic flu-like symptoms to provider"]',
        '112', '["Genital Warts","External Genital Warts","HPV Warts"]', 1
      FROM medication_catalog WHERE medication_name = 'Imiquimod'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Imiquimod')
            AND indication = 'External Genital Warts - Patient-Applied 3x Weekly Up to 16 Weeks (CDC 2022)');

      -- ----- Sinecatechins: External genital warts -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'External Genital Warts - Patient-Applied 3x Daily Up to 16 Weeks (CDC 2022)',
        'Apply a 0.5 cm strand of ointment to each wart three times a day (every 8 hours) for up to 16 weeks. Do not wash off after application.',
        '["Apply a small amount (0.5 cm strand) to each wart 3 times daily","Do not wash off between applications","Do not use more than directed; excessive use does not improve results","Avoid sexual contact while ointment is applied","Do not apply inside the vagina, anus, urethra, or on open wounds","Derived from green tea extract; treatment may take several weeks to show effect"]',
        '["⚠️ Do NOT use during pregnancy","⚠️ May cause local burning, pain, erythema, edema, or ulceration at application site","⚠️ May weaken latex condoms and diaphragms","⚠️ Avoid sun exposure to treated areas","⚠️ Report severe skin breakdown or spreading redness to your provider"]',
        '112', '["Genital Warts","External Genital Warts","HPV Warts"]', 1
      FROM medication_catalog WHERE medication_name = 'Sinecatechins'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Sinecatechins')
            AND indication = 'External Genital Warts - Patient-Applied 3x Daily Up to 16 Weeks (CDC 2022)');

      -- ----- Acyclovir 400mg: First episode and suppressive -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Genital Herpes (HSV-2) - First Episode (CDC 2022)',
        'Take one tablet by mouth three times a day for 7-10 days.',
        '["Take every 8 hours, with or without food","Drink plenty of fluids to protect kidneys during treatment","Start as soon as possible after symptom onset; early treatment reduces severity","Complete the full 7-10 day course even if lesions begin healing","Herpes is a lifelong infection; this treats symptoms but does not cure the virus"]',
        '["⚠️ May cause nausea, headache, or dizziness","⚠️ May cause kidney damage at high doses - stay well hydrated","⚠️ Avoid sexual contact when lesions or prodromal symptoms are present","⚠️ Inform future partners of your herpes status; suppressive therapy reduces transmission risk"]',
        '10', '["Genital Herpes - First Episode","HSV-2 First Episode","Herpes Treatment"]', 1
      FROM medication_catalog WHERE medication_name = 'Acyclovir'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Acyclovir')
            AND indication = 'Genital Herpes (HSV-2) - First Episode (CDC 2022)');

      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'prevention', 'Genital Herpes (HSV-2) - Suppressive Therapy (CDC 2022)',
        'Take one tablet by mouth twice a day every day.',
        '["Take every 12 hours at the same times daily; do not skip doses","May take with or without food","Suppressive therapy reduces outbreak frequency and lowers transmission risk to partners","Continue taking even when no symptoms are present","Follow up with provider annually to reassess need for continued suppression"]',
        '["⚠️ Does not eliminate the virus - transmission is still possible even on suppressive therapy","⚠️ May cause headache, nausea, or fatigue with long-term use","⚠️ Adjust dose if kidney function is impaired - notify provider of any kidney disease","⚠️ Always use condoms to further reduce transmission risk"]',
        '30', '["Herpes Suppression","HSV-2 Suppressive Therapy","Genital Herpes Prevention"]', 1
      FROM medication_catalog WHERE medication_name = 'Acyclovir'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Acyclovir')
            AND indication = 'Genital Herpes (HSV-2) - Suppressive Therapy (CDC 2022)');

      -- ----- Famciclovir 250mg: First episode and suppressive -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'treatment', 'Genital Herpes (HSV-2) - First Episode (CDC 2022)',
        'Take one tablet by mouth three times a day for 7-10 days.',
        '["Take every 8 hours, with or without food","Begin as early as possible after symptom onset","Complete the full course even if symptoms improve before it ends","Stay well hydrated throughout treatment","Herpes cannot be cured; this medication manages outbreaks"]',
        '["⚠️ May cause headache, nausea, diarrhea, or fatigue","⚠️ Adjust dose for patients with kidney impairment - notify provider","⚠️ Avoid sexual contact when active lesions are present","⚠️ Does not prevent transmission of herpes virus"]',
        '10', '["Genital Herpes - First Episode","HSV-2 First Episode","Herpes Treatment"]', 1
      FROM medication_catalog WHERE medication_name = 'Famciclovir'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Famciclovir')
            AND indication = 'Genital Herpes (HSV-2) - First Episode (CDC 2022)');

      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'prevention', 'Genital Herpes (HSV-2) - Suppressive Therapy (CDC 2022)',
        'Take one tablet by mouth twice a day every day.',
        '["Take every 12 hours at consistent times daily","May take with or without food","Take every day, including days without symptoms","Annual reassessment with your provider is recommended","Use condoms to further reduce transmission to partners"]',
        '["⚠️ May cause headache, nausea, or dizziness","⚠️ Dose adjustment required for renal impairment","⚠️ Does not eliminate virus - transmission is still possible","⚠️ Tell your provider all medications you take, including OTC drugs"]',
        '30', '["Herpes Suppression","HSV-2 Suppressive Therapy","Genital Herpes Prevention"]', 1
      FROM medication_catalog WHERE medication_name = 'Famciclovir'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Famciclovir')
            AND indication = 'Genital Herpes (HSV-2) - Suppressive Therapy (CDC 2022)');

      -- ----- Valacyclovir 500mg: Suppressive therapy -----
      INSERT OR IGNORE INTO medication_instruction_templates
        (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons, is_active)
      SELECT id, 'prevention', 'Genital Herpes (HSV-2) - Suppressive Therapy (CDC 2022)',
        'Take one tablet by mouth once a day every day.',
        '["Take once daily at the same time each day; may take with or without food","Take every day even when you have no symptoms","Reduces risk of transmitting herpes to an uninfected partner","Reassess need for continued suppressive therapy with your provider annually","Continue using condoms for additional protection"]',
        '["⚠️ May cause headache, nausea, or abdominal pain","⚠️ Dose may need adjustment for kidney impairment - inform provider","⚠️ Does not completely prevent viral shedding or transmission","⚠️ Report unusual bruising, confusion, or decreased urination immediately"]',
        '30', '["Herpes Suppression","HSV-2 Suppressive Therapy","Genital Herpes Prevention"]', 1
      FROM medication_catalog WHERE medication_name = 'Valacyclovir 500mg'
        AND NOT EXISTS (SELECT 1 FROM medication_instruction_templates
          WHERE medication_catalog_id = (SELECT id FROM medication_catalog WHERE medication_name = 'Valacyclovir 500mg')
            AND indication = 'Genital Herpes (HSV-2) - Suppressive Therapy (CDC 2022)');
    `,
  },
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
    const row = db
      .prepare('SELECT version FROM db_metadata WHERE id = 1')
      .get() as { version: number } | undefined;
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
      "UPDATE db_metadata SET version = ?, updated_at = datetime('now') WHERE id = 1",
    ).run(version);
  } else {
    db.prepare(
      "INSERT INTO db_metadata (id, version, updated_at) VALUES (1, ?, datetime('now'))",
    ).run(version);
  }
}

/**
 * Run all pending migrations
 */
export function runMigrations(): void {
  const currentVersion = getCurrentVersion();
  const pendingMigrations = migrations.filter(
    (m) => m.version > currentVersion,
  );

  if (pendingMigrations.length === 0) {
    console.log(
      `[Migrations] Database is at version ${currentVersion}, no migrations needed`,
    );
    return;
  }

  console.log(
    `[Migrations] Running ${pendingMigrations.length} migration(s)...`,
  );

  const db = getDatabase();

  for (const migration of pendingMigrations) {
    console.log(
      `[Migrations] Applying v${migration.version}: ${migration.name}`,
    );

    // PRAGMA foreign_keys is a no-op inside a transaction, so we must
    // disable FK checks BEFORE starting the transaction and re-enable AFTER.
    db.pragma('foreign_keys = OFF');

    const transaction = db.transaction(() => {
      db.exec(migration.up);
      setVersion(migration.version);
    });

    transaction();

    db.pragma('foreign_keys = ON');
    console.log(`[Migrations] ✓ v${migration.version} applied`);
  }

  console.log(`[Migrations] Database now at version ${getCurrentVersion()}`);
}

/**
 * Check if migrations are needed
 */
export function needsMigration(): boolean {
  const currentVersion = getCurrentVersion();
  const pendingCount = migrations.filter(
    (m) => m.version > currentVersion,
  ).length;
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
  const latestVersion =
    migrations.length > 0 ? Math.max(...migrations.map((m) => m.version)) : 0;
  const pendingCount = migrations.filter(
    (m) => m.version > currentVersion,
  ).length;

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
