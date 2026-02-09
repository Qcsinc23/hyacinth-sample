import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Info, Pill, Beaker, ShieldAlert, Clock, Stethoscope, Baby } from 'lucide-react';
import type { Medication } from '../../types';
import { MEDICATIONS_DATA, type MedicationDetails } from '../../data';

interface GuideCardProps {
  medication: Medication & {
    lots?: Array<{ lotNumber: string; expirationDate: Date; quantityOnHand: number }>;
    totalQuantity?: number;
  };
  isExpanded?: boolean;
  onToggle?: () => void;
}

export const GuideCard: React.FC<GuideCardProps> = ({
  medication,
  isExpanded = false,
  onToggle,
}) => {
  // Get detailed medication data if available
  const detailedInfo: MedicationDetails | undefined = MEDICATIONS_DATA[medication.name];

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${medication.controlledSubstance ? 'border-purple-200' : 'border-gray-200'} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${medication.controlledSubstance ? 'bg-purple-100' : 'bg-blue-100'}`}>
            <Pill className={`h-5 w-5 ${medication.controlledSubstance ? 'text-purple-600' : 'text-blue-600'}`} />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">{medication.name}</h3>
            {medication.genericName && (
              <p className="text-sm text-gray-500">{medication.genericName}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {medication.controlledSubstance && (
            <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-medium">
              C-{medication.schedule}
            </span>
          )}
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {medication.category}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Dosage Form</p>
              <p className="font-medium text-gray-900">{medication.dosageForm}</p>
            </div>
            {medication.strength && (
              <div>
                <p className="text-gray-500">Strength</p>
                <p className="font-medium text-gray-900">{medication.strength}</p>
              </div>
            )}
            {medication.storageRequirements && (
              <div className="col-span-2">
                <p className="text-gray-500">Storage</p>
                <p className="font-medium text-gray-900">{medication.storageRequirements}</p>
              </div>
            )}
          </div>

          {/* Detailed Dosing Information */}
          {detailedInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="flex items-center gap-2 font-medium text-blue-800 mb-2">
                <Stethoscope className="h-4 w-4" />
                Dosing Information
              </h4>
              <div className="text-sm text-blue-900 space-y-2">
                <p><span className="font-medium">Standard Dose:</span> {detailedInfo.standardDose}</p>
                <p><span className="font-medium">Frequency:</span> {detailedInfo.frequency}</p>
                <p><span className="font-medium">Duration:</span> {detailedInfo.duration}</p>
                <p><span className="font-medium">Food:</span> {
                  detailedInfo.withFood === 'required' ? 'MUST take with food' :
                  detailedInfo.withFood === 'yes' ? 'Take with food' :
                  detailedInfo.withFood === 'no' ? 'Take on empty stomach' :
                  'Can take with or without food'
                }</p>
                {detailedInfo.indication && (
                  <p><span className="font-medium">Indication:</span> {detailedInfo.indication}</p>
                )}
              </div>
            </div>
          )}

          {/* Special Instructions */}
          {detailedInfo?.specialInstructions && detailedInfo.specialInstructions.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <h4 className="flex items-center gap-2 font-medium text-indigo-800 mb-2">
                <Info className="h-4 w-4" />
                Special Instructions
              </h4>
              <ul className="text-sm text-indigo-900 space-y-1">
                {detailedInfo.specialInstructions.map((instruction, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 bg-indigo-500 rounded-full flex-shrink-0" />
                    {instruction}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {(medication.warnings && medication.warnings.length > 0) || (detailedInfo?.warnings && detailedInfo.warnings.length > 0) ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <h4 className="flex items-center gap-2 font-medium text-amber-800 mb-2">
                <AlertTriangle className="h-4 w-4" />
                Warnings
              </h4>
              <ul className="text-sm text-amber-700 space-y-1">
                {medication.warnings?.map((warning, i) => (
                  <li key={`m-${i}`} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 bg-amber-500 rounded-full flex-shrink-0" />
                    {warning}
                  </li>
                ))}
                {detailedInfo?.warnings.map((warning, i) => (
                  <li key={`d-${i}`} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 bg-amber-500 rounded-full flex-shrink-0" />
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Contraindications */}
          {medication.contraindications && medication.contraindications.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="flex items-center gap-2 font-medium text-red-800 mb-2">
                <ShieldAlert className="h-4 w-4" />
                Contraindications
              </h4>
              <ul className="text-sm text-red-700 space-y-1">
                {medication.contraindications.map((contra, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 bg-red-500 rounded-full flex-shrink-0" />
                    {contra}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Common Dosages */}
          {medication.commonDosages && medication.commonDosages.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 font-medium text-gray-900 mb-2">
                <Beaker className="h-4 w-4 text-gray-400" />
                Common Dosages
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {medication.commonDosages.map((dosage, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 bg-gray-400 rounded-full flex-shrink-0" />
                    {dosage}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Drug Interactions */}
          {detailedInfo?.drugInteractions && detailedInfo.drugInteractions.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="flex items-center gap-2 font-medium text-red-800 mb-2">
                <ShieldAlert className="h-4 w-4" />
                Drug Interactions
              </h4>
              <ul className="text-sm text-red-700 space-y-1">
                {detailedInfo.drugInteractions.map((interaction, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 bg-red-500 rounded-full flex-shrink-0" />
                    {interaction}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Patient Counseling */}
          {detailedInfo?.counselingPoints && detailedInfo.counselingPoints.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h4 className="flex items-center gap-2 font-medium text-green-800 mb-2">
                <Info className="h-4 w-4" />
                Patient Counseling Points
              </h4>
              <ul className="text-sm text-green-900 space-y-1">
                {detailedInfo.counselingPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 bg-green-500 rounded-full flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Monitoring Requirements */}
          {detailedInfo?.monitoringRequirements && detailedInfo.monitoringRequirements.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <h4 className="flex items-center gap-2 font-medium text-purple-800 mb-2">
                <Clock className="h-4 w-4" />
                Monitoring Requirements
              </h4>
              <ul className="text-sm text-purple-900 space-y-1">
                {detailedInfo.monitoringRequirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 bg-purple-500 rounded-full flex-shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Special Populations */}
          {(detailedInfo?.renalConsiderations || detailedInfo?.hepaticConsiderations || detailedInfo?.pregnancyCategory) && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <h4 className="flex items-center gap-2 font-medium text-orange-800 mb-2">
                <Baby className="h-4 w-4" />
                Special Populations
              </h4>
              <div className="text-sm text-orange-900 space-y-2">
                {detailedInfo.renalConsiderations && (
                  <p><span className="font-medium">Renal:</span> {detailedInfo.renalConsiderations}</p>
                )}
                {detailedInfo.hepaticConsiderations && (
                  <p><span className="font-medium">Hepatic:</span> {detailedInfo.hepaticConsiderations}</p>
                )}
                {detailedInfo.pregnancyCategory && (
                  <p><span className="font-medium">Pregnancy:</span> {detailedInfo.pregnancyCategory}</p>
                )}
              </div>
            </div>
          )}

          {/* Side Effects */}
          {medication.sideEffects && medication.sideEffects.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 font-medium text-gray-900 mb-2">
                <Info className="h-4 w-4 text-gray-400" />
                Common Side Effects
              </h4>
              <div className="flex flex-wrap gap-2">
                {medication.sideEffects.map((effect, i) => (
                  <span
                    key={i}
                    className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                  >
                    {effect}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Current Stock Info */}
          {medication.totalQuantity !== undefined && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="font-medium text-gray-900 mb-2">Current Stock</h4>
              <p className="text-sm text-gray-600">
                Total Quantity: <span className="font-medium">{medication.totalQuantity}</span>
              </p>
              {medication.lots && medication.lots.length > 0 && (
                <div className="mt-2 space-y-1">
                  {medication.lots.map((lot, i) => (
                    <p key={i} className="text-xs text-gray-500">
                      Lot {lot.lotNumber}: {lot.quantityOnHand} (Exp: {lot.expirationDate.toLocaleDateString()})
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GuideCard;
