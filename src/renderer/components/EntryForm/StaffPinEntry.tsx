import React, { useState } from 'react';
import { Shield, Lock, X } from 'lucide-react';
import { PinInput } from '../common/PinInput';
import { Button } from '../common/Button';
import { useAuth } from '../../contexts/AuthContext';

interface StaffPinEntryProps {
  onVerify: () => void;
  onCancel: () => void;
}

export const StaffPinEntry: React.FC<StaffPinEntryProps> = ({ onVerify, onCancel }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const { login, staff } = useAuth();

  const handlePinComplete = async (enteredPin: string) => {
    setIsVerifying(true);
    setError(null);

    try {
      // Verify the PIN matches the current user
      const result = await login(enteredPin);

      if (result.success) {
        onVerify();
      } else {
        setError(result.message || 'Invalid PIN. Please try again.');
        setPin('');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Verify Identity</h3>
                <p className="text-sm text-gray-500">Enter your PIN to confirm</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {staff && (
            <div className="mb-6 text-center">
              <p className="text-sm text-gray-600">Confirming as</p>
              <p className="font-semibold text-gray-900">{staff.name}</p>
              <p className="text-xs text-gray-500 capitalize">{staff.role}</p>
            </div>
          )}

          <div className="flex justify-center mb-4">
            <PinInput
              length={4}
              onChange={setPin}
              onComplete={handlePinComplete}
              mask={true}
              error={error || undefined}
              disabled={isVerifying}
            />
          </div>

          <p className="text-xs text-center text-gray-500 mt-4">
            <Lock className="h-3 w-3 inline mr-1" />
            This action requires PIN verification for audit purposes
          </p>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl flex gap-3">
          <Button
            variant="ghost"
            onClick={onCancel}
            fullWidth
          >
            Cancel
          </Button>
          <Button
            onClick={() => handlePinComplete(pin)}
            isLoading={isVerifying}
            disabled={pin.length !== 4}
            fullWidth
          >
            Verify & Save
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StaffPinEntry;
