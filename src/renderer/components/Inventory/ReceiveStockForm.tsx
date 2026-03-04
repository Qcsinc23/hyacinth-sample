import React, { useState } from 'react';
import { ArrowLeft, Package, Plus } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { DatePicker } from '../common/DatePicker';
import { useInventory } from '../../hooks/useInventory';

interface ReceiveStockFormProps {
  onComplete: () => void;
  onCancel: () => void;
}

const medicationOptions = [
  { value: 'med1', label: 'Amoxicillin 500mg' },
  { value: 'med2', label: 'Lisinopril 10mg' },
  { value: 'med3', label: 'Metformin 1000mg' },
  { value: 'med4', label: 'Oxycodone 5mg (C-II)' },
];

const unitOptions = [
  { value: '', label: 'Select unit...' },
  { value: 'tablets', label: 'Tablet(s)' },
  { value: 'capsules', label: 'Capsule(s)' },
  { value: 'vials', label: 'Vial(s)' },
  { value: 'bottles', label: 'Bottle(s)' },
];

export const ReceiveStockForm: React.FC<ReceiveStockFormProps> = ({
  onComplete,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    medicationId: '',
    lotNumber: '',
    quantity: '',
    unit: '',
    expirationDate: null as Date | null,
    ndc: '',
    supplier: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { receiveStock } = useInventory();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.medicationId || !formData.lotNumber || !formData.quantity || !formData.expirationDate) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await receiveStock(formData.medicationId, {
        lotNumber: formData.lotNumber,
        quantityOnHand: parseInt(formData.quantity),
        unitOfMeasure: formData.unit || 'units',
        expirationDate: formData.expirationDate,
        receivedDate: new Date(),
        supplier: formData.supplier || undefined,
        ndc: formData.ndc || undefined,
      });
      
      onComplete();
    } catch (error) {
      console.error('Failed to receive stock:', error);
      alert('Failed to receive stock. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center gap-3">
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Receive New Stock</h3>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Medication"
            required
            value={formData.medicationId}
            onChange={(e) => setFormData({ ...formData, medicationId: e.target.value })}
            options={[{ value: '', label: 'Select medication...' }, ...medicationOptions]}
          />

          <Input
            label="Lot Number"
            required
            value={formData.lotNumber}
            onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
            placeholder="Enter lot number"
          />

          <Input
            label="Quantity Received"
            type="number"
            required
            min="1"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            placeholder="Enter quantity"
          />

          <Select
            label="Unit of Measure"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            options={unitOptions}
          />

          <DatePicker
            label="Expiration Date"
            required
            value={formData.expirationDate}
            onChange={(date) => setFormData({ ...formData, expirationDate: date })}
            minDate={new Date()}
          />

          <Input
            label="NDC Number"
            value={formData.ndc}
            onChange={(e) => setFormData({ ...formData, ndc: e.target.value })}
            placeholder="Optional"
          />

          <Input
            label="Supplier"
            value={formData.supplier}
            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
            placeholder="Optional"
            className="md:col-span-2"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={!formData.medicationId || !formData.lotNumber || !formData.quantity || !formData.expirationDate}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Receive Stock
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ReceiveStockForm;
