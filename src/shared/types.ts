/**
 * Hyacinth Medication Dispensing System - Shared Types
 * All types based on PRD Section 4.3
 */

// ============================================================================
// Enums and Constants
// ============================================================================

export type StaffRole = 'admin' | 'dispenser';
export type RecordStatus = 'completed' | 'voided' | 'corrected';
export type InventoryStatus = 'active' | 'expired' | 'depleted' | 'quarantined';
export type AlertType = 'expiring_soon' | 'low_stock' | 'expired';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type TransactionType = 'receive' | 'dispense' | 'adjustment' | 'return' | 'waste';
export type DraftType = 'dispense' | 'inventory';

// ============================================================================
// Database Entities
// ============================================================================

export interface Patient {
  id: number;
  chart_number: string;
  first_name: string;
  last_name: string;
  dob: string; // ISO 8601 format (YYYY-MM-DD)
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffMember {
  id: number;
  first_name: string;
  last_name: string;
  pin_hash: string;
  role: StaffRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DispensingRecord {
  id: number;
  patient_id: number;
  dispensing_date: string; // ISO 8601 format (YYYY-MM-DD)
  dispensing_time: string; // ISO 8601 format (HH:MM:SS)
  staff_id: number;
  label_quantity: number;
  additional_notes: string | null;
  status: RecordStatus;
  void_reason: string | null;
  voided_by: number | null;
  voided_at: string | null; // ISO 8601 format
  correction_of: number | null;
  corrected_by: number | null;
  correction_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface DispensingLineItem {
  id: number;
  record_id: number;
  medication_name: string;
  is_custom_medication: boolean;
  amount_value: number;
  amount_unit: string;
  lot_number: string | null;
  expiration_date: string | null; // ISO 8601 format (YYYY-MM-DD)
  inventory_id: number | null;
  dosing_instructions: string | null;
  created_at: string;
}

export interface RecordReason {
  id: number;
  record_id: number;
  reason_name: string;
  is_custom: boolean;
}

export interface Inventory {
  id: number;
  medication_name: string;
  lot_number: string;
  ndc_code: string | null;
  expiration_date: string; // ISO 8601 format (YYYY-MM-DD)
  quantity_received: number;
  quantity_on_hand: number;
  unit: string;
  supplier: string | null;
  supplier_invoice: string | null;
  cost_per_unit: number | null;
  received_date: string; // ISO 8601 format (YYYY-MM-DD)
  received_by: number;
  reorder_threshold: number | null;
  storage_location: string | null;
  status: InventoryStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: number;
  inventory_id: number;
  transaction_type: TransactionType;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reference_type: string | null; // 'dispense', 'adjustment', 'receive'
  reference_id: number | null;
  reason: string | null;
  performed_by: number;
  timestamp: string; // ISO 8601 format
}

export interface InventoryAlert {
  id: number;
  inventory_id: number;
  alert_type: AlertType;
  severity: AlertSeverity;
  message: string;
  is_acknowledged: boolean;
  acknowledged_by: number | null;
  acknowledged_at: string | null; // ISO 8601 format
  auto_resolved: boolean;
  resolved_at: string | null; // ISO 8601 format
  created_at: string;
}

export interface AuditLog {
  id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  staff_id: number | null;
  staff_name: string | null;
  timestamp: string; // ISO 8601 format
  details: string; // JSON string
  checksum: string; // SHA-256
  created_at: string;
}

export interface Draft {
  id: number;
  draft_type: DraftType;
  form_data: string; // JSON string
  staff_id: number;
  created_at: string;
  updated_at: string;
}

export interface CustomMedication {
  id: number;
  medication_name: string;
  usage_count: number;
  short_dosing: string | null;
  full_instructions: string | null;
  is_promoted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomReason {
  id: number;
  reason_name: string;
  usage_count: number;
  is_promoted: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppSetting {
  id: number;
  key: string;
  value: string;
  updated_at: string;
}

// ============================================================================
// API Input Types
// ============================================================================

export interface CreatePatientInput {
  chart_number: string;
  first_name: string;
  last_name: string;
  dob: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface UpdatePatientInput {
  chart_number?: string;
  first_name?: string;
  last_name?: string;
  dob?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  is_active?: boolean;
}

export interface CreateStaffInput {
  first_name: string;
  last_name: string;
  pin: string;
  role: StaffRole;
}

export interface UpdateStaffInput {
  first_name?: string;
  last_name?: string;
  pin?: string;
  role?: StaffRole;
  is_active?: boolean;
}

export interface DispenseLineItemInput {
  medication_name: string;
  is_custom_medication: boolean;
  amount_value: number;
  amount_unit: string;
  lot_number?: string;
  expiration_date?: string;
  inventory_id?: number;
  dosing_instructions?: string;
}

export interface CreateDispenseInput {
  patient_id: number;
  dispensing_date: string;
  dispensing_time: string;
  staff_id: number;
  label_quantity: number;
  items: DispenseLineItemInput[];
  reasons: string[];
  is_custom_reasons: boolean[];
  additional_notes?: string;
}

export interface VoidDispenseInput {
  record_id: number;
  reason: string;
  staff_id: number;
}

export interface CorrectDispenseInput {
  record_id: number;
  correction_reason: string;
  staff_id: number;
  corrected_data: CreateDispenseInput;
}

export interface ReceiveInventoryInput {
  medication_name: string;
  lot_number: string;
  ndc_code?: string;
  expiration_date: string;
  quantity_received: number;
  unit: string;
  supplier?: string;
  supplier_invoice?: string;
  cost_per_unit?: number;
  received_date: string;
  received_by: number;
  reorder_threshold?: number;
  storage_location?: string;
  notes?: string;
}

export interface AdjustInventoryInput {
  inventory_id: number;
  new_quantity: number;
  reason: string;
  staff_id: number;
}

export interface CreateDraftInput {
  draft_type: DraftType;
  form_data: Record<string, unknown>;
  staff_id: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface DispenseWithDetails extends DispensingRecord {
  patient: Patient;
  staff: StaffMember;
  items: DispensingLineItem[];
  reasons: RecordReason[];
}

export interface InventoryWithTransactions extends Inventory {
  transactions: InventoryTransaction[];
}

export interface DashboardStats {
  total_patients: number;
  total_dispenses_today: number;
  low_stock_items: number;
  expiring_soon: number;
  unacknowledged_alerts: number;
}

export interface SearchResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================================================
// IPC Channel Types
// ============================================================================

export interface IpcResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Instruction Service Types
// ============================================================================

export type ReasonContext = 'treatment' | 'prevention' | 'prophylaxis' | 'pep' | 'prep' | 'other';

export interface MedicationInstructionTemplate {
  medicationId: string;
  medicationName: string;
  strength: string;
  context: ReasonContext;
  indication: string;
  shortDosing: string;
  fullInstructions: string[];
  warnings: string[];
  daySupplyMultiplier: number;
  commonReasons: string[];
  additionalLabelInfo?: string;
  storageRequirements?: string;
}

export interface ReasonContextResult {
  context: ReasonContext;
  confidence: 'high' | 'medium' | 'low';
  conflictingReasons: string[];
  detectedIndications: string[];
  warnings: string[];
}

export interface DispenseReasonInput {
  reasonName: string;
  isCustom: boolean;
}

export interface DispensingLineItemData {
  medicationName: string;
  medicationStrength?: string;
  amountValue: number;
  amountUnit: string;
  lotNumber?: string;
  expirationDate?: string;
  inventoryId?: number;
  dosingInstructions: string;
  daySupply: number;
  warnings: string[];
  instructionContext: ReasonContext;
  indication?: string;
  additionalLabelInfo?: string;
  storageRequirements?: string;
}
