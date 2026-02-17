import React, { useState } from 'react';
import { User, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const ProfilePanel: React.FC = () => {
  const { staff } = useAuth();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!currentPin || !newPin || !confirmPin) {
      setMessage({ type: 'error', text: 'Please fill in all PIN fields.' });
      return;
    }
    if (newPin.length < 4) {
      setMessage({ type: 'error', text: 'New PIN must be at least 4 characters.' });
      return;
    }
    if (newPin !== confirmPin) {
      setMessage({ type: 'error', text: 'New PIN and confirmation do not match.' });
      return;
    }
    if (!window.electron?.staff?.changeOwnPin) {
      setMessage({ type: 'error', text: 'Change PIN is not available.' });
      return;
    }
    setLoading(true);
    try {
      await window.electron.staff.changeOwnPin(currentPin, newPin);
      setMessage({ type: 'success', text: 'PIN changed successfully.' });
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to change PIN.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-100 rounded-full">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">My Profile</h3>
            <p className="text-sm text-gray-500">Your account information</p>
          </div>
        </div>
        <dl className="grid grid-cols-1 gap-3">
          <div>
            <dt className="text-sm font-medium text-gray-500">Name</dt>
            <dd className="text-sm font-medium text-gray-900 mt-0.5">{staff?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Role</dt>
            <dd className="text-sm font-medium text-gray-900 mt-0.5 capitalize">{staff?.role ?? '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Lock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Change PIN</h3>
            <p className="text-sm text-gray-500">Use a PIN that is at least 4 characters</p>
          </div>
        </div>
        <form onSubmit={handleChangePin} className="space-y-4 max-w-sm">
          <div>
            <label htmlFor="current-pin" className="block text-sm font-medium text-gray-700 mb-1">
              Current PIN
            </label>
            <input
              id="current-pin"
              type="password"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="••••"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label htmlFor="new-pin" className="block text-sm font-medium text-gray-700 mb-1">
              New PIN
            </label>
            <input
              id="new-pin"
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="••••"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label htmlFor="confirm-pin" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm new PIN
            </label>
            <input
              id="confirm-pin"
              type="password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="••••"
              autoComplete="new-password"
            />
          </div>
          {message && (
            <div
              className={`p-3 rounded-lg text-sm ${
                message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Change PIN'}
          </button>
        </form>
      </div>
    </div>
  );
};
