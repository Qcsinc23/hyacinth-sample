import React from 'react';
import { Activity, Shield, Pill, AlertCircle, UserCheck, HelpCircle } from 'lucide-react';
import type { ReasonContext, DispenseReason, DispenseReasonConfig } from '../../types';

interface ContextIndicatorProps {
  context: ReasonContext | null;
  reasons: DispenseReason[];
  reasonConfigs?: DispenseReasonConfig[];
}

const contextConfig: Record<ReasonContext, {
  label: string;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  borderColor: string;
  description: string;
}> = {
  treatment: {
    label: 'Treatment',
    icon: <Activity className="h-4 w-4" />,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-300',
    description: 'Medication for treating an existing condition',
  },
  prevention: {
    label: 'Prevention',
    icon: <Shield className="h-4 w-4" />,
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-300',
    description: 'Medication to prevent infection or condition',
  },
  prophylaxis: {
    label: 'Prophylaxis',
    icon: <Pill className="h-4 w-4" />,
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-300',
    description: 'Preventive treatment for at-risk patients',
  },
  pep: {
    label: 'PEP',
    icon: <AlertCircle className="h-4 w-4" />,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-300',
    description: 'Post-Exposure Prophylaxis - Emergency prevention',
  },
  prep: {
    label: 'PrEP',
    icon: <UserCheck className="h-4 w-4" />,
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-300',
    description: 'Pre-Exposure Prophylaxis - Ongoing prevention',
  },
  other: {
    label: 'Other',
    icon: <HelpCircle className="h-4 w-4" />,
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-300',
    description: 'General dispensing',
  },
};

// Default reason configurations if not provided
const defaultReasonConfigs: DispenseReasonConfig[] = [
  // Treatment reasons
  { value: 'HIV Treatment - Initial', label: 'HIV Treatment - Initial', context: 'treatment', color: 'blue', linksToInstructions: true, description: 'Starting HIV antiretroviral therapy' },
  { value: 'HIV Treatment - Continuation', label: 'HIV Treatment - Continuation', context: 'treatment', color: 'blue', linksToInstructions: true, description: 'Continuing existing HIV regimen' },
  { value: 'STI Treatment - Chlamydia', label: 'STI Treatment - Chlamydia', context: 'treatment', color: 'blue', linksToInstructions: true, description: 'Chlamydia infection treatment' },
  { value: 'STI Treatment - Gonorrhea', label: 'STI Treatment - Gonorrhea', context: 'treatment', color: 'blue', linksToInstructions: true, description: 'Gonorrhea infection treatment' },
  { value: 'STI Treatment - Syphilis', label: 'STI Treatment - Syphilis', context: 'treatment', color: 'blue', linksToInstructions: true, description: 'Syphilis infection treatment' },
  { value: 'STI Treatment - Multiple', label: 'STI Treatment - Multiple', context: 'treatment', color: 'blue', linksToInstructions: true, description: 'Multiple STI treatment' },
  { value: 'UTI Treatment', label: 'UTI Treatment', context: 'treatment', color: 'blue', linksToInstructions: true, description: 'Urinary tract infection treatment' },
  { value: 'Skin Infection Treatment', label: 'Skin Infection Treatment', context: 'treatment', color: 'blue', linksToInstructions: true, description: 'Skin/soft tissue infection treatment' },
  { value: 'Respiratory Infection Treatment', label: 'Respiratory Infection Treatment', context: 'treatment', color: 'blue', linksToInstructions: true, description: 'Respiratory infection treatment' },
  { value: 'Other Infection Treatment', label: 'Other Infection Treatment', context: 'treatment', color: 'blue', linksToInstructions: true, description: 'Other infection treatment' },
  // Prevention reasons
  { value: 'PrEP - Daily', label: 'PrEP - Daily', context: 'prep', color: 'teal', linksToInstructions: true, description: 'Daily pre-exposure prophylaxis' },
  { value: 'PrEP - On-Demand', label: 'PrEP - On-Demand', context: 'prep', color: 'teal', linksToInstructions: true, description: 'Event-driven PrEP (2-1-1)' },
  { value: 'PrEP - Event-Driven', label: 'PrEP - Event-Driven', context: 'prep', color: 'teal', linksToInstructions: true, description: 'Event-driven PrEP regimen' },
  { value: 'nPEP - 28 Day Course', label: 'nPEP - 28 Day Course', context: 'pep', color: 'amber', linksToInstructions: true, description: 'Non-occupational PEP for 28 days' },
  { value: 'nPEP - Occupational', label: 'nPEP - Occupational', context: 'pep', color: 'amber', linksToInstructions: true, description: 'Occupational exposure PEP' },
  { value: 'Doxy-PEP', label: 'Doxy-PEP', context: 'prevention', color: 'emerald', linksToInstructions: true, description: 'Doxycycline post-exposure prophylaxis' },
  { value: 'PCP Prophylaxis', label: 'PCP Prophylaxis', context: 'prophylaxis', color: 'purple', linksToInstructions: true, description: 'Pneumocystis pneumonia prevention' },
  { value: 'Toxoplasmosis Prophylaxis', label: 'Toxoplasmosis Prophylaxis', context: 'prophylaxis', color: 'purple', linksToInstructions: true, description: 'Toxoplasmosis prevention' },
  { value: 'MAC Prophylaxis', label: 'MAC Prophylaxis', context: 'prophylaxis', color: 'purple', linksToInstructions: true, description: 'Mycobacterium avium complex prevention' },
  { value: 'Herpes Prophylaxis', label: 'Herpes Prophylaxis', context: 'prophylaxis', color: 'purple', linksToInstructions: true, description: 'Herpes simplex prevention' },
  { value: 'Fungal Prophylaxis', label: 'Fungal Prophylaxis', context: 'prophylaxis', color: 'purple', linksToInstructions: true, description: 'Fungal infection prevention' },
  // Legacy reasons
  { value: 'Scheduled Medication', label: 'Scheduled Medication', context: 'other', color: 'gray', linksToInstructions: false, description: 'Regularly scheduled medication' },
  { value: 'PRN (As Needed)', label: 'PRN (As Needed)', context: 'other', color: 'gray', linksToInstructions: false, description: 'As needed medication' },
  { value: 'STAT/Emergency', label: 'STAT/Emergency', context: 'treatment', color: 'red', linksToInstructions: false, description: 'Emergency medication' },
  { value: 'New Order', label: 'New Order', context: 'other', color: 'gray', linksToInstructions: false, description: 'New medication order' },
  { value: 'Discharge', label: 'Discharge', context: 'other', color: 'gray', linksToInstructions: false, description: 'Discharge medication' },
  { value: 'Transfer', label: 'Transfer', context: 'other', color: 'gray', linksToInstructions: false, description: 'Transfer medication' },
  { value: 'Waste', label: 'Waste', context: 'other', color: 'gray', linksToInstructions: false, description: 'Wasted medication' },
];

export const ContextIndicator: React.FC<ContextIndicatorProps> = ({
  context,
  reasons,
  reasonConfigs = defaultReasonConfigs,
}) => {
  const configs = reasonConfigs.length > 0 ? reasonConfigs : defaultReasonConfigs;

  // Get all contexts from selected reasons
  const selectedContexts = reasons
    .map(reason => configs.find(c => c.value === reason)?.context)
    .filter((c): c is ReasonContext => c !== undefined);

  // Detect conflicts (multiple different contexts)
  const hasConflict = selectedContexts.length > 1 &&
    !selectedContexts.every(c => c === selectedContexts[0]);

  // Get the primary context (first one or the one that appears most)
  const primaryContext = context || (selectedContexts[0] ?? null);

  const config = primaryContext ? contextConfig[primaryContext] : null;

  // Get selected reason details
  const selectedReasonDetails = reasons.map(reason =>
    configs.find(c => c.value === reason)
  ).filter((r): r is DispenseReasonConfig => r !== undefined);

  if (!config) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
        <HelpCircle className="h-5 w-5 text-gray-400" />
        <div>
          <p className="text-sm font-medium text-gray-600">No context detected</p>
          <p className="text-xs text-gray-500">Select dispense reasons to see context</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main Context Badge */}
      <div className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all duration-200
        ${config.bgColor} ${config.textColor} ${config.borderColor}
      `}>
        <div className={`
          p-2 rounded-full bg-white/50
        `}>
          {config.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base">{config.label}</span>
            {hasConflict && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full border border-red-300">
                Conflicting contexts
              </span>
            )}
          </div>
          <p className="text-sm opacity-80 mt-0.5">{config.description}</p>
        </div>
      </div>

      {/* Conflict Warning */}
      {hasConflict && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 font-medium">
            Multiple contexts detected
          </p>
          <p className="text-xs text-red-600 mt-1">
            You have selected reasons from different contexts. Instructions may not apply correctly to all medications.
          </p>
        </div>
      )}

      {/* Selected Reasons List */}
      {selectedReasonDetails.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Selected Reasons ({selectedReasonDetails.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedReasonDetails.map((reason) => {
              const reasonContextConfig = contextConfig[reason.context];
              return (
                <span
                  key={reason.value}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border
                    ${reasonContextConfig.bgColor} ${reasonContextConfig.textColor} ${reasonContextConfig.borderColor}
                  `}
                >
                  {reasonContextConfig.icon}
                  <span>{reason.label}</span>
                  {reason.linksToInstructions && (
                    <span className="ml-1 text-xs opacity-70">
                      Links to instructions
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContextIndicator;
