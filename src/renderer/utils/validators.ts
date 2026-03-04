/**
 * Form Validation Functions for Hyacinth
 * 
 * Provides validation for patient data, dispensing forms,
 * and inventory entries.
 */

import { MEDICATIONS, REASONS } from './constants';

// Validation result type
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate a patient record
 */
export const validatePatient = (patient: {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
}): ValidationResult => {
  const errors: Record<string, string> = {};

  // First name validation
  if (!patient.firstName?.trim()) {
    errors.firstName = 'First name is required';
  } else if (patient.firstName.trim().length < 2) {
    errors.firstName = 'First name must be at least 2 characters';
  } else if (patient.firstName.trim().length > 50) {
    errors.firstName = 'First name must be less than 50 characters';
  }

  // Last name validation
  if (!patient.lastName?.trim()) {
    errors.lastName = 'Last name is required';
  } else if (patient.lastName.trim().length < 2) {
    errors.lastName = 'Last name must be at least 2 characters';
  } else if (patient.lastName.trim().length > 50) {
    errors.lastName = 'Last name must be less than 50 characters';
  }

  // Date of birth validation
  if (!patient.dateOfBirth) {
    errors.dateOfBirth = 'Date of birth is required';
  } else {
    const dob = new Date(patient.dateOfBirth);
    const now = new Date();
    const minDate = new Date();
    minDate.setFullYear(now.getFullYear() - 120);

    if (isNaN(dob.getTime())) {
      errors.dateOfBirth = 'Invalid date format';
    } else if (dob > now) {
      errors.dateOfBirth = 'Date of birth cannot be in the future';
    } else if (dob < minDate) {
      errors.dateOfBirth = 'Date of birth is too far in the past';
    }
  }

  // Email validation (optional)
  if (patient.email?.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(patient.email.trim())) {
      errors.email = 'Invalid email address';
    }
  }

  // Phone validation (optional)
  if (patient.phone?.trim()) {
    const phoneRegex = /^[\d\s\-\(\)\+]{10,20}$/;
    if (!phoneRegex.test(patient.phone.trim())) {
      errors.phone = 'Invalid phone number format';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate dispensing form data
 */
export const validateDispensing = (dispensing: {
  patientId?: string;
  medication?: string;
  quantity?: number;
  unit?: string;
  reason?: string;
  prescribedBy?: string;
  prescribedDate?: string;
}): ValidationResult => {
  const errors: Record<string, string> = {};

  // Patient ID validation
  if (!dispensing.patientId?.trim()) {
    errors.patientId = 'Patient is required';
  }

  // Medication validation
  if (!dispensing.medication?.trim()) {
    errors.medication = 'Medication is required';
  } else if (!MEDICATIONS.includes(dispensing.medication)) {
    errors.medication = 'Invalid medication selected';
  }

  // Quantity validation
  if (dispensing.quantity === undefined || dispensing.quantity === null) {
    errors.quantity = 'Quantity is required';
  } else if (typeof dispensing.quantity !== 'number') {
    errors.quantity = 'Quantity must be a number';
  } else if (dispensing.quantity <= 0) {
    errors.quantity = 'Quantity must be greater than 0';
  } else if (dispensing.quantity > 1000) {
    errors.quantity = 'Quantity seems unusually high';
  } else if (!Number.isInteger(dispensing.quantity)) {
    errors.quantity = 'Quantity must be a whole number';
  }

  // Unit validation
  if (!dispensing.unit?.trim()) {
    errors.unit = 'Unit is required';
  }

  // Reason validation
  if (!dispensing.reason?.trim()) {
    errors.reason = 'Reason is required';
  } else if (!REASONS.includes(dispensing.reason)) {
    errors.reason = 'Invalid reason selected';
  }

  // Prescribed by validation
  if (!dispensing.prescribedBy?.trim()) {
    errors.prescribedBy = 'Prescribing clinician is required';
  } else if (dispensing.prescribedBy.trim().length < 2) {
    errors.prescribedBy = 'Prescribing clinician name is too short';
  }

  // Prescribed date validation
  if (!dispensing.prescribedDate) {
    errors.prescribedDate = 'Prescribed date is required';
  } else {
    const prescribedDate = new Date(dispensing.prescribedDate);
    const now = new Date();
    const maxPastDate = new Date();
    maxPastDate.setDate(now.getDate() - 30);

    if (isNaN(prescribedDate.getTime())) {
      errors.prescribedDate = 'Invalid date format';
    } else if (prescribedDate > now) {
      errors.prescribedDate = 'Prescribed date cannot be in the future';
    } else if (prescribedDate < maxPastDate) {
      errors.prescribedDate = 'Prescribed date cannot be more than 30 days ago';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate inventory entry
 */
export const validateInventory = (inventory: {
  medication?: string;
  quantity?: number;
  unit?: string;
  lotNumber?: string;
  expirationDate?: string;
}): ValidationResult => {
  const errors: Record<string, string> = {};

  // Medication validation
  if (!inventory.medication?.trim()) {
    errors.medication = 'Medication is required';
  }

  // Quantity validation
  if (inventory.quantity === undefined || inventory.quantity === null) {
    errors.quantity = 'Quantity is required';
  } else if (typeof inventory.quantity !== 'number') {
    errors.quantity = 'Quantity must be a number';
  } else if (inventory.quantity < 0) {
    errors.quantity = 'Quantity cannot be negative';
  }

  // Unit validation
  if (!inventory.unit?.trim()) {
    errors.unit = 'Unit is required';
  }

  // Lot number validation (optional)
  if (inventory.lotNumber?.trim()) {
    if (inventory.lotNumber.trim().length < 3) {
      errors.lotNumber = 'Lot number is too short';
    } else if (inventory.lotNumber.trim().length > 50) {
      errors.lotNumber = 'Lot number is too long';
    }
  }

  // Expiration date validation
  if (!inventory.expirationDate) {
    errors.expirationDate = 'Expiration date is required';
  } else {
    const expDate = new Date(inventory.expirationDate);
    const now = new Date();
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(now.getFullYear() + 10);

    if (isNaN(expDate.getTime())) {
      errors.expirationDate = 'Invalid date format';
    } else if (expDate < now) {
      errors.expirationDate = 'Item has already expired';
    } else if (expDate > maxFutureDate) {
      errors.expirationDate = 'Expiration date seems too far in the future';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate PIN (4-6 digits)
 */
export const validatePin = (pin: string): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!pin) {
    errors.pin = 'PIN is required';
  } else if (!/^\d{4,6}$/.test(pin)) {
    errors.pin = 'PIN must be 4-6 digits';
  } else if (pin === '0000' || pin === '1234' || pin === '1111') {
    errors.pin = 'Please choose a more secure PIN';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  } else if (password.length > 128) {
    errors.password = 'Password is too long';
  } else {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      errors.password = 'Password must contain uppercase, lowercase, number, and special character';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Check if a string is a valid date in ISO 8601 format
 */
export const isValidISODate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString === date.toISOString().split('T')[0];
};

/**
 * Sanitize a string for safe display
 */
export const sanitizeString = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim();
};
