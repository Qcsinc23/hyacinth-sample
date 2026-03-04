-- ============================================================================
-- Migration v002: Add Medication Catalog and Instruction Templates
-- Phase 1: Database Schema Enhancements
-- ============================================================================

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- ============================================================================
-- 1. Medication Catalog Table
-- ============================================================================

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

-- ============================================================================
-- 2. Medication Instruction Templates Table
-- ============================================================================

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

-- ============================================================================
-- 3. Add Columns to record_reasons Table
-- ============================================================================

-- Add context column to record_reasons
ALTER TABLE record_reasons ADD COLUMN context TEXT CHECK (context IN ('treatment', 'prevention', 'prophylaxis', 'pep', 'prep', 'other'));

-- Add links_to_instruction column to record_reasons
ALTER TABLE record_reasons ADD COLUMN links_to_instruction BOOLEAN NOT NULL DEFAULT 0;

-- Create index for context lookups
CREATE INDEX IF NOT EXISTS idx_record_reasons_context ON record_reasons(context);

-- ============================================================================
-- 4. Add Columns to dispensing_line_items Table
-- ============================================================================

-- Add instruction_context column for context tracking
ALTER TABLE dispensing_line_items ADD COLUMN instruction_context TEXT CHECK (instruction_context IN ('treatment', 'prevention', 'prophylaxis', 'pep', 'prep', 'other'));

-- Add day_supply column for day supply tracking
ALTER TABLE dispensing_line_items ADD COLUMN day_supply INTEGER;

-- Add medication_strength column for strength tracking
ALTER TABLE dispensing_line_items ADD COLUMN medication_strength TEXT;

-- Add warnings column for JSON array of warnings
ALTER TABLE dispensing_line_items ADD COLUMN warnings TEXT;

-- Create index for instruction context lookups
CREATE INDEX IF NOT EXISTS idx_line_items_instruction_context ON dispensing_line_items(instruction_context);

-- ============================================================================
-- 5. Update db_metadata version
-- ============================================================================

UPDATE OR IGNORE db_metadata SET version = 2, updated_at = datetime('now') WHERE id = 1;
