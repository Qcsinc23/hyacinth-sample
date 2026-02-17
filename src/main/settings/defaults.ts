/**
 * Default Settings
 * 
 * Defines default values for all application settings.
 */

/**
 * Application settings interface
 */
export interface Settings {
  // General Settings
  appName: string;
  appVersion: string;
  organization: string;
  defaultDispenseQuantity: number;
  dateFormat: string;
  timeFormat: string;
  
  // Security Settings
  pinEnabled: boolean;
  pinHash: string | null;
  autoLockEnabled: boolean;
  autoLockTimeoutMinutes: number;
  requirePinForDispensing: boolean;
  requirePinForExport: boolean;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  
  // Backup Settings
  backupEnabled: boolean;
  backupIntervalHours: number;
  backupRetentionDays: number;
  lastBackup: string | null;
  
  // Notification Settings
  lowStockAlertsEnabled: boolean;
  expirationAlertsEnabled: boolean;
  alertSoundEnabled: boolean;
  lowStockThreshold: Record<string, number>;
  expirationWarningDays: number;
  
  // Display Settings
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  showHelpTooltips: boolean;
  
  // Export Settings
  defaultExportFormat: 'csv' | 'pdf' | 'xlsx';
  csvDelimiter: ',';
  includeHeaderInExport: boolean;
  
  // Integration Settings
  enableAuditLogging: boolean;
  auditLogRetentionDays: number;
  
  // Feature Flags
  enablePatientSearch: boolean;
  enableInventoryImport: boolean;
  enableAdvancedReports: boolean;
}

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: Settings = {
  // General Settings
  appName: 'Hyacinth',
  appVersion: '1.0.0',
  organization: '',
  defaultDispenseQuantity: 30,
  dateFormat: 'MM/dd/yyyy',
  timeFormat: 'HH:mm',
  
  // Security Settings
  pinEnabled: true,
  pinHash: null,
  autoLockEnabled: true,
  autoLockTimeoutMinutes: 5,
  requirePinForDispensing: false,
  requirePinForExport: true,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 30,
  
  // Backup Settings
  backupEnabled: true,
  backupIntervalHours: 24,
  backupRetentionDays: 30,
  lastBackup: null,
  
  // Notification Settings
  lowStockAlertsEnabled: true,
  expirationAlertsEnabled: true,
  alertSoundEnabled: false,
  lowStockThreshold: {
    'Biktarvy (nPEP)': 30,
    'Biktarvy (ID)': 30,
    'Biktarvy (PrEP)': 30,
    'Descovy': 30,
    'Symtuza': 30,
    'Dovato': 30,
    'Bactrim': 20,
    'Doxycycline': 20,
  },
  expirationWarningDays: 30,
  
  // Display Settings
  theme: 'system',
  sidebarCollapsed: false,
  showHelpTooltips: true,
  
  // Export Settings
  defaultExportFormat: 'csv',
  csvDelimiter: ',',
  includeHeaderInExport: true,
  
  // Integration Settings
  enableAuditLogging: true,
  auditLogRetentionDays: 365,
  
  // Feature Flags
  enablePatientSearch: true,
  enableInventoryImport: true,
  enableAdvancedReports: false,
};

/**
 * Settings categories for UI organization
 */
export const SETTINGS_CATEGORIES = [
  {
    id: 'general',
    name: 'General',
    description: 'Basic application settings',
    icon: 'Settings',
    settings: [
      'appName',
      'organization',
      'dateFormat',
      'timeFormat',
      'defaultDispenseQuantity',
    ],
  },
  {
    id: 'security',
    name: 'Security',
    description: 'PIN, auto-lock, and access control',
    icon: 'Shield',
    settings: [
      'pinEnabled',
      'autoLockEnabled',
      'autoLockTimeoutMinutes',
      'requirePinForDispensing',
      'requirePinForExport',
      'maxLoginAttempts',
      'lockoutDurationMinutes',
    ],
  },
  {
    id: 'backup',
    name: 'Backup',
    description: 'Automatic backup settings',
    icon: 'Database',
    settings: [
      'backupEnabled',
      'backupIntervalHours',
      'backupRetentionDays',
    ],
  },
  {
    id: 'notifications',
    name: 'Notifications',
    description: 'Alert and notification preferences',
    icon: 'Bell',
    settings: [
      'lowStockAlertsEnabled',
      'expirationAlertsEnabled',
      'alertSoundEnabled',
      'expirationWarningDays',
    ],
  },
  {
    id: 'display',
    name: 'Display',
    description: 'UI appearance and behavior',
    icon: 'Monitor',
    settings: [
      'theme',
      'sidebarCollapsed',
      'showHelpTooltips',
    ],
  },
  {
    id: 'export',
    name: 'Export',
    description: 'Export and reporting settings',
    icon: 'FileDown',
    settings: [
      'defaultExportFormat',
      'csvDelimiter',
      'includeHeaderInExport',
    ],
  },
  {
    id: 'audit',
    name: 'Audit Logging',
    description: 'Audit trail and compliance settings',
    icon: 'ClipboardList',
    settings: [
      'enableAuditLogging',
      'auditLogRetentionDays',
    ],
  },
] as const;

/**
 * Setting metadata for UI rendering
 */
export const SETTING_METADATA: Record<
  keyof Settings,
  {
    label: string;
    description?: string;
    type: 'string' | 'number' | 'boolean' | 'select' | 'array';
    options?: string[] | { value: string; label: string }[];
    min?: number;
    max?: number;
  }
> = {
  appName: {
    label: 'Application Name',
    type: 'string',
  },
  appVersion: {
    label: 'Application Version',
    type: 'string',
  },
  organization: {
    label: 'Organization',
    description: 'Your clinic or organization name',
    type: 'string',
  },
  defaultDispenseQuantity: {
    label: 'Default Dispense Quantity',
    description: 'Default number of days to dispense',
    type: 'number',
    min: 1,
    max: 90,
  },
  dateFormat: {
    label: 'Date Format',
    type: 'select',
    options: [
      { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY (US)' },
      { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY (UK/EU)' },
      { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD (ISO)' },
    ],
  },
  timeFormat: {
    label: 'Time Format',
    type: 'select',
    options: [
      { value: 'HH:mm', label: '24-hour (14:30)' },
      { value: 'hh:mm a', label: '12-hour (2:30 PM)' },
    ],
  },
  pinEnabled: {
    label: 'Enable PIN Protection',
    description: 'Require PIN to access the application',
    type: 'boolean',
  },
  pinHash: {
    label: 'PIN Hash',
    description: 'Stored hashed PIN value (managed by security handlers)',
    type: 'string',
  },
  autoLockEnabled: {
    label: 'Auto-Lock',
    description: 'Automatically lock after inactivity',
    type: 'boolean',
  },
  autoLockTimeoutMinutes: {
    label: 'Auto-Lock Timeout',
    description: 'Minutes of inactivity before locking',
    type: 'number',
    min: 1,
    max: 60,
  },
  requirePinForDispensing: {
    label: 'Require PIN for Dispensing',
    description: 'Require PIN verification when dispensing medications',
    type: 'boolean',
  },
  requirePinForExport: {
    label: 'Require PIN for Export',
    description: 'Require PIN verification when exporting data',
    type: 'boolean',
  },
  maxLoginAttempts: {
    label: 'Max Login Attempts',
    description: 'Number of failed attempts before lockout',
    type: 'number',
    min: 3,
    max: 10,
  },
  lockoutDurationMinutes: {
    label: 'Lockout Duration',
    description: 'Minutes to lock after max failed attempts',
    type: 'number',
    min: 5,
    max: 120,
  },
  backupEnabled: {
    label: 'Enable Automatic Backups',
    type: 'boolean',
  },
  backupIntervalHours: {
    label: 'Backup Interval',
    description: 'Hours between automatic backups',
    type: 'number',
    min: 1,
    max: 168,
  },
  backupRetentionDays: {
    label: 'Backup Retention',
    description: 'Days to keep old backups',
    type: 'number',
    min: 7,
    max: 365,
  },
  lastBackup: {
    label: 'Last Backup',
    type: 'string',
  },
  lowStockAlertsEnabled: {
    label: 'Low Stock Alerts',
    type: 'boolean',
  },
  expirationAlertsEnabled: {
    label: 'Expiration Alerts',
    type: 'boolean',
  },
  alertSoundEnabled: {
    label: 'Alert Sounds',
    type: 'boolean',
  },
  lowStockThreshold: {
    label: 'Low Stock Thresholds',
    type: 'array',
  },
  expirationWarningDays: {
    label: 'Expiration Warning',
    description: 'Days before expiration to show warning',
    type: 'number',
    min: 7,
    max: 90,
  },
  theme: {
    label: 'Theme',
    type: 'select',
    options: [
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
      { value: 'system', label: 'System' },
    ],
  },
  sidebarCollapsed: {
    label: 'Collapse Sidebar',
    type: 'boolean',
  },
  showHelpTooltips: {
    label: 'Show Help Tooltips',
    type: 'boolean',
  },
  defaultExportFormat: {
    label: 'Default Export Format',
    type: 'select',
    options: ['csv', 'pdf', 'xlsx'],
  },
  csvDelimiter: {
    label: 'CSV Delimiter',
    type: 'select',
    options: [
      { value: ',', label: 'Comma (,)' },
      { value: ';', label: 'Semicolon (;)' },
      { value: '\t', label: 'Tab' },
    ],
  },
  includeHeaderInExport: {
    label: 'Include Header Row',
    description: 'Include column headers in exports',
    type: 'boolean',
  },
  enableAuditLogging: {
    label: 'Enable Audit Logging',
    type: 'boolean',
  },
  auditLogRetentionDays: {
    label: 'Audit Log Retention',
    description: 'Days to keep audit logs',
    type: 'number',
    min: 30,
    max: 3650,
  },
  enablePatientSearch: {
    label: 'Enable Patient Search',
    type: 'boolean',
  },
  enableInventoryImport: {
    label: 'Enable Inventory Import',
    type: 'boolean',
  },
  enableAdvancedReports: {
    label: 'Enable Advanced Reports',
    type: 'boolean',
  },
};
