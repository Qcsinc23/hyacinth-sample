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
} from '../shared/ipc-channels';

// Helper to invoke IPC channels
const invoke = async <T>(channel: string, ...args: any[]): Promise<T> => {
  const response = await ipcRenderer.invoke(channel, ...args);
  if (!response.success) {
    throw new Error(response.error || 'Unknown error');
  }
  return response.data;
};

// API exposed to the renderer process
const electronAPI = {
  // Staff API
  staff: {
    verify: (pin: string) => invoke(STAFF_CHANNELS.VERIFY_PIN, pin),
    getAll: () => invoke(STAFF_CHANNELS.GET_ALL),
    add: (data: any) => invoke(STAFF_CHANNELS.CREATE, data),
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
    getAllLots: () => invoke(INVENTORY_CHANNELS.SEARCH, ''),
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
      invoke(DISPENSING_CHANNELS.VOID, data.record_id, data.voided_by, data.reason),
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
    save: (type: string, data: any, userId?: number) => invoke(DRAFT_CHANNELS.SAVE, { type, data, staffId: userId }),
    get: (type: string, userId?: number) => invoke(DRAFT_CHANNELS.GET_BY_STAFF, userId),
    delete: (type: string, userId?: number) => invoke(DRAFT_CHANNELS.DELETE_BY_TYPE, type, userId),
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
      ipcRenderer.invoke('backup:create', options),
    list: () => ipcRenderer.invoke('backup:list'),
    preview: (path: string) => ipcRenderer.invoke('backup:preview', path),
    restore: (path: string) => ipcRenderer.invoke('backup:restore', path),
    rollback: () => ipcRenderer.invoke('backup:rollback'),
    import: () => ipcRenderer.invoke('backup:import'),
    selectLocation: () => ipcRenderer.invoke('backup:selectLocation'),
  },

  // Settings API
  settings: {
    get: (key: string) => invoke(SETTINGS_CHANNELS.GET, key),
    set: (key: string, value: string) => invoke(SETTINGS_CHANNELS.SET, { key, value }),
    getAll: () => invoke(SETTINGS_CHANNELS.GET_ALL),
    export: (type: string) => ipcRenderer.invoke('settings:export', type),
    import: (type: string) => ipcRenderer.invoke('settings:import', type),
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
