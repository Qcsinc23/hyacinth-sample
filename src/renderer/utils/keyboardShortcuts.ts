/**
 * Keyboard Shortcuts for Hyacinth
 * 
 * Defines keyboard shortcuts and provides utilities for
 * handling keyboard navigation and actions.
 */

/**
 * Keyboard shortcut definitions
 */
export const KEYBOARD_SHORTCUTS = {
  // Navigation
  GO_HOME: { key: 'h', modifiers: ['ctrl', 'alt'], description: 'Go to Home' },
  GO_PATIENTS: { key: 'p', modifiers: ['ctrl', 'alt'], description: 'Go to Patients' },
  GO_DISPENSING: { key: 'd', modifiers: ['ctrl', 'alt'], description: 'Go to Dispensing' },
  GO_INVENTORY: { key: 'i', modifiers: ['ctrl', 'alt'], description: 'Go to Inventory' },
  GO_REPORTS: { key: 'r', modifiers: ['ctrl', 'alt'], description: 'Go to Reports' },
  GO_SETTINGS: { key: 's', modifiers: ['ctrl', 'alt'], description: 'Go to Settings' },
  
  // Actions
  NEW_PATIENT: { key: 'n', modifiers: ['ctrl'], description: 'New Patient' },
  NEW_DISPENSE: { key: 'n', modifiers: ['ctrl', 'shift'], description: 'New Dispense' },
  SAVE: { key: 's', modifiers: ['ctrl'], description: 'Save' },
  PRINT: { key: 'p', modifiers: ['ctrl'], description: 'Print' },
  EXPORT: { key: 'e', modifiers: ['ctrl'], description: 'Export' },
  SEARCH: { key: 'k', modifiers: ['ctrl'], description: 'Search' },
  SEARCH_ALT: { key: 'f', modifiers: ['ctrl'], description: 'Search (Alt)' },
  
  // Form Navigation
  NEXT_FIELD: { key: 'Tab', modifiers: [], description: 'Next Field' },
  PREV_FIELD: { key: 'Tab', modifiers: ['shift'], description: 'Previous Field' },
  SUBMIT_FORM: { key: 'Enter', modifiers: ['ctrl'], description: 'Submit Form' },
  CANCEL: { key: 'Escape', modifiers: [], description: 'Cancel' },
  
  // Security
  LOCK_APP: { key: 'l', modifiers: ['ctrl', 'alt'], description: 'Lock Application' },
  LOGOUT: { key: 'q', modifiers: ['ctrl', 'alt'], description: 'Logout' },
  
  // Help
  SHOW_HELP: { key: '?', modifiers: ['shift'], description: 'Show Keyboard Shortcuts' },
  SHOW_SHORTCUTS: { key: '/', modifiers: ['ctrl'], description: 'Show Keyboard Shortcuts' },
} as const;

/**
 * Type for keyboard shortcut keys
 */
export type ShortcutKey = keyof typeof KEYBOARD_SHORTCUTS;

/**
 * Check if a keyboard event matches a shortcut
 */
export const matchesShortcut = (
  event: KeyboardEvent,
  shortcut: typeof KEYBOARD_SHORTCUTS[ShortcutKey]
): boolean => {
  if (event.key !== shortcut.key && event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false;
  }
  
  const hasCtrl = shortcut.modifiers.includes('ctrl');
  const hasAlt = shortcut.modifiers.includes('alt');
  const hasShift = shortcut.modifiers.includes('shift');
  const hasMeta = shortcut.modifiers.includes('meta');
  
  if (hasCtrl !== (event.ctrlKey || event.metaKey)) {
    // On Mac, meta key is used instead of ctrl for most shortcuts
    if (process.platform === 'darwin' && hasCtrl && event.metaKey) {
      // Allow meta key on Mac
    } else {
      return false;
    }
  }
  
  if (hasAlt !== event.altKey) return false;
  if (hasShift !== event.shiftKey) return false;
  if (hasMeta !== event.metaKey) return false;
  
  return true;
};

/**
 * Format a shortcut for display
 */
export const formatShortcut = (shortcut: typeof KEYBOARD_SHORTCUTS[ShortcutKey]): string => {
  const parts: string[] = [];
  
  // Use Command symbol on Mac, Ctrl on others
  if (shortcut.modifiers.includes('ctrl')) {
    parts.push(process.platform === 'darwin' ? '⌘' : 'Ctrl');
  }
  
  if (shortcut.modifiers.includes('alt')) {
    parts.push(process.platform === 'darwin' ? '⌥' : 'Alt');
  }
  
  if (shortcut.modifiers.includes('shift')) {
    parts.push(process.platform === 'darwin' ? '⇧' : 'Shift');
  }
  
  if (shortcut.modifiers.includes('meta')) {
    parts.push('⌘');
  }
  
  // Format key
  let key = shortcut.key;
  if (key === 'Tab') key = '⇥';
  if (key === 'Enter') key = '↵';
  if (key === 'Escape') key = 'Esc';
  if (key === '?') key = '?';
  if (key === '/') key = '/';
  
  parts.push(key.toUpperCase());
  
  return parts.join(process.platform === 'darwin' ? '' : '+');
};

/**
 * Get all shortcuts formatted for display
 */
export const getShortcutsForDisplay = (): Array<{
  action: string;
  shortcut: string;
  description: string;
}> => {
  return Object.entries(KEYBOARD_SHORTCUTS).map(([key, value]) => ({
    action: key,
    shortcut: formatShortcut(value),
    description: value.description,
  }));
};

/**
 * Group shortcuts by category
 */
export const getShortcutsByCategory = (): Record<string, Array<{
  action: string;
  shortcut: string;
  description: string;
}>> => {
  const navigation = ['GO_HOME', 'GO_PATIENTS', 'GO_DISPENSING', 'GO_INVENTORY', 'GO_REPORTS', 'GO_SETTINGS'];
  const actions = ['NEW_PATIENT', 'NEW_DISPENSE', 'SAVE', 'PRINT', 'EXPORT', 'SEARCH', 'SEARCH_ALT'];
  const form = ['NEXT_FIELD', 'PREV_FIELD', 'SUBMIT_FORM', 'CANCEL'];
  const security = ['LOCK_APP', 'LOGOUT'];
  const help = ['SHOW_HELP', 'SHOW_SHORTCUTS'];
  
  const all = getShortcutsForDisplay();
  
  return {
    Navigation: all.filter(s => navigation.includes(s.action)),
    Actions: all.filter(s => actions.includes(s.action)),
    'Form Navigation': all.filter(s => form.includes(s.action)),
    Security: all.filter(s => security.includes(s.action)),
    Help: all.filter(s => help.includes(s.action)),
  };
};

/**
 * Hook for handling keyboard shortcuts
 * Usage in React component:
 * 
 * useKeyboardShortcuts({
 *   NEW_PATIENT: () => navigate('/patients/new'),
 *   SAVE: () => handleSave(),
 * });
 */
export const createKeyboardHandler = (
  handlers: Partial<Record<ShortcutKey, () => void>>
) => {
  return (event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Allow some shortcuts even in inputs (like Ctrl+S)
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
    }
    
    for (const [action, handler] of Object.entries(handlers)) {
      const shortcut = KEYBOARD_SHORTCUTS[action as ShortcutKey];
      if (shortcut && matchesShortcut(event, shortcut)) {
        event.preventDefault();
        event.stopPropagation();
        handler();
        return;
      }
    }
  };
};

/**
 * Focus management helpers
 */
export const FOCUS_HELPERS = {
  /**
   * Focus the first input in a form
   */
  focusFirstInput: (container: HTMLElement | null) => {
    if (!container) return;
    const firstInput = container.querySelector('input, textarea, select') as HTMLElement;
    firstInput?.focus();
  },
  
  /**
   * Focus the next input in a form
   */
  focusNextInput: (container: HTMLElement | null, currentElement: HTMLElement) => {
    if (!container) return;
    const inputs = Array.from(container.querySelectorAll('input, textarea, select'));
    const currentIndex = inputs.indexOf(currentElement);
    const nextInput = inputs[currentIndex + 1] as HTMLElement;
    nextInput?.focus();
  },
  
  /**
   * Focus the previous input in a form
   */
  focusPrevInput: (container: HTMLElement | null, currentElement: HTMLElement) => {
    if (!container) return;
    const inputs = Array.from(container.querySelectorAll('input, textarea, select'));
    const currentIndex = inputs.indexOf(currentElement);
    const prevInput = inputs[currentIndex - 1] as HTMLElement;
    prevInput?.focus();
  },
  
  /**
   * Trap focus within a modal/dialog
   */
  trapFocus: (container: HTMLElement | null) => {
    if (!container) return () => {};
    
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();
    
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  },
};

/**
 * Accessibility helpers
 */
export const A11Y_HELPERS = {
  /**
   * Announce message to screen readers
   */
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;
    document.body.appendChild(announcer);
    
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  },
  
  /**
   * Set page title with app name
   */
  setPageTitle: (title: string) => {
    document.title = `${title} | Hyacinth`;
  },
};
