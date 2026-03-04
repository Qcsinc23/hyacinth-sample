import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Trash2, Save, AlertCircle, Check } from 'lucide-react';
import { format } from 'date-fns';

interface User {
  id: number;
  name: string;
  role: string;
}

interface Patient {
  id: number;
  chart_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone: string;
}

interface Medication {
  id: number;
  name: string;
  generic_name: string;
  dosing_instructions: string;
}

interface InventoryItem {
  id: number;
  lot_number: string;
  expiration_date: string;
  quantity_remaining: number;
}

interface LineItem {
  id: string;
  medication_id: number;
  medication_name: string;
  inventory_id: number;
  lot_number: string;
  expiration_date: string;
  quantity: number;
  instructions: string;
}

interface EntryFormProps {
  user: User;
}

export const EntryForm: React.FC<EntryFormProps> = ({ user }) => {
  const [chartNumber, setChartNumber] = useState('');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientSearchResults, setPatientSearchResults] = useState<Patient[]>([]);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadMedications();
    loadDraft();
  }, []);

  const loadMedications = async () => {
    try {
      if (!window.electron?.medication?.getAll) {
        throw new Error('Medication API is not available');
      }
      const meds = await window.electron.medication.getAll();
      setMedications(meds as Medication[]);
    } catch (err) {
      console.error('Error loading medications:', err);
    }
  };

  const loadDraft = async () => {
    try {
      if (!window.electron?.drafts?.get) return;
      const draft = await window.electron.drafts.get('entry_form', user.id);
      if (draft) {
        const data = (draft as any).form_data ?? (draft as any).draft_data;
        if (data?.chartNumber) setChartNumber(data.chartNumber);
        if (data?.patient) setPatient(data.patient);
        if (data?.lineItems) setLineItems(data.lineItems);
        if (data?.reason) setReason(data.reason);
        if (data?.notes) setNotes(data.notes);
      }
    } catch (err) {
      console.error('Error loading draft:', err);
    }
  };

  const saveDraft = useCallback(async () => {
    try {
      if (!window.electron?.drafts?.save) return;
      await window.electron.drafts.save('entry_form', {
        chartNumber,
        patient,
        lineItems,
        reason,
        notes,
      }, user.id);
    } catch (err) {
      console.error('Error saving draft:', err);
    }
  }, [chartNumber, patient, lineItems, reason, notes, user.id]);

  useEffect(() => {
    const interval = setInterval(saveDraft, 30000); // Auto-save every 30 seconds
    return () => clearInterval(interval);
  }, [saveDraft]);

  const handlePatientSearch = async (query: string) => {
    setChartNumber(query);
    if (query.length >= 2) {
      try {
        if (!window.electron?.patient?.search) {
          throw new Error('Patient API is not available');
        }
        const results = await window.electron.patient.search(query);
        setPatientSearchResults(results as Patient[]);
        setShowPatientSearch(true);
      } catch (err) {
        console.error('Error searching patients:', err);
      }
    } else {
      setShowPatientSearch(false);
    }
  };

  const selectPatient = (p: Patient) => {
    setPatient(p);
    setChartNumber(p.chart_number);
    setShowPatientSearch(false);
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      medication_id: 0,
      medication_name: '',
      inventory_id: 0,
      lot_number: '',
      expiration_date: '',
      quantity: 1,
      instructions: '',
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const updateLineItem = async (id: string, field: keyof LineItem, value: any) => {
    const updatedItems = lineItems.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setLineItems(updatedItems);

    // If medication changed, load available lots
    if (field === 'medication_id') {
      const medication = medications.find((m) => m.id === value);
      if (medication) {
        try {
          if (!window.electron?.inventory?.getByMedication) {
            throw new Error('Inventory API is not available');
          }
          const inventory = await window.electron.inventory.getByMedication(value);
          const inventoryItems = inventory as InventoryItem[];
          
          if (inventoryItems.length > 0) {
            const firstLot = inventoryItems[0];
            updateLineItemLot(id, firstLot, medication.name);
          }
        } catch (err) {
          console.error('Error loading inventory:', err);
        }
      }
    }
  };

  const updateLineItemLot = (itemId: string, lot: InventoryItem, medicationName: string) => {
    setLineItems((items) =>
      items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            inventory_id: lot.id,
            lot_number: lot.lot_number,
            expiration_date: lot.expiration_date,
            medication_name: medicationName,
          };
        }
        return item;
      })
    );
  };

  const handleSave = () => {
    if (!patient) {
      setSaveError('Please select a patient');
      return;
    }
    if (lineItems.length === 0) {
      setSaveError('Please add at least one medication');
      return;
    }
    if (lineItems.some((item) => item.medication_id === 0)) {
      setSaveError('Please select a medication for all line items');
      return;
    }
    setShowPinModal(true);
    setSaveError('');
  };

  const confirmSave = async () => {
    setIsSaving(true);
    try {
      if (!window.electron?.staff?.verifyAction || !window.electron?.dispensing?.create) {
        throw new Error('Application API is not available. Please restart.');
      }
      const verified = await window.electron.staff.verifyAction(pin, 'dispense') as { success: boolean };
      if (!verified.success) {
        setSaveError('Invalid PIN');
        setIsSaving(false);
        return;
      }

      // Generate record number
      const recordNumber = `DISP-${format(new Date(), 'yyyyMMdd')}-${Date.now().toString().slice(-4)}`;

      // Create dispensing record
      const dispensingData = {
        record_number: recordNumber,
        patient_id: patient!.id,
        dispensed_by: user.id,
        reason,
        notes,
        line_items: lineItems.map((item) => ({
          medication_id: item.medication_id,
          inventory_id: item.inventory_id,
          quantity_dispensed: item.quantity,
          lot_number: item.lot_number,
          expiration_date: item.expiration_date,
          instructions: item.instructions,
        })),
      };

      await window.electron.dispensing.create(dispensingData);

      // Clear draft
      if (window.electron?.drafts?.delete) {
        await window.electron.drafts.delete('entry_form', user.id);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        resetForm();
        setSaveSuccess(false);
      }, 2000);
    } catch (err) {
      setSaveError('Error saving record. Please try again.');
      console.error('Error saving:', err);
    } finally {
      setIsSaving(false);
      setShowPinModal(false);
      setPin('');
    }
  };

  const resetForm = () => {
    setChartNumber('');
    setPatient(null);
    setLineItems([]);
    setReason('');
    setNotes('');
    setSaveError('');
  };

  const getAvailableLots = async (medicationId: number) => {
    try {
      if (!window.electron?.inventory?.getByMedication) {
        throw new Error('Inventory API is not available');
      }
      const inventory = await window.electron.inventory.getByMedication(String(medicationId));
      return inventory as InventoryItem[];
    } catch (err) {
      return [];
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Patient Search */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Patient Information</h3>
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chart Number or Patient Name
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={chartNumber}
              onChange={(e) => handlePatientSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter chart number or search by name..."
              disabled={!!patient}
            />
            {patient && (
              <button
                onClick={() => {
                  setPatient(null);
                  setChartNumber('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>

          {showPatientSearch && patientSearchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
              {patientSearchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPatient(p)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <div className="font-medium text-gray-900">
                    {p.first_name} {p.last_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    Chart: {p.chart_number} | DOB: {p.date_of_birth}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {patient && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">Name:</span>
                <p className="font-medium">{patient.first_name} {patient.last_name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Chart Number:</span>
                <p className="font-medium">{patient.chart_number}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Date of Birth:</span>
                <p className="font-medium">{patient.date_of_birth}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Phone:</span>
                <p className="font-medium">{patient.phone || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Medications */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Medications</h3>
          <button
            onClick={addLineItem}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Medication
          </button>
        </div>

        {lineItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No medications added. Click "Add Medication" to start.
          </div>
        ) : (
          <div className="space-y-4">
            {lineItems.map((item, index) => (
              <LineItemRow
                key={item.id}
                item={item}
                index={index}
                medications={medications}
                onUpdate={(field, value) => updateLineItem(item.id, field, value)}
                onRemove={() => removeLineItem(item.id)}
                getAvailableLots={getAvailableLots}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reason and Notes */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Dispensing</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select reason...</option>
              <option value="nPEP">nPEP (non-occupational Post-Exposure Prophylaxis)</option>
              <option value="PrEP">PrEP (Pre-Exposure Prophylaxis)</option>
              <option value="Treatment">HIV Treatment</option>
              <option value="Prophylaxis">Prophylaxis</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={1}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional notes..."
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {saveError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {saveError}
        </div>
      )}

      {/* Success Message */}
      {saveSuccess && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <Check className="w-5 h-5" />
          Record saved successfully!
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={isSaving || !patient || lineItems.length === 0}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="w-5 h-5" />
          {isSaving ? 'Saving...' : 'Save & Print'}
        </button>
        <button
          onClick={resetForm}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Verify Identity</h3>
            <p className="text-sm text-gray-500 mb-4">
              Please enter your PIN to confirm this dispensing record.
            </p>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.slice(0, 4))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest mb-4"
              placeholder="••••"
              maxLength={4}
              autoFocus
            />
            {saveError && (
              <p className="text-sm text-red-600 mb-4">{saveError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setPin('');
                  setSaveError('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmSave}
                disabled={pin.length !== 4 || isSaving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                {isSaving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Line Item Row Component
interface LineItemRowProps {
  item: LineItem;
  index: number;
  medications: Medication[];
  onUpdate: (field: keyof LineItem, value: any) => void;
  onRemove: () => void;
  getAvailableLots: (medicationId: number) => Promise<InventoryItem[]>;
}

const LineItemRow: React.FC<LineItemRowProps> = ({
  item,
  index,
  medications,
  onUpdate,
  onRemove,
  getAvailableLots,
}) => {
  const [availableLots, setAvailableLots] = useState<InventoryItem[]>([]);

  useEffect(() => {
    if (item.medication_id) {
      getAvailableLots(item.medication_id).then(setAvailableLots);
    }
  }, [item.medication_id]);

  const selectedMedication = medications.find((m) => m.id === item.medication_id);

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">Item {index + 1}</span>
        <button
          onClick={onRemove}
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Medication</label>
          <select
            value={item.medication_id}
            onChange={(e) => onUpdate('medication_id', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value={0}>Select medication...</option>
            {medications.map((med) => (
              <option key={med.id} value={med.id}>
                {med.name} ({med.generic_name})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Lot Number</label>
          <select
            value={item.inventory_id}
            onChange={(e) => {
              const lot = availableLots.find((l) => l.id === parseInt(e.target.value));
              if (lot) {
                onUpdate('inventory_id', lot.id);
                onUpdate('lot_number', lot.lot_number);
                onUpdate('expiration_date', lot.expiration_date);
              }
            }}
            disabled={!item.medication_id || availableLots.length === 0}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value={0}>
              {availableLots.length === 0 ? 'No lots available' : 'Select lot...'}
            </option>
            {availableLots.map((lot) => (
              <option key={lot.id} value={lot.id}>
                {lot.lot_number} (Qty: {lot.quantity_remaining}, Exp: {lot.expiration_date})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
          <input
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) => onUpdate('quantity', parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {selectedMedication && (
        <div className="mt-3 p-3 bg-blue-50 rounded text-sm text-blue-800">
          <strong>Instructions:</strong> {selectedMedication.dosing_instructions}
        </div>
      )}

      <div className="mt-3">
        <label className="block text-xs font-medium text-gray-500 mb-1">Custom Instructions (Optional)</label>
        <input
          type="text"
          value={item.instructions}
          onChange={(e) => onUpdate('instructions', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Add any specific instructions for this item..."
        />
      </div>
    </div>
  );
};
