/**
 * Database Connection Module
 * Initializes better-sqlite3 with healthcare-grade settings and field-level encryption
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import log from 'electron-log';

/** Default password when no env var or file is configured */
const DEFAULT_DESKTOP_PASSWORD = 'hyacinth-desktop-default';

/** Path to optional password file (plain text, for desktop use only) */
function getPasswordFilePath(): string {
  return path.join(app.getPath('userData'), 'encryption', '.master_password');
}

/** Resolve master password: env var, then file, then default */
function resolveMasterPassword(): string {
  if (process.env.HYACINTH_MASTER_PASSWORD) {
    return process.env.HYACINTH_MASTER_PASSWORD;
  }
  const filePath = getPasswordFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const contents = fs.readFileSync(filePath, 'utf8').trim();
      if (contents) return contents;
    } catch (e) {
      log.warn('[Database] Could not read password file:', e);
    }
  }
  return DEFAULT_DESKTOP_PASSWORD;
}

import * as crypto from 'crypto';

// Import encryption functions from security module
import {
  initializeEncryption,
  isEncryptionConfigured,
  setupEncryption,
  unlockEncryption,
  lockEncryption,
} from '../security/databaseEncryption';

let db: Database.Database | null = null;
let isEncryptionInitialized = false;

/**
 * Get the database file path
 */
export function getDbPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'hyacinth.db');
}

/**
 * Initialize encryption system
 * - Checks if encryption is configured
 * - Sets up encryption if not (with default password in dev mode)
 * - Unlocks encryption for use
 */
export function initEncryption(): boolean {
  if (isEncryptionInitialized) {
    return true;
  }

  try {
    // Initialize the encryption storage
    initializeEncryption();

    const masterPassword = resolveMasterPassword();

    // Check if encryption is already configured
    if (!isEncryptionConfigured()) {
      log.info('[Database] Encryption not configured - setting up...');
      setupEncryption(masterPassword);
      log.info('[Database] Encryption setup complete');
    } else {
      log.info('[Database] Encryption is already configured');
    }

    // Unlock encryption with the master password
    const unlocked = unlockEncryption(masterPassword);

    if (!unlocked) {
      log.error(
        '[Database] Failed to unlock encryption - invalid master password?',
      );
      throw new Error(
        'Failed to unlock database encryption. Set HYACINTH_MASTER_PASSWORD, or create ' +
          getPasswordFilePath() +
          ' with your password. See logs for details.',
      );
    }

    isEncryptionInitialized = true;
    log.info('[Database] Encryption initialized and unlocked successfully');
    return true;
  } catch (error) {
    log.error('[Database] Encryption initialization failed:', error);
    throw error;
  }
}

/**
 * Check if encryption is initialized
 */
export function isEncryptionReady(): boolean {
  return isEncryptionInitialized;
}

/**
 * Initialize the database connection with encryption
 */
export function initDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const dbPath = getDbPath();
  const dbDir = path.dirname(dbPath);

  // Ensure directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Initialize encryption BEFORE opening database
  // This ensures the encryption key is ready for any data operations
  initEncryption();

  // Open database with recommended settings for healthcare data
  db = new Database(dbPath, {
    verbose: process.env.NODE_ENV === 'development' ? log.debug : undefined,
    fileMustExist: false,
  });

  // Enable foreign key constraints - CRITICAL for data integrity
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = FULL'); // Maximum durability
  db.pragma('temp_store = MEMORY');
  db.pragma('mmap_size = 30000000000');
  db.pragma('page_size = 4096');

  // Run integrity check
  const integrityCheck = db.pragma('integrity_check', { simple: true });
  if (integrityCheck !== 'ok') {
    throw new Error(`Database integrity check failed: ${integrityCheck}`);
  }

  log.info(`[Database] Connected to ${dbPath}`);
  log.info(`[Database] Database file (persists across relaunches): ${dbPath}`);
  log.info(
    `[Database] Foreign keys: ${db.pragma('foreign_keys', { simple: true })}`,
  );
  log.info(
    `[Database] Journal mode: ${db.pragma('journal_mode', { simple: true })}`,
  );
  log.info(`[Database] Encryption: ACTIVE`);

  return db;
}

/**
 * Get the database instance (throws if not initialized)
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    // Lock encryption before closing
    lockEncryption();
    isEncryptionInitialized = false;

    db.close();
    db = null;
    log.info('[Database] Connection closed and encryption locked');
  }
}

/**
 * Resolve schema.sql path for both development and packaged app
 */
function getSchemaPath(): string {
  // Packaged app: schema is in extraResources (resources/schema.sql)
  if (app.isPackaged && process.resourcesPath) {
    const packagedPath = path.join(process.resourcesPath, 'schema.sql');
    if (fs.existsSync(packagedPath)) {
      return packagedPath;
    }
  }
  // Development: __dirname is .erb/dll or release/app/dist/main
  const devPath = path.resolve(
    __dirname,
    '..',
    '..',
    'src',
    'main',
    'database',
    'schema.sql',
  );
  return devPath;
}

/**
 * Run the schema SQL file
 */
export function runSchema(): void {
  const database = getDatabase();
  const schemaPath = getSchemaPath();

  if (!fs.existsSync(schemaPath)) {
    log.error('[Database] Schema file not found at:', schemaPath);
    return;
  }

  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Remove comments and split by semicolons
  const cleaned = schema
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  const statements = cleaned
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    try {
      database.exec(`${statement};`);
    } catch (err) {
      const errorMessage = (err as Error).message || '';
      // Ignore "already exists" errors (expected for idempotent schema application)
      if (errorMessage.includes('already exists')) {
        continue;
      }
      // Log and throw for unexpected errors
      log.error(`[Database] Schema statement error: ${errorMessage}`, {
        statement,
      });
      throw new Error(`Failed to apply schema: ${errorMessage}`);
    }
  }

  log.info('[Database] Schema applied successfully');
}

/**
 * Calculate SHA-256 checksum for audit log
 */
export function calculateChecksum(
  data: string,
  previousChecksum?: string,
): string {
  const hash = crypto.createHash('sha256');
  hash.update(data);
  if (previousChecksum) {
    hash.update(previousChecksum);
  }
  return hash.digest('hex');
}

/**
 * Get the last checksum from audit log for chain verification
 */
export function getLastChecksum(): string | null {
  const database = getDatabase();
  const row = database
    .prepare('SELECT checksum FROM audit_log ORDER BY id DESC LIMIT 1')
    .get() as { checksum: string } | undefined;
  return row?.checksum || null;
}

/**
 * Execute within a transaction
 */
export function withTransaction<T>(fn: () => T): T {
  const database = getDatabase();
  return database.transaction(fn)();
}

/**
 * Check database health
 */
export function checkDatabaseHealth(): { healthy: boolean; issues: string[] } {
  const issues: string[] = [];

  try {
    const database = getDatabase();

    // Check integrity
    const integrityCheck = database.pragma('integrity_check', { simple: true });
    if (integrityCheck !== 'ok') {
      issues.push(`Integrity check failed: ${integrityCheck}`);
    }

    // Check foreign keys
    const fkCheck = database
      .prepare('PRAGMA foreign_key_check')
      .all() as Array<{
      table: string;
      rowid: number;
      parent: string;
      fkid: number;
    }>;

    if (fkCheck.length > 0) {
      issues.push(`Foreign key violations: ${fkCheck.length}`);
    }

    // Check encryption status
    if (!isEncryptionReady()) {
      issues.push('Encryption not initialized');
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  } catch (error) {
    return {
      healthy: false,
      issues: [`Database error: ${(error as Error).message}`],
    };
  }
}

// Re-export encryption functions for convenience
export {
  isEncryptionConfigured,
  setupEncryption,
  unlockEncryption,
  lockEncryption,
} from '../security/databaseEncryption';
