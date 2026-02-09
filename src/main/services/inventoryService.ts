/**
 * Inventory Service
 * 
 * Manages stock levels, deducts inventory when dispensing,
 * and generates alerts for low stock or expiring items.
 */

import log from 'electron-log';
import { getDatabase } from '../database/db';
import { createAlert } from './alertService';
import { logAudit } from './auditService';
import { MEDICATIONS, ALERT_TYPES, LOW_STOCK_THRESHOLD } from '../../renderer/utils/constants';

/**
 * Inventory item interface
 */
export interface InventoryItem {
  id: string;
  medication: string;
  quantity: number;
  unit: string;
  lotNumber: string | null;
  expirationDate: string;
  threshold: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get inventory for a specific medication
 */
export const getInventory = (medication: string): InventoryItem | null => {
  try {
    const db = getDatabase();
    const stmt = db.prepare(
      'SELECT * FROM inventory WHERE medication = ? ORDER BY expirationDate ASC'
    );
    return stmt.get(medication) as InventoryItem | null;
  } catch (error) {
    log.error('Failed to get inventory:', error);
    throw error;
  }
};

/**
 * Get all inventory items
 */
export const getAllInventory = (): InventoryItem[] => {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM inventory ORDER BY medication');
    return stmt.all() as InventoryItem[];
  } catch (error) {
    log.error('Failed to get all inventory:', error);
    throw error;
  }
};

/**
 * Update inventory quantity
 */
export const updateInventory = (
  medication: string,
  quantity: number,
  unit: string,
  lotNumber?: string,
  expirationDate?: string
): InventoryItem => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    // Check if inventory item exists
    const existing = getInventory(medication);
    
    if (existing) {
      // Update existing
      const stmt = db.prepare(`
        UPDATE inventory 
        SET quantity = ?, unit = ?, lotNumber = ?, 
            expirationDate = ?, updatedAt = ?
        WHERE id = ?
      `);
      
      stmt.run(
        quantity,
        unit,
        lotNumber || existing.lotNumber,
        expirationDate || existing.expirationDate,
        now,
        existing.id
      );
      
      logAudit('inventory.update', {
        medication,
        oldQuantity: existing.quantity,
        newQuantity: quantity,
      });
      
      return getInventory(medication)!;
    } else {
      // Insert new
      const id = crypto.randomUUID();
      const threshold = LOW_STOCK_THRESHOLD[medication] || 30;
      
      const stmt = db.prepare(`
        INSERT INTO inventory (id, medication, quantity, unit, lotNumber, expirationDate, threshold, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        id,
        medication,
        quantity,
        unit,
        lotNumber || null,
        expirationDate || null,
        threshold,
        now,
        now
      );
      
      logAudit('inventory.create', {
        medication,
        quantity,
        unit,
      });
      
      return getInventory(medication)!;
    }
  } catch (error) {
    log.error('Failed to update inventory:', error);
    throw error;
  }
};

/**
 * Deduct quantity from inventory when dispensing
 */
export const deductFromInventory = (
  medication: string,
  quantity: number,
  dispenseId: string
): { success: boolean; message?: string } => {
  try {
    const db = getDatabase();
    
    // Start transaction
    const transaction = db.transaction(() => {
      const inventory = getInventory(medication);
      
      if (!inventory) {
        throw new Error(`No inventory found for ${medication}`);
      }
      
      if (inventory.quantity < quantity) {
        throw new Error(
          `Insufficient inventory for ${medication}. ` +
          `Available: ${inventory.quantity}, Requested: ${quantity}`
        );
      }
      
      // Check expiration
      const expirationDate = new Date(inventory.expirationDate);
      const now = new Date();
      
      if (expirationDate < now) {
        throw new Error(`Cannot dispense expired medication: ${medication}`);
      }
      
      // Deduct quantity
      const newQuantity = inventory.quantity - quantity;
      const stmt = db.prepare(`
        UPDATE inventory 
        SET quantity = ?, updatedAt = ?
        WHERE id = ?
      `);
      
      stmt.run(newQuantity, now.toISOString(), inventory.id);
      
      // Log audit
      logAudit('inventory.deduct', {
        medication,
        quantity,
        dispenseId,
        previousQuantity: inventory.quantity,
        newQuantity,
      });
      
      // Check if we need to create alerts
      if (newQuantity <= 0) {
        createAlert({
          type: ALERT_TYPES.OUT_OF_STOCK,
          title: 'Out of Stock',
          message: `${medication} is now out of stock.`,
          medication,
          severity: 'critical',
        });
      } else if (newQuantity <= inventory.threshold) {
        createAlert({
          type: ALERT_TYPES.LOW_STOCK,
          title: 'Low Stock Warning',
          message: `${medication} is running low. Current quantity: ${newQuantity}`,
          medication,
          severity: 'warning',
        });
      }
      
      return { success: true };
    });
    
    return transaction();
  } catch (error) {
    log.error('Failed to deduct from inventory:', error);
    return {
      success: false,
      message: (error as Error).message,
    };
  }
};

/**
 * Add quantity to inventory (e.g., when receiving new stock)
 */
export const addToInventory = (
  medication: string,
  quantity: number,
  unit: string,
  lotNumber?: string,
  expirationDate?: string
): InventoryItem => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    const existing = getInventory(medication);
    
    if (existing) {
      const newQuantity = existing.quantity + quantity;
      
      const stmt = db.prepare(`
        UPDATE inventory 
        SET quantity = ?, unit = ?, lotNumber = ?, 
            expirationDate = ?, updatedAt = ?
        WHERE id = ?
      `);
      
      stmt.run(
        newQuantity,
        unit,
        lotNumber || existing.lotNumber,
        expirationDate || existing.expirationDate,
        now,
        existing.id
      );
      
      logAudit('inventory.add', {
        medication,
        quantity,
        newTotal: newQuantity,
      });
      
      return getInventory(medication)!;
    } else {
      return updateInventory(medication, quantity, unit, lotNumber, expirationDate);
    }
  } catch (error) {
    log.error('Failed to add to inventory:', error);
    throw error;
  }
};

/**
 * Get low stock items
 */
export const getLowStockItems = (): InventoryItem[] => {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM inventory 
      WHERE quantity <= threshold AND quantity > 0
      ORDER BY quantity ASC
    `);
    return stmt.all() as InventoryItem[];
  } catch (error) {
    log.error('Failed to get low stock items:', error);
    throw error;
  }
};

/**
 * Get out of stock items
 */
export const getOutOfStockItems = (): InventoryItem[] => {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM inventory 
      WHERE quantity <= 0
      ORDER BY medication
    `);
    return stmt.all() as InventoryItem[];
  } catch (error) {
    log.error('Failed to get out of stock items:', error);
    throw error;
  }
};

/**
 * Get expiring items (within specified days)
 */
export const getExpiringItems = (days: number = 30): InventoryItem[] => {
  try {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);
    
    const stmt = db.prepare(`
      SELECT * FROM inventory 
      WHERE expirationDate <= ? AND quantity > 0
      ORDER BY expirationDate ASC
    `);
    
    return stmt.all(cutoffDate.toISOString()) as InventoryItem[];
  } catch (error) {
    log.error('Failed to get expiring items:', error);
    throw error;
  }
};

/**
 * Import inventory from CSV data
 */
export const importInventory = (
  items: Array<{
    medication: string;
    quantity: number;
    unit: string;
    lotNumber?: string;
    expirationDate?: string;
  }>
): { success: number; failed: number; errors: string[] } => {
  const db = getDatabase();
  const result = { success: 0, failed: 0, errors: [] as string[] };
  
  const transaction = db.transaction(() => {
    for (const item of items) {
      try {
        // Validate medication
        if (!MEDICATIONS.includes(item.medication)) {
          result.errors.push(`Invalid medication: ${item.medication}`);
          result.failed++;
          continue;
        }
        
        addToInventory(
          item.medication,
          item.quantity,
          item.unit,
          item.lotNumber,
          item.expirationDate
        );
        
        result.success++;
      } catch (error) {
        result.errors.push(`Failed to import ${item.medication}: ${(error as Error).message}`);
        result.failed++;
      }
    }
  });
  
  transaction();
  
  logAudit('inventory.import', {
    successCount: result.success,
    failedCount: result.failed,
  });
  
  return result;
};

/**
 * Delete inventory item
 */
export const deleteInventory = (id: string): boolean => {
  try {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM inventory WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes > 0) {
      logAudit('inventory.delete', { id });
      return true;
    }
    
    return false;
  } catch (error) {
    log.error('Failed to delete inventory:', error);
    throw error;
  }
};
