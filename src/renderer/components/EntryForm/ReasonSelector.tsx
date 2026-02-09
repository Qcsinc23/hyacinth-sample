import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Activity, Shield, Pill, AlertCircle, UserCheck, HelpCircle } from 'lucide-react';
import type { DispenseReason, ReasonContext, DispenseReasonConfig } from '../../types';

interface ReasonSelectorProps {
  selectedReasons: DispenseReason[];
  onChange: (reasons: DispenseReason[]) => void;
  reasonConfigs?: DispenseReasonConfig[];
}

interface ReasonCategory {
  context: ReasonContext;
  label: string;
  icon: React.ReactNode;
  description: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

const categories: ReasonCategory[] = [
  {
    context: 'treatment',
    label: 'Treatment',
    icon: <Activity className="h-4 w-4" />,
    description: 'Medications for treating existing conditions',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
  },
  {
    context: 'prep',
    label: 'PrEP',
    icon: <UserCheck className="h-4 w-4" />,
    description: 'Pre-Exposure Prophylaxis for ongoing prevention',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    textColor: 'text-teal-700',
  },
  {
    context: 'pep',
    label: 'PEP',
    icon: <AlertCircle className="h-4 w-4" />,
    description: 'Post-Exposure Prophylaxis for emergency prevention',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
  },
  {
    context: 'prevention',
    label: 'Prevention',
    icon: <Shield className="h-4 w-4" />,
    description: 'Medications to prevent infections or conditions',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
  },
  {
    context: 'prophylaxis',
    label: 'Prophylaxis',
    icon: <Pill className="h-4 w-4" />,
    description: 'Preventive treatments for at-risk patients',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
  },
  {
    context: 'other',
    label: 'General',
    icon: <HelpCircle className="h-4 w-4" />,
    description: 'General dispensing reasons',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-700',
  },
];

// Default reason configurations
const defaultReasonConfigs: DispenseReasonConfig[] = [
  // Treatment reasons
  { value: 'HIV Treatment - Initial', label: 'HIV Treatment - Initial', context: 'treatment', color: 'blue', linksToInstructions: true, description: 'Starting HIV antiretroviral therapy' },
  { value: 'HIV Treatment - Continuation', label: 'HIV Treatment - Continuation', context: 'treatment', color: 'blue', linksToInstructions: true, description: 'Continuing existing HIV regimen' },
  { value: 'STI Treatment - Chlamydia', label: 'STI - Chlamydia', context: 'treatment', color: 'blue', linksToInstructions: true, description: 'Chlamydia infection treatment' },
  { value: 'STI Treatment - Gonorrhea', label: 'STI - Gonorrhea', context: 'treatment', color: 'blue', linksToInstructions: true, description: 'Gonorrhea infection treatment' },
  { value: 'STI Treatment - Syphilis', label: 'STI - Syphilis', context: 'treatment', color: 'blue', linksToInstructions: true, description: 'Syphilis infection treatment' },
  { value: 'STI Treatment - Multiple', label: 'STI - Multiple', context: 'treatment', color: 'blue', linksToInstructions: true, description: 'Multiple STI treatment' },
  { value: 'UTI Treatment', label: 'UTI Treatment', context: 'treatment', color: 'blue', linksToInstructions: true, description: 'Urinary tract infection treatment' },
  { value: 'Skin Infection Treatment', label: 'Skin Infection', context: 'treatment', color: 'blue', linksToInstructions: true, description: 'Skin/soft tissue infection treatment' },
  { value: 'Respiratory Infection Treatment', label: 'Respiratory Infection', context: 'treatment', color: 'blue', linksToInstructions: true, description: 'Respiratory infection treatment' },
  { value: 'Other Infection Treatment', label: 'Other Infection', context: 'treatment', color: 'blue', linksToInstructions: true, description: 'Other infection treatment' },
  // PrEP reasons
  { value: 'PrEP - Daily', label: 'PrEP - Daily', context: 'prep', color: 'teal', linksToInstructions: true, description: 'Daily pre-exposure prophylaxis' },
  { value: 'PrEP - On-Demand', label: 'PrEP - On-Demand', context: 'prep', color: 'teal', linksToInstructions: true, description: 'Event-driven PrEP (2-1-1)' },
  { value: 'PrEP - Event-Driven', label: 'PrEP - Event-Driven', context: 'prep', color: 'teal', linksToInstructions: true, description: 'Event-driven PrEP regimen' },
  // PEP reasons
  { value: 'nPEP - 28 Day Course', label: 'nPEP - 28 Day', context: 'pep', color: 'amber', linksToInstructions: true, description: 'Non-occupational PEP for 28 days' },
  { value: 'nPEP - Occupational', label: 'nPEP - Occupational', context: 'pep', color: 'amber', linksToInstructions: true, description: 'Occupational exposure PEP' },
  // Prevention reasons
  { value: 'Doxy-PEP', label: 'Doxy-PEP', context: 'prevention', color: 'emerald', linksToInstructions: true, description: 'Doxycycline post-exposure prophylaxis' },
  // Prophylaxis reasons
  { value: 'PCP Prophylaxis', label: 'PCP Prophylaxis', context: 'prophylaxis', color: 'purple', linksToInstructions: true, description: 'Pneumocystis pneumonia prevention' },
  { value: 'Toxoplasmosis Prophylaxis', label: 'Toxoplasmosis Prophylaxis', context: 'prophylaxis', color: 'purple', linksToInstructions: true, description: 'Toxoplasmosis prevention' },
  { value: 'MAC Prophylaxis', label: 'MAC Prophylaxis', context: 'prophylaxis', color: 'purple', linksToInstructions: true, description: 'Mycobacterium avium complex prevention' },
  { value: 'Herpes Prophylaxis', label: 'Herpes Prophylaxis', context: 'prophylaxis', color: 'purple', linksToInstructions: true, description: 'Herpes simplex prevention' },
  { value: 'Fungal Prophylaxis', label: 'Fungal Prophylaxis', context: 'prophylaxis', color: 'purple', linksToInstructions: true, description: 'Fungal infection prevention' },
  // General/Other reasons
  { value: 'Scheduled Medication', label: 'Scheduled Medication', context: 'other', color: 'gray', linksToInstructions: false, description: 'Regularly scheduled medication' },
  { value: 'PRN (As Needed)', label: 'PRN (As Needed)', context: 'other', color: 'gray', linksToInstructions: false, description: 'As needed medication' },
  { value: 'STAT/Emergency', label: 'STAT/Emergency', context: 'other', color: 'red', linksToInstructions: false, description: 'Emergency medication' },
  { value: 'New Order', label: 'New Order', context: 'other', color: 'gray', linksToInstructions: false, description: 'New medication order' },
  { value: 'Discharge', label: 'Discharge', context: 'other', color: 'gray', linksToInstructions: false, description: 'Discharge medication' },
  { value: 'Transfer', label: 'Transfer', context: 'other', color: 'gray', linksToInstructions: false, description: 'Transfer medication' },
  { value: 'Waste', label: 'Waste', context: 'other', color: 'gray', linksToInstructions: false, description: 'Wasted medication' },
];

const getSelectedColor = (context: ReasonContext): string => {
  const colorMap: Record<ReasonContext, string> = {
    treatment: 'bg-blue-100 text-blue-700 border-blue-300',
    prevention: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    prophylaxis: 'bg-purple-100 text-purple-700 border-purple-300',
    pep: 'bg-amber-100 text-amber-700 border-amber-300',
    prep: 'bg-teal-100 text-teal-700 border-teal-300',
    other: 'bg-gray-100 text-gray-700 border-gray-300',
  };
  return colorMap[context];
};

export const ReasonSelector: React.FC<ReasonSelectorProps> = ({
  selectedReasons,
  onChange,
  reasonConfigs = defaultReasonConfigs,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<ReasonContext>>(
    new Set(['treatment', 'prep', 'pep', 'prevention', 'prophylaxis', 'other'])
  );

  const toggleCategory = (context: ReasonContext) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(context)) {
      newExpanded.delete(context);
    } else {
      newExpanded.add(context);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleReason = (reason: DispenseReason) => {
    if (selectedReasons.includes(reason)) {
      onChange(selectedReasons.filter(r => r !== reason));
    } else {
      onChange([...selectedReasons, reason]);
    }
  };

  const toggleCategoryAll = (context: ReasonContext) => {
    const categoryReasons = reasonConfigs.filter(r => r.context === context);
    const allSelected = categoryReasons.every(r => selectedReasons.includes(r.value));

    if (allSelected) {
      // Deselect all in category
      onChange(selectedReasons.filter(r => !categoryReasons.some(cr => cr.value === r)));
    } else {
      // Select all in category
      const newSelected = [...selectedReasons];
      categoryReasons.forEach(cr => {
        if (!newSelected.includes(cr.value)) {
          newSelected.push(cr.value);
        }
      });
      onChange(newSelected);
    }
  };

  // Group reasons by category
  const groupedReasons = categories.map(category => ({
    ...category,
    reasons: reasonConfigs.filter(r => r.context === category.context),
  }));

  return (
    <div className="space-y-3">
      {groupedReasons.map(category => {
        const isExpanded = expandedCategories.has(category.context);
        const categorySelectedCount = category.reasons.filter(r =>
          selectedReasons.includes(r.value)
        ).length;
        const allCategorySelected = categorySelectedCount === category.reasons.length;

        return (
          <div
            key={category.context}
            className={`rounded-lg border-2 overflow-hidden transition-all duration-200 ${category.borderColor}`}
          >
            {/* Category Header */}
            <button
              type="button"
              onClick={() => toggleCategory(category.context)}
              className={`
                w-full flex items-center justify-between p-3 transition-colors
                ${category.bgColor} hover:opacity-90
              `}
            >
              <div className="flex items-center gap-2">
                <span className={category.textColor}>{category.icon}</span>
                <div className="text-left">
                  <div className={`font-semibold ${category.textColor}`}>
                    {category.label}
                    {categorySelectedCount > 0 && (
                      <span className={`ml-2 text-sm font-normal opacity-80`}>
                        ({categorySelectedCount} selected)
                      </span>
                    )}
                  </div>
                  <div className={`text-xs opacity-80 ${category.textColor}`}>
                    {category.description}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Select All Checkbox for Category */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCategoryAll(category.context);
                  }}
                  className={`
                    p-1 rounded border-2 flex items-center justify-center transition-colors
                    ${allCategorySelected
                      ? `${getSelectedColor(category.context)}`
                      : 'bg-white border-gray-300 hover:border-gray-400'
                    }
                  `}
                  aria-label={`Select all ${category.label}`}
                >
                  {allCategorySelected && (
                    <svg className="w-3 h-3 text-current" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                {/* Expand/Collapse Icon */}
                <span className={category.textColor}>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </div>
            </button>

            {/* Category Reasons */}
            {isExpanded && (
              <div className="p-3 bg-white border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  {category.reasons.map(reason => {
                    const isSelected = selectedReasons.includes(reason.value);
                    return (
                      <button
                        key={reason.value}
                        type="button"
                        onClick={() => toggleReason(reason.value)}
                        className={`
                          px-3 py-2 rounded-lg border-2 font-medium text-sm transition-all duration-200
                          ${isSelected
                            ? `${getSelectedColor(category.context)}`
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }
                        `}
                        title={reason.description}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`
                            w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-colors
                            ${isSelected ? 'border-current bg-current' : 'border-gray-300'}
                          `}>
                            {isSelected && (
                              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </span>
                          {reason.label}
                          {reason.linksToInstructions && (
                            <span className="text-xs opacity-70">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Context Summary */}
      {selectedReasons.length > 0 && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">{selectedReasons.length}</span> reason{selectedReasons.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}
    </div>
  );
};

export default ReasonSelector;
