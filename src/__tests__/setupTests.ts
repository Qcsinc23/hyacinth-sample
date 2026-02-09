/**
 * Jest setup file for Hyacinth tests
 * Imports jest-dom matchers and configures test environment
 */
import '@testing-library/jest-dom';

// Mock window.electron for tests
Object.defineProperty(window, 'electron', {
  writable: true,
  value: {
    ipcRenderer: {
      invoke: jest.fn(),
      on: jest.fn(() => () => {}),
      removeAllListeners: jest.fn(),
    },
  },
});

// Suppress console errors during tests for expected errors
global.console = {
  ...console,
  // Uncomment to ignore specific console methods during tests
  // error: jest.fn(),
  // warn: jest.fn(),
};
