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
  closeDatabase,
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
import {
  getBackupDirectory,
  getBackupSettings,
  listBackups,
  updateBackupSchedule,
} from './backup/scheduler';
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
  BACKUP_CHANNELS,
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
  clearAuthenticationFailures,
  getCurrentSession,
  getLockoutState,
  recordFailedAuthenticationAttempt,
} from './middleware/authMiddleware';
import {
  logAuthentication,
  logBackupOperation,
  logDataExport,
  logFailedAccess,
  logSettingsChange,
} from './database/queries/audit';

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

function validatePin(pin: unknown): string {
  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
    throw new Error('A valid 4-digit PIN is required');
  }

  return pin;
}

function getCurrentActor(): { staffId: number | null; staffName: string | null } {
  const session = getCurrentSession();
  if (!session) {
    return { staffId: null, staffName: null };
  }

  return {
    staffId: session.staffId,
    staffName:
      `${session.firstName || ''} ${session.lastName || ''}`.trim() || null,
  };
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
  handleAuth(PATIENT_CHANNELS.SEARCH, (arg: string | { search?: string; page?: number; pageSize?: number }) => {
    const options = typeof arg === 'string'
      ? { search: arg.trim(), pageSize: 100 }
      : { pageSize: 100, ...arg };
    const result = queries.searchPatients(options);
    return result;
  });
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
    validatePin(pin);
    const lockout = getLockoutState();
    if (lockout.isLocked) {
      return {
        success: false,
        error: `Account locked. Try again in ${Math.ceil(lockout.secondsRemaining / 60)} minutes.`,
        code: 'ACCOUNT_LOCKED',
        details: { lockout },
      };
    }

    const result = queries.verifyStaffPin(pin);
    if (result.success && result.staff) {
      clearAuthenticationFailures();
      createSession(result.staff.id, result.staff.role, {
        firstName: result.staff.first_name,
        lastName: result.staff.last_name,
      });
      logAuthentication(
        'LOGIN_SUCCESS',
        result.staff.id,
        `${result.staff.first_name} ${result.staff.last_name}`.trim(),
      );
      console.log(
        `[IPC] Session created for staff ${result.staff.id} (${result.staff.role})`,
      );
    } else {
      const updatedLockout = recordFailedAuthenticationAttempt();
      logAuthentication('LOGIN_FAILURE', null, null, {
        failureReason: 'Invalid PIN',
        attemptCount: updatedLockout.failedAttempts,
        lockedUntil: updatedLockout.lockedUntil ?? undefined,
      });
      return {
        success: false,
        error: updatedLockout.isLocked
          ? 'Too many failed attempts. Account locked.'
          : 'Invalid PIN',
        code: updatedLockout.isLocked ? 'ACCOUNT_LOCKED' : 'INVALID_PIN',
        details: {
          lockout: updatedLockout,
          remainingAttempts: Math.max(
            0,
            updatedLockout.maxAttempts - updatedLockout.failedAttempts,
          ),
        },
      };
    }
    return result;
  });
  handlePublic(
    STAFF_CHANNELS.VERIFY_ACTION_PIN,
    (input: { pin: string; action: string }) => {
      validatePin(input?.pin);
      if (
        ![
          'void',
          'restore',
          'export',
          'settings:update',
          'security:update',
          'dispense',
        ].includes(input.action)
      ) {
        throw new Error('Unknown verification action');
      }

      const result = queries.verifyStaffPinForAction(input.pin);
      if (!result.success || !result.staff) {
        const session = getCurrentSession();
        logFailedAccess(
          input.action,
          'verification',
          0,
          session?.staffId ?? null,
          session
            ? `${session.firstName || ''} ${session.lastName || ''}`.trim() ||
                null
            : null,
          'Step-up PIN verification failed',
        );
        return { success: false, action: input.action };
      }

      return {
        success: true,
        action: input.action,
        staff: result.staff,
      };
    },
  );
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
    (staffId: number, input: Omit<CreateDraftInput, 'staff_id'> | { type?: string; data?: Record<string, unknown>; staffId?: number }) => {
      // Support both CreateDraftInput shape and preload's { type, data } format
      const draftType = (input as { draft_type?: string; type?: string }).draft_type
        ?? ((input as { type?: string }).type === 'entry_form' ? 'dispense' : (input as { type?: string }).type) ?? 'dispense';
      const formData = (input as CreateDraftInput).form_data ?? (input as { data?: Record<string, unknown> }).data ?? {};
      return queries.saveDraft({
        draft_type: draftType as CreateDraftInput['draft_type'],
        form_data: formData as Record<string, unknown>,
        staff_id: staffId,
      });
    },
  );
  handleAuth(DRAFT_CHANNELS.GET, (id: number) => queries.getDraftById(id));
  handleAuthWithStaff(DRAFT_CHANNELS.GET_BY_STAFF, (staffId) =>
    queries.getDraftsByStaff(staffId),
  );
  handleAuthWithStaff(
    DRAFT_CHANNELS.GET_BY_TYPE,
    (staffId: number, type: string) => {
      const draftType = type === 'entry_form' ? 'dispense' : (type as 'dispense' | 'inventory');
      return queries.getDraftByTypeAndStaff(draftType, staffId);
    },
  );
  handleAuth(DRAFT_CHANNELS.GET_ALL, queries.getAllDrafts);
  handleAuth(DRAFT_CHANNELS.DELETE, queries.deleteDraft);
  handleAuthWithStaff(DRAFT_CHANNELS.DELETE_BY_TYPE, (staffId, type: string) => {
    const draftType = type === 'entry_form' ? 'dispense' : (type as 'dispense' | 'inventory');
    return queries.deleteDraftByTypeAndStaff(draftType, staffId);
  });
  handleAuthWithStaff(DRAFT_CHANNELS.GET_COUNT, (staffId: number) =>
    queries.getDraftCount(staffId),
  );

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
      reason,
    }: {
      medicationName: string;
      context: string;
      reason?: string;
    }) => {
      return queries.getInstructionTemplateForMedication(
        medicationName,
        context as any,
        reason,
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

  handleAdmin(INSTRUCTION_CHANNELS.GET_ALL_INSTRUCTION_TEMPLATES, () => {
    return queries.getAllInstructionTemplates();
  });

  handleAdmin(
    INSTRUCTION_CHANNELS.UPDATE_INSTRUCTION_TEMPLATE,
    ({
      id,
      shortDosing,
      fullInstructions,
      warnings,
    }: {
      id: number;
      shortDosing?: string;
      fullInstructions?: string;
      warnings?: string;
    }) => {
      return queries.updateInstructionTemplate(id, {
        shortDosing,
        fullInstructions,
        warnings,
      });
    },
  );

  // ==========================================================================
  // Backup Handlers (Admin Only - Highly Sensitive)
  // ==========================================================================

  // Create backup
  handleAdmin(
    BACKUP_CHANNELS.CREATE,
    async (options?: { compress?: boolean; verify?: boolean }) => {
      const backupSettings = getBackupSettings();
      const backupDir = backupSettings.backupDir || getBackupDirectory();
      const backupPath = await createBackup(backupDir, {
        compress: options?.compress ?? backupSettings.compress,
        verify: options?.verify ?? backupSettings.verify,
      });
      const info = getBackupInfo(backupPath);
      const { staffId, staffName } = getCurrentActor();

      if (staffId && staffName) {
        logBackupOperation('BACKUP_CREATE', staffId, staffName, {
          backupId: path.basename(backupPath),
          backupSize: info.size,
          success: true,
        });
      }

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

  handleAdmin(BACKUP_CHANNELS.GET_SETTINGS, () => getBackupSettings());

  handleAdmin(
    BACKUP_CHANNELS.UPDATE_SETTINGS,
    (settings: {
      enabled?: boolean;
      intervalHours?: number;
      retentionDays?: number;
      backupDir?: string;
      compress?: boolean;
      verify?: boolean;
    }) => {
      const { staffId, staffName } = getCurrentActor();
      const previous = getBackupSettings();
      updateBackupSchedule(settings);

      if (staffId && staffName) {
        for (const [settingKey, newValue] of Object.entries(settings)) {
          logSettingsChange(staffId, staffName, {
            category: 'backup',
            settingKey,
            oldValue: (previous as unknown as Record<string, unknown>)[settingKey],
            newValue,
          });
        }
      }

      return getBackupSettings();
    },
  );

  handleAuth(BACKUP_CHANNELS.GET_HEALTH, async () => {
    const backupSettings = getBackupSettings();
    const backups = listBackups();
    const dbHealth = checkDatabaseHealth();
    const driveRoot =
      path.parse(backupSettings.backupDir).root || backupSettings.backupDir;
    let freeDiskBytes: number | null = null;

    try {
      // statfsSync was added in Node.js 18.17.0; check existence for compatibility
      if (typeof fs.statfsSync === 'function') {
        const stats = fs.statfsSync(driveRoot);
        freeDiskBytes = stats.bavail * stats.bsize;
      }
    } catch {
      freeDiskBytes = null;
    }

    return {
      database: {
        healthy: dbHealth.healthy,
        issues: dbHealth.issues,
        path: getDbPath(),
      },
      backup: {
        settings: backupSettings,
        availableBackups: backups.length,
        latestBackupAt: backups[0]?.createdAt ?? null,
        freeDiskBytes,
      },
      printers: {
        available: 0,
        defaultName: null,
      },
      releaseChannel:
        (process.env.HYACINTH_RELEASE_CHANNEL as
          | 'internal'
          | 'pilot'
          | 'production') || 'internal',
      appVersion: app.getVersion(),
    };
  });

  // List available backups
  handleAuth(BACKUP_CHANNELS.LIST, () => {
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
  handleAdmin(BACKUP_CHANNELS.PREVIEW, async (backupPath: string) => {
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
  handleAdmin(BACKUP_CHANNELS.RESTORE, async (backupPath: string) => {
    const { staffId, staffName } = getCurrentActor();
    try {
      const restoreResult = await restoreFromBackup(backupPath);
      if (!restoreResult.success) {
        throw new Error(restoreResult.message);
      }

      if (staffId && staffName) {
        logBackupOperation('BACKUP_RESTORE', staffId, staffName, {
          backupId: path.basename(backupPath),
          backupSize: restoreResult.backupInfo?.size,
          success: true,
        });
      }

      return restoreResult;
    } catch (error) {
      if (staffId && staffName) {
        logBackupOperation('BACKUP_RESTORE', staffId, staffName, {
          backupId: path.basename(backupPath),
          success: false,
          errorMessage:
            error instanceof Error ? error.message : 'Unknown restore failure',
        });
      }
      throw error;
    }
  });

  // Rollback restore
  handleAdmin(BACKUP_CHANNELS.ROLLBACK, async () => {
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
    closeDatabase();
    fs.copyFileSync(rollbackPath, currentDbPath);
    initDatabase();

    return {
      success: true,
      rollbackSource: rollbackPath,
    };
  });

  // Import backup file
  handleAdmin(BACKUP_CHANNELS.IMPORT, async () => {
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
    const backupDir = getBackupSettings().backupDir || getBackupDirectory();
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
  handleAdmin(BACKUP_CHANNELS.SELECT_LOCATION, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Backup Folder',
      defaultPath: getBackupSettings().backupDir || getBackupDirectory(),
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
      const { staffId, staffName } = getCurrentActor();
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
              staff: db
                .prepare(
                  'SELECT id, first_name, last_name, role, is_active, last_login_at, created_at, updated_at FROM staff_members',
                )
                .all(),
            };
            break;
          default:
            throw new Error('Unknown export type');
        }

        const defaultPath = path.join(
          app.getPath('documents'),
          `hyacinth-${type}-export-${new Date().toISOString().slice(0, 10)}.json`,
        );
        const saveResult = await dialog.showSaveDialog({
          title: 'Export Data',
          defaultPath,
          filters: [{ name: 'JSON Files', extensions: ['json'] }],
        });

        if (saveResult.canceled || !saveResult.filePath) {
          throw new Error('Export cancelled');
        }

        fs.writeFileSync(
          saveResult.filePath,
          JSON.stringify(
            {
              exportedAt: new Date().toISOString(),
              exportType: type,
              data,
            },
            null,
            2,
          ),
          'utf-8',
        );

        if (staffId && staffName) {
          const recordCount: number =
            Array.isArray(data)
              ? data.length
              : Object.values(data).reduce<number>(
                  (acc, value) =>
                    acc + (Array.isArray(value) ? value.length : 0),
                  0,
                );
          logDataExport(staffId, staffName, {
            exportType: type,
            exportFormat: 'json',
            recordCount,
            destination: saveResult.filePath,
            reason: 'Manual desktop export',
          });
        }

        return {
          path: saveResult.filePath,
          filename: path.basename(saveResult.filePath),
        };
      } catch (error) {
        throw error;
      }
    }),
  );

  ipcMain.handle(
    'settings:import',
    requireAdmin(async (_event, _type: string) => {
      throw new Error('Settings import is not implemented for this desktop build');
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
    'backup:getSettings',
    'backup:updateSettings',
    'backup:getHealth',
    'settings:export',
    'settings:import',
  ];

  for (const channel of allChannels) {
    ipcMain.removeHandler(channel);
  }

  console.log('[IPC] All handlers unregistered');
}
