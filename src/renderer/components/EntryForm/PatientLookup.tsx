import React, { useState, useEffect, useRef } from 'react';
import { Search, User, AlertCircle, Check, ScanLine, History, RotateCcw } from 'lucide-react';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useDatabase } from '../../hooks/useDatabase';
import { useBarcodeScanner, ScannedData } from '../../hooks/useBarcodeScanner';
import { FavoriteButton } from '../QuickDispense/FavoritePatients';
import type { Patient } from '../../types';

interface PatientLookupProps {
  selectedPatient: Patient | null;
  onSelect: (patient: Patient | null) => void;
  enableBarcodeScan?: boolean;
  onViewHistory?: (patient: Patient) => void;
  showLastDispensed?: boolean;
  onRepeatLast?: (patient: Patient) => void;
}

export const PatientLookup: React.FC<PatientLookupProps> = ({
  selectedPatient,
  onSelect,
  enableBarcodeScan = true,
  onViewHistory,
  showLastDispensed = true,
  onRepeatLast,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [lastDispensedDate, setLastDispensedDate] = useState<string | null>(null);
  const { searchPatients, getPatientByChartNumber, isLoading } = useDatabase();
  const containerRef = useRef<HTMLDivElement>(null);

  // Load last dispensed date when patient is selected
  useEffect(() => {
    const loadLastDispensed = async () => {
      if (selectedPatient && showLastDispensed) {
        try {
          const date = await window.electron.patient.getLastDispensedDate(parseInt(selectedPatient.id)) as string | null;
          setLastDispensedDate(date);
        } catch (err) {
          console.error('Error loading last dispensed date:', err);
        }
      } else {
        setLastDispensedDate(null);
      }
    };
    loadLastDispensed();
  }, [selectedPatient, showLastDispensed]);

  // Barcode scanner hook
  const { scanStatus, resetScan } = useBarcodeScanner({
    enabled: enableBarcodeScan && !selectedPatient,
    onScan: handleBarcodeScan,
    onError: (error) => setScanError(error),
  });

  // Handle scanned barcode
  async function handleBarcodeScan(data: ScannedData) {
    setScanError(null);
    setScanSuccess(false);

    try {
      // Try to find patient by chart number
      const patient = await getPatientByChartNumber(data.value);

      if (patient) {
        onSelect(patient);
        setScanSuccess(true);

        // Clear success indicator after 3 seconds
        setTimeout(() => {
          setScanSuccess(false);
        }, 3000);
      } else {
        setScanError(`No patient found with chart number: ${data.value}`);
      }
    } catch (err) {
      setScanError('Error looking up patient. Please try again.');
    }
  }

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search patients
  useEffect(() => {
    const fetchResults = async () => {
      if (query.length >= 2) {
        const patients = await searchPatients(query);
        setResults(patients);
        setIsOpen(true);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    };

    const debounceTimer = setTimeout(fetchResults, 200);
    return () => clearTimeout(debounceTimer);
  }, [query, searchPatients]);

  const handleSelect = (patient: Patient) => {
    onSelect(patient);
    setQuery('');
    setIsOpen(false);
    setResults([]);
    setScanError(null);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery('');
    setResults([]);
    setScanError(null);
    setScanSuccess(false);
    resetScan();
  };

  // Get scan indicator color
  const getScanIndicatorColor = () => {
    switch (scanStatus) {
      case 'scanning':
        return 'text-blue-500 animate-pulse';
      case 'success':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  if (selectedPatient) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </h4>
                <FavoriteButton patient={selectedPatient} size="sm" />
              </div>
              <p className="text-sm text-gray-600">Chart: {selectedPatient.chartNumber}</p>
              <p className="text-sm text-gray-600">
                DOB: {selectedPatient.dateOfBirth.toLocaleDateString()}
              </p>
              {lastDispensedDate && (
                <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                  <History className="h-3.5 w-3.5" />
                  Last dispensed: {new Date(lastDispensedDate).toLocaleDateString()}
                </p>
              )}
              {selectedPatient.allergies.length > 0 && (
                <div className="flex items-center gap-1 mt-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Allergies: {selectedPatient.allergies.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleClear}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Change
            </button>
            {onViewHistory && (
              <button
                onClick={() => onViewHistory(selectedPatient)}
                className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1"
              >
                <History className="h-3 w-3" />
                History
              </button>
            )}
          </div>
        </div>
        
        {/* Quick Actions */}
        {onRepeatLast && (
          <div className="mt-4 pt-4 border-t border-blue-200 flex gap-2">
            <button
              onClick={() => onRepeatLast(selectedPatient)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Repeat Last Dispensing
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Scan status indicator */}
      {enableBarcodeScan && (
        <div className="flex items-center gap-2 mb-2">
          <ScanLine className={`h-4 w-4 ${getScanIndicatorColor()}`} />
          <span className={`text-xs ${getScanIndicatorColor()}`}>
            {scanStatus === 'scanning' && 'Scanning...'}
            {scanStatus === 'success' && 'Scan successful!'}
            {scanStatus === 'idle' && 'Ready to scan wristband or chart'}
            {scanStatus === 'error' && 'Scan error'}
          </span>
        </div>
      )}

      {/* Search input */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search by chart number, first name, or last name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leftIcon={<Search className="h-5 w-5" />}
            helperText={query.length > 0 && query.length < 2 ? 'Type at least 2 characters' : undefined}
          />
        </div>
        {enableBarcodeScan && (
          <Button
            variant="secondary"
            onClick={() => {
              resetScan();
              setScanError(null);
            }}
            leftIcon={<ScanLine className="h-4 w-4" />}
            title="Scan patient wristband or chart barcode"
          >
            Scan
          </Button>
        )}
      </div>

      {/* Scan feedback */}
      {scanError && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {scanError}
        </div>
      )}
      {scanSuccess && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-600 flex items-center gap-2">
          <Check className="h-4 w-4" />
          Patient found and selected
        </div>
      )}

      {/* Search results */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-auto">
          {results.map((patient) => (
            <button
              key={patient.id}
              onClick={() => handleSelect(patient)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {patient.firstName} {patient.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    Chart: {patient.chartNumber} • DOB: {patient.dateOfBirth.toLocaleDateString()}
                  </p>
                </div>
                {patient.allergies.length > 0 && (
                  <span className="flex items-center gap-1 text-red-600 text-xs bg-red-50 px-2 py-1 rounded">
                    <AlertCircle className="h-3 w-3" />
                    Allergies
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 p-4 text-center">
          <p className="text-gray-500">No patients found</p>
          <p className="text-sm text-gray-400 mt-1">Try scanning the patient&apos;s wristband or chart barcode</p>
        </div>
      )}
    </div>
  );
};

export default PatientLookup;
