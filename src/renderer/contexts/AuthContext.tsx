/**
 * Enhanced Authentication Context
 *
 * Keeps renderer auth state synchronized with the main process session and
 * lockout state while preserving local warning UX for idle timeout.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { Staff } from '../types';
import type { LockoutState, SessionStatus } from '../../shared/types';

const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
const SESSION_WARNING_MS = 60 * 1000;
const BACKEND_TOUCH_INTERVAL_MS = 30 * 1000;

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

const emptyLockoutState: LockoutState = {
  isLocked: false,
  failedAttempts: 0,
  maxAttempts: 5,
  lockoutDurationMinutes: 30,
  lockedUntil: null,
  secondsRemaining: 0,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<Date | null>(null);
  const [lockoutTimeRemaining, setLockoutTimeRemaining] = useState<
    number | null
  >(null);
  const [sessionWarning, setSessionWarning] = useState(false);
  const [sessionTimeRemainingMs, setSessionTimeRemainingMs] =
    useState(SESSION_TIMEOUT_MS);
  const [isWarningVisible, setIsWarningVisible] = useState(false);

  const lastActivityRef = useRef<number>(Date.now());
  const lastBackendTouchRef = useRef<number>(0);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lockoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  const applyLockoutState = useCallback((lockout: LockoutState) => {
    setFailedAttempts(lockout.failedAttempts);
    setIsLocked(lockout.isLocked);
    setLockoutEndTime(lockout.lockedUntil ? new Date(lockout.lockedUntil) : null);
    setLockoutTimeRemaining(lockout.isLocked ? lockout.secondsRemaining : null);
  }, []);

  const syncFromSessionStatus = useCallback(
    (status: SessionStatus) => {
      if (status.authenticated && status.staffId && status.role) {
        setStaff({
          id: String(status.staffId),
          name:
            `${status.firstName || ''} ${status.lastName || ''}`.trim() ||
            'Unknown',
          role: mapRole(status.role),
          pin: '',
          isActive: true,
        });
      } else {
        setStaff(null);
      }

      applyLockoutState(status.lockout || emptyLockoutState);
    },
    [applyLockoutState],
  );

  const clearAllTimers = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (lockoutTimerRef.current) {
      clearInterval(lockoutTimerRef.current);
      lockoutTimerRef.current = null;
    }
  }, []);

  const syncBackendActivity = useCallback(() => {
    if (!window.electron?.auth?.touch) {
      return;
    }

    const now = Date.now();
    if (now - lastBackendTouchRef.current < BACKEND_TOUCH_INTERVAL_MS) {
      return;
    }

    lastBackendTouchRef.current = now;
    window.electron.auth.touch().catch(() => {});
  }, []);

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setSessionTimeRemainingMs(SESSION_TIMEOUT_MS);
    setSessionWarning(false);
    setIsWarningVisible(false);
  }, []);

  const extendSession = useCallback(() => {
    updateActivity();
    syncBackendActivity();
  }, [syncBackendActivity, updateActivity]);

  const logout = useCallback(() => {
    window.electron?.auth?.logout?.().catch(() => {});
    clearAllTimers();
    setStaff(null);
    applyLockoutState(emptyLockoutState);
    setSessionWarning(false);
    setIsWarningVisible(false);
  }, [applyLockoutState, clearAllTimers]);

  const lockSession = useCallback(() => {
    logout();
  }, [logout]);

  const resetLockout = useCallback(() => {
    applyLockoutState(emptyLockoutState);
  }, [applyLockoutState]);

  useEffect(() => {
    let active = true;

    if (window.electron?.auth?.check) {
      window.electron.auth
        .check()
        .then((status) => {
          if (active) {
            syncFromSessionStatus(status);
          }
        })
        .catch(() => {});
    }

    const unsubscribe = window.electron?.app?.onLock?.(() => {
      setStaff(null);
      setSessionWarning(false);
      setIsWarningVisible(false);
    });

    return () => {
      active = false;
      unsubscribe?.();
      clearAllTimers();
    };
  }, [clearAllTimers, syncFromSessionStatus]);

  useEffect(() => {
    if (!lockoutEndTime || !isLocked) {
      return undefined;
    }

    lockoutTimerRef.current = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((lockoutEndTime.getTime() - Date.now()) / 1000),
      );
      setLockoutTimeRemaining(remaining);

      if (remaining <= 0) {
        applyLockoutState(emptyLockoutState);
      }
    }, 1000);

    return () => {
      if (lockoutTimerRef.current) {
        clearInterval(lockoutTimerRef.current);
      }
    };
  }, [applyLockoutState, isLocked, lockoutEndTime]);

  useEffect(() => {
    if (!staff) {
      return undefined;
    }

    const handleActivity = () => {
      if (!isWarningVisible) {
        updateActivity();
        syncBackendActivity();
      }
    };

    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'touchstart',
      'scroll',
      'click',
    ];

    events.forEach((eventName) => {
      document.addEventListener(eventName, handleActivity, { passive: true });
    });

    countdownTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, SESSION_TIMEOUT_MS - elapsed);
      setSessionTimeRemainingMs(remaining);

      if (remaining <= SESSION_WARNING_MS && remaining > 0) {
        setIsWarningVisible(true);
        setSessionWarning(true);
      }

      if (remaining === 0) {
        logout();
      }
    }, 1000);

    return () => {
      events.forEach((eventName) => {
        document.removeEventListener(eventName, handleActivity);
      });
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [isWarningVisible, logout, staff, syncBackendActivity, updateActivity]);

  const login = useCallback(
    async (pin: string): Promise<LoginResult> => {
      if (isLocked) {
        return {
          success: false,
          message: `Account locked. Please try again in ${Math.ceil(
            (lockoutTimeRemaining || 0) / 60,
          )} minutes.`,
        };
      }

      if (!window.electron?.auth?.login || !window.electron?.auth?.check) {
        return {
          success: false,
          message: 'Application is still loading. Please wait a moment and try again.',
        };
      }

      try {
        const result = await window.electron.auth.login(pin);

        if (result.success && result.data) {
          const status = await window.electron.auth.check();
          syncFromSessionStatus(status);
          lastActivityRef.current = Date.now();
          lastBackendTouchRef.current = Date.now();
          setSessionWarning(false);
          setIsWarningVisible(false);
          return { success: true };
        }

        const failedResult = result as { success: false; error?: string; details?: { lockout?: LockoutState } };
        const lockout = (failedResult.details?.lockout as LockoutState | undefined) ||
          emptyLockoutState;
        applyLockoutState(lockout);

        return {
          success: false,
          message: failedResult.error || 'Invalid PIN. Please try again.',
        };
      } catch (error) {
        console.error('[Auth] Login error:', error);
        return {
          success: false,
          message: 'Login failed. Please try again.',
        };
      }
    },
    [applyLockoutState, isLocked, lockoutTimeRemaining, syncFromSessionStatus],
  );

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
