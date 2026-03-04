import React, { useState, useEffect, useCallback } from 'react';
import {
  RotateCcw,
  Database,
  Calendar,
  HardDrive,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Download,
  ArrowLeft,
  Loader2,
  Table,
} from 'lucide-react';

interface BackupInfo {
  id: string;
  filename: string;
  path: string;
  size: number;
  createdAt: string;
  checksum: string | null;
  verified: boolean;
  type: 'automatic' | 'manual';
}

interface BackupPreview {
  tables: string[];
  recordCounts: Record<string, number>;
  appVersion: string;
  backupDate: string;
}

interface RestorePanelProps {
  className?: string;
}

type RestoreStep = 'list' | 'preview' | 'confirm' | 'restoring' | 'complete' | 'error';

export const RestorePanel: React.FC<RestorePanelProps> = ({ className = '' }) => {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<BackupInfo | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [currentStep, setCurrentStep] = useState<RestoreStep>('list');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [confirmText, setConfirmText] = useState('');
  const [showPreviewDetails, setShowPreviewDetails] = useState(false);
  const [requiresRestart, setRequiresRestart] = useState(false);

  // Load available backups
  const loadBackups = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await window.electron.backup?.list?.();
      if (Array.isArray(result)) {
        setBackups(result);
      } else {
        console.warn('Unexpected backup list response:', result);
        setBackups([]);
      }
    } catch (err) {
      console.error('Failed to load backups:', err);
      setError('Failed to load backup list');
      setBackups([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      ' at ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  const handlePreviewBackup = useCallback(async (backup: BackupInfo) => {
    setSelectedBackup(backup);
    setCurrentStep('preview');
    setIsLoading(true);
    setError(null);

    try {
      const result = await window.electron.backup?.preview?.(backup.path);
      if (result) {
        setPreview(result);
      }
    } catch (err) {
      console.error('Failed to preview backup:', err);
      setError('Failed to preview backup contents');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleStartRestore = useCallback(() => {
    setCurrentStep('confirm');
  }, []);

  const handleConfirmRestore = useCallback(async () => {
    if (confirmText !== 'RESTORE') {
      setError('Please type RESTORE to confirm');
      return;
    }

    if (!selectedBackup) return;

    setCurrentStep('restoring');
    setError(null);
    setRestoreProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setRestoreProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const result = await window.electron.backup?.restore?.(selectedBackup.path);
      
      clearInterval(progressInterval);
      setRestoreProgress(100);

      if (result?.success) {
        setRequiresRestart(Boolean(result.requiresRestart));
        setTimeout(() => {
          setCurrentStep('complete');
        }, 500);
      } else {
        setCurrentStep('error');
        setError('Restore failed');
      }
    } catch (err) {
      setCurrentStep('error');
      setError(err instanceof Error ? err.message : 'Restore failed');
    }
  }, [confirmText, selectedBackup]);

  const handleRollback = useCallback(async () => {
    // Rollback to pre-restore state
    setIsLoading(true);
    try {
      const result = await window.electron.backup?.rollback?.();
      if (result?.success) {
        setCurrentStep('list');
        setSelectedBackup(null);
        setPreview(null);
        setConfirmText('');
        setRequiresRestart(false);
        loadBackups();
      } else {
        setError('Rollback failed');
      }
    } catch (err) {
      setError('Rollback failed');
    } finally {
      setIsLoading(false);
    }
  }, [loadBackups]);

  const handleImportBackup = useCallback(async () => {
    try {
      const result = await window.electron.backup?.import?.();
      if (result?.imported) {
        loadBackups();
      }
    } catch (err) {
      setError('Failed to import backup file');
    }
  }, [loadBackups]);

  // Render different steps
  const renderStep = () => {
    switch (currentStep) {
      case 'list':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Available Backups ({backups.length})
              </h3>
              <button
                onClick={handleImportBackup}
                className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Download className="h-4 w-4" />
                Import Backup
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Database className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No backups available</p>
                <p className="text-sm text-gray-400 mt-1">
                  Create a backup from the Backup panel first
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {backups.map((backup) => (
                  <div
                    key={backup.id}
                    onClick={() => handlePreviewBackup(backup)}
                    className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Database className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {backup.type === 'automatic' ? 'Automatic Backup' : 'Manual Backup'}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(backup.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <HardDrive className="h-3.5 w-3.5" />
                              {formatFileSize(backup.size)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {backup.verified ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                            <AlertCircle className="h-3 w-3" />
                            Unverified
                          </span>
                        )}
                        <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg">
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentStep('list')}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h3 className="text-lg font-semibold text-gray-900">Preview Backup</h3>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              </div>
            ) : preview ? (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Backup Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Created:</span>{' '}
                      {formatDate(preview.backupDate)}
                    </div>
                    <div>
                      <span className="text-blue-700">App Version:</span>{' '}
                      {preview.appVersion}
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setShowPreviewDetails(!showPreviewDetails)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      <Table className="h-5 w-5 text-gray-500" />
                      <span className="font-medium text-gray-900">
                        Database Contents
                      </span>
                    </div>
                    {showPreviewDetails ? (
                      <EyeOff className="h-5 w-5 text-gray-500" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-500" />
                    )}
                  </button>

                  {showPreviewDetails && (
                    <div className="p-4 space-y-2">
                      {preview.tables.map((table) => (
                        <div
                          key={table}
                          className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                        >
                          <span className="text-gray-700">{table}</span>
                          <span className="text-sm text-gray-500">
                            {preview.recordCounts[table]?.toLocaleString() || 0} records
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900">Important Warning</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Restoring this backup will replace all current data. This action
                      cannot be undone. Consider creating a backup of your current
                      data first. The workstation will need to be restarted before
                      further clinical use.
                    </p>
                  </div>
                </div>
                </div>

                <button
                  onClick={handleStartRestore}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  <RotateCcw className="h-5 w-5" />
                  Proceed to Restore
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">Failed to load preview</p>
              </div>
            )}
          </div>
        );

      case 'confirm':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentStep('preview')}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h3 className="text-lg font-semibold text-gray-900">Confirm Restore</h3>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">Final Warning</p>
                  <p className="text-sm text-red-700 mt-1">
                    You are about to restore the database to a previous state. All
                    current data will be replaced with the backup data from{' '}
                    {selectedBackup && formatDate(selectedBackup.createdAt)}.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <strong>RESTORE</strong> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type RESTORE"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              onClick={handleConfirmRestore}
              disabled={confirmText !== 'RESTORE'}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className="h-5 w-5" />
              Restore Database
            </button>
          </div>
        );

      case 'restoring':
        return (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Restoring Database...</h3>
            <p className="text-gray-500 mt-2">Please do not close the application</p>
            
            <div className="max-w-md mx-auto mt-6">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${restoreProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">{restoreProgress}% complete</p>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Restore Complete</h3>
            <p className="text-gray-500 mt-2">
              The database has been successfully restored.
            </p>
            {requiresRestart && (
              <div className="max-w-lg mx-auto mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-left">
                <p className="text-sm font-medium text-amber-800">
                  Restart Required
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Close and relaunch the Windows desktop app before dispensing,
                  exporting, or changing settings.
                </p>
              </div>
            )}
            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={() => {
                  setCurrentStep('list');
                  setSelectedBackup(null);
                  setPreview(null);
                  setConfirmText('');
                  setRequiresRestart(false);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Back to List
              </button>
              <button
                onClick={handleRollback}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                Rollback if Issues
              </button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Restore Failed</h3>
            <p className="text-red-600 mt-2">{error}</p>
            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={() => setCurrentStep('list')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Back to List
              </button>
              <button
                onClick={handleRollback}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Attempt Rollback
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {renderStep()}
    </div>
  );
};

export default RestorePanel;
