/**
 * Hyacinth Medication Dispensing System - Main Process
 * 
 * This module executes inside of electron's main process.
 * Handles database initialization, migrations, backup scheduling,
 * expiration scanning, and window management.
 */

import path from 'path';
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

// Import database modules
import { initDatabase, runSchema, closeDatabase } from './database/db';
import { initializeDatabase, getDatabaseStatus } from './database';
import { registerIpcHandlers } from './ipc-handlers';

// Import services
import { checkForExpiredItems } from './services/alertService';
import { startBackupScheduler, runManualBackup } from './backup/scheduler';
import { initializeDefaultSettings, getSetting, setSetting } from './settings/settings';
import { setMainWindow as setPrintMainWindow } from './services/printService';

// Import security utilities
import { hashPin, verifyPin } from './security/pin';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

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
        mainWindow.webContents.send('app:lock');
        log.info('Application auto-locked due to inactivity');
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

  mainWindow = new BrowserWindow({
    show: false,
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    icon: getAssetPath('icon.png'),
    title: 'Hyacinth v2.1 - Medication Dispensing System',
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
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
  });

  // Track user activity for auto-lock
  mainWindow.webContents.on('before-input-event', () => {
    resetInactivityTimer();
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

// IPC handlers for app lock
ipcMain.handle('app:unlock', async (_event, pin: string) => {
  try {
    const storedHash = getSetting('pinHash') as string | null;
    
    if (!storedHash) {
      // No PIN set, just unlock
      isLocked = false;
      resetInactivityTimer();
      return { success: true };
    }
    
    const isValid = await verifyPin(pin, storedHash);
    
    if (isValid) {
      isLocked = false;
      resetInactivityTimer();
      return { success: true };
    }
    
    return { success: false, error: 'Invalid PIN' };
  } catch (error) {
    log.error('Failed to verify PIN:', error);
    return { success: false, error: 'Verification failed' };
  }
});

ipcMain.handle('app:isLocked', () => {
  return isLocked;
});

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

ipcMain.handle('security:changePin', async (_event, oldPin: string, newPin: string) => {
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
});

// Backup IPC handlers
ipcMain.handle('backup:run', async () => {
  try {
    const result = await runManualBackup();
    return { success: true, path: result };
  } catch (error) {
    log.error('Manual backup failed:', error);
    return { success: false, error: (error as Error).message };
  }
});

// Window control IPC handlers
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

// App event handlers
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

app.whenReady()
  .then(() => {
    // Initialize database (includes schema, migrations, and seed data)
    initDatabase();
    runSchema();
    initializeDatabase();

    // Log database status
    const status = getDatabaseStatus();
    console.log('[App] Database status:', JSON.stringify(status, null, 2));

    // Initialize default settings
    initializeDefaultSettings();
    
    // Register all IPC handlers
    registerIpcHandlers();
    
    // Start backup scheduler
    startBackupScheduler();
    
    // Create main window
    createWindow();
    
    app.on('activate', () => {
      if (mainWindow === null) createWindow();
    });
  })
  .catch((error) => {
    console.error('Failed to initialize app:', error);
    dialog.showErrorBox(
      'Initialization Error',
      'Failed to start Hyacinth. Please check the logs.'
    );
  });

// Cleanup on quit
app.on('will-quit', () => {
  closeDatabase();
});
