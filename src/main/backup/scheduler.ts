/**
 * Backup Scheduler
 *
 * Manages automatic backup scheduling and execution.
 */

import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import log from 'electron-log';
import { getSetting, setSetting } from '../settings/settings';
import { createBackup } from './backup';
import type { BackupSchedule, BackupSettings } from '../../shared/types';

const DEFAULT_BACKUP_INTERVAL_HOURS = 24;
const DEFAULT_BACKUP_RETENTION_DAYS = 30;

const intervalHoursToSchedule = (intervalHours: number): BackupSchedule => {
  if (intervalHours >= 24 * 28) {
    return 'monthly';
  }
  if (intervalHours >= 24 * 7) {
    return 'weekly';
  }
  return 'daily';
};

const scheduleToIntervalHours = (schedule: BackupSchedule): number => {
  switch (schedule) {
    case 'weekly':
      return 24 * 7;
    case 'monthly':
      return 24 * 30;
    case 'daily':
    default:
      return 24;
  }
};

let backupInterval: NodeJS.Timeout | null = null;
let isSchedulerRunning = false;

/**
 * Get the backup directory path
 */
export const getBackupDirectory = (): string => {
  const userDataPath = app.getPath('userData');
  const backupDir = path.join(userDataPath, 'backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  return backupDir;
};

/**
 * Get backup settings
 */
export const getBackupSettings = (): BackupSettings => {
  const intervalHours =
    getSetting('backupIntervalHours') ?? DEFAULT_BACKUP_INTERVAL_HOURS;
  const configuredBackupDir = getSetting('backupDirectory');
  const backupDir = configuredBackupDir
    ? configuredBackupDir
    : getBackupDirectory();

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  return {
    enabled: getSetting('backupEnabled') ?? true,
    schedule: intervalHoursToSchedule(intervalHours),
    intervalHours,
    retentionDays:
      getSetting('backupRetentionDays') ?? DEFAULT_BACKUP_RETENTION_DAYS,
    lastBackup: getSetting('lastBackup') ?? null,
    backupDir,
    compress: getSetting('backupCompress') ?? true,
    verify: getSetting('backupVerify') ?? true,
  };
};

/**
 * Run a manual backup
 */
export const runManualBackup = async (): Promise<string> => {
  const settings = getBackupSettings();
  const backupPath = await createBackup(settings.backupDir, {
    compress: settings.compress,
    verify: settings.verify,
  });

  // Update last backup time
  setSetting('lastBackup', new Date().toISOString());

  // Clean up old backups
  await cleanupOldBackups();

  return backupPath;
};

/**
 * Clean up old backups based on retention policy
 */
export const cleanupOldBackups = async (): Promise<number> => {
  const settings = getBackupSettings();
  const { backupDir } = settings;
  const { retentionDays } = settings;

  if (!fs.existsSync(backupDir)) {
    return 0;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const files = fs.readdirSync(backupDir);
  let deletedCount = 0;

  for (const file of files) {
    if (!file.endsWith('.db') && !file.endsWith('.db.gz')) {
      continue;
    }

    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);

    if (stats.mtime < cutoffDate) {
      try {
        fs.unlinkSync(filePath);
        deletedCount++;
        log.info(`Deleted old backup: ${file}`);
      } catch (error) {
        log.error(`Failed to delete old backup ${file}:`, error);
      }
    }
  }

  if (deletedCount > 0) {
    log.info(`Cleaned up ${deletedCount} old backups`);
  }

  return deletedCount;
};

/**
 * List available backups
 */
export const listBackups = (): Array<{
  filename: string;
  path: string;
  size: number;
  createdAt: string;
  verified: boolean;
}> => {
  const backupDir = getBackupDirectory();

  if (!fs.existsSync(backupDir)) {
    return [];
  }

  const files = fs.readdirSync(backupDir);
  const backups: Array<{
    filename: string;
    path: string;
    size: number;
    createdAt: string;
    verified: boolean;
  }> = [];

  for (const file of files) {
    if (!file.endsWith('.db') && !file.endsWith('.db.gz')) {
      continue;
    }

    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);

    // Check for verification marker file
    const verifiedPath = `${filePath}.verified`;
    const verified = fs.existsSync(verifiedPath);

    backups.push({
      filename: file,
      path: filePath,
      size: stats.size,
      createdAt: stats.mtime.toISOString(),
      verified,
    });
  }

  // Sort by creation date (newest first)
  return backups.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

/**
 * Perform scheduled backup
 */
const performScheduledBackup = async (): Promise<void> => {
  const settings = getBackupSettings();

  if (!settings.enabled) {
    log.info('Automatic backups are disabled');
    return;
  }

  try {
    await runManualBackup();
    log.info('Scheduled backup completed successfully');
  } catch (error) {
    log.error('Scheduled backup failed:', error);
  }
};

/**
 * Start the backup scheduler
 */
export const startBackupScheduler = (): void => {
  if (isSchedulerRunning) {
    log.info('Backup scheduler is already running');
    return;
  }

  const settings = getBackupSettings();

  if (!settings.enabled) {
    log.info('Automatic backups are disabled');
    return;
  }

  // Convert hours to milliseconds
  const intervalMs = settings.intervalHours * 60 * 60 * 1000;

  // Check if we need to run a backup immediately (e.g., if we missed a scheduled backup)
  const { lastBackup } = settings;
  const now = new Date();

  if (lastBackup) {
    const lastBackupDate = new Date(lastBackup);
    const timeSinceLastBackup = now.getTime() - lastBackupDate.getTime();

    if (timeSinceLastBackup >= intervalMs) {
      // Run backup immediately since we've exceeded the interval
      performScheduledBackup();
    }
  }

  // Schedule regular backups
  backupInterval = setInterval(() => {
    performScheduledBackup();
  }, intervalMs);

  isSchedulerRunning = true;
  log.info(
    `Backup scheduler started. Interval: ${settings.intervalHours} hours`,
  );
};

/**
 * Stop the backup scheduler
 */
export const stopBackupScheduler = (): void => {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
  }

  isSchedulerRunning = false;
  log.info('Backup scheduler stopped');
};

/**
 * Update backup schedule
 */
export const updateBackupSchedule = (options: {
  enabled?: boolean;
  schedule?: BackupSchedule;
  intervalHours?: number;
  retentionDays?: number;
  backupDir?: string;
  compress?: boolean;
  verify?: boolean;
}): void => {
  if (options.enabled !== undefined) {
    setSetting('backupEnabled', options.enabled);
  }

  const intervalHours =
    options.intervalHours !== undefined
      ? options.intervalHours
      : options.schedule
        ? scheduleToIntervalHours(options.schedule)
        : undefined;
  if (intervalHours !== undefined) {
    setSetting('backupIntervalHours', intervalHours);
  }

  if (options.retentionDays !== undefined) {
    setSetting('backupRetentionDays', options.retentionDays);
  }

  if (options.backupDir !== undefined) {
    setSetting('backupDirectory', options.backupDir);
  }

  if (options.compress !== undefined) {
    setSetting('backupCompress', options.compress);
  }

  if (options.verify !== undefined) {
    setSetting('backupVerify', options.verify);
  }

  // Restart scheduler with new settings
  stopBackupScheduler();
  startBackupScheduler();

  log.info('Backup schedule updated:', options);
};
