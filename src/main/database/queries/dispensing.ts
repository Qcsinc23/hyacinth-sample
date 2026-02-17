/**
 * Dispensing Queries
 * Create records, get records, void, and correct dispenses
 */

import { getDatabase, withTransaction } from '../db';
import type {
  DispensingRecord,
  DispensingLineItem,
  DispenseLineItemInput,
  RecordReason,
  CreateDispenseInput,
  VoidDispenseInput,
  CorrectDispenseInput,
  DispenseWithDetails,
  SearchResult,
} from '../../../shared/types';

const getInventoryForUpdate = (
  inventoryId: number,
): {
  id: number;
  medication_name: string;
  quantity_on_hand: number;
  status: string;
} => {
  const db = getDatabase();
  const inventory = db
    .prepare(
      `
    SELECT id, medication_name, quantity_on_hand, status
    FROM inventory
    WHERE id = ?
  `,
    )
    .get(inventoryId) as
    | {
        id: number;
        medication_name: string;
        quantity_on_hand: number;
        status: string;
      }
    | undefined;

  if (!inventory) {
    throw new Error(`Inventory item ${inventoryId} not found`);
  }

  return inventory;
};

const deductInventoryForItems = (
  items: Array<Pick<DispenseLineItemInput, 'inventory_id' | 'amount_value'>>,
  staffId: number,
  recordId: number,
): void => {
  const db = getDatabase();
  const now = new Date().toISOString();

  for (const item of items) {
    if (!item.inventory_id || item.amount_value <= 0) {
      continue;
    }

    const quantity = item.amount_value;
    const inventory = getInventoryForUpdate(item.inventory_id);

    if (inventory.quantity_on_hand < quantity) {
      throw new Error(
        `Insufficient inventory for ${inventory.medication_name}`,
      );
    }

    const newQuantity = inventory.quantity_on_hand - quantity;

    db.prepare(
      `
      UPDATE inventory
      SET quantity_on_hand = ?,
          status = CASE
            WHEN ? <= 0 THEN 'depleted'
            ELSE status
          END,
          updated_at = ?
      WHERE id = ?
    `,
    ).run(newQuantity, newQuantity, now, item.inventory_id);

    db.prepare(
      `
      INSERT INTO inventory_transactions (
        inventory_id, transaction_type, quantity_change, quantity_before,
        quantity_after, reference_type, reference_id, reason, performed_by, timestamp
      ) VALUES (?, 'dispense', ?, ?, ?, 'dispense', ?, 'Medication dispensed', ?, ?)
    `,
    ).run(
      item.inventory_id,
      -quantity,
      inventory.quantity_on_hand,
      newQuantity,
      recordId,
      staffId,
      now,
    );
  }
};

const restoreInventoryForRecord = (
  recordId: number,
  staffId: number,
  reason: string,
  referenceType: 'void' | 'correction',
): void => {
  const db = getDatabase();
  const now = new Date().toISOString();

  const items = db
    .prepare(
      `
    SELECT inventory_id, amount_value
    FROM dispensing_line_items
    WHERE record_id = ?
  `,
    )
    .all(recordId) as Array<{
    inventory_id: number | null;
    amount_value: number;
  }>;

  for (const item of items) {
    if (!item.inventory_id || item.amount_value <= 0) {
      continue;
    }

    const inventory = getInventoryForUpdate(item.inventory_id);
    const newQuantity = inventory.quantity_on_hand + item.amount_value;

    db.prepare(
      `
      UPDATE inventory
      SET quantity_on_hand = ?,
          status = CASE
            WHEN status = 'depleted' AND ? > 0 THEN 'active'
            ELSE status
          END,
          updated_at = ?
      WHERE id = ?
    `,
    ).run(newQuantity, newQuantity, now, item.inventory_id);

    db.prepare(
      `
      INSERT INTO inventory_transactions (
        inventory_id, transaction_type, quantity_change, quantity_before,
        quantity_after, reference_type, reference_id, reason, performed_by, timestamp
      ) VALUES (?, 'return', ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      item.inventory_id,
      item.amount_value,
      inventory.quantity_on_hand,
      newQuantity,
      referenceType,
      recordId,
      reason,
      staffId,
      now,
    );
  }
};

/**
 * Create a new dispensing record
 */
export function createDispense(input: CreateDispenseInput): DispensingRecord {
  return withTransaction(() => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Create the dispensing record
    const recordResult = db
      .prepare(
        `
      INSERT INTO dispensing_records (
        patient_id, dispensing_date, dispensing_time, staff_id, 
        label_quantity, additional_notes, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?)
    `,
      )
      .run(
        input.patient_id,
        input.dispensing_date,
        input.dispensing_time,
        input.staff_id,
        input.label_quantity,
        input.additional_notes || null,
        now,
        now,
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
        item.dosing_instructions || null,
      );
    }

    // Deduct inventory in the same transaction so dispense + stock updates are atomic.
    deductInventoryForItems(input.items, input.staff_id, recordId);

    // Insert reasons
    const reasonStmt = db.prepare(`
      INSERT INTO record_reasons (record_id, reason_name, is_custom)
      VALUES (?, ?, ?)
    `);

    for (let i = 0; i < input.reasons.length; i++) {
      reasonStmt.run(
        recordId,
        input.reasons[i],
        input.is_custom_reasons[i] ? 1 : 0,
      );
    }

    const created = getDispenseById(recordId);
    if (!created) {
      throw new Error(
        'Failed to create dispensing record: record not found after insert',
      );
    }
    return created;
  });
}

/**
 * Get dispensing record by ID
 */
export function getDispenseById(id: number): DispenseWithDetails | null {
  const db = getDatabase();

  const record = db
    .prepare(
      `
    SELECT dr.*, 
           p.id as patient_id, p.chart_number, p.first_name as patient_first_name, 
           p.last_name as patient_last_name, p.dob as patient_dob,
           s.id as staff_id_val, s.first_name as staff_first_name, 
           s.last_name as staff_last_name
    FROM dispensing_records dr
    JOIN patients p ON dr.patient_id = p.id
    JOIN staff_members s ON dr.staff_id = s.id
    WHERE dr.id = ?
  `,
    )
    .get(id) as any;

  if (!record) return null;

  // Fetch items and reasons (single record, but consistent pattern)
  const items = db
    .prepare('SELECT * FROM dispensing_line_items WHERE record_id = ?')
    .all(id) as DispensingLineItem[];

  const reasons = db
    .prepare('SELECT * FROM record_reasons WHERE record_id = ?')
    .all(id) as RecordReason[];

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
export function getDispensesByPatient(
  patientId: number,
  limit = 50,
): DispenseWithDetails[] {
  const db = getDatabase();

  const records = db
    .prepare(
      `
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
  `,
    )
    .all(patientId, limit) as any[];

  // Batch fetch all items and reasons to avoid N+1 queries
  if (records.length === 0) {
    return [];
  }

  const recordIds = records.map((r) => r.id);
  const placeholders = recordIds.map(() => '?').join(',');
  const allItems = db
    .prepare(
      `
    SELECT * FROM dispensing_line_items 
    WHERE record_id IN (${placeholders})
  `,
    )
    .all(...recordIds) as DispensingLineItem[];

  const allReasons = db
    .prepare(
      `
    SELECT * FROM record_reasons 
    WHERE record_id IN (${placeholders})
  `,
    )
    .all(...recordIds) as RecordReason[];

  // Group items and reasons by record_id
  const itemsByRecordId = new Map<number, DispensingLineItem[]>();
  const reasonsByRecordId = new Map<number, RecordReason[]>();

  for (const item of allItems) {
    const existing = itemsByRecordId.get(item.record_id) || [];
    existing.push(item);
    itemsByRecordId.set(item.record_id, existing);
  }

  for (const reason of allReasons) {
    const existing = reasonsByRecordId.get(reason.record_id) || [];
    existing.push(reason);
    reasonsByRecordId.set(reason.record_id, existing);
  }

  return records.map((record) => ({
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
    items: itemsByRecordId.get(record.id) || [],
    reasons: reasonsByRecordId.get(record.id) || [],
  })) as DispenseWithDetails[];
}

/**
 * Search dispensing records
 */
export function searchDispenses(
  options: {
    page?: number;
    pageSize?: number;
    patientId?: number;
    staffId?: number;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  } = {},
): SearchResult<DispenseWithDetails> {
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
  const countResult = db
    .prepare(
      `
    SELECT COUNT(*) as total 
    FROM dispensing_records dr
    ${whereClause}
  `,
    )
    .get(...params) as { total: number };

  // Get data
  const records = db
    .prepare(
      `
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
  `,
    )
    .all(...params, pageSize, offset) as any[];

  // Batch fetch all items and reasons to avoid N+1 queries
  const recordIds = records.map((r) => r.id);
  if (recordIds.length === 0) {
    return {
      data: [],
      total: countResult.total,
      page,
      pageSize,
    };
  }

  const placeholders = recordIds.map(() => '?').join(',');
  const allItems = db
    .prepare(
      `
    SELECT * FROM dispensing_line_items 
    WHERE record_id IN (${placeholders})
  `,
    )
    .all(...recordIds) as DispensingLineItem[];

  const allReasons = db
    .prepare(
      `
    SELECT * FROM record_reasons 
    WHERE record_id IN (${placeholders})
  `,
    )
    .all(...recordIds) as RecordReason[];

  // Group items and reasons by record_id
  const itemsByRecordId = new Map<number, DispensingLineItem[]>();
  const reasonsByRecordId = new Map<number, RecordReason[]>();

  for (const item of allItems) {
    const existing = itemsByRecordId.get(item.record_id) || [];
    existing.push(item);
    itemsByRecordId.set(item.record_id, existing);
  }

  for (const reason of allReasons) {
    const existing = reasonsByRecordId.get(reason.record_id) || [];
    existing.push(reason);
    reasonsByRecordId.set(reason.record_id, existing);
  }

  const data = records.map((record) => ({
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
    items: itemsByRecordId.get(record.id) || [],
    reasons: reasonsByRecordId.get(record.id) || [],
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
  return withTransaction(() => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const existing = db
      .prepare(
        `
      SELECT id, status
      FROM dispensing_records
      WHERE id = ?
    `,
      )
      .get(input.record_id) as { id: number; status: string } | undefined;

    if (!existing) {
      throw new Error(`Dispensing record ${input.record_id} not found`);
    }

    if (existing.status !== 'completed') {
      throw new Error('Only completed dispensing records can be voided');
    }

    restoreInventoryForRecord(
      input.record_id,
      input.staff_id,
      `Void: ${input.reason}`,
      'void',
    );

    db.prepare(
      `
      UPDATE dispensing_records
      SET status = 'voided',
          void_reason = ?,
          voided_by = ?,
          voided_at = ?,
          updated_at = ?
      WHERE id = ?
    `,
    ).run(input.reason, input.staff_id, now, now, input.record_id);
  });
}

/**
 * Create a correction for a dispensing record
 */
export function correctDispense(input: CorrectDispenseInput): DispensingRecord {
  return withTransaction(() => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const existing = db
      .prepare(
        `
      SELECT id, status
      FROM dispensing_records
      WHERE id = ?
    `,
      )
      .get(input.record_id) as { id: number; status: string } | undefined;

    if (!existing) {
      throw new Error(`Dispensing record ${input.record_id} not found`);
    }

    if (existing.status !== 'completed') {
      throw new Error('Only completed dispensing records can be corrected');
    }

    // Mark original as corrected
    db.prepare(
      `
      UPDATE dispensing_records
      SET status = 'corrected',
          corrected_by = ?,
          correction_reason = ?,
          updated_at = ?
      WHERE id = ?
    `,
    ).run(input.staff_id, input.correction_reason, now, input.record_id);

    restoreInventoryForRecord(
      input.record_id,
      input.staff_id,
      `Correction: ${input.correction_reason}`,
      'correction',
    );

    // Create new record with corrected data (linked to original)
    const correctedInput = {
      ...input.corrected_data,
      staff_id: input.staff_id,
    };

    const recordResult = db
      .prepare(
        `
      INSERT INTO dispensing_records (
        patient_id, dispensing_date, dispensing_time, staff_id, 
        label_quantity, additional_notes, status, correction_of, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?)
    `,
      )
      .run(
        correctedInput.patient_id,
        correctedInput.dispensing_date,
        correctedInput.dispensing_time,
        correctedInput.staff_id,
        correctedInput.label_quantity,
        correctedInput.additional_notes || null,
        input.record_id,
        now,
        now,
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
        item.dosing_instructions || null,
      );
    }

    deductInventoryForItems(correctedInput.items, input.staff_id, newRecordId);

    // Insert reasons
    const reasonStmt = db.prepare(`
      INSERT INTO record_reasons (record_id, reason_name, is_custom)
      VALUES (?, ?, ?)
    `);

    for (let i = 0; i < correctedInput.reasons.length; i++) {
      reasonStmt.run(
        newRecordId,
        correctedInput.reasons[i],
        correctedInput.is_custom_reasons[i] ? 1 : 0,
      );
    }

    const corrected = getDispenseById(newRecordId);
    if (!corrected) {
      throw new Error(
        'Failed to correct dispensing record: record not found after insert',
      );
    }
    return corrected;
  });
}

/**
 * Get today's dispensing count
 */
export function getTodayDispenseCount(): number {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];

  const result = db
    .prepare(
      `
    SELECT COUNT(*) as count 
    FROM dispensing_records 
    WHERE dispensing_date = ? AND status = 'completed'
  `,
    )
    .get(today) as { count: number };

  return result.count;
}
