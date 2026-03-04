/**
 * Staff Queries
 * Staff management and PIN verification
 */

import * as bcrypt from 'bcrypt';
import { getDatabase } from '../db';
import type {
  StaffMember,
  CreateStaffInput,
  UpdateStaffInput,
} from '../../../shared/types';

const SALT_ROUNDS = 12;

/**
 * Hash a PIN
 */
export function hashPin(pin: string): string {
  return bcrypt.hashSync(pin, SALT_ROUNDS);
}

/**
 * Verify a PIN against a hash
 */
export function verifyPin(pin: string, hash: string): boolean {
  return bcrypt.compareSync(pin, hash);
}

/**
 * Create a new staff member
 */
export function createStaff(input: CreateStaffInput): StaffMember {
  const db = getDatabase();

  const now = new Date().toISOString();
  const pinHash = hashPin(input.pin);

  const result = db
    .prepare(
      `
    INSERT INTO staff_members (
      first_name, last_name, pin_hash, role, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 1, ?, ?)
  `,
    )
    .run(input.first_name, input.last_name, pinHash, input.role, now, now);

  const created = getStaffById(Number(result.lastInsertRowid));
  if (!created) {
    throw new Error(
      'Failed to create staff member: record not found after insert',
    );
  }
  return created;
}

/**
 * Get staff by ID
 */
export function getStaffById(id: number): StaffMember | null {
  const db = getDatabase();
  return db
    .prepare('SELECT * FROM staff_members WHERE id = ?')
    .get(id) as StaffMember | null;
}

/**
 * Get all staff members
 */
export function getAllStaff(onlyActive = true): StaffMember[] {
  const db = getDatabase();
  let query = 'SELECT * FROM staff_members';
  if (onlyActive) {
    query += ' WHERE is_active = 1';
  }
  query += ' ORDER BY last_name, first_name';
  return db.prepare(query).all() as StaffMember[];
}

/**
 * Update staff member
 */
export function updateStaff(id: number, input: UpdateStaffInput): StaffMember {
  const db = getDatabase();

  const updates: string[] = [];
  const values: (string | number | boolean | null)[] = [];

  if (input.first_name !== undefined) {
    updates.push('first_name = ?');
    values.push(input.first_name);
  }
  if (input.last_name !== undefined) {
    updates.push('last_name = ?');
    values.push(input.last_name);
  }
  if (input.pin !== undefined) {
    updates.push('pin_hash = ?');
    values.push(hashPin(input.pin));
  }
  if (input.role !== undefined) {
    updates.push('role = ?');
    values.push(input.role);
  }
  if (input.is_active !== undefined) {
    updates.push('is_active = ?');
    values.push(input.is_active ? 1 : 0);
  }

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());

  values.push(id);

  db.prepare(`UPDATE staff_members SET ${updates.join(', ')} WHERE id = ?`).run(
    ...values,
  );

  const updated = getStaffById(id);
  if (!updated) {
    throw new Error(
      `Failed to update staff member ${id}: record not found after update`,
    );
  }
  return updated;
}

/**
 * Verify staff PIN and update last login
 */
export function verifyStaffPin(pin: string): {
  success: boolean;
  staff?: StaffMember;
} {
  const db = getDatabase();

  // Get all active staff members
  const staffMembers = db
    .prepare('SELECT * FROM staff_members WHERE is_active = 1')
    .all() as StaffMember[];

  // Check PIN against each (timing-safe comparison via bcrypt)
  for (const staff of staffMembers) {
    if (verifyPin(pin, staff.pin_hash)) {
      // Update last login
      db.prepare('UPDATE staff_members SET last_login_at = ? WHERE id = ?').run(
        new Date().toISOString(),
        staff.id,
      );

      // Return without the pin_hash for security
      const { pin_hash, ...staffWithoutPin } = staff;
      return { success: true, staff: staffWithoutPin as StaffMember };
    }
  }

  return { success: false };
}

/**
 * Verify a staff PIN for step-up actions without mutating session or login metadata.
 */
export function verifyStaffPinForAction(pin: string): {
  success: boolean;
  staff?: StaffMember;
} {
  const db = getDatabase();

  const staffMembers = db
    .prepare('SELECT * FROM staff_members WHERE is_active = 1')
    .all() as StaffMember[];

  for (const staff of staffMembers) {
    if (verifyPin(pin, staff.pin_hash)) {
      const { pin_hash, ...staffWithoutPin } = staff;
      return { success: true, staff: staffWithoutPin as StaffMember };
    }
  }

  return { success: false };
}

/**
 * Deactivate staff member
 */
export function deactivateStaff(id: number): void {
  const db = getDatabase();
  db.prepare(
    `
    UPDATE staff_members 
    SET is_active = 0, updated_at = ? 
    WHERE id = ?
  `,
  ).run(new Date().toISOString(), id);
}

/**
 * Reactivate staff member
 */
export function reactivateStaff(id: number): void {
  const db = getDatabase();
  db.prepare(
    `
    UPDATE staff_members 
    SET is_active = 1, updated_at = ? 
    WHERE id = ?
  `,
  ).run(new Date().toISOString(), id);
}

/**
 * Check if staff has admin role
 */
export function isAdmin(staffId: number): boolean {
  const db = getDatabase();
  const result = db
    .prepare('SELECT role FROM staff_members WHERE id = ? AND is_active = 1')
    .get(staffId) as { role: string } | undefined;
  return result?.role === 'admin';
}

/**
 * Delete staff member (hard delete - use with caution)
 */
export function deleteStaff(id: number): void {
  const db = getDatabase();
  db.prepare('DELETE FROM staff_members WHERE id = ?').run(id);
}

/**
 * Change own PIN (authenticated staff only).
 * Verifies current PIN then sets new PIN. Throws if current PIN is wrong.
 */
export function changeOwnPin(
  staffId: number,
  currentPin: string,
  newPin: string,
): void {
  const staff = getStaffById(staffId);
  if (!staff) {
    throw new Error('Staff member not found');
  }
  if (!staff.is_active) {
    throw new Error('Account is inactive');
  }
  if (!verifyPin(currentPin, staff.pin_hash)) {
    throw new Error('Current PIN is incorrect');
  }
  if (!newPin || newPin.length < 4) {
    throw new Error('New PIN must be at least 4 characters');
  }
  updateStaff(staffId, { pin: newPin });
}
