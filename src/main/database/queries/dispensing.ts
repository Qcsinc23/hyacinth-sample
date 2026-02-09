/**
 * Dispensing Queries
 * Create records, get records, void, and correct dispenses
 */

import { getDatabase, withTransaction } from '../db';
import type { 
  DispensingRecord, 
  DispensingLineItem, 
  RecordReason, 
  CreateDispenseInput, 
  VoidDispenseInput, 
  CorrectDispenseInput,
  DispenseWithDetails,
  SearchResult 
} from '../../../shared/types';

/**
 * Create a new dispensing record
 */
export function createDispense(input: CreateDispenseInput): DispensingRecord {
  return withTransaction(() => {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    // Create the dispensing record
    const recordResult = db.prepare(`
      INSERT INTO dispensing_records (
        patient_id, dispensing_date, dispensing_time, staff_id, 
        label_quantity, additional_notes, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?)
    `).run(
      input.patient_id,
      input.dispensing_date,
      input.dispensing_time,
      input.staff_id,
      input.label_quantity,
      input.additional_notes || null,
      now,
      now
    );
    
    const recordId = Number(recordResult.lastInsertRowid);
    
    // Insert line items
    const itemStmt = db.prepare(`
      INSERT INTO dispensing_line_items (
        record_id, medication_name, is_custom_medication, amount_value, 
        amount_unit, lot_number, expiration_date, inventory_id, dosing_instructions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const item of input.items) {
      itemStmt.run(
        recordId,
        item.medication_name,
        item.is_custom_medication ? 1 : 0,
        item.amount_value,
        item.amount_unit,
        item.lot_number || null,
        item.expiration_date || null,
        item.inventory_id || null,
        item.dosing_instructions || null
      );
    }
    
    // Insert reasons
    const reasonStmt = db.prepare(`
      INSERT INTO record_reasons (record_id, reason_name, is_custom)
      VALUES (?, ?, ?)
    `);
    
    for (let i = 0; i < input.reasons.length; i++) {
      reasonStmt.run(
        recordId,
        input.reasons[i],
        input.is_custom_reasons[i] ? 1 : 0
      );
    }
    
    return getDispenseById(recordId)!;
  });
}

/**
 * Get dispensing record by ID
 */
export function getDispenseById(id: number): DispenseWithDetails | null {
  const db = getDatabase();
  
  const record = db.prepare(`
    SELECT dr.*, 
           p.id as patient_id, p.chart_number, p.first_name as patient_first_name, 
           p.last_name as patient_last_name, p.dob as patient_dob,
           s.id as staff_id_val, s.first_name as staff_first_name, 
           s.last_name as staff_last_name
    FROM dispensing_records dr
    JOIN patients p ON dr.patient_id = p.id
    JOIN staff_members s ON dr.staff_id = s.id
    WHERE dr.id = ?
  `).get(id) as any;
  
  if (!record) return null;
  
  const items = db.prepare(
    'SELECT * FROM dispensing_line_items WHERE record_id = ?'
  ).all(id) as DispensingLineItem[];
  
  const reasons = db.prepare(
    'SELECT * FROM record_reasons WHERE record_id = ?'
  ).all(id) as RecordReason[];
  
  return {
    ...record,
    patient: {
      id: record.patient_id,
      chart_number: record.chart_number,
      first_name: record.patient_first_name,
      last_name: record.patient_last_name,
      dob: record.patient_dob,
    },
    staff: {
      id: record.staff_id_val,
      first_name: record.staff_first_name,
      last_name: record.staff_last_name,
    },
    items,
    reasons,
  } as DispenseWithDetails;
}

/**
 * Get dispensing records for a patient
 */
export function getDispensesByPatient(patientId: number, limit = 50): DispenseWithDetails[] {
  const db = getDatabase();
  
  const records = db.prepare(`
    SELECT dr.*, 
           p.chart_number, p.first_name as patient_first_name, 
           p.last_name as patient_last_name,
           s.first_name as staff_first_name, s.last_name as staff_last_name
    FROM dispensing_records dr
    JOIN patients p ON dr.patient_id = p.id
    JOIN staff_members s ON dr.staff_id = s.id
    WHERE dr.patient_id = ?
    ORDER BY dr.dispensing_date DESC, dr.dispensing_time DESC
    LIMIT ?
  `).all(patientId, limit) as any[];
  
  return records.map(record => ({
    ...record,
    patient: {
      id: record.patient_id,
      chart_number: record.chart_number,
      first_name: record.patient_first_name,
      last_name: record.patient_last_name,
      dob: record.patient_dob,
    },
    staff: {
      id: record.staff_id,
      first_name: record.staff_first_name,
      last_name: record.staff_last_name,
    },
    items: db.prepare('SELECT * FROM dispensing_line_items WHERE record_id = ?').all(record.id) as DispensingLineItem[],
    reasons: db.prepare('SELECT * FROM record_reasons WHERE record_id = ?').all(record.id) as RecordReason[],
  })) as DispenseWithDetails[];
}

/**
 * Search dispensing records
 */
export function searchDispenses(options: {
  page?: number;
  pageSize?: number;
  patientId?: number;
  staffId?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
} = {}): SearchResult<DispenseWithDetails> {
  const db = getDatabase();
  
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  const offset = (page - 1) * pageSize;
  
  let whereClause = 'WHERE 1=1';
  const params: (string | number)[] = [];
  
  if (options.patientId) {
    whereClause += ' AND dr.patient_id = ?';
    params.push(options.patientId);
  }
  if (options.staffId) {
    whereClause += ' AND dr.staff_id = ?';
    params.push(options.staffId);
  }
  if (options.dateFrom) {
    whereClause += ' AND dr.dispensing_date >= ?';
    params.push(options.dateFrom);
  }
  if (options.dateTo) {
    whereClause += ' AND dr.dispensing_date <= ?';
    params.push(options.dateTo);
  }
  if (options.status) {
    whereClause += ' AND dr.status = ?';
    params.push(options.status);
  }
  
  // Get count
  const countResult = db.prepare(`
    SELECT COUNT(*) as total 
    FROM dispensing_records dr
    ${whereClause}
  `).get(...params) as { total: number };
  
  // Get data
  const records = db.prepare(`
    SELECT dr.*, 
           p.chart_number, p.first_name as patient_first_name, 
           p.last_name as patient_last_name,
           s.first_name as staff_first_name, s.last_name as staff_last_name
    FROM dispensing_records dr
    JOIN patients p ON dr.patient_id = p.id
    JOIN staff_members s ON dr.staff_id = s.id
    ${whereClause}
    ORDER BY dr.dispensing_date DESC, dr.dispensing_time DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset) as any[];
  
  const data = records.map(record => ({
    ...record,
    patient: {
      id: record.patient_id,
      chart_number: record.chart_number,
      first_name: record.patient_first_name,
      last_name: record.patient_last_name,
    },
    staff: {
      id: record.staff_id,
      first_name: record.staff_first_name,
      last_name: record.staff_last_name,
    },
    items: db.prepare('SELECT * FROM dispensing_line_items WHERE record_id = ?').all(record.id) as DispensingLineItem[],
    reasons: db.prepare('SELECT * FROM record_reasons WHERE record_id = ?').all(record.id) as RecordReason[],
  })) as DispenseWithDetails[];
  
  return {
    data,
    total: countResult.total,
    page,
    pageSize,
  };
}

/**
 * Void a dispensing record
 */
export function voidDispense(input: VoidDispenseInput): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  
  db.prepare(`
    UPDATE dispensing_records
    SET status = 'voided',
        void_reason = ?,
        voided_by = ?,
        voided_at = ?,
        updated_at = ?
    WHERE id = ?
  `).run(input.reason, input.staff_id, now, now, input.record_id);
}

/**
 * Create a correction for a dispensing record
 */
export function correctDispense(input: CorrectDispenseInput): DispensingRecord {
  return withTransaction(() => {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    // Mark original as corrected
    db.prepare(`
      UPDATE dispensing_records
      SET status = 'corrected',
          corrected_by = ?,
          correction_reason = ?,
          updated_at = ?
      WHERE id = ?
    `).run(input.staff_id, input.correction_reason, now, input.record_id);
    
    // Create new record with corrected data (linked to original)
    const correctedInput = {
      ...input.corrected_data,
      staff_id: input.staff_id,
    };
    
    const recordResult = db.prepare(`
      INSERT INTO dispensing_records (
        patient_id, dispensing_date, dispensing_time, staff_id, 
        label_quantity, additional_notes, status, correction_of, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?)
    `).run(
      correctedInput.patient_id,
      correctedInput.dispensing_date,
      correctedInput.dispensing_time,
      correctedInput.staff_id,
      correctedInput.label_quantity,
      correctedInput.additional_notes || null,
      input.record_id,
      now,
      now
    );
    
    const newRecordId = Number(recordResult.lastInsertRowid);
    
    // Insert line items
    const itemStmt = db.prepare(`
      INSERT INTO dispensing_line_items (
        record_id, medication_name, is_custom_medication, amount_value, 
        amount_unit, lot_number, expiration_date, inventory_id, dosing_instructions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const item of correctedInput.items) {
      itemStmt.run(
        newRecordId,
        item.medication_name,
        item.is_custom_medication ? 1 : 0,
        item.amount_value,
        item.amount_unit,
        item.lot_number || null,
        item.expiration_date || null,
        item.inventory_id || null,
        item.dosing_instructions || null
      );
    }
    
    // Insert reasons
    const reasonStmt = db.prepare(`
      INSERT INTO record_reasons (record_id, reason_name, is_custom)
      VALUES (?, ?, ?)
    `);
    
    for (let i = 0; i < correctedInput.reasons.length; i++) {
      reasonStmt.run(
        newRecordId,
        correctedInput.reasons[i],
        correctedInput.is_custom_reasons[i] ? 1 : 0
      );
    }
    
    return getDispenseById(newRecordId)!;
  });
}

/**
 * Get today's dispensing count
 */
export function getTodayDispenseCount(): number {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];
  
  const result = db.prepare(`
    SELECT COUNT(*) as count 
    FROM dispensing_records 
    WHERE dispensing_date = ? AND status = 'completed'
  `).get(today) as { count: number };
  
  return result.count;
}
