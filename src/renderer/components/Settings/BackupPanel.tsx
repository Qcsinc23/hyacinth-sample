import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Download,
  Folder,
  HardDrive,
  RefreshCw,
  Settings,
} from 'lucide-react';
import type {
  BackupSettings as DesktopBackupSettings,
  BackupSchedule,
  WorkstationHealthSnapshot,
} from '../../../shared/types';

interface BackupPanelProps {
  className?: string;
}

type BackupInfo = {
  path: string;
  filename: string;
  size: number;
  createdAt: string;
  checksum: string | null;
  verified: boolean;
};

const formatFileSize = (bytes: number | null): string => {
  if (!bytes || bytes <= 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Unknown';

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

export const BackupPanel: React.FC<BackupPanelProps> = ({ className = '' }) => {
  const [settings, setSettings] = useState<DesktopBackupSettings | null>(null);
  const [health, setHealth] = useState<WorkstationHealthSnapshot | null>(null);
  const [lastBackup, setLastBackup] = useState<BackupInfo | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'success' | 'error'>(
    'idle',
  );
  const [statusMessage, setStatusMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const lastSavedSettingsRef = useRef<string>('');

  const refresh = useCallback(async () => {
    try {
      const [loadedSettings, loadedHealth, backups] = await Promise.all([
        window.electron.backup.getSettings(),
        window.electron.backup.getHealth(),
        window.electron.backup.list(),
      ]);

      setSettings(loadedSettings);
      lastSavedSettingsRef.current = JSON.stringify(loadedSettings);
      setHealth(loadedHealth);
      const latestBackup = backups[0];
      if (latestBackup) {
        setLastBackup({
          path: latestBackup.path,
          filename: latestBackup.filename,
          size: latestBackup.size,
          createdAt: latestBackup.createdAt,
          checksum: latestBackup.checksum,
          verified: latestBackup.verified,
        });
      } else {
        setLastBackup(null);
      }
      setHasLoaded(true);
    } catch (error) {
      console.error('Failed to load backup state:', error);
      setBackupStatus('error');
      setStatusMessage('Failed to load backup settings');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!settings || !hasLoaded) {
      return undefined;
    }

    const serialized = JSON.stringify(settings);
    if (serialized === lastSavedSettingsRef.current) {
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSavingSettings(true);
        const updated = await window.electron.backup.updateSettings(settings);
        setSettings(updated);
        lastSavedSettingsRef.current = JSON.stringify(updated);
        setStatusMessage('Backup settings saved');
      } catch (error) {
        console.error('Failed to save backup settings:', error);
        setBackupStatus('error');
        setStatusMessage('Failed to save backup settings');
      } finally {
        setIsSavingSettings(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [hasLoaded, settings]);

  const handleCreateBackup = useCallback(async () => {
    if (!settings) return;

    setIsBackingUp(true);
    setBackupStatus('idle');
    setStatusMessage('Creating backup...');

    try {
      const result = await window.electron.backup.create({
        compress: settings.compress,
        verify: settings.verify,
      });

      setLastBackup({
        path: result.path,
        filename: result.filename,
        size: result.size,
        createdAt: result.createdAt || new Date().toISOString(),
        checksum: result.checksum,
        verified: result.verified,
      });
      setBackupStatus('success');
      setStatusMessage(`Backup created successfully: ${result.filename}`);
      await refresh();
    } catch (error) {
      console.error('Backup failed:', error);
      setBackupStatus('error');
      setStatusMessage(
        `Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsBackingUp(false);
    }
  }, [refresh, settings]);

  const currentStatusColor = useMemo(() => {
    if (!lastBackup) return 'gray';
    const diffHours =
      (Date.now() - new Date(lastBackup.createdAt).getTime()) / 3600000;
    if (diffHours < 24) return 'green';
    if (diffHours < 48) return 'yellow';
    return 'red';
  }, [lastBackup]);

  const statusColors: Record<
    string,
    { bg: string; text: string; icon: string }
  > = {
    green: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      icon: 'text-green-500',
    },
    yellow: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      icon: 'text-yellow-500',
    },
    red: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      icon: 'text-red-500',
    },
    gray: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      icon: 'text-gray-500',
    },
  };

  const currentStatus = statusColors[currentStatusColor];

  const updateSettings = (next: Partial<DesktopBackupSettings>) => {
    setSettings((current) => (current ? { ...current, ...next } : current));
  };

  const backupSchedule = settings?.schedule || 'daily';

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${currentStatus.bg}`}>
              <Database className={`h-6 w-6 ${currentStatus.icon}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Backup Status
              </h3>
              <p className={`text-sm ${currentStatus.text}`}>
                {lastBackup
                  ? `Last backup: ${formatDate(lastBackup.createdAt)}`
                  : 'No backups created yet'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings((value) => !value)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Backup Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Last Backup</p>
            <p className="text-sm font-medium text-gray-900">
              {formatDate(lastBackup?.createdAt || null)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Verification</p>
            <p className="text-sm font-medium text-gray-900">
              {settings?.verify ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Compression</p>
            <p className="text-sm font-medium text-gray-900">
              {settings?.compress ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Retention</p>
            <p className="text-sm font-medium text-gray-900">
              {settings?.retentionDays || 0} days
            </p>
          </div>
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={isBackingUp || !settings}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isBackingUp ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              Creating Backup...
            </>
          ) : (
            <>
              <Download className="h-5 w-5" />
              Create Backup Now
            </>
          )}
        </button>

        {statusMessage && (
          <div
            className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
              backupStatus === 'success'
                ? 'bg-green-50 text-green-700'
                : backupStatus === 'error'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-blue-50 text-blue-700'
            }`}
          >
            {backupStatus === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : backupStatus === 'error' ? (
              <AlertCircle className="h-5 w-5" />
            ) : (
              <Clock className="h-5 w-5" />
            )}
            <span className="text-sm">{statusMessage}</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          Workstation Diagnostics
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900">Database Health</p>
            <p
              className={`text-sm mt-1 ${
                health?.database.healthy ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {health?.database.healthy ? 'Healthy' : 'Issues detected'}
            </p>
            {health?.database.issues?.length ? (
              <p className="text-xs text-red-600 mt-2">
                {health.database.issues.join(', ')}
              </p>
            ) : null}
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900">Backup Storage</p>
            <p className="text-sm mt-1 text-gray-700">
              Free space: {formatFileSize(health?.backup.freeDiskBytes || null)}
            </p>
            <p className="text-xs text-gray-500 mt-2 break-all">
              {settings?.backupDir || 'No directory configured'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900">Backups Available</p>
            <p className="text-sm mt-1 text-gray-700">
              {health?.backup.availableBackups ?? 0} local backups
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Latest: {formatDate(health?.backup.latestBackupAt || null)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900">Release Channel</p>
            <p className="text-sm mt-1 text-gray-700">
              {health?.releaseChannel || 'internal'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              App version: {health?.appVersion || 'unknown'}
            </p>
          </div>
        </div>
      </div>

      {showSettings && settings && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-500" />
            Backup Settings
            {isSavingSettings ? (
              <span className="text-xs font-normal text-gray-500">
                Saving...
              </span>
            ) : null}
          </h4>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Automatic Backups</p>
                <p className="text-sm text-gray-500">
                  Run scheduled local backups from the main process
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => updateSettings({ enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
              </label>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Backup Schedule
              </label>
              <select
                value={backupSchedule}
                onChange={(e) =>
                  updateSettings({ schedule: e.target.value as BackupSchedule })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Backup Location
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.backupDir}
                  onChange={(e) => updateSettings({ backupDir: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={async () => {
                    const selected = await window.electron.backup.selectLocation();
                    if (selected) {
                      updateSettings({ backupDir: selected });
                    }
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Browse
                </button>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Backup Retention (days)
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={settings.retentionDays}
                onChange={(e) =>
                  updateSettings({
                    retentionDays: Math.max(1, parseInt(e.target.value, 10) || 30),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Compress Backups</p>
                <p className="text-sm text-gray-500">
                  Reduce backup size on disk
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.compress}
                  onChange={(e) => updateSettings({ compress: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
              </label>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Verify Backups</p>
                <p className="text-sm text-gray-500">
                  Run integrity verification after each backup
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.verify}
                  onChange={(e) => updateSettings({ verify: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupPanel;
