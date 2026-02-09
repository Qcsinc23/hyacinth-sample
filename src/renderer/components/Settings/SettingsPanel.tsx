import React, { useState } from 'react';
import {
  Settings,
  Database,
  RotateCcw,
  Download,
  Upload,
  FileJson,
  Users,
  ChevronRight,
} from 'lucide-react';
import { BackupPanel } from './BackupPanel';
import { RestorePanel } from './RestorePanel';

interface SettingsPanelProps {
  className?: string;
}

type SettingsTab = 'backup' | 'restore' | 'export' | 'general' | 'security';

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('backup');
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode; description: string }[] = [
    {
      id: 'backup',
      label: 'Backup',
      icon: <Database className="h-5 w-5" />,
      description: 'Create and manage database backups',
    },
    {
      id: 'restore',
      label: 'Restore',
      icon: <RotateCcw className="h-5 w-5" />,
      description: 'Restore from previous backups',
    },
    {
      id: 'export',
      label: 'Export/Import',
      icon: <Download className="h-5 w-5" />,
      description: 'Export or import data',
    },
  ];

  const handleExportData = async (type: 'patients' | 'dispensing' | 'inventory' | 'full') => {
    setExportStatus('exporting');
    setStatusMessage(`Exporting ${type} data...`);

    try {
      const result = await window.electron.settings?.export?.(type);
      if (result?.success) {
        setExportStatus('success');
        setStatusMessage(`${type} data exported successfully`);
      } else {
        throw new Error(result?.error || 'Export failed');
      }
    } catch (error) {
      setExportStatus('error');
      setStatusMessage(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleImportData = async (type: 'patients' | 'dispensing' | 'inventory') => {
    setImportStatus('importing');
    setStatusMessage(`Importing ${type} data...`);

    try {
      const result = await window.electron.settings?.import?.(type);
      if (result?.success) {
        setImportStatus('success');
        setStatusMessage(`${type} data imported successfully`);
      } else {
        throw new Error(result?.error || 'Import failed');
      }
    } catch (error) {
      setImportStatus('error');
      setStatusMessage(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'backup':
        return <BackupPanel />;

      case 'restore':
        return <RestorePanel />;

      case 'export':
        return (
          <div className="space-y-6">
            {/* Export Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Download className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Export Data</h3>
                  <p className="text-sm text-gray-500">Download your data in various formats</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleExportData('patients')}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Users className="h-5 w-5 text-gray-600" />
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="font-medium text-gray-900">Patient Data</p>
                  <p className="text-sm text-gray-500">Export all patient records</p>
                </button>

                <button
                  onClick={() => handleExportData('dispensing')}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Database className="h-5 w-5 text-gray-600" />
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="font-medium text-gray-900">Dispensing Records</p>
                  <p className="text-sm text-gray-500">Export dispensing history</p>
                </button>

                <button
                  onClick={() => handleExportData('inventory')}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Database className="h-5 w-5 text-gray-600" />
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="font-medium text-gray-900">Inventory Data</p>
                  <p className="text-sm text-gray-500">Export inventory records</p>
                </button>

                <button
                  onClick={() => handleExportData('full')}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <FileJson className="h-5 w-5 text-gray-600" />
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="font-medium text-gray-900">Full Database Export</p>
                  <p className="text-sm text-gray-500">Export all data as JSON</p>
                </button>
              </div>

              {exportStatus !== 'idle' && exportStatus !== 'exporting' && (
                <div
                  className={`mt-4 p-3 rounded-lg ${
                    exportStatus === 'success'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {statusMessage}
                </div>
              )}
            </div>

            {/* Import Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Upload className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Import Data</h3>
                  <p className="text-sm text-gray-500">Import data from external sources</p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Importing data may overwrite existing records.
                  It is recommended to create a backup before importing.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => handleImportData('patients')}
                  className="p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Users className="h-5 w-5 text-gray-600" />
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="font-medium text-gray-900">Import Patients</p>
                  <p className="text-sm text-gray-500">CSV or JSON format</p>
                </button>

                <button
                  onClick={() => handleImportData('dispensing')}
                  className="p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Database className="h-5 w-5 text-gray-600" />
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="font-medium text-gray-900">Import Dispensing</p>
                  <p className="text-sm text-gray-500">JSON format only</p>
                </button>

                <button
                  onClick={() => handleImportData('inventory')}
                  className="p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Database className="h-5 w-5 text-gray-600" />
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="font-medium text-gray-900">Import Inventory</p>
                  <p className="text-sm text-gray-500">CSV or JSON format</p>
                </button>
              </div>

              {importStatus !== 'idle' && importStatus !== 'importing' && (
                <div
                  className={`mt-4 p-3 rounded-lg ${
                    importStatus === 'success'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {statusMessage}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Settings className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
            <p className="text-gray-500">Manage application settings and data</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>{renderTabContent()}</div>
    </div>
  );
};

export default SettingsPanel;
