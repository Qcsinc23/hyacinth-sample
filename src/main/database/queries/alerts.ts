/**
 * Alerts Queries
 * Inventory alert management
 */

import { getDatabase } from '../db';
import type { InventoryAlert, AlertType, AlertSeverity } from '../../../shared/types';

/**
 * Get active (unacknowledged) alerts
 */
export function getActiveAlerts(options: {
  severity?: AlertSeverity;
  alertType?: AlertType;
  limit?: number;
} = {}): InventoryAlert[] {
  const db = getDatabase();
  
  let whereClause = 'WHERE is_acknowledged = 0';
  const params: (string | number)[] = [];
  
  if (options.severity) {
    whereClause += ' AND severity = ?';
    params.push(options.severity);
  }
  
  if (options.alertType) {
    whereClause += ' AND alert_type = ?';
    params.push(options.alertType);
  }
  
  const limit = options.limit || 100;
  
  return db.prepare(`
    SELECT a.*, 
           i.medication_name, i.lot_number, i.quantity_on_hand,
           s.first_name || ' ' || s.last_name as acknowledged_by_name
    FROM inventory_alerts a
    JOIN inventory i ON a.inventory_id = i.id
    LEFT JOIN staff_members s ON a.acknowledged_by = s.id
    ${whereClause}
    ORDER BY 
      CASE a.severity 
        WHEN 'critical' THEN 1 
        WHEN 'warning' THEN 2 
        ELSE 3 
      END,
      a.created_at DESC
    LIMIT ?
  `).all(...params, limit) as InventoryAlert[];
}

/**
 * Get all alerts (including acknowledged)
 */
export function getAllAlerts(options: {
  acknowledged?: boolean;
  severity?: AlertSeverity;
  alertType?: AlertType;
  page?: number;
  pageSize?: number;
} = {}): { data: InventoryAlert[]; total: number } {
  const db = getDatabase();
  
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  const offset = (page - 1) * pageSize;
  
  let whereClause = 'WHERE 1=1';
  const params: (string | number | boolean)[] = [];
  
  if (options.acknowledged !== undefined) {
    whereClause += ' AND is_acknowledged = ?';
    params.push(options.acknowledged ? 1 : 0);
  }
  
  if (options.severity) {
    whereClause += ' AND severity = ?';
    params.push(options.severity);
  }
  
  if (options.alertType) {
    whereClause += ' AND alert_type = ?';
    params.push(options.alertType);
  }
  
  // Get count
  const countResult = db.prepare(`
    SELECT COUNT(*) as total FROM inventory_alerts ${whereClause}
  `).get(...params) as { total: number };
  
  // Get data
  const data = db.prepare(`
    SELECT a.*, 
           i.medication_name, i.lot_number,
           s.first_name || ' ' || s.last_name as acknowledged_by_name
    FROM inventory_alerts a
    JOIN inventory i ON a.inventory_id = i.id
    LEFT JOIN staff_members s ON a.acknowledged_by = s.id
    ${whereClause}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset) as InventoryAlert[];
  
  return {
    data,
    total: countResult.total,
  };
}

/**
 * Acknowledge an alert
 */
export function acknowledgeAlert(alertId: number, staffId: number): InventoryAlert {
  const db = getDatabase();
  const now = new Date().toISOString();
  
  db.prepare(`
    UPDATE inventory_alerts 
    SET is_acknowledged = 1, 
        acknowledged_by = ?, 
        acknowledged_at = ?
    WHERE id = ?
  `).run(staffId, now, alertId);
  
  return getAlertById(alertId)!;
}

/**
 * Acknowledge all alerts for an inventory item
 */
export function acknowledgeAlertsForInventory(inventoryId: number, staffId: number): number {
  const db = getDatabase();
  const now = new Date().toISOString();
  
  const result = db.prepare(`
    UPDATE inventory_alerts 
    SET is_acknowledged = 1, 
        acknowledged_by = ?, 
        acknowledged_at = ?
    WHERE inventory_id = ? AND is_acknowledged = 0
  `).run(staffId, now, inventoryId);
  
  return result.changes;
}

/**
 * Get alert by ID
 */
export function getAlertById(id: number): InventoryAlert | null {
  const db = getDatabase();
  return db.prepare(`
    SELECT a.*, 
           i.medication_name, i.lot_number,
           s.first_name || ' ' || s.last_name as acknowledged_by_name
    FROM inventory_alerts a
    JOIN inventory i ON a.inventory_id = i.id
    LEFT JOIN staff_members s ON a.acknowledged_by = s.id
    WHERE a.id = ?
  `).get(id) as InventoryAlert | null;
}

/**
 * Get alert counts by severity
 */
export function getAlertCounts(): {
  total: number;
  critical: number;
  warning: number;
  info: number;
  unacknowledged: number;
} {
  const db = getDatabase();
  
  const total = db.prepare('SELECT COUNT(*) as count FROM inventory_alerts').get() as { count: number };
  const critical = db.prepare("SELECT COUNT(*) as count FROM inventory_alerts WHERE severity = 'critical' AND is_acknowledged = 0").get() as { count: number };
  const warning = db.prepare("SELECT COUNT(*) as count FROM inventory_alerts WHERE severity = 'warning' AND is_acknowledged = 0").get() as { count: number };
  const info = db.prepare("SELECT COUNT(*) as count FROM inventory_alerts WHERE severity = 'info' AND is_acknowledged = 0").get() as { count: number };
  const unacknowledged = db.prepare('SELECT COUNT(*) as count FROM inventory_alerts WHERE is_acknowledged = 0').get() as { count: number };
  
  return {
    total: total.count,
    critical: critical.count,
    warning: warning.count,
    info: info.count,
    unacknowledged: unacknowledged.count,
  };
}

/**
 * Create a manual alert
 */
export function createAlert(
  inventoryId: number,
  alertType: AlertType,
  severity: AlertSeverity,
  message: string
): InventoryAlert {
  const db = getDatabase();
  const now = new Date().toISOString();
  
  const result = db.prepare(`
    INSERT INTO inventory_alerts (
      inventory_id, alert_type, severity, message, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `).run(inventoryId, alertType, severity, message, now);
  
  return getAlertById(Number(result.lastInsertRowid))!;
}

/**
 * Resolve an alert automatically (e.g., when stock is replenished)
 */
export function resolveAlert(alertId: number): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  
  db.prepare(`
    UPDATE inventory_alerts 
    SET auto_resolved = 1, resolved_at = ?
    WHERE id = ? AND is_acknowledged = 0
  `).run(now, alertId);
}

/**
 * Delete old resolved alerts (maintenance)
 */
export function cleanupOldAlerts(olderThanDays: number): number {
  const db = getDatabase();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  const cutoffStr = cutoffDate.toISOString();
  
  const result = db.prepare(`
    DELETE FROM inventory_alerts 
    WHERE (is_acknowledged = 1 OR auto_resolved = 1) 
    AND created_at < ?
  `).run(cutoffStr);
  
  return result.changes;
}
