import React, { useState, useEffect } from 'react';
import { Calendar, Calculator, AlertCircle, CheckCircle } from 'lucide-react';
import type { MedicationInstructionTemplate } from '../../data/medicationInstructions';
import { Input } from '../common/Input';
import { Button } from '../common/Button';

interface DaySupplyCalculatorProps {
  quantity: number;
  instructions: MedicationInstructionTemplate | null;
  calculatedSupply: number;
  onChange: (supply: number) => void;
  isManualOverride: boolean;
}

export const DaySupplyCalculator: React.FC<DaySupplyCalculatorProps> = ({
  quantity,
  instructions,
  calculatedSupply,
  onChange,
  isManualOverride,
}) => {
  const [manualValue, setManualValue] = useState<string>(calculatedSupply.toString());
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isManualOverride && !isEditing) {
      setManualValue(calculatedSupply.toString());
    }
  }, [calculatedSupply, isManualOverride, isEditing]);

  const handleManualChange = (value: string) => {
    setManualValue(value);
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onChange(parsed);
    }
  };

  const handleUseCalculated = () => {
    onChange(calculatedSupply);
    setManualValue(calculatedSupply.toString());
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  // Determine if the quantity matches standard supply
  const isStandardMatch = instructions && quantity > 0
    ? calculatedSupply === quantity / instructions.daySupplyMultiplier * instructions.daySupplyMultiplier
    : true;

  // Check for potential issues
  const hasWarning = !isStandardMatch || (instructions && calculatedSupply < 7);
  const warningMessage = !isStandardMatch
    ? 'Quantity does not match standard day supply'
    : calculatedSupply < 7
      ? 'Less than 7 days supply - verify accuracy'
      : '';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Day Supply</h3>
        </div>
        {isManualOverride && (
          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
            Manual Override
          </span>
        )}
      </div>

      {/* Calculated Display */}
      <div className="space-y-3">
        {instructions && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Auto-calculated:</span>
              <span className="font-semibold text-gray-900">
                {calculatedSupply} days
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Based on {quantity} {quantity === 1 ? 'unit' : 'units'} × {instructions.daySupplyMultiplier}-day multiplier
            </div>
          </div>
        )}

        {/* Manual Override Input */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">
              Day Supply for Label
            </label>
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              value={manualValue}
              onChange={(e) => handleManualChange(e.target.value)}
              onFocus={handleStartEdit}
              min="1"
              max="365"
              className="flex-1"
              placeholder="Enter day supply"
            />
            {isManualOverride && calculatedSupply.toString() !== manualValue && (
              <Button
                variant="secondary"
                size="md"
                onClick={handleUseCalculated}
                type="button"
              >
                Use Auto
              </Button>
            )}
          </div>
        </div>

        {/* Status Indicator */}
        <div className={`
          flex items-start gap-2 p-3 rounded-lg border
          ${hasWarning
            ? 'bg-amber-50 border-amber-200'
            : 'bg-emerald-50 border-emerald-200'
          }
        `}>
          {hasWarning ? (
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          ) : (
            <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1">
            {hasWarning ? (
              <>
                <p className="text-sm font-medium text-amber-700">Verification Needed</p>
                <p className="text-xs text-amber-600 mt-0.5">{warningMessage}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-emerald-700">Looks Good</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {calculatedSupply}-day supply matches standard calculations
                </p>
              </>
            )}
          </div>
        </div>

        {/* Context-specific guidance */}
        {instructions && instructions.context === 'pep' && calculatedSupply !== 28 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-medium text-amber-700">
              PEP typically requires 28-day supply
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Current: {calculatedSupply} days. Standard: 28 days.
            </p>
          </div>
        )}

        {instructions && instructions.context === 'prep' && calculatedSupply < 30 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-medium text-blue-700">
              PrEP standard is 30-day supply (90-day also common)
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Current: {calculatedSupply} days. Consider standardizing to 30 or 90 days.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DaySupplyCalculator;
