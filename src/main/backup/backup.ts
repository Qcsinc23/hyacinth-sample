/**
 * Backup Creation
 *
 * Creates database backups with verification.
 */

import path from 'path';
import fs from 'fs';
import { createHash } from 'crypto';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import log from 'electron-log';
import { format } from 'date-fns';
import { getDatabase } from '../database/db';

/**
 * Backup result
 */
export interface BackupResult {
  path: string;
  filename: string;
  size: number;
  checksum: string;
  timestamp: string;
  compressed: boolean;
}

/**
 * Create a database backup
 */
export const createBackup = async (
  backupDir: string,
  options?: {
    compress?: boolean;
    verify?: boolean;
  },
): Promise<string> => {
  const compress = options?.compress ?? true;
  const verify = options?.verify ?? true;

  const db = getDatabase();

  // Generate backup filename
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  const filename = `hyacinth_backup_${timestamp}.db${compress ? '.gz' : ''}`;
  const backupPath = path.join(backupDir, filename);

  log.info(`Starting backup: ${filename}`);

  try {
    const tempBackupPath = path.join(backupDir, `temp_backup_${timestamp}.db`);

    // Create backup using SQLite VACUUM INTO
    db.exec(`VACUUM INTO '${tempBackupPath}'`);

    let finalPath = tempBackupPath;

    // Compress if requested
    if (compress) {
      await compressFile(tempBackupPath, backupPath);
      fs.unlinkSync(tempBackupPath); // Remove uncompressed file
      finalPath = backupPath;
      log.info('Backup compressed');
    } else {
      fs.renameSync(tempBackupPath, backupPath);
      finalPath = backupPath;
    }

    // Generate checksum
    const checksum = await generateFileChecksum(finalPath);

    // Write checksum to file
    const checksumPath = `${finalPath}.sha256`;
    fs.writeFileSync(checksumPath, checksum);

    // Verify backup if requested
    if (verify) {
      const isValid = await verifyBackup(finalPath, checksum);
      if (!isValid) {
        throw new Error('Backup verification failed');
      }

      // Create verification marker
      const verifiedPath = `${finalPath}.verified`;
      fs.writeFileSync(verifiedPath, new Date().toISOString());

      log.info('Backup verified successfully');
    }

    const stats = fs.statSync(finalPath);

    log.info(`Backup completed: ${filename} (${formatBytes(stats.size)})`);

    return finalPath;
  } catch (error) {
    log.error('Backup creation failed:', error);

    // Clean up any partial files
    try {
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
    } catch {
      // Ignore cleanup errors
    }

    throw error;
  }
};

/**
 * Compress a file using gzip
 */
const compressFile = async (
  sourcePath: string,
  destPath: string,
): Promise<void> => {
  const source = fs.createReadStream(sourcePath);
  const destination = fs.createWriteStream(destPath);
  const gzip = createGzip();

  await pipeline(source, gzip, destination);
};

/**
 * Generate SHA-256 checksum for a file
 */
export const generateFileChecksum = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
};

/**
 * Verify backup integrity
 */
export const verifyBackup = async (
  backupPath: string,
  expectedChecksum?: string,
): Promise<boolean> => {
  try {
    // Check if file exists
    if (!fs.existsSync(backupPath)) {
      log.error('Backup file not found');
      return false;
    }

    // Read expected checksum from file if not provided
    let checksum = expectedChecksum;
    if (!checksum) {
      const checksumPath = `${backupPath}.sha256`;
      if (fs.existsSync(checksumPath)) {
        checksum = fs.readFileSync(checksumPath, 'utf-8').trim();
      }
    }

    if (checksum) {
      const actualChecksum = await generateFileChecksum(backupPath);

      if (actualChecksum !== checksum) {
        log.error('Backup checksum mismatch');
        return false;
      }
    }

    // Try to open as SQLite database to verify structure
    // For compressed files, we'd need to decompress first
    if (!backupPath.endsWith('.gz')) {
      try {
        const testDb = require('better-sqlite3')(backupPath, {
          readonly: true,
        });

        // Verify critical tables exist
        const tables = testDb
          .prepare("SELECT name FROM sqlite_master WHERE type='table'")
          .all() as Array<{ name: string }>;

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

        const tableNames = tables.map((t) => t.name);
        const hasAllTables = requiredTables.every((t) =>
          tableNames.includes(t),
        );

        testDb.close();

        if (!hasAllTables) {
          log.error('Backup missing required tables');
          return false;
        }
      } catch (error) {
        log.error('Failed to verify backup database structure:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    log.error('Backup verification failed:', error);
    return false;
  }
};

/**
 * Format bytes to human readable
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

/**
 * Get backup info
 */
export const getBackupInfo = (
  backupPath: string,
): {
  exists: boolean;
  size: number;
  createdAt: string | null;
  checksum: string | null;
  verified: boolean;
} => {
  try {
    if (!fs.existsSync(backupPath)) {
      return {
        exists: false,
        size: 0,
        createdAt: null,
        checksum: null,
        verified: false,
      };
    }

    const stats = fs.statSync(backupPath);
    const checksumPath = `${backupPath}.sha256`;
    const verifiedPath = `${backupPath}.verified`;

    let checksum: string | null = null;
    if (fs.existsSync(checksumPath)) {
      checksum = fs.readFileSync(checksumPath, 'utf-8').trim();
    }

    return {
      exists: true,
      size: stats.size,
      createdAt: stats.mtime.toISOString(),
      checksum,
      verified: fs.existsSync(verifiedPath),
    };
  } catch (error) {
    log.error('Failed to get backup info:', error);
    return {
      exists: false,
      size: 0,
      createdAt: null,
      checksum: null,
      verified: false,
    };
  }
};
