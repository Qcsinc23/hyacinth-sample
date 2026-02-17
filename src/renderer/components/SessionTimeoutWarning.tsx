/**
 * Session Timeout Warning Component
 * 
 * Displays a warning modal when the session is about to expire due to inactivity.
 * Allows users to extend their session or lets it auto-lock.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Clock, Lock } from 'lucide-react';

interface SessionTimeoutWarningProps {
  /** Time in milliseconds before auto-lock (default: 5 minutes) */
  timeoutMs?: number;
  /** Time in milliseconds to show warning before timeout (default: 1 minute) */
  warningMs?: number;
  /** Callback when user chooses to extend session */
  onExtendSession: () => void;
  /** Callback when session times out / auto-locks */
  onTimeout: () => void;
  /** Whether the warning is currently visible */
  isVisible: boolean;
  /** Time remaining in milliseconds when warning was triggered */
  timeRemainingMs: number;
}

export const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  warningMs = 60 * 1000, // 1 minute warning default
  onExtendSession,
  onTimeout,
  isVisible,
  timeRemainingMs,
}) => {
  const [countdown, setCountdown] = useState(Math.ceil(timeRemainingMs / 1000));
  const [isExpiring, setIsExpiring] = useState(false);

  // Update countdown when timeRemainingMs changes
  useEffect(() => {
    setCountdown(Math.ceil(timeRemainingMs / 1000));
    setIsExpiring(timeRemainingMs <= 10000); // Flash warning in last 10 seconds
  }, [timeRemainingMs]);

  // Countdown timer
  useEffect(() => {
    if (!isVisible || countdown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        const next = prev - 1;
        if (next <= 10) {
          setIsExpiring(true);
        }
        if (next <= 0) {
          clearInterval(timer);
          onTimeout();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, countdown, onTimeout]);

  const handleExtendSession = useCallback(() => {
    setIsExpiring(false);
    onExtendSession();
  }, [onExtendSession]);

  const handleLockNow = useCallback(() => {
    onTimeout();
  }, [onTimeout]);

  // Format countdown time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        className={`bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all duration-300 ${
          isExpiring ? 'animate-pulse border-2 border-red-500' : 'border border-gray-200'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className={`p-3 rounded-full ${isExpiring ? 'bg-red-100' : 'bg-amber-100'}`}>
            <AlertTriangle className={`w-8 h-8 ${isExpiring ? 'text-red-600' : 'text-amber-600'}`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Session Expiring Soon
            </h2>
            <p className="text-sm text-gray-500">
              Your session will lock due to inactivity
            </p>
          </div>
        </div>

        {/* Countdown Display */}
        <div className={`text-center py-6 rounded-xl mb-6 ${
          isExpiring 
            ? 'bg-red-50 border-2 border-red-200' 
            : 'bg-gray-50 border-2 border-gray-200'
        }`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className={`w-5 h-5 ${isExpiring ? 'text-red-600' : 'text-gray-600'}`} />
            <span className={`text-sm font-medium ${isExpiring ? 'text-red-600' : 'text-gray-600'}`}>
              Time Remaining
            </span>
          </div>
          <div className={`text-4xl font-mono font-bold ${
            isExpiring ? 'text-red-600' : 'text-gray-900'
          }`}>
            {formatTime(countdown)}
          </div>
          {isExpiring && (
            <p className="text-sm text-red-600 mt-2 font-medium">
              Locking session now...
            </p>
          )}
        </div>

        {/* Warning Message */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-800">
            <strong>Security Notice:</strong> For your protection and patient privacy, 
            your session will automatically lock after a period of inactivity. 
            Any unsaved work may be lost.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleExtendSession}
            disabled={countdown <= 0}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Extend Session
          </button>
          <button
            onClick={handleLockNow}
            disabled={countdown <= 0}
            className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            Lock Now
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ease-linear ${
                isExpiring 
                  ? 'bg-red-500' 
                  : countdown <= warningMs / 2000 
                    ? 'bg-amber-500' 
                    : 'bg-green-500'
              }`}
              style={{ 
                width: `${(countdown / (warningMs / 1000)) * 100}%` 
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook to manage session timeout
 */
export interface UseSessionTimeoutOptions {
  timeoutMs?: number;
  warningMs?: number;
  onTimeout?: () => void;
  onWarning?: () => void;
  enabled?: boolean;
}

export interface UseSessionTimeoutReturn {
  timeRemainingMs: number;
  isWarningVisible: boolean;
  extendSession: () => void;
  lockSession: () => void;
  resetTimer: () => void;
}

export const useSessionTimeout = ({
  timeoutMs = 5 * 60 * 1000, // 5 minutes
  warningMs = 60 * 1000, // 1 minute warning
  onTimeout,
  onWarning,
  enabled = true,
}: UseSessionTimeoutOptions): UseSessionTimeoutReturn => {
  const [timeRemainingMs, setTimeRemainingMs] = useState(timeoutMs);
  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Reset timer on user activity
  const resetTimer = useCallback(() => {
    if (!enabled) return;
    
    setLastActivity(Date.now());
    setTimeRemainingMs(timeoutMs);
    setIsWarningVisible(false);
  }, [enabled, timeoutMs]);

  // Extend session
  const extendSession = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  // Lock session immediately
  const lockSession = useCallback(() => {
    setTimeRemainingMs(0);
    setIsWarningVisible(false);
    onTimeout?.();
  }, [onTimeout]);

  // Monitor activity and update timer
  useEffect(() => {
    if (!enabled) return;

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    const handleActivity = () => {
      if (!isWarningVisible) {
        resetTimer();
      }
    };

    // Add activity listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Timer interval
    const timer = setInterval(() => {
      const elapsed = Date.now() - lastActivity;
      const remaining = Math.max(0, timeoutMs - elapsed);
      
      setTimeRemainingMs(remaining);

      // Show warning when approaching timeout
      if (remaining <= warningMs && remaining > 0 && !isWarningVisible) {
        setIsWarningVisible(true);
        onWarning?.();
      }

      // Timeout reached
      if (remaining === 0 && isWarningVisible) {
        setIsWarningVisible(false);
        onTimeout?.();
      }
    }, 1000);

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearInterval(timer);
    };
  }, [enabled, lastActivity, timeoutMs, warningMs, isWarningVisible, onTimeout, onWarning, resetTimer]);

  return {
    timeRemainingMs,
    isWarningVisible,
    extendSession,
    lockSession,
    resetTimer,
  };
};

export default SessionTimeoutWarning;
