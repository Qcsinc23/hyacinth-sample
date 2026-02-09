import React, { useState, useEffect, createContext, useContext } from 'react';
import { X, Eye, Type, Volume2, Monitor, Moon, Sun } from 'lucide-react';
import { Button } from './common/Button';

// Accessibility preferences type
export interface AccessibilityPreferences {
  highContrast: boolean;
  largeText: boolean;
  reduceAnimations: boolean;
  screenReaderOptimized: boolean;
  darkMode: boolean;
}

const defaultPreferences: AccessibilityPreferences = {
  highContrast: false,
  largeText: false,
  reduceAnimations: false,
  screenReaderOptimized: false,
  darkMode: false,
};

// Context for accessibility preferences
interface AccessibilityContextType {
  preferences: AccessibilityPreferences;
  updatePreference: (key: keyof AccessibilityPreferences, value: boolean) => void;
  resetPreferences: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(() => {
    // Load from localStorage on init
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hyacinth_accessibility');
      if (saved) {
        try {
          return { ...defaultPreferences, ...JSON.parse(saved) };
        } catch {
          return defaultPreferences;
        }
      }
    }
    return defaultPreferences;
  });

  // Save to localStorage when preferences change
  useEffect(() => {
    localStorage.setItem('hyacinth_accessibility', JSON.stringify(preferences));
    
    // Apply preferences to document
    const root = document.documentElement;
    
    // High contrast
    if (preferences.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Large text
    if (preferences.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }
    
    // Reduce animations
    if (preferences.reduceAnimations) {
      root.classList.add('reduce-animations');
    } else {
      root.classList.remove('reduce-animations');
    }
    
    // Screen reader optimizations
    if (preferences.screenReaderOptimized) {
      root.classList.add('screen-reader-mode');
    } else {
      root.classList.remove('screen-reader-mode');
    }
  }, [preferences]);

  const updatePreference = (key: keyof AccessibilityPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const resetPreferences = () => {
    setPreferences(defaultPreferences);
  };

  return (
    <AccessibilityContext.Provider value={{ preferences, updatePreference, resetPreferences }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

interface AccessibilityPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ToggleOption {
  key: keyof AccessibilityPreferences;
  label: string;
  description: string;
  icon: React.ReactNode;
}

export const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({ isOpen, onClose }) => {
  const { preferences, updatePreference, resetPreferences } = useAccessibility();

  if (!isOpen) return null;

  const options: ToggleOption[] = [
    {
      key: 'highContrast',
      label: 'High Contrast',
      description: 'Increase contrast for better visibility',
      icon: <Eye className="h-5 w-5" />,
    },
    {
      key: 'largeText',
      label: 'Large Text',
      description: 'Increase text size throughout the application',
      icon: <Type className="h-5 w-5" />,
    },
    {
      key: 'reduceAnimations',
      label: 'Reduce Animations',
      description: 'Minimize motion and animations',
      icon: <Monitor className="h-5 w-5" />,
    },
    {
      key: 'screenReaderOptimized',
      label: 'Screen Reader Mode',
      description: 'Optimize for assistive technologies',
      icon: <Volume2 className="h-5 w-5" />,
    },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Eye className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Accessibility</h2>
              <p className="text-sm text-gray-500">Customize your experience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close accessibility panel"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Options */}
        <div className="p-6 space-y-4">
          {options.map((option) => (
            <div 
              key={option.key}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm text-gray-600">
                  {option.icon}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{option.label}</h3>
                  <p className="text-xs text-gray-500">{option.description}</p>
                </div>
              </div>
              <button
                onClick={() => updatePreference(option.key, !preferences[option.key])}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                  ${preferences[option.key] ? 'bg-purple-600' : 'bg-gray-300'}
                `}
                role="switch"
                aria-checked={preferences[option.key]}
                aria-label={option.label}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${preferences[option.key] ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between">
          <Button 
            onClick={resetPreferences} 
            variant="ghost" 
            size="sm"
          >
            Reset All
          </Button>
          <Button onClick={onClose} variant="primary" size="sm">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityPanel;
