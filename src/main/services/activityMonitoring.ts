/**
 * Activity Monitoring Service
 * 
 * Tracks user actions, session duration, and provides auto-save functionality.
 * Integrates with the audit logging system for comprehensive activity tracking.
 */

import log from 'electron-log';
import { BrowserWindow } from 'electron';

interface ActivityEvent {
  id: string;
  timestamp: string;
  staffId: number | null;
  staffName: string | null;
  action: string;
  entityType: string | null;
  entityId: number | null;
  details: Record<string, unknown>;
  sessionId: string;
}

interface SessionInfo {
  sessionId: string;
  staffId: number;
  staffName: string;
  loginTime: string;
  lastActivityTime: string;
  totalActiveTimeMs: number;
  actionCount: number;
  windowFocusChanges: number;
  idleTimeMs: number;
}

// In-memory activity buffer (flushed to audit log periodically)
let activityBuffer: ActivityEvent[] = [];
let currentSession: SessionInfo | null = null;
let lastActivityTimestamp = Date.now();
let isIdle = false;

// Configuration
const IDLE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const BUFFER_FLUSH_INTERVAL_MS = 30 * 1000; // 30 seconds
const MAX_BUFFER_SIZE = 100;

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Start a new session
 */
export function startSession(staffId: number, staffName: string): SessionInfo {
  const sessionId = generateSessionId();
  const now = new Date().toISOString();
  
  currentSession = {
    sessionId,
    staffId,
    staffName,
    loginTime: now,
    lastActivityTime: now,
    totalActiveTimeMs: 0,
    actionCount: 0,
    windowFocusChanges: 0,
    idleTimeMs: 0,
  };
  
  lastActivityTimestamp = Date.now();
  isIdle = false;
  
  log.info(`[ActivityMonitor] Session started: ${sessionId} for staff: ${staffName}`);
  
  // Log session start
  logActivity('SESSION_START', {
    sessionId,
    staffId,
    staffName,
  });
  
  return currentSession;
}

/**
 * End the current session
 */
export function endSession(): SessionInfo | null {
  if (!currentSession) {
    return null;
  }
  
  const session = { ...currentSession };
  const now = Date.now();
  
  // Calculate final active time
  if (!isIdle) {
    session.totalActiveTimeMs += now - lastActivityTimestamp;
  }
  
  // Log session end
  logActivity('SESSION_END', {
    sessionId: session.sessionId,
    staffId: session.staffId,
    staffName: session.staffName,
    durationMs: session.totalActiveTimeMs,
    actionCount: session.actionCount,
    windowFocusChanges: session.windowFocusChanges,
    idleTimeMs: session.idleTimeMs,
  });
  
  log.info(`[ActivityMonitor] Session ended: ${session.sessionId}, Duration: ${Math.round(session.totalActiveTimeMs / 1000)}s, Actions: ${session.actionCount}`);
  
  // Flush buffer
  flushActivityBuffer();
  
  currentSession = null;
  return session;
}

/**
 * Log an activity event
 */
export function logActivity(
  action: string,
  details: Record<string, unknown> = {},
  entityType: string | null = null,
  entityId: number | null = null
): void {
  if (!currentSession) {
    log.warn('[ActivityMonitor] Activity logged without active session:', action);
    return;
  }
  
  const event: ActivityEvent = {
    id: generateEventId(),
    timestamp: new Date().toISOString(),
    staffId: currentSession.staffId,
    staffName: currentSession.staffName,
    action,
    entityType,
    entityId,
    details,
    sessionId: currentSession.sessionId,
  };
  
  activityBuffer.push(event);
  currentSession.actionCount++;
  
  // Update last activity time
  const now = Date.now();
  if (!isIdle) {
    currentSession.totalActiveTimeMs += now - lastActivityTimestamp;
  }
  currentSession.lastActivityTime = event.timestamp;
  lastActivityTimestamp = now;
  isIdle = false;
  
  // Flush if buffer is full
  if (activityBuffer.length >= MAX_BUFFER_SIZE) {
    flushActivityBuffer();
  }
  
  log.verbose(`[ActivityMonitor] Activity: ${action} by ${currentSession.staffName}`);
}

/**
 * Record user activity (called on user interaction)
 */
export function recordUserActivity(): void {
  if (!currentSession) return;
  
  const now = Date.now();
  
  // If coming back from idle, add idle time
  if (isIdle) {
    const idleDuration = now - lastActivityTimestamp;
    currentSession.idleTimeMs += idleDuration;
    isIdle = false;
    
    logActivity('RETURN_FROM_IDLE', {
      idleDurationMs: idleDuration,
    });
  } else {
    // Add to active time
    currentSession.totalActiveTimeMs += now - lastActivityTimestamp;
  }
  
  lastActivityTimestamp = now;
  currentSession.lastActivityTime = new Date().toISOString();
}

/**
 * Check for idle state
 */
export function checkIdleState(): boolean {
  if (!currentSession || isIdle) return isIdle;
  
  const idleDuration = Date.now() - lastActivityTimestamp;
  
  if (idleDuration >= IDLE_THRESHOLD_MS) {
    isIdle = true;
    currentSession.idleTimeMs += idleDuration;
    
    logActivity('IDLE_DETECTED', {
      idleDurationMs: idleDuration,
    });
    
    return true;
  }
  
  return false;
}

/**
 * Record window focus change
 */
export function recordWindowFocusChange(focused: boolean): void {
  if (!currentSession) return;
  
  currentSession.windowFocusChanges++;
  
  logActivity(focused ? 'WINDOW_FOCUS' : 'WINDOW_BLUR', {
    windowFocusCount: currentSession.windowFocusChanges,
  });
}

/**
 * Get current session info
 */
export function getCurrentSession(): SessionInfo | null {
  if (!currentSession) return null;
  
  const now = Date.now();
  const activeTime = isIdle 
    ? currentSession.totalActiveTimeMs 
    : currentSession.totalActiveTimeMs + (now - lastActivityTimestamp);
  
  return {
    ...currentSession,
    totalActiveTimeMs: activeTime,
  };
}

/**
 * Flush activity buffer to persistent storage
 */
function flushActivityBuffer(): void {
  if (activityBuffer.length === 0) return;
  
  // In a real implementation, this would write to the database
  // For now, we log to the console/file
  const events = [...activityBuffer];
  activityBuffer = [];
  
  log.info(`[ActivityMonitor] Flushing ${events.length} activities to audit log`);
  
  // Here we would typically call the audit service to persist these events
  // For now, they're logged via electron-log
  events.forEach(event => {
    log.verbose(`[Activity] ${event.action} | ${event.staffName} | ${event.timestamp}`);
  });
}

/**
 * Auto-save handler - called periodically or on specific events
 */
export function autoSave(context: {
  formData: Record<string, unknown>;
  formType: string;
  draftId?: number;
}): void {
  if (!currentSession) return;
  
  logActivity('AUTO_SAVE', {
    formType: context.formType,
    draftId: context.draftId,
    hasUnsavedChanges: true,
  });
  
  log.info(`[ActivityMonitor] Auto-save triggered for ${context.formType}`);
}

/**
 * Screen lock handler
 */
export function handleScreenLock(reason: 'timeout' | 'manual' | 'system'): void {
  if (!currentSession) return;
  
  logActivity('SCREEN_LOCK', {
    reason,
    sessionDurationMs: currentSession.totalActiveTimeMs,
    actionCount: currentSession.actionCount,
  });
  
  // Flush buffer before lock
  flushActivityBuffer();
  
  log.info(`[ActivityMonitor] Screen locked: ${reason}`);
}

/**
 * Get session statistics
 */
export function getSessionStats(): {
  totalSessions: number;
  totalActions: number;
  averageSessionDuration: number;
  totalIdleTime: number;
} | null {
  if (!currentSession) return null;
  
  return {
    totalSessions: 1,
    totalActions: currentSession.actionCount,
    averageSessionDuration: currentSession.totalActiveTimeMs,
    totalIdleTime: currentSession.idleTimeMs,
  };
}

/**
 * Setup activity monitoring
 */
export function setupActivityMonitoring(mainWindow: BrowserWindow): void {
  // Listen for window focus changes
  mainWindow.on('focus', () => {
    recordWindowFocusChange(true);
  });
  
  mainWindow.on('blur', () => {
    recordWindowFocusChange(false);
  });
  
  // Set up periodic buffer flush
  setInterval(() => {
    flushActivityBuffer();
  }, BUFFER_FLUSH_INTERVAL_MS);
  
  // Set up idle checking
  setInterval(() => {
    checkIdleState();
  }, 60000); // Check every minute
  
  log.info('[ActivityMonitor] Activity monitoring initialized');
}

/**
 * Cleanup activity monitoring
 */
export function cleanupActivityMonitoring(): void {
  endSession();
  flushActivityBuffer();
}

export default {
  startSession,
  endSession,
  logActivity,
  recordUserActivity,
  checkIdleState,
  recordWindowFocusChange,
  getCurrentSession,
  autoSave,
  handleScreenLock,
  getSessionStats,
  setupActivityMonitoring,
  cleanupActivityMonitoring,
};
