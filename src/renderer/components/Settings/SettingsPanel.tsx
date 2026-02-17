import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  RotateCcw,
  Download,
  Upload,
  FileJson,
  Users,
  ChevronRight,
  Code,
  User,
  UserCog,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { BackupPanel } from './BackupPanel';
import { RestorePanel } from './RestorePanel';
import { ProfilePanel } from './ProfilePanel';
import { StaffManagementPanel } from './StaffManagementPanel';

interface SettingsPanelProps {
  className?: string;
}

type SettingsTab = 'profile' | 'staff' | 'backup' | 'restore' | 'export' | 'developer' | 'general' | 'security';

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ className = '' }) => {
  const { staff } = useAuth();
  const isAdmin = staff?.role === 'admin';
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [seedStatus, setSeedStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [inventoryCount, setInventoryCount] = useState<number>(0);
  const [inventorySeeded, setInventorySeeded] = useState<boolean>(false);

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode; description: string }[] = [
    {
      id: 'profile',
      label: 'My Profile',
      icon: <User className="h-5 w-5" />,
      description: 'Your account and change PIN',
    },
    ...(isAdmin
      ? [
          {
            id: 'staff' as const,
            label: 'Staff',
            icon: <UserCog className="h-5 w-5" />,
            description: 'Manage staff members',
          },
        ]
      : []),
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
    {
      id: 'developer',
      label: 'Developer',
      icon: <Code className="h-5 w-5" />,
      description: 'Developer tools and utilities',
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

  const handleLoadInventorySeed = async () => {
    setSeedStatus('loading');
    setStatusMessage('Loading inventory seed data...');

    try {
      console.log('Calling database seed...');
      const result = await window.electron.database?.seed?.();
      console.log('Seed result:', result);

      // Refresh inventory count after seeding
      await checkInventoryCount();

      if (result) {
        setSeedStatus('success');
        setStatusMessage(`Inventory seed data loaded successfully! Found ${inventoryCount} items. Please refresh the page to see medications in the dispensing form.`);
      } else {
        throw new Error('Seed failed - no response');
      }
    } catch (error) {
      setSeedStatus('error');
      setStatusMessage(`Seed failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Seed error:', error);
    }

    // Reset status after 8 seconds
    setTimeout(() => {
      setSeedStatus('idle');
      setStatusMessage('');
    }, 8000);
  };

  const checkInventoryCount = async () => {
    try {
      // Try to get inventory count from the backend using search
      const inventoryResult = await window.electron.inventory?.search?.({ pageSize: 1 });
      console.log('Inventory result:', inventoryResult);

      if (inventoryResult && typeof inventoryResult === 'object') {
        if ('total' in inventoryResult) {
          setInventoryCount((inventoryResult as { total: number }).total);
          setInventorySeeded((inventoryResult as { total: number }).total > 0);
        } else if ('data' in inventoryResult && Array.isArray(inventoryResult.data)) {
          setInventoryCount(inventoryResult.data.length);
          setInventorySeeded(inventoryResult.data.length > 0);
        } else if (Array.isArray(inventoryResult)) {
          setInventoryCount(inventoryResult.length);
          setInventorySeeded(inventoryResult.length > 0);
        }
      }
    } catch (error) {
      console.error('Failed to check inventory count:', error);
    }
  };

  // Check inventory count when developer tab is opened
  useEffect(() => {
    if (activeTab === 'developer') {
      checkInventoryCount();
    }
  }, [activeTab]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfilePanel />;

      case 'staff':
        return <StaffManagementPanel />;

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

      case 'developer':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Code className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Developer Tools</h3>
                  <p className="text-sm text-gray-500">Utilities for development and testing</p>
                </div>
              </div>

              {/* Inventory Status */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Inventory Status</h4>
                    <p className="text-sm text-gray-500">
                      Current inventory items: <strong>{inventoryCount}</strong>
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    inventorySeeded
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {inventorySeeded ? 'Inventory Seeded' : 'No Inventory'}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Load Sample Inventory</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    This will load sample inventory data for all medications including lot numbers,
                    expiration dates, and quantities. Useful for testing the dispensing workflow.
                  </p>
                  <button
                    onClick={handleLoadInventorySeed}
                    disabled={seedStatus === 'loading'}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      seedStatus === 'loading'
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : seedStatus === 'success'
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : seedStatus === 'error'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {seedStatus === 'loading' ? 'Loading...' :
                     seedStatus === 'success' ? '✓ Loaded!' :
                     seedStatus === 'error' ? '✗ Failed' :
                     'Load Inventory Seed Data'}
                  </button>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This operation is safe to run multiple times.
                    It uses <code>INSERT OR IGNORE</code> so existing data won't be duplicated.
                  </p>
                </div>
              </div>
            </div>

            {statusMessage && (
              <div
                className={`p-4 rounded-lg ${
                  seedStatus === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : seedStatus === 'error'
                    ? 'bg-red-50 border border-red-200 text-red-800'
                    : 'bg-blue-50 border border-blue-200 text-blue-800'
                }`}
              >
                {statusMessage}
              </div>
            )}
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
