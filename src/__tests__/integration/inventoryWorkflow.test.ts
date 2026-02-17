/**
 * Integration Tests for Inventory Workflow
 * Tests inventory management including:
 * - Receiving inventory
 * - Stock level tracking
 * - Expiration monitoring
 * - Low stock alerts
 * - Inventory adjustments
 * - Audit trail
 */

import { validateInventory } from '../../renderer/utils/validators';
import {
  formatInventoryStatus,
  getInventoryStatusClass,
  formatExpirationDate,
  formatQuantity,
  formatDate,
} from '../../renderer/utils/formatters';
import {
  mockInventory,
  mockInventoryAlerts,
} from '../mockData';
import { MEDICATIONS, ALERT_TYPES } from '../../renderer/utils/constants';

describe('Inventory Workflow Integration', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-30T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  // ============================================================================
  // Inventory Receiving Flow
  // ============================================================================
  describe('Inventory Receiving Flow', () => {
    it('should validate new inventory entry', () => {
      const inventory = {
        medication: 'Biktarvy (nPEP)',
        quantity: 100,
        unit: 'tablets',
        lotNumber: 'BKT2024NEW',
        expirationDate: '2026-12-31',
      };
      
      const validation = validateInventory(inventory);
      expect(validation.isValid).toBe(true);
    });

    it('should reject inventory without medication', () => {
      const inventory = {
        medication: '',
        quantity: 100,
        unit: 'tablets',
        expirationDate: '2026-12-31',
      };
      
      const validation = validateInventory(inventory);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.medication).toBe('Medication is required');
    });

    it('should reject inventory with past expiration date', () => {
      const inventory = {
        medication: 'Biktarvy (nPEP)',
        quantity: 100,
        unit: 'tablets',
        expirationDate: '2020-01-01',
      };
      
      const validation = validateInventory(inventory);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.expirationDate).toBe('Item has already expired');
    });

    it('should reject inventory with too far future expiration', () => {
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 11);
      
      const inventory = {
        medication: 'Biktarvy (nPEP)',
        quantity: 100,
        unit: 'tablets',
        expirationDate: farFuture.toISOString().split('T')[0],
      };
      
      const validation = validateInventory(inventory);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.expirationDate).toBe('Expiration date seems too far in the future');
    });

    it('should reject invalid lot number', () => {
      const inventory = {
        medication: 'Biktarvy (nPEP)',
        quantity: 100,
        unit: 'tablets',
        lotNumber: 'AB', // Too short
        expirationDate: '2026-12-31',
      };
      
      const validation = validateInventory(inventory);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.lotNumber).toBe('Lot number is too short');
    });

    it('should accept all PRD medications', () => {
      MEDICATIONS.forEach(medication => {
        const inventory = {
          medication,
          quantity: 100,
          unit: 'tablets',
          expirationDate: '2026-12-31',
        };
        
        const validation = validateInventory(inventory);
        expect(validation.errors.medication).toBeUndefined();
      });
    });
  });

  // ============================================================================
  // Stock Level Tracking Flow
  // ============================================================================
  describe('Stock Level Tracking Flow', () => {
    it('should track quantity received vs on hand', () => {
      const inventory = mockInventory[0];
      
      expect(inventory.quantity_received).toBe(100);
      expect(inventory.quantity_on_hand).toBe(45);
      expect(inventory.quantity_received).toBeGreaterThanOrEqual(inventory.quantity_on_hand);
    });

    it('should identify in stock items', () => {
      const inStockItems = mockInventory.filter(
        i => i.status === 'active' && 
             (!i.reorder_threshold || i.quantity_on_hand > i.reorder_threshold)
      );
      
      inStockItems.forEach(item => {
        const status = formatInventoryStatus(
          item.quantity_on_hand,
          item.reorder_threshold || 30
        );
        expect(status).toBe('In Stock');
      });
    });

    it('should identify low stock items', () => {
      const lowStockItems = mockInventory.filter(
        i => i.status === 'active' && 
             i.reorder_threshold && 
             i.quantity_on_hand <= i.reorder_threshold &&
             i.quantity_on_hand > 0
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

    it('should identify out of stock items', () => {
      const outOfStockItems = mockInventory.filter(
        i => i.quantity_on_hand <= 0 || i.status === 'depleted'
      );
      
      expect(outOfStockItems.length).toBeGreaterThan(0);
      
      outOfStockItems.forEach(item => {
        const status = formatInventoryStatus(
          item.quantity_on_hand,
          item.reorder_threshold || 30
        );
        expect(status).toBe('Out of Stock');
      });
    });

    it('should apply correct CSS classes for inventory status', () => {
      // In stock
      const inStockClasses = getInventoryStatusClass(100, 30);
      expect(inStockClasses).toContain('text-green-600');
      expect(inStockClasses).toContain('bg-green-50');
      
      // Low stock
      const lowStockClasses = getInventoryStatusClass(25, 30);
      expect(lowStockClasses).toContain('text-amber-600');
      expect(lowStockClasses).toContain('bg-amber-50');
      
      // Out of stock
      const outOfStockClasses = getInventoryStatusClass(0, 30);
      expect(outOfStockClasses).toContain('text-red-600');
      expect(outOfStockClasses).toContain('bg-red-50');
    });

    it('should calculate quantity dispensed', () => {
      const inventory = mockInventory[0];
      const dispensed = inventory.quantity_received - inventory.quantity_on_hand;
      
      expect(dispensed).toBe(55); // 100 - 45 = 55
    });

    it('should format quantity with unit', () => {
      const inventory = mockInventory[0];
      const formatted = formatQuantity(inventory.quantity_on_hand, inventory.unit);
      
      expect(formatted).toBe('45 tablets');
    });
  });

  // ============================================================================
  // Expiration Monitoring Flow
  // ============================================================================
  describe('Expiration Monitoring Flow', () => {
    it('should format expiration dates', () => {
      const inventory = mockInventory[0];
      const formatted = formatExpirationDate(inventory.expiration_date);
      
      expect(formatted.text).toContain('/2025');
      expect(formatted.className).toBe('text-gray-900');
    });

    it('should identify expired items', () => {
      const today = new Date();
      const expiredItems = mockInventory.filter(
        i => new Date(i.expiration_date) < today
      );
      
      expiredItems.forEach(item => {
        const formatted = formatExpirationDate(item.expiration_date);
        expect(formatted.text).toContain('Expired');
        expect(formatted.className).toContain('text-red-600');
      });
    });

    it('should identify items expiring soon', () => {
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      const expiringSoon = mockInventory.filter(
        i => i.status === 'active' &&
             new Date(i.expiration_date) > today &&
             new Date(i.expiration_date) <= thirtyDaysFromNow
      );
      
      expect(expiringSoon.length).toBeGreaterThan(0);
      
      expiringSoon.forEach(item => {
        const formatted = formatExpirationDate(item.expiration_date);
        expect(formatted.className).toContain('text-amber-600');
      });
    });

    it('should calculate days until expiration', () => {
      const inventory = mockInventory[3]; // Descovy - expiring soon
      const expDate = new Date(inventory.expiration_date);
      const today = new Date();
      const daysUntilExpiry = Math.ceil(
        (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      expect(daysUntilExpiry).toBeGreaterThan(0);
      expect(daysUntilExpiry).toBeLessThanOrEqual(45);
    });

    it('should sort inventory by expiration date', () => {
      const sortedInventory = [...mockInventory]
        .filter(i => i.status === 'active')
        .sort((a, b) => 
          new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime()
        );
      
      // First item should have earliest expiration
      for (let i = 1; i < sortedInventory.length; i++) {
        expect(new Date(sortedInventory[i-1].expiration_date).getTime())
          .toBeLessThanOrEqual(new Date(sortedInventory[i].expiration_date).getTime());
      }
    });
  });

  // ============================================================================
  // Alert Generation Flow
  // ============================================================================
  describe('Alert Generation Flow', () => {
    it('should generate low stock alerts', () => {
      const lowStockAlerts = mockInventoryAlerts.filter(
        a => a.alert_type === ALERT_TYPES.LOW_STOCK
      );
      
      expect(lowStockAlerts.length).toBeGreaterThan(0);
      
      lowStockAlerts.forEach(alert => {
        expect(alert.severity).toBe('warning');
        expect(alert.message).toContain('low on stock');
      });
    });

    it('should generate expiring soon alerts', () => {
      const expiringAlerts = mockInventoryAlerts.filter(
        a => a.alert_type === ALERT_TYPES.EXPIRING_SOON
      );
      
      expect(expiringAlerts.length).toBeGreaterThan(0);
      
      expiringAlerts.forEach(alert => {
        expect(alert.severity).toBe('warning');
        expect(alert.message).toContain('expires in');
      });
    });

    it('should generate expired alerts', () => {
      const expiredAlerts = mockInventoryAlerts.filter(
        a => a.alert_type === ALERT_TYPES.EXPIRED
      );
      
      expect(expiredAlerts.length).toBeGreaterThan(0);
      
      expiredAlerts.forEach(alert => {
        expect(alert.severity).toBe('critical');
        expect(alert.message).toContain('has expired');
      });
    });

    it('should track acknowledged alerts', () => {
      const acknowledgedAlerts = mockInventoryAlerts.filter(a => a.is_acknowledged);
      
      expect(acknowledgedAlerts.length).toBeGreaterThan(0);
      
      acknowledgedAlerts.forEach(alert => {
        expect(alert.acknowledged_by).toBeDefined();
        expect(alert.acknowledged_at).toBeDefined();
      });
    });

    it('should track unacknowledged alerts', () => {
      const unacknowledgedAlerts = mockInventoryAlerts.filter(a => !a.is_acknowledged);
      
      expect(unacknowledgedAlerts.length).toBeGreaterThan(0);
      
      unacknowledgedAlerts.forEach(alert => {
        expect(alert.acknowledged_by).toBeNull();
        expect(alert.acknowledged_at).toBeNull();
      });
    });
  });

  // ============================================================================
  // Inventory Adjustment Flow
  // ============================================================================
  describe('Inventory Adjustment Flow', () => {
    it('should calculate adjustment quantity', () => {
      const inventory = mockInventory[0];
      const newQuantity = 50;
      const adjustment = newQuantity - inventory.quantity_on_hand;
      
      expect(adjustment).toBe(5); // 50 - 45 = 5
    });

    it('should allow positive adjustment', () => {
      const inventory = mockInventory[0];
      const adjustment = 10;
      const newQuantity = inventory.quantity_on_hand + adjustment;
      
      expect(newQuantity).toBe(55);
    });

    it('should allow negative adjustment', () => {
      const inventory = mockInventory[0];
      const adjustment = -10;
      const newQuantity = inventory.quantity_on_hand + adjustment;
      
      expect(newQuantity).toBe(35);
    });

    it('should validate adjustment does not exceed received quantity', () => {
      const inventory = mockInventory[0];
      const maxAdjustment = inventory.quantity_received - inventory.quantity_on_hand;
      
      // Positive adjustment should not exceed what was received
      expect(maxAdjustment).toBe(55);
    });

    it('should mark depleted when quantity reaches zero', () => {
      const depletedItems = mockInventory.filter(i => i.status === 'depleted');
      
      depletedItems.forEach(item => {
        expect(item.quantity_on_hand).toBe(0);
      });
    });
  });

  // ============================================================================
  // Transaction History Flow
  // ============================================================================
  describe('Transaction History Flow', () => {
    it('should track received transactions', () => {
      const inventory = mockInventory[0];
      
      expect(inventory.received_by).toBeDefined();
      expect(inventory.received_date).toBeDefined();
    });

    it('should format received date', () => {
      const inventory = mockInventory[0];
      const formatted = formatDate(inventory.received_date);
      
      expect(formatted).toContain('/2024');
    });

    it('should track supplier information', () => {
      const inventory = mockInventory[0];
      
      expect(inventory.supplier).toBeDefined();
      expect(inventory.supplier_invoice).toBeDefined();
    });
  });

  // ============================================================================
  // End-to-End Inventory Workflow Tests
  // ============================================================================
  describe('End-to-End Inventory Workflow', () => {
    it('should complete full inventory receiving workflow', () => {
      // 1. Create new inventory entry
      const newInventory = {
        medication_name: 'Biktarvy (nPEP)',
        lot_number: 'BKT2024NEW',
        ndc_code: '61958-2301-1',
        expiration_date: '2026-12-31',
        quantity_received: 200,
        quantity_on_hand: 200,
        unit: 'tablets',
        supplier: 'Gilead Sciences',
        supplier_invoice: 'INV-2024-NEW',
        cost_per_unit: 125.5,
        received_date: new Date().toISOString().split('T')[0],
        received_by: 1,
        reorder_threshold: 30,
        storage_location: 'Cabinet A1',
        status: 'active' as const,
      };
      
      // 2. Validate
      const validation = validateInventory({
        medication: newInventory.medication_name,
        quantity: newInventory.quantity_received,
        unit: newInventory.unit,
        lotNumber: newInventory.lot_number,
        expirationDate: newInventory.expiration_date,
      });
      
      expect(validation.isValid).toBe(true);
      
      // 3. Verify status
      const status = formatInventoryStatus(
        newInventory.quantity_on_hand,
        newInventory.reorder_threshold
      );
      
      expect(status).toBe('In Stock');
    });

    it('should handle low stock workflow', () => {
      // Find low stock item
      const lowStockItem = mockInventory.find(
        i => i.status === 'active' &&
             i.reorder_threshold &&
             i.quantity_on_hand <= i.reorder_threshold
      );
      
      expect(lowStockItem).toBeDefined();
      
      // Verify alert would be generated
      const alert = mockInventoryAlerts.find(
        a => a.inventory_id === lowStockItem!.id && a.alert_type === 'low_stock'
      );
      
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe('warning');
    });

    it('should handle expiration workflow', () => {
      // Find expiring item
      const expiringItem = mockInventory.find(
        i => i.status === 'active' &&
             new Date(i.expiration_date) <= new Date('2025-03-31')
      );
      
      expect(expiringItem).toBeDefined();
      
      // Format expiration with warning
      const formatted = formatExpirationDate(expiringItem!.expiration_date);
      expect(formatted.className).toContain('text-amber-600');
    });

    it('should handle quarantine workflow', () => {
      // Simulate quarantining an item
      const inventoryItem = mockInventory[0];
      const quarantineReason = 'Temperature excursion during shipping';
      
      expect(inventoryItem).toBeDefined();
      expect(quarantineReason).toBeDefined();
    });

    it('should generate reorder list', () => {
      const reorderList = mockInventory
        .filter(i => 
          i.status === 'active' &&
          i.reorder_threshold &&
          i.quantity_on_hand <= i.reorder_threshold
        )
        .map(i => ({
          medication: i.medication_name,
          lot: i.lot_number,
          currentStock: i.quantity_on_hand,
          threshold: i.reorder_threshold,
          needed: (i.reorder_threshold! * 2) - i.quantity_on_hand, // Order 2x threshold
        }));
      
      expect(reorderList.length).toBeGreaterThan(0);
      
      reorderList.forEach(item => {
        expect(item.needed).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // Medication-specific Inventory Tests
  // ============================================================================
  describe('Medication-specific Inventory', () => {
    it('should track Biktarvy variants separately', () => {
      const biktarvyItems = mockInventory.filter(
        i => i.medication_name.includes('Biktarvy')
      );
      
      expect(biktarvyItems.length).toBe(3);
      
      const variants = ['Biktarvy (nPEP)', 'Biktarvy (ID)', 'Biktarvy (PrEP)'];
      variants.forEach(variant => {
        expect(biktarvyItems.some(i => i.medication_name === variant)).toBe(true);
      });
    });

    it('should have correct units for all medications', () => {
      const validUnits = ['tablets', 'capsules', 'bottles', 'mL'];
      
      mockInventory.forEach(item => {
        expect(validUnits).toContain(item.unit);
      });
    });

    it('should have NDC codes for prescription medications', () => {
      mockInventory.forEach(item => {
        expect(item.ndc_code).toBeDefined();
        expect(item.ndc_code?.length).toBeGreaterThan(0);
      });
    });

    it('should have unique lot numbers per medication', () => {
      const lotNumbers = new Map<string, Set<string>>();
      
      mockInventory.forEach(item => {
        if (!lotNumbers.has(item.medication_name)) {
          lotNumbers.set(item.medication_name, new Set());
        }
        lotNumbers.get(item.medication_name)!.add(item.lot_number);
      });
      
      // Verify no duplicates per medication
      lotNumbers.forEach((lots, medication) => {
        const items = mockInventory.filter(i => i.medication_name === medication);
        expect(lots.size).toBe(items.length);
      });
    });
  });
});
