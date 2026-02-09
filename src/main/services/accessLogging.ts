/**
 * Access Logging Service
 * 
 * Comprehensive logging of all data access, authentication attempts,
 * data exports, and settings changes for HIPAA compliance.
 */

import log from 'electron-log';
import { getDatabase } from '../database/db';
import * as crypto from 'crypto';

// Access log entry types
export type AccessAction = 
  // Authentication
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'SESSION_EXPIRED'
  | 'ACCOUNT_LOCKED'
  | 'PASSWORD_CHANGED'
  | 'PIN_RESET'
  // Patient Data Access
  | 'PATIENT_VIEW'
  | 'PATIENT_SEARCH'
  | 'PATIENT_CREATE'
  | 'PATIENT_UPDATE'
  | 'PATIENT_DELETE'
  // Medication Dispensing
  | 'DISPENSE_CREATE'
  | 'DISPENSE_VIEW'
  | 'DISPENSE_VOID'
  | 'DISPENSE_CORRECT'
  | 'DISPENSE_PRINT'
  // Inventory
  | 'INVENTORY_VIEW'
  | 'INVENTORY_RECEIVE'
  | 'INVENTORY_ADJUST'
  | 'INVENTORY_WASTE'
  | 'INVENTORY_TRANSFER'
  // Data Exports
  | 'DATA_EXPORT'
  | 'REPORT_GENERATE'
  | 'AUDIT_EXPORT'
  // Settings
  | 'SETTINGS_VIEW'
  | 'SETTINGS_CHANGE'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'USER_ROLE_CHANGE'
  // Security
  | 'ENCRYPTION_UNLOCK'
  | 'ENCRYPTION_LOCK'
  | 'BACKUP_CREATE'
  | 'BACKUP_RESTORE';

interface AccessLogEntry {
  id: string;
  timestamp: string;
  action: AccessAction;
  staffId: number | null;
  staffName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, unknown>;
  success: boolean;
  failureReason?: string;
  checksum: string;
}

// Buffer for batch insert
const LOG_BUFFER_SIZE = 50;
let logBuffer: AccessLogEntry[] = [];

/**
 * Generate unique log ID
 */
function generateLogId(): string {
  return `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate checksum for tamper-evidence
 */
function calculateChecksum(entry: Omit<AccessLogEntry, 'id' | 'checksum'>): string {
  const data = JSON.stringify({
    timestamp: entry.timestamp,
    action: entry.action,
    staffId: entry.staffId,
    staffName: entry.staffName,
    ipAddress: entry.ipAddress,
    entityType: entry.entityType,
    entityId: entry.entityId,
    details: entry.details,
    success: entry.success,
    failureReason: entry.failureReason,
  });
  
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Log a data access event
 */
export function logDataAccess(
  action: AccessAction,
  entityType: string,
  entityId: string | number,
  staffId: number,
  staffName: string,
  details?: Record<string, unknown>
): void {
  logAccessEvent({
    action,
    entityType,
    entityId: String(entityId),
    staffId,
    staffName,
    details: details || {},
    success: true,
  });
}

/**
 * Log an authentication event
 */
export function logAuthentication(
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'ACCOUNT_LOCKED',
  staffId: number | null,
  staffName: string | null,
  options?: {
    success?: boolean;
    failureReason?: string;
    ipAddress?: string;
    attempts?: number;
    lockedUntil?: string;
  }
): void {
  logAccessEvent({
    action,
    staffId,
    staffName,
    entityType: 'authentication',
    entityId: staffId ? String(staffId) : null,
    details: {
      ipAddress: options?.ipAddress,
      attempts: options?.attempts,
      lockedUntil: options?.lockedUntil,
    },
    success: options?.success ?? (action === 'LOGIN_SUCCESS'),
    failureReason: options?.failureReason,
  });
}

/**
 * Log a failed access attempt
 */
export function logFailedAccess(
  action: AccessAction,
  staffId: number | null,
  staffName: string | null,
  entityType: string,
  entityId: string | number,
  reason: string,
  details?: Record<string, unknown>
): void {
  logAccessEvent({
    action,
    staffId,
    staffName,
    entityType,
    entityId: String(entityId),
    details: details || {},
    success: false,
    failureReason: reason,
  });
}

/**
 * Log a data export
 */
export function logDataExport(
  exportType: string,
  staffId: number,
  staffName: string,
  options: {
    recordCount?: number;
    dateRange?: { from: string; to: string };
    filters?: Record<string, unknown>;
    format?: string;
    destination?: string;
  }
): void {
  logAccessEvent({
    action: 'DATA_EXPORT',
    staffId,
    staffName,
    entityType: exportType,
    entityId: null,
    details: {
      exportType,
      recordCount: options.recordCount,
      dateRange: options.dateRange,
      filters: options.filters,
      format: options.format,
      destination: options.destination,
    },
    success: true,
  });
}

/**
 * Log a settings change
 */
export function logSettingsChange(
  settingKey: string,
  staffId: number,
  staffName: string,
  oldValue: unknown,
  newValue: unknown,
  options?: {
    category?: string;
    reason?: string;
  }
): void {
  logAccessEvent({
    action: 'SETTINGS_CHANGE',
    staffId,
    staffName,
    entityType: options?.category || 'settings',
    entityId: settingKey,
    details: {
      settingKey,
      oldValue: sanitizeForLog(oldValue),
      newValue: sanitizeForLog(newValue),
      reason: options?.reason,
    },
    success: true,
  });
}

/**
 * Log medication dispensing activity
 */
export function logMedicationDispensing(
  action: 'DISPENSE_CREATE' | 'DISPENSE_VOID' | 'DISPENSE_CORRECT',
  staffId: number,
  staffName: string,
  dispensingId: number,
  patientId: number,
  details: {
    medications: string[];
    quantities: number[];
    reasons?: string[];
    voidReason?: string;
    correctionReason?: string;
  }
): void {
  logAccessEvent({
    action,
    staffId,
    staffName,
    entityType: 'dispensing_record',
    entityId: String(dispensingId),
    details: {
      patientId,
      medications: details.medications,
      quantities: details.quantities,
      reasons: details.reasons,
      voidReason: details.voidReason,
      correctionReason: details.correctionReason,
    },
    success: true,
  });
}

/**
 * Log inventory changes
 */
export function logInventoryChange(
  action: 'INVENTORY_RECEIVE' | 'INVENTORY_ADJUST' | 'INVENTORY_WASTE' | 'INVENTORY_TRANSFER',
  staffId: number,
  staffName: string,
  inventoryId: number,
  medicationName: string,
  details: {
    lotNumber: string;
    quantityBefore: number;
    quantityChange: number;
    quantityAfter: number;
    reason?: string;
    referenceId?: number;
  }
): void {
  logAccessEvent({
    action,
    staffId,
    staffName,
    entityType: 'inventory',
    entityId: String(inventoryId),
    details: {
      medicationName,
      lotNumber: details.lotNumber,
      quantityBefore: details.quantityBefore,
      quantityChange: details.quantityChange,
      quantityAfter: details.quantityAfter,
      reason: details.reason,
      referenceId: details.referenceId,
    },
    success: true,
  });
}

/**
 * Core logging function
 */
function logAccessEvent(
  params: {
    action: AccessAction;
    staffId: number | null;
    staffName: string | null;
    entityType?: string | null;
    entityId?: string | null;
    details?: Record<string, unknown>;
    success: boolean;
    failureReason?: string;
  }
): void {
  const entry: AccessLogEntry = {
    id: generateLogId(),
    timestamp: new Date().toISOString(),
    action: params.action,
    staffId: params.staffId,
    staffName: params.staffName,
    ipAddress: null, // Would be populated in a networked environment
    userAgent: null,
    entityType: params.entityType || null,
    entityId: params.entityId || null,
    details: params.details || {},
    success: params.success,
    failureReason: params.failureReason,
    checksum: '', // Will be calculated
  };
  
  // Calculate checksum
  const { id, checksum, ...dataForChecksum } = entry;
  entry.checksum = calculateChecksum(dataForChecksum);
  
  // Add to buffer
  logBuffer.push(entry);
  
  // Log to electron-log immediately
  const status = entry.success ? 'SUCCESS' : 'FAILED';
  const entity = entry.entityType ? `${entry.entityType}:${entry.entityId}` : 'SYSTEM';
  log.info(`[AccessLog] ${entry.action} | ${status} | ${entry.staffName || 'UNKNOWN'} | ${entity}`);
  
  // Flush if buffer is full
  if (logBuffer.length >= LOG_BUFFER_SIZE) {
    flushLogBuffer();
  }
}

/**
 * Sanitize sensitive data before logging
 */
function sanitizeForLog(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  
  // Don't log sensitive values like passwords, PINs, SSNs
  const sensitivePatterns = [
    /pin/i,
    /password/i,
    /ssn/i,
    /social.security/i,
    /credit.card/i,
  ];
  
  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      const isSensitive = sensitivePatterns.some(pattern => pattern.test(key));
      sanitized[key] = isSensitive ? '[REDACTED]' : sanitizeForLog(val);
    }
    return sanitized;
  }
  
  return value;
}

/**
 * Flush log buffer to database
 */
function flushLogBuffer(): void {
  if (logBuffer.length === 0) return;
  
  try {
    const db = getDatabase();
    const insertStmt = db.prepare(`
      INSERT INTO access_log (
        id, timestamp, action, staff_id, staff_name, ip_address, user_agent,
        entity_type, entity_id, details, success, failure_reason, checksum
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertMany = db.transaction((entries: AccessLogEntry[]) => {
      for (const entry of entries) {
        insertStmt.run(
          entry.id,
          entry.timestamp,
          entry.action,
          entry.staffId,
          entry.staffName,
          entry.ipAddress,
          entry.userAgent,
          entry.entityType,
          entry.entityId,
          JSON.stringify(entry.details),
          entry.success ? 1 : 0,
          entry.failureReason || null,
          entry.checksum
        );
      }
    });
    
    insertMany(logBuffer);
    log.info(`[AccessLog] Flushed ${logBuffer.length} entries to database`);
    
    logBuffer = [];
  } catch (error) {
    log.error('[AccessLog] Failed to flush log buffer:', error);
    // Keep buffer for retry
  }
}

/**
 * Get access logs with filtering
 */
export function getAccessLogs(filters?: {
  staffId?: number;
  action?: AccessAction;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  success?: boolean;
  limit?: number;
  offset?: number;
}): { logs: AccessLogEntry[]; total: number } {
  try {
    flushLogBuffer(); // Ensure all logs are persisted
    
    const db = getDatabase();
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    
    if (filters?.staffId !== undefined) {
      conditions.push('staff_id = ?');
      params.push(filters.staffId);
    }
    
    if (filters?.action) {
      conditions.push('action = ?');
      params.push(filters.action);
    }
    
    if (filters?.entityType) {
      conditions.push('entity_type = ?');
      params.push(filters.entityType);
    }
    
    if (filters?.startDate) {
      conditions.push('timestamp >= ?');
      params.push(filters.startDate);
    }
    
    if (filters?.endDate) {
      conditions.push('timestamp <= ?');
      params.push(filters.endDate);
    }
    
    if (filters?.success !== undefined) {
      conditions.push('success = ?');
      params.push(filters.success ? 1 : 0);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count
    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM access_log ${whereClause}`);
    const { count } = countStmt.get(...params) as { count: number };
    
    // Get logs
    let sql = `SELECT * FROM access_log ${whereClause} ORDER BY timestamp DESC`;
    
    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }
    
    if (filters?.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }
    
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params) as Array<{
      id: string;
      timestamp: string;
      action: AccessAction;
      staff_id: number | null;
      staff_name: string | null;
      ip_address: string | null;
      user_agent: string | null;
      entity_type: string | null;
      entity_id: string | null;
      details: string;
      success: number;
      failure_reason: string | null;
      checksum: string;
    }>;
    
    const logs: AccessLogEntry[] = rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      action: row.action,
      staffId: row.staff_id,
      staffName: row.staff_name,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      entityType: row.entity_type,
      entityId: row.entity_id,
      details: JSON.parse(row.details),
      success: row.success === 1,
      failureReason: row.failure_reason || undefined,
      checksum: row.checksum,
    }));
    
    return { logs, total: count };
  } catch (error) {
    log.error('[AccessLog] Failed to get access logs:', error);
    return { logs: [], total: 0 };
  }
}

/**
 * Get failed authentication attempts
 */
export function getFailedAuthenticationAttempts(
  minutes: number = 30
): Array<{
  staffName: string | null;
  attempts: number;
  lastAttempt: string;
}> {
  try {
    const db = getDatabase();
    const cutoffTime = new Date(Date.now() - minutes * 60000).toISOString();
    
    const stmt = db.prepare(`
      SELECT 
        staff_name,
        COUNT(*) as attempts,
        MAX(timestamp) as last_attempt
      FROM access_log
      WHERE action = 'LOGIN_FAILURE'
        AND timestamp >= ?
      GROUP BY staff_name
      ORDER BY attempts DESC
    `);
    
    return stmt.all(cutoffTime) as Array<{
      staffName: string | null;
      attempts: number;
      lastAttempt: string;
    }>;
  } catch (error) {
    log.error('[AccessLog] Failed to get failed auth attempts:', error);
    return [];
  }
}

/**
 * Setup periodic log flushing
 */
export function setupAccessLogging(): void {
  // Flush logs every 30 seconds
  setInterval(() => {
    flushLogBuffer();
  }, 30000);
  
  log.info('[AccessLog] Access logging initialized');
}

/**
 * Cleanup and flush remaining logs
 */
export function cleanupAccessLogging(): void {
  flushLogBuffer();
}

export default {
  logDataAccess,
  logAuthentication,
  logFailedAccess,
  logDataExport,
  logSettingsChange,
  logMedicationDispensing,
  logInventoryChange,
  getAccessLogs,
  getFailedAuthenticationAttempts,
  setupAccessLogging,
  cleanupAccessLogging,
};
