import React, { useState } from 'react';
import { AlertTriangle, X, Edit2 } from 'lucide-react';
import { Button } from '../common/Button';
import { PinInput } from '../common/PinInput';
import type { DispenseRecord } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface CorrectionModalProps {
  record: DispenseRecord | null;
  onClose: () => void;
  onCorrect: (recordId: string, correctionData: { reason: string; changes: string }) => void;
}

export const CorrectionModal: React.FC<CorrectionModalProps> = ({ record, onClose, onCorrect }) => {
  const [step, setStep] = useState<'reason' | 'verify'>('reason');
  const [reason, setReason] = useState('');
  const [changes, setChanges] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const { login } = useAuth();

  if (!record) return null;

  const handleReasonSubmit = () => {
    if (!reason.trim()) return;
    setStep('verify');
  };

  const handleVerify = async () => {
    if (pin.length !== 4) return;

    setIsVerifying(true);
    setPinError(null);

    const result = await login(pin);

    if (result.success) {
      onCorrect(record.id, { reason, changes });
      onClose();
    } else {
      setPinError(result.message || 'Invalid PIN. Please try again.');
      setPin('');
    }

    setIsVerifying(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-lg">
                <Edit2 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Correct Record</h3>
                <p className="text-sm text-gray-500">Record: {record.id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'reason' ? (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Important Notice</p>
                    <p className="text-sm text-amber-700">
                      Corrections create an audit trail. The original record will be preserved.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Correction <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this correction is needed..."
                  rows={3}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Changes Made
                </label>
                <textarea
                  value={changes}
                  onChange={(e) => setChanges(e.target.value)}
                  placeholder="Describe what was corrected..."
                  rows={2}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-gray-600">
                Enter your PIN to confirm this correction
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
          {step === 'reason' ? (
            <>
              <Button variant="ghost" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleReasonSubmit}
                disabled={!reason.trim()}
                className="flex-1"
              >
                Continue
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep('reason')} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleVerify}
                isLoading={isVerifying}
                disabled={pin.length !== 4}
                className="flex-1"
              >
                Verify & Correct
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CorrectionModal;
