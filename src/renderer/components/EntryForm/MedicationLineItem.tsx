import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { MedicationSelector } from './MedicationSelector';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import type { ReasonContext, LotValidationResult, DispenseReason } from '../../types';

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
  onBatchChange: (updates: Partial<Record<'medicationId' | 'lotId' | 'amount' | 'unit', string>>) => void;
  onRemove: () => void;
  instructionData?: InstructionData;
  lotValidation?: LotValidationResult;
  detectedContext?: ReasonContext | null;
  onContextOverride?: (context: ReasonContext) => void;
  selectedReasons?: DispenseReason[];
}

/**
 * Normalize singular unit to plural for dropdown consistency
 */
function normalizeUnit(unit: string): string {
  const singularToPlural: Record<string, string> = {
    tablet: 'tablets',
    capsule: 'capsules',
    vial: 'vials',
    ampule: 'ampules',
    bottle: 'bottles',
    patch: 'patches',
    inhaler: 'inhalers',
    unit: 'units',
  };
  return singularToPlural[unit.toLowerCase()] || unit.toLowerCase();
}

const unitOptions = [
  { value: '', label: 'Unit...' },
  { value: 'tablets', label: 'Tablets' },
  { value: 'capsules', label: 'Capsules' },
  { value: 'ml', label: 'mL' },
  { value: 'mg', label: 'mg' },
  { value: 'g', label: 'g' },
  { value: 'units', label: 'Units' },
  { value: 'vials', label: 'Vials' },
  { value: 'ampules', label: 'Ampules' },
  { value: 'bottles', label: 'Bottles' },
  { value: 'patches', label: 'Patches' },
  { value: 'inhalers', label: 'Inhalers' },
];

export const MedicationLineItem: React.FC<MedicationLineItemProps> = ({
  index,
  line,
  onChange,
  onBatchChange,
  onRemove,
  lotValidation,
  detectedContext,
  selectedReasons = [],
}) => {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
      {/* Main row: Number + Medication + Amount + Unit + Remove */}
      <div className="flex items-start gap-3">
        {/* Line number */}
        <div className="flex-shrink-0 w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-xs mt-1">
          {index + 1}
        </div>

        {/* Medication selector (takes most space) */}
        <div className="flex-1 min-w-0">
          <MedicationSelector
            value={line.medicationId}
            onChange={(medId, lotId, unit) => {
              // Batch all field changes into a single state update
              // to avoid stale-closure race conditions
              const updates: Partial<Record<'medicationId' | 'lotId' | 'amount' | 'unit', string>> = {};
              if (medId !== line.medicationId) updates.medicationId = medId;
              if (lotId && lotId !== line.lotId) updates.lotId = lotId;
              if (unit && unit !== line.unit) updates.unit = normalizeUnit(unit);
              if (Object.keys(updates).length > 0) {
                onBatchChange(updates);
              }
            }}
            selectedLotId={line.lotId}
            selectedReasons={selectedReasons}
            context={detectedContext}
          />
        </div>

        {/* Amount */}
        <div className="w-24 flex-shrink-0">
          <Input
            type="number"
            placeholder="Qty"
            value={line.amount}
            onChange={(e) => onChange('amount', e.target.value)}
            min="0"
            step="0.01"
          />
        </div>

        {/* Unit */}
        <div className="w-28 flex-shrink-0">
          <Select
            value={line.unit}
            onChange={(e) => onChange('unit', e.target.value)}
            options={unitOptions}
          />
        </div>

        {/* Remove */}
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 transition-colors mt-1"
          aria-label="Remove medication"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Validation errors/warnings -- only show if there are problems */}
      {lotValidation && (lotValidation.errors.length > 0 || lotValidation.warnings.length > 0) && (
        <div className="mt-2 ml-10 space-y-1">
          {lotValidation.errors.map((error, i) => (
            <p key={`err-${i}`} className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              {error}
            </p>
          ))}
          {lotValidation.warnings.map((warning, i) => (
            <p key={`warn-${i}`} className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              {warning}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default MedicationLineItem;
