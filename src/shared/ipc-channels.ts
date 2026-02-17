/**
 * IPC Channel Definitions
 * Central registry for all IPC channels
 */

// ============================================================================
// Patient Channels
// ============================================================================

export const PATIENT_CHANNELS = {
  CREATE: 'patient:create',
  GET: 'patient:get',
  GET_BY_CHART: 'patient:getByChartNumber',
  UPDATE: 'patient:update',
  DEACTIVATE: 'patient:deactivate',
  REACTIVATE: 'patient:reactivate',
  SEARCH: 'patient:search',
  GET_ACTIVE: 'patient:getActive',
  CHECK_CHART_NUMBER: 'patient:checkChartNumber',
  GET_DISPENSING_HISTORY: 'patient:getDispensingHistory',
  GET_MEDICATION_SUMMARY: 'patient:getMedicationSummary',
  GET_LAST_DISPENSED_DATE: 'patient:getLastDispensedDate',
  GET_MEDICATION_TIMELINE: 'patient:getMedicationTimeline',
} as const;

// ============================================================================
// Staff Channels
// ============================================================================

export const STAFF_CHANNELS = {
  CREATE: 'staff:create',
  GET: 'staff:get',
  GET_ALL: 'staff:getAll',
  UPDATE: 'staff:update',
  VERIFY_PIN: 'staff:verifyPin',
  CHANGE_OWN_PIN: 'staff:changeOwnPin',
  DEACTIVATE: 'staff:deactivate',
  REACTIVATE: 'staff:reactivate',
  IS_ADMIN: 'staff:isAdmin',
  DELETE: 'staff:delete',
} as const;

// ============================================================================
// Dispensing Channels
// ============================================================================

export const DISPENSING_CHANNELS = {
  CREATE: 'dispensing:create',
  GET: 'dispensing:get',
  GET_BY_PATIENT: 'dispensing:getByPatient',
  SEARCH: 'dispensing:search',
  VOID: 'dispensing:void',
  CORRECT: 'dispensing:correct',
  GET_TODAY_COUNT: 'dispensing:getTodayCount',
} as const;

// ============================================================================
// Inventory Channels
// ============================================================================

export const INVENTORY_CHANNELS = {
  RECEIVE: 'inventory:receive',
  GET: 'inventory:get',
  GET_WITH_TRANSACTIONS: 'inventory:getWithTransactions',
  SEARCH: 'inventory:search',
  GET_BY_MEDICATION: 'inventory:getByMedication',
  GET_LOW_STOCK: 'inventory:getLowStock',
  GET_EXPIRING: 'inventory:getExpiring',
  ADJUST: 'inventory:adjust',
  GET_TRANSACTIONS: 'inventory:getTransactions',
  QUARANTINE: 'inventory:quarantine',
  // New lot validation and FEFO functions
  VALIDATE_LOT: 'inventory:validateLot',
  GET_LOTS_BY_MEDICATION: 'inventory:getLotsByMedication',
  GET_AVAILABLE_LOTS: 'inventory:getAvailableLots',
  GET_LOTS_EXPIRING_WITHIN: 'inventory:getLotsExpiringWithin',
  GET_LOT_BY_NUMBER: 'inventory:getLotByNumber',
  GET_MEDICATION_SUMMARY: 'inventory:getMedicationSummary',
  VALIDATE_LOTS_BATCH: 'inventory:validateLotsBatch',
  GET_LOT_DETAILS: 'inventory:getLotDetails',
} as const;

// ============================================================================
// Alert Channels
// ============================================================================

export const ALERT_CHANNELS = {
  GET_ACTIVE: 'alerts:getActive',
  GET_ALL: 'alerts:getAll',
  ACKNOWLEDGE: 'alerts:acknowledge',
  ACKNOWLEDGE_FOR_INVENTORY: 'alerts:acknowledgeForInventory',
  GET_COUNTS: 'alerts:getCounts',
  CREATE: 'alerts:create',
} as const;

// ============================================================================
// Audit Channels
// ============================================================================

export const AUDIT_CHANNELS = {
  SEARCH: 'audit:search',
  GET_TRAIL: 'audit:getTrail',
  VERIFY_INTEGRITY: 'audit:verifyIntegrity',
  GET_RECENT: 'audit:getRecent',
  EXPORT: 'audit:export',
} as const;

// ============================================================================
// Draft Channels
// ============================================================================

export const DRAFT_CHANNELS = {
  SAVE: 'draft:save',
  GET: 'draft:get',
  GET_BY_STAFF: 'draft:getByStaff',
  GET_ALL: 'draft:getAll',
  DELETE: 'draft:delete',
  DELETE_BY_TYPE: 'draft:deleteByType',
  GET_COUNT: 'draft:getCount',
} as const;

// ============================================================================
// Dashboard Channels
// ============================================================================

export const DASHBOARD_CHANNELS = {
  GET_STATS: 'dashboard:getStats',
} as const;

// ============================================================================
// App Settings Channels
// ============================================================================

export const SETTINGS_CHANNELS = {
  GET: 'settings:get',
  SET: 'settings:set',
  GET_ALL: 'settings:getAll',
} as const;

// ============================================================================
// Database Channels
// ============================================================================

export const DATABASE_CHANNELS = {
  INITIALIZE: 'db:initialize',
  RUN_SEED: 'db:runSeed',
  HEALTH_CHECK: 'db:healthCheck',
  GET_VERSION: 'db:getVersion',
  RUN_MIGRATIONS: 'db:runMigrations',
  GET_INVENTORY_COUNT: 'db:getInventoryCount',
} as const;

// ============================================================================
// Reports Channels
// ============================================================================

export const REPORTS_CHANNELS = {
  DAILY_SUMMARY: 'reports:dailySummary',
  INVENTORY_USAGE: 'reports:inventoryUsage',
  EXPIRATION: 'reports:expiration',
  STAFF_ACTIVITY: 'reports:staffActivity',
  RECONCILIATION: 'reports:reconciliation',
} as const;

// ============================================================================
// Print Channels
// ============================================================================

export const PRINT_CHANNELS = {
  LABEL: 'print:label',
  RECEIPT: 'print:receipt',
  LABEL_SHEET: 'print:labelSheet',
  QR_CODE: 'print:qrCode',
  PREVIEW: 'print:preview',
  GET_QUEUE: 'print:getQueue',
  GET_HISTORY: 'print:getHistory',
  CANCEL_JOB: 'print:cancelJob',
  CLEAR_HISTORY: 'print:clearHistory',
  EXPORT_HISTORY: 'print:exportHistory',
  GET_PRINTERS: 'print:getPrinters',
} as const;

// ============================================================================
// Backup Channels
// ============================================================================

export const BACKUP_CHANNELS = {
  CREATE: 'backup:create',
  LIST: 'backup:list',
  PREVIEW: 'backup:preview',
  RESTORE: 'backup:restore',
  ROLLBACK: 'backup:rollback',
  IMPORT: 'backup:import',
  SELECT_LOCATION: 'backup:selectLocation',
} as const;

// ============================================================================
// Instruction Channels
// ============================================================================

export const INSTRUCTION_CHANNELS = {
  GET_CONTEXT_FROM_REASONS: 'instruction:getContextFromReasons',
  GET_TEMPLATE: 'instruction:getTemplate',
  CALCULATE_DAY_SUPPLY: 'instruction:calculateDaySupply',
  GET_WARNINGS: 'instruction:getWarnings',
  GET_SHORT_DOSING: 'instruction:getShortDosing',
  GET_FULL_INSTRUCTIONS: 'instruction:getFullInstructions',
  POPULATE_LINE_ITEM: 'instruction:populateLineItem',
  GET_AVAILABLE_CONTEXTS: 'instruction:getAvailableContexts',
  GET_ALL_TEMPLATES: 'instruction:getAllTemplates',
  // Medication catalog queries
  GET_MEDICATIONS_BY_CONTEXT: 'instruction:getMedicationsByContext',
  GET_TEMPLATE_FOR_MEDICATION: 'instruction:getTemplateForMedication',
  GET_TEMPLATES_FOR_MEDICATION: 'instruction:getTemplatesForMedication',
  GET_CONTEXTS_FOR_MEDICATION: 'instruction:getContextsForMedication',
  GET_ALL_MEDICATIONS_CATALOG: 'instruction:getAllMedicationsCatalog',
} as const;

// ============================================================================
// All Channels
// ============================================================================

export const IPC_CHANNELS = {
  PATIENT: PATIENT_CHANNELS,
  STAFF: STAFF_CHANNELS,
  DISPENSING: DISPENSING_CHANNELS,
  INVENTORY: INVENTORY_CHANNELS,
  ALERTS: ALERT_CHANNELS,
  AUDIT: AUDIT_CHANNELS,
  DRAFT: DRAFT_CHANNELS,
  DASHBOARD: DASHBOARD_CHANNELS,
  SETTINGS: SETTINGS_CHANNELS,
  DATABASE: DATABASE_CHANNELS,
  REPORTS: REPORTS_CHANNELS,
  PRINT: PRINT_CHANNELS,
  BACKUP: BACKUP_CHANNELS,
  INSTRUCTION: INSTRUCTION_CHANNELS,
} as const;

// Type for all channel values
export type IpcChannel =
  | (typeof PATIENT_CHANNELS)[keyof typeof PATIENT_CHANNELS]
  | (typeof STAFF_CHANNELS)[keyof typeof STAFF_CHANNELS]
  | (typeof DISPENSING_CHANNELS)[keyof typeof DISPENSING_CHANNELS]
  | (typeof INVENTORY_CHANNELS)[keyof typeof INVENTORY_CHANNELS]
  | (typeof ALERT_CHANNELS)[keyof typeof ALERT_CHANNELS]
  | (typeof AUDIT_CHANNELS)[keyof typeof AUDIT_CHANNELS]
  | (typeof DRAFT_CHANNELS)[keyof typeof DRAFT_CHANNELS]
  | (typeof DASHBOARD_CHANNELS)[keyof typeof DASHBOARD_CHANNELS]
  | (typeof SETTINGS_CHANNELS)[keyof typeof SETTINGS_CHANNELS]
  | (typeof DATABASE_CHANNELS)[keyof typeof DATABASE_CHANNELS]
  | (typeof REPORTS_CHANNELS)[keyof typeof REPORTS_CHANNELS]
  | (typeof PRINT_CHANNELS)[keyof typeof PRINT_CHANNELS]
  | (typeof INSTRUCTION_CHANNELS)[keyof typeof INSTRUCTION_CHANNELS];
