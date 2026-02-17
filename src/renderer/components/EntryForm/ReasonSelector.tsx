import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { DispenseReason, ReasonContext, DispenseReasonConfig } from '../../types';
import { getReasonContext } from '../../data/reasonInstructionMapping';

interface ReasonSelectorProps {
  selectedReasons: DispenseReason[];
  onChange: (reasons: DispenseReason[]) => void;
  reasonConfigs?: DispenseReasonConfig[];
  selectedMedicationName?: string;
}

// Grouped reason options
const defaultReasonConfigs: DispenseReasonConfig[] = [
  // Treatment
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
  // PrEP
  { value: 'PrEP - Daily', label: 'PrEP - Daily', context: 'prep', color: 'teal', linksToInstructions: true, description: 'Daily pre-exposure prophylaxis' },
  { value: 'PrEP - On-Demand', label: 'PrEP - On-Demand', context: 'prep', color: 'teal', linksToInstructions: true, description: 'Event-driven PrEP (2-1-1)' },
  { value: 'PrEP - Event-Driven', label: 'PrEP - Event-Driven', context: 'prep', color: 'teal', linksToInstructions: true, description: 'Event-driven PrEP regimen' },
  // PEP
  { value: 'nPEP - 28 Day Course', label: 'nPEP - 28 Day', context: 'pep', color: 'amber', linksToInstructions: true, description: 'Non-occupational PEP for 28 days' },
  { value: 'nPEP - Occupational', label: 'nPEP - Occupational', context: 'pep', color: 'amber', linksToInstructions: true, description: 'Occupational exposure PEP' },
  // Prevention
  { value: 'Doxy-PEP', label: 'Doxy-PEP', context: 'prevention', color: 'emerald', linksToInstructions: true, description: 'Doxycycline post-exposure prophylaxis' },
  // Prophylaxis
  { value: 'PCP Prophylaxis', label: 'PCP Prophylaxis', context: 'prophylaxis', color: 'purple', linksToInstructions: true, description: 'Pneumocystis pneumonia prevention' },
  { value: 'Toxoplasmosis Prophylaxis', label: 'Toxoplasmosis Prophylaxis', context: 'prophylaxis', color: 'purple', linksToInstructions: true, description: 'Toxoplasmosis prevention' },
  { value: 'MAC Prophylaxis', label: 'MAC Prophylaxis', context: 'prophylaxis', color: 'purple', linksToInstructions: true, description: 'Mycobacterium avium complex prevention' },
  { value: 'Herpes Prophylaxis', label: 'Herpes Prophylaxis', context: 'prophylaxis', color: 'purple', linksToInstructions: true, description: 'Herpes simplex prevention' },
  { value: 'Fungal Prophylaxis', label: 'Fungal Prophylaxis', context: 'prophylaxis', color: 'purple', linksToInstructions: true, description: 'Fungal infection prevention' },
  // General
  { value: 'Scheduled Medication', label: 'Scheduled Medication', context: 'other', color: 'gray', linksToInstructions: false, description: 'Regularly scheduled medication' },
  { value: 'PRN (As Needed)', label: 'PRN (As Needed)', context: 'other', color: 'gray', linksToInstructions: false, description: 'As needed medication' },
  { value: 'STAT/Emergency', label: 'STAT/Emergency', context: 'other', color: 'red', linksToInstructions: false, description: 'Emergency medication' },
  { value: 'New Order', label: 'New Order', context: 'other', color: 'gray', linksToInstructions: false, description: 'New medication order' },
  { value: 'Discharge', label: 'Discharge', context: 'other', color: 'gray', linksToInstructions: false, description: 'Discharge medication' },
  { value: 'Transfer', label: 'Transfer', context: 'other', color: 'gray', linksToInstructions: false, description: 'Transfer medication' },
  { value: 'Waste', label: 'Waste', context: 'other', color: 'gray', linksToInstructions: false, description: 'Wasted medication' },
];

const groupLabels: Record<ReasonContext, string> = {
  treatment: 'Treatment',
  prep: 'PrEP',
  pep: 'PEP',
  prevention: 'Prevention',
  prophylaxis: 'Prophylaxis',
  other: 'General',
};

const chipColors: Record<ReasonContext, string> = {
  treatment: 'bg-blue-100 text-blue-700',
  prep: 'bg-teal-100 text-teal-700',
  pep: 'bg-amber-100 text-amber-700',
  prevention: 'bg-emerald-100 text-emerald-700',
  prophylaxis: 'bg-purple-100 text-purple-700',
  other: 'bg-gray-100 text-gray-700',
};

export const ReasonSelector: React.FC<ReasonSelectorProps> = ({
  selectedReasons,
  onChange,
  reasonConfigs = defaultReasonConfigs,
  selectedMedicationName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  // Fetch available contexts for selected medication
  const [availableContexts, setAvailableContexts] = useState<ReasonContext[]>([]);
  useEffect(() => {
    const fetchContexts = async () => {
      if (selectedMedicationName && window.electron?.instruction?.getContextsForMedication) {
        try {
          const contexts = await window.electron.instruction.getContextsForMedication(selectedMedicationName);
          setAvailableContexts(contexts || []);
        } catch (error) {
          console.error('Failed to fetch contexts for medication:', error);
          setAvailableContexts([]);
        }
      } else {
        setAvailableContexts([]);
      }
    };
    fetchContexts();
  }, [selectedMedicationName]);

  // Recommended reasons based on medication
  const recommendedReasons = useMemo(() => {
    if (availableContexts.length === 0) return new Set<DispenseReason>();
    const recommended = new Set<DispenseReason>();
    reasonConfigs.forEach(reason => {
      const reasonCtx = getReasonContext(reason.value);
      if (availableContexts.includes(reasonCtx)) {
        recommended.add(reason.value);
      }
    });
    return recommended;
  }, [availableContexts, reasonConfigs]);

  // Group and filter reasons
  const groupedReasons = useMemo(() => {
    const filtered = search
      ? reasonConfigs.filter(r => r.label.toLowerCase().includes(search.toLowerCase()))
      : reasonConfigs;

    const groups: Record<ReasonContext, DispenseReasonConfig[]> = {
      treatment: [],
      prep: [],
      pep: [],
      prevention: [],
      prophylaxis: [],
      other: [],
    };

    filtered.forEach(r => {
      if (groups[r.context]) {
        groups[r.context].push(r);
      }
    });

    return groups;
  }, [reasonConfigs, search]);

  const toggleReason = (reason: DispenseReason) => {
    if (selectedReasons.includes(reason)) {
      onChange(selectedReasons.filter(r => r !== reason));
    } else {
      onChange([...selectedReasons, reason]);
    }
  };

  const removeReason = (reason: DispenseReason) => {
    onChange(selectedReasons.filter(r => r !== reason));
  };

  const getContextForReason = (reason: DispenseReason): ReasonContext => {
    const config = reasonConfigs.find(r => r.value === reason);
    return config?.context || 'other';
  };

  const getLabelForReason = (reason: DispenseReason): string => {
    const config = reasonConfigs.find(r => r.value === reason);
    return config?.label || reason;
  };

  const hasGroupedResults = Object.values(groupedReasons).some(g => g.length > 0);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button styled like a select */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-left shadow-sm hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
      >
        <span className={`text-sm ${selectedReasons.length === 0 ? 'text-gray-400' : 'text-gray-700'}`}>
          {selectedReasons.length === 0
            ? 'Select dispensing reason(s)...'
            : `${selectedReasons.length} reason${selectedReasons.length !== 1 ? 's' : ''} selected`}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Selected reasons as chips */}
      {selectedReasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedReasons.map(reason => {
            const ctx = getContextForReason(reason);
            return (
              <span
                key={reason}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${chipColors[ctx]}`}
              >
                {getLabelForReason(reason)}
                <button
                  type="button"
                  onClick={() => removeReason(reason)}
                  className="hover:opacity-70"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-30 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-72 overflow-hidden">
          {/* Search within dropdown */}
          <div className="p-2 border-b border-gray-100">
            <input
              ref={searchRef}
              type="text"
              placeholder="Search reasons..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-sm rounded-md border border-gray-200 px-2.5 py-1.5 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
            />
          </div>

          {/* Grouped options */}
          <div className="overflow-y-auto max-h-56">
            {!hasGroupedResults && (
              <p className="p-3 text-sm text-gray-500 text-center">No reasons match your search</p>
            )}

            {(Object.entries(groupedReasons) as [ReasonContext, DispenseReasonConfig[]][]).map(
              ([context, reasons]) => {
                if (reasons.length === 0) return null;
                return (
                  <div key={context}>
                    <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide sticky top-0">
                      {groupLabels[context]}
                    </div>
                    {reasons.map(reason => {
                      const isSelected = selectedReasons.includes(reason.value);
                      const isRecommended = recommendedReasons.has(reason.value);
                      return (
                        <button
                          key={reason.value}
                          type="button"
                          onClick={() => toggleReason(reason.value)}
                          className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50 transition-colors ${
                            isSelected ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? 'bg-blue-600 border-blue-600'
                                  : 'border-gray-300'
                              }`}
                            >
                              {isSelected && (
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </span>
                            <span className={isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}>
                              {reason.label}
                            </span>
                          </div>
                          {isRecommended && !isSelected && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                              Suggested
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReasonSelector;
