/**
 * Database Connection Module
 * Initializes better-sqlite3 with healthcare-grade settings and field-level encryption
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import log from 'electron-log';

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

    // Check if encryption is already configured
    if (!isEncryptionConfigured()) {
      log.info('[Database] Encryption not configured - setting up...');
      
      // In development, auto-setup with a default password
      // In production, this should prompt the user
      const defaultPassword = process.env.HYACINTH_MASTER_PASSWORD || 'hyacinth-dev-password';
      
      const { recoveryKey } = setupEncryption(defaultPassword);
      log.info('[Database] Encryption setup complete');
      log.info('[Database] IMPORTANT - Recovery key:', recoveryKey);
      
      // In production, you should save this recovery key securely
      if (process.env.NODE_ENV === 'development') {
        const recoveryPath = path.join(app.getPath('userData'), 'recovery.key');
        fs.writeFileSync(recoveryPath, recoveryKey, { mode: 0o600 });
        log.info('[Database] Recovery key saved to:', recoveryPath);
      }
    } else {
      log.info('[Database] Encryption is already configured');
    }

    // Unlock encryption with the master password
    const masterPassword = process.env.HYACINTH_MASTER_PASSWORD || 'hyacinth-dev-password';
    const unlocked = unlockEncryption(masterPassword);
    
    if (!unlocked) {
      log.error('[Database] Failed to unlock encryption - invalid master password?');
      throw new Error('Failed to unlock database encryption');
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
  log.info(`[Database] Foreign keys: ${db.pragma('foreign_keys', { simple: true })}`);
  log.info(`[Database] Journal mode: ${db.pragma('journal_mode', { simple: true })}`);
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
 * Run the schema SQL file
 */
export function runSchema(): void {
  const database = getDatabase();
  // Calculate schema path - when running in dev, __dirname is .erb/dll
  // We need to go up to project root and then into src/main/database
  const schemaPath = path.resolve(__dirname, '..', '..', 'src', 'main', 'database', 'schema.sql');

  if (!fs.existsSync(schemaPath)) {
    log.error('[Database] Schema file not found at:', schemaPath);
    return;
  }

  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Remove comments and split by semicolons
  const cleaned = schema
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  const statements = cleaned
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      database.exec(statement + ';');
    } catch (err) {
      const errorMessage = (err as Error).message || '';
      // Ignore "already exists" errors (expected for idempotent schema application)
      if (errorMessage.includes('already exists')) {
        continue;
      }
      // Log and throw for unexpected errors
      log.error(`[Database] Schema statement error: ${errorMessage}`, { statement });
      throw new Error(`Failed to apply schema: ${errorMessage}`);
    }
  }

  log.info('[Database] Schema applied successfully');
}

/**
 * Calculate SHA-256 checksum for audit log
 */
export function calculateChecksum(data: string, previousChecksum?: string): string {
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
  const row = database.prepare(
    'SELECT checksum FROM audit_log ORDER BY id DESC LIMIT 1'
  ).get() as { checksum: string } | undefined;
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
    const fkCheck = database.prepare(
      'PRAGMA foreign_key_check'
    ).all() as Array<{ table: string; rowid: number; parent: string; fkid: number }>;

    if (fkCheck.length > 0) {
      issues.push(`Foreign key violations: ${fkCheck.length}`);
    }

    // Check encryption status
    if (!isEncryptionReady()) {
      issues.push('Encryption not initialized');
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  } catch (error) {
    return {
      healthy: false,
      issues: [`Database error: ${(error as Error).message}`]
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
