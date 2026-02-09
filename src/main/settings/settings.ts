/**
 * Settings Management
 * 
 * Manages application settings with type safety.
 */

import log from 'electron-log';
import { getDatabase } from '../database/db';
import { DEFAULT_SETTINGS, type Settings } from './defaults';

/**
 * Get a setting value
 */
export function getSetting<K extends keyof Settings>(key: K): Settings[K] | null {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT value FROM app_settings WHERE key = ?');
    const result = stmt.get(key) as { value: string } | undefined;
    
    if (!result) {
      // Return default value if exists
      return DEFAULT_SETTINGS[key] ?? null;
    }
    
    // Parse value based on default type
    const defaultValue = DEFAULT_SETTINGS[key];

    if (defaultValue === null) {
      return null as Settings[K];
    } else if (typeof defaultValue === 'boolean') {
      return (result.value === 'true') as Settings[K];
    } else if (typeof defaultValue === 'number') {
      return parseFloat(result.value) as Settings[K];
    } else if (Array.isArray(defaultValue) || typeof defaultValue === 'object') {
      try {
        return JSON.parse(result.value) as Settings[K];
      } catch {
        return defaultValue;
      }
    }

    return result.value as Settings[K];
  } catch (error) {
    log.error(`Failed to get setting ${key}:`, error);
    return DEFAULT_SETTINGS[key] ?? null;
  }
}

/**
 * Set a setting value
 */
export function setSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K]
): boolean {
  try {
    const db = getDatabase();
    
    // Convert value to string for storage
    let stringValue: string;

    if (value === null) {
      stringValue = 'null';
    } else if (typeof value === 'boolean') {
      stringValue = value.toString();
    } else if (typeof value === 'number') {
      stringValue = value.toString();
    } else if (Array.isArray(value) || typeof value === 'object') {
      stringValue = JSON.stringify(value);
    } else {
      stringValue = value as string;
    }
    
    const stmt = db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `);
    
    stmt.run(key, stringValue, new Date().toISOString());
    
    return true;
  } catch (error) {
    log.error(`Failed to set setting ${key}:`, error);
    return false;
  }
}

/**
 * Get all settings
 */
export const getAllSettings = (): Partial<Settings> => {
  const settings: Partial<Settings> = {};
  
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT key, value FROM app_settings');
    const rows = stmt.all() as Array<{ key: keyof Settings; value: string }>;
    
    for (const row of rows) {
      const defaultValue = DEFAULT_SETTINGS[row.key];

      if (defaultValue === null) {
        (settings as Record<string, unknown>)[row.key] = null;
      } else if (typeof defaultValue === 'boolean') {
        (settings as Record<string, unknown>)[row.key] = row.value === 'true';
      } else if (typeof defaultValue === 'number') {
        (settings as Record<string, unknown>)[row.key] = parseFloat(row.value);
      } else if (Array.isArray(defaultValue) || typeof defaultValue === 'object') {
        try {
          (settings as Record<string, unknown>)[row.key] = JSON.parse(row.value);
        } catch {
          (settings as Record<string, unknown>)[row.key] = defaultValue;
        }
      } else {
        (settings as Record<string, unknown>)[row.key] = row.value;
      }
    }
    
    // Merge with defaults
    return { ...DEFAULT_SETTINGS, ...settings };
  } catch (error) {
    log.error('Failed to get all settings:', error);
    return DEFAULT_SETTINGS;
  }
};

/**
 * Reset all settings to defaults
 */
export const resetAllSettings = (): boolean => {
  try {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM app_settings');
    stmt.run();
    
    log.info('All settings reset to defaults');
    return true;
  } catch (error) {
    log.error('Failed to reset settings:', error);
    return false;
  }
};

/**
 * Reset a specific setting to default
 */
export function resetSetting<K extends keyof Settings>(key: K): boolean {
  try {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM app_settings WHERE key = ?');
    stmt.run(key);
    
    log.info(`Setting ${key} reset to default`);
    return true;
  } catch (error) {
    log.error(`Failed to reset setting ${key}:`, error);
    return false;
  }
}

/**
 * Initialize default settings
 */
export const initializeDefaultSettings = (): void => {
  try {
    const db = getDatabase();

    if (!db) {
      log.error('Database not available for settings initialization');
      return;
    }

    // The app_settings table is created by schema.sql, no need to create it here
    // Just insert defaults that don't exist
    const now = new Date().toISOString();

    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      try {
        let stringValue: string;

        if (value === null || value === undefined) {
          stringValue = 'null';
        } else if (typeof value === 'boolean') {
          stringValue = value.toString();
        } else if (typeof value === 'number') {
          stringValue = value.toString();
        } else if (typeof value === 'object') {
          stringValue = JSON.stringify(value);
        } else {
          stringValue = String(value);
        }

        const stmt = db.prepare(`
          INSERT OR IGNORE INTO app_settings (key, value, updated_at)
          VALUES (?, ?, ?)
        `);

        stmt.run(key, stringValue, now);
      } catch (itemError) {
        log.error(`Failed to initialize setting ${key}:`, itemError);
      }
    }

    log.info('Default settings initialized');
  } catch (error) {
    log.error('Failed to initialize default settings:', error);
  }
};

/**
 * Export settings to JSON
 */
export const exportSettings = (): string => {
  const settings = getAllSettings();
  return JSON.stringify(settings, null, 2);
};

/**
 * Import settings from JSON
 */
export const importSettings = (json: string): boolean => {
  try {
    const settings = JSON.parse(json) as Partial<Settings>;
    
    for (const [key, value] of Object.entries(settings)) {
      if (key in DEFAULT_SETTINGS) {
        setSetting(key as keyof Settings, value as Settings[keyof Settings]);
      }
    }
    
    log.info('Settings imported successfully');
    return true;
  } catch (error) {
    log.error('Failed to import settings:', error);
    return false;
  }
};
