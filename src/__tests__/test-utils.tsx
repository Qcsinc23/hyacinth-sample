/**
 * Test Utilities for Hyacinth
 * Custom render with providers and testing helpers
 */

import React from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { AuthProvider } from '../renderer/contexts/AuthContext';
import { AlertProvider } from '../renderer/contexts/AlertContext';

// ============================================================================
// Custom Render with Providers
// ============================================================================

interface AllTheProvidersProps {
  children: React.ReactNode;
}

/**
 * Wraps component with all necessary providers for testing
 */
function AllTheProviders({ children }: AllTheProvidersProps) {
  return (
    <AuthProvider>
      <AlertProvider>
        {children}
      </AlertProvider>
    </AuthProvider>
  );
}

/**
 * Custom render function that wraps components with providers
 */
export function render(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult {
  return rtlRender(ui, { wrapper: AllTheProviders, ...options });
}

// ============================================================================
// Testing Helpers
// ============================================================================

/**
 * Creates a mock event object for form testing
 */
export function createMockEvent(overrides: Partial<React.ChangeEvent<HTMLInputElement>> = {}) {
  return {
    target: { value: '', name: '', ...overrides.target },
    currentTarget: { value: '', name: '', ...overrides.currentTarget },
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    persist: jest.fn(),
    ...overrides,
  } as React.ChangeEvent<HTMLInputElement>;
}

/**
 * Creates a mock form submission event
 */
export function createMockFormEvent(overrides: Partial<React.FormEvent<HTMLFormElement>> = {}) {
  return {
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    persist: jest.fn(),
    ...overrides,
  } as unknown as React.FormEvent<HTMLFormElement>;
}

/**
 * Waits for a specified duration (useful for async testing)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generates a unique test ID
 */
export function generateTestId(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Mock Electron API
// ============================================================================

/**
 * Mocks the Electron IPC API for testing
 */
export function mockElectronAPI() {
  const mockIpcHandlers: Record<string, (...args: any[]) => Promise<any>> = {};

  const mockIpcRenderer = {
    invoke: jest.fn(async (channel: string, ...args: any[]) => {
      const handler = mockIpcHandlers[channel];
      if (handler) {
        return handler(...args);
      }
      throw new Error(`No handler registered for channel: ${channel}`);
    }),
    on: jest.fn((_channel: string, _callback: (...args: any[]) => void) => {
      // Store callback for later use
      return () => {}; // Return unsubscribe function
    }),
    removeAllListeners: jest.fn(),
  };

  const mockWindowElectron = {
    ipcRenderer: mockIpcRenderer,
  };

  // Set up global window.electron mock
  Object.defineProperty(window, 'electron', {
    writable: true,
    value: mockWindowElectron,
  });

  return {
    mockIpcRenderer,
    registerHandler: (channel: string, handler: (...args: any[]) => Promise<any>) => {
      mockIpcHandlers[channel] = handler;
    },
    clearHandlers: () => {
      Object.keys(mockIpcHandlers).forEach(key => delete mockIpcHandlers[key]);
    },
  };
}

// ============================================================================
// Accessibility Helpers
// ============================================================================

/**
 * Checks if an element has the correct ARIA attributes
 */
export function expectAccessible(element: HTMLElement, options: {
  role?: string;
  label?: string;
  labelledBy?: string;
  describedBy?: string;
  invalid?: boolean;
  required?: boolean;
} = {}) {
  if (options.role) {
    expect(element).toHaveAttribute('role', options.role);
  }
  if (options.label) {
    expect(element).toHaveAttribute('aria-label', options.label);
  }
  if (options.labelledBy) {
    expect(element).toHaveAttribute('aria-labelledby', options.labelledBy);
  }
  if (options.describedBy) {
    expect(element).toHaveAttribute('aria-describedby', options.describedBy);
  }
  if (options.invalid !== undefined) {
    expect(element).toHaveAttribute('aria-invalid', options.invalid ? 'true' : 'false');
  }
  if (options.required !== undefined) {
    expect(element).toHaveAttribute('aria-required', options.required ? 'true' : 'false');
  }
}

// ============================================================================
// Re-exports from Testing Library
// ============================================================================

export * from '@testing-library/react';
export { screen, waitFor, within, fireEvent } from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';
