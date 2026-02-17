import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, AlertTriangle, Plus, X } from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';
import { useAuth } from '../../contexts/AuthContext';
import type { MedicationStock, MedicationLot, DispenseReason, ReasonContext } from '../../types';
import { getInstructionPriority } from '../../data/reasonInstructionMapping';

interface MedicationSelectorProps {
  value: string;
  onChange: (medicationId: string, lotId?: string, unit?: string) => void;
  selectedLotId?: string;
  selectedReasons?: DispenseReason[];
  context?: ReasonContext | null;
}

// ---------------------------------------------------------------------------
// New-medication inline form data
// ---------------------------------------------------------------------------

interface NewMedFormData {
  medication_name: string;
  lot_number: string;
  expiration_date: string;
  quantity: string;
  unit: string;
}

const emptyMedForm: NewMedFormData = {
  medication_name: '',
  lot_number: '',
  expiration_date: '',
  quantity: '',
  unit: 'tablets',
};

const unitChoices = [
  { value: 'tablets', label: 'Tablets' },
  { value: 'capsules', label: 'Capsules' },
  { value: 'ml', label: 'mL' },
  { value: 'mg', label: 'mg' },
  { value: 'units', label: 'Units' },
  { value: 'vials', label: 'Vials' },
  { value: 'bottles', label: 'Bottles' },
];

export const MedicationSelector: React.FC<MedicationSelectorProps> = ({
  value,
  onChange,
  selectedLotId,
  selectedReasons = [],
  context = null,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [medications, setMedications] = useState<MedicationStock[]>([]);
  const [catalogMedications, setCatalogMedications] = useState<any[]>([]);
  const [selectedMed, setSelectedMed] = useState<MedicationStock | null>(null);
  const [availableLots, setAvailableLots] = useState<MedicationLot[]>([]);

  // New-medication form state
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState<NewMedFormData>(emptyMedForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const { searchMedications, getMedicationById, getLotsForMedication, loadInventory } = useInventory();
  const { staff } = useAuth();

  // Fetch catalog medications by context
  useEffect(() => {
    const fetchCatalog = async () => {
      if (context && window.electron?.instruction?.getMedicationsByContext) {
        try {
          const meds = await window.electron.instruction.getMedicationsByContext(context);
          setCatalogMedications(meds || []);
        } catch {
          setCatalogMedications([]);
        }
      } else if (window.electron?.instruction?.getAllMedicationsCatalog) {
        try {
          const meds = await window.electron.instruction.getAllMedicationsCatalog();
          setCatalogMedications(meds || []);
        } catch {
          setCatalogMedications([]);
        }
      }
    };
    fetchCatalog();
  }, [context]);

  // Click outside to close dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sync selected medication when `value` (medicationId) changes.
  // Only depend on `value` — the callbacks are stable enough via useInventory.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let cancelled = false;
    if (value) {
      getMedicationById(value).then((med) => {
        if (cancelled) return;
        setSelectedMed(med);
        if (med) setAvailableLots(getLotsForMedication(med.id));
      });
    } else {
      setSelectedMed(null);
      setAvailableLots([]);
    }
    return () => { cancelled = true; };
  }, [value]);

  // Priority medications for selected reason
  const priorityMedications = useMemo(() => {
    if (selectedReasons.length === 0) return [];
    return getInstructionPriority(selectedReasons[0]);
  }, [selectedReasons]);

  // Build filtered + sorted medication list
  const filteredMedications = useMemo(() => {
    let list =
      medications.length > 0
        ? medications
        : catalogMedications.map((m) => ({
            id: m.medicationName,
            name: m.medicationName,
            genericName: m.genericName || m.medicationName,
            category: 'Medication',
            dosageForm: m.form || 'Tablet',
            strength: m.strength || '',
            controlledSubstance: false,
            lots: [],
            totalQuantity: 0,
            reorderPoint: 30,
            reorderQuantity: 100,
          }));

    if (context && catalogMedications.length > 0) {
      const names = new Set(catalogMedications.map((m) => m.medicationName.toLowerCase()));
      list = list.filter((m) => names.has(m.name.toLowerCase()));
    }

    if (priorityMedications.length > 0) {
      list = [...list].sort((a, b) => {
        const aIdx = priorityMedications.findIndex((p) =>
          a.name.toLowerCase().includes(p.toLowerCase())
        );
        const bIdx = priorityMedications.findIndex((p) =>
          b.name.toLowerCase().includes(p.toLowerCase())
        );
        if (aIdx === -1 && bIdx === -1) return 0;
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });
    }

    return list;
  }, [medications, catalogMedications, context, priorityMedications]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 2) {
        const results = await searchMedications(query);
        setMedications(results);
      } else {
        setMedications([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query, searchMedications]);

  const handleSelectMedication = (med: MedicationStock) => {
    setSelectedMed(med);
    const lots = getLotsForMedication(med.id);
    setAvailableLots(lots);
    if (lots.length > 0) {
      onChange(med.id, lots[0].id, lots[0].unitOfMeasure);
    } else {
      onChange(med.id);
    }
    setIsOpen(false);
    setQuery('');
    setShowNewForm(false);
  };

  const handleLotChange = (lotId: string) => {
    const lot = availableLots.find((l) => l.id === lotId);
    if (lot && selectedMed) {
      onChange(selectedMed.id, lotId, lot.unitOfMeasure);
    }
  };

  const formatExpiration = (date: Date) => {
    const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { text: 'Expired', color: 'text-red-600' };
    if (days <= 30) return { text: `${days}d left`, color: 'text-amber-600' };
    return { text: date.toLocaleDateString(), color: 'text-gray-600' };
  };

  // ---------------------------------------------------------------------------
  // New medication form handlers
  // ---------------------------------------------------------------------------

  const handleOpenNewForm = () => {
    setNewForm({ ...emptyMedForm, medication_name: query.trim() });
    setFormError(null);
    setShowNewForm(true);
    setIsOpen(false);
  };

  const handleCancelNewForm = () => {
    setShowNewForm(false);
    setNewForm(emptyMedForm);
    setFormError(null);
  };

  const handleSaveNewMedication = async () => {
    if (!newForm.medication_name.trim()) {
      setFormError('Medication name is required');
      return;
    }
    if (!newForm.lot_number.trim()) {
      setFormError('Lot number is required');
      return;
    }
    if (!newForm.expiration_date) {
      setFormError('Expiration date is required');
      return;
    }
    const qty = parseFloat(newForm.quantity);
    if (!qty || qty <= 0) {
      setFormError('Quantity must be greater than 0');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      if (!window.electron?.inventory?.receive) {
        throw new Error('Inventory API is not available. Please restart the application.');
      }
      const staffId = staff ? parseInt(staff.id) : 1;
      const result = await window.electron.inventory.receive({
        medication_name: newForm.medication_name.trim(),
        lot_number: newForm.lot_number.trim(),
        expiration_date: newForm.expiration_date,
        quantity_received: qty,
        unit: newForm.unit,
        received_date: new Date().toISOString().split('T')[0],
        received_by: staffId,
      });

      if (result) {
        // Reload inventory so the new medication appears in search
        await loadInventory();

        // Auto-select the newly created medication
        // The result is the inventory row — use medication_name as the search key
        const searchResults = await searchMedications(newForm.medication_name.trim());
        if (searchResults.length > 0) {
          handleSelectMedication(searchResults[0]);
        }
        setShowNewForm(false);
        setNewForm(emptyMedForm);
      } else {
        setFormError('Failed to add medication. Please try again.');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Failed to add medication');
    } finally {
      setIsSaving(false);
    }
  };

  // =========================================================================
  // Render: selected medication + lot dropdown
  // =========================================================================

  if (selectedMed) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="font-medium text-gray-900 text-sm">{selectedMed.name}</span>
            <button
              type="button"
              onClick={() => onChange('', '', '')}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              Change
            </button>
          </div>
        </div>

        <select
          value={selectedLotId || ''}
          onChange={(e) => handleLotChange(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2"
        >
          <option value="">Select lot...</option>
          {availableLots.map((lot) => {
            const exp = formatExpiration(lot.expirationDate);
            return (
              <option key={lot.id} value={lot.id}>
                Lot {lot.lotNumber} — Qty: {lot.quantityOnHand} {lot.unitOfMeasure} — Exp: {exp.text}
              </option>
            );
          })}
        </select>
        {availableLots.length === 0 && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            No available lots
          </p>
        )}
      </div>
    );
  }

  // =========================================================================
  // Render: search + dropdown + new form
  // =========================================================================

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search medication..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 pr-8"
        />
        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>

      {/* Dropdown results */}
      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-52 overflow-auto">
          {filteredMedications.map((med) => {
            const lots = getLotsForMedication(med.id);
            const hasStock = lots.some((l) => l.quantityOnHand > 0);
            return (
              <button
                key={med.id}
                onClick={() => handleSelectMedication(med)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0 flex items-center justify-between"
              >
                <span className="font-medium text-gray-900">{med.name}</span>
                {!hasStock && lots.length > 0 && (
                  <span className="text-xs text-red-500">Out of stock</span>
                )}
                {!hasStock && lots.length === 0 && (
                  <span className="text-xs text-gray-400">No lots</span>
                )}
              </button>
            );
          })}

          {/* "Add new" option at bottom */}
          {query.length >= 1 && (
            <button
              onClick={handleOpenNewForm}
              className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-t border-gray-100 flex items-center gap-2 text-blue-600"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">
                {filteredMedications.length === 0
                  ? `No results — add "${query.trim()}" as new`
                  : 'Add new medication'}
              </span>
            </button>
          )}

          {query.length >= 2 && filteredMedications.length === 0 && !showNewForm && (
            <div className="px-3 py-1 text-xs text-gray-400 text-center">
              Type a name and click "Add new" to receive stock
            </div>
          )}
        </div>
      )}

      {/* Inline new medication form */}
      {showNewForm && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-medium text-gray-700">Receive New Medication</h4>
            <button type="button" onClick={handleCancelNewForm} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Medication Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newForm.medication_name}
                onChange={(e) => setNewForm({ ...newForm, medication_name: e.target.value })}
                placeholder="e.g. Doxycycline 100mg"
                className="w-full rounded-md border border-gray-300 text-sm px-2.5 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Lot Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newForm.lot_number}
                onChange={(e) => setNewForm({ ...newForm, lot_number: e.target.value })}
                placeholder="e.g. LOT-2026-001"
                className="w-full rounded-md border border-gray-300 text-sm px-2.5 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Expiration Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={newForm.expiration_date}
                onChange={(e) => setNewForm({ ...newForm, expiration_date: e.target.value })}
                className="w-full rounded-md border border-gray-300 text-sm px-2.5 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={newForm.quantity}
                onChange={(e) => setNewForm({ ...newForm, quantity: e.target.value })}
                placeholder="100"
                min="1"
                className="w-full rounded-md border border-gray-300 text-sm px-2.5 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
              <select
                value={newForm.unit}
                onChange={(e) => setNewForm({ ...newForm, unit: e.target.value })}
                className="w-full rounded-md border border-gray-300 text-sm px-2.5 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {unitChoices.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formError && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleCancelNewForm}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveNewMedication}
              disabled={isSaving}
              className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md px-3 py-1.5 disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save & Select'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicationSelector;
