import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { Button } from './Button';
import { DEFAULT_SHORTCUTS, formatShortcut } from '../../hooks/useKeyboardShortcuts';
import type { KeyboardShortcut } from '../../hooks/useKeyboardShortcuts';

interface ShortcutHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: KeyboardShortcut[];
}

export const ShortcutHelp: React.FC<ShortcutHelpProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const groups: ShortcutGroup[] = [
    {
      title: 'General',
      shortcuts: DEFAULT_SHORTCUTS.filter(s => 
        ['newEntry', 'print', 'save', 'focusSearch', 'lock', 'help'].includes(s.action)
      ),
    },
    {
      title: 'Navigation',
      shortcuts: DEFAULT_SHORTCUTS.filter(s => s.action === 'switchTab'),
    },
    {
      title: 'Actions',
      shortcuts: DEFAULT_SHORTCUTS.filter(s => 
        ['closeModal', 'cancel'].includes(s.action)
      ),
    },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Keyboard className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
              <p className="text-sm text-blue-100">Press ? anytime to show this help</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors text-white"
            aria-label="Close help"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid gap-6">
            {groups.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {group.title}
                </h3>
                <div className="grid gap-2">
                  {group.shortcuts.map((shortcut, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-gray-700">{shortcut.description}</span>
                      <kbd className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-mono font-medium text-gray-800 shadow-sm min-w-[80px] text-center">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">💡 Pro Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Shortcuts work from anywhere in the application</li>
              <li>Use Escape to quickly close any modal or dialog</li>
              <li>Ctrl+S saves forms even when typing in text fields</li>
              <li>Use number keys (1-4) to quickly switch between tabs</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <Button onClick={onClose} variant="primary">
            Got it!
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShortcutHelp;
