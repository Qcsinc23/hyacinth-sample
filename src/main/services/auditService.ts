/**
 * Audit Service
 * 
 * Manages audit logging with tamper-evident checksums
 * using SHA-256 hashing for compliance.
 */

import log from 'electron-log';
import { createHash } from 'crypto';
import { getDatabase } from '../database/db';

/**
 * Audit log entry interface
 */
export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  userId: string | null;
  userName: string | null;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
  checksum: string;
  ipAddress: string | null;
}

/**
 * Audit log creation data
 */
export interface AuditLogData {
  action: string;
  userId?: string;
  userName?: string;
  entityType?: string;
  entityId?: string;
  details?: unknown;
  ipAddress?: string;
}

/**
 * Generate checksum for audit entry
 * Creates a hash of the log data + previous checksum for chain integrity
 */
const generateChecksum = (
  entry: Omit<AuditLog, 'id' | 'checksum'>,
  previousChecksum: string | null
): string => {
  const data = JSON.stringify({
    timestamp: entry.timestamp,
    action: entry.action,
    userId: entry.userId,
    userName: entry.userName,
    entityType: entry.entityType,
    entityId: entry.entityId,
    details: entry.details,
    previousChecksum,
  });
  
  return createHash('sha256').update(data).digest('hex');
};

/**
 * Get the last audit log checksum for chain integrity
 */
const getPreviousChecksum = (): string | null => {
  try {
    const db = getDatabase();
    const stmt = db.prepare(
      'SELECT checksum FROM audit_log ORDER BY timestamp DESC LIMIT 1'
    );
    const result = stmt.get() as { checksum: string } | undefined;
    return result?.checksum || null;
  } catch (error) {
    log.error('Failed to get previous checksum:', error);
    return null;
  }
};

/**
 * Create an audit log entry
 */
export const logAudit = (
  action: string,
  details?: unknown,
  options?: {
    userId?: string;
    userName?: string;
    entityType?: string;
    entityId?: string;
    ipAddress?: string;
  }
): AuditLog => {
  try {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const previousChecksum = getPreviousChecksum();
    
    const entry: Omit<AuditLog, 'id' | 'checksum'> = {
      timestamp,
      action,
      userId: options?.userId || null,
      userName: options?.userName || null,
      entityType: options?.entityType || null,
      entityId: options?.entityId || null,
      details: details ? JSON.stringify(details) : null,
      ipAddress: options?.ipAddress || null,
    };
    
    const checksum = generateChecksum(entry, previousChecksum);
    
    const stmt = db.prepare(`
      INSERT INTO audit_log (
        id, timestamp, action, userId, userName, entityType, entityId, 
        details, checksum, ipAddress
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      entry.timestamp,
      entry.action,
      entry.userId,
      entry.userName,
      entry.entityType,
      entry.entityId,
      entry.details,
      checksum,
      entry.ipAddress
    );
    
    return {
      id,
      ...entry,
      checksum,
    };
  } catch (error) {
    log.error('Failed to create audit log:', error);
    throw error;
  }
};

/**
 * Get audit logs with optional filtering
 */
export const getAuditLogs = (options?: {
  startDate?: string;
  endDate?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}): { logs: AuditLog[]; total: number } => {
  try {
    const db = getDatabase();
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    
    if (options?.startDate) {
      conditions.push('timestamp >= ?');
      params.push(options.startDate);
    }
    
    if (options?.endDate) {
      conditions.push('timestamp <= ?');
      params.push(options.endDate);
    }
    
    if (options?.action) {
      conditions.push('action = ?');
      params.push(options.action);
    }
    
    if (options?.entityType) {
      conditions.push('entityType = ?');
      params.push(options.entityType);
    }
    
    if (options?.entityId) {
      conditions.push('entityId = ?');
      params.push(options.entityId);
    }
    
    if (options?.userId) {
      conditions.push('userId = ?');
      params.push(options.userId);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count
    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM audit_log ${whereClause}`);
    const { count } = countStmt.get(...params) as { count: number };
    
    // Get logs
    let sql = `SELECT * FROM audit_log ${whereClause} ORDER BY timestamp DESC`;
    
    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }
    
    if (options?.offset) {
      sql += ' OFFSET ?';
      params.push(options.offset);
    }
    
    const stmt = db.prepare(sql);
    const logs = stmt.all(...params) as AuditLog[];
    
    return { logs, total: count };
  } catch (error) {
    log.error('Failed to get audit logs:', error);
    throw error;
  }
};

/**
 * Verify audit log integrity
 * Checks that all checksums are valid and the chain is unbroken
 */
export const verifyAuditIntegrity = (): {
  valid: boolean;
  totalEntries: number;
  invalidEntries: number;
  firstInvalidId: string | null;
} => {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM audit_log ORDER BY timestamp ASC');
    const logs = stmt.all() as AuditLog[];
    
    let previousChecksum: string | null = null;
    let invalidCount = 0;
    let firstInvalidId: string | null = null;
    
    for (const log of logs) {
      const entry: Omit<AuditLog, 'id' | 'checksum'> = {
        timestamp: log.timestamp,
        action: log.action,
        userId: log.userId,
        userName: log.userName,
        entityType: log.entityType,
        entityId: log.entityId,
        details: log.details,
        ipAddress: log.ipAddress,
      };
      
      const expectedChecksum = generateChecksum(entry, previousChecksum);
      
      if (expectedChecksum !== log.checksum) {
        invalidCount++;
        if (!firstInvalidId) {
          firstInvalidId = log.id;
        }
      }
      
      previousChecksum = log.checksum;
    }
    
    return {
      valid: invalidCount === 0,
      totalEntries: logs.length,
      invalidEntries: invalidCount,
      firstInvalidId,
    };
  } catch (error) {
    log.error('Failed to verify audit integrity:', error);
    throw error;
  }
};

/**
 * Export audit logs to CSV format
 */
export const exportAuditLogsToCSV = (options?: Parameters<typeof getAuditLogs>[0]): string => {
  const { logs } = getAuditLogs(options);
  
  const headers = [
    'ID',
    'Timestamp',
    'Action',
    'User ID',
    'User Name',
    'Entity Type',
    'Entity ID',
    'Details',
    'Checksum',
    'IP Address',
  ];
  
  const rows = logs.map(log => [
    log.id,
    log.timestamp,
    log.action,
    log.userId || '',
    log.userName || '',
    log.entityType || '',
    log.entityId || '',
    log.details || '',
    log.checksum,
    log.ipAddress || '',
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
    ...rows.map(row => row.map(String).map(escapeField).join(',')),
  ];
  
  return csvLines.join('\n');
};

/**
 * Get audit statistics
 */
export const getAuditStats = (): {
  totalEntries: number;
  entriesToday: number;
  entriesThisWeek: number;
  entriesThisMonth: number;
  actions: Record<string, number>;
} => {
  try {
    const db = getDatabase();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM audit_log');
    const todayStmt = db.prepare('SELECT COUNT(*) as count FROM audit_log WHERE timestamp >= ?');
    const weekStmt = db.prepare('SELECT COUNT(*) as count FROM audit_log WHERE timestamp >= ?');
    const monthStmt = db.prepare('SELECT COUNT(*) as count FROM audit_log WHERE timestamp >= ?');
    
    const actionsStmt = db.prepare(`
      SELECT action, COUNT(*) as count 
      FROM audit_log 
      GROUP BY action
    `);
    
    const total = (totalStmt.get() as { count: number }).count;
    const entriesToday = (todayStmt.get(today) as { count: number }).count;
    const entriesThisWeek = (weekStmt.get(weekAgo) as { count: number }).count;
    const entriesThisMonth = (monthStmt.get(monthAgo) as { count: number }).count;
    
    const actionRows = actionsStmt.all() as Array<{ action: string; count: number }>;
    const actions: Record<string, number> = {};
    for (const row of actionRows) {
      actions[row.action] = row.count;
    }
    
    return {
      totalEntries: total,
      entriesToday,
      entriesThisWeek,
      entriesThisMonth,
      actions,
    };
  } catch (error) {
    log.error('Failed to get audit stats:', error);
    throw error;
  }
};

/**
 * Purge old audit logs
 */
export const purgeOldAuditLogs = (daysToKeep: number): number => {
  try {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const stmt = db.prepare('DELETE FROM audit_log WHERE timestamp < ?');
    const result = stmt.run(cutoffDate.toISOString());
    
    log.info(`Purged ${result.changes} old audit logs`);
    return result.changes;
  } catch (error) {
    log.error('Failed to purge old audit logs:', error);
    throw error;
  }
};
