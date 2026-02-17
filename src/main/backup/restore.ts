/**
 * Restore from Backup
 *
 * Handles restoring the database from a backup file.
 */

import path from 'path';
import fs from 'fs';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import log from 'electron-log';
import { dialog, app } from 'electron';
import { generateFileChecksum } from './backup';
import { getDbPath } from '../database/db';

/**
 * Restore result
 */
export interface RestoreResult {
  success: boolean;
  message: string;
  backupInfo?: {
    path: string;
    size: number;
    createdAt: string;
  };
}

/**
 * Restore database from backup
 */
export const restoreFromBackup = async (
  backupPath: string,
  options?: {
    verifyChecksum?: boolean;
    currentDbPath?: string;
  },
): Promise<RestoreResult> => {
  const verifyChecksum = options?.verifyChecksum ?? true;
  const currentDbPath = options?.currentDbPath || getDefaultDbPath();

  log.info(`Starting restore from: ${backupPath}`);

  try {
    // Verify backup file exists
    if (!fs.existsSync(backupPath)) {
      return {
        success: false,
        message: 'Backup file not found',
      };
    }

    // Verify checksum if requested
    if (verifyChecksum) {
      const checksumPath = `${backupPath}.sha256`;

      if (fs.existsSync(checksumPath)) {
        const expectedChecksum = fs.readFileSync(checksumPath, 'utf-8').trim();
        const actualChecksum = await generateFileChecksum(backupPath);

        if (actualChecksum !== expectedChecksum) {
          return {
            success: false,
            message: 'Backup file checksum mismatch. File may be corrupted.',
          };
        }

        log.info('Backup checksum verified');
      } else {
        log.warn('No checksum file found for backup');
      }
    }

    // Get backup info before restore
    const stats = fs.statSync(backupPath);
    const backupInfo = {
      path: backupPath,
      size: stats.size,
      createdAt: stats.mtime.toISOString(),
    };

    // Create timestamped backup of current database before restore
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const currentBackupPath = `${currentDbPath}.pre-restore-${timestamp}`;

    if (fs.existsSync(currentDbPath)) {
      fs.copyFileSync(currentDbPath, currentBackupPath);
      log.info(`Current database backed up to: ${currentBackupPath}`);
    }

    // Handle compressed backups
    let sourcePath = backupPath;
    let needsCleanup = false;

    if (backupPath.endsWith('.gz')) {
      const tempPath = path.join(
        path.dirname(currentDbPath),
        `temp_restore_${Date.now()}.db`,
      );

      await decompressFile(backupPath, tempPath);
      sourcePath = tempPath;
      needsCleanup = true;

      log.info('Backup decompressed');
    }

    // Verify the decompressed file is a valid SQLite database
    try {
      const testDb = require('better-sqlite3')(sourcePath, { readonly: true });

      // Test query
      testDb.prepare('SELECT 1').get();

      // Verify tables
      const tables = testDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as Array<{ name: string }>;

      const tableNames = tables.map((t) => t.name);
      log.info(`Backup contains tables: ${tableNames.join(', ')}`);

      testDb.close();
    } catch (error) {
      if (needsCleanup && fs.existsSync(sourcePath)) {
        fs.unlinkSync(sourcePath);
      }

      return {
        success: false,
        message: `Backup file is not a valid database: ${(error as Error).message}`,
      };
    }

    // Copy backup to current database location
    fs.copyFileSync(sourcePath, currentDbPath);

    // Clean up temporary files
    if (needsCleanup && fs.existsSync(sourcePath)) {
      fs.unlinkSync(sourcePath);
    }

    log.info('Database restored successfully');

    return {
      success: true,
      message:
        'Database restored successfully. Please restart the application.',
      backupInfo,
    };
  } catch (error) {
    log.error('Restore failed:', error);

    return {
      success: false,
      message: `Restore failed: ${(error as Error).message}`,
    };
  }
};

/**
 * Decompress a gzipped file
 */
const decompressFile = async (
  sourcePath: string,
  destPath: string,
): Promise<void> => {
  const source = fs.createReadStream(sourcePath);
  const destination = fs.createWriteStream(destPath);
  const gunzip = createGunzip();

  await pipeline(source, gunzip, destination);
};

/**
 * Get default database path (must match db.ts so restore overwrites the live DB).
 */
const getDefaultDbPath = (): string => getDbPath();

/**
 * Show restore dialog and restore from selected file
 */
export const showRestoreDialog = async (): Promise<RestoreResult> => {
  const result = await dialog.showOpenDialog({
    title: 'Select Backup File',
    defaultPath: app.getPath('userData'),
    filters: [
      { name: 'Database Backups', extensions: ['db', 'gz'] },
      { name: 'SQLite Databases', extensions: ['db'] },
      { name: 'Compressed Backups', extensions: ['gz'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return {
      success: false,
      message: 'Restore cancelled',
    };
  }

  const backupPath = result.filePaths[0];

  // Confirm restore
  const confirmResult = await dialog.showMessageBox({
    type: 'warning',
    buttons: ['Cancel', 'Restore'],
    defaultId: 0,
    cancelId: 0,
    title: 'Confirm Restore',
    message: 'Are you sure you want to restore from backup?',
    detail:
      'This will replace your current database with the backup. ' +
      'A backup of your current database will be created first. ' +
      'The application will need to restart after restore.',
  });

  if (confirmResult.response === 0) {
    return {
      success: false,
      message: 'Restore cancelled',
    };
  }

  return restoreFromBackup(backupPath);
};

/**
 * Validate a backup file without restoring
 */
export const validateBackup = async (
  backupPath: string,
): Promise<{
  valid: boolean;
  message: string;
  details?: {
    size: number;
    tables: string[];
    recordCounts: Record<string, number>;
  };
}> => {
  try {
    if (!fs.existsSync(backupPath)) {
      return {
        valid: false,
        message: 'Backup file not found',
      };
    }

    const stats = fs.statSync(backupPath);

    if (stats.size === 0) {
      return {
        valid: false,
        message: 'Backup file is empty',
      };
    }

    // Handle compressed backups
    let sourcePath = backupPath;
    let needsCleanup = false;

    if (backupPath.endsWith('.gz')) {
      const tempPath = path.join(
        app.getPath('temp'),
        `validate_${Date.now()}.db`,
      );

      await decompressFile(backupPath, tempPath);
      sourcePath = tempPath;
      needsCleanup = true;
    }

    try {
      const testDb = require('better-sqlite3')(sourcePath, { readonly: true });

      // Get tables
      const tables = testDb
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        )
        .all() as Array<{ name: string }>;

      const tableNames = tables.map((t) => t.name);

      // Get record counts
      const recordCounts: Record<string, number> = {};
      for (const table of tableNames) {
        try {
          const count = testDb
            .prepare(`SELECT COUNT(*) as count FROM "${table}"`)
            .get() as { count: number };
          recordCounts[table] = count.count;
        } catch {
          recordCounts[table] = -1;
        }
      }

      testDb.close();

      const requiredTables = [
        'patients',
        'staff_members',
        'dispensing_records',
        'dispensing_line_items',
        'record_reasons',
        'inventory',
        'inventory_transactions',
        'inventory_alerts',
        'audit_log',
        'app_settings',
      ];
      const missingTables = requiredTables.filter(
        (t) => !tableNames.includes(t),
      );

      if (missingTables.length > 0) {
        return {
          valid: false,
          message: `Backup is missing required tables: ${missingTables.join(', ')}`,
          details: {
            size: stats.size,
            tables: tableNames,
            recordCounts,
          },
        };
      }

      return {
        valid: true,
        message: 'Backup is valid',
        details: {
          size: stats.size,
          tables: tableNames,
          recordCounts,
        },
      };
    } finally {
      if (needsCleanup && fs.existsSync(sourcePath)) {
        fs.unlinkSync(sourcePath);
      }
    }
  } catch (error) {
    return {
      valid: false,
      message: `Backup validation failed: ${(error as Error).message}`,
    };
  }
};

/**
 * Alias for restoreFromBackup for consistent naming
 */
export { restoreFromBackup as restoreBackup };
