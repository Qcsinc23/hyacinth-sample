/**
 * IPC Handlers
 * Register all IPC handlers for the main process
 */

import fs from 'fs';
import path from 'path';
import { app, dialog, ipcMain } from 'electron';
import * as queries from './database/queries';
import {
  initDatabase,
  runSchema,
  checkDatabaseHealth,
  getDatabase,
  getDbPath,
} from './database/db';
import { runMigrations, getMigrationStatus } from './database/migrations';
import { runSeedData } from './database/seed';
import {
  loadInventorySeed,
  loadMedicationCatalogSeed,
  getInventoryCount,
  isInventorySeeded,
} from './database/loader';
import { createBackup, getBackupInfo } from './backup/backup';
import { getBackupDirectory, listBackups } from './backup/scheduler';
import { restoreFromBackup, validateBackup } from './backup/restore';
import {
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
import type { IpcResponse, CreateDraftInput } from '../shared/types';

// Import authentication middleware
import {
  requireAuth,
  requireAdmin,
  requireAuthWithStaff,
  createSession,
} from './middleware/authMiddleware';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Helper to wrap handlers with error handling (no auth - for public endpoints)
 */
function handlePublic<T>(
  channel: string,
  fn: (...args: any[]) => T | Promise<T>,
) {
  ipcMain.handle(channel, async (_event, ...args): Promise<IpcResponse<T>> => {
    try {
      const result = await fn(...args);
      return { success: true, data: result };
    } catch (error) {
      console.error(`[IPC Error] ${channel}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}

/**
 * Helper to wrap handlers with authentication AND error handling
 * For PHI-related operations that require authentication
 */
function handleAuth<T>(
  channel: string,
  fn: (...args: any[]) => T | Promise<T>,
) {
  ipcMain.handle(channel, requireAuth(fn));
}

/**
 * Helper to wrap handlers that require admin privileges
 */
function handleAdmin<T>(
  channel: string,
  fn: (...args: any[]) => T | Promise<T>,
) {
  ipcMain.handle(channel, requireAdmin(fn));
}

/**
 * Helper to wrap handlers with automatic staffId injection
 */
function handleAuthWithStaff<T>(
  channel: string,
  fn: (staffId: number, ...args: any[]) => T | Promise<T>,
) {
  ipcMain.handle(channel, requireAuthWithStaff(fn));
}

/** Strip pin_hash from staff object before sending to renderer */
function stripPinHash<T extends { pin_hash?: string }>(
  staff: T,
): Omit<T, 'pin_hash'> {
  const { pin_hash: _, ...rest } = staff;
  return rest as Omit<T, 'pin_hash'>;
}

/**
 * Register all IPC handlers
 */
export function registerIpcHandlers(): void {
  console.log('[IPC] Registering handlers...');

  // ==========================================================================
  // Database Handlers (Public - needed for initial setup/login)
  // ==========================================================================

  handlePublic(DATABASE_CHANNELS.INITIALIZE, () => {
    initDatabase();
    runSchema();
    runMigrations();
    return { initialized: true };
  });

  handlePublic(DATABASE_CHANNELS.RUN_SEED, () => {
    // Only allow seeding in development
    if (process.env.NODE_ENV !== 'development') {
      return {
        seeded: false,
        error: 'Seed data can only be run in development environment',
      };
    }

    try {
      console.log('[IPC] Running seed data...');
      runSeedData();
      console.log('[IPC] Loading medication catalog...');
      loadMedicationCatalogSeed();
      console.log('[IPC] Loading inventory seed...');
      loadInventorySeed();
      console.log('[IPC] Seed data loaded successfully');
      return { seeded: true };
    } catch (error) {
      console.error('[IPC] Seed error:', error);
      throw error;
    }
  });

  handlePublic(DATABASE_CHANNELS.HEALTH_CHECK, () => {
    return checkDatabaseHealth();
  });

  handleAuth(DATABASE_CHANNELS.GET_VERSION, () => {
    return getMigrationStatus();
  });

  handleAdmin(DATABASE_CHANNELS.RUN_MIGRATIONS, () => {
    runMigrations();
    return getMigrationStatus();
  });

  handleAuth(DATABASE_CHANNELS.GET_INVENTORY_COUNT, () => {
    const count = getInventoryCount();
    const seeded = isInventorySeeded();
    return { count, seeded };
  });

  // ==========================================================================
  // Patient Handlers (PHI - Authentication Required)
  // ==========================================================================

  handleAuth(PATIENT_CHANNELS.CREATE, queries.createPatient);
  handleAuth(PATIENT_CHANNELS.GET, queries.getPatientById);
  handleAuth(PATIENT_CHANNELS.GET_BY_CHART, queries.getPatientByChartNumber);
  handleAuth(PATIENT_CHANNELS.UPDATE, queries.updatePatient);
  handleAuth(PATIENT_CHANNELS.DEACTIVATE, queries.deactivatePatient);
  handleAuth(PATIENT_CHANNELS.REACTIVATE, queries.reactivatePatient);
  handleAuth(PATIENT_CHANNELS.SEARCH, queries.searchPatients);
  handleAuth(PATIENT_CHANNELS.GET_ACTIVE, queries.getActivePatients);
  handleAuth(
    PATIENT_CHANNELS.CHECK_CHART_NUMBER,
    queries.isChartNumberAvailable,
  );
  handleAuth(
    PATIENT_CHANNELS.GET_DISPENSING_HISTORY,
    queries.getPatientDispensingHistory,
  );
  handleAuth(
    PATIENT_CHANNELS.GET_MEDICATION_SUMMARY,
    queries.getPatientMedicationSummary,
  );
  handleAuth(
    PATIENT_CHANNELS.GET_LAST_DISPENSED_DATE,
    queries.getLastDispensedDate,
  );
  handleAuth(
    PATIENT_CHANNELS.GET_MEDICATION_TIMELINE,
    queries.getPatientMedicationTimeline,
  );

  // ==========================================================================
  // Staff Handlers (Authentication Required)
  // ==========================================================================

  handleAdmin(
    STAFF_CHANNELS.CREATE,
    (input: Parameters<typeof queries.createStaff>[0]) =>
      stripPinHash(queries.createStaff(input)),
  );
  handleAuth(STAFF_CHANNELS.GET, (id: number) => {
    const staff = queries.getStaffById(id);
    if (!staff) return null;
    const { pin_hash: _, ...safe } = staff;
    return safe;
  });
  handleAuth(STAFF_CHANNELS.GET_ALL, (onlyActive?: boolean) => {
    const list = queries.getAllStaff(onlyActive ?? true);
    return list.map(({ pin_hash: _, ...safe }) => safe);
  });
  handleAdmin(
    STAFF_CHANNELS.UPDATE,
    (id: number, input: Parameters<typeof queries.updateStaff>[1]) =>
      stripPinHash(queries.updateStaff(id, input)),
  );
  // Login endpoint: verify PIN and create a session on success
  handlePublic(STAFF_CHANNELS.VERIFY_PIN, (pin: string) => {
    const result = queries.verifyStaffPin(pin);
    if (result.success && result.staff) {
      createSession(result.staff.id, result.staff.role);
      console.log(
        `[IPC] Session created for staff ${result.staff.id} (${result.staff.role})`,
      );
    }
    return result;
  });
  handleAuthWithStaff(
    STAFF_CHANNELS.CHANGE_OWN_PIN,
    (staffId: number, currentPin: string, newPin: string) => {
      queries.changeOwnPin(staffId, currentPin, newPin);
      return { success: true };
    },
  );
  handleAdmin(STAFF_CHANNELS.DEACTIVATE, queries.deactivateStaff);
  handleAdmin(STAFF_CHANNELS.REACTIVATE, queries.reactivateStaff);
  handleAuthWithStaff(STAFF_CHANNELS.IS_ADMIN, (staffId: number) =>
    queries.isAdmin(staffId),
  );
  handleAdmin(STAFF_CHANNELS.DELETE, queries.deleteStaff);

  // ==========================================================================
  // Dispensing Handlers (PHI - Authentication Required)
  // ==========================================================================

  handleAuth(DISPENSING_CHANNELS.CREATE, queries.createDispense);
  handleAuth(DISPENSING_CHANNELS.GET, queries.getDispenseById);
  handleAuth(DISPENSING_CHANNELS.GET_BY_PATIENT, queries.getDispensesByPatient);
  handleAuth(DISPENSING_CHANNELS.SEARCH, queries.searchDispenses);
  handleAuth(DISPENSING_CHANNELS.VOID, queries.voidDispense);
  handleAuth(DISPENSING_CHANNELS.CORRECT, queries.correctDispense);
  handleAuth(
    DISPENSING_CHANNELS.GET_TODAY_COUNT,
    queries.getTodayDispenseCount,
  );

  // ==========================================================================
  // Inventory Handlers (PHI - Authentication Required)
  // ==========================================================================

  handleAuth(INVENTORY_CHANNELS.RECEIVE, queries.receiveInventory);
  handleAuth(INVENTORY_CHANNELS.GET, queries.getInventoryById);
  handleAuth(
    INVENTORY_CHANNELS.GET_WITH_TRANSACTIONS,
    queries.getInventoryWithTransactions,
  );
  handleAuth(INVENTORY_CHANNELS.SEARCH, queries.searchInventory);
  handleAuth(
    INVENTORY_CHANNELS.GET_BY_MEDICATION,
    queries.getInventoryByMedication,
  );
  handleAuth(INVENTORY_CHANNELS.GET_LOW_STOCK, queries.getLowStockItems);
  handleAuth(INVENTORY_CHANNELS.GET_EXPIRING, queries.getExpiringItems);
  handleAuth(INVENTORY_CHANNELS.ADJUST, queries.adjustInventory);
  handleAuth(
    INVENTORY_CHANNELS.GET_TRANSACTIONS,
    queries.getInventoryTransactions,
  );
  handleAuth(INVENTORY_CHANNELS.QUARANTINE, queries.quarantineInventory);
  // New lot validation and FEFO functions
  handleAuth(
    INVENTORY_CHANNELS.VALIDATE_LOT,
    (lotId: number, quantity: number) =>
      queries.validateLotForDispensing(lotId, quantity),
  );
  handleAuth(
    INVENTORY_CHANNELS.GET_LOTS_BY_MEDICATION,
    (medicationName: string, options?: any) =>
      queries.getLotsByMedicationName(medicationName, options),
  );
  handleAuth(INVENTORY_CHANNELS.GET_AVAILABLE_LOTS, (medicationName: string) =>
    queries.getAvailableLotsForDispensing(medicationName),
  );
  handleAuth(
    INVENTORY_CHANNELS.GET_LOTS_EXPIRING_WITHIN,
    (days: number, includeExpired?: boolean) =>
      queries.getLotsExpiringWithin(days, includeExpired),
  );
  handleAuth(INVENTORY_CHANNELS.GET_LOT_BY_NUMBER, (lotNumber: string) =>
    queries.getLotByNumber(lotNumber),
  );
  handleAuth(
    INVENTORY_CHANNELS.GET_MEDICATION_SUMMARY,
    (medicationName: string) => queries.getMedicationSummary(medicationName),
  );
  handleAuth('inventory:getAllMedications', queries.getAllMedicationSummaries);
  handleAuth(
    INVENTORY_CHANNELS.VALIDATE_LOTS_BATCH,
    (items: Array<{ lotId: number; quantity: number }>) =>
      queries.validateLotsForDispensing(items),
  );
  handleAuth(INVENTORY_CHANNELS.GET_LOT_DETAILS, (lotId: number) =>
    queries.getLotDetailsWithHistory(lotId),
  );

  // ==========================================================================
  // Alert Handlers (Authentication Required)
  // ==========================================================================

  handleAuth(ALERT_CHANNELS.GET_ACTIVE, queries.getActiveAlerts);
  handleAuth(ALERT_CHANNELS.GET_ALL, queries.getAllAlerts);
  handleAuth(ALERT_CHANNELS.ACKNOWLEDGE, queries.acknowledgeAlert);
  handleAuth(
    ALERT_CHANNELS.ACKNOWLEDGE_FOR_INVENTORY,
    queries.acknowledgeAlertsForInventory,
  );
  handleAuth(ALERT_CHANNELS.GET_COUNTS, queries.getAlertCounts);
  handleAuth(ALERT_CHANNELS.CREATE, queries.createAlert);

  // ==========================================================================
  // Audit Handlers (PHI - Authentication Required)
  // ==========================================================================

  handleAuth(AUDIT_CHANNELS.SEARCH, queries.searchAuditLog);
  handleAuth(AUDIT_CHANNELS.GET_TRAIL, queries.getEntityAuditTrail);
  handleAuth(AUDIT_CHANNELS.VERIFY_INTEGRITY, queries.verifyAuditIntegrity);
  handleAuth(AUDIT_CHANNELS.GET_RECENT, queries.getRecentActivity);
  handleAuth(AUDIT_CHANNELS.EXPORT, queries.exportAuditLog);

  // ==========================================================================
  // Draft Handlers (Authentication Required)
  // ==========================================================================

  handleAuthWithStaff(
    DRAFT_CHANNELS.SAVE,
    (staffId: number, input: Omit<CreateDraftInput, 'staff_id'>) =>
      queries.saveDraft({ ...input, staff_id: staffId }),
  );
  handleAuth(DRAFT_CHANNELS.GET, (id: number) => queries.getDraftById(id));
  handleAuthWithStaff(DRAFT_CHANNELS.GET_BY_STAFF, (staffId) =>
    queries.getDraftsByStaff(staffId),
  );
  handleAuth(DRAFT_CHANNELS.GET_ALL, queries.getAllDrafts);
  handleAuth(DRAFT_CHANNELS.DELETE, queries.deleteDraft);
  handleAuthWithStaff(DRAFT_CHANNELS.DELETE_BY_TYPE, (staffId, type: string) =>
    queries.deleteDraftByTypeAndStaff(type as any, staffId),
  );
  handleAuth(DRAFT_CHANNELS.GET_COUNT, queries.getDraftCount);

  // ==========================================================================
  // Dashboard Handlers (Authentication Required)
  // ==========================================================================

  handleAuth(DASHBOARD_CHANNELS.GET_STATS, () => {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];

    const totalPatients = db
      .prepare('SELECT COUNT(*) as count FROM patients WHERE is_active = 1')
      .get() as { count: number };
    const todayDispenses = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM dispensing_records 
      WHERE dispensing_date = ? AND status = 'completed'
    `,
      )
      .get(today) as { count: number };
    const lowStock = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM inventory 
      WHERE status = 'active' AND reorder_threshold IS NOT NULL 
      AND quantity_on_hand <= reorder_threshold
    `,
      )
      .get() as { count: number };
    const unacknowledgedAlerts = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM inventory_alerts WHERE is_acknowledged = 0
    `,
      )
      .get() as { count: number };

    // Expiring within 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];
    const expiringSoon = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM inventory 
      WHERE status = 'active' AND expiration_date <= ?
    `,
      )
      .get(thirtyDaysStr) as { count: number };

    return {
      total_patients: totalPatients.count,
      total_dispenses_today: todayDispenses.count,
      low_stock_items: lowStock.count,
      expiring_soon: expiringSoon.count,
      unacknowledged_alerts: unacknowledgedAlerts.count,
    };
  });

  // ==========================================================================
  // Reports Handlers (PHI - Authentication Required)
  // ==========================================================================

  handleAuth(REPORTS_CHANNELS.DAILY_SUMMARY, (date: string) => {
    return reportGenerator.generateDailySummary(date);
  });

  handleAuth(REPORTS_CHANNELS.INVENTORY_USAGE, () => {
    return reportGenerator.generateInventoryReport();
  });

  handleAuth(REPORTS_CHANNELS.EXPIRATION, (days: number) => {
    return reportGenerator.generateExpirationReport(days);
  });

  handleAuth(
    REPORTS_CHANNELS.STAFF_ACTIVITY,
    ({
      staffId,
      dateRange,
    }: {
      staffId: string | null;
      dateRange: { from: string; to: string };
    }) => {
      return reportGenerator.generateStaffActivity(staffId, dateRange);
    },
  );

  handleAuth(REPORTS_CHANNELS.RECONCILIATION, (date: string) => {
    return reportGenerator.generateReconciliation(date);
  });

  // ==========================================================================
  // Settings Handlers (Authentication Required, some Admin-only)
  // ==========================================================================

  handleAuth(SETTINGS_CHANNELS.GET, (key: string) => {
    const db = getDatabase();
    const result = db
      .prepare('SELECT value FROM app_settings WHERE key = ?')
      .get(key) as { value: string } | undefined;
    return result?.value || null;
  });

  handleAdmin(
    SETTINGS_CHANNELS.SET,
    ({ key, value }: { key: string; value: string }) => {
      const db = getDatabase();
      const now = new Date().toISOString();
      db.prepare(
        `
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `,
      ).run(key, value, now);
      return { success: true };
    },
  );

  handleAuth(SETTINGS_CHANNELS.GET_ALL, () => {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT key, value FROM app_settings')
      .all() as Array<{ key: string; value: string }>;
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  });

  // ==========================================================================
  // Print Handlers (Authentication Required - registered internally)
  // ==========================================================================

  registerPrintIpcHandlers();

  // ==========================================================================
  // Instruction Service Handlers (Authentication Required)
  // ==========================================================================

  handleAuth(
    INSTRUCTION_CHANNELS.GET_CONTEXT_FROM_REASONS,
    (reasons: Array<{ reasonName: string; isCustom: boolean }>) => {
      return instructionService.getContextFromReasons(reasons);
    },
  );

  handleAuth(
    INSTRUCTION_CHANNELS.GET_TEMPLATE,
    ({ medicationId, context }: { medicationId: string; context: string }) => {
      return instructionService.getInstructionTemplate(
        medicationId,
        context as any,
      );
    },
  );

  handleAuth(
    INSTRUCTION_CHANNELS.CALCULATE_DAY_SUPPLY,
    ({ quantity, template }: { quantity: number; template: any }) => {
      return instructionService.calculateDaySupply(quantity, template);
    },
  );

  handleAuth(
    INSTRUCTION_CHANNELS.GET_WARNINGS,
    ({ medicationId, context }: { medicationId: string; context: string }) => {
      return instructionService.getWarnings(medicationId, context as any);
    },
  );

  handleAuth(
    INSTRUCTION_CHANNELS.GET_SHORT_DOSING,
    ({
      medicationId,
      context,
      quantity,
    }: {
      medicationId: string;
      context: string;
      quantity?: number;
    }) => {
      return instructionService.getShortDosing(
        medicationId,
        context as any,
        quantity,
      );
    },
  );

  handleAuth(
    INSTRUCTION_CHANNELS.GET_FULL_INSTRUCTIONS,
    ({ medicationId, context }: { medicationId: string; context: string }) => {
      return instructionService.getFullInstructions(
        medicationId,
        context as any,
      );
    },
  );

  handleAuth(
    INSTRUCTION_CHANNELS.POPULATE_LINE_ITEM,
    async ({
      medicationName,
      lotId,
      reasons,
      quantity,
    }: {
      medicationName: string;
      lotId: string | number;
      reasons: Array<{ reasonName: string; isCustom: boolean }>;
      quantity: number;
    }) => {
      return instructionService.populateLineItemInstructions(
        medicationName,
        lotId,
        reasons,
        quantity,
      );
    },
  );

  handleAuth(
    INSTRUCTION_CHANNELS.GET_AVAILABLE_CONTEXTS,
    (medicationId: string) => {
      return instructionService.getAvailableContextsForMedication(medicationId);
    },
  );

  handleAuth(INSTRUCTION_CHANNELS.GET_ALL_TEMPLATES, (medicationId: string) => {
    return instructionService.getAllTemplatesForMedication(medicationId);
  });

  // Medication catalog queries (Authentication Required)
  handleAuth(
    INSTRUCTION_CHANNELS.GET_MEDICATIONS_BY_CONTEXT,
    (context: string) => {
      return queries.getMedicationsByContext(context as any);
    },
  );

  handleAuth(
    INSTRUCTION_CHANNELS.GET_TEMPLATE_FOR_MEDICATION,
    ({
      medicationName,
      context,
    }: {
      medicationName: string;
      context: string;
    }) => {
      return queries.getInstructionTemplateForMedication(
        medicationName,
        context as any,
      );
    },
  );

  handleAuth(
    INSTRUCTION_CHANNELS.GET_TEMPLATES_FOR_MEDICATION,
    (medicationName: string) => {
      return queries.getTemplatesForMedication(medicationName);
    },
  );

  handleAuth(
    INSTRUCTION_CHANNELS.GET_CONTEXTS_FOR_MEDICATION,
    (medicationName: string) => {
      return queries.getContextsForMedication(medicationName);
    },
  );

  handleAuth(INSTRUCTION_CHANNELS.GET_ALL_MEDICATIONS_CATALOG, () => {
    return queries.getAllMedicationsFromCatalog();
  });

  // ==========================================================================
  // Backup Handlers (Admin Only - Highly Sensitive)
  // ==========================================================================

  // Create backup
  handleAdmin(
    'backup:create',
    async (options?: { compress?: boolean; verify?: boolean }) => {
      const backupDir = getBackupDirectory();
      const backupPath = await createBackup(backupDir, {
        compress: options?.compress ?? true,
        verify: options?.verify ?? true,
      });
      const info = getBackupInfo(backupPath);

      return {
        path: backupPath,
        filename: path.basename(backupPath),
        size: info.size,
        checksum: info.checksum,
        verified: info.verified,
        createdAt: info.createdAt,
      };
    },
  );

  // List available backups
  handleAuth('backup:list', () => {
    return listBackups().map((backup) => {
      const checksumPath = `${backup.path}.sha256`;
      return {
        id: backup.filename,
        filename: backup.filename,
        path: backup.path,
        size: backup.size,
        createdAt: backup.createdAt,
        checksum: fs.existsSync(checksumPath)
          ? fs.readFileSync(checksumPath, 'utf-8').trim()
          : null,
        verified: backup.verified,
        type: backup.filename.includes('auto') ? 'automatic' : 'manual',
      };
    });
  });

  // Preview backup contents
  handleAdmin('backup:preview', async (backupPath: string) => {
    const validation = await validateBackup(backupPath);
    if (!validation.valid || !validation.details) {
      throw new Error(validation.message);
    }

    const stats = fs.statSync(backupPath);
    return {
      tables: validation.details.tables,
      recordCounts: validation.details.recordCounts,
      appVersion: app.getVersion(),
      backupDate: stats.mtime.toISOString(),
    };
  });

  // Restore from backup
  handleAdmin('backup:restore', async (backupPath: string) => {
    const restoreResult = await restoreFromBackup(backupPath);
    if (!restoreResult.success) {
      throw new Error(restoreResult.message);
    }
    return restoreResult;
  });

  // Rollback restore
  handleAdmin('backup:rollback', async () => {
    const currentDbPath = getDbPath();
    const dbDir = path.dirname(currentDbPath);
    const dbName = path.basename(currentDbPath);
    const rollbackCandidates = fs
      .readdirSync(dbDir)
      .filter((file) => file.startsWith(`${dbName}.pre-restore-`))
      .sort();

    if (rollbackCandidates.length === 0) {
      throw new Error('No pre-restore backup is available for rollback');
    }

    const latestRollback = rollbackCandidates[rollbackCandidates.length - 1];
    const rollbackPath = path.join(dbDir, latestRollback);
    fs.copyFileSync(rollbackPath, currentDbPath);

    return {
      success: true,
      rollbackSource: rollbackPath,
    };
  });

  // Import backup file
  handleAdmin('backup:import', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import Backup',
      filters: [
        { name: 'Database Backups', extensions: ['db', 'gz'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { imported: false };
    }

    const sourcePath = result.filePaths[0];
    const backupDir = getBackupDirectory();
    const destinationPath = path.join(backupDir, path.basename(sourcePath));
    fs.copyFileSync(sourcePath, destinationPath);

    const checksumSource = `${sourcePath}.sha256`;
    const checksumDest = `${destinationPath}.sha256`;
    if (fs.existsSync(checksumSource)) {
      fs.copyFileSync(checksumSource, checksumDest);
    }

    const verifiedSource = `${sourcePath}.verified`;
    const verifiedDest = `${destinationPath}.verified`;
    if (fs.existsSync(verifiedSource)) {
      fs.copyFileSync(verifiedSource, verifiedDest);
    }

    return {
      imported: true,
      path: destinationPath,
      filename: path.basename(destinationPath),
    };
  });

  // Select backup location
  handleAdmin('backup:selectLocation', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Backup Folder',
      defaultPath: getBackupDirectory(),
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  // ==========================================================================
  // Settings Export/Import Handlers (Admin Only)
  // ==========================================================================

  ipcMain.handle(
    'settings:export',
    requireAdmin(async (_event, type: string) => {
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
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Export failed',
        };
      }
    }),
  );

  ipcMain.handle(
    'settings:import',
    requireAdmin(async (_event, _type: string) => {
      try {
        // In a real implementation, this would show a file dialog and import
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Import failed',
        };
      }
    }),
  );

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
    'backup:create',
    'backup:list',
    'backup:preview',
    'backup:restore',
    'backup:rollback',
    'backup:import',
    'backup:selectLocation',
    'settings:export',
    'settings:import',
  ];

  for (const channel of allChannels) {
    ipcMain.removeHandler(channel);
  }

  console.log('[IPC] All handlers unregistered');
}
