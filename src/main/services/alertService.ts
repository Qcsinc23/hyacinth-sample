/**
 * Alert Service
 * 
 * Manages system alerts for low stock, expiring medications,
 * and other important notifications.
 */

import log from 'electron-log';
import { getDatabase } from '../database/db';
import { ALERT_TYPES, EXPIRATION_WARNING_DAYS } from '../../renderer/utils/constants';

/**
 * Alert interface
 */
export interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  medication: string | null;
  severity: 'info' | 'warning' | 'critical';
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

/**
 * Alert creation data
 */
export interface AlertData {
  type: string;
  title: string;
  message: string;
  medication?: string;
  severity: 'info' | 'warning' | 'critical';
}

/**
 * Create a new alert
 */
export const createAlert = (data: AlertData): Alert => {
  try {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO alerts (id, type, title, message, medication, severity, isRead, createdAt, readAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      data.type,
      data.title,
      data.message,
      data.medication || null,
      data.severity,
      0, // isRead = false
      now,
      null
    );
    
    log.info(`Alert created: ${data.title}`);
    
    return {
      id,
      type: data.type,
      title: data.title,
      message: data.message,
      medication: data.medication || null,
      severity: data.severity,
      isRead: false,
      createdAt: now,
      readAt: null,
    };
  } catch (error) {
    log.error('Failed to create alert:', error);
    throw error;
  }
};

/**
 * Get unread alerts
 */
export const getUnreadAlerts = (): Alert[] => {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM alerts 
      WHERE isRead = 0
      ORDER BY 
        CASE severity 
          WHEN 'critical' THEN 1 
          WHEN 'warning' THEN 2 
          ELSE 3 
        END,
        createdAt DESC
    `);
    return stmt.all() as Alert[];
  } catch (error) {
    log.error('Failed to get unread alerts:', error);
    throw error;
  }
};

/**
 * Get all alerts
 */
export const getAllAlerts = (options?: { limit?: number; offset?: number }): Alert[] => {
  try {
    const db = getDatabase();
    let sql = 'SELECT * FROM alerts ORDER BY createdAt DESC';
    const params: (number)[] = [];
    
    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }
    if (options?.offset) {
      sql += ' OFFSET ?';
      params.push(options.offset);
    }
    
    const stmt = db.prepare(sql);
    return stmt.all(...params) as Alert[];
  } catch (error) {
    log.error('Failed to get all alerts:', error);
    throw error;
  }
};

/**
 * Mark alert as read
 */
export const markAlertAsRead = (id: string): boolean => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE alerts 
      SET isRead = 1, readAt = ?
      WHERE id = ?
    `);
    
    const result = stmt.run(now, id);
    return result.changes > 0;
  } catch (error) {
    log.error('Failed to mark alert as read:', error);
    throw error;
  }
};

/**
 * Mark all alerts as read
 */
export const markAllAlertsAsRead = (): number => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE alerts 
      SET isRead = 1, readAt = ?
      WHERE isRead = 0
    `);
    
    const result = stmt.run(now);
    return result.changes;
  } catch (error) {
    log.error('Failed to mark all alerts as read:', error);
    throw error;
  }
};

/**
 * Dismiss/delete an alert
 */
export const dismissAlert = (id: string): boolean => {
  try {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM alerts WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  } catch (error) {
    log.error('Failed to dismiss alert:', error);
    throw error;
  }
};

/**
 * Get alert counts by severity
 */
export const getAlertCounts = (): {
  total: number;
  unread: number;
  critical: number;
  warning: number;
  info: number;
} => {
  try {
    const db = getDatabase();
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM alerts');
    const unreadStmt = db.prepare('SELECT COUNT(*) as count FROM alerts WHERE isRead = 0');
    const criticalStmt = db.prepare("SELECT COUNT(*) as count FROM alerts WHERE severity = 'critical' AND isRead = 0");
    const warningStmt = db.prepare("SELECT COUNT(*) as count FROM alerts WHERE severity = 'warning' AND isRead = 0");
    const infoStmt = db.prepare("SELECT COUNT(*) as count FROM alerts WHERE severity = 'info' AND isRead = 0");
    
    return {
      total: (totalStmt.get() as { count: number }).count,
      unread: (unreadStmt.get() as { count: number }).count,
      critical: (criticalStmt.get() as { count: number }).count,
      warning: (warningStmt.get() as { count: number }).count,
      info: (infoStmt.get() as { count: number }).count,
    };
  } catch (error) {
    log.error('Failed to get alert counts:', error);
    throw error;
  }
};

/**
 * Check for expired items and create alerts
 */
export const checkForExpiredItems = (): void => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Find expired items
    const expiredStmt = db.prepare(`
      SELECT * FROM inventory
      WHERE expiration_date < ? AND quantity_on_hand > 0 AND status = 'active'
    `);

    const expiredItems = expiredStmt.all(now) as Array<{
      medication_name: string;
      quantity_on_hand: number;
      expiration_date: string;
    }>;

    if (expiredItems.length > 0) {
      log.warn(`Found ${expiredItems.length} expired medication(s):`,
        expiredItems.map(i => `${i.medication_name} (${i.expiration_date})`).join(', ')
      );
    }

    log.info(`Checked for expired items. Found: ${expiredItems.length}`);
  } catch (error) {
    log.error('Failed to check for expired items:', error);
  }
};

/**
 * Check for items expiring soon and create alerts
 */
export const checkForExpiringItems = (): void => {
  try {
    const db = getDatabase();
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + EXPIRATION_WARNING_DAYS);

    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const warningDateStr = warningDate.toISOString().split('T')[0];

    // Find items expiring within warning period
    const expiringStmt = db.prepare(`
      SELECT * FROM inventory
      WHERE expiration_date <= ? AND expiration_date > ? AND quantity_on_hand > 0 AND status = 'active'
    `);

    const expiringItems = expiringStmt.all(
      warningDateStr,
      now
    ) as Array<{
      medication_name: string;
      quantity_on_hand: number;
      expiration_date: string;
    }>;

    if (expiringItems.length > 0) {
      log.warn(`Found ${expiringItems.length} medication(s) expiring soon:`,
        expiringItems.map(i => `${i.medication_name} (${i.expiration_date})`).join(', ')
      );
    }

    log.info(`Checked for expiring items. Found: ${expiringItems.length}`);
  } catch (error) {
    log.error('Failed to check for expiring items:', error);
  }
};

/**
 * Check for low stock and create alerts
 */
export const checkForLowStock = (): void => {
  try {
    const db = getDatabase();
    const lowStockStmt = db.prepare(`
      SELECT * FROM inventory 
      WHERE quantity_on_hand <= reorder_threshold AND quantity_on_hand > 0 AND status = 'active'
    `);
    
    const lowStockItems = lowStockStmt.all() as Array<{
      medication_name: string;
      quantity_on_hand: number;
      reorder_threshold: number;
    }>;
    
    for (const item of lowStockItems) {
      // Check if alert already exists
      const existingStmt = db.prepare(`
        SELECT id FROM alerts 
        WHERE type = ? AND medication = ? AND isRead = 0
      `);
      const existing = existingStmt.get(ALERT_TYPES.LOW_STOCK, item.medication_name);
      
      if (!existing) {
        createAlert({
          type: ALERT_TYPES.LOW_STOCK,
          title: 'Low Stock Warning',
          message: `${item.medication_name} is running low. Current quantity: ${item.quantity_on_hand} (threshold: ${item.reorder_threshold})`,
          medication: item.medication_name,
          severity: 'warning',
        });
      }
    }
    
    log.info(`Checked for low stock. Found: ${lowStockItems.length}`);
  } catch (error) {
    log.error('Failed to check for low stock:', error);
  }
};

/**
 * Run all expiration and stock checks
 */
export const runAllAlertChecks = (): void => {
  checkForExpiredItems();
  checkForExpiringItems();
  checkForLowStock();
};

/**
 * Delete old read alerts (cleanup)
 */
export const cleanupOldAlerts = (daysToKeep: number = 30): number => {
  try {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const stmt = db.prepare(`
      DELETE FROM alerts 
      WHERE isRead = 1 AND readAt < ?
    `);
    
    const result = stmt.run(cutoffDate.toISOString());
    log.info(`Cleaned up ${result.changes} old alerts`);
    return result.changes;
  } catch (error) {
    log.error('Failed to cleanup old alerts:', error);
    throw error;
  }
};
