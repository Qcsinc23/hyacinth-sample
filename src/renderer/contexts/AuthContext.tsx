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

// Role mapping: backend roles → renderer roles
const mapRole = (backendRole: string): Staff['role'] => {
  const roleMap: Record<string, Staff['role']> = {
    admin: 'admin',
    dispenser: 'technician',
    nurse: 'nurse',
    pharmacist: 'pharmacist',
    technician: 'technician',
  };
  return roleMap[backendRole] || 'technician';
};

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
  const isWarningVisibleRef = useRef<boolean>(false);

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

  // Sync ref with state
  useEffect(() => {
    isWarningVisibleRef.current = isWarningVisible;
  }, [isWarningVisible]);

  // Setup session timeout countdown
  const setupSessionTimeout = useCallback(() => {
    clearAllTimers();
    
    // Set up countdown timer
    countdownTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, SESSION_TIMEOUT_MS - elapsed);
      setSessionTimeRemainingMs(remaining);
      
      // Show warning when approaching timeout (use ref to avoid stale closure)
      if (remaining <= SESSION_WARNING_MS && remaining > 0 && !isWarningVisibleRef.current) {
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
  }, [clearAllTimers]);

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
    return undefined;
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
    return undefined;
  }, [staff, updateActivity, setupSessionTimeout, clearAllTimers, isWarningVisible]);

  const login = useCallback(async (pin: string): Promise<LoginResult> => {
    // Check if account is locked
    if (isLocked) {
      return {
        success: false,
        message: `Account locked. Please try again in ${Math.ceil((lockoutTimeRemaining || 0) / 60)} minutes.`,
      };
    }

    try {
      // Verify PIN via main process (this also creates a session on success)
      if (!window.electron?.staff?.verify) {
        console.error('[Auth] window.electron.staff.verify is not available', {
          electronDefined: typeof window.electron !== 'undefined',
          staffDefined: typeof window.electron?.staff !== 'undefined',
        });
        return { success: false, message: 'Application is still loading. Please wait a moment and try again.' };
      }

      const result = await window.electron.staff.verify(pin) as any;

      // Backend returns { success: true, staff: { id, first_name, last_name, role, ... } }
      if (result?.success && result?.staff) {
        const backendStaff = result.staff;
        const staffObj: Staff = {
          id: String(backendStaff.id),
          name: `${backendStaff.first_name} ${backendStaff.last_name}`,
          role: mapRole(backendStaff.role),
          pin: '', // Not stored client-side
          isActive: true,
        };

        setStaff(staffObj);
        setFailedAttempts(0);
        setIsLocked(false);
        setLockoutEndTime(null);
        setSessionWarning(false);
        setIsWarningVisible(false);
        lastActivityRef.current = Date.now();
        setupSessionTimeout();

        console.log(`[Auth] Login successful for ${staffObj.name} (${staffObj.role})`);
        return { success: true };
      }

      // PIN verification failed
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);
      console.log(`[Auth] Login failed - attempt ${newFailedAttempts}`);

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
    } catch (err) {
      console.error('[Auth] Login error:', err);
      return { success: false, message: 'Login failed. Please try again.' };
    }
  }, [failedAttempts, isLocked, lockoutTimeRemaining, setupSessionTimeout]);

  const logout = useCallback(() => {
    console.log(`[Auth] Logout for ${staff?.name}`);
    // Clear main process session
    window.electron?.app?.logout?.().catch(() => {});
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
