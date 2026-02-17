import React, { useState } from 'react';
import { X, Edit2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { MedicationStock, MedicationLot } from '../../types';
import { useInventory } from '../../hooks/useInventory';

interface AdjustStockModalProps {
  medication: MedicationStock;
  lot: MedicationLot | null;
  onClose: () => void;
  onAdjust: () => void;
}

export const AdjustStockModal: React.FC<AdjustStockModalProps> = ({
  medication,
  lot,
  onClose,
  onAdjust,
}) => {
  const [newQuantity, setNewQuantity] = useState(lot ? lot.quantityOnHand.toString() : medication.totalQuantity.toString());
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { adjustStock } = useInventory();

  const currentQuantity = lot ? lot.quantityOnHand : medication.totalQuantity;
  const newQuantityNum = parseInt(newQuantity || '0');
  const quantityDiff = newQuantityNum - currentQuantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim() || !newQuantity) return;

    // Show confirmation dialog
    setShowConfirm(true);
  };

  const handleConfirmAdjust = async () => {
    setIsSubmitting(true);
    
    try {
      if (lot) {
        await adjustStock(medication.id, lot.id, newQuantityNum, reason);
      }
      setShowConfirm(false);
      onAdjust();
    } catch (error) {
      console.error('Failed to adjust stock:', error);
      alert('Failed to adjust stock. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  const handleClose = () => {
    setNewQuantity(lot ? lot.quantityOnHand.toString() : medication.totalQuantity.toString());
    setReason('');
    setShowConfirm(false);
    onClose();
  };

  const getDiffColor = () => {
    if (quantityDiff > 0) return 'text-emerald-600';
    if (quantityDiff < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getDiffBgColor = () => {
    if (quantityDiff > 0) return 'bg-emerald-50 border-emerald-200';
    if (quantityDiff < 0) return 'bg-red-50 border-red-200';
    return 'bg-gray-50 border-gray-200';
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Edit2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Adjust Stock</h3>
                  <p className="text-sm text-gray-500">{medication.name}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {lot && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="text-gray-600">Lot: <span className="font-medium text-gray-900">{lot.lotNumber}</span></p>
                <p className="text-gray-600">Current Qty: <span className="font-medium text-gray-900">{lot.quantityOnHand}</span></p>
              </div>
            )}

            <Input
              label="New Quantity"
              type="number"
              required
              min="0"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
            />

            {quantityDiff !== 0 && (
              <div className={`p-3 rounded-lg border ${getDiffBgColor()}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Quantity Change:</span>
                  <span className={`font-semibold ${getDiffColor()}`}>
                    {quantityDiff > 0 ? '+' : ''}{quantityDiff} units
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Adjustment <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this adjustment is needed..."
                rows={3}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                required
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                Stock adjustments are logged for audit purposes. Please ensure the reason is accurate.
              </p>
            </div>
          </form>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl flex gap-3">
            <Button variant="ghost" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!reason.trim() || !newQuantity || quantityDiff === 0}
              className="flex-1"
            >
              Review Adjustment
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        title="Confirm Stock Adjustment"
        message={
          <div className="space-y-4">
            <p>
              Please review the stock adjustment details before confirming:
            </p>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-sm text-gray-500">Medication</p>
                <p className="font-medium text-gray-900">{medication.name}</p>
              </div>
              
              {lot && (
                <div>
                  <p className="text-sm text-gray-500">Lot Number</p>
                  <p className="font-medium text-gray-900">{lot.lotNumber}</p>
                </div>
              )}

              <div className="flex items-center gap-4 py-2 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Current</p>
                  <p className="text-2xl font-bold text-gray-900">{currentQuantity}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">New</p>
                  <p className={`text-2xl font-bold ${getDiffColor()}`}>{newQuantityNum}</p>
                </div>
                <div className="text-center ml-2">
                  <p className="text-xs text-gray-500 mb-1">Change</p>
                  <p className={`text-lg font-semibold ${getDiffColor()}`}>
                    {quantityDiff > 0 ? '+' : ''}{quantityDiff}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-3">
                <p className="text-sm text-gray-500">Reason</p>
                <p className="text-gray-900">{reason}</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This adjustment will be permanently recorded in the system audit log.
              </p>
            </div>
          </div>
        }
        confirmText="Confirm Adjustment"
        cancelText="Go Back"
        onConfirm={handleConfirmAdjust}
        onCancel={handleCancel}
        warning={quantityDiff < 0}
        info={quantityDiff >= 0}
        isLoading={isSubmitting}
      />
    </>
  );
};

export default AdjustStockModal;
