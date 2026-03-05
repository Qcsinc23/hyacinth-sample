import React, { useState } from 'react';
import { User, Eye, EyeOff } from 'lucide-react';
import { PinInput } from './common/PinInput';

interface LoginScreenProps {
  onLogin: (user: { id: number; name: string; role: string }) => void;
}

// Healthcare-themed illustration component
const HealthcareIllustration: React.FC = () => (
  <svg
    viewBox="0 0 400 400"
    className="w-full h-full max-w-md"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Background circle */}
    <circle cx="200" cy="200" r="180" fill="#d1fae5" opacity="0.5" />
    <circle cx="200" cy="200" r="150" fill="#a7f3d0" opacity="0.3" />
    
    {/* Central medical cross/plus */}
    <g transform="translate(200, 180)">
      <rect x="-20" y="-60" width="40" height="120" rx="8" fill="#10b981" />
      <rect x="-60" y="-20" width="120" height="40" rx="8" fill="#10b981" />
      {/* Inner highlight */}
      <rect x="-14" y="-54" width="28" height="108" rx="4" fill="#34d399" opacity="0.3" />
      <rect x="-54" y="-14" width="108" height="28" rx="4" fill="#34d399" opacity="0.3" />
    </g>
    
    {/* Butterfly 1 - orange */}
    <g transform="translate(80, 100)">
      <path
        d="M0,0 Q-15,-20 -25,-10 Q-30,0 -20,10 Q-10,15 0,5 Q10,15 20,10 Q30,0 25,-10 Q15,-20 0,0"
        fill="#fbbf24"
        opacity="0.8"
      />
      <path
        d="M0,5 Q-12,20 -20,15 Q-25,10 -15,5"
        fill="#f59e0b"
        opacity="0.6"
      />
      <path
        d="M0,5 Q12,20 20,15 Q25,10 15,5"
        fill="#f59e0b"
        opacity="0.6"
      />
    </g>
    
    {/* Butterfly 2 - green */}
    <g transform="translate(320, 120) scale(0.8)">
      <path
        d="M0,0 Q-15,-20 -25,-10 Q-30,0 -20,10 Q-10,15 0,5 Q10,15 20,10 Q30,0 25,-10 Q15,-20 0,0"
        fill="#22c55e"
        opacity="0.7"
      />
    </g>
    
    {/* Butterfly 3 - smaller orange */}
    <g transform="translate(300, 280) scale(0.6)">
      <path
        d="M0,0 Q-15,-20 -25,-10 Q-30,0 -20,10 Q-10,15 0,5 Q10,15 20,10 Q30,0 25,-10 Q15,-20 0,0"
        fill="#fbbf24"
        opacity="0.6"
      />
    </g>
    
    {/* Leaves */}
    <g transform="translate(100, 300)">
      <ellipse cx="0" cy="0" rx="15" ry="25" fill="#22c55e" opacity="0.7" transform="rotate(-30)" />
      <ellipse cx="20" cy="-10" rx="12" ry="20" fill="#16a34a" opacity="0.6" transform="rotate(-10)" />
    </g>
    
    <g transform="translate(320, 320) scale(0.8)">
      <ellipse cx="0" cy="0" rx="15" ry="25" fill="#22c55e" opacity="0.6" transform="rotate(30)" />
    </g>
    
    {/* Decorative circles */}
    <circle cx="120" cy="200" r="8" fill="#fbbf24" opacity="0.5" />
    <circle cx="290" cy="180" r="6" fill="#f472b6" opacity="0.4" />
    <circle cx="150" cy="320" r="10" fill="#10b981" opacity="0.3" />
    
    {/* Pills/medication floating */}
    <g transform="translate(280, 220)">
      <rect x="-12" y="-6" width="24" height="12" rx="6" fill="#3b82f6" opacity="0.4" transform="rotate(45)" />
      <line x1="0" y1="-6" x2="0" y2="6" stroke="white" strokeWidth="2" opacity="0.5" transform="rotate(45)" />
    </g>
    
    <g transform="translate(100, 160) scale(0.8)">
      <rect x="-10" y="-5" width="20" height="10" rx="5" fill="#8b5cf6" opacity="0.4" transform="rotate(-30)" />
    </g>
  </svg>
);

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [staffId, setStaffId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!window.electron?.staff?.verify) {
        throw new Error('Application API is not available. Please restart.');
      }
      
      // Verify PIN - staff lookup is handled internally by the verify function
      const result = await window.electron.staff.verify(pin) as {
        success: boolean;
        staff?: { id: number; first_name: string; last_name: string; role: string };
      };

      if (result.success && result.staff) {
        onLogin({
          id: result.staff.id,
          name: `${result.staff.first_name} ${result.staff.last_name}`,
          role: result.staff.role,
        });
      } else {
        setError('Invalid PIN. Please try again.');
        setPin('');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinComplete = (completedPin: string) => {
    setPin(completedPin);
    // Auto-submit after a short delay when PIN is complete
    setTimeout(() => {
      if (completedPin.length === 6) {
        const form = document.getElementById('login-form') as HTMLFormElement;
        if (form) form.requestSubmit();
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Panel - Illustration */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 items-center justify-center relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-emerald-100 rounded-full opacity-40 blur-2xl" />
        <div className="absolute bottom-32 right-20 w-48 h-48 bg-green-100 rounded-full opacity-50 blur-3xl" />
        
        <div className="relative z-10 px-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Hyacinth
            </h1>
            <p className="text-lg text-gray-600">
              Medication Dispensing System
            </p>
          </div>
          
          <div className="w-80 h-80">
            <HealthcareIllustration />
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              Secure, HIPAA-compliant medication management for healthcare professionals
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile header (shown only on small screens) */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mb-4">
              <svg className="w-8 h-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 4v16M4 12h16" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Hyacinth</h1>
            <p className="text-gray-500">Medication Dispensing System</p>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back!
            </h2>
            <p className="text-gray-500">
              Enter your Staff ID and PIN to continue
            </p>
          </div>

          <form id="login-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Staff ID Field */}
            <div>
              <label 
                htmlFor="staffId" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Staff ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="staffId"
                  type="text"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  placeholder="Enter your staff ID"
                  className="
                    block w-full pl-10 pr-3 py-3 
                    border border-gray-200 rounded-xl
                    bg-gray-50 text-gray-900
                    placeholder-gray-400
                    focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400
                    transition-all duration-200
                  "
                />
              </div>
            </div>

            {/* PIN Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  PIN
                </label>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  {showPin ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span>Show</span>
                    </>
                  )}
                </button>
              </div>
              
              <PinInput
                length={6}
                value={pin}
                onChange={setPin}
                onComplete={handlePinComplete}
                mask={!showPin}
                error={error}
                disabled={isLoading}
              />
            </div>

            {/* Remember Me & Forgot PIN */}
            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only"
                />
                <div className={`
                  relative inline-flex h-6 w-11 items-center rounded-full
                  transition-colors duration-200
                  ${rememberMe ? 'bg-emerald-500' : 'bg-gray-200'}
                `}>
                  <span className={`
                    inline-block h-4 w-4 transform rounded-full bg-white
                    transition-transform duration-200
                    ${rememberMe ? 'translate-x-6' : 'translate-x-1'}
                  `} />
                </div>
                <span className="ml-3 text-sm text-gray-600">Remember me</span>
              </label>
              
              <button
                type="button"
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Forgot PIN?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={pin.length !== 6 || isLoading}
              className="
                w-full py-3.5 px-4 
                bg-emerald-500 hover:bg-emerald-600
                text-white font-semibold
                rounded-xl
                shadow-lg shadow-emerald-500/20
                hover:shadow-xl hover:shadow-emerald-500/30
                transform hover:-translate-y-0.5
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                disabled:shadow-none
              "
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center space-y-3">
            <p className="text-xs text-gray-400">
              This system is for authorized personnel only. All actions are logged and audited.
            </p>
            <p className="text-xs text-gray-400">
              Hyacinth v2.1.0 • Secure Medication Dispensing System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
