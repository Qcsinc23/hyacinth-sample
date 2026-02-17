import React, { useState } from 'react';
import { Lock, User } from 'lucide-react';

interface LockScreenProps {
  user: { id: number; name: string; role: string };
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ user, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!window.electron?.staff?.verify || !window.electron?.app?.unlock) {
        throw new Error('Application API is not available. Please restart.');
      }
      const result = await window.electron.staff.verify(pin) as {
        success: boolean;
        staff?: { id: number };
      };
      if (result.success && result.staff?.id === user.id) {
        await window.electron.app.unlock();
        onUnlock();
      } else {
        if (window.electron?.app?.logout) {
          await window.electron.app.logout();
        }
        setError('Invalid PIN. Please try again.');
        setPin('');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinChange = (value: string) => {
    if (value.length <= 4 && /^\d*$/.test(value)) {
      setPin(value);
      setError('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <User className="w-8 h-8 text-gray-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
          <p className="text-gray-500 capitalize">{user.role}</p>
          <p className="text-sm text-orange-600 mt-2">
            Session locked due to inactivity
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Re-enter your PIN to continue
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest"
                placeholder="••••"
                maxLength={4}
                autoFocus
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={pin.length !== 4 || isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Unlocking...' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
};
