import React, { useState, useEffect, useRef } from 'react';
import { Search, User, AlertCircle, History, Plus, X } from 'lucide-react';
import { Input } from '../common/Input';
import { useDatabase } from '../../hooks/useDatabase';
import { useBarcodeScanner, ScannedData } from '../../hooks/useBarcodeScanner';
import type { Patient } from '../../types';
import { sanitizeInput } from '../../utils/sanitize';

interface PatientLookupProps {
  selectedPatient: Patient | null;
  onSelect: (patient: Patient | null) => void;
  enableBarcodeScan?: boolean;
  onViewHistory?: (patient: Patient) => void;
  showLastDispensed?: boolean;
  onRepeatLast?: (patient: Patient) => void;
}

// ---------------------------------------------------------------------------
// Inline "New Patient" form
// ---------------------------------------------------------------------------

interface NewPatientFormData {
  chart_number: string;
  first_name: string;
  last_name: string;
  dob: string;
}

const emptyForm: NewPatientFormData = {
  chart_number: '',
  first_name: '',
  last_name: '',
  dob: '',
};

export const PatientLookup: React.FC<PatientLookupProps> = ({
  selectedPatient,
  onSelect,
  enableBarcodeScan = true,
  onViewHistory,
  showLastDispensed = true,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [lastDispensedDate, setLastDispensedDate] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState<NewPatientFormData>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { searchPatients, getPatientByChartNumber, isLoading } = useDatabase();
  const containerRef = useRef<HTMLDivElement>(null);

  // Last dispensed date
  useEffect(() => {
    const load = async () => {
      if (selectedPatient && showLastDispensed) {
        try {
          const date = (await window.electron?.patient?.getLastDispensedDate?.(
            parseInt(selectedPatient.id)
          )) as string | null;
          setLastDispensedDate(date);
        } catch {
          setLastDispensedDate(null);
        }
      } else {
        setLastDispensedDate(null);
      }
    };
    load();
  }, [selectedPatient, showLastDispensed]);

  // Barcode scanner (background listener)
  const { resetScan } = useBarcodeScanner({
    enabled: enableBarcodeScan && !selectedPatient,
    onScan: async (data: ScannedData) => {
      try {
        const patient = await getPatientByChartNumber(data.value);
        if (patient) onSelect(patient);
      } catch {
        // Silent fail
      }
    },
    onError: () => {},
  });

  // Click outside to close dropdown (not the form)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 2) {
        const patients = await searchPatients(query);
        setResults(patients);
        setIsOpen(true);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query, searchPatients]);

  const handleSelect = (patient: Patient) => {
    onSelect(patient);
    setQuery('');
    setIsOpen(false);
    setResults([]);
    setShowNewForm(false);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery('');
    setResults([]);
    resetScan();
  };

  // -- Create new patient --
  const handleOpenNewForm = () => {
    // Pre-fill first/last name from search query if it looks like a name
    const parts = query.trim().split(/\s+/);
    setNewForm({
      ...emptyForm,
      first_name: parts[0] || '',
      last_name: parts.slice(1).join(' ') || '',
    });
    setFormError(null);
    setShowNewForm(true);
    setIsOpen(false);
  };

  const handleCancelNewForm = () => {
    setShowNewForm(false);
    setNewForm(emptyForm);
    setFormError(null);
  };

  const handleSaveNewPatient = async () => {
    // Validate
    if (!newForm.chart_number.trim()) {
      setFormError('Chart number is required');
      return;
    }
    if (!newForm.first_name.trim()) {
      setFormError('First name is required');
      return;
    }
    if (!newForm.last_name.trim()) {
      setFormError('Last name is required');
      return;
    }
    if (!newForm.dob) {
      setFormError('Date of birth is required');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      if (!window.electron?.patient?.create) {
        throw new Error('Patient API is not available. Please restart the application.');
      }
      const created = await window.electron.patient.create({
        chart_number: newForm.chart_number.trim(),
        first_name: newForm.first_name.trim(),
        last_name: newForm.last_name.trim(),
        dob: newForm.dob,
      });

      if (created) {
        // The backend returns snake_case — adapt to frontend Patient shape
        const patient: Patient = {
          id: String(created.id),
          chartNumber: created.chart_number,
          firstName: created.first_name,
          lastName: created.last_name,
          dateOfBirth: new Date(created.dob),
          allergies: [],
        };
        handleSelect(patient);
      } else {
        setFormError('Failed to create patient. Please try again.');
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to create patient';
      if (msg.includes('UNIQUE') || msg.includes('unique') || msg.includes('chart_number')) {
        setFormError('A patient with this chart number already exists.');
      } else {
        setFormError(msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // =========================================================================
  // Render: selected patient card
  // =========================================================================

  if (selectedPatient) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-1.5 rounded-full">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">
                {sanitizeInput(selectedPatient.firstName)} {sanitizeInput(selectedPatient.lastName)}
              </h4>
              <p className="text-xs text-gray-600">
                Chart: {sanitizeInput(selectedPatient.chartNumber)} &middot; DOB:{' '}
                {selectedPatient.dateOfBirth.toLocaleDateString()}
              </p>
              {lastDispensedDate && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <History className="h-3 w-3" />
                  Last dispensed: {new Date(lastDispensedDate).toLocaleDateString()}
                </p>
              )}
              {selectedPatient.allergies.length > 0 && (
                <div className="flex items-center gap-1 mt-1 text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">
                    Allergies: {selectedPatient.allergies.map((a) => sanitizeInput(a)).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            {onViewHistory && (
              <button
                onClick={() => onViewHistory(selectedPatient)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                History
              </button>
            )}
            <button
              onClick={handleClear}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Change
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Render: search input + dropdown + new patient form
  // =========================================================================

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Input
          type="text"
          placeholder="Search by chart number, first name, or last name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />

        {/* Results dropdown */}
        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-auto">
            {results.map((patient) => (
              <button
                key={patient.id}
                onClick={() => handleSelect(patient)}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {sanitizeInput(patient.firstName)} {sanitizeInput(patient.lastName)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Chart: {sanitizeInput(patient.chartNumber)} &middot; DOB:{' '}
                      {patient.dateOfBirth.toLocaleDateString()}
                    </p>
                  </div>
                  {patient.allergies.length > 0 && (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Allergies
                    </span>
                  )}
                </div>
              </button>
            ))}

            {/* "Not found — create new" option at bottom */}
            {query.length >= 2 && (
              <button
                onClick={handleOpenNewForm}
                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-t border-gray-100 flex items-center gap-2 text-blue-600"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {results.length === 0 ? 'No results — add new patient' : 'Add new patient'}
                </span>
              </button>
            )}

            {/* Empty state without "add new" when query too short */}
            {query.length >= 2 && results.length === 0 && isLoading && (
              <div className="p-3 text-center text-sm text-gray-400">Searching...</div>
            )}
          </div>
        )}
      </div>

      {/* Quick-add link when not searching */}
      {!showNewForm && !isOpen && (
        <button
          type="button"
          onClick={() => {
            setNewForm(emptyForm);
            setFormError(null);
            setShowNewForm(true);
          }}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add new patient manually
        </button>
      )}

      {/* Inline new patient form */}
      {showNewForm && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-medium text-gray-700">New Patient</h4>
            <button
              type="button"
              onClick={handleCancelNewForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Chart Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newForm.chart_number}
                onChange={(e) => setNewForm({ ...newForm, chart_number: e.target.value })}
                placeholder="e.g. HYA-0001"
                className="w-full rounded-md border border-gray-300 text-sm px-2.5 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={newForm.dob}
                onChange={(e) => setNewForm({ ...newForm, dob: e.target.value })}
                className="w-full rounded-md border border-gray-300 text-sm px-2.5 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newForm.first_name}
                onChange={(e) => setNewForm({ ...newForm, first_name: e.target.value })}
                placeholder="First name"
                className="w-full rounded-md border border-gray-300 text-sm px-2.5 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newForm.last_name}
                onChange={(e) => setNewForm({ ...newForm, last_name: e.target.value })}
                placeholder="Last name"
                className="w-full rounded-md border border-gray-300 text-sm px-2.5 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {formError && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3 flex-shrink-0" />
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleCancelNewForm}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveNewPatient}
              disabled={isSaving}
              className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md px-3 py-1.5 disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save & Select'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientLookup;
