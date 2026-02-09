/**
 * Draft Service
 * 
 * Manages auto-save functionality for forms and
 * handles draft recovery.
 */

import log from 'electron-log';
import { getDatabase } from '../database/db';
import { DRAFT_EXPIRY_DAYS } from '../../renderer/utils/constants';

/**
 * Draft data interface
 */
export interface Draft {
  id: string;
  formType: string;
  data: string; // JSON string
  createdAt: string;
  updatedAt: string;
}

/**
 * Draft form types
 */
export type DraftFormType = 
  | 'patient'
  | 'dispense'
  | 'inventory'
  | 'settings';

/**
 * Save a draft
 */
export const saveDraft = (formType: DraftFormType, data: unknown): Draft => {
  try {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const jsonData = JSON.stringify(data);
    
    // Check if draft exists for this form type
    const existingStmt = db.prepare('SELECT id FROM drafts WHERE formType = ?');
    const existing = existingStmt.get(formType) as { id: string } | undefined;
    
    if (existing) {
      // Update existing draft
      const updateStmt = db.prepare(`
        UPDATE drafts 
        SET data = ?, updatedAt = ?
        WHERE id = ?
      `);
      
      updateStmt.run(jsonData, now, existing.id);
      
      log.info(`Draft updated for ${formType}`);
      
      return {
        id: existing.id,
        formType,
        data: jsonData,
        createdAt: now,
        updatedAt: now,
      };
    } else {
      // Create new draft
      const insertStmt = db.prepare(`
        INSERT INTO drafts (id, formType, data, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      insertStmt.run(id, formType, jsonData, now, now);
      
      log.info(`Draft created for ${formType}`);
      
      return {
        id,
        formType,
        data: jsonData,
        createdAt: now,
        updatedAt: now,
      };
    }
  } catch (error) {
    log.error('Failed to save draft:', error);
    throw error;
  }
};

/**
 * Get draft by form type
 */
export const getDraft = (formType: DraftFormType): Draft | null => {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM drafts WHERE formType = ?');
    const draft = stmt.get(formType) as Draft | undefined;
    
    if (!draft) return null;
    
    // Check if draft has expired
    const expiryDate = new Date(draft.updatedAt);
    expiryDate.setDate(expiryDate.getDate() + DRAFT_EXPIRY_DAYS);
    
    if (new Date() > expiryDate) {
      // Draft has expired, delete it
      deleteDraft(formType);
      return null;
    }
    
    return draft;
  } catch (error) {
    log.error('Failed to get draft:', error);
    throw error;
  }
};

/**
 * Get all drafts
 */
export const getAllDrafts = (): Draft[] => {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM drafts ORDER BY updatedAt DESC');
    const drafts = stmt.all() as Draft[];
    
    // Filter out expired drafts
    const validDrafts: Draft[] = [];
    const expiredIds: string[] = [];
    
    for (const draft of drafts) {
      const expiryDate = new Date(draft.updatedAt);
      expiryDate.setDate(expiryDate.getDate() + DRAFT_EXPIRY_DAYS);
      
      if (new Date() > expiryDate) {
        expiredIds.push(draft.id);
      } else {
        validDrafts.push(draft);
      }
    }
    
    // Clean up expired drafts
    if (expiredIds.length > 0) {
      const deleteStmt = db.prepare('DELETE FROM drafts WHERE id = ?');
      for (const id of expiredIds) {
        deleteStmt.run(id);
      }
      log.info(`Cleaned up ${expiredIds.length} expired drafts`);
    }
    
    return validDrafts;
  } catch (error) {
    log.error('Failed to get all drafts:', error);
    throw error;
  }
};

/**
 * Delete draft by form type
 */
export const deleteDraft = (formType: DraftFormType): boolean => {
  try {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM drafts WHERE formType = ?');
    const result = stmt.run(formType);
    
    if (result.changes > 0) {
      log.info(`Draft deleted for ${formType}`);
      return true;
    }
    
    return false;
  } catch (error) {
    log.error('Failed to delete draft:', error);
    throw error;
  }
};

/**
 * Clear all drafts
 */
export const clearAllDrafts = (): number => {
  try {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM drafts');
    const result = stmt.run();
    
    log.info(`All drafts cleared: ${result.changes} deleted`);
    return result.changes;
  } catch (error) {
    log.error('Failed to clear all drafts:', error);
    throw error;
  }
};

/**
 * Parse draft data
 */
export const parseDraftData = <T>(draft: Draft): T | null => {
  try {
    return JSON.parse(draft.data) as T;
  } catch (error) {
    log.error('Failed to parse draft data:', error);
    return null;
  }
};

/**
 * Check if draft exists and is recent (for recovery prompt)
 */
export const checkForDraftRecovery = async ():
  Promise<{ formType: DraftFormType; lastUpdated: string; hasData: boolean } | null> => {
  try {
    const drafts = getAllDrafts();
    
    if (drafts.length === 0) {
      return null;
    }
    
    // Get the most recent draft
    const mostRecent = drafts[0];
    
    return {
      formType: mostRecent.formType as DraftFormType,
      lastUpdated: mostRecent.updatedAt,
      hasData: mostRecent.data && mostRecent.data !== '{}' && mostRecent.data !== 'null',
    };
  } catch (error) {
    log.error('Failed to check for draft recovery:', error);
    return null;
  }
};

/**
 * Debounced auto-save helper
 */
export const createDebouncedSave = (
  formType: DraftFormType,
  delay: number = 2000
): {
  save: (data: unknown) => void;
  cancel: () => void;
} => {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return {
    save: (data: unknown) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        saveDraft(formType, data);
        timeoutId = null;
      }, delay);
    },
    cancel: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
  };
};

/**
 * Get draft info for display
 */
export const getDraftInfo = (draft: Draft): {
  formType: DraftFormType;
  lastUpdated: string;
  timeAgo: string;
  hasData: boolean;
} => {
  const updatedAt = new Date(draft.updatedAt);
  const now = new Date();
  const diffMs = now.getTime() - updatedAt.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  let timeAgo: string;
  if (diffMins < 1) {
    timeAgo = 'Just now';
  } else if (diffMins < 60) {
    timeAgo = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else {
    timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  
  return {
    formType: draft.formType as DraftFormType,
    lastUpdated: draft.updatedAt,
    timeAgo,
    hasData: draft.data && draft.data !== '{}' && draft.data !== 'null',
  };
};
