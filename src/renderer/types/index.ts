/**
 * Shared Type Definitions for Hyacinth Medication Dispensing System
 */

// Staff/Authentication Types
export interface Staff {
  id: string;
  name: string;
  role: 'admin' | 'nurse' | 'pharmacist' | 'technician';
  pin: string;
  isActive: boolean;
  lastLogin?: Date;
}

export interface AuthState {
  staff: Staff | null;
  isAuthenticated: boolean;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
}

// Patient Types
export interface Patient {
  id: string;
  chartNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  allergies: string[];
  weight?: number;
  weightUnit?: 'kg' | 'lb';
}

// Medication Types
export interface Medication {
  id: string;
  name: string;
  genericName?: string;
  category: string;
  dosageForm: string;
  strength?: string;
  controlledSubstance: boolean;
  schedule?: 'II' | 'III' | 'IV' | 'V';
  storageRequirements?: string;
  warnings?: string[];
  contraindications?: string[];
  commonDosages?: string[];
  sideEffects?: string[];
}

export interface MedicationLot {
  id: string;
  medicationId: string;
  lotNumber: string;
  expirationDate: Date;
  quantityOnHand: number;
  unitOfMeasure: string;
  receivedDate: Date;
  supplier?: string;
  ndc?: string;
}

export interface MedicationStock extends Medication {
  lots: MedicationLot[];
  totalQuantity: number;
  reorderPoint: number;
  reorderQuantity: number;
}

// Dispensing Types
export type DispenseReason =
  // Treatment reasons
  | 'HIV Treatment - Initial'
  | 'HIV Treatment - Continuation'
  | 'STI Treatment - Chlamydia'
  | 'STI Treatment - Gonorrhea'
  | 'STI Treatment - Syphilis'
  | 'STI Treatment - Multiple'
  | 'UTI Treatment'
  | 'Skin Infection Treatment'
  | 'Respiratory Infection Treatment'
  | 'Other Infection Treatment'
  // Prevention/Prophylaxis reasons
  | 'PrEP - Daily'
  | 'PrEP - On-Demand'
  | 'PrEP - Event-Driven'
  | 'nPEP - 28 Day Course'
  | 'nPEP - Occupational'
  | 'Doxy-PEP'
  | 'PCP Prophylaxis'
  | 'Toxoplasmosis Prophylaxis'
  | 'MAC Prophylaxis'
  | 'Herpes Prophylaxis'
  | 'Fungal Prophylaxis'
  // Legacy reasons
  | 'Scheduled Medication'
  | 'PRN (As Needed)'
  | 'STAT/Emergency'
  | 'New Order'
  | 'Discharge'
  | 'Transfer'
  | 'Waste';

export type ReasonContext = 'treatment' | 'prevention' | 'prophylaxis' | 'pep' | 'prep' | 'other';

export interface DispenseReasonConfig {
  value: DispenseReason;
  label: string;
  context: ReasonContext;
  color: string;
  linksToInstructions: boolean;
  description?: string;
}

export interface InstructionContext {
  context: ReasonContext;
  indication: string;
  medicationId: string;
  priority: number;
}

export type RecordStatus = 'active' | 'corrected' | 'voided';

export interface DispenseRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientChartNumber: string;
  medications: DispensedMedication[];
  reasons: DispenseReason[];
  notes?: string;
  dispensedBy: string;
  dispensedByName: string;
  dispensedAt: Date;
  verifiedBy?: string;
  verifiedByName?: string;
  status: RecordStatus;
  correction?: CorrectionInfo;
  void?: VoidInfo;
}

export interface DispensedMedication {
  id: string;
  medicationId: string;
  medicationName: string;
  lotId: string;
  lotNumber: string;
  amount: number;
  unit: string;
  expirationDate: Date | null;
  instructionContext?: InstructionContext;
  daySupply?: number;
  medicationStrength?: string;
  warnings?: string[];
  instructions?: string[];
}

export interface EnhancedDispensedMedication extends DispensedMedication {
  medicationStrength: string;
  daySupply: number;
  warnings: string[];
  instructions: string[];
  context: ReasonContext;
  indication: string;
}

// Medication Catalog Types
export interface MedicationCatalog {
  id: string;
  medicationName: string;
  genericName?: string;
  strength?: string;
  dosageForm: string;
  category: string;
  ndcCode?: string;
  defaultUnit: string;
  isControlled: boolean;
  schedule?: 'II' | 'III' | 'IV' | 'V';
  storageRequirements?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicationInstructionTemplate {
  id: string;
  medicationCatalogId: string;
  context: ReasonContext;
  indication: string;
  shortDosing: string;
  fullInstructions: string[];
  warnings: string[];
  daySupplyCalculation: string;
  commonReasons: DispenseReason[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DispenseReasonConfig {
  value: DispenseReason;
  label: string;
  context: ReasonContext;
  color: string;
  linksToInstructions: boolean;
  description?: string;
}

export interface InstructionContext {
  context: ReasonContext;
  indication: string;
  medicationId: string;
  priority: number;
}

export interface LotValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  lot?: MedicationLot;
  daysUntilExpiration?: number;
}

export interface CorrectionInfo {
  correctedAt: Date;
  correctedBy: string;
  correctedByName: string;
  originalData: Partial<DispenseRecord>;
  reason: string;
}

export interface VoidInfo {
  voidedAt: Date;
  voidedBy: string;
  voidedByName: string;
  reason: string;
}

// Inventory Alert Types
export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface InventoryAlert {
  id: string;
  type: 'low_stock' | 'expiring' | 'expired' | 'reorder_needed';
  severity: AlertSeverity;
  medicationId: string;
  medicationName: string;
  lotId?: string;
  lotNumber?: string;
  message: string;
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

export interface AlertState {
  alerts: InventoryAlert[];
  unreadCount: number;
  addAlert: (alert: InventoryAlert) => void;
  acknowledgeAlert: (id: string) => void;
  clearAlert: (id: string) => void;
}

// Form Types
export interface FormField<T = string> {
  value: T;
  error?: string;
  touched: boolean;
}

export interface MedicationLineItem {
  id: string;
  medicationId: string;
  lotId: string;
  amount: string;
  unit: string;
}

// UI Types
export type TabId = 'entry' | 'log' | 'inventory' | 'guide' | 'reports';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}
