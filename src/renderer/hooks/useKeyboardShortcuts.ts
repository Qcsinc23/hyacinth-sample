import { useEffect, useCallback, useState } from 'react';

export type ShortcutAction = 
  | 'newEntry'
  | 'print'
  | 'save'
  | 'focusSearch'
  | 'switchTab'
  | 'lock'
  | 'closeModal'
  | 'cancel'
  | 'help';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: ShortcutAction;
  description: string;
  tabId?: string; // For tab switching
}

export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  { key: 'n', ctrlKey: true, action: 'newEntry', description: 'New dispensing entry' },
  { key: 'p', ctrlKey: true, action: 'print', description: 'Print current record' },
  { key: 's', ctrlKey: true, action: 'save', description: 'Save form' },
  { key: 'f', ctrlKey: true, action: 'focusSearch', description: 'Focus search' },
  { key: '1', ctrlKey: true, action: 'switchTab', tabId: 'entry', description: 'Switch to Entry tab' },
  { key: '2', ctrlKey: true, action: 'switchTab', tabId: 'log', description: 'Switch to Log tab' },
  { key: '3', ctrlKey: true, action: 'switchTab', tabId: 'inventory', description: 'Switch to Inventory tab' },
  { key: '4', ctrlKey: true, action: 'switchTab', tabId: 'guide', description: 'Switch to Guide tab' },
  { key: 'l', ctrlKey: true, action: 'lock', description: 'Lock application' },
  { key: 'Escape', action: 'closeModal', description: 'Close modal / Cancel' },
  { key: '?', action: 'help', description: 'Show keyboard shortcuts' },
];

interface UseKeyboardShortcutsOptions {
  onAction: (action: ShortcutAction, tabId?: string) => void;
  enabled?: boolean;
  ignoreInputs?: boolean;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions) {
  const { onAction, enabled = true, ignoreInputs = true } = options;
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Ignore shortcuts when typing in input fields (unless it's Escape or specific shortcuts)
    const target = event.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || 
                    target.tagName === 'TEXTAREA' || 
                    target.isContentEditable;
    
    if (isInput && ignoreInputs) {
      // Allow Escape and Ctrl+S even in inputs
      if (event.key !== 'Escape' && !(event.ctrlKey && event.key.toLowerCase() === 's')) {
        return;
      }
    }

    // Check for ? key to show help
    if (event.key === '?' && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      setShowHelp(true);
      onAction('help');
      return;
    }

    // Find matching shortcut
    const shortcut = DEFAULT_SHORTCUTS.find(s => {
      const keyMatch = s.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatch = !!s.ctrlKey === (event.ctrlKey || event.metaKey); // Support Cmd on Mac
      const altMatch = !!s.altKey === event.altKey;
      const shiftMatch = !!s.shiftKey === event.shiftKey;
      return keyMatch && ctrlMatch && altMatch && shiftMatch;
    });

    if (shortcut) {
      event.preventDefault();
      
      if (shortcut.action === 'help') {
        setShowHelp(true);
      }
      
      onAction(shortcut.action, shortcut.tabId);
    }
  }, [enabled, ignoreInputs, onAction]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const closeHelp = useCallback(() => {
    setShowHelp(false);
  }, []);

  return {
    showHelp,
    closeHelp,
    shortcuts: DEFAULT_SHORTCUTS,
  };
}

// Helper function to format shortcut for display
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.altKey) parts.push('Alt');
  if (shortcut.shiftKey) parts.push('Shift');
  parts.push(shortcut.key === ' ' ? 'Space' : shortcut.key);
  return parts.join(' + ');
}

export default useKeyboardShortcuts;
