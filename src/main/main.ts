/**
 * Hyacinth Medication Dispensing System - Main Process
 *
 * This module executes inside of electron's main process.
 * Handles database initialization, migrations, backup scheduling,
 * expiration scanning, and window management.
 */

import path from 'path';
import fs from 'fs';
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

// Import database modules
import {
  initDatabase,
  runSchema,
  closeDatabase,
  checkDatabaseHealth,
} from './database/db';
import { initializeDatabase, getDatabaseStatus } from './database';
import { registerIpcHandlers } from './ipc-handlers';

// Import authentication middleware
import {
  createSession,
  clearSession,
  isAuthenticated,
  getCurrentSession,
  touchSession,
  setSessionTimeout,
  clearAuthenticationFailures,
  recordFailedAuthenticationAttempt,
  getLockoutState,
  getSessionStatus,
} from './middleware/authMiddleware';

// Import services
import { checkForExpiredItems } from './database/queries/alerts';
import { startBackupScheduler, runManualBackup } from './backup/scheduler';
import {
  initializeDefaultSettings,
  getSetting,
  setSetting,
} from './settings/settings';
import { setMainWindow as setPrintMainWindow } from './services/printService';

// Import security utilities
import { hashPin, verifyPin } from './security/pin';
import {
  getStaffById,
  verifyStaffPin as verifyStaffSessionPin,
  verifyPin as verifyStaffPinHash,
} from './database/queries/staff';
import { logAuthentication } from './database/queries/audit';

// Set app name before any getPath('userData') so the database and config live in a
// stable directory (e.g. ~/Library/Application Support/Hyacinth) on every launch.
// Without this, development runs can end up with different userData and a fresh DB each time.
app.setName('Hyacinth');

// Global error handlers: log crashes and show user-friendly message instead of silent exit
process.on('uncaughtException', (err: Error) => {
  log.error('[Main] Uncaught exception:', err);
  try {
    dialog.showErrorBox(
      'Unexpected Error',
      `Hyacinth encountered an error and must close.\n\n${err.message}`,
    );
  } catch {
    // Dialog failed, already logging above
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  log.error('[Main] Unhandled rejection:', reason);
});

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.allowPrerelease =
      (process.env.HYACINTH_RELEASE_CHANNEL || 'internal') !== 'production';
    try {
      autoUpdater.channel = process.env.HYACINTH_RELEASE_CHANNEL || 'internal';
    } catch (error) {
      log.warn('[Updater] Failed to set release channel:', error);
    }

    autoUpdater.on('update-downloaded', async (info) => {
      const dbHealth = checkDatabaseHealth();
      const sessionSafeToInterrupt = !isAuthenticated() || isLocked;

      if (!sessionSafeToInterrupt) {
        log.info(
          `[Updater] Update ${info.version} downloaded but deferred until workstation is locked or logged out`,
        );
        return;
      }

      if (!dbHealth.healthy) {
        log.warn('[Updater] Update deferred because database health check failed');
        return;
      }

      try {
        await runManualBackup();
        log.info(`[Updater] Installing update ${info.version}`);
        autoUpdater.quitAndInstall(false, true);
      } catch (error) {
        log.error('[Updater] Update install deferred because pre-install backup failed:', error);
      }
    });

    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

// Single instance lock (skip during E2E tests so Playwright can launch)
const isE2ETest = process.env.HYACINTH_E2E_TEST === '1';
const gotTheLock = isE2ETest || app.requestSingleInstanceLock();

if (!gotTheLock) {
  log.info('Another instance is already running. Quitting.');
  app.quit();
  process.exit(0);
}

// Security: Auto-lock timer
let inactivityTimer: NodeJS.Timeout | null = null;
let isLocked = false;
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

const resetInactivityTimer = () => {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }

  if (!isLocked) {
    inactivityTimer = setTimeout(() => {
      if (mainWindow) {
        isLocked = true;
        const session = getCurrentSession();
        // Clear authentication session on auto-lock
        clearSession();
        mainWindow.webContents.send('app:lock');
        if (session) {
          logAuthentication(
            'SESSION_TIMEOUT',
            session.staffId,
            `${session.firstName || ''} ${session.lastName || ''}`.trim() || null,
            {
              sessionDuration: Date.now() - session.loginTime.getTime(),
            },
          );
        }
        log.info('Application auto-locked due to inactivity - session cleared');
      }
    }, INACTIVITY_TIMEOUT);
  }
};

const createWindow = async () => {
  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  // Preload path: use preload.js next to main when it exists (built/production),
  // otherwise use dev DLL path. When running built app via "electron dist/main/main.js",
  // app.isPackaged is false but preload.js is in __dirname, so we must check for it.
  const preloadNextToMain = path.join(__dirname, 'preload.js');
  const preloadDev = path.join(__dirname, '../../.erb/dll/preload.js');
  const preloadPath = fs.existsSync(preloadNextToMain)
    ? preloadNextToMain
    : preloadDev;
  if (!fs.existsSync(preloadPath)) {
    log.warn(
      '[Main] Preload not found at',
      preloadPath,
      '(tried',
      preloadNextToMain,
      'and',
      preloadDev,
      ')',
    );
  } else {
    log.info('[Main] Using preload:', preloadPath);
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    icon: getAssetPath('icon.png'),
    title: 'Hyacinth v2.1 - Medication Dispensing System',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true, // Explicitly enable for security
      nodeIntegration: false, // Explicitly disable for security
      webSecurity: true, // Explicitly enable web security
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) return;

    mainWindow.show();
    mainWindow.focus();
    resetInactivityTimer();

    // Set main window for print service
    setPrintMainWindow(mainWindow);

    // Start expiration scan after window is ready
    setTimeout(() => {
      checkForExpiredItems();
    }, 5000);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    // Clear session on window close
    clearSession();
  });

  // Track user activity for auto-lock
  mainWindow.webContents.on('before-input-event', () => {
    resetInactivityTimer();
    // Also update session activity
    if (isAuthenticated()) {
      touchSession();
    }
  });

  mainWindow.on('focus', () => {
    resetInactivityTimer();
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  new AppUpdater();
};

// ============================================================================
// IPC Handlers for App Lock and Authentication
// ============================================================================

ipcMain.handle('app:unlock', async (_event, pin?: string) => {
  try {
    const storedHash = getSetting('pinHash') as string | null;

    if (!storedHash) {
      // No app PIN is configured, unlock immediately.
      isLocked = false;
      resetInactivityTimer();
      const session = getCurrentSession();
      if (session) {
        logAuthentication(
          'SESSION_UNLOCK',
          session.staffId,
          `${session.firstName || ''} ${session.lastName || ''}`.trim() || null,
        );
      }
      return { success: true };
    }

    // If there is already an authenticated staff session (e.g., after lock screen PIN),
    // allow unlock without re-validating an app-level PIN.
    if (!pin) {
      if (isAuthenticated()) {
        isLocked = false;
        resetInactivityTimer();
        const session = getCurrentSession();
        if (session) {
          logAuthentication(
            'SESSION_UNLOCK',
            session.staffId,
            `${session.firstName || ''} ${session.lastName || ''}`.trim() || null,
          );
        }
        return { success: true };
      }
      return { success: false, error: 'PIN required' };
    }

    const isValid = await verifyPin(pin, storedHash);

    if (isValid) {
      isLocked = false;
      resetInactivityTimer();
      const session = getCurrentSession();
      if (session) {
        logAuthentication(
          'SESSION_UNLOCK',
          session.staffId,
          `${session.firstName || ''} ${session.lastName || ''}`.trim() || null,
        );
      }
      return { success: true };
    }

    return { success: false, error: 'Invalid PIN' };
  } catch (error) {
    log.error('Failed to verify PIN:', error);
    return { success: false, error: 'Verification failed' };
  }
});

ipcMain.handle('app:isLocked', () => {
  return { success: true, data: isLocked };
});

// Staff login with PIN - creates authenticated session
ipcMain.handle(
  'auth:login',
  async (
    _event,
    {
      staffId,
      pin,
    }: {
      staffId?: number;
      pin: string;
    },
  ) => {
    try {
      if (!pin || !/^\d{4}$/.test(pin)) {
        return {
          success: false,
          error: 'A valid 4-digit PIN is required',
          code: 'INVALID_PIN_FORMAT',
        };
      }

      const lockout = getLockoutState();
      if (lockout.isLocked) {
        return {
          success: false,
          error: `Account locked. Try again in ${Math.ceil(
            lockout.secondsRemaining / 60,
          )} minutes.`,
          code: 'ACCOUNT_LOCKED',
          details: { lockout },
        };
      }

      const staff = staffId
        ? getStaffById(staffId)
        : null;

      const verifiedStaff =
        staffId && staff
          ? verifyStaffPinHash(pin, staff.pin_hash) &&
            staff.is_active
            ? staff
            : null
          : verifyStaffSessionPin(pin).staff ?? null;

      if (!verifiedStaff) {
        const updatedLockout = recordFailedAuthenticationAttempt();
        logAuthentication('LOGIN_FAILURE', null, null, {
          failureReason: 'Invalid PIN',
          attemptCount: updatedLockout.failedAttempts,
          lockedUntil: updatedLockout.lockedUntil ?? undefined,
        });

        return {
          success: false,
          error: updatedLockout.isLocked
            ? 'Too many failed attempts. Account locked.'
            : 'Invalid PIN',
          code: updatedLockout.isLocked ? 'ACCOUNT_LOCKED' : 'INVALID_PIN',
          details: {
            lockout: updatedLockout,
            remainingAttempts: Math.max(
              0,
              updatedLockout.maxAttempts - updatedLockout.failedAttempts,
            ),
          },
        };
      }

      // Create authenticated session
      clearAuthenticationFailures();
      createSession(verifiedStaff.id, verifiedStaff.role, {
        firstName: verifiedStaff.first_name,
        lastName: verifiedStaff.last_name,
      });
      isLocked = false;
      resetInactivityTimer();
      logAuthentication(
        'LOGIN_SUCCESS',
        verifiedStaff.id,
        `${verifiedStaff.first_name} ${verifiedStaff.last_name}`.trim(),
      );

      log.info(
        `[Auth] Staff ${verifiedStaff.id} (${verifiedStaff.role}) logged in successfully`,
      );

      return {
        success: true,
        data: {
          staffId: verifiedStaff.id,
          role: verifiedStaff.role,
          firstName: verifiedStaff.first_name,
          lastName: verifiedStaff.last_name,
        },
      };
    } catch (error) {
      log.error('[Auth] Login failed:', error);
      return { success: false, error: 'Login failed' };
    }
  },
);

// Logout handler - clears session
ipcMain.handle('auth:logout', async () => {
  try {
    const session = getCurrentSession();
    if (session) {
      log.info(`[Auth] Staff ${session.staffId} logged out`);
      logAuthentication(
        'LOGOUT',
        session.staffId,
        `${session.firstName || ''} ${session.lastName || ''}`.trim() || null,
        {
          sessionDuration: Date.now() - session.loginTime.getTime(),
        },
      );
    }
    clearSession();
    isLocked = true;
    return { success: true };
  } catch (error) {
    log.error('[Auth] Logout failed:', error);
    return { success: false, error: 'Logout failed' };
  }
});

// Check authentication status
ipcMain.handle('auth:check', async () => {
  try {
    return {
      success: true,
      data: getSessionStatus(isLocked),
    };
  } catch (error) {
    log.error('[Auth] Check failed:', error);
    return { success: false, error: 'Failed to check authentication' };
  }
});

// Touch session to prevent timeout
ipcMain.handle('auth:touch', async () => {
  try {
    if (isAuthenticated()) {
      touchSession();
      resetInactivityTimer();
    }
    return { success: true };
  } catch (error) {
    log.error('[Auth] Touch session failed:', error);
    return { success: false, error: 'Failed to update session' };
  }
});

// Set session timeout
ipcMain.handle('auth:setTimeout', async (_event, timeoutMs: number) => {
  try {
    setSessionTimeout(timeoutMs);
    log.info(`[Auth] Session timeout set to ${timeoutMs}ms`);
    return { success: true };
  } catch (error) {
    log.error('[Auth] Set timeout failed:', error);
    return { success: false, error: 'Failed to set timeout' };
  }
});

// ============================================================================
// Security Handlers
// ============================================================================

ipcMain.handle('security:setPin', async (_event, pin: string) => {
  try {
    const hashedPin = await hashPin(pin);
    setSetting('pinHash', hashedPin);
    setSetting('pinEnabled', true);
    return { success: true };
  } catch (error) {
    log.error('Failed to set PIN:', error);
    return { success: false, error: 'Failed to set PIN' };
  }
});

ipcMain.handle('security:verifyPin', async (_event, pin: string) => {
  try {
    const storedHash = getSetting('pinHash') as string | null;

    if (!storedHash) {
      return { success: false, error: 'No PIN set' };
    }

    const isValid = await verifyPin(pin, storedHash);
    return { success: isValid };
  } catch (error) {
    log.error('Failed to verify PIN:', error);
    return { success: false, error: 'Verification failed' };
  }
});

ipcMain.handle(
  'security:changePin',
  async (_event, oldPin: string, newPin: string) => {
    try {
      const storedHash = getSetting('pinHash') as string | null;

      if (storedHash) {
        const isValid = await verifyPin(oldPin, storedHash);
        if (!isValid) {
          return { success: false, error: 'Current PIN is incorrect' };
        }
      }

      const newHash = await hashPin(newPin);
      setSetting('pinHash', newHash);
      return { success: true };
    } catch (error) {
      log.error('Failed to change PIN:', error);
      return { success: false, error: 'Failed to change PIN' };
    }
  },
);

// ============================================================================
// Backup IPC handlers
// ============================================================================

ipcMain.handle('backup:run', async () => {
  try {
    const result = await runManualBackup();
    return { success: true, path: result };
  } catch (error) {
    log.error('Manual backup failed:', error);
    return { success: false, error: (error as Error).message };
  }
});

// ============================================================================
// Window control IPC handlers
// ============================================================================

ipcMain.handle('window:print', () => {
  if (mainWindow) {
    mainWindow.webContents.print({
      silent: false,
      printBackground: true,
    });
  }
});

ipcMain.handle('window:getPrinters', async () => {
  if (mainWindow) {
    return mainWindow.webContents.getPrintersAsync();
  }
  return [];
});

// ============================================================================
// App event handlers
// ============================================================================

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    initDatabase();
    runSchema();
    initializeDatabase();

    const status = getDatabaseStatus();
    console.log('[App] Database status:', JSON.stringify(status, null, 2));

    initializeDefaultSettings();
    registerIpcHandlers();
    startBackupScheduler();
    createWindow();

    app.on('activate', () => {
      if (mainWindow === null) createWindow();
    });
  })
  .catch((error) => {
    log.error('[Main] whenReady FAILED:', error?.message || error, error?.stack?.slice(0, 800));
    dialog.showErrorBox(
      'Initialization Error',
      `Failed to start Hyacinth:\n\n${error?.message || error}`,
    );
  });

// Cleanup on quit
app.on('will-quit', () => {
  closeDatabase();
  clearSession();
});
