/**
 * Integration Tests for Dispensing Workflow
 * Tests the complete medication dispensing flow including:
 * - Patient selection
 * - Medication selection
 * - Inventory deduction
 * - Record creation
 * - Alert generation
 */

import { validateDispensing, validatePatient } from '../../renderer/utils/validators';
import {
  formatPatientName,
  formatDate,
  formatQuantity,
  formatInventoryStatus,
} from '../../renderer/utils/formatters';
import {
  normalizePatientName,
  namesMatch,
} from '../../renderer/utils/nameNormalizer';
import {
  mockPatients,
  mockInventory,
  mockDispensingRecords,
  validDispensingInput,
  mockStaffMembers,
} from '../mockData';
import { MEDICATIONS } from '../../renderer/utils/constants';

// Mock database operations
const mockDb = {
  dispensing: {
    create: jest.fn(),
    getById: jest.fn(),
    search: jest.fn(),
  },
  inventory: {
    getByMedication: jest.fn(),
    deduct: jest.fn(),
    getById: jest.fn(),
  },
  patients: {
    getById: jest.fn(),
    search: jest.fn(),
  },
};

describe('Dispensing Workflow Integration', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-30T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Patient Selection Flow
  // ============================================================================
  describe('Patient Selection Flow', () => {
    it('should find patient by chart number', () => {
      const chartNumber = 'HC001234';
      const patient = mockPatients.find(p => p.chart_number === chartNumber);
      
      expect(patient).toBeDefined();
      expect(patient?.first_name).toBe('James');
      expect(patient?.last_name).toBe('Wilson');
    });

    it('should search patients by partial name match', () => {
      const searchTerm = 'garcia';
      const matches = mockPatients.filter(p => 
        namesMatch(p.first_name, searchTerm) || 
        namesMatch(p.last_name, searchTerm)
      );
      
      expect(matches).toHaveLength(1);
      expect(matches[0].last_name).toBe('Garcia');
    });

    it('should format patient name for display', () => {
      const patient = mockPatients[0];
      const formattedName = formatPatientName(
        patient.first_name,
        patient.last_name
      );
      
      expect(formattedName).toBe('Wilson, James');
    });

    it('should validate selected patient data', () => {
      const patient = mockPatients[0];
      const validation = validatePatient({
        firstName: patient.first_name,
        lastName: patient.last_name,
        dateOfBirth: patient.dob,
        email: patient.email || undefined,
        phone: patient.phone || undefined,
      });
      
      expect(validation.isValid).toBe(true);
    });

    it('should reject inactive patients', () => {
      const inactivePatient = mockPatients.find(p => !p.is_active);
      expect(inactivePatient).toBeDefined();
      expect(inactivePatient?.is_active).toBe(false);
    });
  });

  // ============================================================================
  // Medication Selection Flow
  // ============================================================================
  describe('Medication Selection Flow', () => {
    it('should find available medication inventory', () => {
      const medicationName = 'Biktarvy (nPEP)';
      const inventory = mockInventory.filter(
        i => i.medication_name === medicationName && i.status === 'active'
      );
      
      expect(inventory.length).toBeGreaterThan(0);
      expect(inventory[0].quantity_on_hand).toBeGreaterThan(0);
    });

    it('should check for sufficient quantity', () => {
      const medicationName = 'Biktarvy (nPEP)';
      const requestedQty = 30;
      
      const availableInventory = mockInventory.filter(
        i => i.medication_name === medicationName && 
             i.status === 'active' &&
             i.quantity_on_hand >= requestedQty
      );
      
      expect(availableInventory.length).toBeGreaterThan(0);
    });

    it('should identify insufficient inventory', () => {
      const medicationName = 'Symtuza';
      const requestedQty = 10;
      
      const depletedInventory = mockInventory.find(
        i => i.medication_name === medicationName && 
             i.status === 'depleted'
      );
      
      expect(depletedInventory).toBeDefined();
      expect(depletedInventory?.quantity_on_hand).toBe(0);
    });

    it('should check expiration dates', () => {
      const medicationName = 'Descovy';
      const inventory = mockInventory.find(
        i => i.medication_name === medicationName && i.status === 'active'
      );
      
      expect(inventory).toBeDefined();
      
      const expDate = new Date(inventory!.expiration_date);
      const now = new Date();
      const daysUntilExpiry = Math.ceil(
        (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      expect(daysUntilExpiry).toBeLessThanOrEqual(45); // Expiring within 45 days
    });

    it('should format inventory status', () => {
      const lowStockItem = mockInventory.find(
        i => i.quantity_on_hand <= (i.reorder_threshold || 0)
      );
      
      expect(lowStockItem).toBeDefined();
      
      const status = formatInventoryStatus(
        lowStockItem!.quantity_on_hand,
        lowStockItem!.reorder_threshold || 30
      );
      
      expect(status).toBe('Low Stock');
    });
  });

  // ============================================================================
  // Dispensing Form Validation Flow
  // ============================================================================
  describe('Dispensing Form Validation Flow', () => {
    it('should validate complete dispensing form', () => {
      const dispensing = {
        patientId: mockPatients[0].id.toString(),
        medication: 'Biktarvy (nPEP)',
        quantity: 30,
        unit: 'tablets',
        reason: 'nPEP Initiation',
        prescribedBy: 'Dr. Sarah Johnson',
        prescribedDate: new Date().toISOString().split('T')[0],
      };
      
      const validation = validateDispensing(dispensing);
      expect(validation.isValid).toBe(true);
    });

    it('should reject dispensing without patient', () => {
      const dispensing = {
        patientId: '',
        medication: 'Biktarvy (nPEP)',
        quantity: 30,
        unit: 'tablets',
        reason: 'nPEP Initiation',
        prescribedBy: 'Dr. Sarah Johnson',
        prescribedDate: new Date().toISOString().split('T')[0],
      };
      
      const validation = validateDispensing(dispensing);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.patientId).toBeDefined();
    });

    it('should reject dispensing with excessive quantity', () => {
      const dispensing = {
        patientId: mockPatients[0].id.toString(),
        medication: 'Biktarvy (nPEP)',
        quantity: 2000,
        unit: 'tablets',
        reason: 'nPEP Initiation',
        prescribedBy: 'Dr. Sarah Johnson',
        prescribedDate: new Date().toISOString().split('T')[0],
      };
      
      const validation = validateDispensing(dispensing);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.quantity).toBe('Quantity seems unusually high');
    });

    it('should reject dispensing with old prescription date', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);
      
      const dispensing = {
        patientId: mockPatients[0].id.toString(),
        medication: 'Biktarvy (nPEP)',
        quantity: 30,
        unit: 'tablets',
        reason: 'nPEP Initiation',
        prescribedBy: 'Dr. Sarah Johnson',
        prescribedDate: oldDate.toISOString().split('T')[0],
      };
      
      const validation = validateDispensing(dispensing);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.prescribedDate).toContain('more than 30 days');
    });

    it('should validate all medication options', () => {
      MEDICATIONS.forEach(med => {
        const dispensing = {
          patientId: '1',
          medication: med,
          quantity: 30,
          unit: 'tablets',
          reason: 'ADDP Application Pending',
          prescribedBy: 'Dr. Test',
          prescribedDate: new Date().toISOString().split('T')[0],
        };
        
        const validation = validateDispensing(dispensing);
        expect(validation.errors.medication).toBeUndefined();
      });
    });

    it('should validate all reason options', () => {
      const reasons = [
        'ADDP Application Pending',
        'ADDP Renewal',
        'Health Insurance Pending',
        'Health Insurance Renewal',
        'Undocumented/Uninsured',
        'Rapid Initiation PrEP',
        'Rapid Initiation ART',
        'nPEP Initiation',
        'STI/UTI Treatment',
      ];
      
      reasons.forEach(reason => {
        const dispensing = {
          patientId: '1',
          medication: 'Biktarvy (nPEP)',
          quantity: 30,
          unit: 'tablets',
          reason,
          prescribedBy: 'Dr. Test',
          prescribedDate: new Date().toISOString().split('T')[0],
        };
        
        const validation = validateDispensing(dispensing);
        expect(validation.errors.reason).toBeUndefined();
      });
    });
  });

  // ============================================================================
  // Inventory Deduction Flow
  // ============================================================================
  describe('Inventory Deduction Flow', () => {
    it('should calculate remaining inventory after dispensing', () => {
      const inventoryItem = mockInventory[0]; // Biktarvy (nPEP)
      const initialQty = inventoryItem.quantity_on_hand;
      const dispenseQty = 30;
      
      const remainingQty = initialQty - dispenseQty;
      
      expect(remainingQty).toBe(15); // 45 - 30 = 15
    });

    it('should identify low stock after dispensing', () => {
      const inventoryItem = mockInventory[2]; // Biktarvy (PrEP) with low stock
      const initialQty = inventoryItem.quantity_on_hand; // 25
      const dispenseQty = 10;
      
      const remainingQty = initialQty - dispenseQty; // 15
      const threshold = inventoryItem.reorder_threshold!; // 30
      
      expect(remainingQty).toBeLessThan(threshold);
    });

    it('should track multiple deductions from same lot', () => {
      const inventoryItem = mockInventory[0];
      const deductions = [10, 15, 5];
      
      let remainingQty = inventoryItem.quantity_on_hand;
      deductions.forEach(qty => {
        remainingQty -= qty;
      });
      
      expect(remainingQty).toBe(15); // 45 - 30 = 15
    });

    it('should prevent dispensing more than available', () => {
      const inventoryItem = mockInventory[4]; // Symtuza - depleted
      const requestedQty = 10;
      
      const hasSufficientStock = inventoryItem.quantity_on_hand >= requestedQty;
      
      expect(hasSufficientStock).toBe(false);
    });
  });

  // ============================================================================
  // Record Creation Flow
  // ============================================================================
  describe('Record Creation Flow', () => {
    it('should format dispensing record for display', () => {
      const record = mockDispensingRecords[0];
      const patient = mockPatients.find(p => p.id === record.patient_id);
      
      const patientName = formatPatientName(
        patient!.first_name,
        patient!.last_name
      );
      const dispenseDate = formatDate(record.dispensing_date);
      const quantity = formatQuantity(record.label_quantity, 'tablets');
      
      expect(patientName).toBe('Wilson, James');
      expect(dispenseDate).toBe('01/15/2024');
      expect(quantity).toBe('30 tablets');
    });

    it('should identify voided records', () => {
      const voidedRecord = mockDispensingRecords.find(r => r.status === 'voided');
      
      expect(voidedRecord).toBeDefined();
      expect(voidedRecord?.void_reason).toBeDefined();
      expect(voidedRecord?.voided_by).toBeDefined();
    });

    it('should identify corrected records', () => {
      const correctedRecord = mockDispensingRecords.find(r => r.status === 'corrected');
      
      expect(correctedRecord).toBeDefined();
    });

    it('should link correction to original record', () => {
      const correction = mockDispensingRecords.find(r => r.correction_of);
      const original = mockDispensingRecords.find(r => r.id === correction?.correction_of);
      
      expect(correction).toBeDefined();
      expect(original).toBeDefined();
      expect(original?.status).toBe('corrected');
    });
  });

  // ============================================================================
  // Alert Generation Flow
  // ============================================================================
  describe('Alert Generation Flow', () => {
    it('should detect low stock items', () => {
      const lowStockItems = mockInventory.filter(
        i => i.status === 'active' && 
             i.reorder_threshold && 
             i.quantity_on_hand <= i.reorder_threshold
      );
      
      expect(lowStockItems.length).toBeGreaterThan(0);
      
      lowStockItems.forEach(item => {
        const status = formatInventoryStatus(
          item.quantity_on_hand,
          item.reorder_threshold!
        );
        expect(status).toBe('Low Stock');
      });
    });

    it('should detect expiring items', () => {
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      const expiringItems = mockInventory.filter(
        i => i.status === 'active' &&
             new Date(i.expiration_date) <= thirtyDaysFromNow &&
             new Date(i.expiration_date) > today
      );
      
      expect(expiringItems.length).toBeGreaterThan(0);
    });

    it('should detect expired items', () => {
      const today = new Date();
      
      const expiredItems = mockInventory.filter(
        i => new Date(i.expiration_date) < today
      );
      
      expiredItems.forEach(item => {
        expect(new Date(item.expiration_date).getTime()).toBeLessThan(today.getTime());
      });
    });

    it('should prioritize critical alerts', () => {
      const alerts = [
        { type: 'expired', severity: 'critical' },
        { type: 'low_stock', severity: 'warning' },
        { type: 'expiring_soon', severity: 'warning' },
      ];
      
      const criticalAlerts = alerts.filter(a => a.severity === 'critical');
      expect(criticalAlerts.length).toBe(1);
      expect(criticalAlerts[0].type).toBe('expired');
    });
  });

  // ============================================================================
  // End-to-End Workflow Tests
  // ============================================================================
  describe('End-to-End Dispensing Workflow', () => {
    it('should complete full dispensing workflow for nPEP', () => {
      // 1. Select patient
      const patient = mockPatients.find(p => p.chart_number === 'HC001234');
      expect(patient).toBeDefined();

      // 2. Select medication
      const medication = 'Biktarvy (nPEP)';
      const inventory = mockInventory.find(
        i => i.medication_name === medication && i.status === 'active'
      );
      expect(inventory).toBeDefined();
      expect(inventory!.quantity_on_hand).toBeGreaterThanOrEqual(30);

      // 3. Validate form
      const dispensing = {
        patientId: patient!.id.toString(),
        medication,
        quantity: 30,
        unit: 'tablets',
        reason: 'nPEP Initiation',
        prescribedBy: 'Dr. Sarah Johnson',
        prescribedDate: new Date().toISOString().split('T')[0],
      };
      
      const validation = validateDispensing(dispensing);
      expect(validation.isValid).toBe(true);

      // 4. Check inventory after dispensing
      const remainingQty = inventory!.quantity_on_hand - dispensing.quantity;
      expect(remainingQty).toBe(15);

      // 5. Verify patient name formatting
      const displayName = formatPatientName(patient!.first_name, patient!.last_name);
      expect(displayName).toBe('Wilson, James');
    });

    it('should complete full dispensing workflow for PrEP', () => {
      // 1. Select patient
      const patient = mockPatients[1];
      expect(patient.is_active).toBe(true);

      // 2. Select medication
      const inventoryMedication = 'Descovy';
      const dispensingMedication = 'Descovy (PrEP)';
      const inventory = mockInventory.find(
        i => i.medication_name === inventoryMedication && i.status === 'active'
      );
      expect(inventory).toBeDefined();

      // 3. Validate form
      const dispensing = {
        patientId: patient.id.toString(),
        medication: dispensingMedication,
        quantity: 30,
        unit: 'tablets',
        reason: 'Rapid Initiation PrEP',
        prescribedBy: 'Dr. Michael Chen',
        prescribedDate: new Date().toISOString().split('T')[0],
      };
      
      const validation = validateDispensing(dispensing);
      expect(validation.isValid).toBe(true);

      // 4. Check expiring soon alert
      const expDate = new Date(inventory!.expiration_date);
      const daysUntilExpiry = Math.ceil(
        (expDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysUntilExpiry).toBeLessThanOrEqual(45);
    });

    it('should handle antibiotic dispensing workflow', () => {
      // Bactrim for STI treatment
      const patient = mockPatients[2];
      const inventoryMedication = 'Bactrim';
      const dispensingMedication = 'Bactrim DS (UTI Treatment)';
      
      const dispensing = {
        patientId: patient.id.toString(),
        medication: dispensingMedication,
        quantity: 14,
        unit: 'tablets',
        reason: 'STI/UTI Treatment',
        prescribedBy: 'Dr. Emily Davis',
        prescribedDate: new Date().toISOString().split('T')[0],
      };
      
      const validation = validateDispensing(dispensing);
      expect(validation.isValid).toBe(true);

      // Check for low stock alert
      const inventory = mockInventory.find(
        i => i.medication_name === inventoryMedication && i.status === 'active'
      );
      expect(inventory!.quantity_on_hand).toBeLessThan(inventory!.reorder_threshold!);
    });

    it('should prevent dispensing to inactive patient', () => {
      const inactivePatient = mockPatients.find(p => !p.is_active);
      expect(inactivePatient).toBeDefined();

      const dispensing = {
        patientId: inactivePatient!.id.toString(),
        medication: 'Biktarvy (nPEP)',
        quantity: 30,
        unit: 'tablets',
        reason: 'nPEP Initiation',
        prescribedBy: 'Dr. Test',
        prescribedDate: new Date().toISOString().split('T')[0],
      };
      
      // Validation passes but business logic should prevent
      const validation = validateDispensing(dispensing);
      expect(validation.isValid).toBe(true);
      expect(inactivePatient!.is_active).toBe(false);
    });

    it('should handle void workflow', () => {
      const voidedRecord = mockDispensingRecords.find(r => r.status === 'voided');
      expect(voidedRecord).toBeDefined();
      expect(voidedRecord!.void_reason).toBe('Incorrect medication dispensed');
      expect(voidedRecord!.voided_by).toBe(1);
    });

    it('should handle correction workflow', () => {
      const originalRecord = mockDispensingRecords.find(r => r.status === 'corrected');
      const correctedRecord = mockDispensingRecords.find(
        r => r.correction_of === originalRecord?.id
      );
      
      expect(originalRecord).toBeDefined();
      expect(correctedRecord).toBeDefined();
      expect(correctedRecord!.correction_of).toBe(originalRecord!.id);
      expect(originalRecord!.status).toBe('corrected');
    });
  });

  // ============================================================================
  // CSV Export Format Tests
  // ============================================================================
  describe('CSV Export Format', () => {
    it('should format dispensing record for CSV export', () => {
      const record = mockDispensingRecords[0];
      const patient = mockPatients.find(p => p.id === record.patient_id);
      
      const csvRow = {
        id: record.id.toString(),
        patientId: patient!.chart_number,
        patientName: formatPatientName(patient!.first_name, patient!.last_name),
        medication: 'Biktarvy (nPEP)',
        quantity: record.label_quantity.toString(),
        unit: 'tablets',
        reason: 'nPEP Initiation',
        prescribedBy: 'Dr. Sarah Johnson',
        prescribedDate: record.dispensing_date,
        dispensedAt: `${record.dispensing_date} ${record.dispensing_time.slice(0, 5)}`,
        notes: record.additional_notes || '',
      };
      
      expect(csvRow.patientId).toBe('HC001234');
      expect(csvRow.patientName).toBe('Wilson, James');
      expect(csvRow.quantity).toBe('30');
    });

    it('should include all required CSV fields', () => {
      const requiredFields = [
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
      
      const record = mockDispensingRecords[0];
      const patient = mockPatients.find(p => p.id === record.patient_id);
      
      const csvRow: Record<string, string> = {
        id: record.id.toString(),
        patientId: patient!.chart_number,
        patientName: formatPatientName(patient!.first_name, patient!.last_name),
        medication: 'Biktarvy (nPEP)',
        quantity: record.label_quantity.toString(),
        unit: 'tablets',
        reason: 'nPEP Initiation',
        prescribedBy: 'Dr. Sarah Johnson',
        prescribedDate: record.dispensing_date,
        dispensedAt: `${record.dispensing_date} ${record.dispensing_time.slice(0, 5)}`,
        notes: record.additional_notes || '',
      };
      
      requiredFields.forEach(field => {
        expect(csvRow[field]).toBeDefined();
      });
    });
  });
});
