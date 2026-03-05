import React, { useState, useRef, useEffect } from 'react';

interface PinInputProps {
  length?: number;
  value?: string;
  onComplete?: (pin: string) => void;
  onChange?: (pin: string) => void;
  mask?: boolean;
  error?: string;
  disabled?: boolean;
}

export const PinInput: React.FC<PinInputProps> = ({
  length = 6,
  value,
  onComplete,
  onChange,
  mask = true,
  error,
  disabled = false,
}) => {
  const [pin, setPin] = useState<string[]>(new Array(length).fill(''));
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (typeof value !== 'string') return;

    const normalized = value
      .replace(/\D/g, '')
      .slice(0, length)
      .split('')
      .slice(0, length);

    const next = Array.from({ length }, (_, idx) => normalized[idx] || '');
    setPin(next);
  }, [length, value]);

  const handleChange = (index: number, value: string) => {
    if (disabled) return;
    
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value.slice(-1); // Only take last character
    setPin(newPin);
    
    const pinString = newPin.join('');
    onChange?.(pinString);

    // Move to next input if value entered
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }

    // Check if complete
    if (newPin.every(digit => digit !== '') && pinString.length === length) {
      onComplete?.(pinString);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      if (pin[index]) {
        // Clear current if has value
        const newPin = [...pin];
        newPin[index] = '';
        setPin(newPin);
        onChange?.(newPin.join(''));
      } else if (index > 0) {
        // Move to previous if empty
        inputRefs.current[index - 1]?.focus();
        setFocusedIndex(index - 1);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    if (disabled) return;
    
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    
    const newPin = [...pin];
    for (let i = 0; i < pastedData.length; i++) {
      if (i < length) {
        newPin[i] = pastedData[i];
      }
    }
    setPin(newPin);
    
    const pinString = newPin.join('');
    onChange?.(pinString);

    // Focus the appropriate input
    const focusIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
    setFocusedIndex(focusIndex);

    if (newPin.every(digit => digit !== '')) {
      onComplete?.(pinString);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-3">
        {pin.map((digit, index) => (
          <input
            key={index}
            ref={el => { inputRefs.current[index] = el; }}
            type={mask ? 'password' : 'text'}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            disabled={disabled}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={() => setFocusedIndex(index)}
            className={`
              w-12 h-14 text-center text-2xl font-semibold rounded-xl border-2 
              transition-all duration-200 focus:outline-none
              ${error 
                ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                : digit
                  ? 'border-emerald-500 bg-emerald-50 text-gray-900'
                  : 'border-gray-200 bg-gray-50 text-gray-400'
              }
              ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
              ${focusedIndex === index && !digit ? 'ring-4 ring-emerald-100 border-emerald-400' : ''}
            `}
            aria-label={`PIN digit ${index + 1} of ${length}`}
          />
        ))}
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-600 font-medium">
          {error}
        </p>
      )}
    </div>
  );
};

export default PinInput;
