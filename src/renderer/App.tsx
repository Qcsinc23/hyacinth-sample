import React, { useState, useCallback, useEffect } from 'react';
import './App.scss';

// Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AlertProvider } from './contexts/AlertContext';
import { AccessibilityProvider } from './components/AccessibilityPanel';

// Error Boundary
import { ErrorBoundary } from './components/ErrorBoundary';

// Security Components
import { SessionTimeoutWarning } from './components/SessionTimeoutWarning';

// Layout Components
import { Header } from './components/Layout/Header';
import { TabNav } from './components/Layout/TabNav';
import { AlertBanner } from './components/Layout/AlertBanner';
import { Footer } from './components/Layout/Footer';

// Feature Components
import { EntryFormContainer } from './components/EntryForm/EntryFormContainer';
import { SearchBar } from './components/DispensingLog/SearchBar';
import { LogTable } from './components/DispensingLog/LogTable';
import { RecordDetailModal } from './components/DispensingLog/RecordDetailModal';
import { CorrectionModal } from './components/DispensingLog/CorrectionModal';
import { VoidModal } from './components/DispensingLog/VoidModal';
import { InventoryDashboard } from './components/Inventory/InventoryDashboard';
import { GuideCard } from './components/MedicationGuide/GuideCard';
import { GuideModal } from './components/MedicationGuide/GuideModal';
import { ReportsPage } from './components/Reports';
import { PatientHistoryModal } from './components/PatientHistory';

// Common Components
import { ToastContainer } from './components/common/Toast';
import { PinInput } from './components/common/PinInput';
import { Button } from './components/common/Button';
import { ShortcutHelp } from './components/common/ShortcutHelp';
import { AccessibilityPanel } from './components/AccessibilityPanel';
import { SettingsPanel } from './components/Settings/SettingsPanel';

// Hooks
import { useInventory } from './hooks/useInventory';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Utils
import { notificationService } from './utils/notificationService';

// Types
import type { TabId, DispenseRecord, ToastType, Patient } from './types';

// Login Screen Component
const LoginScreen: React.FC = () => {
  const { login, failedAttempts, isLocked, lockoutTimeRemaining, sessionWarning } = useAuth();
  const [, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  // Show session timeout warning
  React.useEffect(() => {
    if (sessionWarning) {
      setShowSessionWarning(true);
      const timer = setTimeout(() => setShowSessionWarning(false), 10000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [sessionWarning]);

  const handlePinComplete = async (enteredPin: string) => {
    if (isLocked) return;
    
    setIsLoading(true);
    setError(null);
    
    const result = await login(enteredPin);
    
    if (!result.success) {
      setError(result.message || 'Invalid PIN. Please try again.');
      setPin('');
    }
    
    setIsLoading(false);
  };

  // Format lockout time remaining
  const formatLockoutTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Hyacinth</h1>
          <p className="text-gray-500 mt-1">Medication Dispensing System</p>
        </div>

        {/* Session Timeout Warning */}
        {showSessionWarning && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 font-medium">
              ⚠️ Your session will expire in 1 minute due to inactivity.
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Please log in again to continue.
            </p>
          </div>
        )}

        {/* Account Lockout Warning */}
        {isLocked && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-medium">
              🔒 Account temporarily locked
            </p>
            <p className="text-xs text-red-700 mt-1">
              Too many failed attempts. Please try again in {formatLockoutTime(lockoutTimeRemaining || 0)}.
            </p>
          </div>
        )}

        {/* Failed Attempts Warning */}
        {!isLocked && failedAttempts > 0 && failedAttempts < 5 && (
          <div className="mb-6 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs text-orange-700">
              ⚠️ {failedAttempts} failed attempt{failedAttempts !== 1 ? 's' : ''}. 
              Account will lock after {5 - failedAttempts} more failed attempt{5 - failedAttempts !== 1 ? 's' : ''}.
            </p>
          </div>
        )}

        <div className="text-center">
          <p className="text-sm text-gray-600 mb-6">Enter your PIN to continue</p>
          
          <PinInput
            length={4}
            onChange={setPin}
            onComplete={handlePinComplete}
            mask={true}
            error={error || undefined}
            disabled={isLoading || isLocked}
          />

          {/* Security notice */}
          <div className="mt-6 flex justify-center gap-2 text-xs text-gray-400">
            <span>🔒 Secure login required</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Application Content
const AppContent: React.FC = () => {
  const { isAuthenticated, logout, isWarningVisible, sessionTimeRemainingMs, extendSession, lockSession } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('entry');
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPatientHistory, setShowPatientHistory] = useState(false);
  const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<Patient | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; type: ToastType; message: string }>>([]);

  // Dispensing Log State
  const [searchFilters, setSearchFilters] = useState({
    searchQuery: '',
    statusFilter: 'all' as DispenseRecord['status'] | 'all',
    dateRange: { start: null as Date | null, end: null as Date | null },
    medications: [] as string[],
    staffId: 'all' as string,
    chartNumber: '',
  });
  const [selectedRecord, setSelectedRecord] = useState<DispenseRecord | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [showVoid, setShowVoid] = useState(false);
  const [recordForAction, setRecordForAction] = useState<DispenseRecord | null>(null);
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string }>>([]);

  // Inventory
  const { inventory } = useInventory();

  // Load staff list for log filters (when authenticated)
  useEffect(() => {
    if (!isAuthenticated || !window.electron?.staff?.getAll) return;
    window.electron.staff
      .getAll(true)
      .then((list) => {
        setStaffList(
          (Array.isArray(list) ? list : []).map((s: { id: number; first_name: string; last_name: string }) => ({
            id: String(s.id),
            name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown',
          }))
        );
      })
      .catch(() => setStaffList([]));
  }, [isAuthenticated]);

  // Handle viewing patient history
  const handleViewPatientHistory = useCallback((patient: Patient) => {
    setSelectedPatientForHistory(patient);
    setShowPatientHistory(true);
  }, []);

  // Search input ref for focus shortcut
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Initialize notifications
  useEffect(() => {
    notificationService.init();
  }, []);

  // Keyboard shortcuts handler
  const handleShortcut = useCallback((action: string, tabId?: string) => {
    switch (action) {
      case 'newEntry':
        setActiveTab('entry');
        addToast('info', 'Switched to Entry Form (Ctrl+N)');
        break;
      case 'print':
        addToast('info', 'Print function coming soon (Ctrl+P)');
        break;
      case 'save':
        addToast('info', 'Save function triggered (Ctrl+S)');
        break;
      case 'focusSearch':
        if (activeTab === 'log' && searchInputRef.current) {
          searchInputRef.current.focus();
        } else {
          setActiveTab('log');
          setTimeout(() => searchInputRef.current?.focus(), 100);
        }
        break;
      case 'switchTab':
        if (tabId && ['entry', 'log', 'inventory', 'guide', 'reports'].includes(tabId)) {
          setActiveTab(tabId as TabId);
        }
        break;
      case 'lock':
        logout();
        addToast('info', 'Application locked (Ctrl+L)');
        break;
      case 'closeModal':
        setShowGuideModal(false);
        setShowCorrection(false);
        setShowVoid(false);
        setSelectedRecord(null);
        setShowShortcutHelp(false);
        setShowAccessibility(false);
        setShowPatientHistory(false);
        break;
      case 'help':
        setShowShortcutHelp(true);
        break;
    }
  }, [activeTab, logout]);

  // Setup keyboard shortcuts
  const { showHelp } = useKeyboardShortcuts({
    onAction: handleShortcut,
    enabled: isAuthenticated,
  });

  // Sync external showHelp state with component state
  useEffect(() => {
    if (showHelp) setShowShortcutHelp(true);
  }, [showHelp]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleViewRecord = (record: DispenseRecord) => {
    setSelectedRecord(record);
  };

  const handleCorrectRecord = (record: DispenseRecord) => {
    setRecordForAction(record);
    setShowCorrection(true);
  };

  const handleVoidRecord = (record: DispenseRecord) => {
    setRecordForAction(record);
    setShowVoid(true);
  };

  const handleCorrectionComplete = () => {
    addToast('success', 'Record corrected successfully');
    setShowCorrection(false);
    setRecordForAction(null);
  };

  const handleVoidComplete = () => {
    addToast('success', 'Record voided successfully');
    setShowVoid(false);
    setRecordForAction(null);
  };

  const handleFormSubmitSuccess = () => {
    addToast('success', 'Dispensing record saved successfully');
    setActiveTab('log');
  };

  const handleSettingsClick = () => {
    setShowSettings(true);
  };

  const handleInventoryClick = () => {
    setActiveTab('inventory');
  };

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header 
        onSettingsClick={handleSettingsClick}
        onAccessibilityClick={() => setShowAccessibility(true)}
      />
      <AlertBanner onInventoryClick={handleInventoryClick} />
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-auto">
        <div className="max-w-full mx-auto p-6">
          {activeTab === 'entry' && (
            <EntryFormContainer
              onSubmitSuccess={handleFormSubmitSuccess}
              onViewPatientHistory={handleViewPatientHistory}
            />
          )}

          {activeTab === 'log' && (
            <div className="space-y-4">
              <SearchBar
                filters={searchFilters}
                onFiltersChange={setSearchFilters}
                availableMedications={['Biktarvy', 'Descovy', 'Doxycycline', 'Bactrim DS']}
                availableStaff={staffList}
              />
              <LogTable
                onViewRecord={handleViewRecord}
                onCorrectRecord={handleCorrectRecord}
                onVoidRecord={handleVoidRecord}
                searchQuery={searchFilters.searchQuery}
                statusFilter={searchFilters.statusFilter}
                dateRange={searchFilters.dateRange}
              />
            </div>
          )}

          {activeTab === 'inventory' && (
            <InventoryDashboard />
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4 max-w-3xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Medication Guide</h2>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowGuideModal(true)}
                >
                  Quick Reference
                </Button>
              </div>
              <div className="grid gap-4">
                {inventory.map((med) => (
                  <GuideCard
                    key={med.id}
                    medication={med}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reports' && <ReportsPage />}
        </div>
      </main>

      <Footer />

      {/* Modals */}
      {selectedRecord && (
        <RecordDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}

      {showCorrection && (
        <CorrectionModal
          record={recordForAction}
          onClose={() => setShowCorrection(false)}
          onCorrect={handleCorrectionComplete}
        />
      )}

      {showVoid && (
        <VoidModal
          record={recordForAction}
          onClose={() => setShowVoid(false)}
          onVoid={handleVoidComplete}
        />
      )}

      <GuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />

      <ShortcutHelp
        isOpen={showShortcutHelp}
        onClose={() => setShowShortcutHelp(false)}
      />

      {/* Patient History Modal */}
      <PatientHistoryModal
        patient={selectedPatientForHistory}
        isOpen={showPatientHistory}
        onClose={() => {
          setShowPatientHistory(false);
          setSelectedPatientForHistory(null);
        }}
      />

      <AccessibilityPanel
        isOpen={showAccessibility}
        onClose={() => setShowAccessibility(false)}
      />

      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-auto">
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
            >
              ✕
            </button>
            <SettingsPanel className="pt-4" />
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Session Timeout Warning Modal */}
      <SessionTimeoutWarning
        isVisible={isWarningVisible && isAuthenticated}
        timeRemainingMs={sessionTimeRemainingMs}
        onExtendSession={extendSession}
        onTimeout={lockSession}
      />
    </div>
  );
};

// Main App Component
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AlertProvider>
          <AccessibilityProvider>
            <AppContent />
          </AccessibilityProvider>
        </AlertProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
