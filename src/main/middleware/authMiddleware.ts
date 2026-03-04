/**
 * Authentication Middleware for IPC Handlers
 * Manages session state and enforces authentication for PHI-related operations
 */

import { IpcMainInvokeEvent } from 'electron';
import {
  IpcResponse,
  LockoutState,
  SessionStatus,
  StaffRole,
} from '../../shared/types';
import { getDatabase } from '../database/db';
import { getSetting } from '../settings/settings';

// ============================================================================
// Session State Management
// ============================================================================

interface Session {
  staffId: number;
  role: StaffRole;
  firstName?: string | null;
  lastName?: string | null;
  loginTime: Date;
  lastActivity: Date;
}

// In-memory session storage
let currentSession: Session | null = null;
let sessionTimeoutMs: number = 30 * 60 * 1000; // 30 minutes default
const AUTH_FAILED_ATTEMPTS_KEY = 'authFailedAttempts';
const AUTH_LOCKED_UNTIL_KEY = 'authLockedUntil';

function getInternalSetting(key: string): string | null {
  try {
    const db = getDatabase();
    const result = db
      .prepare('SELECT value FROM app_settings WHERE key = ?')
      .get(key) as { value: string } | undefined;
    return result?.value ?? null;
  } catch {
    return null;
  }
}

function setInternalSetting(key: string, value: string | null): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(
    `
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `,
  ).run(key, value ?? 'null', now);
}

function getLockoutPolicy(): {
  maxAttempts: number;
  lockoutDurationMinutes: number;
} {
  return {
    maxAttempts: Math.max(1, Number(getSetting('maxLoginAttempts') ?? 5)),
    lockoutDurationMinutes: Math.max(
      1,
      Number(getSetting('lockoutDurationMinutes') ?? 30),
    ),
  };
}

export function clearAuthenticationFailures(): void {
  setInternalSetting(AUTH_FAILED_ATTEMPTS_KEY, '0');
  setInternalSetting(AUTH_LOCKED_UNTIL_KEY, null);
}

export function getLockoutState(): LockoutState {
  const { maxAttempts, lockoutDurationMinutes } = getLockoutPolicy();
  const failedAttempts = Number(getInternalSetting(AUTH_FAILED_ATTEMPTS_KEY) ?? 0);
  const lockedUntilValue = getInternalSetting(AUTH_LOCKED_UNTIL_KEY);
  const lockedUntil =
    lockedUntilValue && lockedUntilValue !== 'null' ? lockedUntilValue : null;

  if (!lockedUntil) {
    return {
      isLocked: false,
      failedAttempts,
      maxAttempts,
      lockoutDurationMinutes,
      lockedUntil: null,
      secondsRemaining: 0,
    };
  }

  const remainingMs = new Date(lockedUntil).getTime() - Date.now();
  if (remainingMs <= 0) {
    clearAuthenticationFailures();
    return {
      isLocked: false,
      failedAttempts: 0,
      maxAttempts,
      lockoutDurationMinutes,
      lockedUntil: null,
      secondsRemaining: 0,
    };
  }

  return {
    isLocked: true,
    failedAttempts,
    maxAttempts,
    lockoutDurationMinutes,
    lockedUntil,
    secondsRemaining: Math.ceil(remainingMs / 1000),
  };
}

export function recordFailedAuthenticationAttempt(): LockoutState {
  const currentState = getLockoutState();
  const { maxAttempts, lockoutDurationMinutes } = getLockoutPolicy();

  if (currentState.isLocked) {
    return currentState;
  }

  const failedAttempts = currentState.failedAttempts + 1;
  setInternalSetting(AUTH_FAILED_ATTEMPTS_KEY, String(failedAttempts));

  if (failedAttempts >= maxAttempts) {
    const lockedUntil = new Date(
      Date.now() + lockoutDurationMinutes * 60 * 1000,
    ).toISOString();
    setInternalSetting(AUTH_LOCKED_UNTIL_KEY, lockedUntil);
  }

  return getLockoutState();
}

export function isAuthLocked(): boolean {
  return getLockoutState().isLocked;
}

export function getSessionStatus(sessionLocked = false): SessionStatus {
  const session = getCurrentSession();

  return {
    authenticated: Boolean(session),
    staffId: session?.staffId ?? null,
    role: session?.role ?? null,
    firstName: session?.firstName ?? null,
    lastName: session?.lastName ?? null,
    sessionLocked,
    lockout: getLockoutState(),
  };
}

// ============================================================================
// Session Management Functions
// ============================================================================

/**
 * Check if there is an active authenticated session
 */
export function isAuthenticated(): boolean {
  if (!currentSession) {
    return false;
  }

  // Check if session has expired
  const now = new Date();
  const timeSinceLastActivity =
    now.getTime() - currentSession.lastActivity.getTime();

  if (timeSinceLastActivity > sessionTimeoutMs) {
    // Session expired
    clearSession();
    return false;
  }

  return true;
}

/**
 * Get the current authenticated staff ID, or null if not authenticated
 */
export function getAuthenticatedStaffId(): number | null {
  if (!isAuthenticated()) {
    return null;
  }
  return currentSession?.staffId ?? null;
}

/**
 * Get the current session details, or null if not authenticated
 */
export function getCurrentSession(): Session | null {
  if (!isAuthenticated()) {
    return null;
  }
  return currentSession;
}

/**
 * Create a new authenticated session after successful login
 */
export function createSession(
  staffId: number,
  role: StaffRole,
  identity?: { firstName?: string | null; lastName?: string | null },
): void {
  const now = new Date();
  currentSession = {
    staffId,
    role,
    firstName: identity?.firstName ?? null,
    lastName: identity?.lastName ?? null,
    loginTime: now,
    lastActivity: now,
  };
  console.log(`[Auth] Session created for staff ${staffId} with role ${role}`);
}

/**
 * Clear the current session (logout or timeout)
 */
export function clearSession(): void {
  if (currentSession) {
    console.log(`[Auth] Session cleared for staff ${currentSession.staffId}`);
  }
  currentSession = null;
}

/**
 * Update the last activity timestamp to prevent session timeout
 */
export function touchSession(): void {
  if (currentSession) {
    currentSession.lastActivity = new Date();
  }
}

/**
 * Set the session timeout duration
 */
export function setSessionTimeout(timeoutMs: number): void {
  sessionTimeoutMs = timeoutMs;
}

/**
 * Get the session timeout duration
 */
export function getSessionTimeout(): number {
  return sessionTimeoutMs;
}

// ============================================================================
// Authentication Wrapper for IPC Handlers
// ============================================================================

export type IpcHandler<T = unknown> = (
  event: IpcMainInvokeEvent,
  ...args: any[]
) => T | Promise<T>;
export type IpcHandlerWithoutEvent<T = unknown> = (
  ...args: any[]
) => T | Promise<T>;

/**
 * Unauthorized response constant
 */
const UNAUTHORIZED_RESPONSE: IpcResponse<never> = {
  success: false,
  error: 'Unauthorized',
};

/**
 * Wrap an IPC handler with authentication check
 * Returns { success: false, error: 'Unauthorized' } if not authenticated
 */
export function requireAuth<T>(
  handler: IpcHandlerWithoutEvent<T>,
): IpcHandler<IpcResponse<T>> {
  return async (
    _event: IpcMainInvokeEvent,
    ...args: any[]
  ): Promise<IpcResponse<T>> => {
    if (!isAuthenticated()) {
      console.warn('[Auth] Unauthorized IPC call blocked');
      return UNAUTHORIZED_RESPONSE;
    }

    // Update last activity on successful auth check
    touchSession();

    try {
      const result = await handler(...args);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Auth] Handler error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };
}

/**
 * Wrap an IPC handler that needs the staff ID from the session
 */
export function requireAuthWithStaff<T>(
  handler: (staffId: number, ...args: any[]) => T | Promise<T>,
): IpcHandler<IpcResponse<T>> {
  return async (
    _event: IpcMainInvokeEvent,
    ...args: any[]
  ): Promise<IpcResponse<T>> => {
    if (!isAuthenticated()) {
      console.warn('[Auth] Unauthorized IPC call blocked');
      return UNAUTHORIZED_RESPONSE;
    }

    const staffId = getAuthenticatedStaffId();
    if (!staffId) {
      console.warn('[Auth] No staff ID in session');
      return UNAUTHORIZED_RESPONSE;
    }

    // Update last activity on successful auth check
    touchSession();

    try {
      const result = await handler(staffId, ...args);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Auth] Handler error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };
}

/**
 * Check if the current user has admin role
 */
export function isAdmin(): boolean {
  if (!isAuthenticated()) {
    return false;
  }
  return currentSession?.role === 'admin';
}

/**
 * Wrap an IPC handler that requires admin privileges
 */
export function requireAdmin<T>(
  handler: IpcHandlerWithoutEvent<T>,
): IpcHandler<IpcResponse<T>> {
  return async (
    _event: IpcMainInvokeEvent,
    ...args: any[]
  ): Promise<IpcResponse<T>> => {
    if (!isAuthenticated()) {
      console.warn('[Auth] Unauthorized IPC call blocked');
      return UNAUTHORIZED_RESPONSE;
    }

    if (!isAdmin()) {
      console.warn('[Auth] Admin privilege required but not granted');
      return {
        success: false,
        error: 'Admin privileges required',
      };
    }

    // Update last activity on successful auth check
    touchSession();

    try {
      const result = await handler(...args);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Auth] Handler error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  isAuthenticated,
  getAuthenticatedStaffId,
  getCurrentSession,
  createSession,
  clearSession,
  touchSession,
  setSessionTimeout,
  getSessionTimeout,
  requireAuth,
  requireAuthWithStaff,
  isAdmin,
  requireAdmin,
  clearAuthenticationFailures,
  recordFailedAuthenticationAttempt,
  getLockoutState,
  getSessionStatus,
  isAuthLocked,
};
