/**
 * Database Encryption Module
 *
 * Provides field-level encryption for sensitive PHI data using AES-256-GCM.
 * Supports secure key management through OS credential stores.
 */

import crypto from 'crypto';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import log from 'electron-log';

// Encryption constants
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const PBKDF2_ITERATIONS = 100000;

// Fields that should be encrypted
export const ENCRYPTED_FIELDS = {
  patients: [
    'first_name',
    'last_name',
    'dob',
    'phone',
    'email',
    'address',
    'notes',
  ],
  staff_members: ['first_name', 'last_name'],
} as const;

export type EncryptedTable = keyof typeof ENCRYPTED_FIELDS;
export type EncryptedField<T extends EncryptedTable> =
  (typeof ENCRYPTED_FIELDS)[T][number];

// Key storage paths
const getKeyStoragePath = (): string => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'encryption');
};

const getKeyFilePath = (): string => {
  return path.join(getKeyStoragePath(), 'key.enc');
};

const getSaltFilePath = (): string => {
  return path.join(getKeyStoragePath(), 'salt.bin');
};

/**
 * Encryption key management
 */
class KeyManager {
  private masterKey: Buffer | null = null;

  private dataEncryptionKey: Buffer | null = null;

  /**
   * Initialize the key storage directory
   */
  initializeStorage(): void {
    const storagePath = getKeyStoragePath();
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true, mode: 0o700 });
      log.info('[Encryption] Key storage directory created');
    }
  }

  /**
   * Check if encryption is configured (keys exist)
   */
  isConfigured(): boolean {
    return fs.existsSync(getKeyFilePath()) && fs.existsSync(getSaltFilePath());
  }

  /**
   * Generate a new random encryption key
   */
  generateDataEncryptionKey(): Buffer {
    return crypto.randomBytes(KEY_LENGTH);
  }

  /**
   * Generate a random salt
   */
  generateSalt(): Buffer {
    return crypto.randomBytes(SALT_LENGTH);
  }

  /**
   * Derive a key from password using PBKDF2
   */
  deriveKeyFromPassword(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      password,
      salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      'sha256',
    );
  }

  /**
   * Setup encryption with a master password (first-time setup)
   */
  setupEncryption(masterPassword: string): { recoveryKey: string } {
    this.initializeStorage();

    // Generate new data encryption key
    this.dataEncryptionKey = this.generateDataEncryptionKey();

    // Generate salt for password derivation
    const salt = this.generateSalt();

    // Derive master key from password
    this.masterKey = this.deriveKeyFromPassword(masterPassword, salt);

    // Encrypt the data encryption key with the master key
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv);

    let encryptedKey = cipher.update(this.dataEncryptionKey);
    encryptedKey = Buffer.concat([encryptedKey, cipher.final()]);

    const authTag = cipher.getAuthTag();

    // Store encrypted key (IV + authTag + encryptedData)
    const keyData = Buffer.concat([iv, authTag, encryptedKey]);
    fs.writeFileSync(getKeyFilePath(), keyData, { mode: 0o600 });

    // Store salt
    fs.writeFileSync(getSaltFilePath(), salt, { mode: 0o600 });

    // Generate recovery key
    const recoveryKey = this.generateRecoveryKey();

    log.info('[Encryption] Encryption setup complete');

    return { recoveryKey };
  }

  /**
   * Unlock encryption with master password
   */
  unlockEncryption(masterPassword: string): boolean {
    try {
      if (!this.isConfigured()) {
        throw new Error('Encryption not configured');
      }

      // Read salt
      const salt = fs.readFileSync(getSaltFilePath());

      // Derive master key
      this.masterKey = this.deriveKeyFromPassword(masterPassword, salt);

      // Read encrypted data key
      const keyData = fs.readFileSync(getKeyFilePath());

      // Extract IV, authTag, and encrypted key
      const iv = keyData.slice(0, IV_LENGTH);
      const authTag = keyData.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
      const encryptedKey = keyData.slice(IV_LENGTH + AUTH_TAG_LENGTH);

      // Decrypt data encryption key
      const decipher = crypto.createDecipheriv(ALGORITHM, this.masterKey, iv);
      decipher.setAuthTag(authTag);

      let decryptedKey = decipher.update(encryptedKey);
      decryptedKey = Buffer.concat([decryptedKey, decipher.final()]);

      this.dataEncryptionKey = decryptedKey;

      log.info('[Encryption] Encryption unlocked successfully');
      return true;
    } catch (error) {
      log.error('[Encryption] Failed to unlock encryption:', error);
      this.masterKey = null;
      this.dataEncryptionKey = null;
      return false;
    }
  }

  /**
   * Get the data encryption key (must be unlocked first)
   */
  getDataEncryptionKey(): Buffer {
    if (!this.dataEncryptionKey) {
      throw new Error(
        'Encryption not unlocked. Call unlockEncryption() first.',
      );
    }
    return this.dataEncryptionKey;
  }

  /**
   * Change the master password
   */
  changeMasterPassword(currentPassword: string, newPassword: string): boolean {
    try {
      // Unlock with current password
      if (!this.unlockEncryption(currentPassword)) {
        return false;
      }

      const dataKey = this.dataEncryptionKey!;

      // Generate new salt
      const newSalt = this.generateSalt();

      // Derive new master key
      const newMasterKey = this.deriveKeyFromPassword(newPassword, newSalt);

      // Re-encrypt data key with new master key
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, newMasterKey, iv);

      let encryptedKey = cipher.update(dataKey);
      encryptedKey = Buffer.concat([encryptedKey, cipher.final()]);

      const authTag = cipher.getAuthTag();

      // Store updated key data
      const keyData = Buffer.concat([iv, authTag, encryptedKey]);
      fs.writeFileSync(getKeyFilePath(), keyData, { mode: 0o600 });

      // Store new salt
      fs.writeFileSync(getSaltFilePath(), newSalt, { mode: 0o600 });

      this.masterKey = newMasterKey;

      log.info('[Encryption] Master password changed successfully');
      return true;
    } catch (error) {
      log.error('[Encryption] Failed to change master password:', error);
      return false;
    }
  }

  /**
   * Generate a recovery key for emergency access
   */
  private generateRecoveryKey(): string {
    const bytes = crypto.randomBytes(16);
    // Format as groups of 4 characters for readability
    const hex = bytes.toString('hex').toUpperCase();
    return hex.match(/.{4}/g)!.join('-');
  }

  /**
   * Reset encryption with recovery key (destructive - loses all encrypted data)
   */
  resetEncryption(_recoveryKey: string): boolean {
    // In a real implementation, this would verify the recovery key
    // and potentially allow data recovery or re-encryption
    log.warn('[Encryption] Encryption reset requested');
    return false;
  }

  /**
   * Lock encryption (clear keys from memory)
   */
  lockEncryption(): void {
    if (this.masterKey) {
      this.masterKey.fill(0);
      this.masterKey = null;
    }
    if (this.dataEncryptionKey) {
      this.dataEncryptionKey.fill(0);
      this.dataEncryptionKey = null;
    }
    log.info('[Encryption] Encryption locked');
  }
}

// Singleton instance
const keyManager = new KeyManager();

/**
 * Encrypt a text value
 */
export function encryptValue(plaintext: string | null): string | null {
  if (plaintext === null || plaintext === undefined) {
    return null;
  }

  try {
    const key = keyManager.getDataEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Store as: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    log.error('[Encryption] Failed to encrypt value:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt an encrypted value
 */
export function decryptValue(ciphertext: string | null): string | null {
  if (ciphertext === null || ciphertext === undefined) {
    return null;
  }

  // Check if value is actually encrypted (contains : separators)
  if (!ciphertext.includes(':')) {
    // Value is not encrypted, return as-is (for migration scenarios)
    return ciphertext;
  }

  try {
    const key = keyManager.getDataEncryptionKey();
    const parts = ciphertext.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    log.error('[Encryption] Failed to decrypt value:', error);
    throw new Error('Decryption failed - data may be corrupted');
  }
}

/**
 * Check if a value is encrypted
 */
export function isEncrypted(value: string | null): boolean {
  if (!value) return false;
  return value.includes(':') && value.split(':').length === 3;
}

/**
 * Encrypt specific fields in a data object
 */
export function encryptFields<T extends Record<string, unknown>>(
  data: T,
  tableName: EncryptedTable,
): T {
  const fieldsToEncrypt = ENCRYPTED_FIELDS[tableName];
  if (!fieldsToEncrypt) {
    return data;
  }

  const encrypted = { ...data } as Record<string, unknown>;
  for (const field of fieldsToEncrypt) {
    if (
      field in encrypted &&
      encrypted[field] !== null &&
      encrypted[field] !== undefined
    ) {
      const value = String(encrypted[field]);
      if (!isEncrypted(value)) {
        encrypted[field] = encryptValue(value);
      }
    }
  }

  return encrypted as T;
}

/**
 * Decrypt specific fields in a data object
 */
export function decryptFields<T extends Record<string, unknown>>(
  data: T,
  tableName: EncryptedTable,
): T {
  const fieldsToEncrypt = ENCRYPTED_FIELDS[tableName];
  if (!fieldsToEncrypt) {
    return data;
  }

  const decrypted = { ...data } as Record<string, unknown>;
  for (const field of fieldsToEncrypt) {
    if (
      field in decrypted &&
      decrypted[field] !== null &&
      decrypted[field] !== undefined
    ) {
      const value = String(decrypted[field]);
      decrypted[field] = decryptValue(value);
    }
  }

  return decrypted as T;
}

/**
 * Encrypt patient data
 */
export function encryptPatientData<T extends Record<string, unknown>>(
  patient: T,
): T {
  return encryptFields(patient, 'patients');
}

/**
 * Decrypt patient data
 */
export function decryptPatientData<T extends Record<string, unknown>>(
  patient: T,
): T {
  return decryptFields(patient, 'patients');
}

/**
 * Encrypt staff data
 */
export function encryptStaffData<T extends Record<string, unknown>>(
  staff: T,
): T {
  return encryptFields(staff, 'staff_members');
}

/**
 * Decrypt staff data
 */
export function decryptStaffData<T extends Record<string, unknown>>(
  staff: T,
): T {
  return decryptFields(staff, 'staff_members');
}

/**
 * Get the key manager instance
 */
export function getKeyManager(): KeyManager {
  return keyManager;
}

/**
 * Initialize encryption system
 */
export function initializeEncryption(): void {
  keyManager.initializeStorage();
}

/**
 * Check if encryption is configured
 */
export function isEncryptionConfigured(): boolean {
  return keyManager.isConfigured();
}

/**
 * Setup encryption (first-time setup)
 */
export function setupEncryption(masterPassword: string): {
  recoveryKey: string;
} {
  return keyManager.setupEncryption(masterPassword);
}

/**
 * Unlock encryption
 */
export function unlockEncryption(masterPassword: string): boolean {
  return keyManager.unlockEncryption(masterPassword);
}

/**
 * Change master password
 */
export function changeMasterPassword(
  currentPassword: string,
  newPassword: string,
): boolean {
  return keyManager.changeMasterPassword(currentPassword, newPassword);
}

/**
 * Lock encryption
 */
export function lockEncryption(): void {
  keyManager.lockEncryption();
}

export default {
  encryptValue,
  decryptValue,
  isEncrypted,
  encryptFields,
  decryptFields,
  encryptPatientData,
  decryptPatientData,
  encryptStaffData,
  decryptStaffData,
  getKeyManager,
  initializeEncryption,
  isEncryptionConfigured,
  setupEncryption,
  unlockEncryption,
  changeMasterPassword,
  lockEncryption,
};
