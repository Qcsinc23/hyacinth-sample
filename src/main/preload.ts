import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import {
  PATIENT_CHANNELS,
  STAFF_CHANNELS,
  DISPENSING_CHANNELS,
  INVENTORY_CHANNELS,
  ALERT_CHANNELS,
  DRAFT_CHANNELS,
  DASHBOARD_CHANNELS,
  SETTINGS_CHANNELS,
  REPORTS_CHANNELS,
  PRINT_CHANNELS,
  INSTRUCTION_CHANNELS,
  DATABASE_CHANNELS,
} from '../shared/ipc-channels';

// Helper to invoke IPC channels
const invoke = async <T = any>(channel: string, ...args: any[]): Promise<T> => {
  const response = await ipcRenderer.invoke(channel, ...args);
  if (!response.success) {
    throw new Error(response.error || 'Unknown error');
  }
  return response.data;
};

type BackupCreateResult = {
  path: string;
  filename: string;
  size: number;
  checksum: string | null;
  verified: boolean;
  createdAt: string | null;
};

type BackupListItem = {
  id: string;
  filename: string;
  path: string;
  size: number;
  createdAt: string;
  checksum: string | null;
  verified: boolean;
  type: 'automatic' | 'manual';
};

type BackupPreviewResult = {
  tables: string[];
  recordCounts: Record<string, number>;
  appVersion: string;
  backupDate: string;
};

type BackupRestoreResult = {
  success: boolean;
  message: string;
  backupInfo?: {
    path: string;
    size: number;
    createdAt: string;
  };
};

type BackupRollbackResult = {
  success: boolean;
  rollbackSource: string;
};

type BackupImportResult = {
  imported: boolean;
  path?: string;
  filename?: string;
};

// API exposed to the renderer process
const electronAPI = {
  // Staff API
  staff: {
    verify: (pin: string) => invoke(STAFF_CHANNELS.VERIFY_PIN, pin),
    get: (id: number) => invoke(STAFF_CHANNELS.GET, id),
    getAll: (onlyActive?: boolean) => invoke(STAFF_CHANNELS.GET_ALL, onlyActive),
    add: (data: any) => invoke(STAFF_CHANNELS.CREATE, data),
    update: (id: number, data: any) => invoke(STAFF_CHANNELS.UPDATE, id, data),
    changeOwnPin: (currentPin: string, newPin: string) =>
      invoke(STAFF_CHANNELS.CHANGE_OWN_PIN, currentPin, newPin),
    isAdmin: () => invoke(STAFF_CHANNELS.IS_ADMIN),
    deactivate: (id: number) => invoke(STAFF_CHANNELS.DEACTIVATE, id),
    reactivate: (id: number) => invoke(STAFF_CHANNELS.REACTIVATE, id),
  },

  // Patient API
  patient: {
    search: (query: string) => invoke(PATIENT_CHANNELS.SEARCH, query),
    getByChart: (chartNumber: string) => invoke(PATIENT_CHANNELS.GET_BY_CHART, chartNumber),
    getById: (id: number) => invoke(PATIENT_CHANNELS.GET, id),
    create: (data: any) => invoke(PATIENT_CHANNELS.CREATE, data),
    getDispensingHistory: (id: number) => invoke(PATIENT_CHANNELS.GET_DISPENSING_HISTORY, id),
    getMedicationSummary: (id: number) => invoke(PATIENT_CHANNELS.GET_MEDICATION_SUMMARY, id),
    getLastDispensedDate: (id: number) => invoke(PATIENT_CHANNELS.GET_LAST_DISPENSED_DATE, id),
    getMedicationTimeline: (id: number) => invoke(PATIENT_CHANNELS.GET_MEDICATION_TIMELINE, id),
  },

  // Medication API (using inventory channels for medication list)
  medication: {
    getAll: () => invoke('inventory:getAllMedications'),
    getById: (id: number) => invoke(INVENTORY_CHANNELS.GET, id),
  },

  // Inventory API
  inventory: {
    getByMedication: (medicationName: string) => invoke(INVENTORY_CHANNELS.GET_BY_MEDICATION, medicationName),
    getLotDetails: (inventoryId: number) => invoke(INVENTORY_CHANNELS.GET, inventoryId),
    receive: (data: any) => invoke(INVENTORY_CHANNELS.RECEIVE, data),
    adjust: (data: any) => invoke(INVENTORY_CHANNELS.ADJUST, data),
    getAll: () => invoke('inventory:getAllMedications'),
    getAllLots: (options?: { page?: number; pageSize?: number; search?: string }) =>
      invoke(INVENTORY_CHANNELS.SEARCH, options || {}),
    search: (options?: { page?: number; pageSize?: number; search?: string }) =>
      invoke(INVENTORY_CHANNELS.SEARCH, options || {}),
    getDashboard: () => invoke(DASHBOARD_CHANNELS.GET_STATS),
    getLotsByMedication: (medicationName: string) => invoke(INVENTORY_CHANNELS.GET_LOTS_BY_MEDICATION, medicationName),
    getLotByNumber: (lotNumber: string) => invoke(INVENTORY_CHANNELS.GET_LOT_BY_NUMBER, lotNumber),
    validateLot: (lotId: number, quantity: number) => invoke(INVENTORY_CHANNELS.VALIDATE_LOT, lotId, quantity),
    getAvailableLots: (medicationName: string) => invoke(INVENTORY_CHANNELS.GET_AVAILABLE_LOTS, medicationName),
  },

  // Dispensing API
  dispensing: {
    create: (data: any) => invoke(DISPENSING_CHANNELS.CREATE, data),
    getAll: (filters: any) => invoke(DISPENSING_CHANNELS.SEARCH, filters),
    getById: (id: number) => invoke(DISPENSING_CHANNELS.GET, id),
    void: (data: { record_id: number; voided_by: number; reason: string }) => 
      invoke(DISPENSING_CHANNELS.VOID, {
        record_id: data.record_id,
        staff_id: data.voided_by,
        reason: data.reason,
      }),
  },

  // Alerts API
  alerts: {
    get: (resolved?: boolean) => resolved 
      ? invoke(ALERT_CHANNELS.GET_ALL)
      : invoke(ALERT_CHANNELS.GET_ACTIVE),
    resolve: (alertId: number, resolvedBy: number) => invoke(ALERT_CHANNELS.ACKNOWLEDGE, alertId, resolvedBy),
    check: () => invoke(ALERT_CHANNELS.GET_COUNTS),
  },

  // Reports API
  reports: {
    dailySummary: (date: string) => invoke(REPORTS_CHANNELS.DAILY_SUMMARY, date),
    inventoryUsage: () => invoke(REPORTS_CHANNELS.INVENTORY_USAGE),
    expiration: (days: number) => invoke(REPORTS_CHANNELS.EXPIRATION, days),
    staffActivity: (staffId: string | null, dateRange: { from: string; to: string }) => 
      invoke(REPORTS_CHANNELS.STAFF_ACTIVITY, { staffId, dateRange }),
    reconciliation: (date: string) => invoke(REPORTS_CHANNELS.RECONCILIATION, date),
    patientHistory: (patientId: number) => invoke(DISPENSING_CHANNELS.GET_BY_PATIENT, patientId),
  },

  // Drafts API
  drafts: {
    save: (draftType: string, data: any, userId?: number) => invoke(DRAFT_CHANNELS.SAVE, { type: draftType, data, staffId: userId }),
    get: (_draftType: string, userId?: number) => invoke(DRAFT_CHANNELS.GET_BY_STAFF, userId),
    delete: (draftType: string, userId?: number) => invoke(DRAFT_CHANNELS.DELETE_BY_TYPE, draftType, userId),
  },

  // Print API
  print: {
    label: (data: any, options?: any) => invoke(PRINT_CHANNELS.LABEL, data, options),
    receipt: (data: any, options?: any) => invoke(PRINT_CHANNELS.RECEIPT, data, options),
    labelSheet: (labels: any[], options?: any) => invoke(PRINT_CHANNELS.LABEL_SHEET, labels, options),
    qrCode: (data: any, options?: any) => invoke(PRINT_CHANNELS.QR_CODE, data, options),
    preview: (filePath: string) => invoke(PRINT_CHANNELS.PREVIEW, filePath),
    getQueue: () => invoke(PRINT_CHANNELS.GET_QUEUE),
    getHistory: (limit?: number) => invoke(PRINT_CHANNELS.GET_HISTORY, limit),
    cancelJob: (jobId: string) => invoke(PRINT_CHANNELS.CANCEL_JOB, jobId),
    clearHistory: () => invoke(PRINT_CHANNELS.CLEAR_HISTORY),
    exportHistory: (filePath: string) => invoke(PRINT_CHANNELS.EXPORT_HISTORY, filePath),
  },

  // App Lock API
  app: {
    unlock: () => ipcRenderer.invoke('app:unlock'),
    isLocked: () => ipcRenderer.invoke('app:isLocked'),
    logout: () => ipcRenderer.invoke('auth:logout'),
    onLock: (callback: () => void) => {
      const subscription = (_event: IpcRendererEvent) => callback();
      ipcRenderer.on('app:lock', subscription);
      return () => ipcRenderer.removeListener('app:lock', subscription);
    },
  },

  // Window API
  window: {
    print: () => ipcRenderer.invoke('window:print'),
    getPrinters: () => ipcRenderer.invoke('window:getPrinters'),
  },

  // Backup API
  backup: {
    create: (options?: { compress?: boolean; verify?: boolean }) => 
      invoke<BackupCreateResult>('backup:create', options),
    list: () => invoke<BackupListItem[]>('backup:list'),
    preview: (path: string) => invoke<BackupPreviewResult>('backup:preview', path),
    restore: (path: string) => invoke<BackupRestoreResult>('backup:restore', path),
    rollback: () => invoke<BackupRollbackResult>('backup:rollback'),
    import: () => invoke<BackupImportResult>('backup:import'),
    selectLocation: () => invoke<string | null>('backup:selectLocation'),
  },

  // Settings API
  settings: {
    get: (key: string) => invoke(SETTINGS_CHANNELS.GET, key),
    set: (key: string, value: string) => invoke(SETTINGS_CHANNELS.SET, { key, value }),
    getAll: () => invoke(SETTINGS_CHANNELS.GET_ALL),
    export: (type: string) => ipcRenderer.invoke('settings:export', type),
    import: (type: string) => ipcRenderer.invoke('settings:import', type),
  },

  // Instruction API
  instruction: {
    getMedicationsByContext: (context: string) => invoke(INSTRUCTION_CHANNELS.GET_MEDICATIONS_BY_CONTEXT, context),
    getTemplateForMedication: (medicationName: string, context: string) =>
      invoke(INSTRUCTION_CHANNELS.GET_TEMPLATE_FOR_MEDICATION, { medicationName, context }),
    getTemplatesForMedication: (medicationName: string) =>
      invoke(INSTRUCTION_CHANNELS.GET_TEMPLATES_FOR_MEDICATION, medicationName),
    getContextsForMedication: (medicationName: string) =>
      invoke(INSTRUCTION_CHANNELS.GET_CONTEXTS_FOR_MEDICATION, medicationName),
    getAllMedicationsCatalog: () => invoke(INSTRUCTION_CHANNELS.GET_ALL_MEDICATIONS_CATALOG),
  },

  // Database API
  database: {
    seed: () => invoke(DATABASE_CHANNELS.RUN_SEED),
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electron', electronAPI);

// Type definitions for TypeScript
declare global {
  interface Window {
    electron: typeof electronAPI;
  }
}

export type ElectronAPI = typeof electronAPI;
