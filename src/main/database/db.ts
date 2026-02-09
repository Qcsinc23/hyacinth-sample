/**
 * Database Connection Module
 * Initializes better-sqlite3 with healthcare-grade settings
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

let db: Database.Database | null = null;

/**
 * Get the database file path
 */
export function getDbPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'hyacinth.db');
}

/**
 * Initialize the database connection
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

  // Open database with recommended settings for healthcare data
  db = new Database(dbPath, {
    verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
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

  console.log(`[Database] Connected to ${dbPath}`);
  console.log(`[Database] Foreign keys: ${db.pragma('foreign_keys', { simple: true })}`);
  console.log(`[Database] Journal mode: ${db.pragma('journal_mode', { simple: true })}`);

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
    db.close();
    db = null;
    console.log('[Database] Connection closed');
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
    console.log('[Database] Schema file not found at:', schemaPath);
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
      // Ignore "already exists" errors
      if (!((err as Error).message || '').includes('already exists')) {
        console.log(`[Database] Schema statement error: ${(err as Error).message}`);
      }
    }
  }

  console.log('[Database] Schema applied successfully');
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
