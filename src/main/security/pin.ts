/**
 * PIN Security Utilities
 *
 * Provides secure PIN hashing and verification using bcrypt.
 */

import bcrypt from 'bcrypt';
import log from 'electron-log';

// Number of salt rounds for bcrypt (higher = more secure but slower)
const SALT_ROUNDS = 10;

/**
 * Hash a PIN using bcrypt
 */
export const hashPin = async (pin: string): Promise<string> => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(pin, salt);
    return hash;
  } catch (error) {
    log.error('Failed to hash PIN:', error);
    throw new Error('Failed to hash PIN');
  }
};

/**
 * Verify a PIN against a stored hash
 */
export const verifyPin = async (
  pin: string,
  storedHash: string,
): Promise<boolean> => {
  try {
    const isValid = await bcrypt.compare(pin, storedHash);
    return isValid;
  } catch (error) {
    log.error('Failed to verify PIN:', error);
    return false;
  }
};

/**
 * Check if a PIN meets security requirements
 * - Must be 4-6 digits
 * - Cannot be sequential (1234, 4321)
 * - Cannot be all the same digit (1111)
 * - Cannot be common patterns
 */
export const isPinSecure = (
  pin: string,
): {
  isValid: boolean;
  message?: string;
} => {
  // Check length
  if (!pin || pin.length < 4 || pin.length > 6) {
    return {
      isValid: false,
      message: 'PIN must be 4-6 digits',
    };
  }

  // Check if all digits
  if (!/^\d+$/.test(pin)) {
    return {
      isValid: false,
      message: 'PIN must contain only digits',
    };
  }

  // Check for sequential patterns (1234, 2345, etc.)
  const isSequential = (str: string): boolean => {
    for (let i = 1; i < str.length; i++) {
      if (parseInt(str[i]) !== parseInt(str[i - 1]) + 1) {
        return false;
      }
    }
    return true;
  };

  // Check for reverse sequential (4321, etc.)
  const isReverseSequential = (str: string): boolean => {
    for (let i = 1; i < str.length; i++) {
      if (parseInt(str[i]) !== parseInt(str[i - 1]) - 1) {
        return false;
      }
    }
    return true;
  };

  // Check for all same digits (1111, 2222, etc.)
  const isAllSame = (str: string): boolean => {
    return str.split('').every((char) => char === str[0]);
  };

  // Common weak PINs
  const weakPins = [
    '0000',
    '1111',
    '2222',
    '3333',
    '4444',
    '5555',
    '6666',
    '7777',
    '8888',
    '9999',
    '1234',
    '4321',
    '1212',
    '6969',
    '1004',
    '2000',
    '2024',
    '2025',
  ];

  if (isAllSame(pin)) {
    return {
      isValid: false,
      message: 'PIN cannot be all the same digit',
    };
  }

  if (isSequential(pin) || isReverseSequential(pin)) {
    return {
      isValid: false,
      message: 'PIN cannot be sequential numbers',
    };
  }

  if (weakPins.includes(pin)) {
    return {
      isValid: false,
      message: 'PIN is too common. Please choose a more secure PIN.',
    };
  }

  // Check for date patterns (MMDD format)
  if (pin.length === 4) {
    const month = parseInt(pin.slice(0, 2));
    const day = parseInt(pin.slice(2, 4));

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        isValid: false,
        message: 'PIN cannot be a date (MMDD format)',
      };
    }
  }

  return { isValid: true };
};

/**
 * Generate a secure random PIN
 */
export const generateSecurePin = (length: number = 4): string => {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;

  let pin: string;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
    pin = randomNum.toString();
    attempts++;
  } while (!isPinSecure(pin).isValid && attempts < maxAttempts);

  return pin;
};

/**
 * Mask a PIN for display (show only last digit or asterisks)
 */
export const maskPin = (pin: string, revealLast: number = 0): string => {
  if (!pin) return '';

  const maskedLength = pin.length - revealLast;
  const masked = '*'.repeat(Math.max(0, maskedLength));
  const revealed = pin.slice(-revealLast);

  return masked + revealed;
};

/**
 * Rate limiting for PIN attempts
 */
interface RateLimitEntry {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Check if PIN entry is rate limited
 */
export const checkRateLimit = (
  identifier: string,
): {
  allowed: boolean;
  remainingAttempts: number;
  lockedUntil: number | null;
  message?: string;
} => {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry) {
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS - 1,
      lockedUntil: null,
    };
  }

  // Check if still locked
  if (entry.lockedUntil && now < entry.lockedUntil) {
    const minutesRemaining = Math.ceil((entry.lockedUntil - now) / 60000);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: entry.lockedUntil,
      message: `Too many failed attempts. Try again in ${minutesRemaining} minutes.`,
    };
  }

  // Reset if lockout has expired
  if (entry.lockedUntil && now >= entry.lockedUntil) {
    rateLimitMap.delete(identifier);
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS - 1,
      lockedUntil: null,
    };
  }

  // Check attempts
  const remainingAttempts = MAX_ATTEMPTS - entry.attempts;

  if (remainingAttempts <= 0) {
    // Lock out
    const lockedUntil = now + LOCKOUT_DURATION_MS;
    entry.lockedUntil = lockedUntil;
    rateLimitMap.set(identifier, entry);

    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil,
      message: 'Too many failed attempts. Account locked for 30 minutes.',
    };
  }

  return {
    allowed: true,
    remainingAttempts,
    lockedUntil: null,
  };
};

/**
 * Record a failed PIN attempt
 */
export const recordFailedAttempt = (identifier: string): void => {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (entry) {
    entry.attempts++;
    entry.lastAttempt = now;
    rateLimitMap.set(identifier, entry);
  } else {
    rateLimitMap.set(identifier, {
      attempts: 1,
      lastAttempt: now,
      lockedUntil: null,
    });
  }
};

/**
 * Clear rate limit for an identifier (on successful login)
 */
export const clearRateLimit = (identifier: string): void => {
  rateLimitMap.delete(identifier);
};
