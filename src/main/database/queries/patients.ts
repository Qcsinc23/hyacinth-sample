/**
 * Patient Queries
 * CRUD operations for patient management
 */

import { getDatabase } from '../db';
import type { Patient, CreatePatientInput, UpdatePatientInput, SearchResult } from '../../../shared/types';

/**
 * Create a new patient
 */
export function createPatient(input: CreatePatientInput): Patient {
  const db = getDatabase();
  
  const now = new Date().toISOString();
  
  const result = db.prepare(`
    INSERT INTO patients (
      chart_number, first_name, last_name, dob, phone, email, address, notes,
      is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    input.chart_number,
    input.first_name,
    input.last_name,
    input.dob,
    input.phone || null,
    input.email || null,
    input.address || null,
    input.notes || null,
    now,
    now
  );

  const created = getPatientById(Number(result.lastInsertRowid));
  if (!created) {
    throw new Error('Failed to create patient: record not found after insert');
  }
  return created;
}

/**
 * Get patient by ID
 */
export function getPatientById(id: number): Patient | null {
  const db = getDatabase();
  return db.prepare('SELECT * FROM patients WHERE id = ?').get(id) as Patient | null;
}

/**
 * Get patient by chart number
 */
export function getPatientByChartNumber(chartNumber: string): Patient | null {
  const db = getDatabase();
  return db.prepare('SELECT * FROM patients WHERE chart_number = ?').get(chartNumber) as Patient | null;
}

/**
 * Update patient
 */
export function updatePatient(id: number, input: UpdatePatientInput): Patient {
  const db = getDatabase();
  
  const updates: string[] = [];
  const values: (string | number | boolean | null)[] = [];
  
  if (input.chart_number !== undefined) {
    updates.push('chart_number = ?');
    values.push(input.chart_number);
  }
  if (input.first_name !== undefined) {
    updates.push('first_name = ?');
    values.push(input.first_name);
  }
  if (input.last_name !== undefined) {
    updates.push('last_name = ?');
    values.push(input.last_name);
  }
  if (input.dob !== undefined) {
    updates.push('dob = ?');
    values.push(input.dob);
  }
  if (input.phone !== undefined) {
    updates.push('phone = ?');
    values.push(input.phone || null);
  }
  if (input.email !== undefined) {
    updates.push('email = ?');
    values.push(input.email || null);
  }
  if (input.address !== undefined) {
    updates.push('address = ?');
    values.push(input.address || null);
  }
  if (input.notes !== undefined) {
    updates.push('notes = ?');
    values.push(input.notes || null);
  }
  if (input.is_active !== undefined) {
    updates.push('is_active = ?');
    values.push(input.is_active ? 1 : 0);
  }
  
  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  
  values.push(id);
  
  db.prepare(`UPDATE patients SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  
  const updated = getPatientById(id);
  if (!updated) {
    throw new Error(`Failed to update patient ${id}: record not found after update`);
  }
  return updated;
}

/**
 * Soft delete patient (deactivate)
 */
export function deactivatePatient(id: number): void {
  const db = getDatabase();
  db.prepare(`
    UPDATE patients 
    SET is_active = 0, updated_at = ? 
    WHERE id = ?
  `).run(new Date().toISOString(), id);
}

/**
 * Reactivate patient
 */
export function reactivatePatient(id: number): void {
  const db = getDatabase();
  db.prepare(`
    UPDATE patients 
    SET is_active = 1, updated_at = ? 
    WHERE id = ?
  `).run(new Date().toISOString(), id);
}

/**
 * Search patients with pagination
 */
export function searchPatients(options: {
  page?: number;
  pageSize?: number;
  search?: string;
  onlyActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}): SearchResult<Patient> {
  const db = getDatabase();
  
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  const search = options.search?.trim();
  const offset = (page - 1) * pageSize;
  
  let whereClause = 'WHERE 1=1';
  const params: (string | number)[] = [];
  
  if (search) {
    whereClause += ` AND (
      first_name LIKE ? OR 
      last_name LIKE ? OR 
      chart_number LIKE ? OR
      (first_name || ' ' || last_name) LIKE ?
    )`;
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }
  
  if (options.onlyActive !== false) {
    whereClause += ' AND is_active = 1';
  }
  
  // Get total count
  const countResult = db.prepare(`SELECT COUNT(*) as total FROM patients ${whereClause}`).get(...params) as { total: number };
  
  // Get data
  const sortColumn = ['first_name', 'last_name', 'chart_number', 'dob', 'created_at'].includes(options.sortBy || '')
    ? options.sortBy
    : 'last_name';
  const sortOrder = options.sortOrder === 'desc' ? 'DESC' : 'ASC';
  
  const data = db.prepare(`
    SELECT * FROM patients 
    ${whereClause}
    ORDER BY ${sortColumn} ${sortOrder}, first_name ASC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset) as Patient[];
  
  return {
    data,
    total: countResult.total,
    page,
    pageSize,
  };
}

/**
 * Get all active patients (for dropdowns)
 */
export function getActivePatients(): Patient[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT * FROM patients 
    WHERE is_active = 1 
    ORDER BY last_name, first_name
  `).all() as Patient[];
}

/**
 * Check if chart number is available
 */
export function isChartNumberAvailable(chartNumber: string, excludeId?: number): boolean {
  const db = getDatabase();
  let query = 'SELECT id FROM patients WHERE chart_number = ?';
  const params: (string | number)[] = [chartNumber];

  if (excludeId) {
    query += ' AND id != ?';
    params.push(excludeId);
  }

  const result = db.prepare(query).get(...params);
  return !result;
}

// ============================================================================
// Patient History Queries
// ============================================================================

export interface PatientDispensingHistory {
  recordId: number;
  dispensingDate: string;
  dispensingTime: string;
  staffName: string;
  medications: string[];
  reasons: string[];
  status: string;
  notes?: string;
}

/**
 * Get patient's full dispensing history
 */
export function getPatientDispensingHistory(patientId: number, limit = 100): PatientDispensingHistory[] {
  const db = getDatabase();

  const records = db.prepare(`
    SELECT 
      dr.id as recordId,
      dr.dispensing_date as dispensingDate,
      dr.dispensing_time as dispensingTime,
      s.first_name || ' ' || s.last_name as staffName,
      dr.status,
      dr.additional_notes as notes
    FROM dispensing_records dr
    JOIN staff_members s ON dr.staff_id = s.id
    WHERE dr.patient_id = ?
    ORDER BY dr.dispensing_date DESC, dr.dispensing_time DESC
    LIMIT ?
  `).all(patientId, limit) as any[];

  const result: PatientDispensingHistory[] = [];

  for (const record of records) {
    // Get medications for this record
    const medications = db.prepare(`
      SELECT medication_name 
      FROM dispensing_line_items 
      WHERE record_id = ?
    `).all(record.recordId) as Array<{ medication_name: string }>;

    // Get reasons for this record
    const reasons = db.prepare(`
      SELECT reason_name 
      FROM record_reasons 
      WHERE record_id = ?
    `).all(record.recordId) as Array<{ reason_name: string }>;

    result.push({
      recordId: record.recordId,
      dispensingDate: record.dispensingDate,
      dispensingTime: record.dispensingTime,
      staffName: record.staffName,
      medications: medications.map(m => m.medication_name),
      reasons: reasons.map(r => r.reason_name),
      status: record.status,
      notes: record.notes,
    });
  }

  return result;
}

export interface PatientMedicationSummary {
  medicationName: string;
  totalDispenses: number;
  lastDispensed: string;
  averageQuantity: number;
  adherenceScore?: number;
}

/**
 * Get patient's medication summary
 */
export function getPatientMedicationSummary(patientId: number): PatientMedicationSummary[] {
  const db = getDatabase();

  return db.prepare(`
    SELECT 
      dli.medication_name as medicationName,
      COUNT(DISTINCT dr.id) as totalDispenses,
      MAX(dr.dispensing_date) as lastDispensed,
      AVG(dli.amount_value) as averageQuantity
    FROM dispensing_line_items dli
    JOIN dispensing_records dr ON dli.record_id = dr.id
    WHERE dr.patient_id = ? AND dr.status = 'completed'
    GROUP BY dli.medication_name
    ORDER BY lastDispensed DESC
  `).all(patientId) as PatientMedicationSummary[];
}

/**
 * Get last dispensed date for a patient
 */
export function getLastDispensedDate(patientId: number): string | null {
  const db = getDatabase();

  const result = db.prepare(`
    SELECT MAX(dispensing_date) as lastDate
    FROM dispensing_records
    WHERE patient_id = ? AND status = 'completed'
  `).get(patientId) as { lastDate: string | null } | undefined;

  return result?.lastDate || null;
}

export interface MedicationTimelineEvent {
  date: string;
  time: string;
  medicationName: string;
  amount: string;
  staffName: string;
  reason: string;
  status: string;
}

/**
 * Get patient's medication timeline
 */
export function getPatientMedicationTimeline(patientId: number): MedicationTimelineEvent[] {
  const db = getDatabase();

  return db.prepare(`
    SELECT 
      dr.dispensing_date as date,
      dr.dispensing_time as time,
      dli.medication_name as medicationName,
      dli.amount_value || ' ' || dli.amount_unit as amount,
      s.first_name || ' ' || s.last_name as staffName,
      GROUP_CONCAT(rr.reason_name, ', ') as reason,
      dr.status
    FROM dispensing_records dr
    JOIN dispensing_line_items dli ON dr.id = dli.record_id
    LEFT JOIN record_reasons rr ON dr.id = rr.record_id
    JOIN staff_members s ON dr.staff_id = s.id
    WHERE dr.patient_id = ?
    GROUP BY dr.id, dli.id
    ORDER BY dr.dispensing_date DESC, dr.dispensing_time DESC
  `).all(patientId) as MedicationTimelineEvent[];
}
