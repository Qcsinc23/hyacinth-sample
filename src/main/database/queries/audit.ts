/**
 * Audit Log Queries - Enhanced Version
 *
 * Comprehensive audit trail with tamper-evident checksums.
 * HIPAA-compliant logging of all data access, medication dispensing,
 * inventory changes, authentication, and system events.
 */

import { getDatabase, calculateChecksum, getLastChecksum } from '../db';
import type { AuditLog, SearchResult } from '../../../shared/types';

// ============================================================================
// Audit Action Types
// ============================================================================

export type AuditAction =
  // Patient Data Access
  | 'PATIENT_VIEW'
  | 'PATIENT_SEARCH'
  | 'PATIENT_CREATE'
  | 'PATIENT_UPDATE'
  | 'PATIENT_DELETE'
  | 'PATIENT_EXPORT'
  // Medication Dispensing
  | 'DISPENSE_CREATE'
  | 'DISPENSE_VIEW'
  | 'DISPENSE_UPDATE'
  | 'DISPENSE_VOID'
  | 'DISPENSE_CORRECT'
  | 'DISPENSE_PRINT'
  | 'DISPENSE_EXPORT'
  // Inventory
  | 'INVENTORY_VIEW'
  | 'INVENTORY_CREATE'
  | 'INVENTORY_UPDATE'
  | 'INVENTORY_DELETE'
  | 'INVENTORY_RECEIVE'
  | 'INVENTORY_ADJUST'
  | 'INVENTORY_WASTE'
  | 'INVENTORY_TRANSFER'
  | 'INVENTORY_EXPORT'
  // Authentication & Access
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'SESSION_TIMEOUT'
  | 'SESSION_LOCK'
  | 'SESSION_UNLOCK'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'PASSWORD_CHANGED'
  | 'PIN_RESET'
  // Data Exports
  | 'DATA_EXPORT'
  | 'REPORT_GENERATE'
  | 'AUDIT_EXPORT'
  | 'BACKUP_CREATE'
  | 'BACKUP_RESTORE'
  // Settings
  | 'SETTINGS_VIEW'
  | 'SETTINGS_CHANGE'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'USER_ENABLE'
  | 'USER_DISABLE'
  | 'ROLE_CHANGE'
  // Security
  | 'ENCRYPTION_SETUP'
  | 'ENCRYPTION_UNLOCK'
  | 'ENCRYPTION_LOCK'
  | 'ENCRYPTION_KEY_ROTATION'
  | 'ACCESS_DENIED'
  | 'INTEGRITY_VIOLATION';

// ============================================================================
// Core Audit Functions
// ============================================================================

/**
 * Create an audit log entry
 */
export function createAuditEntry(
  action: string,
  entityType: string,
  entityId: number,
  staffId: number | null,
  staffName: string | null,
  details: Record<string, unknown>,
): AuditLog {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Create data string for checksum
  const dataString = JSON.stringify({
    action,
    entityType,
    entityId,
    staffId,
    staffName,
    timestamp: now,
    details,
  });

  // Calculate checksum with chain
  const previousChecksum = getLastChecksum();
  const checksum = calculateChecksum(dataString, previousChecksum || undefined);

  const result = db
    .prepare(
      `
    INSERT INTO audit_log (
      action, entity_type, entity_id, staff_id, staff_name,
      timestamp, details, checksum
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
    )
    .run(
      action,
      entityType,
      entityId,
      staffId,
      staffName,
      now,
      JSON.stringify(details),
      checksum,
    );

  return getAuditEntryById(Number(result.lastInsertRowid))!;
}

/**
 * Get audit entry by ID
 */
export function getAuditEntryById(id: number): AuditLog | null {
  const db = getDatabase();
  return db
    .prepare('SELECT * FROM audit_log WHERE id = ?')
    .get(id) as AuditLog | null;
}

// ============================================================================
// Patient Data Access Logging
// ============================================================================

/**
 * Log patient data access
 */
export function logPatientAccess(
  action:
    | 'PATIENT_VIEW'
    | 'PATIENT_SEARCH'
    | 'PATIENT_CREATE'
    | 'PATIENT_UPDATE'
    | 'PATIENT_DELETE',
  patientId: number,
  staffId: number,
  staffName: string,
  details?: {
    chartNumber?: string;
    patientName?: string;
    fieldsAccessed?: string[];
    searchCriteria?: Record<string, unknown>;
    changes?: Record<string, { old: unknown; new: unknown }>;
  },
): AuditLog {
  return createAuditEntry(action, 'patient', patientId, staffId, staffName, {
    ...details,
    accessTimestamp: new Date().toISOString(),
  });
}

/**
 * Log patient data export
 */
export function logPatientExport(
  patientId: number | null, // null for bulk export
  staffId: number,
  staffName: string,
  details: {
    exportFormat: string;
    recordCount: number;
    reason: string;
    destination: string;
    filters?: Record<string, unknown>;
  },
): AuditLog {
  return createAuditEntry(
    'PATIENT_EXPORT',
    'patient',
    patientId || 0,
    staffId,
    staffName,
    {
      ...details,
      exportTimestamp: new Date().toISOString(),
    },
  );
}

// ============================================================================
// Medication Dispensing Logging
// ============================================================================

/**
 * Log medication dispensing activity
 */
export function logDispensingActivity(
  action:
    | 'DISPENSE_CREATE'
    | 'DISPENSE_VIEW'
    | 'DISPENSE_VOID'
    | 'DISPENSE_CORRECT'
    | 'DISPENSE_PRINT',
  dispensingId: number,
  staffId: number,
  staffName: string,
  details: {
    patientId: number;
    patientName?: string;
    chartNumber?: string;
    medications: Array<{
      name: string;
      quantity: number;
      unit: string;
      lotNumber?: string;
    }>;
    reasons?: string[];
    voidReason?: string;
    correctionReason?: string;
    originalRecordId?: number;
    labelQuantity?: number;
  },
): AuditLog {
  return createAuditEntry(
    action,
    'dispensing_record',
    dispensingId,
    staffId,
    staffName,
    {
      ...details,
      dispensingTimestamp: new Date().toISOString(),
    },
  );
}

/**
 * Log dispensing export
 */
export function logDispensingExport(
  dispensingId: number | null,
  staffId: number,
  staffName: string,
  details: {
    exportFormat: string;
    dateRange?: { from: string; to: string };
    patientId?: number;
    filters?: Record<string, unknown>;
  },
): AuditLog {
  return createAuditEntry(
    'DISPENSE_EXPORT',
    'dispensing_record',
    dispensingId || 0,
    staffId,
    staffName,
    details,
  );
}

// ============================================================================
// Inventory Logging
// ============================================================================

/**
 * Log inventory changes
 */
export function logInventoryChange(
  action:
    | 'INVENTORY_RECEIVE'
    | 'INVENTORY_ADJUST'
    | 'INVENTORY_WASTE'
    | 'INVENTORY_TRANSFER'
    | 'INVENTORY_DELETE',
  inventoryId: number,
  staffId: number,
  staffName: string,
  details: {
    medicationName: string;
    lotNumber: string;
    ndcCode?: string;
    quantityBefore: number;
    quantityChange: number;
    quantityAfter: number;
    unit: string;
    reason?: string;
    referenceType?: string;
    referenceId?: number;
    supplier?: string;
    expirationDate?: string;
  },
): AuditLog {
  return createAuditEntry(
    action,
    'inventory',
    inventoryId,
    staffId,
    staffName,
    {
      ...details,
      changeTimestamp: new Date().toISOString(),
    },
  );
}

/**
 * Log inventory view/access
 */
export function logInventoryAccess(
  inventoryId: number | null, // null for listing/search
  staffId: number,
  staffName: string,
  details?: {
    action: 'INVENTORY_VIEW' | 'INVENTORY_SEARCH';
    searchCriteria?: Record<string, unknown>;
    medicationName?: string;
    lotNumber?: string;
  },
): AuditLog {
  return createAuditEntry(
    details?.action || 'INVENTORY_VIEW',
    'inventory',
    inventoryId || 0,
    staffId,
    staffName,
    details || {},
  );
}

/**
 * Log inventory export
 */
export function logInventoryExport(
  staffId: number,
  staffName: string,
  details: {
    exportFormat: string;
    recordCount: number;
    filters?: Record<string, unknown>;
    includeExpired?: boolean;
  },
): AuditLog {
  return createAuditEntry(
    'INVENTORY_EXPORT',
    'inventory',
    0,
    staffId,
    staffName,
    details,
  );
}

// ============================================================================
// Authentication & Access Logging
// ============================================================================

/**
 * Log authentication events
 */
export function logAuthentication(
  action:
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILURE'
    | 'LOGOUT'
    | 'SESSION_TIMEOUT'
    | 'SESSION_LOCK'
    | 'SESSION_UNLOCK'
    | 'ACCOUNT_LOCKED',
  staffId: number | null,
  staffName: string | null,
  details?: {
    ipAddress?: string;
    userAgent?: string;
    failureReason?: string;
    attemptCount?: number;
    lockedUntil?: string;
    sessionDuration?: number;
  },
): AuditLog {
  return createAuditEntry(
    action,
    'authentication',
    staffId || 0,
    staffId,
    staffName,
    {
      ...details,
      authTimestamp: new Date().toISOString(),
    },
  );
}

/**
 * Log failed access attempt
 */
export function logFailedAccess(
  action: string,
  entityType: string,
  entityId: number,
  staffId: number | null,
  staffName: string | null,
  reason: string,
  details?: Record<string, unknown>,
): AuditLog {
  return createAuditEntry(
    'ACCESS_DENIED',
    entityType,
    entityId,
    staffId,
    staffName,
    {
      attemptedAction: action,
      denialReason: reason,
      ...details,
    },
  );
}

/**
 * Log password/PIN change
 */
export function logCredentialChange(
  action: 'PASSWORD_CHANGED' | 'PIN_RESET',
  staffId: number,
  staffName: string,
  details?: {
    changedBy?: number;
    changedByName?: string;
    reason?: string;
    resetTokenUsed?: boolean;
  },
): AuditLog {
  return createAuditEntry(action, 'credentials', staffId, staffId, staffName, {
    ...details,
    changeTimestamp: new Date().toISOString(),
  });
}

// ============================================================================
// Data Export Logging
// ============================================================================

/**
 * Log data export
 */
export function logDataExport(
  staffId: number,
  staffName: string,
  details: {
    exportType: string;
    exportFormat: string;
    recordCount: number;
    dateRange?: { from: string; to: string };
    filters?: Record<string, unknown>;
    destination: string;
    reason: string;
    approvedBy?: string;
  },
): AuditLog {
  return createAuditEntry('DATA_EXPORT', 'data_export', 0, staffId, staffName, {
    ...details,
    exportTimestamp: new Date().toISOString(),
  });
}

/**
 * Log report generation
 */
export function logReportGeneration(
  staffId: number,
  staffName: string,
  details: {
    reportType: string;
    dateRange?: { from: string; to: string };
    filters?: Record<string, unknown>;
    format: string;
  },
): AuditLog {
  return createAuditEntry('REPORT_GENERATE', 'report', 0, staffId, staffName, {
    ...details,
    generationTimestamp: new Date().toISOString(),
  });
}

/**
 * Log audit trail export (meta-auditing)
 */
export function logAuditExport(
  staffId: number,
  staffName: string,
  details: {
    dateRange: { from: string; to: string };
    filters?: Record<string, unknown>;
    reason: string;
  },
): AuditLog {
  return createAuditEntry('AUDIT_EXPORT', 'audit_log', 0, staffId, staffName, {
    ...details,
    exportTimestamp: new Date().toISOString(),
  });
}

// ============================================================================
// Settings Change Logging
// ============================================================================

/**
 * Log settings changes
 */
export function logSettingsChange(
  staffId: number,
  staffName: string,
  details: {
    category: string;
    settingKey: string;
    oldValue: unknown;
    newValue: unknown;
    reason?: string;
  },
): AuditLog {
  return createAuditEntry(
    'SETTINGS_CHANGE',
    'settings',
    0,
    staffId,
    staffName,
    {
      ...details,
      changeTimestamp: new Date().toISOString(),
    },
  );
}

/**
 * Log user management changes
 */
export function logUserManagement(
  action:
    | 'USER_CREATE'
    | 'USER_UPDATE'
    | 'USER_DELETE'
    | 'USER_ENABLE'
    | 'USER_DISABLE'
    | 'ROLE_CHANGE',
  targetUserId: number,
  targetUserName: string,
  performedById: number,
  performedByName: string,
  details?: {
    changes?: Record<string, { old: unknown; new: unknown }>;
    reason?: string;
  },
): AuditLog {
  return createAuditEntry(
    action,
    'staff_member',
    targetUserId,
    performedById,
    performedByName,
    {
      targetUserName,
      ...details,
      actionTimestamp: new Date().toISOString(),
    },
  );
}

// ============================================================================
// Security Event Logging
// ============================================================================

/**
 * Log encryption events
 */
export function logEncryptionEvent(
  action:
    | 'ENCRYPTION_SETUP'
    | 'ENCRYPTION_UNLOCK'
    | 'ENCRYPTION_LOCK'
    | 'ENCRYPTION_KEY_ROTATION',
  staffId: number | null,
  staffName: string | null,
  details?: {
    keyVersion?: number;
    rotationReason?: string;
  },
): AuditLog {
  return createAuditEntry(action, 'encryption', 0, staffId, staffName, {
    ...details,
    eventTimestamp: new Date().toISOString(),
  });
}

/**
 * Log backup operations
 */
export function logBackupOperation(
  action: 'BACKUP_CREATE' | 'BACKUP_RESTORE',
  staffId: number,
  staffName: string,
  details: {
    backupId?: string;
    backupSize?: number;
    success: boolean;
    errorMessage?: string;
    reason?: string;
  },
): AuditLog {
  return createAuditEntry(action, 'backup', 0, staffId, staffName, {
    ...details,
    operationTimestamp: new Date().toISOString(),
  });
}

/**
 * Log integrity violations
 */
export function logIntegrityViolation(
  entityType: string,
  entityId: number,
  details: {
    violationType: string;
    description: string;
    expectedValue?: unknown;
    actualValue?: unknown;
    checksumExpected?: string;
    checksumActual?: string;
  },
): AuditLog {
  return createAuditEntry(
    'INTEGRITY_VIOLATION',
    entityType,
    entityId,
    null,
    'SYSTEM',
    {
      ...details,
      detectionTimestamp: new Date().toISOString(),
    },
  );
}

// ============================================================================
// Audit Log Query Functions
// ============================================================================

/**
 * Search audit log
 */
export function searchAuditLog(
  options: {
    page?: number;
    pageSize?: number;
    action?: string;
    entityType?: string;
    entityId?: number;
    staffId?: number;
    dateFrom?: string;
    dateTo?: string;
  } = {},
): SearchResult<AuditLog> {
  const db = getDatabase();

  const page = options.page || 1;
  const pageSize = options.pageSize || 50;
  const offset = (page - 1) * pageSize;

  let whereClause = 'WHERE 1=1';
  const params: (string | number)[] = [];

  if (options.action) {
    whereClause += ' AND action = ?';
    params.push(options.action);
  }
  if (options.entityType) {
    whereClause += ' AND entity_type = ?';
    params.push(options.entityType);
  }
  if (options.entityId) {
    whereClause += ' AND entity_id = ?';
    params.push(options.entityId);
  }
  if (options.staffId) {
    whereClause += ' AND staff_id = ?';
    params.push(options.staffId);
  }
  if (options.dateFrom) {
    whereClause += ' AND timestamp >= ?';
    params.push(options.dateFrom);
  }
  if (options.dateTo) {
    whereClause += ' AND timestamp <= ?';
    params.push(options.dateTo);
  }

  // Get count
  const countResult = db
    .prepare(
      `
    SELECT COUNT(*) as total FROM audit_log ${whereClause}
  `,
    )
    .get(...params) as { total: number };

  // Get data
  const data = db
    .prepare(
      `
    SELECT * FROM audit_log 
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `,
    )
    .all(...params, pageSize, offset) as AuditLog[];

  return {
    data,
    total: countResult.total,
    page,
    pageSize,
  };
}

/**
 * Get audit trail for a specific entity
 */
export function getEntityAuditTrail(
  entityType: string,
  entityId: number,
): AuditLog[] {
  const db = getDatabase();
  return db
    .prepare(
      `
    SELECT * FROM audit_log 
    WHERE entity_type = ? AND entity_id = ?
    ORDER BY timestamp DESC
  `,
    )
    .all(entityType, entityId) as AuditLog[];
}

/**
 * Verify audit log integrity
 * Checks that checksums form a valid chain
 */
export function verifyAuditIntegrity(): { valid: boolean; errors: string[] } {
  const db = getDatabase();
  const errors: string[] = [];

  const entries = db
    .prepare(
      `
    SELECT * FROM audit_log ORDER BY id ASC
  `,
    )
    .all() as AuditLog[];

  if (entries.length === 0) {
    return { valid: true, errors: [] };
  }

  let previousChecksum: string | null = null;

  for (const entry of entries) {
    const dataString = JSON.stringify({
      action: entry.action,
      entityType: entry.entity_type,
      entityId: entry.entity_id,
      staffId: entry.staff_id,
      staffName: entry.staff_name,
      timestamp: entry.timestamp,
      details: JSON.parse(entry.details),
    });

    const expectedChecksum = calculateChecksum(
      dataString,
      previousChecksum || undefined,
    );

    if (entry.checksum !== expectedChecksum) {
      errors.push(
        `Checksum mismatch at entry ${entry.id}: expected ${expectedChecksum}, got ${entry.checksum}`,
      );
    }

    previousChecksum = entry.checksum;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get recent audit activity
 */
export function getRecentActivity(limit = 20): AuditLog[] {
  const db = getDatabase();
  return db
    .prepare(
      `
    SELECT * FROM audit_log 
    ORDER BY timestamp DESC 
    LIMIT ?
  `,
    )
    .all(limit) as AuditLog[];
}

/**
 * Export audit log for a date range (for compliance)
 */
export function exportAuditLog(dateFrom: string, dateTo: string): AuditLog[] {
  const db = getDatabase();
  return db
    .prepare(
      `
    SELECT * FROM audit_log 
    WHERE timestamp >= ? AND timestamp <= ?
    ORDER BY timestamp ASC
  `,
    )
    .all(dateFrom, dateTo) as AuditLog[];
}

// ============================================================================
// Audit Statistics
// ============================================================================

/**
 * Get audit statistics
 */
export function getAuditStats(options?: {
  dateFrom?: string;
  dateTo?: string;
}): {
  totalEntries: number;
  entriesByAction: Record<string, number>;
  entriesByStaff: Array<{
    staffId: number | null;
    staffName: string | null;
    count: number;
  }>;
  entriesByEntityType: Record<string, number>;
  failedAccessAttempts: number;
} {
  const db = getDatabase();

  let dateFilter = '';
  const params: string[] = [];

  if (options?.dateFrom) {
    dateFilter += ' AND timestamp >= ?';
    params.push(options.dateFrom);
  }
  if (options?.dateTo) {
    dateFilter += ' AND timestamp <= ?';
    params.push(options.dateTo);
  }

  // Total entries
  const totalStmt = db.prepare(
    `SELECT COUNT(*) as count FROM audit_log WHERE 1=1 ${dateFilter}`,
  );
  const { count: totalEntries } = totalStmt.get(...params) as { count: number };

  // Entries by action
  const actionStmt = db.prepare(`
    SELECT action, COUNT(*) as count 
    FROM audit_log 
    WHERE 1=1 ${dateFilter}
    GROUP BY action
  `);
  const actionRows = actionStmt.all(...params) as Array<{
    action: string;
    count: number;
  }>;
  const entriesByAction: Record<string, number> = {};
  for (const row of actionRows) {
    entriesByAction[row.action] = row.count;
  }

  // Entries by staff
  const staffStmt = db.prepare(`
    SELECT staff_id, staff_name, COUNT(*) as count 
    FROM audit_log 
    WHERE 1=1 ${dateFilter}
    GROUP BY staff_id, staff_name
    ORDER BY count DESC
  `);
  const entriesByStaff = staffStmt.all(...params) as Array<{
    staffId: number | null;
    staffName: string | null;
    count: number;
  }>;

  // Entries by entity type
  const entityStmt = db.prepare(`
    SELECT entity_type, COUNT(*) as count 
    FROM audit_log 
    WHERE 1=1 ${dateFilter}
    GROUP BY entity_type
  `);
  const entityRows = entityStmt.all(...params) as Array<{
    entity_type: string;
    count: number;
  }>;
  const entriesByEntityType: Record<string, number> = {};
  for (const row of entityRows) {
    entriesByEntityType[row.entity_type] = row.count;
  }

  // Failed access attempts
  const failedStmt = db.prepare(`
    SELECT COUNT(*) as count 
    FROM audit_log 
    WHERE action IN ('LOGIN_FAILURE', 'ACCESS_DENIED', 'ACCOUNT_LOCKED') ${dateFilter}
  `);
  const { count: failedAccessAttempts } = failedStmt.get(...params) as {
    count: number;
  };

  return {
    totalEntries,
    entriesByAction,
    entriesByStaff,
    entriesByEntityType,
    failedAccessAttempts,
  };
}

// ============================================================================
// Audit Report Generation
// ============================================================================

export interface AuditReport {
  reportId: string;
  generatedAt: string;
  generatedBy: string;
  dateRange: { from: string; to: string };
  summary: {
    totalEntries: number;
    uniqueUsers: number;
    failedAccessAttempts: number;
    dataExports: number;
  };
  details: AuditLog[];
  integrityStatus: { valid: boolean; errors: string[] };
}

/**
 * Generate comprehensive audit report
 */
export function generateAuditReport(
  dateFrom: string,
  dateTo: string,
  generatedBy: string,
  options?: {
    filterByAction?: string[];
    filterByStaffId?: number;
    includeDetails?: boolean;
  },
): AuditReport {
  const reportId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Build query filters
  let whereClause = 'WHERE timestamp >= ? AND timestamp <= ?';
  const params: (string | number)[] = [dateFrom, dateTo];

  if (options?.filterByAction && options.filterByAction.length > 0) {
    whereClause += ` AND action IN (${options.filterByAction.map(() => '?').join(',')})`;
    params.push(...options.filterByAction);
  }

  if (options?.filterByStaffId) {
    whereClause += ' AND staff_id = ?';
    params.push(options.filterByStaffId);
  }

  const db = getDatabase();

  // Get summary stats
  const totalStmt = db.prepare(
    `SELECT COUNT(*) as count FROM audit_log ${whereClause}`,
  );
  const { count: totalEntries } = totalStmt.get(...params) as { count: number };

  const uniqueUsersStmt = db.prepare(`
    SELECT COUNT(DISTINCT staff_id) as count 
    FROM audit_log 
    ${whereClause}
  `);
  const { count: uniqueUsers } = uniqueUsersStmt.get(...params) as {
    count: number;
  };

  const failedStmt = db.prepare(`
    SELECT COUNT(*) as count 
    FROM audit_log 
    WHERE timestamp >= ? AND timestamp <= ?
    AND action IN ('LOGIN_FAILURE', 'ACCESS_DENIED', 'ACCOUNT_LOCKED')
  `);
  const { count: failedAccessAttempts } = failedStmt.get(dateFrom, dateTo) as {
    count: number;
  };

  const exportStmt = db.prepare(`
    SELECT COUNT(*) as count 
    FROM audit_log 
    WHERE timestamp >= ? AND timestamp <= ?
    AND action LIKE '%EXPORT%'
  `);
  const { count: dataExports } = exportStmt.get(dateFrom, dateTo) as {
    count: number;
  };

  // Get details if requested
  let details: AuditLog[] = [];
  if (options?.includeDetails !== false) {
    const detailsStmt = db.prepare(`
      SELECT * FROM audit_log 
      ${whereClause}
      ORDER BY timestamp ASC
    `);
    details = detailsStmt.all(...params) as AuditLog[];
  }

  // Verify integrity
  const integrityStatus = verifyAuditIntegrity();

  return {
    reportId,
    generatedAt: new Date().toISOString(),
    generatedBy,
    dateRange: { from: dateFrom, to: dateTo },
    summary: {
      totalEntries,
      uniqueUsers,
      failedAccessAttempts,
      dataExports,
    },
    details,
    integrityStatus,
  };
}

/**
 * Export audit report to CSV
 */
export function exportAuditReportToCSV(report: AuditReport): string {
  const headers = [
    'ID',
    'Timestamp',
    'Action',
    'Staff ID',
    'Staff Name',
    'Entity Type',
    'Entity ID',
    'Details',
    'Checksum',
  ];

  const rows = report.details.map((entry) => [
    entry.id,
    entry.timestamp,
    entry.action,
    entry.staff_id || '',
    entry.staff_name || '',
    entry.entity_type,
    entry.entity_id?.toString() || '',
    entry.details,
    entry.checksum,
  ]);

  // Escape and quote fields
  const escapeField = (field: string): string => {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  const csvLines = [
    headers.join(','),
    ...rows.map((row) => row.map(String).map(escapeField).join(',')),
  ];

  return csvLines.join('\n');
}

/**
 * Export audit report to JSON
 */
export function exportAuditReportToJSON(report: AuditReport): string {
  return JSON.stringify(report, null, 2);
}

export default {
  // Core functions
  createAuditEntry,
  getAuditEntryById,
  searchAuditLog,
  getEntityAuditTrail,
  verifyAuditIntegrity,
  getRecentActivity,
  exportAuditLog,

  // Patient logging
  logPatientAccess,
  logPatientExport,

  // Dispensing logging
  logDispensingActivity,
  logDispensingExport,

  // Inventory logging
  logInventoryChange,
  logInventoryAccess,
  logInventoryExport,

  // Authentication logging
  logAuthentication,
  logFailedAccess,
  logCredentialChange,

  // Export logging
  logDataExport,
  logReportGeneration,
  logAuditExport,

  // Settings logging
  logSettingsChange,
  logUserManagement,

  // Security logging
  logEncryptionEvent,
  logBackupOperation,
  logIntegrityViolation,

  // Statistics and reports
  getAuditStats,
  generateAuditReport,
  exportAuditReportToCSV,
  exportAuditReportToJSON,
};
