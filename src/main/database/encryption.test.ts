/**
 * Database Encryption Test
 * 
 * Tests to verify that:
 * 1. Database initializes with encryption activated
 * 2. Sensitive fields are encrypted on write
 * 3. Sensitive fields are decrypted on read
 * 4. Database operations work correctly after encryption
 */

import Database from 'better-sqlite3';
import {
  initDatabase,
  getDatabase,
  closeDatabase,
  initEncryption,
  isEncryptionReady,
  isEncryptionConfigured,
} from './db';

import {
  encryptPatientForDb,
  decryptPatientFromDb,
  encryptStaffForDb,
  decryptStaffFromDb,
  insertPatientEncrypted,
  getPatientByIdDecrypted,
  getActivePatientsDecrypted,
  updatePatientEncrypted,
  ENCRYPTED_FIELDS,
} from './encryptionHooks';

// Mock app.getPath for testing outside Electron
const mockUserData = '/tmp/hyacinth-test';
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => mockUserData),
  },
}));

describe('Database Encryption', () => {
  beforeAll(() => {
    // Clean up any existing test database
    const fs = require('fs');
    const path = require('path');
    const testDbPath = path.join(mockUserData, 'hyacinth.db');
    const testKeyPath = path.join(mockUserData, 'encryption');
    
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(testKeyPath)) {
      fs.rmSync(testKeyPath, { recursive: true });
    }
  });

  afterAll(() => {
    closeDatabase();
    
    // Clean up test files
    const fs = require('fs');
    const path = require('path');
    const testDbPath = path.join(mockUserData, 'hyacinth.db');
    const testKeyPath = path.join(mockUserData, 'encryption');
    const recoveryPath = path.join(mockUserData, 'recovery.key');
    
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(testKeyPath)) {
      fs.rmSync(testKeyPath, { recursive: true });
    }
    if (fs.existsSync(recoveryPath)) {
      fs.unlinkSync(recoveryPath);
    }
  });

  test('encryption module should be configured', () => {
    expect(ENCRYPTED_FIELDS).toBeDefined();
    expect(ENCRYPTED_FIELDS.patients).toContain('first_name');
    expect(ENCRYPTED_FIELDS.patients).toContain('last_name');
    expect(ENCRYPTED_FIELDS.patients).toContain('dob');
    expect(ENCRYPTED_FIELDS.patients).toContain('phone');
    expect(ENCRYPTED_FIELDS.patients).toContain('email');
    expect(ENCRYPTED_FIELDS.patients).toContain('address');
    expect(ENCRYPTED_FIELDS.patients).toContain('notes');
  });

  test('encryption should initialize successfully', () => {
    const result = initEncryption();
    expect(result).toBe(true);
    expect(isEncryptionReady()).toBe(true);
  });

  test('database should initialize with encryption', () => {
    const database = initDatabase();
    expect(database).toBeDefined();
    expect(isEncryptionReady()).toBe(true);
  });

  test('patient data should be encrypted', () => {
    const patientData = {
      first_name: 'John',
      last_name: 'Doe',
      dob: '1985-03-15',
      phone: '555-1234',
      email: 'john@example.com',
    };

    const encrypted = encryptPatientForDb(patientData);
    
    // Verify fields are encrypted (they should contain colons from the encryption format)
    expect(encrypted.first_name).toContain(':');
    expect(encrypted.last_name).toContain(':');
    expect(encrypted.dob).toContain(':');
    expect(encrypted.phone).toContain(':');
    expect(encrypted.email).toContain(':');
    
    // Verify original values are NOT present in encrypted form
    expect(encrypted.first_name).not.toBe('John');
    expect(encrypted.last_name).not.toBe('Doe');
  });

  test('patient data should be decrypted correctly', () => {
    const patientData = {
      first_name: 'Jane',
      last_name: 'Smith',
      dob: '1990-07-22',
      phone: '555-5678',
      email: 'jane@example.com',
    };

    const encrypted = encryptPatientForDb(patientData);
    const decrypted = decryptPatientFromDb(encrypted);

    expect(decrypted).toEqual(patientData);
  });

  test('staff data should be encrypted and decrypted', () => {
    const staffData = {
      first_name: 'Dr. Sarah',
      last_name: 'Johnson',
    };

    const encrypted = encryptStaffForDb(staffData);
    expect(encrypted.first_name).toContain(':');
    expect(encrypted.last_name).toContain(':');

    const decrypted = decryptStaffFromDb(encrypted);
    expect(decrypted).toEqual(staffData);
  });

  test('null values should remain null after encryption', () => {
    const patientData = {
      first_name: 'Test',
      last_name: 'User',
      phone: null,
      email: null,
    };

    const encrypted = encryptPatientForDb(patientData);
    expect(encrypted.phone).toBeNull();
    expect(encrypted.email).toBeNull();

    const decrypted = decryptPatientFromDb(encrypted);
    expect(decrypted?.phone).toBeNull();
    expect(decrypted?.email).toBeNull();
  });

  test('database operations work with encrypted fields', () => {
    const db = getDatabase();
    
    // Create patients table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chart_number TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        dob TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        notes TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Insert patient with encryption
    const patient = insertPatientEncrypted(db, {
      chart_number: 'P001',
      first_name: 'Alice',
      last_name: 'Wonderland',
      dob: '1988-12-25',
      phone: '555-9999',
      email: 'alice@example.com',
    }, new Date().toISOString());

    expect(patient.id).toBeDefined();
    expect(patient.first_name).toBe('Alice');
    expect(patient.last_name).toBe('Wonderland');

    // Retrieve patient with decryption
    const retrieved = getPatientByIdDecrypted(db, patient.id as number);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.first_name).toBe('Alice');
    expect(retrieved?.last_name).toBe('Wonderland');
    expect(retrieved?.dob).toBe('1988-12-25');
  });

  test('update operation works with encryption', () => {
    const db = getDatabase();
    
    // Insert a patient first
    const patient = insertPatientEncrypted(db, {
      chart_number: 'P002',
      first_name: 'Bob',
      last_name: 'Builder',
      dob: '1975-05-10',
    }, new Date().toISOString());

    const patientId = patient.id as number;

    // Update with encryption
    updatePatientEncrypted(db, {
      id: patientId,
      first_name: 'Robert',
      phone: '555-0000',
    });

    // Verify update
    const updated = getPatientByIdDecrypted(db, patientId);
    expect(updated?.first_name).toBe('Robert');
    expect(updated?.last_name).toBe('Builder'); // Unchanged
    expect(updated?.phone).toBe('555-0000');
  });

  test('list operations return decrypted data', () => {
    const db = getDatabase();
    
    // Get all active patients
    const patients = getActivePatientsDecrypted(db);
    
    expect(patients.length).toBeGreaterThanOrEqual(2);
    
    // Verify all are decrypted
    patients.forEach(p => {
      expect(p.first_name).not.toContain(':');
      expect(p.last_name).not.toContain(':');
    });
  });

  test('database health check includes encryption status', () => {
    const { checkDatabaseHealth } = require('./db');
    const health = checkDatabaseHealth();
    
    expect(health.healthy).toBe(true);
    expect(health.issues).not.toContain('Encryption not initialized');
  });
});

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('\n=== Database Encryption Tests ===\n');
  console.log('Encryption fields configured:', ENCRYPTED_FIELDS);
  console.log('\nAll tests defined. Run with Jest for full test execution.\n');
}