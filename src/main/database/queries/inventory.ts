/**
 * Inventory Queries
 * Stock management, transactions, and adjustments
 */

import { getDatabase, withTransaction } from '../db';
import type {
  Inventory,
  InventoryTransaction,
  InventoryWithTransactions,
  ReceiveInventoryInput,
  AdjustInventoryInput,
  SearchResult
} from '../../../shared/types';

/**
 * Lot validation result interface
 */
export interface LotValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  lot?: Inventory;
}

/**
 * Extended lot information with expiration details
 */
export interface ExtendedLotInfo extends Inventory {
  daysUntilExpiration: number;
  expirationWarning?: string;
  isExpiringSoon: boolean;
  isExpired: boolean;
}

/**
 * Receive new inventory
 */
export function receiveInventory(input: ReceiveInventoryInput): Inventory {
  return withTransaction(() => {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    // Create inventory record
    const result = db.prepare(`
      INSERT INTO inventory (
        medication_name, lot_number, ndc_code, expiration_date,
        quantity_received, quantity_on_hand, unit, supplier,
        supplier_invoice, cost_per_unit, received_date, received_by,
        reorder_threshold, storage_location, status, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `).run(
      input.medication_name,
      input.lot_number,
      input.ndc_code || null,
      input.expiration_date,
      input.quantity_received,
      input.quantity_received, // Initial on-hand = received
      input.unit,
      input.supplier || null,
      input.supplier_invoice || null,
      input.cost_per_unit || null,
      input.received_date,
      input.received_by,
      input.reorder_threshold || null,
      input.storage_location || null,
      input.notes || null,
      now,
      now
    );
    
    const inventoryId = Number(result.lastInsertRowid);
    
    // Create transaction record
    db.prepare(`
      INSERT INTO inventory_transactions (
        inventory_id, transaction_type, quantity_change, quantity_before,
        quantity_after, reference_type, reason, performed_by, timestamp
      ) VALUES (?, 'receive', ?, 0, ?, 'receive', 'Initial receipt', ?, ?)
    `).run(
      inventoryId,
      input.quantity_received,
      input.quantity_received,
      input.received_by,
      now
    );
    
    // Check for low stock or expiring alerts
    checkAndCreateAlerts(inventoryId);
    
    return getInventoryById(inventoryId)!;
  });
}

/**
 * Get inventory by ID
 */
export function getInventoryById(id: number): Inventory | null {
  const db = getDatabase();
  return db.prepare('SELECT * FROM inventory WHERE id = ?').get(id) as Inventory | null;
}

/**
 * Get inventory with transactions
 */
export function getInventoryWithTransactions(id: number): InventoryWithTransactions | null {
  const db = getDatabase();
  
  const inventory = getInventoryById(id);
  if (!inventory) return null;
  
  const transactions = db.prepare(`
    SELECT * FROM inventory_transactions 
    WHERE inventory_id = ? 
    ORDER BY timestamp DESC
  `).all(id) as InventoryTransaction[];
  
  return {
    ...inventory,
    transactions,
  };
}

/**
 * Search inventory
 */
export function searchInventory(options: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  expiringBefore?: string;
} = {}): SearchResult<Inventory> {
  const db = getDatabase();
  
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  const offset = (page - 1) * pageSize;
  
  let whereClause = 'WHERE 1=1';
  const params: (string | number)[] = [];
  
  if (options.search) {
    whereClause += ` AND (
      medication_name LIKE ? OR 
      lot_number LIKE ? OR
      ndc_code LIKE ?
    )`;
    const searchPattern = `%${options.search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }
  
  if (options.status) {
    whereClause += ' AND status = ?';
    params.push(options.status);
  }
  
  if (options.expiringBefore) {
    whereClause += ' AND expiration_date <= ?';
    params.push(options.expiringBefore);
  }
  
  // Get count
  const countResult = db.prepare(`
    SELECT COUNT(*) as total FROM inventory ${whereClause}
  `).get(...params) as { total: number };
  
  // Get data
  const data = db.prepare(`
    SELECT * FROM inventory 
    ${whereClause}
    ORDER BY medication_name, expiration_date
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset) as Inventory[];
  
  return {
    data,
    total: countResult.total,
    page,
    pageSize,
  };
}

/**
 * Get inventory by medication name
 */
export function getInventoryByMedication(medicationName: string, onlyActive = true): Inventory[] {
  const db = getDatabase();
  let query = 'SELECT * FROM inventory WHERE medication_name = ?';
  if (onlyActive) {
    query += " AND status = 'active'";
  }
  query += ' ORDER BY expiration_date';
  return db.prepare(query).all(medicationName) as Inventory[];
}

/**
 * Get low stock items
 */
export function getLowStockItems(): Inventory[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT * FROM inventory 
    WHERE status = 'active' 
    AND reorder_threshold IS NOT NULL 
    AND quantity_on_hand <= reorder_threshold
    ORDER BY quantity_on_hand / reorder_threshold ASC
  `).all() as Inventory[];
}

/**
 * Get expiring items (within days)
 */
export function getExpiringItems(days: number): Inventory[] {
  const db = getDatabase();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + days);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];
  
  return db.prepare(`
    SELECT * FROM inventory 
    WHERE status = 'active' 
    AND expiration_date <= ?
    ORDER BY expiration_date
  `).get(cutoffStr) as Inventory[];
}

/**
 * Adjust inventory quantity
 */
export function adjustInventory(input: AdjustInventoryInput): Inventory {
  return withTransaction(() => {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    const inventory = getInventoryById(input.inventory_id);
    if (!inventory) {
      throw new Error(`Inventory item ${input.inventory_id} not found`);
    }
    
    const quantityBefore = inventory.quantity_on_hand;
    const quantityChange = input.new_quantity - quantityBefore;
    
    // Update inventory
    db.prepare(`
      UPDATE inventory 
      SET quantity_on_hand = ?, updated_at = ?
      WHERE id = ?
    `).run(input.new_quantity, now, input.inventory_id);
    
    // Create transaction record
    db.prepare(`
      INSERT INTO inventory_transactions (
        inventory_id, transaction_type, quantity_change, quantity_before,
        quantity_after, reference_type, reason, performed_by, timestamp
      ) VALUES (?, 'adjustment', ?, ?, ?, 'adjustment', ?, ?, ?)
    `).run(
      input.inventory_id,
      quantityChange,
      quantityBefore,
      input.new_quantity,
      input.reason,
      input.staff_id,
      now
    );
    
    // Update status if depleted
    if (input.new_quantity <= 0) {
      db.prepare(`
        UPDATE inventory SET status = 'depleted', updated_at = ? WHERE id = ?
      `).run(now, input.inventory_id);
    }
    
    // Check for alerts
    checkAndCreateAlerts(input.inventory_id);
    
    return getInventoryById(input.inventory_id)!;
  });
}

/**
 * Deduct inventory for dispensing
 */
export function deductInventoryForDispense(
  inventoryId: number, 
  quantity: number, 
  staffId: number, 
  referenceId: number
): void {
  withTransaction(() => {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    const inventory = getInventoryById(inventoryId);
    if (!inventory) {
      throw new Error(`Inventory item ${inventoryId} not found`);
    }
    
    if (inventory.quantity_on_hand < quantity) {
      throw new Error(`Insufficient inventory for ${inventory.medication_name}`);
    }
    
    const newQuantity = inventory.quantity_on_hand - quantity;
    
    // Update inventory
    db.prepare(`
      UPDATE inventory 
      SET quantity_on_hand = ?, updated_at = ?
      WHERE id = ?
    `).run(newQuantity, now, inventoryId);
    
    // Create transaction record
    db.prepare(`
      INSERT INTO inventory_transactions (
        inventory_id, transaction_type, quantity_change, quantity_before,
        quantity_after, reference_type, reference_id, reason, performed_by, timestamp
      ) VALUES (?, 'dispense', ?, ?, ?, 'dispense', ?, 'Medication dispensed', ?, ?)
    `).run(
      inventoryId,
      -quantity,
      inventory.quantity_on_hand,
      newQuantity,
      referenceId,
      staffId,
      now
    );
    
    // Update status if depleted
    if (newQuantity <= 0) {
      db.prepare(`
        UPDATE inventory SET status = 'depleted', updated_at = ? WHERE id = ?
      `).run(now, inventoryId);
    }
    
    // Check for alerts
    checkAndCreateAlerts(inventoryId);
  });
}

/**
 * Get inventory transactions
 */
export function getInventoryTransactions(inventoryId?: number, limit = 100): InventoryTransaction[] {
  const db = getDatabase();
  
  if (inventoryId) {
    return db.prepare(`
      SELECT t.*, s.first_name || ' ' || s.last_name as performed_by_name
      FROM inventory_transactions t
      LEFT JOIN staff_members s ON t.performed_by = s.id
      WHERE t.inventory_id = ?
      ORDER BY t.timestamp DESC
      LIMIT ?
    `).all(inventoryId, limit) as InventoryTransaction[];
  }
  
  return db.prepare(`
    SELECT t.*, s.first_name || ' ' || s.last_name as performed_by_name
    FROM inventory_transactions t
    LEFT JOIN staff_members s ON t.performed_by = s.id
    ORDER BY t.timestamp DESC
    LIMIT ?
  `).all(limit) as InventoryTransaction[];
}

/**
 * Check and create alerts for inventory item
 */
function checkAndCreateAlerts(inventoryId: number): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  const today = now.split('T')[0];
  
  const inventory = getInventoryById(inventoryId);
  if (!inventory || inventory.status !== 'active') return;
  
  // Check expiration (30 days warning)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];
  
  // Expired check
  if (inventory.expiration_date < today) {
    // Create or update expired alert
    const existing = db.prepare(`
      SELECT id FROM inventory_alerts 
      WHERE inventory_id = ? AND alert_type = 'expired' AND auto_resolved = 0
    `).get(inventoryId) as { id: number } | undefined;
    
    if (!existing) {
      db.prepare(`
        INSERT INTO inventory_alerts (
          inventory_id, alert_type, severity, message, created_at
        ) VALUES (?, 'expired', 'critical', ?, ?)
      `).run(
        inventoryId,
        `${inventory.medication_name} (Lot: ${inventory.lot_number}) has expired on ${inventory.expiration_date}`,
        now
      );
    }
    
    // Update status to expired
    db.prepare(`UPDATE inventory SET status = 'expired', updated_at = ? WHERE id = ?`)
      .run(now, inventoryId);
  } else if (inventory.expiration_date <= thirtyDaysStr) {
    // Expiring soon
    const existing = db.prepare(`
      SELECT id FROM inventory_alerts 
      WHERE inventory_id = ? AND alert_type = 'expiring_soon' AND auto_resolved = 0
    `).get(inventoryId) as { id: number } | undefined;
    
    if (!existing) {
      const daysUntilExpiry = Math.ceil(
        (new Date(inventory.expiration_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      db.prepare(`
        INSERT INTO inventory_alerts (
          inventory_id, alert_type, severity, message, created_at
        ) VALUES (?, 'expiring_soon', 'warning', ?, ?)
      `).run(
        inventoryId,
        `${inventory.medication_name} (Lot: ${inventory.lot_number}) expires in ${daysUntilExpiry} days`,
        now
      );
    }
  }
  
  // Low stock check
  if (inventory.reorder_threshold && inventory.quantity_on_hand <= inventory.reorder_threshold) {
    const existing = db.prepare(`
      SELECT id FROM inventory_alerts 
      WHERE inventory_id = ? AND alert_type = 'low_stock' AND auto_resolved = 0
    `).get(inventoryId) as { id: number } | undefined;
    
    if (!existing) {
      db.prepare(`
        INSERT INTO inventory_alerts (
          inventory_id, alert_type, severity, message, created_at
        ) VALUES (?, 'low_stock', 'warning', ?, ?)
      `).run(
        inventoryId,
        `${inventory.medication_name} (Lot: ${inventory.lot_number}) is low on stock: ${inventory.quantity_on_hand} remaining`,
        now
      );
    }
  } else {
    // Auto-resolve low stock if above threshold
    db.prepare(`
      UPDATE inventory_alerts 
      SET auto_resolved = 1, resolved_at = ?
      WHERE inventory_id = ? AND alert_type = 'low_stock' AND auto_resolved = 0
    `).run(now, inventoryId);
  }
}

/**
 * Quarantine inventory item
 */
export function quarantineInventory(inventoryId: number, reason: string, staffId: number): Inventory {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE inventory
    SET status = 'quarantined', notes = COALESCE(notes || '; ', '') || ?, updated_at = ?
    WHERE id = ?
  `).run(`Quarantined: ${reason}`, now, inventoryId);

  return getInventoryById(inventoryId)!;
}

/**
 * Validate a lot for dispensing
 * Comprehensive validation including expiration, quantity, and status checks
 */
export function validateLotForDispensing(lotId: number, quantity: number): LotValidationResult {
  const db = getDatabase();
  const errors: string[] = [];
  const warnings: string[] = [];

  const lot = getInventoryById(lotId);
  if (!lot) {
    errors.push('Lot not found in inventory');
    return { valid: false, errors, warnings };
  }

  // Check expiration
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expirationDate = new Date(lot.expiration_date);
  expirationDate.setHours(0, 0, 0, 0);
  const daysUntilExpiration = Math.floor((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiration < 0) {
    errors.push(`This lot has expired on ${lot.expiration_date}. Cannot dispense.`);
  } else if (daysUntilExpiration < 30) {
    warnings.push(`Lot expires in ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}. Consider using newer stock.`);
  } else if (daysUntilExpiration < 90) {
    warnings.push(`Lot expires in ${daysUntilExpiration} days.`);
  }

  // Check quantity
  if (lot.quantity_on_hand < quantity) {
    errors.push(`Insufficient quantity. Available: ${lot.quantity_on_hand} ${lot.unit}, Requested: ${quantity} ${lot.unit}`);
  }

  // Check lot status
  if (lot.status === 'depleted') {
    errors.push('This lot has been depleted and is not available for dispensing.');
  } else if (lot.status === 'quarantined') {
    errors.push('This lot is quarantined and cannot be dispensed.');
  } else if (lot.status === 'expired') {
    errors.push('This lot is marked as expired and cannot be dispensed.');
  } else if (lot.status !== 'active') {
    errors.push(`This lot has status: ${lot.status}. Cannot dispense.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    lot,
  };
}

/**
 * Get lots by medication name with FEFO (First Expire First Out) ordering
 * Filters out expired and depleted lots by default
 */
export function getLotsByMedicationName(
  medicationName: string,
  options: {
    includeExpired?: boolean;
    includeDepleted?: boolean;
    includeQuarantined?: boolean;
  } = {}
): ExtendedLotInfo[] {
  const db = getDatabase();
  const {
    includeExpired = false,
    includeDepleted = false,
    includeQuarantined = false,
  } = options;

  const conditions: string[] = ['medication_name = ?'];
  const params: any[] = [medicationName];

  // Filter by status
  const activeStatuses: string[] = ['active'];
  if (includeExpired) activeStatuses.push('expired');
  if (includeDepleted) activeStatuses.push('depleted');
  if (includeQuarantined) activeStatuses.push('quarantined');

  conditions.push(`status IN (${activeStatuses.map(() => '?').join(', ')})`);
  params.push(...activeStatuses);

  const query = `
    SELECT * FROM inventory
    WHERE ${conditions.join(' AND ')}
    ORDER BY expiration_date ASC
  `;

  const lots = db.prepare(query).all(...params) as Inventory[];

  // Calculate expiration details
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return lots.map(lot => {
    const expirationDate = new Date(lot.expiration_date);
    expirationDate.setHours(0, 0, 0, 0);
    const daysUntilExpiration = Math.floor((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let expirationWarning: string | undefined;
    if (daysUntilExpiration < 0) {
      expirationWarning = `Expired on ${lot.expiration_date}`;
    } else if (daysUntilExpiration < 30) {
      expirationWarning = `Expires in ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}`;
    } else if (daysUntilExpiration < 90) {
      expirationWarning = `Expires in ${daysUntilExpiration} days`;
    }

    return {
      ...lot,
      daysUntilExpiration,
      expirationWarning,
      isExpiringSoon: daysUntilExpiration < 90 && daysUntilExpiration >= 0,
      isExpired: daysUntilExpiration < 0,
    };
  });
}

/**
 * Get available lots for dispensing (active status, not expired, has quantity)
 */
export function getAvailableLotsForDispensing(medicationName: string): ExtendedLotInfo[] {
  return getLotsByMedicationName(medicationName, {
    includeExpired: false,
    includeDepleted: false,
    includeQuarantined: false,
  }).filter(lot => lot.quantity_on_hand > 0 && lot.status === 'active');
}

/**
 * Get lots expiring within specified days
 */
export function getLotsExpiringWithin(days: number, includeExpired = false): ExtendedLotInfo[] {
  const db = getDatabase();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + days);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const statusCondition = includeExpired
    ? "status IN ('active', 'expired', 'depleted')"
    : "status = 'active'";

  const query = `
    SELECT * FROM inventory
    WHERE ${statusCondition}
    AND expiration_date <= ?
    ORDER BY expiration_date ASC
  `;

  const lots = db.prepare(query).all(cutoffStr) as Inventory[];

  // Calculate expiration details
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return lots.map(lot => {
    const expirationDate = new Date(lot.expiration_date);
    expirationDate.setHours(0, 0, 0, 0);
    const daysUntilExpiration = Math.floor((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let expirationWarning: string | undefined;
    if (daysUntilExpiration < 0) {
      expirationWarning = `Expired on ${lot.expiration_date}`;
    } else if (daysUntilExpiration < 30) {
      expirationWarning = `Expires in ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}`;
    } else if (daysUntilExpiration < 90) {
      expirationWarning = `Expires in ${daysUntilExpiration} days`;
    }

    return {
      ...lot,
      daysUntilExpiration,
      expirationWarning,
      isExpiringSoon: daysUntilExpiration < 90 && daysUntilExpiration >= 0,
      isExpired: daysUntilExpiration < 0,
    };
  });
}

/**
 * Get lot by lot number
 */
export function getLotByNumber(lotNumber: string): Inventory | null {
  const db = getDatabase();
  return db.prepare('SELECT * FROM inventory WHERE lot_number = ?').get(lotNumber) as Inventory | null;
}

/**
 * Get medication summary across all lots
 */
export function getMedicationSummary(medicationName: string): {
  medicationName: string;
  totalQuantity: number;
  totalLots: number;
  activeLots: number;
  depletedLots: number;
  expiredLots: number;
  quarantinedLots: number;
  nearestExpiration: string | null;
  averageDaysToExpiration: number | null;
} | null {
  const db = getDatabase();

  const summary = db.prepare(`
    SELECT
      medication_name,
      SUM(quantity_on_hand) as total_quantity,
      COUNT(*) as total_lots,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_lots,
      SUM(CASE WHEN status = 'depleted' THEN 1 ELSE 0 END) as depleted_lots,
      SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired_lots,
      SUM(CASE WHEN status = 'quarantined' THEN 1 ELSE 0 END) as quarantined_lots,
      MIN(expiration_date) as nearest_expiration
    FROM inventory
    WHERE medication_name = ?
    GROUP BY medication_name
  `).get(medicationName) as any;

  if (!summary) return null;

  // Calculate average days to expiration for active lots
  const avgDaysResult = db.prepare(`
    SELECT AVG(julianday(expiration_date) - julianday('now')) as avg_days
    FROM inventory
    WHERE medication_name = ? AND status = 'active'
  `).get(medicationName) as { avg_days: number | null };

  const averageDaysToExpiration = avgDaysResult.avg_days
    ? Math.floor(avgDaysResult.avg_days)
    : null;

  return {
    medicationName: summary.medication_name,
    totalQuantity: summary.total_quantity || 0,
    totalLots: summary.total_lots || 0,
    activeLots: summary.active_lots || 0,
    depletedLots: summary.depleted_lots || 0,
    expiredLots: summary.expired_lots || 0,
    quarantinedLots: summary.quarantined_lots || 0,
    nearestExpiration: summary.nearest_expiration || null,
    averageDaysToExpiration,
  };
}

/**
 * Batch validate lots for dispensing
 */
export function validateLotsForDispensing(items: Array<{ lotId: number; quantity: number }>): Array<LotValidationResult & { lotId: number }> {
  return items.map(item => ({
    lotId: item.lotId,
    ...validateLotForDispensing(item.lotId, item.quantity),
  }));
}

/**
 * Get lot details with transaction history
 */
export function getLotDetailsWithHistory(lotId: number): {
  lot: Inventory;
  transactions: InventoryTransaction[];
  totalDispensed: number;
  totalReceived: number;
  currentAdjustments: number;
} | null {
  const lot = getInventoryById(lotId);
  if (!lot) return null;

  const db = getDatabase();
  const transactions = db.prepare(`
    SELECT * FROM inventory_transactions
    WHERE inventory_id = ?
    ORDER BY timestamp DESC
  `).all(lotId) as InventoryTransaction[];

  // Calculate totals
  const totalDispensed = transactions
    .filter(t => t.transaction_type === 'dispense')
    .reduce((sum, t) => sum + Math.abs(t.quantity_change), 0);

  const totalReceived = transactions
    .filter(t => t.transaction_type === 'receive')
    .reduce((sum, t) => sum + Math.abs(t.quantity_change), 0);

  const totalAdjustments = transactions
    .filter(t => t.transaction_type === 'adjustment')
    .reduce((sum, t) => sum + t.quantity_change, 0);

  return {
    lot,
    transactions,
    totalDispensed,
    totalReceived,
    currentAdjustments: totalAdjustments,
  };
}

/**
 * Get all medication summaries from inventory
 * Returns a list of all medications with their aggregated data
 */
export function getAllMedicationSummaries(): Array<{
  medicationName: string;
  totalQuantity: number;
  totalLots: number;
  activeLots: number;
  nearestExpiration: string | null;
}> {
  const db = getDatabase();

  const summaries = db.prepare(`
    SELECT
      medication_name,
      SUM(quantity_on_hand) as total_quantity,
      COUNT(*) as total_lots,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_lots,
      MIN(expiration_date) as nearest_expiration
    FROM inventory
    WHERE status IN ('active', 'quarantined')
    GROUP BY medication_name
    ORDER BY medication_name
  `).all() as Array<{
    medication_name: string;
    total_quantity: number;
    total_lots: number;
    active_lots: number;
    nearest_expiration: string | null;
  }>;

  return summaries.map(s => ({
    medicationName: s.medication_name,
    totalQuantity: s.total_quantity || 0,
    totalLots: s.total_lots || 0,
    activeLots: s.active_lots || 0,
    nearestExpiration: s.nearest_expiration,
  }));
}
