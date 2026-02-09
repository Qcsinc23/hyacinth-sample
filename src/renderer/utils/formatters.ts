/**
 * Formatting Utilities for Hyacinth
 * 
 * Provides formatting for dates, strings, names, and medication data.
 */

import { format, parseISO, differenceInYears, isValid } from 'date-fns';

/**
 * Format a date to display format (MM/dd/yyyy)
 */
export const formatDate = (date: Date | string | number | null | undefined): string => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) return 'Invalid date';
    return format(dateObj, 'MM/dd/yyyy');
  } catch {
    return 'Invalid date';
  }
};

/**
 * Format a date with time (MM/dd/yyyy HH:mm)
 */
export const formatDateTime = (date: Date | string | number | null | undefined): string => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) return 'Invalid date';
    return format(dateObj, 'MM/dd/yyyy HH:mm');
  } catch {
    return 'Invalid date';
  }
};

/**
 * Format a date to ISO 8601 format (yyyy-MM-dd)
 */
export const formatISODate = (date: Date | string | number): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) throw new Error('Invalid date');
    return format(dateObj, 'yyyy-MM-dd');
  } catch {
    throw new Error('Failed to format date to ISO');
  }
};

/**
 * Calculate age from date of birth
 */
export const calculateAge = (dateOfBirth: string | Date): number | null => {
  try {
    const dob = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : dateOfBirth;
    if (!isValid(dob)) return null;
    return differenceInYears(new Date(), dob);
  } catch {
    return null;
  }
};

/**
 * Format age with years
 */
export const formatAge = (dateOfBirth: string | Date | null | undefined): string => {
  if (!dateOfBirth) return 'N/A';
  const age = calculateAge(dateOfBirth);
  return age !== null ? `${age} years` : 'N/A';
};

/**
 * Format patient name (Last, First)
 */
export const formatPatientName = (firstName: string, lastName: string): string => {
  const first = firstName?.trim() || '';
  const last = lastName?.trim() || '';
  
  if (first && last) {
    return `${last}, ${first}`;
  } else if (first) {
    return first;
  } else if (last) {
    return last;
  }
  return 'Unknown';
};

/**
 * Format patient name for display (First Last)
 */
export const formatPatientNameDisplay = (firstName: string, lastName: string): string => {
  const first = firstName?.trim() || '';
  const last = lastName?.trim() || '';
  
  if (first && last) {
    return `${first} ${last}`;
  } else if (first) {
    return first;
  } else if (last) {
    return last;
  }
  return 'Unknown';
};

/**
 * Format phone number to (XXX) XXX-XXXX
 */
export const formatPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return 'N/A';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  return phone;
};

/**
 * Format quantity with unit
 */
export const formatQuantity = (quantity: number, unit: string): string => {
  const qty = typeof quantity === 'number' ? quantity : parseFloat(quantity);
  if (isNaN(qty)) return 'N/A';
  
  const formattedQty = Number.isInteger(qty) ? qty.toString() : qty.toFixed(2);
  return `${formattedQty} ${unit}`;
};

/**
 * Format medication name with form if available
 */
export const formatMedication = (medication: string): string => {
  return medication?.trim() || 'Unknown medication';
};

/**
 * Format inventory status
 */
export const formatInventoryStatus = (quantity: number, threshold: number): string => {
  if (quantity <= 0) {
    return 'Out of Stock';
  } else if (quantity <= threshold) {
    return 'Low Stock';
  }
  return 'In Stock';
};

/**
 * Get CSS class for inventory status
 */
export const getInventoryStatusClass = (quantity: number, threshold: number): string => {
  if (quantity <= 0) {
    return 'text-red-600 bg-red-50 border-red-200';
  } else if (quantity <= threshold) {
    return 'text-amber-600 bg-amber-50 border-amber-200';
  }
  return 'text-green-600 bg-green-50 border-green-200';
};

/**
 * Format expiration date with warning
 */
export const formatExpirationDate = (date: string | Date): { text: string; className: string } => {
  try {
    const expDate = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(expDate)) {
      return { text: 'Invalid date', className: 'text-gray-500' };
    }
    
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    const formattedDate = format(expDate, 'MM/dd/yyyy');
    
    if (daysUntilExpiry < 0) {
      return { 
        text: `${formattedDate} (Expired)`, 
        className: 'text-red-600 font-semibold' 
      };
    } else if (daysUntilExpiry <= 30) {
      return { 
        text: `${formattedDate} (${daysUntilExpiry} days)`, 
        className: 'text-amber-600 font-semibold' 
      };
    }
    
    return { text: formattedDate, className: 'text-gray-900' };
  } catch {
    return { text: 'Invalid date', className: 'text-gray-500' };
  }
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Format duration in minutes to human readable
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  
  return `${hours} hr ${remainingMinutes} min`;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

/**
 * Format currency
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Format audit action for display
 */
export const formatAuditAction = (action: string): string => {
  const actionMap: Record<string, string> = {
    'patient.create': 'Created Patient',
    'patient.update': 'Updated Patient',
    'dispense.create': 'Created Dispensing Record',
    'inventory.update': 'Updated Inventory',
    'inventory.deduct': 'Deducted from Inventory',
    'settings.update': 'Updated Settings',
    'backup.create': 'Created Backup',
    'backup.restore': 'Restored from Backup',
    'login': 'User Login',
    'logout': 'User Logout',
    'lock': 'App Locked',
    'unlock': 'App Unlocked',
  };
  
  return actionMap[action] || action;
};
