/**
 * Barcode Scanner Hook
 * Handles USB barcode scanner input for patient charts and medication lots
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Types
export type BarcodeType = 'patient_chart' | 'medication_lot' | 'ndc' | 'unknown';

export interface ScannedData {
  type: BarcodeType;
  value: string;
  rawData: string;
  timestamp: Date;
}

export interface UseBarcodeScannerOptions {
  enabled?: boolean;
  patientPrefix?: string;
  medicationPrefix?: string;
  scanTimeout?: number;
  onScan?: (data: ScannedData) => void;
  onError?: (error: string) => void;
}

export interface UseBarcodeScannerReturn {
  scannedData: ScannedData | null;
  isScanning: boolean;
  scanStatus: 'idle' | 'scanning' | 'success' | 'error';
  errorMessage: string | null;
  startScanning: () => void;
  stopScanning: () => void;
  resetScan: () => void;
  lastScanTime: Date | null;
}

/**
 * Detect barcode type based on patterns
 */
function detectBarcodeType(value: string, options: UseBarcodeScannerOptions): BarcodeType {
  const { patientPrefix = 'CH', medicationPrefix = 'LOT' } = options;

  // Patient chart numbers typically start with CH or are numeric
  if (value.startsWith(patientPrefix) || /^[A-Z]{2}\d{6,}$/.test(value)) {
    return 'patient_chart';
  }

  // Medication lot numbers often start with LOT or have specific patterns
  if (value.startsWith(medicationPrefix) || /^[A-Z0-9]{6,}$/.test(value)) {
    return 'medication_lot';
  }

  // NDC codes are 10 or 11 digits, often with hyphens
  if (/^\d{4,5}-\d{3,4}-\d{1,2}$/.test(value) || /^\d{10,11}$/.test(value)) {
    return 'ndc';
  }

  return 'unknown';
}

/**
 * Hook for barcode scanner functionality
 * USB barcode scanners typically act as keyboard input
 */
export function useBarcodeScanner(
  options: UseBarcodeScannerOptions = {}
): UseBarcodeScannerReturn {
  const {
    enabled = true,
    scanTimeout = 100,
    onScan,
    onError: _onError,
  } = options;

  const [scannedData, setScannedData] = useState<ScannedData | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);

  // Refs for scan buffer and timeout
  const scanBuffer = useRef<string>('');
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastKeyTime = useRef<number>(0);
  const isScanningActive = useRef<boolean>(enabled);

  // Update scanning state
  useEffect(() => {
    isScanningActive.current = enabled;
  }, [enabled]);

  // Process completed scan
  const processScan = useCallback(() => {
    const value = scanBuffer.current.trim();
    scanBuffer.current = '';

    if (!value) return;

    const type = detectBarcodeType(value, options);
    const data: ScannedData = {
      type,
      value,
      rawData: value,
      timestamp: new Date(),
    };

    setScannedData(data);
    setScanStatus('success');
    setLastScanTime(new Date());
    setIsScanning(false);

    if (onScan) {
      onScan(data);
    }

    // Auto-reset after 3 seconds
    setTimeout(() => {
      setScanStatus('idle');
    }, 3000);
  }, [options, onScan]);

  // Handle keydown events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isScanningActive.current) return;

    const now = Date.now();
    const timeSinceLastKey = now - lastKeyTime.current;

    // Barcode scanners typically send characters very quickly (< 50ms between keys)
    // If it's been too long, clear the buffer (manual typing)
    if (timeSinceLastKey > scanTimeout && scanBuffer.current.length > 0) {
      scanBuffer.current = '';
    }

    lastKeyTime.current = now;

    // Handle special keys
    if (event.key === 'Enter') {
      event.preventDefault();
      if (scanBuffer.current.length > 0) {
        processScan();
      }
      return;
    }

    // Ignore non-printable keys
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    // Start scanning indicator if this is the first character
    if (scanBuffer.current.length === 0) {
      setIsScanning(true);
      setScanStatus('scanning');
      setErrorMessage(null);
    }

    // Add character to buffer
    scanBuffer.current += event.key;

    // Clear existing timeout
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }

    // Set new timeout to process scan if no more keys received
    scanTimeoutRef.current = setTimeout(() => {
      if (scanBuffer.current.length > 0) {
        processScan();
      }
    }, scanTimeout * 2);
  }, [scanTimeout, processScan]);

  // Start scanning
  const startScanning = useCallback(() => {
    isScanningActive.current = true;
    setScanStatus('idle');
    setErrorMessage(null);
  }, []);

  // Stop scanning
  const stopScanning = useCallback(() => {
    isScanningActive.current = false;
    setIsScanning(false);
    scanBuffer.current = '';
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
  }, []);

  // Reset scan
  const resetScan = useCallback(() => {
    setScannedData(null);
    setScanStatus('idle');
    setErrorMessage(null);
    setIsScanning(false);
    scanBuffer.current = '';
  }, []);

  // Register keyboard listener
  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown, true);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [enabled, handleKeyDown]);

  return {
    scannedData,
    isScanning,
    scanStatus,
    errorMessage,
    startScanning,
    stopScanning,
    resetScan,
    lastScanTime,
  };
}

/**
 * Hook specifically for patient chart scanning
 */
export function usePatientBarcodeScanner(
  onPatientScan: (chartNumber: string) => void,
  options: Omit<UseBarcodeScannerOptions, 'onScan'> = {}
) {
  const handleScan = useCallback((data: ScannedData) => {
    if (data.type === 'patient_chart' || data.type === 'unknown') {
      onPatientScan(data.value);
    }
  }, [onPatientScan]);

  return useBarcodeScanner({
    ...options,
    onScan: handleScan,
  });
}

/**
 * Hook specifically for medication lot scanning
 */
export function useMedicationBarcodeScanner(
  onMedicationScan: (lotNumber: string, type: BarcodeType) => void,
  options: Omit<UseBarcodeScannerOptions, 'onScan'> = {}
) {
  const handleScan = useCallback((data: ScannedData) => {
    if (data.type === 'medication_lot' || data.type === 'ndc' || data.type === 'unknown') {
      onMedicationScan(data.value, data.type);
    }
  }, [onMedicationScan]);

  return useBarcodeScanner({
    ...options,
    onScan: handleScan,
  });
}

export default useBarcodeScanner;
