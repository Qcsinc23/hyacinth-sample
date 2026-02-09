/**
 * Enhanced Authentication Context
 * 
 * Provides authentication state, session management, and HIPAA-compliant
 * session timeout with warning notifications.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { Staff } from '../types';

// Session timeout configuration (HIPAA compliant)
const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_WARNING_MS = 60 * 1000; // 1 minute warning
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Simple hash function for PINs (in production, use bcrypt via main process)
const hashPin = (pin: string): string => {
  // This is a simple hash for demo purposes
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
};

// Mock staff data with hashed PINs
const MOCK_STAFF: Staff[] = [
  { id: '1', name: 'Sarah Johnson', role: 'nurse', pin: hashPin('1234'), isActive: true },
  { id: '2', name: 'Michael Chen', role: 'pharmacist', pin: hashPin('5678'), isActive: true },
  { id: '3', name: 'Emily Davis', role: 'admin', pin: hashPin('9012'), isActive: true },
  { id: '4', name: 'Robert Wilson', role: 'technician', pin: hashPin('3456'), isActive: true },
];

interface LoginResult {
  success: boolean;
  message?: string;
}

interface AuthContextType {
  staff: Staff | null;
  isAuthenticated: boolean;
  login: (pin: string) => Promise<LoginResult>;
  logout: () => void;
  failedAttempts: number;
  isLocked: boolean;
  lockoutTimeRemaining: number | null;
  sessionWarning: boolean;
  sessionTimeRemainingMs: number;
  isWarningVisible: boolean;
  extendSession: () => void;
  lockSession: () => void;
  resetLockout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<Date | null>(null);
  const [lockoutTimeRemaining, setLockoutTimeRemaining] = useState<number | null>(null);
  const [sessionWarning, setSessionWarning] = useState(false);
  const [sessionTimeRemainingMs, setSessionTimeRemainingMs] = useState(SESSION_TIMEOUT_MS);
  const [isWarningVisible, setIsWarningVisible] = useState(false);
  
  const lastActivityRef = useRef<number>(Date.now());
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lockoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setSessionTimeRemainingMs(SESSION_TIMEOUT_MS);
    setSessionWarning(false);
    setIsWarningVisible(false);
  }, []);

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
  }, []);

  // Extend session
  const extendSession = useCallback(() => {
    updateActivity();
    setIsWarningVisible(false);
    
    // Log session extension
    console.log('[Session] Session extended by user');
  }, [updateActivity]);

  // Lock session immediately
  const lockSession = useCallback(() => {
    clearAllTimers();
    setStaff(null);
    setIsWarningVisible(false);
    console.log('[Session] Session manually locked');
  }, [clearAllTimers]);

  // Setup session timeout countdown
  const setupSessionTimeout = useCallback(() => {
    clearAllTimers();
    
    // Set up countdown timer
    countdownTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, SESSION_TIMEOUT_MS - elapsed);
      setSessionTimeRemainingMs(remaining);
      
      // Show warning when approaching timeout
      if (remaining <= SESSION_WARNING_MS && remaining > 0 && !isWarningVisible) {
        setIsWarningVisible(true);
        setSessionWarning(true);
      }
      
      // Timeout reached
      if (remaining === 0) {
        clearAllTimers();
        setStaff(null);
        setIsWarningVisible(false);
        console.log('[Session] Session timed out due to inactivity');
      }
    }, 1000);
  }, [clearAllTimers, isWarningVisible]);

  // Monitor lockout countdown
  useEffect(() => {
    if (lockoutEndTime && isLocked) {
      lockoutTimerRef.current = setInterval(() => {
        const now = new Date();
        const remaining = Math.max(0, Math.ceil((lockoutEndTime.getTime() - now.getTime()) / 1000));
        setLockoutTimeRemaining(remaining);
        
        if (remaining <= 0) {
          setIsLocked(false);
          setLockoutEndTime(null);
          setFailedAttempts(0);
          if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
        }
      }, 1000);

      return () => {
        if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
      };
    }
  }, [lockoutEndTime, isLocked]);

  // Track user activity when authenticated
  useEffect(() => {
    if (staff) {
      const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
      const handleActivity = () => {
        if (!isWarningVisible) {
          updateActivity();
        }
      };

      events.forEach(event => {
        document.addEventListener(event, handleActivity, { passive: true });
      });

      setupSessionTimeout();

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleActivity);
        });
        clearAllTimers();
      };
    }
  }, [staff, updateActivity, setupSessionTimeout, clearAllTimers, isWarningVisible]);

  const login = useCallback(async (pin: string): Promise<LoginResult> => {
    // Check if account is locked
    if (isLocked) {
      return {
        success: false,
        message: `Account locked. Please try again in ${Math.ceil((lockoutTimeRemaining || 0) / 60)} minutes.`,
      };
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Hash the entered PIN for comparison
    const hashedPin = hashPin(pin);
    const found = MOCK_STAFF.find(s => s.pin === hashedPin && s.isActive);
    
    if (found) {
      setStaff(found);
      setFailedAttempts(0);
      setIsLocked(false);
      setLockoutEndTime(null);
      setSessionWarning(false);
      setIsWarningVisible(false);
      lastActivityRef.current = Date.now();
      setupSessionTimeout();
      
      // Log successful login
      console.log(`[Auth] Login successful for ${found.name}`);
      
      return { success: true };
    }

    // Increment failed attempts
    const newFailedAttempts = failedAttempts + 1;
    setFailedAttempts(newFailedAttempts);

    // Log failed attempt
    console.log(`[Auth] Login failed - attempt ${newFailedAttempts}`);

    // Check if should lock account
    if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockoutEnd = new Date(Date.now() + LOCKOUT_DURATION_MS);
      setIsLocked(true);
      setLockoutEndTime(lockoutEnd);
      
      console.log(`[Auth] Account locked due to ${newFailedAttempts} failed attempts`);
      
      return {
        success: false,
        message: `Too many failed attempts. Account locked for 30 minutes.`,
      };
    }

    return {
      success: false,
      message: `Invalid PIN. ${MAX_FAILED_ATTEMPTS - newFailedAttempts} attempts remaining.`,
    };
  }, [failedAttempts, isLocked, lockoutTimeRemaining, setupSessionTimeout]);

  const logout = useCallback(() => {
    console.log(`[Auth] Logout for ${staff?.name}`);
    setStaff(null);
    setFailedAttempts(0);
    setSessionWarning(false);
    setIsWarningVisible(false);
    clearAllTimers();
  }, [staff, clearAllTimers]);

  const resetLockout = useCallback(() => {
    setFailedAttempts(0);
    setIsLocked(false);
    setLockoutEndTime(null);
    setLockoutTimeRemaining(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        staff,
        isAuthenticated: staff !== null,
        login,
        logout,
        failedAttempts,
        isLocked,
        lockoutTimeRemaining,
        sessionWarning,
        sessionTimeRemainingMs,
        isWarningVisible,
        extendSession,
        lockSession,
        resetLockout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
