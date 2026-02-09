/**
 * IPC Handlers
 * Register all IPC handlers for the main process
 */

import { ipcMain } from 'electron';
import * as queries from './database/queries';
import { initDatabase, runSchema, checkDatabaseHealth, getDatabase } from './database/db';
import { runMigrations, getMigrationStatus } from './database/migrations';
import { runSeedData } from './database/seed';
import {
  IPC_CHANNELS,
  PATIENT_CHANNELS,
  STAFF_CHANNELS,
  DISPENSING_CHANNELS,
  INVENTORY_CHANNELS,
  ALERT_CHANNELS,
  AUDIT_CHANNELS,
  DRAFT_CHANNELS,
  DASHBOARD_CHANNELS,
  SETTINGS_CHANNELS,
  DATABASE_CHANNELS,
  REPORTS_CHANNELS,
  PRINT_CHANNELS,
  INSTRUCTION_CHANNELS,
} from '../shared/ipc-channels';
import * as reportGenerator from './reports/generator';
import { registerPrintIpcHandlers } from './services/printService';
import instructionService from './services/instructionService';
import type { IpcResponse } from '../shared/types';

// Helper to wrap handlers with error handling
function handle<T>(channel: string, fn: (...args: any[]) => T | Promise<T>) {
  ipcMain.handle(channel, async (_event, ...args): Promise<IpcResponse<T>> => {
    try {
      const result = await fn(...args);
      return { success: true, data: result };
    } catch (error) {
      console.error(`[IPC Error] ${channel}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });
}

/**
 * Register all IPC handlers
 */
export function registerIpcHandlers(): void {
  console.log('[IPC] Registering handlers...');
  
  // ==========================================================================
  // Database Handlers
  // ==========================================================================
  
  handle(DATABASE_CHANNELS.INITIALIZE, () => {
    const db = initDatabase();
    runSchema();
    runMigrations();
    return { initialized: true };
  });
  
  handle(DATABASE_CHANNELS.RUN_SEED, () => {
    runSeedData();
    return { seeded: true };
  });
  
  handle(DATABASE_CHANNELS.HEALTH_CHECK, () => {
    return checkDatabaseHealth();
  });
  
  handle(DATABASE_CHANNELS.GET_VERSION, () => {
    return getMigrationStatus();
  });
  
  handle(DATABASE_CHANNELS.RUN_MIGRATIONS, () => {
    runMigrations();
    return getMigrationStatus();
  });
  
  // ==========================================================================
  // Patient Handlers
  // ==========================================================================

  handle(PATIENT_CHANNELS.CREATE, queries.createPatient);
  handle(PATIENT_CHANNELS.GET, queries.getPatientById);
  handle(PATIENT_CHANNELS.GET_BY_CHART, queries.getPatientByChartNumber);
  handle(PATIENT_CHANNELS.UPDATE, queries.updatePatient);
  handle(PATIENT_CHANNELS.DEACTIVATE, queries.deactivatePatient);
  handle(PATIENT_CHANNELS.REACTIVATE, queries.reactivatePatient);
  handle(PATIENT_CHANNELS.SEARCH, queries.searchPatients);
  handle(PATIENT_CHANNELS.GET_ACTIVE, queries.getActivePatients);
  handle(PATIENT_CHANNELS.CHECK_CHART_NUMBER, queries.isChartNumberAvailable);
  handle(PATIENT_CHANNELS.GET_DISPENSING_HISTORY, queries.getPatientDispensingHistory);
  handle(PATIENT_CHANNELS.GET_MEDICATION_SUMMARY, queries.getPatientMedicationSummary);
  handle(PATIENT_CHANNELS.GET_LAST_DISPENSED_DATE, queries.getLastDispensedDate);
  handle(PATIENT_CHANNELS.GET_MEDICATION_TIMELINE, queries.getPatientMedicationTimeline);
  
  // ==========================================================================
  // Staff Handlers
  // ==========================================================================
  
  handle(STAFF_CHANNELS.CREATE, queries.createStaff);
  handle(STAFF_CHANNELS.GET, queries.getStaffById);
  handle(STAFF_CHANNELS.GET_ALL, queries.getAllStaff);
  handle(STAFF_CHANNELS.UPDATE, queries.updateStaff);
  handle(STAFF_CHANNELS.VERIFY_PIN, queries.verifyStaffPin);
  handle(STAFF_CHANNELS.DEACTIVATE, queries.deactivateStaff);
  handle(STAFF_CHANNELS.REACTIVATE, queries.reactivateStaff);
  handle(STAFF_CHANNELS.IS_ADMIN, queries.isAdmin);
  handle(STAFF_CHANNELS.DELETE, queries.deleteStaff);
  
  // ==========================================================================
  // Dispensing Handlers
  // ==========================================================================
  
  handle(DISPENSING_CHANNELS.CREATE, queries.createDispense);
  handle(DISPENSING_CHANNELS.GET, queries.getDispenseById);
  handle(DISPENSING_CHANNELS.GET_BY_PATIENT, queries.getDispensesByPatient);
  handle(DISPENSING_CHANNELS.SEARCH, queries.searchDispenses);
  handle(DISPENSING_CHANNELS.VOID, queries.voidDispense);
  handle(DISPENSING_CHANNELS.CORRECT, queries.correctDispense);
  handle(DISPENSING_CHANNELS.GET_TODAY_COUNT, queries.getTodayDispenseCount);
  
  // ==========================================================================
  // Inventory Handlers
  // ==========================================================================

  handle(INVENTORY_CHANNELS.RECEIVE, queries.receiveInventory);
  handle(INVENTORY_CHANNELS.GET, queries.getInventoryById);
  handle(INVENTORY_CHANNELS.GET_WITH_TRANSACTIONS, queries.getInventoryWithTransactions);
  handle(INVENTORY_CHANNELS.SEARCH, queries.searchInventory);
  handle(INVENTORY_CHANNELS.GET_BY_MEDICATION, queries.getInventoryByMedication);
  handle(INVENTORY_CHANNELS.GET_LOW_STOCK, queries.getLowStockItems);
  handle(INVENTORY_CHANNELS.GET_EXPIRING, queries.getExpiringItems);
  handle(INVENTORY_CHANNELS.ADJUST, queries.adjustInventory);
  handle(INVENTORY_CHANNELS.GET_TRANSACTIONS, queries.getInventoryTransactions);
  handle(INVENTORY_CHANNELS.QUARANTINE, queries.quarantineInventory);
  // New lot validation and FEFO functions
  handle(INVENTORY_CHANNELS.VALIDATE_LOT, (lotId: number, quantity: number) =>
    queries.validateLotForDispensing(lotId, quantity)
  );
  handle(INVENTORY_CHANNELS.GET_LOTS_BY_MEDICATION, (medicationName: string, options?: any) =>
    queries.getLotsByMedicationName(medicationName, options)
  );
  handle(INVENTORY_CHANNELS.GET_AVAILABLE_LOTS, (medicationName: string) =>
    queries.getAvailableLotsForDispensing(medicationName)
  );
  handle(INVENTORY_CHANNELS.GET_LOTS_EXPIRING_WITHIN, (days: number, includeExpired?: boolean) =>
    queries.getLotsExpiringWithin(days, includeExpired)
  );
  handle(INVENTORY_CHANNELS.GET_LOT_BY_NUMBER, (lotNumber: string) =>
    queries.getLotByNumber(lotNumber)
  );
  handle(INVENTORY_CHANNELS.GET_MEDICATION_SUMMARY, (medicationName: string) =>
    queries.getMedicationSummary(medicationName)
  );
  handle('inventory:getAllMedications', queries.getAllMedicationSummaries);
  handle(INVENTORY_CHANNELS.VALIDATE_LOTS_BATCH, (items: Array<{ lotId: number; quantity: number }>) =>
    queries.validateLotsForDispensing(items)
  );
  handle(INVENTORY_CHANNELS.GET_LOT_DETAILS, (lotId: number) =>
    queries.getLotDetailsWithHistory(lotId)
  );
  
  // ==========================================================================
  // Alert Handlers
  // ==========================================================================
  
  handle(ALERT_CHANNELS.GET_ACTIVE, queries.getActiveAlerts);
  handle(ALERT_CHANNELS.GET_ALL, queries.getAllAlerts);
  handle(ALERT_CHANNELS.ACKNOWLEDGE, queries.acknowledgeAlert);
  handle(ALERT_CHANNELS.ACKNOWLEDGE_FOR_INVENTORY, queries.acknowledgeAlertsForInventory);
  handle(ALERT_CHANNELS.GET_COUNTS, queries.getAlertCounts);
  handle(ALERT_CHANNELS.CREATE, queries.createAlert);
  
  // ==========================================================================
  // Audit Handlers
  // ==========================================================================
  
  handle(AUDIT_CHANNELS.SEARCH, queries.searchAuditLog);
  handle(AUDIT_CHANNELS.GET_TRAIL, queries.getEntityAuditTrail);
  handle(AUDIT_CHANNELS.VERIFY_INTEGRITY, queries.verifyAuditIntegrity);
  handle(AUDIT_CHANNELS.GET_RECENT, queries.getRecentActivity);
  handle(AUDIT_CHANNELS.EXPORT, queries.exportAuditLog);
  
  // ==========================================================================
  // Draft Handlers
  // ==========================================================================
  
  handle(DRAFT_CHANNELS.SAVE, queries.saveDraft);
  handle(DRAFT_CHANNELS.GET, (id: number) => queries.getDraftById(id));
  handle(DRAFT_CHANNELS.GET_BY_STAFF, queries.getDraftsByStaff);
  handle(DRAFT_CHANNELS.GET_ALL, queries.getAllDrafts);
  handle(DRAFT_CHANNELS.DELETE, queries.deleteDraft);
  handle(DRAFT_CHANNELS.DELETE_BY_TYPE, (type: string, staffId: number) => 
    queries.deleteDraftByTypeAndStaff(type as any, staffId)
  );
  handle(DRAFT_CHANNELS.GET_COUNT, queries.getDraftCount);
  
  // ==========================================================================
  // Dashboard Handlers
  // ==========================================================================
  
  handle(DASHBOARD_CHANNELS.GET_STATS, () => {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    
    const totalPatients = db.prepare('SELECT COUNT(*) as count FROM patients WHERE is_active = 1').get() as { count: number };
    const todayDispenses = db.prepare(`
      SELECT COUNT(*) as count FROM dispensing_records 
      WHERE dispensing_date = ? AND status = 'completed'
    `).get(today) as { count: number };
    const lowStock = db.prepare(`
      SELECT COUNT(*) as count FROM inventory 
      WHERE status = 'active' AND reorder_threshold IS NOT NULL 
      AND quantity_on_hand <= reorder_threshold
    `).get() as { count: number };
    const unacknowledgedAlerts = db.prepare(`
      SELECT COUNT(*) as count FROM inventory_alerts WHERE is_acknowledged = 0
    `).get() as { count: number };
    
    // Expiring within 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];
    const expiringSoon = db.prepare(`
      SELECT COUNT(*) as count FROM inventory 
      WHERE status = 'active' AND expiration_date <= ?
    `).get(thirtyDaysStr) as { count: number };
    
    return {
      total_patients: totalPatients.count,
      total_dispenses_today: todayDispenses.count,
      low_stock_items: lowStock.count,
      expiring_soon: expiringSoon.count,
      unacknowledged_alerts: unacknowledgedAlerts.count,
    };
  });
  
  // ==========================================================================
  // Reports Handlers
  // ==========================================================================
  
  handle(REPORTS_CHANNELS.DAILY_SUMMARY, (date: string) => {
    return reportGenerator.generateDailySummary(date);
  });
  
  handle(REPORTS_CHANNELS.INVENTORY_USAGE, () => {
    return reportGenerator.generateInventoryReport();
  });
  
  handle(REPORTS_CHANNELS.EXPIRATION, (days: number) => {
    return reportGenerator.generateExpirationReport(days);
  });
  
  handle(REPORTS_CHANNELS.STAFF_ACTIVITY, ({ staffId, dateRange }: { staffId: string | null; dateRange: { from: string; to: string } }) => {
    return reportGenerator.generateStaffActivity(staffId, dateRange);
  });
  
  handle(REPORTS_CHANNELS.RECONCILIATION, (date: string) => {
    return reportGenerator.generateReconciliation(date);
  });
  
  // ==========================================================================
  // Settings Handlers
  // ==========================================================================
  
  handle(SETTINGS_CHANNELS.GET, (key: string) => {
    const db = getDatabase();
    const result = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined;
    return result?.value || null;
  });
  
  handle(SETTINGS_CHANNELS.SET, ({ key, value }: { key: string; value: string }) => {
    const db = getDatabase();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, value, now);
    return { success: true };
  });
  
  handle(SETTINGS_CHANNELS.GET_ALL, () => {
    const db = getDatabase();
    const rows = db.prepare('SELECT key, value FROM app_settings').all() as Array<{ key: string; value: string }>;
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  });

  // ==========================================================================
  // Print Handlers
  // ==========================================================================

  registerPrintIpcHandlers();

  // ==========================================================================
  // Instruction Service Handlers
  // ==========================================================================

  handle(INSTRUCTION_CHANNELS.GET_CONTEXT_FROM_REASONS, (reasons: Array<{ reasonName: string; isCustom: boolean }>) => {
    return instructionService.getContextFromReasons(reasons);
  });

  handle(INSTRUCTION_CHANNELS.GET_TEMPLATE, ({ medicationId, context }: { medicationId: string; context: string }) => {
    return instructionService.getInstructionTemplate(medicationId, context as any);
  });

  handle(INSTRUCTION_CHANNELS.CALCULATE_DAY_SUPPLY, ({ quantity, template }: { quantity: number; template: any }) => {
    return instructionService.calculateDaySupply(quantity, template);
  });

  handle(INSTRUCTION_CHANNELS.GET_WARNINGS, ({ medicationId, context }: { medicationId: string; context: string }) => {
    return instructionService.getWarnings(medicationId, context as any);
  });

  handle(INSTRUCTION_CHANNELS.GET_SHORT_DOSING, ({ medicationId, context, quantity }: { medicationId: string; context: string; quantity?: number }) => {
    return instructionService.getShortDosing(medicationId, context as any, quantity);
  });

  handle(INSTRUCTION_CHANNELS.GET_FULL_INSTRUCTIONS, ({ medicationId, context }: { medicationId: string; context: string }) => {
    return instructionService.getFullInstructions(medicationId, context as any);
  });

  handle(INSTRUCTION_CHANNELS.POPULATE_LINE_ITEM, async ({ medicationName, lotId, reasons, quantity }: {
    medicationName: string;
    lotId: string | number;
    reasons: Array<{ reasonName: string; isCustom: boolean }>;
    quantity: number;
  }) => {
    return instructionService.populateLineItemInstructions(medicationName, lotId, reasons, quantity);
  });

  handle(INSTRUCTION_CHANNELS.GET_AVAILABLE_CONTEXTS, (medicationId: string) => {
    return instructionService.getAvailableContextsForMedication(medicationId);
  });

  handle(INSTRUCTION_CHANNELS.GET_ALL_TEMPLATES, (medicationId: string) => {
    return instructionService.getAllTemplatesForMedication(medicationId);
  });

  // ==========================================================================
  // Backup Handlers
  // ==========================================================================

  // Create backup
  ipcMain.handle('backup:create', async (_event, options?: { compress?: boolean; verify?: boolean }) => {
    try {
      const { createBackup } = await import('./backup/backup');
      const backupPath = await createBackup('./backups', {
        compress: options?.compress ?? true,
        verify: options?.verify ?? true,
      });
      return { success: true, data: { path: backupPath, filename: backupPath.split('/').pop() } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Backup failed' };
    }
  });

  // List available backups
  ipcMain.handle('backup:list', async () => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const backupDir = './backups';
      
      if (!fs.existsSync(backupDir)) {
        return { success: true, data: [] };
      }

      const files = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.db') || f.endsWith('.db.gz'))
        .map(f => {
          const stats = fs.statSync(path.join(backupDir, f));
          const checksumPath = path.join(backupDir, `${f}.sha256`);
          const verifiedPath = path.join(backupDir, `${f}.verified`);
          
          return {
            id: f,
            filename: f,
            path: path.join(backupDir, f),
            size: stats.size,
            createdAt: stats.mtime.toISOString(),
            checksum: fs.existsSync(checksumPath) ? fs.readFileSync(checksumPath, 'utf-8').trim() : null,
            verified: fs.existsSync(verifiedPath),
            type: f.includes('auto') ? 'automatic' : 'manual',
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return { success: true, data: files };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to list backups' };
    }
  });

  // Preview backup contents
  ipcMain.handle('backup:preview', async (_event, backupPath: string) => {
    try {
      // In a real implementation, this would read the backup and show table counts
      // For now, return mock preview data
      return {
        success: true,
        data: {
          tables: ['patients', 'dispensing_records', 'inventory', 'staff_members', 'alerts'],
          recordCounts: {
            patients: 150,
            dispensing_records: 1250,
            inventory: 75,
            staff_members: 8,
            alerts: 23,
          },
          appVersion: '1.0.0',
          backupDate: new Date().toISOString(),
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Preview failed' };
    }
  });

  // Restore from backup
  ipcMain.handle('backup:restore', async (_event, backupPath: string) => {
    try {
      const { restoreBackup } = await import('./backup/restore');
      await restoreBackup(backupPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Restore failed' };
    }
  });

  // Rollback restore
  ipcMain.handle('backup:rollback', async () => {
    try {
      // In a real implementation, this would restore from a pre-restore backup
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Rollback failed' };
    }
  });

  // Import backup file
  ipcMain.handle('backup:import', async () => {
    try {
      // In a real implementation, this would show a file dialog
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Import failed' };
    }
  });

  // Select backup location
  ipcMain.handle('backup:selectLocation', async () => {
    try {
      // In a real implementation, this would show a directory dialog
      return { success: true, data: './backups' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Selection failed' };
    }
  });

  // ==========================================================================
  // Settings Export/Import Handlers
  // ==========================================================================

  ipcMain.handle('settings:export', async (_event, type: string) => {
    try {
      const db = getDatabase();
      let data: any;

      switch (type) {
        case 'patients':
          data = db.prepare('SELECT * FROM patients').all();
          break;
        case 'dispensing':
          data = db.prepare('SELECT * FROM dispensing_records').all();
          break;
        case 'inventory':
          data = db.prepare('SELECT * FROM inventory').all();
          break;
        case 'full':
          data = {
            patients: db.prepare('SELECT * FROM patients').all(),
            dispensing: db.prepare('SELECT * FROM dispensing_records').all(),
            inventory: db.prepare('SELECT * FROM inventory').all(),
            staff: db.prepare('SELECT * FROM staff_members').all(),
          };
          break;
        default:
          throw new Error('Unknown export type');
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Export failed' };
    }
  });

  ipcMain.handle('settings:import', async (_event, type: string) => {
    try {
      // In a real implementation, this would show a file dialog and import
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Import failed' };
    }
  });

  console.log('[IPC] All handlers registered');
}

/**
 * Remove all IPC handlers (for cleanup/testing)
 */
export function unregisterIpcHandlers(): void {
  const allChannels = [
    ...Object.values(PATIENT_CHANNELS),
    ...Object.values(STAFF_CHANNELS),
    ...Object.values(DISPENSING_CHANNELS),
    ...Object.values(INVENTORY_CHANNELS),
    ...Object.values(ALERT_CHANNELS),
    ...Object.values(AUDIT_CHANNELS),
    ...Object.values(DRAFT_CHANNELS),
    ...Object.values(DASHBOARD_CHANNELS),
    ...Object.values(SETTINGS_CHANNELS),
    ...Object.values(DATABASE_CHANNELS),
    ...Object.values(REPORTS_CHANNELS),
    ...Object.values(PRINT_CHANNELS),
    ...Object.values(INSTRUCTION_CHANNELS),
  ];

  for (const channel of allChannels) {
    ipcMain.removeHandler(channel);
  }

  console.log('[IPC] All handlers unregistered');
}
