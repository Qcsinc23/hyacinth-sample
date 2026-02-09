/**
 * Report Generator Service
 * Generates various reports for the Hyacinth dispensing system
 */

import { getDatabase } from '../database/db';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Report Types
// ============================================================================

export interface DailySummaryReport {
  date: string;
  totalDispenses: number;
  byMedication: Array<{
    medicationName: string;
    count: number;
    totalQuantity: number;
  }>;
  byStaff: Array<{
    staffName: string;
    count: number;
  }>;
  byReason: Array<{
    reason: string;
    count: number;
  }>;
}

export interface InventoryUsageReport {
  generatedAt: string;
  items: Array<{
    medicationName: string;
    lotNumber: string;
    initialQuantity: number;
    currentQuantity: number;
    dispensedQuantity: number;
    depletionRate: number; // percentage
    daysUntilDepleted?: number;
    unit: string;
  }>;
}

export interface ExpirationReport {
  generatedAt: string;
  daysThreshold: number;
  items: Array<{
    medicationName: string;
    lotNumber: string;
    expirationDate: string;
    daysUntilExpiration: number;
    quantityOnHand: number;
    unit: string;
    status: 'expired' | 'expiring_soon' | 'expiring_later';
  }>;
}

export interface StaffActivityReport {
  dateFrom: string;
  dateTo: string;
  staffActivities: Array<{
    staffId: number;
    staffName: string;
    totalDispenses: number;
    corrections: number;
    voids: number;
    inventoryAdjustments: number;
    lastActivity: string;
  }>;
}

export interface ReconciliationReport {
  date: string;
  openingBalance: number;
  dispensed: number;
  adjustments: number;
  closingBalance: number;
  discrepancy?: number;
  medications: Array<{
    medicationName: string;
    openingStock: number;
    received: number;
    dispensed: number;
    adjusted: number;
    closingStock: number;
  }>;
}

// ============================================================================
// Report Generators
// ============================================================================

/**
 * Generate Daily Summary Report
 */
export function generateDailySummary(date: string): DailySummaryReport {
  const db = getDatabase();

  // Get total dispenses for the date
  const totalResult = db.prepare(`
    SELECT COUNT(*) as count
    FROM dispensing_records
    WHERE dispensing_date = ? AND status = 'completed'
  `).get(date) as { count: number };

  // Get dispenses by medication
  const byMedication = db.prepare(`
    SELECT 
      dli.medication_name as medicationName,
      COUNT(*) as count,
      SUM(dli.amount_value) as totalQuantity
    FROM dispensing_line_items dli
    JOIN dispensing_records dr ON dli.record_id = dr.id
    WHERE dr.dispensing_date = ? AND dr.status = 'completed'
    GROUP BY dli.medication_name
    ORDER BY count DESC
  `).all(date) as any[];

  // Get dispenses by staff
  const byStaff = db.prepare(`
    SELECT 
      s.first_name || ' ' || s.last_name as staffName,
      COUNT(*) as count
    FROM dispensing_records dr
    JOIN staff_members s ON dr.staff_id = s.id
    WHERE dr.dispensing_date = ? AND dr.status = 'completed'
    GROUP BY dr.staff_id
    ORDER BY count DESC
  `).all(date) as any[];

  // Get dispenses by reason
  const byReason = db.prepare(`
    SELECT 
      rr.reason_name as reason,
      COUNT(*) as count
    FROM record_reasons rr
    JOIN dispensing_records dr ON rr.record_id = dr.id
    WHERE dr.dispensing_date = ? AND dr.status = 'completed'
    GROUP BY rr.reason_name
    ORDER BY count DESC
  `).all(date) as any[];

  return {
    date,
    totalDispenses: totalResult.count,
    byMedication,
    byStaff,
    byReason,
  };
}

/**
 * Generate Inventory Usage Report
 */
export function generateInventoryReport(): InventoryUsageReport {
  const db = getDatabase();

  const items = db.prepare(`
    SELECT 
      i.medication_name as medicationName,
      i.lot_number as lotNumber,
      i.quantity_received as initialQuantity,
      i.quantity_on_hand as currentQuantity,
      i.unit,
      COALESCE(SUM(CASE WHEN it.transaction_type = 'dispense' THEN ABS(it.quantity_change) ELSE 0 END), 0) as dispensedQuantity
    FROM inventory i
    LEFT JOIN inventory_transactions it ON i.id = it.inventory_id
    WHERE i.status IN ('active', 'depleted')
    GROUP BY i.id
    ORDER BY i.medication_name
  `).all() as any[];

  const processedItems = items.map(item => {
    const depletionRate = item.initialQuantity > 0
      ? (item.dispensedQuantity / item.initialQuantity) * 100
      : 0;

    // Estimate days until depleted (simplified calculation)
    const daysUntilDepleted = item.currentQuantity > 0 && depletionRate > 0
      ? Math.ceil((item.currentQuantity / item.dispensedQuantity) * 30) // Assuming 30-day window
      : undefined;

    return {
      ...item,
      depletionRate: Math.round(depletionRate * 100) / 100,
      daysUntilDepleted,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    items: processedItems,
  };
}

/**
 * Generate Expiration Report
 */
export function generateExpirationReport(days: number): ExpirationReport {
  const db = getDatabase();
  const today = new Date();
  const thresholdDate = new Date();
  thresholdDate.setDate(today.getDate() + days);

  const items = db.prepare(`
    SELECT 
      i.medication_name as medicationName,
      i.lot_number as lotNumber,
      i.expiration_date as expirationDate,
      i.quantity_on_hand as quantityOnHand,
      i.unit,
      i.status
    FROM inventory i
    WHERE i.status IN ('active', 'expired')
    ORDER BY i.expiration_date
  `).all() as any[];

  const todayStr = today.toISOString().split('T')[0];

  const processedItems = items.map(item => {
    const expDate = new Date(item.expirationDate);
    const daysUntilExpiration = Math.ceil(
      (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    let status: 'expired' | 'expiring_soon' | 'expiring_later';
    if (expDate < today) {
      status = 'expired';
    } else if (daysUntilExpiration <= 30) {
      status = 'expiring_soon';
    } else {
      status = 'expiring_later';
    }

    return {
      medicationName: item.medicationName,
      lotNumber: item.lotNumber,
      expirationDate: item.expirationDate,
      daysUntilExpiration,
      quantityOnHand: item.quantityOnHand,
      unit: item.unit,
      status,
    };
  }).filter(item => item.daysUntilExpiration <= days || item.status === 'expired');

  return {
    generatedAt: new Date().toISOString(),
    daysThreshold: days,
    items: processedItems,
  };
}

/**
 * Generate Staff Activity Report
 */
export function generateStaffActivity(
  staffId: string | null,
  dateRange: { from: string; to: string }
): StaffActivityReport {
  const db = getDatabase();

  let staffFilter = '';
  const params: (string | number)[] = [dateRange.from, dateRange.to];

  if (staffId && staffId !== 'all') {
    staffFilter = 'AND s.id = ?';
    params.push(parseInt(staffId));
  }

  const staffActivities = db.prepare(`
    SELECT 
      s.id as staffId,
      s.first_name || ' ' || s.last_name as staffName,
      COUNT(DISTINCT dr.id) as totalDispenses,
      COUNT(DISTINCT CASE WHEN dr.status = 'corrected' THEN dr.id END) as corrections,
      COUNT(DISTINCT CASE WHEN dr.status = 'voided' THEN dr.id END) as voids,
      COUNT(DISTINCT it.id) as inventoryAdjustments,
      MAX(dr.dispensing_date) as lastActivity
    FROM staff_members s
    LEFT JOIN dispensing_records dr ON s.id = dr.staff_id AND dr.dispensing_date BETWEEN ? AND ?
    LEFT JOIN inventory_transactions it ON s.id = it.performed_by AND date(it.timestamp) BETWEEN ? AND ?
    WHERE s.is_active = 1 ${staffFilter}
    GROUP BY s.id
    ORDER BY totalDispenses DESC
  `).all(...params, ...params) as any[];

  return {
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    staffActivities,
  };
}

/**
 * Generate End-of-Day Reconciliation Report
 */
export function generateReconciliation(date: string): ReconciliationReport {
  const db = getDatabase();

  // Get all inventory items with their state
  const medications = db.prepare(`
    SELECT 
      i.medication_name as medicationName,
      i.quantity_received as openingStock,
      i.quantity_on_hand as closingStock
    FROM inventory i
    WHERE date(i.created_at) <= ?
    ORDER BY i.medication_name
  `).all(date) as any[];

  // Get dispensed amounts for the date
  const dispensed = db.prepare(`
    SELECT 
      dli.medication_name as medicationName,
      SUM(dli.amount_value) as totalDispensed
    FROM dispensing_line_items dli
    JOIN dispensing_records dr ON dli.record_id = dr.id
    WHERE dr.dispensing_date = ? AND dr.status = 'completed'
    GROUP BY dli.medication_name
  `).all(date) as any[];

  // Get adjustments for the date
  const adjustments = db.prepare(`
    SELECT 
      i.medication_name as medicationName,
      SUM(it.quantity_change) as totalAdjusted
    FROM inventory_transactions it
    JOIN inventory i ON it.inventory_id = i.id
    WHERE date(it.timestamp) = ? AND it.transaction_type = 'adjustment'
    GROUP BY i.medication_name
  `).all(date) as any[];

  // Build medication reconciliation data
  const medicationData = medications.map(med => {
    const dispensedForMed = dispensed.find(d => d.medicationName === med.medicationName);
    const adjustedForMed = adjustments.find(a => a.medicationName === med.medicationName);

    return {
      medicationName: med.medicationName,
      openingStock: med.openingStock,
      received: 0, // Simplified - in real scenario would calculate from receipts
      dispensed: Math.abs(dispensedForMed?.totalDispensed || 0),
      adjusted: adjustedForMed?.totalAdjusted || 0,
      closingStock: med.closingStock,
    };
  });

  const totalOpening = medicationData.reduce((sum, m) => sum + m.openingStock, 0);
  const totalDispensed = medicationData.reduce((sum, m) => sum + m.dispensed, 0);
  const totalAdjusted = medicationData.reduce((sum, m) => sum + m.adjusted, 0);
  const totalClosing = medicationData.reduce((sum, m) => sum + m.closingStock, 0);
  const expectedClosing = totalOpening - totalDispensed + totalAdjusted;

  return {
    date,
    openingBalance: totalOpening,
    dispensed: totalDispensed,
    adjustments: totalAdjusted,
    closingBalance: totalClosing,
    discrepancy: totalClosing - expectedClosing,
    medications: medicationData,
  };
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export report to CSV format
 */
export function exportToCSV(data: any[], columns: string[]): string {
  const header = columns.join(',');
  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return String(value);
    }).join(',')
  );
  return [header, ...rows].join('\n');
}

/**
 * Export report to JSON format
 */
export function exportToJSON(data: any): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Generate simple HTML for PDF printing
 */
export function generatePrintHTML(title: string, data: any): string {
  const timestamp = new Date().toLocaleString();

  return `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #1a365d; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
    h2 { color: #2d3748; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #f7fafc; text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #f7fafc; }
    .summary { background: #ebf8ff; padding: 15px; border-radius: 8px; margin-top: 20px; }
    .footer { margin-top: 40px; font-size: 12px; color: #718096; text-align: center; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
    .badge-expired { background: #fed7d7; color: #c53030; }
    .badge-expiring { background: #fefcbf; color: #744210; }
    .badge-active { background: #c6f6d5; color: #22543d; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Generated: ${timestamp}</p>
  <pre>${JSON.stringify(data, null, 2)}</pre>
  <div class="footer">
    Hyacinth Medication Dispensing System
  </div>
</body>
</html>
  `;
}
