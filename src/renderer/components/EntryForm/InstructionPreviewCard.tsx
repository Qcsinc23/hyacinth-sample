import React, { useState, useEffect } from 'react';
import { Edit2 } from 'lucide-react';
import type { ReasonContext } from '../../types';

/** NJ Board of Pharmacy compliant clinic info - matches printed label */
const CLINIC_INFO = {
  name: 'HYACINTH HEALTH & WELLNESS CLINIC',
  address: '317 George St, New Brunswick, NJ 08901',
  phone: '(862) 240-1461',
};

export interface LabelOverrides {
  customDirections?: string;
  customQuantity?: number;
}

interface InstructionPreviewCardProps {
  medicationName: string;
  strength: string;
  form?: string;
  indication?: string;
  instructions: string[];
  directions: string;
  warnings: string[];
  daySupply: number;
  quantity: number;
  unit: string;
  context: ReasonContext;
  patientFirstName?: string;
  patientLastName?: string;
  /** Callback when user edits directions or quantity - values flow to print */
  onSaveOverrides?: (overrides: LabelOverrides) => void;
  initialOverrides?: LabelOverrides;
}

/**
 * WYSIWYG label preview - displays exactly what will print on the NJ-compliant prescription label.
 * Clinician can edit dose, quantity, or directions before printing.
 */
export const InstructionPreviewCard: React.FC<InstructionPreviewCardProps> = ({
  medicationName,
  strength,
  form,
  indication,
  directions,
  warnings,
  quantity,
  unit,
  instructions: _instructions,
  daySupply: _daySupply,
  context: _context,
  patientFirstName,
  patientLastName,
  onSaveOverrides,
  initialOverrides,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [customDirections, setCustomDirections] = useState(directions);
  const [customQuantity, setCustomQuantity] = useState(quantity);

  useEffect(() => {
    setCustomDirections(initialOverrides?.customDirections ?? directions);
    setCustomQuantity(initialOverrides?.customQuantity ?? quantity);
  }, [directions, quantity, initialOverrides]);

  const handleBlur = () => {
    if (onSaveOverrides) {
      const hasChanges =
        customDirections !== directions || customQuantity !== quantity;
      if (hasChanges) {
        onSaveOverrides({
          customDirections: customDirections !== directions ? customDirections : undefined,
          customQuantity: customQuantity !== quantity ? customQuantity : undefined,
        });
      }
    }
  };

  const patientName = [patientFirstName, patientLastName].filter(Boolean).join(' ') || 'Patient Name';

  return (
    <div className="border-2 border-gray-800 rounded-md p-4 bg-white shadow-sm font-mono max-w-sm text-sm">
      {/* Header - Clinic info, matches NJ label */}
      <div className="flex justify-between items-start border-b border-gray-300 pb-2 mb-2">
        <div>
          <h4 className="font-bold text-xs uppercase text-gray-800">
            {CLINIC_INFO.name}
          </h4>
          <p className="text-[10px] text-gray-600">{CLINIC_INFO.address}</p>
          <p className="text-[10px] text-gray-600">{CLINIC_INFO.phone}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="text-blue-600 hover:text-blue-800 p-1 rounded"
          aria-label={isEditing ? 'Done editing' : 'Edit label'}
        >
          <Edit2 size={16} />
        </button>
      </div>

      {/* Patient name - NJ requires bold/larger */}
      <p className="text-sm font-bold uppercase mb-2">{patientName}</p>

      {/* Medication name, strength, form - NJ required */}
      <div className="my-2">
        <p className="font-bold text-base uppercase">
          {medicationName} {strength}
          {form ? ` ${form}` : ''}
        </p>
        <div className="flex gap-4 text-xs mt-1">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <span>QTY:</span>
              <input
                type="number"
                min={1}
                value={customQuantity}
                onChange={(e) =>
                  setCustomQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                onBlur={handleBlur}
                className="border border-blue-300 rounded px-1 w-14 text-gray-900"
              />
              <span>{unit}</span>
            </div>
          ) : (
            <p>QTY: {customQuantity} {unit}</p>
          )}
        </div>
      </div>

      {/* Directions - NJ requires exact directions for use */}
      <div className="bg-gray-100 p-2 rounded mt-2">
        <p className="text-[10px] text-gray-500 mb-1 uppercase">Directions:</p>
        {isEditing ? (
          <textarea
            value={customDirections}
            onChange={(e) => setCustomDirections(e.target.value)}
            onBlur={handleBlur}
            className="w-full text-xs border border-blue-300 rounded p-1 font-mono text-gray-900"
            rows={3}
          />
        ) : (
          <p className="text-xs font-bold uppercase leading-tight">{customDirections}</p>
        )}
      </div>

      {/* Auxiliary warnings - NJ requires manufacturer/clinical warnings */}
      {warnings && warnings.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {warnings.map((warning, i) => (
            <span
              key={i}
              className="text-[10px] bg-yellow-200 border border-yellow-400 px-1.5 py-0.5 rounded"
            >
              {warning}
            </span>
          ))}
        </div>
      )}

      {indication && (
        <p className="text-[10px] text-gray-500 mt-2 italic">For: {indication}</p>
      )}
      <p className="text-[10px] text-gray-400 mt-2 text-center">
        WYSIWYG — This is what will print on the label
      </p>
    </div>
  );
};

export default InstructionPreviewCard;
