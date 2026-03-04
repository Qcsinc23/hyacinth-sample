-- ============================================================================
-- Hyacinth Medication Dispensing System - Database Schema
-- Healthcare-grade SQLite schema with full audit trail and data integrity
-- ============================================================================

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- ============================================================================
-- Core Tables
-- ============================================================================

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chart_number TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    dob TEXT NOT NULL, -- ISO 8601: YYYY-MM-DD
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

-- Staff members table
CREATE TABLE IF NOT EXISTS staff_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    pin_hash TEXT NOT NULL, -- bcrypt hash
    role TEXT NOT NULL CHECK (role IN ('admin', 'dispenser')),
    is_active BOOLEAN NOT NULL DEFAULT 1,
    last_login_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_staff_active ON staff_members(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff_members(role);

-- ============================================================================
-- Dispensing Tables
-- ============================================================================

-- Dispensing records table
CREATE TABLE IF NOT EXISTS dispensing_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    dispensing_date TEXT NOT NULL, -- ISO 8601: YYYY-MM-DD
    dispensing_time TEXT NOT NULL, -- ISO 8601: HH:MM:SS
    staff_id INTEGER NOT NULL,
    label_quantity INTEGER NOT NULL DEFAULT 1,
    additional_notes TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'voided', 'corrected')),
    void_reason TEXT,
    voided_by INTEGER,
    voided_at TEXT, -- ISO 8601 datetime
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

-- Dispensing line items table
CREATE TABLE IF NOT EXISTS dispensing_line_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER NOT NULL,
    medication_name TEXT NOT NULL,
    is_custom_medication BOOLEAN NOT NULL DEFAULT 0,
    amount_value REAL NOT NULL,
    amount_unit TEXT NOT NULL,
    lot_number TEXT,
    expiration_date TEXT, -- ISO 8601: YYYY-MM-DD
    inventory_id INTEGER,
    dosing_instructions TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (record_id) REFERENCES dispensing_records(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_line_items_record ON dispensing_line_items(record_id);
CREATE INDEX IF NOT EXISTS idx_line_items_medication ON dispensing_line_items(medication_name);
CREATE INDEX IF NOT EXISTS idx_line_items_inventory ON dispensing_line_items(inventory_id);

-- Record reasons table (junction for many-to-many)
CREATE TABLE IF NOT EXISTS record_reasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER NOT NULL,
    reason_name TEXT NOT NULL,
    is_custom BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (record_id) REFERENCES dispensing_records(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_record_reasons_record ON record_reasons(record_id);
CREATE INDEX IF NOT EXISTS idx_record_reasons_name ON record_reasons(reason_name);

-- ============================================================================
-- Inventory Tables
-- ============================================================================

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medication_name TEXT NOT NULL,
    lot_number TEXT NOT NULL,
    ndc_code TEXT,
    expiration_date TEXT NOT NULL, -- ISO 8601: YYYY-MM-DD
    quantity_received INTEGER NOT NULL,
    quantity_on_hand INTEGER NOT NULL,
    unit TEXT NOT NULL,
    supplier TEXT,
    supplier_invoice TEXT,
    cost_per_unit REAL,
    received_date TEXT NOT NULL, -- ISO 8601: YYYY-MM-DD
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

-- Inventory transactions table (append-only)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_id INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('receive', 'dispense', 'adjustment', 'return', 'waste')),
    quantity_change INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    reference_type TEXT, -- 'dispense', 'adjustment', 'receive', etc.
    reference_id INTEGER,
    reason TEXT,
    performed_by INTEGER NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')), -- ISO 8601
    FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE RESTRICT,
    FOREIGN KEY (performed_by) REFERENCES staff_members(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_transactions_inventory ON inventory_transactions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON inventory_transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON inventory_transactions(reference_type, reference_id);

-- Inventory alerts table
CREATE TABLE IF NOT EXISTS inventory_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_id INTEGER NOT NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('expiring_soon', 'low_stock', 'expired')),
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    message TEXT NOT NULL,
    is_acknowledged BOOLEAN NOT NULL DEFAULT 0,
    acknowledged_by INTEGER,
    acknowledged_at TEXT, -- ISO 8601
    auto_resolved BOOLEAN NOT NULL DEFAULT 0,
    resolved_at TEXT, -- ISO 8601
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
    FOREIGN KEY (acknowledged_by) REFERENCES staff_members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_inventory ON inventory_alerts(inventory_id);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON inventory_alerts(is_acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON inventory_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON inventory_alerts(severity);

-- ============================================================================
-- Audit and Configuration Tables
-- ============================================================================

-- Audit log table (append-only, tamper-evident)
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    staff_id INTEGER,
    staff_name TEXT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')), -- ISO 8601
    details TEXT NOT NULL, -- JSON
    checksum TEXT NOT NULL, -- SHA-256 of concatenated fields + previous checksum
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (staff_id) REFERENCES staff_members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_staff ON audit_log(staff_id);

-- Access log table (comprehensive access logging)
CREATE TABLE IF NOT EXISTS access_log (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')), -- ISO 8601
    action TEXT NOT NULL,
    staff_id INTEGER,
    staff_name TEXT,
    ip_address TEXT,
    user_agent TEXT,
    entity_type TEXT,
    entity_id TEXT,
    details TEXT NOT NULL, -- JSON
    success INTEGER NOT NULL DEFAULT 1, -- Boolean (1=true, 0=false)
    failure_reason TEXT,
    checksum TEXT NOT NULL, -- SHA-256 for tamper-evidence
    FOREIGN KEY (staff_id) REFERENCES staff_members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_access_action ON access_log(action);
CREATE INDEX IF NOT EXISTS idx_access_timestamp ON access_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_access_staff ON access_log(staff_id);
CREATE INDEX IF NOT EXISTS idx_access_entity ON access_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_access_success ON access_log(success);

-- Drafts table
CREATE TABLE IF NOT EXISTS drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draft_type TEXT NOT NULL CHECK (draft_type IN ('dispense', 'inventory')),
    form_data TEXT NOT NULL, -- JSON
    staff_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (staff_id) REFERENCES staff_members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_drafts_staff ON drafts(staff_id);
CREATE INDEX IF NOT EXISTS idx_drafts_type ON drafts(draft_type);

-- Custom medications table (for tracking user-added medications)
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

-- Custom reasons table (for tracking user-added reasons)
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

-- Application settings table
CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- ============================================================================
-- Database Metadata Table (for migrations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS db_metadata (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    version INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Initialize with version 0
INSERT OR IGNORE INTO db_metadata (id, version) VALUES (1, 0);
