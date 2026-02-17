/**
 * Database Encryption Hooks
 * 
 * Wraps database operations with automatic field-level encryption for sensitive data.
 * Ensures patient names, DOB, phone, etc. are encrypted at rest.
 */

import type Database from 'better-sqlite3';
import {
  encryptFields,
  decryptFields,
  encryptPatientData,
  decryptPatientData,
  encryptStaffData,
  decryptStaffData,
  ENCRYPTED_FIELDS,
  type EncryptedTable,
} from '../security/databaseEncryption';

/**
 * Wrap a database statement's .run() method with encryption
 */
export function wrapRun<T extends Record<string, unknown>>(
  stmt: Database.Statement,
  tableName: EncryptedTable,
  data: T
): Database.RunResult {
  const encrypted = encryptFields(data, tableName);
  return stmt.run(...Object.values(encrypted));
}

/**
 * Wrap a database statement's .get() method with decryption
 */
export function wrapGet<T extends Record<string, unknown>>(
  stmt: Database.Statement,
  tableName: EncryptedTable,
  ...params: unknown[]
): T | null {
  const result = stmt.get(...params) as T | null;
  if (!result) return null;
  return decryptFields(result, tableName);
}

/**
 * Wrap a database statement's .all() method with decryption
 */
export function wrapAll<T extends Record<string, unknown>>(
  stmt: Database.Statement,
  tableName: EncryptedTable,
  ...params: unknown[]
): T[] {
  const results = stmt.all(...params) as T[];
  return results.map(row => decryptFields(row, tableName));
}

// ============================================================================
// Patient-Specific Encryption Helpers
// ============================================================================

/**
 * Encrypt patient data for database insertion/update
 */
export function encryptPatientForDb<T extends Record<string, unknown>>(patient: T): T {
  return encryptPatientData(patient);
}

/**
 * Decrypt patient data from database results
 */
export function decryptPatientFromDb<T extends Record<string, unknown>>(patient: T | null): T | null {
  if (!patient) return null;
  return decryptPatientData(patient);
}

/**
 * Decrypt multiple patient records from database results
 */
export function decryptPatientsFromDb<T extends Record<string, unknown>>(patients: T[]): T[] {
  return patients.map(p => decryptPatientData(p));
}

// ============================================================================
// Staff-Specific Encryption Helpers
// ============================================================================

/**
 * Encrypt staff data for database insertion/update
 */
export function encryptStaffForDb<T extends Record<string, unknown>>(staff: T): T {
  return encryptStaffData(staff);
}

/**
 * Decrypt staff data from database results
 */
export function decryptStaffFromDb<T extends Record<string, unknown>>(staff: T | null): T | null {
  if (!staff) return null;
  return decryptStaffData(staff);
}

/**
 * Decrypt multiple staff records from database results
 */
export function decryptStaffMembersFromDb<T extends Record<string, unknown>>(staff: T[]): T[] {
  return staff.map(s => decryptStaffData(s));
}

// ============================================================================
// SQL Statement Helpers - Creates wrapped statements
// ============================================================================

/**
 * Create an INSERT statement for patients with automatic encryption
 */
export function prepareEncryptedPatientInsert(
  db: Database.Database
): Database.Statement {
  return db.prepare(`
    INSERT INTO patients (
      chart_number, first_name, last_name, dob, phone, email, address, notes,
      is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
}

/**
 * Create an UPDATE statement for patients with automatic encryption
 */
export function prepareEncryptedPatientUpdate(
  db: Database.Database
): Database.Statement {
  return db.prepare(`
    UPDATE patients 
    SET chart_number = ?, first_name = ?, last_name = ?, dob = ?, 
        phone = ?, email = ?, address = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `);
}

/**
 * Create a SELECT statement for patients (decryption handled separately)
 */
export function preparePatientSelect(
  db: Database.Database,
  whereClause: string = 'WHERE id = ?'
): Database.Statement {
  return db.prepare(`SELECT * FROM patients ${whereClause}`);
}

/**
 * Create an INSERT statement for staff with automatic encryption
 */
export function prepareEncryptedStaffInsert(
  db: Database.Database
): Database.Statement {
  return db.prepare(`
    INSERT INTO staff_members (
      first_name, last_name, pin_hash, role, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 1, ?, ?)
  `);
}

/**
 * Create an UPDATE statement for staff with automatic encryption
 */
export function prepareEncryptedStaffUpdate(
  db: Database.Database
): Database.Statement {
  return db.prepare(`
    UPDATE staff_members 
    SET first_name = ?, last_name = ?, updated_at = ?
    WHERE id = ?
  `);
}

// ============================================================================
// Wrapped Query Functions for Common Operations
// ============================================================================

export interface PatientInput {
  chart_number: string;
  first_name: string;
  last_name: string;
  dob: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

/**
 * Execute encrypted patient insert and return decrypted result
 */
export function insertPatientEncrypted(
  db: Database.Database,
  patient: PatientInput,
  now: string
): Record<string, unknown> {
  // Encrypt sensitive fields
  const encrypted = encryptPatientForDb({
    chart_number: patient.chart_number,
    first_name: patient.first_name,
    last_name: patient.last_name,
    dob: patient.dob,
    phone: patient.phone || null,
    email: patient.email || null,
    address: patient.address || null,
    notes: patient.notes || null,
    created_at: now,
    updated_at: now,
  });

  const stmt = db.prepare(`
    INSERT INTO patients (
      chart_number, first_name, last_name, dob, phone, email, address, notes,
      is_active, created_at, updated_at
    ) VALUES (@chart_number, @first_name, @last_name, @dob, @phone, @email, @address, @notes, 1, @created_at, @updated_at)
  `);

  const result = stmt.run(encrypted);
  
  // Fetch and decrypt the inserted record
  const inserted = db.prepare('SELECT * FROM patients WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown> | null;
  return decryptPatientFromDb(inserted) || {};
}

export interface StaffInput {
  first_name: string;
  last_name: string;
  pin_hash: string;
  role: string;
}

/**
 * Execute encrypted staff insert and return decrypted result
 */
export function insertStaffEncrypted(
  db: Database.Database,
  staff: StaffInput,
  now: string
): Record<string, unknown> {
  // Encrypt sensitive fields
  const encrypted = encryptStaffForDb({
    first_name: staff.first_name,
    last_name: staff.last_name,
    pin_hash: staff.pin_hash,
    role: staff.role,
    created_at: now,
    updated_at: now,
  });

  const stmt = db.prepare(`
    INSERT INTO staff_members (
      first_name, last_name, pin_hash, role, is_active, created_at, updated_at
    ) VALUES (@first_name, @last_name, @pin_hash, @role, 1, @created_at, @updated_at)
  `);

  const result = stmt.run(encrypted);
  
  // Fetch and decrypt the inserted record
  const inserted = db.prepare('SELECT * FROM staff_members WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown> | null;
  return decryptStaffFromDb(inserted) || {};
}

/**
 * Get patient by ID with decryption
 */
export function getPatientByIdDecrypted(
  db: Database.Database,
  id: number
): Record<string, unknown> | null {
  const result = db.prepare('SELECT * FROM patients WHERE id = ?').get(id) as Record<string, unknown> | null;
  return decryptPatientFromDb(result);
}

/**
 * Get patient by chart number with decryption
 */
export function getPatientByChartNumberDecrypted(
  db: Database.Database,
  chartNumber: string
): Record<string, unknown> | null {
  const result = db.prepare('SELECT * FROM patients WHERE chart_number = ?').get(chartNumber) as Record<string, unknown> | null;
  return decryptPatientFromDb(result);
}

/**
 * Get staff by ID with decryption
 */
export function getStaffByIdDecrypted(
  db: Database.Database,
  id: number
): Record<string, unknown> | null {
  const result = db.prepare('SELECT * FROM staff_members WHERE id = ?').get(id) as Record<string, unknown> | null;
  return decryptStaffFromDb(result);
}

/**
 * Get all active patients with decryption
 */
export function getActivePatientsDecrypted(
  db: Database.Database
): Record<string, unknown>[] {
  const results = db.prepare(`
    SELECT * FROM patients 
    WHERE is_active = 1 
    ORDER BY last_name, first_name
  `).all() as Record<string, unknown>[];
  return decryptPatientsFromDb(results);
}

/**
 * Get all staff members with decryption
 */
export function getAllStaffDecrypted(
  db: Database.Database,
  onlyActive = true
): Record<string, unknown>[] {
  let query = 'SELECT * FROM staff_members';
  if (onlyActive) {
    query += ' WHERE is_active = 1';
  }
  query += ' ORDER BY last_name, first_name';
  
  const results = db.prepare(query).all() as Record<string, unknown>[];
  return decryptStaffMembersFromDb(results);
}

/**
 * Search patients with decryption
 */
export function searchPatientsDecrypted(
  db: Database.Database,
  searchPattern: string
): Record<string, unknown>[] {
  // Note: Search is done on encrypted data, which means exact matches only
  // For proper search, we need to fetch all and filter in memory
  const results = db.prepare(`
    SELECT * FROM patients 
    WHERE is_active = 1
    ORDER BY last_name, first_name
  `).all() as Record<string, unknown>[];
  
  const decrypted = decryptPatientsFromDb(results);
  
  if (!searchPattern || searchPattern === '%') {
    return decrypted;
  }
  
  const pattern = searchPattern.toLowerCase().replace(/%/g, '');
  return decrypted.filter((p: Record<string, unknown>) => {
    const firstName = String(p.first_name || '').toLowerCase();
    const lastName = String(p.last_name || '').toLowerCase();
    const chartNumber = String(p.chart_number || '').toLowerCase();
    const fullName = `${firstName} ${lastName}`;
    
    return firstName.includes(pattern) || 
           lastName.includes(pattern) || 
           chartNumber.includes(pattern) ||
           fullName.includes(pattern);
  });
}

// ============================================================================
// Update operations with encryption
// ============================================================================

export interface PatientUpdateInput {
  id: number;
  chart_number?: string;
  first_name?: string;
  last_name?: string;
  dob?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

/**
 * Update patient with encryption for sensitive fields
 */
export function updatePatientEncrypted(
  db: Database.Database,
  input: PatientUpdateInput
): void {
  const { id } = input;
  
  // Build dynamic update
  const updates: string[] = [];
  const params: Record<string, unknown> = { id };
  
  if (input.chart_number !== undefined) {
    updates.push('chart_number = @chart_number');
    params.chart_number = input.chart_number;
  }
  if (input.first_name !== undefined) {
    updates.push('first_name = @first_name');
    params.first_name = encryptPatientData({ first_name: input.first_name }).first_name;
  }
  if (input.last_name !== undefined) {
    updates.push('last_name = @last_name');
    params.last_name = encryptPatientData({ last_name: input.last_name }).last_name;
  }
  if (input.dob !== undefined) {
    updates.push('dob = @dob');
    params.dob = encryptPatientData({ dob: input.dob }).dob;
  }
  if (input.phone !== undefined) {
    updates.push('phone = @phone');
    params.phone = input.phone === null ? null : encryptPatientData({ phone: input.phone }).phone;
  }
  if (input.email !== undefined) {
    updates.push('email = @email');
    params.email = input.email === null ? null : encryptPatientData({ email: input.email }).email;
  }
  if (input.address !== undefined) {
    updates.push('address = @address');
    params.address = input.address === null ? null : encryptPatientData({ address: input.address }).address;
  }
  if (input.notes !== undefined) {
    updates.push('notes = @notes');
    params.notes = input.notes === null ? null : encryptPatientData({ notes: input.notes }).notes;
  }
  if (input.is_active !== undefined) {
    updates.push('is_active = @is_active');
    params.is_active = input.is_active ? 1 : 0;
  }
  
  if (updates.length === 0) return;
  
  updates.push('updated_at = @updated_at');
  params.updated_at = new Date().toISOString();
  
  const stmt = db.prepare(`
    UPDATE patients SET ${updates.join(', ')} WHERE id = @id
  `);
  
  stmt.run(params);
}

export interface StaffUpdateInput {
  id: number;
  first_name?: string;
  last_name?: string;
}

/**
 * Update staff with encryption for sensitive fields
 */
export function updateStaffEncrypted(
  db: Database.Database,
  input: StaffUpdateInput
): void {
  const { id } = input;
  
  const updates: string[] = [];
  const params: Record<string, unknown> = { id };
  
  if (input.first_name !== undefined) {
    updates.push('first_name = @first_name');
    params.first_name = encryptStaffData({ first_name: input.first_name }).first_name;
  }
  if (input.last_name !== undefined) {
    updates.push('last_name = @last_name');
    params.last_name = encryptStaffData({ last_name: input.last_name }).last_name;
  }
  
  if (updates.length === 0) return;
  
  updates.push('updated_at = @updated_at');
  params.updated_at = new Date().toISOString();
  
  const stmt = db.prepare(`
    UPDATE staff_members SET ${updates.join(', ')} WHERE id = @id
  `);
  
  stmt.run(params);
}

// Re-export the encrypted fields constant for reference
export { ENCRYPTED_FIELDS };

// Default export
export default {
  encryptPatientForDb,
  decryptPatientFromDb,
  decryptPatientsFromDb,
  encryptStaffForDb,
  decryptStaffFromDb,
  decryptStaffMembersFromDb,
  insertPatientEncrypted,
  insertStaffEncrypted,
  getPatientByIdDecrypted,
  getPatientByChartNumberDecrypted,
  getStaffByIdDecrypted,
  getActivePatientsDecrypted,
  getAllStaffDecrypted,
  searchPatientsDecrypted,
  updatePatientEncrypted,
  updateStaffEncrypted,
  ENCRYPTED_FIELDS,
};
