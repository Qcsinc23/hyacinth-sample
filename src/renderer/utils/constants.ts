/**
 * Constants for Hyacinth Medication Dispensing System
 * 
 * Contains medication lists, reasons for bridging, units,
 * and other application constants.
 */

/**
 * Available medications for bridging
 */
export const MEDICATIONS: string[] = [
  'Biktarvy (nPEP)',
  'Biktarvy (ID - Treatment Naive)',
  'Descovy (PrEP)',
  'Descovy (HIV Treatment)',
  'Symtuza',
  'Dovato',
  'Bactrim DS (PCP Prophylaxis)',
  'Bactrim DS (Toxoplasmosis Prophylaxis)',
  'Bactrim DS (UTI Treatment)',
  'Doxycycline (Doxy-PEP)',
  'Doxycycline (Chlamydia Treatment)',
  'Doxycycline (Syphilis Treatment)',
];

/**
 * Reasons for medication bridging
 */
export const REASONS: string[] = [
  'ADDP Application Pending',
  'ADDP Renewal',
  'Health Insurance Pending',
  'Health Insurance Renewal',
  'Undocumented/Uninsured',
  'Rapid Initiation PrEP',
  'Rapid Initiation ART',
  'nPEP Initiation',
  'STI/UTI Treatment',
  'PCP Prophylaxis',
  'Toxoplasmosis Prophylaxis',
];

/**
 * Dispensing units
 */
export const UNITS: string[] = [
  'tablets',
  'capsules',
  'bottles',
  'mL',
];

/**
 * Medication categories mapping
 */
export const MEDICATION_CATEGORIES: Record<string, string> = {
  'Biktarvy (nPEP)': 'ARV',
  'Biktarvy (ID - Treatment Naive)': 'ARV',
  'Descovy (PrEP)': 'PrEP',
  'Descovy (HIV Treatment)': 'ARV',
  'Symtuza': 'ARV',
  'Dovato': 'ARV',
  'Bactrim DS (PCP Prophylaxis)': 'Antibiotic',
  'Bactrim DS (Toxoplasmosis Prophylaxis)': 'Antibiotic',
  'Bactrim DS (UTI Treatment)': 'Antibiotic',
  'Doxycycline (Doxy-PEP)': 'Antibiotic',
  'Doxycycline (Chlamydia Treatment)': 'Antibiotic',
  'Doxycycline (Syphilis Treatment)': 'Antibiotic',
};

/**
 * Generic names mapping
 */
export const MEDICATION_GENERIC_NAMES: Record<string, string> = {
  'Biktarvy (nPEP)': 'Bictegravir/Emtricitabine/Tenofovir Alafenamide (BIC/FTC/TAF)',
  'Biktarvy (ID - Treatment Naive)': 'Bictegravir/Emtricitabine/Tenofovir Alafenamide (BIC/FTC/TAF)',
  'Descovy (PrEP)': 'Emtricitabine/Tenofovir Alafenamide (FTC/TAF)',
  'Descovy (HIV Treatment)': 'Emtricitabine/Tenofovir Alafenamide (FTC/TAF)',
  'Symtuza': 'Darunavir/Cobicistat/Emtricitabine/Tenofovir Alafenamide (DRV/COBI/FTC/TAF)',
  'Dovato': 'Dolutegravir/Lamivudine (DTG/3TC)',
  'Bactrim DS (PCP Prophylaxis)': 'Trimethoprim/Sulfamethoxazole (TMP/SMX)',
  'Bactrim DS (Toxoplasmosis Prophylaxis)': 'Trimethoprim/Sulfamethoxazole (TMP/SMX)',
  'Bactrim DS (UTI Treatment)': 'Trimethoprim/Sulfamethoxazole (TMP/SMX)',
  'Doxycycline (Doxy-PEP)': 'Doxycycline',
  'Doxycycline (Chlamydia Treatment)': 'Doxycycline',
  'Doxycycline (Syphilis Treatment)': 'Doxycycline',
};

/**
 * Medication strengths mapping
 */
export const MEDICATION_STRENGTHS: Record<string, string> = {
  'Biktarvy (nPEP)': '50mg/200mg/25mg',
  'Biktarvy (ID - Treatment Naive)': '50mg/200mg/25mg',
  'Descovy (PrEP)': '200mg/25mg',
  'Descovy (HIV Treatment)': '200mg/25mg',
  'Symtuza': '800mg/150mg/200mg/10mg',
  'Dovato': '50mg/300mg',
  'Bactrim DS (PCP Prophylaxis)': '160mg/800mg',
  'Bactrim DS (Toxoplasmosis Prophylaxis)': '160mg/800mg',
  'Bactrim DS (UTI Treatment)': '160mg/800mg',
  'Doxycycline (Doxy-PEP)': '100mg',
  'Doxycycline (Chlamydia Treatment)': '100mg',
  'Doxycycline (Syphilis Treatment)': '100mg',
};

/**
 * Default quantity limits per medication
 */
export const DEFAULT_QUANTITY_LIMITS: Record<string, number> = {
  'Biktarvy (nPEP)': 30, // 28-day supply + 2 extra
  'Biktarvy (ID - Treatment Naive)': 30,
  'Descovy (PrEP)': 30,
  'Descovy (HIV Treatment)': 30,
  'Symtuza': 30,
  'Dovato': 30,
  'Bactrim DS (PCP Prophylaxis)': 30,
  'Bactrim DS (Toxoplasmosis Prophylaxis)': 30,
  'Bactrim DS (UTI Treatment)': 14, // 7-day supply BID
  'Doxycycline (Doxy-PEP)': 4, // 2 doses
  'Doxycycline (Chlamydia Treatment)': 14, // 7-day supply BID
  'Doxycycline (Syphilis Treatment)': 28, // 14-day supply BID
};

/**
 * Default day supply per medication
 */
export const DEFAULT_DAY_SUPPLY: Record<string, number> = {
  'Biktarvy (nPEP)': 28,
  'Biktarvy (ID - Treatment Naive)': 30,
  'Descovy (PrEP)': 30,
  'Descovy (HIV Treatment)': 30,
  'Symtuza': 30,
  'Dovato': 30,
  'Bactrim DS (PCP Prophylaxis)': 30,
  'Bactrim DS (Toxoplasmosis Prophylaxis)': 30,
  'Bactrim DS (UTI Treatment)': 7,
  'Doxycycline (Doxy-PEP)': 2,
  'Doxycycline (Chlamydia Treatment)': 7,
  'Doxycycline (Syphilis Treatment)': 14,
};

/**
 * Low stock threshold per medication
 */
export const LOW_STOCK_THRESHOLD: Record<string, number> = {
  'Biktarvy (nPEP)': 30,
  'Biktarvy (ID - Treatment Naive)': 30,
  'Descovy (PrEP)': 30,
  'Descovy (HIV Treatment)': 30,
  'Symtuza': 30,
  'Dovato': 30,
  'Bactrim DS (PCP Prophylaxis)': 30,
  'Bactrim DS (Toxoplasmosis Prophylaxis)': 30,
  'Bactrim DS (UTI Treatment)': 20,
  'Doxycycline (Doxy-PEP)': 20,
  'Doxycycline (Chlamydia Treatment)': 20,
  'Doxycycline (Syphilis Treatment)': 20,
};

/**
 * Alert types
 */
export const ALERT_TYPES = {
  EXPIRING_SOON: 'expiring_soon',
  EXPIRED: 'expired',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
  SYSTEM: 'system',
} as const;

/**
 * App version
 */
export const APP_VERSION = '1.0.0';

/**
 * App name
 */
export const APP_NAME = 'Hyacinth';

/**
 * Clinic information
 */
export const CLINIC_INFO = {
  name: 'Hyacinth Health & Wellness Clinic',
  phone: '(862) 240-1461',
  address: '',
};

/**
 * Maximum characters for notes
 */
export const MAX_NOTES_LENGTH = 2000;

/**
 * Maximum characters for patient notes
 */
export const MAX_PATIENT_NOTES_LENGTH = 1000;

/**
 * Maximum days for draft recovery
 */
export const DRAFT_EXPIRY_DAYS = 7;

/**
 * Default backup retention days
 */
export const DEFAULT_BACKUP_RETENTION_DAYS = 30;

/**
 * Default backup interval (hours)
 */
export const DEFAULT_BACKUP_INTERVAL_HOURS = 24;

/**
 * Inactivity timeout for auto-lock (milliseconds)
 */
export const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Maximum login attempts before lockout
 */
export const MAX_LOGIN_ATTEMPTS = 5;

/**
 * Lockout duration (minutes)
 */
export const LOCKOUT_DURATION_MINUTES = 30;

/**
 * Expiration warning days
 */
export const EXPIRATION_WARNING_DAYS = 30;

/**
 * Search result limit
 */
export const SEARCH_RESULT_LIMIT = 50;

/**
 * CSV export fields
 */
export const CSV_EXPORT_FIELDS = [
  'id',
  'patientId',
  'patientName',
  'medication',
  'quantity',
  'unit',
  'reason',
  'prescribedBy',
  'prescribedDate',
  'dispensedAt',
  'notes',
];

/**
 * Gender options
 */
export const GENDER_OPTIONS = [
  'Male',
  'Female',
  'Non-binary',
  'Transgender Male',
  'Transgender Female',
  'Prefer not to say',
  'Other',
];

/**
 * Preferred language options
 */
export const LANGUAGE_OPTIONS = [
  'English',
  'Spanish',
  'French',
  'Portuguese',
  'Mandarin',
  'Cantonese',
  'Other',
];
