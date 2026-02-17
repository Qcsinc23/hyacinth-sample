/**
 * Database Module Index
 */

// Core database functions (with encryption support)
export { 
  initDatabase, 
  getDatabase, 
  closeDatabase, 
  runSchema, 
  withTransaction, 
  checkDatabaseHealth,
  initEncryption,
  isEncryptionReady,
  isEncryptionConfigured,
  setupEncryption,
  unlockEncryption,
  lockEncryption,
} from './db';

// Migrations and seeds
export { runMigrations, getMigrationStatus, needsMigration, getCurrentVersion } from './migrations';
export { runSeedData, hasSeedData } from './seed';
export {
  initializeDatabase,
  loadMedicationCatalogSeed,
  loadInventorySeed,
  isMedicationCatalogSeeded,
  isInventorySeeded,
  reseedMedicationCatalog,
  getDatabaseStatus,
  resetDatabase,
} from './loader';

// Encryption hooks for automatic field encryption/decryption
export {
  // Encryption/decryption helpers
  encryptPatientForDb,
  decryptPatientFromDb,
  decryptPatientsFromDb,
  encryptStaffForDb,
  decryptStaffFromDb,
  decryptStaffMembersFromDb,
  // Wrapped CRUD operations
  insertPatientEncrypted,
  insertStaffEncrypted,
  getPatientByIdDecrypted,
  getPatientByChartNumberDecrypted,
  getStaffByIdDecrypted,
  getActivePatientsDecrypted,
  getAllStaffDecrypted,
  searchPatientsDecrypted,
  updatePatientEncrypted,
  updateStaffEncrypted,
  // Types
  type PatientInput,
  type StaffInput,
  type PatientUpdateInput,
  type StaffUpdateInput,
  // Constants
  ENCRYPTED_FIELDS,
} from './encryptionHooks';

// Query modules (existing)
export * from './queries';