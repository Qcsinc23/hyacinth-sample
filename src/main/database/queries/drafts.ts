/**
 * Drafts Queries
 * Save, get, and delete form drafts
 */

import { getDatabase } from '../db';
import type { Draft, CreateDraftInput, DraftType } from '../../../shared/types';

/**
 * Save a draft (create or update)
 */
export function saveDraft(input: CreateDraftInput): Draft {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Check if draft already exists for this type and staff
  const existing = db
    .prepare(
      `
    SELECT id FROM drafts 
    WHERE draft_type = ? AND staff_id = ?
  `,
    )
    .get(input.draft_type, input.staff_id) as { id: number } | undefined;

  if (existing) {
    // Update existing
    db.prepare(
      `
      UPDATE drafts 
      SET form_data = ?, updated_at = ?
      WHERE id = ?
    `,
    ).run(JSON.stringify(input.form_data), now, existing.id);

    return getDraftById(existing.id)!;
  }

  // Create new
  const result = db
    .prepare(
      `
    INSERT INTO drafts (draft_type, form_data, staff_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `,
    )
    .run(
      input.draft_type,
      JSON.stringify(input.form_data),
      input.staff_id,
      now,
      now,
    );

  return getDraftById(Number(result.lastInsertRowid))!;
}

/**
 * Get draft by ID
 */
export function getDraftById(id: number): Draft | null {
  const db = getDatabase();
  const row = db
    .prepare('SELECT * FROM drafts WHERE id = ?')
    .get(id) as Draft | null;

  if (row) {
    return {
      ...row,
      form_data: JSON.parse(row.form_data as unknown as string),
    };
  }

  return null;
}

/**
 * Get draft by type and staff
 */
export function getDraftByTypeAndStaff(
  draftType: DraftType,
  staffId: number,
): Draft | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `
    SELECT * FROM drafts 
    WHERE draft_type = ? AND staff_id = ?
  `,
    )
    .get(draftType, staffId) as Draft | null;

  if (row) {
    return {
      ...row,
      form_data: JSON.parse(row.form_data as unknown as string),
    };
  }

  return null;
}

/**
 * Get all drafts for a staff member
 */
export function getDraftsByStaff(staffId: number): Draft[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `
    SELECT * FROM drafts 
    WHERE staff_id = ?
    ORDER BY updated_at DESC
  `,
    )
    .all(staffId) as Draft[];

  return rows.map((row) => ({
    ...row,
    form_data: JSON.parse(row.form_data as unknown as string),
  }));
}

/**
 * Get all drafts (admin)
 */
export function getAllDrafts(): Draft[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `
    SELECT d.*, s.first_name || ' ' || s.last_name as staff_name
    FROM drafts d
    JOIN staff_members s ON d.staff_id = s.id
    ORDER BY d.updated_at DESC
  `,
    )
    .all() as Draft[];

  return rows.map((row) => ({
    ...row,
    form_data: JSON.parse(row.form_data as unknown as string),
  }));
}

/**
 * Delete a draft
 */
export function deleteDraft(id: number): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM drafts WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * Delete drafts by type and staff
 */
export function deleteDraftByTypeAndStaff(
  draftType: DraftType,
  staffId: number,
): boolean {
  const db = getDatabase();
  const result = db
    .prepare(
      `
    DELETE FROM drafts 
    WHERE draft_type = ? AND staff_id = ?
  `,
    )
    .run(draftType, staffId);
  return result.changes > 0;
}

/**
 * Delete all drafts for a staff member
 */
export function deleteAllDraftsForStaff(staffId: number): number {
  const db = getDatabase();
  const result = db
    .prepare('DELETE FROM drafts WHERE staff_id = ?')
    .run(staffId);
  return result.changes;
}

/**
 * Get draft count for a staff member
 */
export function getDraftCount(staffId: number): number {
  const db = getDatabase();
  const result = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM drafts WHERE staff_id = ?
  `,
    )
    .get(staffId) as { count: number };
  return result.count;
}

/**
 * Cleanup old drafts (older than specified days)
 */
export function cleanupOldDrafts(olderThanDays: number): number {
  const db = getDatabase();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  const cutoffStr = cutoffDate.toISOString();

  const result = db
    .prepare(
      `
    DELETE FROM drafts WHERE updated_at < ?
  `,
    )
    .run(cutoffStr);

  return result.changes;
}
