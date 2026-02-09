import React from 'react';
import { Edit, AlertTriangle, Package, Calendar } from 'lucide-react';
import type { ReasonContext } from '../../types';
import { Button } from '../common/Button';

interface InstructionPreviewCardProps {
  medicationName: string;
  strength: string;
  indication?: string;
  instructions: string[];
  warnings: string[];
  daySupply: number;
  context: ReasonContext;
  onEdit?: () => void;
}

const contextConfig: Record<ReasonContext, { label: string; bgColor: string; textColor: string; borderColor: string }> = {
  treatment: {
    label: 'Treatment',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  prevention: {
    label: 'Prevention',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
  },
  prophylaxis: {
    label: 'Prophylaxis',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
  },
  pep: {
    label: 'PEP',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
  },
  prep: {
    label: 'PrEP',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-200',
  },
  other: {
    label: 'Other',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
  },
};

export const InstructionPreviewCard: React.FC<InstructionPreviewCardProps> = ({
  medicationName,
  strength,
  indication,
  instructions,
  warnings,
  daySupply,
  context,
  onEdit,
}) => {
  const contextStyle = contextConfig[context] || contextConfig.other;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header with context badge and edit button */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-gray-600" />
          <div>
            <h3 className="font-semibold text-gray-900">{medicationName}</h3>
            <p className="text-sm text-gray-500">{strength}{indication && ` • ${indication}`}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`
            px-3 py-1 rounded-full text-xs font-semibold border
            ${contextStyle.bgColor} ${contextStyle.textColor} ${contextStyle.borderColor}
          `}>
            {contextStyle.label}
          </span>
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              leftIcon={<Edit className="h-4 w-4" />}
              aria-label="Edit instructions"
            >
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Day Supply Badge */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{daySupply}</span>-day supply
          </span>
        </div>

        {/* Instructions Section */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Instructions:</h4>
          <ul className="space-y-1.5">
            {instructions.map((instruction, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">•</span>
                <span>{instruction}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Warnings Section */}
        {warnings.length > 0 && (
          <div className={`
            rounded-lg border p-3
            ${warnings.some(w => w.toLowerCase().includes('severe') || w.toLowerCase().includes('critical'))
              ? 'bg-red-50 border-red-200'
              : 'bg-amber-50 border-amber-200'
            }
          `}>
            <div className="flex items-start gap-2">
              <AlertTriangle className={`
                h-4 w-4 mt-0.5 flex-shrink-0
                ${warnings.some(w => w.toLowerCase().includes('severe') || w.toLowerCase().includes('critical'))
                  ? 'text-red-500'
                  : 'text-amber-500'
                }
              `} />
              <div className="flex-1">
                <h4 className={`
                  text-xs font-semibold uppercase tracking-wide mb-1.5
                  ${warnings.some(w => w.toLowerCase().includes('severe') || w.toLowerCase().includes('critical'))
                    ? 'text-red-700'
                    : 'text-amber-700'
                  }
                `}>
                  Important Warnings
                </h4>
                <ul className="space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index} className={`
                      text-xs
                      ${warnings.some(w => w.toLowerCase().includes('severe') || w.toLowerCase().includes('critical'))
                        ? 'text-red-600'
                        : 'text-amber-600'
                      }
                    `}>
                      • {warning}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer - Preview Label */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          This preview shows what will print on the pharmacy label
        </p>
      </div>
    </div>
  );
};

export default InstructionPreviewCard;
