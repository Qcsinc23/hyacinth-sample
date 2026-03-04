/**
 * Unit Tests for Formatters
 * Tests all formatting functions from formatters.ts
 */

import {
  formatDate,
  formatDateTime,
  formatISODate,
  calculateAge,
  formatAge,
  formatPatientName,
  formatPatientNameDisplay,
  formatPhoneNumber,
  formatQuantity,
  formatMedication,
  formatInventoryStatus,
  getInventoryStatusClass,
  formatExpirationDate,
  formatFileSize,
  formatDuration,
  truncateText,
  formatCurrency,
  formatAuditAction,
} from '../renderer/utils/formatters';

describe('formatters', () => {
  // ============================================================================
  // Date Formatting Tests
  // ============================================================================
  describe('formatDate', () => {
    it('should format a Date object to MM/dd/yyyy', () => {
      const date = new Date(2024, 0, 15); // Jan 15, 2024
      expect(formatDate(date)).toBe('01/15/2024');
    });

    it('should format an ISO date string', () => {
      expect(formatDate('2024-01-15')).toBe('01/15/2024');
    });

    it('should format a timestamp number', () => {
      const timestamp = new Date(2024, 0, 15).getTime();
      expect(formatDate(timestamp)).toBe('01/15/2024');
    });

    it('should return N/A for null', () => {
      expect(formatDate(null)).toBe('N/A');
    });

    it('should return N/A for undefined', () => {
      expect(formatDate(undefined)).toBe('N/A');
    });

    it('should return Invalid date for invalid date string', () => {
      expect(formatDate('invalid-date')).toBe('Invalid date');
    });

    it('should handle leap year dates', () => {
      expect(formatDate('2024-02-29')).toBe('02/29/2024');
    });

    it('should handle single digit months and days', () => {
      expect(formatDate('2024-01-05')).toBe('01/05/2024');
    });
  });

  describe('formatDateTime', () => {
    it('should format a Date object with time', () => {
      const date = new Date(2024, 0, 15, 14, 30, 0);
      expect(formatDateTime(date)).toBe('01/15/2024 14:30');
    });

    it('should format an ISO datetime string', () => {
      const result = formatDateTime('2024-01-15T14:30:00Z');
      // Check format matches expected pattern (timezone dependent)
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
    });

    it('should return N/A for null', () => {
      expect(formatDateTime(null)).toBe('N/A');
    });

    it('should handle midnight time', () => {
      const date = new Date(2024, 0, 15, 0, 0, 0);
      expect(formatDateTime(date)).toBe('01/15/2024 00:00');
    });
  });

  describe('formatISODate', () => {
    it('should format Date object to ISO format', () => {
      const date = new Date(2024, 0, 15);
      expect(formatISODate(date)).toBe('2024-01-15');
    });

    it('should format timestamp to ISO format', () => {
      const timestamp = new Date(2024, 0, 15).getTime();
      expect(formatISODate(timestamp)).toBe('2024-01-15');
    });

    it('should handle valid ISO string', () => {
      expect(formatISODate('2024-01-15')).toBe('2024-01-15');
    });

    it('should throw error for invalid date', () => {
      expect(() => formatISODate('invalid')).toThrow('Failed to format date to ISO');
    });
  });

  // ============================================================================
  // Age Calculation Tests
  // ============================================================================
  describe('calculateAge', () => {
    it('should calculate age from date of birth', () => {
      // Use a fixed date far in the past to avoid birthday edge cases
      const dob = '1990-06-15';
      const age = calculateAge(dob);
      expect(age).toBeDefined();
      expect(age).toBeGreaterThan(30);
    });

    it('should calculate age from Date object', () => {
      const dob = new Date(1995, 5, 15);
      const age = calculateAge(dob);
      expect(age).toBeDefined();
      expect(age).toBeGreaterThan(25);
    });

    it('should return null for invalid date', () => {
      expect(calculateAge('invalid-date')).toBeNull();
    });

    it('should handle birthdate later in the current year', () => {
      const currentYear = new Date().getFullYear();
      const dob = `${currentYear}-12-31`;
      expect(calculateAge(dob)).toBe(0);
    });
  });

  describe('formatAge', () => {
    it('should format age with years', () => {
      const dob = '1990-06-15';
      const ageDisplay = formatAge(dob);
      expect(ageDisplay).toMatch(/\d+ years/);
    });

    it('should return N/A for null', () => {
      expect(formatAge(null)).toBe('N/A');
    });

    it('should return N/A for undefined', () => {
      expect(formatAge(undefined)).toBe('N/A');
    });

    it('should return N/A for invalid date', () => {
      expect(formatAge('invalid')).toBe('N/A');
    });
  });

  // ============================================================================
  // Patient Name Formatting Tests
  // ============================================================================
  describe('formatPatientName', () => {
    it('should format name as Last, First', () => {
      expect(formatPatientName('John', 'Doe')).toBe('Doe, John');
    });

    it('should handle names with extra whitespace', () => {
      expect(formatPatientName('  John  ', '  Doe  ')).toBe('Doe, John');
    });

    it('should handle only first name', () => {
      expect(formatPatientName('John', '')).toBe('John');
    });

    it('should handle only last name', () => {
      expect(formatPatientName('', 'Doe')).toBe('Doe');
    });

    it('should return Unknown for empty names', () => {
      expect(formatPatientName('', '')).toBe('Unknown');
    });

    it('should handle hyphenated names', () => {
      expect(formatPatientName('Mary-Jane', 'Smith-Jones')).toBe('Smith-Jones, Mary-Jane');
    });
  });

  describe('formatPatientNameDisplay', () => {
    it('should format name as First Last', () => {
      expect(formatPatientNameDisplay('John', 'Doe')).toBe('John Doe');
    });

    it('should handle only first name', () => {
      expect(formatPatientNameDisplay('John', '')).toBe('John');
    });

    it('should handle only last name', () => {
      expect(formatPatientNameDisplay('', 'Doe')).toBe('Doe');
    });

    it('should return Unknown for empty names', () => {
      expect(formatPatientNameDisplay('', '')).toBe('Unknown');
    });
  });

  // ============================================================================
  // Phone Number Formatting Tests
  // ============================================================================
  describe('formatPhoneNumber', () => {
    it('should format 10-digit number as (XXX) XXX-XXXX', () => {
      expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
    });

    it('should format number with dashes', () => {
      expect(formatPhoneNumber('555-123-4567')).toBe('(555) 123-4567');
    });

    it('should format number with parentheses', () => {
      expect(formatPhoneNumber('(555) 123-4567')).toBe('(555) 123-4567');
    });

    it('should format number with spaces', () => {
      expect(formatPhoneNumber('555 123 4567')).toBe('(555) 123-4567');
    });

    it('should format 11-digit number starting with 1', () => {
      expect(formatPhoneNumber('15551234567')).toBe('+1 (555) 123-4567');
    });

    it('should return original for non-standard formats', () => {
      expect(formatPhoneNumber('12345')).toBe('12345');
    });

    it('should return N/A for null', () => {
      expect(formatPhoneNumber(null)).toBe('N/A');
    });

    it('should return N/A for undefined', () => {
      expect(formatPhoneNumber(undefined)).toBe('N/A');
    });
  });

  // ============================================================================
  // Quantity Formatting Tests
  // ============================================================================
  describe('formatQuantity', () => {
    it('should format quantity with unit', () => {
      expect(formatQuantity(30, 'tablets')).toBe('30 tablets');
    });

    it('should format decimal quantity with 2 decimal places', () => {
      expect(formatQuantity(15.5, 'mL')).toBe('15.50 mL');
    });

    it('should handle integer as string', () => {
      expect(formatQuantity(30 as any, 'capsules')).toBe('30 capsules');
    });

    it('should return N/A for NaN', () => {
      expect(formatQuantity(NaN, 'tablets')).toBe('N/A');
    });
  });

  // ============================================================================
  // Medication Formatting Tests
  // ============================================================================
  describe('formatMedication', () => {
    it('should return medication name', () => {
      expect(formatMedication('Biktarvy (nPEP)')).toBe('Biktarvy (nPEP)');
    });

    it('should trim whitespace', () => {
      expect(formatMedication('  Biktarvy  ')).toBe('Biktarvy');
    });

    it('should return Unknown medication for empty string', () => {
      expect(formatMedication('')).toBe('Unknown medication');
    });
  });

  // ============================================================================
  // Inventory Status Tests
  // ============================================================================
  describe('formatInventoryStatus', () => {
    it('should return Out of Stock when quantity is 0', () => {
      expect(formatInventoryStatus(0, 30)).toBe('Out of Stock');
    });

    it('should return Out of Stock when quantity is negative', () => {
      expect(formatInventoryStatus(-5, 30)).toBe('Out of Stock');
    });

    it('should return Low Stock when at threshold', () => {
      expect(formatInventoryStatus(30, 30)).toBe('Low Stock');
    });

    it('should return Low Stock when below threshold', () => {
      expect(formatInventoryStatus(25, 30)).toBe('Low Stock');
    });

    it('should return In Stock when above threshold', () => {
      expect(formatInventoryStatus(35, 30)).toBe('In Stock');
    });
  });

  describe('getInventoryStatusClass', () => {
    it('should return red classes for out of stock', () => {
      expect(getInventoryStatusClass(0, 30)).toContain('text-red-600');
      expect(getInventoryStatusClass(0, 30)).toContain('bg-red-50');
    });

    it('should return amber classes for low stock', () => {
      expect(getInventoryStatusClass(25, 30)).toContain('text-amber-600');
      expect(getInventoryStatusClass(25, 30)).toContain('bg-amber-50');
    });

    it('should return green classes for in stock', () => {
      expect(getInventoryStatusClass(35, 30)).toContain('text-green-600');
      expect(getInventoryStatusClass(35, 30)).toContain('bg-green-50');
    });
  });

  describe('formatExpirationDate', () => {
    it('should format future expiration date', () => {
      const future = new Date();
      future.setDate(future.getDate() + 60);
      const dateStr = future.toISOString().split('T')[0];
      const result = formatExpirationDate(dateStr);
      
      expect(result.text).toContain('/');
      expect(result.className).toBe('text-gray-900');
    });

    it('should mark expired items', () => {
      const result = formatExpirationDate('2020-01-01');
      expect(result.text).toContain('Expired');
      expect(result.className).toContain('text-red-600');
    });

    it('should show days remaining for items expiring soon', () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 15);
      const dateStr = soon.toISOString().split('T')[0];
      const result = formatExpirationDate(dateStr);
      
      expect(result.text).toContain('days');
      expect(result.className).toContain('text-amber-600');
    });

    it('should handle invalid date', () => {
      const result = formatExpirationDate('invalid');
      expect(result.text).toBe('Invalid date');
      expect(result.className).toBe('text-gray-500');
    });
  });

  // ============================================================================
  // File Size Formatting Tests
  // ============================================================================
  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 Bytes');
    });

    it('should format KB', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
    });

    it('should format MB', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    });

    it('should format GB', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should format with decimal places', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should handle 0 bytes', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });
  });

  // ============================================================================
  // Duration Formatting Tests
  // ============================================================================
  describe('formatDuration', () => {
    it('should format minutes only', () => {
      expect(formatDuration(30)).toBe('30 min');
    });

    it('should format hours only', () => {
      expect(formatDuration(120)).toBe('2 hr');
    });

    it('should format hours and minutes', () => {
      expect(formatDuration(150)).toBe('2 hr 30 min');
    });

    it('should format 1 hour', () => {
      expect(formatDuration(60)).toBe('1 hr');
    });
  });

  // ============================================================================
  // Text Truncation Tests
  // ============================================================================
  describe('truncateText', () => {
    it('should not truncate short text', () => {
      expect(truncateText('Hello', 10)).toBe('Hello');
    });

    it('should truncate long text', () => {
      expect(truncateText('Hello World', 8)).toBe('Hello Wo...');
    });

    it('should handle exact length text', () => {
      expect(truncateText('Hello', 5)).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(truncateText('', 5)).toBe('');
    });
  });

  // ============================================================================
  // Currency Formatting Tests
  // ============================================================================
  describe('formatCurrency', () => {
    it('should format USD currency', () => {
      expect(formatCurrency(100)).toBe('$100.00');
    });

    it('should format decimal amounts', () => {
      expect(formatCurrency(99.99)).toBe('$99.99');
    });

    it('should format large amounts', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    });

    it('should format zero', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should format negative amounts', () => {
      expect(formatCurrency(-50)).toBe('-$50.00');
    });
  });

  // ============================================================================
  // Audit Action Formatting Tests
  // ============================================================================
  describe('formatAuditAction', () => {
    it('should format known actions', () => {
      expect(formatAuditAction('patient.create')).toBe('Created Patient');
      expect(formatAuditAction('patient.update')).toBe('Updated Patient');
      expect(formatAuditAction('dispense.create')).toBe('Created Dispensing Record');
      expect(formatAuditAction('inventory.update')).toBe('Updated Inventory');
      expect(formatAuditAction('login')).toBe('User Login');
      expect(formatAuditAction('logout')).toBe('User Logout');
    });

    it('should return original for unknown actions', () => {
      expect(formatAuditAction('unknown.action')).toBe('unknown.action');
    });
  });
});
