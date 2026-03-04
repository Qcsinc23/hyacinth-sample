/**
 * Alerts Queries
 * Inventory alert management
 */

import { getDatabase } from '../db';
import type {
  InventoryAlert,
  AlertType,
  AlertSeverity,
} from '../../../shared/types';

/**
 * Get active (unacknowledged) alerts
 */
export function getActiveAlerts(
  options: {
    severity?: AlertSeverity;
    alertType?: AlertType;
    limit?: number;
  } = {},
): InventoryAlert[] {
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

  return db
    .prepare(
      `
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
  `,
    )
    .all(...params, limit) as InventoryAlert[];
}

/**
 * Get all alerts (including acknowledged)
 */
export function getAllAlerts(
  options: {
    acknowledged?: boolean;
    severity?: AlertSeverity;
    alertType?: AlertType;
    page?: number;
    pageSize?: number;
  } = {},
): { data: InventoryAlert[]; total: number } {
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
  const countResult = db
    .prepare(
      `
    SELECT COUNT(*) as total FROM inventory_alerts ${whereClause}
  `,
    )
    .get(...params) as { total: number };

  // Get data
  const data = db
    .prepare(
      `
    SELECT a.*, 
           i.medication_name, i.lot_number,
           s.first_name || ' ' || s.last_name as acknowledged_by_name
    FROM inventory_alerts a
    JOIN inventory i ON a.inventory_id = i.id
    LEFT JOIN staff_members s ON a.acknowledged_by = s.id
    ${whereClause}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `,
    )
    .all(...params, pageSize, offset) as InventoryAlert[];

  return {
    data,
    total: countResult.total,
  };
}

/**
 * Acknowledge an alert
 */
export function acknowledgeAlert(
  alertId: number,
  staffId: number,
): InventoryAlert {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(
    `
    UPDATE inventory_alerts 
    SET is_acknowledged = 1, 
        acknowledged_by = ?, 
        acknowledged_at = ?
    WHERE id = ?
  `,
  ).run(staffId, now, alertId);

  const alert = getAlertById(alertId);
  if (!alert) {
    throw new Error(`Failed to acknowledge alert ${alertId}: alert not found`);
  }
  return alert;
}

/**
 * Acknowledge all alerts for an inventory item
 */
export function acknowledgeAlertsForInventory(
  inventoryId: number,
  staffId: number,
): number {
  const db = getDatabase();
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `
    UPDATE inventory_alerts 
    SET is_acknowledged = 1, 
        acknowledged_by = ?, 
        acknowledged_at = ?
    WHERE inventory_id = ? AND is_acknowledged = 0
  `,
    )
    .run(staffId, now, inventoryId);

  return result.changes;
}

/**
 * Get alert by ID
 */
export function getAlertById(id: number): InventoryAlert | null {
  const db = getDatabase();
  return db
    .prepare(
      `
    SELECT a.*, 
           i.medication_name, i.lot_number,
           s.first_name || ' ' || s.last_name as acknowledged_by_name
    FROM inventory_alerts a
    JOIN inventory i ON a.inventory_id = i.id
    LEFT JOIN staff_members s ON a.acknowledged_by = s.id
    WHERE a.id = ?
  `,
    )
    .get(id) as InventoryAlert | null;
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

  const total = db
    .prepare('SELECT COUNT(*) as count FROM inventory_alerts')
    .get() as { count: number };
  const critical = db
    .prepare(
      "SELECT COUNT(*) as count FROM inventory_alerts WHERE severity = 'critical' AND is_acknowledged = 0",
    )
    .get() as { count: number };
  const warning = db
    .prepare(
      "SELECT COUNT(*) as count FROM inventory_alerts WHERE severity = 'warning' AND is_acknowledged = 0",
    )
    .get() as { count: number };
  const info = db
    .prepare(
      "SELECT COUNT(*) as count FROM inventory_alerts WHERE severity = 'info' AND is_acknowledged = 0",
    )
    .get() as { count: number };
  const unacknowledged = db
    .prepare(
      'SELECT COUNT(*) as count FROM inventory_alerts WHERE is_acknowledged = 0',
    )
    .get() as { count: number };

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
  message: string,
): InventoryAlert {
  const db = getDatabase();
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `
    INSERT INTO inventory_alerts (
      inventory_id, alert_type, severity, message, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `,
    )
    .run(inventoryId, alertType, severity, message, now);

  const created = getAlertById(Number(result.lastInsertRowid));
  if (!created) {
    throw new Error('Failed to create alert: record not found after insert');
  }
  return created;
}

/**
 * Resolve an alert automatically (e.g., when stock is replenished)
 */
export function resolveAlert(alertId: number): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(
    `
    UPDATE inventory_alerts 
    SET auto_resolved = 1, resolved_at = ?
    WHERE id = ? AND is_acknowledged = 0
  `,
  ).run(now, alertId);
}

/**
 * Delete old resolved alerts (maintenance)
 */
export function cleanupOldAlerts(olderThanDays: number): number {
  const db = getDatabase();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  const cutoffStr = cutoffDate.toISOString();

  const result = db
    .prepare(
      `
    DELETE FROM inventory_alerts 
    WHERE (is_acknowledged = 1 OR auto_resolved = 1) 
    AND created_at < ?
  `,
    )
    .run(cutoffStr);

  return result.changes;
}

/**
 * Scan all active inventory items and check for expired/expiring items
 * Creates alerts as needed. Called periodically from main process.
 */
export function checkForExpiredItems(): void {
  const { checkAndCreateAlerts, getInventoryById } = require('./inventory');
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];

  // Get all active inventory items
  const activeItems = db
    .prepare(
      `
    SELECT id FROM inventory 
    WHERE status = 'active' AND quantity_on_hand > 0
  `,
    )
    .all() as Array<{ id: number }>;

  let expiredCount = 0;
  let expiringCount = 0;

  for (const item of activeItems) {
    const inventory = getInventoryById(item.id);
    if (!inventory) continue;

    // Check expiration
    if (inventory.expiration_date < today) {
      expiredCount++;
    } else {
      // Check if expiring within 30 days
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];

      if (inventory.expiration_date <= thirtyDaysStr) {
        expiringCount++;
      }
    }

    // This will create alerts if needed
    checkAndCreateAlerts(item.id);
  }

  const log = require('electron-log');
  if (expiredCount > 0) {
    log.warn(`Found ${expiredCount} expired medication lot(s)`);
  }
  if (expiringCount > 0) {
    log.info(
      `Found ${expiringCount} medication lot(s) expiring within 30 days`,
    );
  }
  log.info(`Checked ${activeItems.length} inventory items for expiration`);
}
