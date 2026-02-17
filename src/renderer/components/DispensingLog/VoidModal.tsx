import React, { useState } from 'react';
import { AlertTriangle, X, Ban, ShieldAlert } from 'lucide-react';
import { Button } from '../common/Button';
import { PinInput } from '../common/PinInput';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { DispenseRecord } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface VoidModalProps {
  record: DispenseRecord | null;
  onClose: () => void;
  onVoid: (recordId: string, reason: string) => void;
}

type VoidStep = 'reason' | 'confirm' | 'verify' | 'final-confirm';

export const VoidModal: React.FC<VoidModalProps> = ({ record, onClose, onVoid }) => {
  const [step, setStep] = useState<VoidStep>('reason');
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const { login } = useAuth();

  if (!record) return null;

  const handleReasonSubmit = () => {
    if (!reason.trim()) return;
    setStep('confirm');
  };

  const handleConfirm = () => {
    setStep('verify');
  };

  const handleVerify = async () => {
    if (pin.length !== 4) return;

    setIsVerifying(true);
    setPinError(null);

    const result = await login(pin);

    if (result.success) {
      // Show final confirmation dialog before actually voiding
      setShowFinalConfirm(true);
    } else {
      setPinError(result.message || 'Invalid PIN. Please try again.');
      setPin('');
    }

    setIsVerifying(false);
  };

  const handleFinalConfirm = () => {
    onVoid(record.id, reason);
    setShowFinalConfirm(false);
    onClose();
  };

  const handleCancelFinalConfirm = () => {
    setShowFinalConfirm(false);
    // Stay on verify step
  };

  const resetAndClose = () => {
    setStep('reason');
    setReason('');
    setPin('');
    setPinError(null);
    setShowFinalConfirm(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <Ban className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Void Record</h3>
                  <p className="text-sm text-gray-500">Record: {record.id}</p>
                </div>
              </div>
              <button
                onClick={resetAndClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {step === 'reason' && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">Warning</p>
                      <p className="text-sm text-red-700">
                        Voiding a record is permanent and cannot be undone. The record will be marked as voided but retained for audit purposes.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Voiding <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why this record is being voided..."
                    rows={3}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                  />
                </div>
              </div>
            )}

            {step === 'confirm' && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">Final Confirmation</p>
                      <p className="text-sm text-amber-700">
                        You are about to void a dispensing record for {record.patientName}. This action requires supervisor verification.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Reason provided:</p>
                  <p className="text-gray-900">{reason}</p>
                </div>
              </div>
            )}

            {step === 'verify' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800">Supervisor Verification Required</p>
                      <p className="text-sm text-blue-700">
                        Enter your PIN to proceed. A final confirmation will be shown before the record is voided.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-center text-gray-600">
                  Enter your PIN to continue
                </p>
                <div className="flex justify-center">
                  <PinInput
                    length={4}
                    value={pin}
                    onChange={setPin}
                    onComplete={handleVerify}
                    mask={true}
                    error={pinError || undefined}
                    disabled={isVerifying}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl flex gap-3">
            {step === 'reason' && (
              <>
                <Button variant="ghost" onClick={resetAndClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleReasonSubmit}
                  disabled={!reason.trim()}
                  className="flex-1"
                >
                  Continue
                </Button>
              </>
            )}

            {step === 'confirm' && (
              <>
                <Button variant="ghost" onClick={() => setStep('reason')} className="flex-1">
                  Back
                </Button>
                <Button
                  variant="danger"
                  onClick={handleConfirm}
                  className="flex-1"
                >
                  Continue to Verification
                </Button>
              </>
            )}

            {step === 'verify' && (
              <>
                <Button variant="ghost" onClick={() => setStep('confirm')} className="flex-1">
                  Back
                </Button>
                <Button
                  variant="danger"
                  onClick={handleVerify}
                  isLoading={isVerifying}
                  disabled={pin.length !== 4}
                  className="flex-1"
                >
                  Verify & Continue
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Final Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showFinalConfirm}
        title="Final Warning: Void Record"
        message={
          <div className="space-y-3">
            <p className="font-medium text-red-700">
              This action <strong>CANNOT BE UNDONE</strong>.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-red-900">You are about to void:</p>
              <ul className="mt-2 space-y-1 text-red-800">
                <li>• Record ID: <span className="font-mono">{record.id}</span></li>
                <li>• Patient: <strong>{record.patientName}</strong></li>
                <li>• Chart Number: {record.patientChartNumber}</li>
                <li>• Dispensed: {new Date(record.dispensedAt).toLocaleDateString()}</li>
                <li>• Reason: {reason}</li>
              </ul>
            </div>
            <p className="text-sm text-gray-600">
              The record will be permanently marked as voided and retained for audit purposes only.
            </p>
          </div>
        }
        confirmText="Yes, Void This Record"
        cancelText="Cancel"
        onConfirm={handleFinalConfirm}
        onCancel={handleCancelFinalConfirm}
        danger
      />
    </>
  );
};

export default VoidModal;
