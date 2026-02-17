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
import { DEFAULT_BACKUP_INTERVAL_HOURS, DEFAULT_BACKUP_RETENTION_DAYS } from '../../renderer/utils/constants';
import { createBackup } from './backup';

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
export const getBackupSettings = (): {
  enabled: boolean;
  intervalHours: number;
  retentionDays: number;
  lastBackup: string | null;
  backupDir: string;
} => {
  return {
    enabled: getSetting('backupEnabled') ?? true,
    intervalHours: getSetting('backupIntervalHours') ?? DEFAULT_BACKUP_INTERVAL_HOURS,
    retentionDays: getSetting('backupRetentionDays') ?? DEFAULT_BACKUP_RETENTION_DAYS,
    lastBackup: getSetting('lastBackup') ?? null,
    backupDir: getBackupDirectory(),
  };
};

/**
 * Run a manual backup
 */
export const runManualBackup = async (): Promise<string> => {
  const backupDir = getBackupDirectory();
  const backupPath = await createBackup(backupDir);
  
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
  const backupDir = settings.backupDir;
  const retentionDays = settings.retentionDays;
  
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
  return backups.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
  const lastBackup = settings.lastBackup;
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
  log.info(`Backup scheduler started. Interval: ${settings.intervalHours} hours`);
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
  intervalHours?: number;
  retentionDays?: number;
}): void => {
  if (options.enabled !== undefined) {
    setSetting('backupEnabled', options.enabled);
  }
  
  if (options.intervalHours !== undefined) {
    setSetting('backupIntervalHours', options.intervalHours);
  }
  
  if (options.retentionDays !== undefined) {
    setSetting('backupRetentionDays', options.retentionDays);
  }
  
  // Restart scheduler with new settings
  stopBackupScheduler();
  startBackupScheduler();
  
  log.info('Backup schedule updated:', options);
};
