import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, AlertTriangle, Package } from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';
import type { MedicationStock, MedicationLot } from '../../types';

interface MedicationSelectorProps {
  value: string;
  onChange: (medicationId: string, lotId?: string, unit?: string) => void;
  selectedLotId?: string;
}

export const MedicationSelector: React.FC<MedicationSelectorProps> = ({
  value,
  onChange,
  selectedLotId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [medications, setMedications] = useState<MedicationStock[]>([]);
  const [selectedMed, setSelectedMed] = useState<MedicationStock | null>(null);
  const [availableLots, setAvailableLots] = useState<MedicationLot[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const { searchMedications, getMedicationById, getLotsForMedication } = useInventory();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value) {
      getMedicationById(value).then(med => {
        setSelectedMed(med);
        if (med) {
          const lots = getLotsForMedication(med.id);
          setAvailableLots(lots);
        }
      });
    } else {
      setSelectedMed(null);
      setAvailableLots([]);
    }
  }, [value, getMedicationById, getLotsForMedication]);

  useEffect(() => {
    const fetchMedications = async () => {
      if (query.length >= 2) {
        const results = await searchMedications(query);
        setMedications(results);
      } else {
        setMedications([]);
      }
    };

    const debounceTimer = setTimeout(fetchMedications, 200);
    return () => clearTimeout(debounceTimer);
  }, [query, searchMedications]);

  const handleSelectMedication = (med: MedicationStock) => {
    setSelectedMed(med);
    const lots = getLotsForMedication(med.id);
    setAvailableLots(lots);
    
    // Auto-select the first lot (FIFO) if available
    if (lots.length > 0) {
      const firstLot = lots[0];
      onChange(med.id, firstLot.id, lots[0].unitOfMeasure);
    } else {
      onChange(med.id);
    }
    
    setIsOpen(false);
    setQuery('');
  };

  const handleLotChange = (lotId: string) => {
    const lot = availableLots.find(l => l.id === lotId);
    if (lot && selectedMed) {
      onChange(selectedMed.id, lotId, lot.unitOfMeasure);
    }
  };

  const formatExpirationDate = (date: Date) => {
    const daysUntil = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return { text: 'Expired', color: 'text-red-600' };
    if (daysUntil <= 30) return { text: `${daysUntil}d`, color: 'text-amber-600' };
    return { text: date.toLocaleDateString(), color: 'text-gray-600' };
  };

  if (selectedMed) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{selectedMed.name}</p>
                <p className="text-xs text-gray-500">{selectedMed.category}</p>
              </div>
              <button
                type="button"
                onClick={() => onChange('', '', '')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Change
              </button>
            </div>
          </div>
        </div>

        {/* Lot Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Lot <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedLotId || ''}
            onChange={(e) => handleLotChange(e.target.value)}
            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
          >
            <option value="">Select a lot...</option>
            {availableLots.map((lot) => {
              const exp = formatExpirationDate(lot.expirationDate);
              return (
                <option key={lot.id} value={lot.id}>
                  Lot {lot.lotNumber} - Qty: {lot.quantityOnHand} {lot.unitOfMeasure} - Exp: {exp.text}
                </option>
              );
            })}
          </select>
          {availableLots.length === 0 && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              No available lots for this medication
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Medication <span className="text-red-500">*</span>
      </label>
      <div
        onClick={() => setIsOpen(true)}
        className="relative cursor-pointer"
      >
        <input
          type="text"
          placeholder="Search medications..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2 pr-10"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {isOpen && medications.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-auto">
          {medications.map((med) => {
            const lots = getLotsForMedication(med.id);
            const hasStock = lots.some(l => l.quantityOnHand > 0);
            const hasExpiring = lots.some(l => {
              const daysUntil = Math.ceil((l.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return daysUntil <= 30 && daysUntil > 0;
            });

            return (
              <button
                key={med.id}
                onClick={() => handleSelectMedication(med)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{med.name}</p>
                    <p className="text-xs text-gray-500">
                      {med.category} • {med.dosageForm}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!hasStock && (
                      <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                        Out of Stock
                      </span>
                    )}
                    {hasExpiring && hasStock && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        Expiring Soon
                      </span>
                    )}
                    {med.controlledSubstance && (
                      <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                        C-II
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {isOpen && query.length >= 2 && medications.length === 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 p-4 text-center">
          <p className="text-gray-500">No medications found</p>
        </div>
      )}
    </div>
  );
};

export default MedicationSelector;
