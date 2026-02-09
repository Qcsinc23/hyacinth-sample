import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  Settings,
  Folder,
  RefreshCw,
  Calendar,
  HardDrive,
} from 'lucide-react';

interface BackupInfo {
  path: string;
  filename: string;
  size: number;
  createdAt: string;
  checksum: string | null;
  verified: boolean;
}

interface BackupSettings {
  autoBackupEnabled: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  backupLocation: string;
  retentionDays: number;
  compressBackups: boolean;
  verifyBackups: boolean;
}

interface BackupPanelProps {
  className?: string;
}

const STORAGE_KEY_SETTINGS = 'hyacinth:backupSettings';
const STORAGE_KEY_LAST_BACKUP = 'hyacinth:lastBackup';

export const BackupPanel: React.FC<BackupPanelProps> = ({ className = '' }) => {
  const [settings, setSettings] = useState<BackupSettings>({
    autoBackupEnabled: true,
    backupFrequency: 'daily',
    backupLocation: '',
    retentionDays: 30,
    compressBackups: true,
    verifyBackups: true,
  });
  
  const [lastBackup, setLastBackup] = useState<BackupInfo | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Load settings and last backup info on mount
  useEffect(() => {
    const storedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (storedSettings) {
      try {
        setSettings(JSON.parse(storedSettings));
      } catch (e) {
        console.error('Failed to parse backup settings:', e);
      }
    }

    const storedLastBackup = localStorage.getItem(STORAGE_KEY_LAST_BACKUP);
    if (storedLastBackup) {
      try {
        setLastBackup(JSON.parse(storedLastBackup));
      } catch (e) {
        console.error('Failed to parse last backup:', e);
      }
    }
  }, []);

  // Save settings whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  const handleCreateBackup = useCallback(async () => {
    setIsBackingUp(true);
    setBackupStatus('idle');
    setStatusMessage('Creating backup...');

    try {
      // Call the main process to create backup
      const result = await window.electron.backup?.create({
        compress: settings.compressBackups,
        verify: settings.verifyBackups,
      });

      if (result) {
        const backupInfo: BackupInfo = {
          path: result.path,
          filename: result.filename,
          size: result.size,
          createdAt: new Date().toISOString(),
          checksum: result.checksum,
          verified: settings.verifyBackups,
        };

        setLastBackup(backupInfo);
        localStorage.setItem(STORAGE_KEY_LAST_BACKUP, JSON.stringify(backupInfo));
        setBackupStatus('success');
        setStatusMessage(`Backup created successfully: ${result.filename}`);
      }
    } catch (error) {
      console.error('Backup failed:', error);
      setBackupStatus('error');
      setStatusMessage(
        `Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsBackingUp(false);
    }
  }, [settings]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = () => {
    if (!lastBackup) return 'gray';
    const lastBackupDate = new Date(lastBackup.createdAt);
    const now = new Date();
    const diffHours = (now.getTime() - lastBackupDate.getTime()) / 3600000;

    if (diffHours < 24) return 'green';
    if (diffHours < 48) return 'yellow';
    return 'red';
  };

  const statusColors: Record<string, { bg: string; text: string; icon: string }> = {
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

  const currentStatus = statusColors[getStatusColor()];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Backup Status Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${currentStatus.bg}`}>
              <Database className={`h-6 w-6 ${currentStatus.icon}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Backup Status</h3>
              <p className={`text-sm ${currentStatus.text}`}>
                {lastBackup
                  ? `Last backup: ${formatDate(lastBackup.createdAt)}`
                  : 'No backups created yet'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Backup Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {lastBackup && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">File Size</p>
              <p className="text-sm font-medium text-gray-900">
                {formatFileSize(lastBackup.size)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <div className="flex items-center gap-1">
                {lastBackup.verified ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-700">Verified</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium text-yellow-700">Unverified</span>
                  </>
                )}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Compression</p>
              <p className="text-sm font-medium text-gray-900">
                {settings.compressBackups ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Auto-Backup</p>
              <p className="text-sm font-medium text-gray-900">
                {settings.autoBackupEnabled ? settings.backupFrequency : 'Off'}
              </p>
            </div>
          </div>
        )}

        {/* Create Backup Button */}
        <button
          onClick={handleCreateBackup}
          disabled={isBackingUp}
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

        {/* Status Message */}
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

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-500" />
            Backup Settings
          </h4>

          <div className="space-y-4">
            {/* Auto-Backup Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900">Automatic Backups</p>
                  <p className="text-sm text-gray-500">Create backups automatically</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoBackupEnabled}
                  onChange={(e) =>
                    setSettings({ ...settings, autoBackupEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Backup Frequency */}
            {settings.autoBackupEnabled && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Backup Frequency
                </label>
                <select
                  value={settings.backupFrequency}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      backupFrequency: e.target.value as BackupSettings['backupFrequency'],
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            )}

            {/* Backup Location */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Backup Location
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.backupLocation}
                  onChange={(e) =>
                    setSettings({ ...settings, backupLocation: e.target.value })
                  }
                  placeholder="Default: ./backups"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={async () => {
                    const path = await window.electron.backup?.selectLocation?.();
                    if (path) {
                      setSettings({ ...settings, backupLocation: path });
                    }
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Browse
                </button>
              </div>
            </div>

            {/* Retention Settings */}
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
                  setSettings({
                    ...settings,
                    retentionDays: parseInt(e.target.value) || 30,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Backups older than this will be automatically deleted
              </p>
            </div>

            {/* Compression Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Compress Backups</p>
                <p className="text-sm text-gray-500">Reduce backup file size</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.compressBackups}
                  onChange={(e) =>
                    setSettings({ ...settings, compressBackups: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Verify Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Verify Backups</p>
                <p className="text-sm text-gray-500">Check integrity after creation</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.verifyBackups}
                  onChange={(e) =>
                    setSettings({ ...settings, verifyBackups: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupPanel;
