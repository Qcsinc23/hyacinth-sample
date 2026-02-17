/**
 * Authentication Middleware for IPC Handlers
 * Manages session state and enforces authentication for PHI-related operations
 */

import { IpcMainInvokeEvent } from 'electron';
import { IpcResponse } from '../../shared/types';

// ============================================================================
// Session State Management
// ============================================================================

interface Session {
  staffId: number;
  role: string;
  loginTime: Date;
  lastActivity: Date;
}

// In-memory session storage
let currentSession: Session | null = null;
let sessionTimeoutMs: number = 30 * 60 * 1000; // 30 minutes default

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
export function createSession(staffId: number, role: string): void {
  const now = new Date();
  currentSession = {
    staffId,
    role,
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
};
