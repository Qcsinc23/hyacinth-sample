import React, { useState } from 'react';
import { X, AlertTriangle, ScanLine, Check, Package, Info, Calendar, AlertCircle } from 'lucide-react';
import { MedicationSelector } from './MedicationSelector';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { useMedicationBarcodeScanner, BarcodeType } from '../../hooks/useBarcodeScanner';
import { useInventory } from '../../hooks/useInventory';
import type { ReasonContext, LotValidationResult } from '../../types';

interface InstructionData {
  context: ReasonContext;
  indication: string;
  shortDosing: string;
  fullInstructions: string[];
  warnings: string[];
  daySupply: number;
  medicationStrength?: string;
}

interface MedicationLineItemProps {
  index: number;
  line: {
    id: string;
    medicationId: string;
    lotId: string;
    amount: string;
    unit: string;
  };
  onChange: (field: 'medicationId' | 'lotId' | 'amount' | 'unit', value: string) => void;
  onRemove: () => void;
  // New props for context-aware dispensing
  instructionData?: InstructionData;
  lotValidation?: LotValidationResult;
  detectedContext?: ReasonContext | null;
  onContextOverride?: (context: ReasonContext) => void;
}

const unitOptions = [
  { value: '', label: 'Select unit...' },
  { value: 'tablets', label: 'Tablet(s)' },
  { value: 'capsules', label: 'Capsule(s)' },
  { value: 'ml', label: 'mL' },
  { value: 'mg', label: 'mg' },
  { value: 'g', label: 'g' },
  { value: 'units', label: 'Unit(s)' },
  { value: 'vials', label: 'Vial(s)' },
  { value: 'ampules', label: 'Ampule(s)' },
  { value: 'bottles', label: 'Bottle(s)' },
  { value: 'patches', label: 'Patch(es)' },
  { value: 'inhalers', label: 'Inhaler(s)' },
];

export const MedicationLineItem: React.FC<MedicationLineItemProps> = ({
  index,
  line,
  onChange,
  onRemove,
  instructionData,
  lotValidation,
  detectedContext,
  onContextOverride,
}) => {
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scannedLotInfo, setScannedLotInfo] = useState<{
    lotNumber: string;
    expirationDate?: string;
    medicationName?: string;
  } | null>(null);

  const { getLotByBarcode } = useInventory();

  // Barcode scanner for medication lots
  const { scanStatus, resetScan } = useMedicationBarcodeScanner(
    async (lotNumber: string, _type: BarcodeType) => {
      setScanError(null);
      setScanSuccess(false);

      try {
        // Look up the lot by barcode/lot number
        const lotInfo = await getLotByBarcode(lotNumber);

        if (lotInfo) {
          // Auto-fill the medication and lot information
          onChange('medicationId', lotInfo.medicationId);
          onChange('lotId', lotInfo.lotId);
          onChange('unit', lotInfo.unit || 'tablets');

          setScannedLotInfo({
            lotNumber: lotInfo.lotNumber,
            expirationDate: lotInfo.expirationDate,
            medicationName: lotInfo.medicationName,
          });
          setScanSuccess(true);

          // Clear success indicator after 5 seconds
          setTimeout(() => {
            setScanSuccess(false);
          }, 5000);
        } else {
          setScanError(`No medication found with lot number: ${lotNumber}`);
          // Still populate the lot number field for manual entry
          onChange('lotId', lotNumber);
        }
      } catch (err) {
        setScanError('Error looking up medication. Please try again or enter manually.');
        // Still populate the lot number field
        onChange('lotId', lotNumber);
      }
    },
    {
      enabled: !line.medicationId, // Only enable when no medication selected
    }
  );

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

  // Get context badge styles
  const getContextBadgeStyles = (context: ReasonContext) => {
    switch (context) {
      case 'treatment':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'prevention':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'prophylaxis':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'pep':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'prep':
        return 'bg-teal-100 text-teal-700 border-teal-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  // Get context label
  const getContextLabel = (context: ReasonContext) => {
    switch (context) {
      case 'treatment':
        return 'Treatment';
      case 'prevention':
        return 'Prevention';
      case 'prophylaxis':
        return 'Prophylaxis';
      case 'pep':
        return 'PEP';
      case 'prep':
        return 'PrEP';
      default:
        return 'Other';
    }
  };

  // Calculate day supply if not provided
  const calculatedDaySupply = instructionData?.daySupply || 0;

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-sm">
          {index + 1}
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Medication Selector */}
          <div className="lg:col-span-2">
            <MedicationSelector
              value={line.medicationId}
              onChange={(medId, lotId, unit) => {
                onChange('medicationId', medId);
                if (lotId) onChange('lotId', lotId);
                if (unit) onChange('unit', unit);
              }}
              selectedLotId={line.lotId}
            />

            {/* Scan indicator */}
            {!line.medicationId && (
              <div className="flex items-center gap-2 mt-2">
                <ScanLine className={`h-3 w-3 ${getScanIndicatorColor()}`} />
                <span className={`text-xs ${getScanIndicatorColor()}`}>
                  {scanStatus === 'scanning' && 'Scanning bottle barcode...'}
                  {scanStatus === 'success' && 'Medication scanned!'}
                  {scanStatus === 'idle' && 'Scan bottle barcode to auto-fill'}
                  {scanStatus === 'error' && 'Scan failed'}
                </span>
              </div>
            )}
          </div>

          {/* Amount */}
          <Input
            type="number"
            label="Amount"
            placeholder="Qty"
            value={line.amount}
            onChange={(e) => onChange('amount', e.target.value)}
            min="0"
            step="0.01"
          />

          {/* Unit */}
          <Select
            label="Unit"
            value={line.unit}
            onChange={(e) => onChange('unit', e.target.value)}
            options={unitOptions}
          />
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 transition-colors"
          aria-label="Remove medication"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Lot Info Display */}
      {line.lotId && (
        <div className="mt-3 ml-12 space-y-2">
          {/* Lot Number Display */}
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Lot: </span>
            <span className="font-medium text-gray-900">{line.lotId}</span>
            {lotValidation?.lot && (
              <>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600">Expires: </span>
                <span className={`font-medium ${
                  lotValidation.daysUntilExpiration !== undefined && lotValidation.daysUntilExpiration < 30
                    ? 'text-red-600'
                    : lotValidation.daysUntilExpiration !== undefined && lotValidation.daysUntilExpiration < 90
                    ? 'text-amber-600'
                    : 'text-gray-900'
                }`}>
                  {lotValidation.lot.expirationDate.toLocaleDateString()}
                </span>
              </>
            )}
          </div>

          {/* Lot Validation Warnings */}
          {lotValidation && (lotValidation.warnings.length > 0 || lotValidation.errors.length > 0) && (
            <div className={`p-2 rounded-lg border ${
              lotValidation.errors.length > 0
                ? 'bg-red-50 border-red-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              {lotValidation.errors.map((error, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              ))}
              {lotValidation.warnings.map((warning, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-amber-600">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Context Badge */}
      {detectedContext && (
        <div className="mt-2 ml-12">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium ${getContextBadgeStyles(detectedContext)}`}>
            <Info className="h-3 w-3" />
            {getContextLabel(detectedContext)} Context
          </span>
        </div>
      )}

      {/* Instruction Preview */}
      {instructionData && line.amount && (
        <div className="mt-3 ml-12 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {instructionData.indication}
                </span>
                {calculatedDaySupply > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                    <Calendar className="h-3 w-3" />
                    {calculatedDaySupply}-day supply
                  </span>
                )}
              </div>
              <p className="text-sm text-blue-800 font-medium">
                {instructionData.shortDosing}
              </p>
              {instructionData.warnings && instructionData.warnings.length > 0 && (
                <div className="mt-2 space-y-1">
                  {instructionData.warnings.slice(0, 2).map((warning, i) => (
                    <p key={i} className="text-xs text-blue-700 flex items-start gap-1">
                      <span className="text-amber-600">⚠</span>
                      {warning}
                    </p>
                  ))}
                  {instructionData.warnings.length > 2 && (
                    <p className="text-xs text-blue-600">
                      +{instructionData.warnings.length - 2} more warnings
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scan Feedback */}
      {scanError && (
        <div className="mt-3 ml-12 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {scanError}
          </div>
          <p className="text-xs mt-1 text-red-500">
            The scanned lot number has been entered. Please select the medication manually.
          </p>
        </div>
      )}

      {scanSuccess && scannedLotInfo && (
        <div className="mt-3 ml-12 p-3 bg-green-50 border border-green-200 rounded">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Check className="h-4 w-4" />
            <span className="font-medium">Medication verified!</span>
          </div>
          <div className="mt-1 text-sm text-green-600">
            <p><strong>Medication:</strong> {scannedLotInfo.medicationName}</p>
            <p><strong>Lot #:</strong> {scannedLotInfo.lotNumber}</p>
            {scannedLotInfo.expirationDate && (
              <p><strong>Expires:</strong> {scannedLotInfo.expirationDate}</p>
            )}
          </div>
        </div>
      )}

      {/* Scan Button */}
      {!line.medicationId && (
        <div className="mt-3 ml-12">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              resetScan();
              setScanError(null);
            }}
            leftIcon={<ScanLine className="h-4 w-4" />}
          >
            Scan Bottle Barcode
          </Button>
        </div>
      )}
    </div>
  );
};

export default MedicationLineItem;
