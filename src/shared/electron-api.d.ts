/**
 * Type declarations for the Electron API
 * This file provides TypeScript types for the renderer process
 */

import type {
  Patient,
  StaffMember,
  DispensingRecord,
  DispenseWithDetails,
  Inventory,
  InventoryWithTransactions,
  InventoryTransaction,
  InventoryAlert,
  AuditLog,
  Draft,
  SearchResult,
  CreatePatientInput,
  UpdatePatientInput,
  CreateStaffInput,
  UpdateStaffInput,
  CreateDispenseInput,
  VoidDispenseInput,
  CorrectDispenseInput,
  ReceiveInventoryInput,
  AdjustInventoryInput,
  CreateDraftInput,
  DashboardStats,
  SensitiveAction,
  VerifyActionPinResponse,
  BackupSettings,
  BackupRunResult,
  RestoreResult,
  SessionStatus,
  WorkstationHealthSnapshot,
  IpcResponse,
} from './types';

export interface ElectronAPI {
  auth: {
    login: (pin: string) => Promise<
      IpcResponse<{
        staffId: number;
        role: string;
        firstName: string;
        lastName: string;
      }>
    >;
    check: () => Promise<SessionStatus>;
    logout: () => Promise<void>;
    touch: () => Promise<void>;
    setTimeout: (timeoutMs: number) => Promise<void>;
  };

  // Database
  database: {
    initialize: () => Promise<{ initialized: boolean }>;
    runSeed: () => Promise<{ seeded: boolean }>;
    seed: () => Promise<boolean>;
    healthCheck: () => Promise<{ healthy: boolean; issues: string[] }>;
    getVersion: () => Promise<{
      currentVersion: number;
      latestVersion: number;
      pendingCount: number;
    }>;
    runMigrations: () => Promise<{
      currentVersion: number;
      latestVersion: number;
      pendingCount: number;
    }>;
  };

  // Patients
  patients: {
    create: (input: CreatePatientInput) => Promise<Patient>;
    get: (id: number) => Promise<Patient | null>;
    getByChartNumber: (chartNumber: string) => Promise<Patient | null>;
    update: (id: number, input: UpdatePatientInput) => Promise<Patient>;
    deactivate: (id: number) => Promise<void>;
    reactivate: (id: number) => Promise<void>;
    search: (options?: {
      page?: number;
      pageSize?: number;
      search?: string;
      onlyActive?: boolean;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }) => Promise<SearchResult<Patient>>;
    getActive: () => Promise<Patient[]>;
    checkChartNumber: (
      chartNumber: string,
      excludeId?: number,
    ) => Promise<boolean>;
  };

  // Staff
  staff: {
    create: (input: CreateStaffInput) => Promise<StaffMember>;
    get: (id: number) => Promise<StaffMember | null>;
    getAll: (onlyActive?: boolean) => Promise<StaffMember[]>;
    update: (id: number, input: UpdateStaffInput) => Promise<StaffMember>;
    verifyPin: (
      pin: string,
    ) => Promise<{ success: boolean; staff?: StaffMember }>;
    verifyAction: (
      pin: string,
      action: SensitiveAction,
    ) => Promise<VerifyActionPinResponse>;
    deactivate: (id: number) => Promise<void>;
    reactivate: (id: number) => Promise<void>;
    isAdmin: (staffId: number) => Promise<boolean>;
    delete: (id: number) => Promise<void>;
  };

  // Dispensing
  dispensing: {
    create: (input: CreateDispenseInput) => Promise<DispensingRecord>;
    get: (id: number) => Promise<DispenseWithDetails | null>;
    getByPatient: (
      patientId: number,
      limit?: number,
    ) => Promise<DispenseWithDetails[]>;
    search: (options?: {
      page?: number;
      pageSize?: number;
      patientId?: number;
      staffId?: number;
      dateFrom?: string;
      dateTo?: string;
      status?: string;
    }) => Promise<SearchResult<DispenseWithDetails>>;
    void: (input: VoidDispenseInput) => Promise<void>;
    correct: (input: CorrectDispenseInput) => Promise<DispensingRecord>;
    getTodayCount: () => Promise<number>;
  };

  // Inventory
  inventory: {
    receive: (input: ReceiveInventoryInput) => Promise<Inventory>;
    get: (id: number) => Promise<Inventory | null>;
    getWithTransactions: (
      id: number,
    ) => Promise<InventoryWithTransactions | null>;
    search: (options?: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
      expiringBefore?: string;
    }) => Promise<SearchResult<Inventory>>;
    getAllLots: (options?: {
      page?: number;
      pageSize?: number;
      search?: string;
    }) => Promise<SearchResult<Inventory>>;
    getByMedication: (
      medicationName: string,
      onlyActive?: boolean,
    ) => Promise<Inventory[]>;
    getLowStock: () => Promise<Inventory[]>;
    getExpiring: (days: number) => Promise<Inventory[]>;
    adjust: (input: AdjustInventoryInput) => Promise<Inventory>;
    getTransactions: (
      inventoryId?: number,
      limit?: number,
    ) => Promise<InventoryTransaction[]>;
    quarantine: (
      inventoryId: number,
      reason: string,
      staffId: number,
    ) => Promise<Inventory>;
  };

  // Alerts
  alerts: {
    getActive: (options?: {
      severity?: 'info' | 'warning' | 'critical';
      alertType?: 'expiring_soon' | 'low_stock' | 'expired';
      limit?: number;
    }) => Promise<InventoryAlert[]>;
    getAll: (options?: {
      acknowledged?: boolean;
      severity?: 'info' | 'warning' | 'critical';
      alertType?: 'expiring_soon' | 'low_stock' | 'expired';
      page?: number;
      pageSize?: number;
    }) => Promise<{ data: InventoryAlert[]; total: number }>;
    acknowledge: (alertId: number, staffId: number) => Promise<InventoryAlert>;
    acknowledgeForInventory: (
      inventoryId: number,
      staffId: number,
    ) => Promise<number>;
    getCounts: () => Promise<{
      total: number;
      critical: number;
      warning: number;
      info: number;
      unacknowledged: number;
    }>;
    create: (
      inventoryId: number,
      alertType: string,
      severity: string,
      message: string,
    ) => Promise<InventoryAlert>;
  };

  // Audit
  audit: {
    search: (options?: {
      page?: number;
      pageSize?: number;
      action?: string;
      entityType?: string;
      entityId?: number;
      staffId?: number;
      dateFrom?: string;
      dateTo?: string;
    }) => Promise<SearchResult<AuditLog>>;
    getTrail: (entityType: string, entityId: number) => Promise<AuditLog[]>;
    verifyIntegrity: () => Promise<{ valid: boolean; errors: string[] }>;
    getRecent: (limit?: number) => Promise<AuditLog[]>;
    export: (dateFrom: string, dateTo: string) => Promise<AuditLog[]>;
  };

  // Drafts
  drafts: {
    save: (input: CreateDraftInput) => Promise<Draft>;
    get: (id: number) => Promise<Draft | null>;
    getByStaff: (staffId: number) => Promise<Draft[]>;
    getAll: () => Promise<Draft[]>;
    delete: (id: number) => Promise<boolean>;
    deleteByType: (type: string, staffId: number) => Promise<boolean>;
    getCount: (staffId: number) => Promise<number>;
  };

  // Dashboard
  dashboard: {
    getStats: () => Promise<DashboardStats>;
  };

  // Settings
  settings: {
    get: (key: string) => Promise<string | null>;
    set: (params: {
      key: string;
      value: string;
    }) => Promise<{ success: boolean }>;
    getAll: () => Promise<Record<string, string>>;
    export: (type: string) => Promise<unknown>;
    import: (type: string) => Promise<unknown>;
  };

  backup: {
    create: (options?: { compress?: boolean; verify?: boolean }) => Promise<BackupRunResult>;
    list: () => Promise<
      Array<{
        id: string;
        filename: string;
        path: string;
        size: number;
        createdAt: string;
        checksum: string | null;
        verified: boolean;
        type: 'automatic' | 'manual';
      }>
    >;
    preview: (path: string) => Promise<{
      tables: string[];
      recordCounts: Record<string, number>;
      appVersion: string;
      backupDate: string;
    }>;
    restore: (path: string) => Promise<RestoreResult>;
    rollback: () => Promise<{ success: boolean; rollbackSource: string }>;
    import: () => Promise<{ imported: boolean; path?: string; filename?: string }>;
    selectLocation: () => Promise<string | null>;
    getSettings: () => Promise<BackupSettings>;
    updateSettings: (settings: Partial<BackupSettings>) => Promise<BackupSettings>;
    getHealth: () => Promise<WorkstationHealthSnapshot>;
  };
}

// Note: Window.electron is declared in src/main/preload.ts
// This file only defines the ElectronAPI interface for type checking
