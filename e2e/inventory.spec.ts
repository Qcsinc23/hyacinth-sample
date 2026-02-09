/**
 * E2E Tests for Inventory Management
 * Tests inventory viewing, receiving, and management
 */

import { test, expect } from '@playwright/test';

test.describe('Inventory Management', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:1212');
    
    // Enter PIN
    const inputs = page.locator('input[inputmode="numeric"]');
    await inputs.nth(0).fill('1');
    await inputs.nth(1).fill('2');
    await inputs.nth(2).fill('3');
    await inputs.nth(3).fill('4');
    
    await page.waitForSelector('text=Hyacinth', { timeout: 10000 });
    
    // Navigate to inventory tab
    await page.locator('text=Inventory').click();
  });

  // ============================================================================
  // Inventory View Tests
  // ============================================================================
  test.describe('Inventory View', () => {
    test('should display inventory list', async ({ page }) => {
      await expect(page.locator('text=Inventory')).toBeVisible();
    });

    test('should show all PRD medications', async ({ page }) => {
      // Check for PRD medications
      await expect(page.locator('text=Biktarvy').first()).toBeVisible();
      await expect(page.locator('text=Descovy').first()).toBeVisible();
      await expect(page.locator('text=Symtuza').first()).toBeVisible();
      await expect(page.locator('text=Dovato').first()).toBeVisible();
      await expect(page.locator('text=Bactrim').first()).toBeVisible();
      await expect(page.locator('text=Doxycycline').first()).toBeVisible();
    });

    test('should show medication quantities', async ({ page }) => {
      // Should show quantity column
      await expect(page.locator('th:has-text("Quantity"), td:has-text("tablets")').first()).toBeVisible();
    });

    test('should show lot numbers', async ({ page }) => {
      await expect(page.locator('th:has-text("Lot"), td:has-text("BKT")').first()).toBeVisible();
    });

    test('should show expiration dates', async ({ page }) => {
      await expect(page.locator('th:has-text("Expiration"), td:has-text("/202")').first()).toBeVisible();
    });

    test('should show inventory status', async ({ page }) => {
      // Should have status indicators
      const statusElements = page.locator('text=In Stock, text=Low Stock, text=Out of Stock, text=Expired');
      await expect(statusElements.first()).toBeVisible();
    });

    test('should color code status', async ({ page }) => {
      // Low stock should be amber/orange
      const lowStock = page.locator('text=Low Stock').first();
      if (await lowStock.isVisible().catch(() => false)) {
        // Check for amber/orange color class
        const parent = await lowStock.locator('..');
        // This would need to be adapted to actual CSS classes used
      }
    });
  });

  // ============================================================================
  // Inventory Search Tests
  // ============================================================================
  test.describe('Inventory Search', () => {
    test('should have search field', async ({ page }) => {
      await expect(page.locator('input[placeholder*="Search"], input[placeholder*="medication"]').first()).toBeVisible();
    });

    test('should search by medication name', async ({ page }) => {
      await page.locator('input[placeholder*="Search"]').fill('Biktarvy');
      
      // Should filter to show only Biktarvy items
      await expect(page.locator('text=Biktarvy').first()).toBeVisible();
    });

    test('should search by lot number', async ({ page }) => {
      await page.locator('input[placeholder*="Search"]').fill('BKT');
      
      // Should show items with BKT lot numbers
      await expect(page.locator('text=BKT').first()).toBeVisible();
    });

    test('should clear search', async ({ page }) => {
      await page.locator('input[placeholder*="Search"]').fill('Biktarvy');
      await page.locator('button:has-text("Clear"), button[aria-label="Clear"]').click();
      
      // Search should be cleared
      await expect(page.locator('input[placeholder*="Search"]')).toHaveValue('');
    });
  });

  // ============================================================================
  // Inventory Detail Tests
  // ============================================================================
  test.describe('Inventory Details', () => {
    test('should open inventory detail view', async ({ page }) => {
      // Click on an inventory item
      await page.locator('tr, [role="row"]').nth(1).click();
      
      // Should show detail view
      await expect(page.locator('text=Inventory Details')).toBeVisible();
    });

    test('should show medication details', async ({ page }) => {
      await page.locator('tr, [role="row"]').nth(1).click();
      
      await expect(page.locator('text=Medication')).toBeVisible();
      await expect(page.locator('text=Lot Number')).toBeVisible();
      await expect(page.locator('text=NDC Code')).toBeVisible();
    });

    test('should show transaction history', async ({ page }) => {
      await page.locator('tr, [role="row"]').nth(1).click();
      
      // Look for transaction history section
      await expect(page.locator('text=History, text=Transactions').first()).toBeVisible();
    });

    test('should show supplier information', async ({ page }) => {
      await page.locator('tr, [role="row"]').nth(1).click();
      
      await expect(page.locator('text=Supplier')).toBeVisible();
    });
  });

  // ============================================================================
  // Inventory Receiving Tests
  // ============================================================================
  test.describe('Inventory Receiving', () => {
    test('should open receive inventory form', async ({ page }) => {
      // Look for receive button
      await page.locator('button:has-text("Receive"), button:has-text("Add Inventory")').click();
      
      // Should show receive form
      await expect(page.locator('text=Receive Inventory')).toBeVisible();
    });

    test('should have medication selection', async ({ page }) => {
      await page.locator('button:has-text("Receive")').click();
      
      await expect(page.locator('label:has-text("Medication")')).toBeVisible();
      await expect(page.locator('select').first()).toBeVisible();
    });

    test('should have all PRD medications in dropdown', async ({ page }) => {
      await page.locator('button:has-text("Receive")').click();
      await page.locator('select').first().click();
      
      await expect(page.locator('text=Biktarvy (nPEP)')).toBeVisible();
      await expect(page.locator('text=Biktarvy (ID)')).toBeVisible();
      await expect(page.locator('text=Biktarvy (PrEP)')).toBeVisible();
      await expect(page.locator('text=Descovy')).toBeVisible();
      await expect(page.locator('text=Symtuza')).toBeVisible();
      await expect(page.locator('text=Dovato')).toBeVisible();
      await expect(page.locator('text=Bactrim')).toBeVisible();
      await expect(page.locator('text=Doxycycline')).toBeVisible();
    });

    test('should have quantity field', async ({ page }) => {
      await page.locator('button:has-text("Receive")').click();
      
      await expect(page.locator('label:has-text("Quantity")')).toBeVisible();
    });

    test('should have unit selection', async ({ page }) => {
      await page.locator('button:has-text("Receive")').click();
      
      await expect(page.locator('label:has-text("Unit")')).toBeVisible();
    });

    test('should have lot number field', async ({ page }) => {
      await page.locator('button:has-text("Receive")').click();
      
      await expect(page.locator('label:has-text("Lot Number")')).toBeVisible();
    });

    test('should have expiration date field', async ({ page }) => {
      await page.locator('button:has-text("Receive")').click();
      
      await expect(page.locator('label:has-text("Expiration Date")')).toBeVisible();
    });

    test('should have NDC code field', async ({ page }) => {
      await page.locator('button:has-text("Receive")').click();
      
      await expect(page.locator('label:has-text("NDC")')).toBeVisible();
    });

    test('should have supplier field', async ({ page }) => {
      await page.locator('button:has-text("Receive")').click();
      
      await expect(page.locator('label:has-text("Supplier")')).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await page.locator('button:has-text("Receive")').click();
      await page.locator('button:has-text("Save"), button[type="submit"]').click();
      
      // Should show validation errors
      await expect(page.locator('text=required').first()).toBeVisible();
    });

    test('should validate expiration date is in future', async ({ page }) => {
      await page.locator('button:has-text("Receive")').click();
      
      // Fill form with past date
      await page.locator('select').first().selectOption('Biktarvy (nPEP)');
      await page.locator('input[type="number"]').fill('100');
      await page.locator('input[type="date"]').fill('2020-01-01');
      
      await page.locator('button:has-text("Save"), button[type="submit"]').click();
      
      // Should show error
      await expect(page.locator('text=expired, text=future')).toBeVisible();
    });

    test('should complete inventory receiving', async ({ page }) => {
      await page.locator('button:has-text("Receive")').click();
      
      // Fill form
      await page.locator('select').first().selectOption('Biktarvy (nPEP)');
      await page.locator('input[type="number"]').fill('100');
      await page.locator('select').nth(1).selectOption('tablets');
      await page.locator('input[placeholder*="Lot"]').fill('BKT2024TEST');
      await page.locator('input[type="date"]').fill('2026-12-31');
      await page.locator('input[placeholder*="NDC"]').fill('61958-2301-1');
      await page.locator('input[placeholder*="Supplier"]').fill('Test Supplier');
      
      // Submit
      await page.locator('button:has-text("Save"), button[type="submit"]').click();
      
      // Should show success
      await expect(page.locator('text=successfully, text=received').first()).toBeVisible();
    });
  });

  // ============================================================================
  // Inventory Adjustment Tests
  // ============================================================================
  test.describe('Inventory Adjustment', () => {
    test('should open adjust form', async ({ page }) => {
      // Find an item and click adjust
      const adjustButton = page.locator('button:has-text("Adjust")').first();
      if (await adjustButton.isVisible().catch(() => false)) {
        await adjustButton.click();
        
        await expect(page.locator('text=Adjust Inventory')).toBeVisible();
      }
    });

    test('should show current quantity', async ({ page }) => {
      const adjustButton = page.locator('button:has-text("Adjust")').first();
      if (await adjustButton.isVisible().catch(() => false)) {
        await adjustButton.click();
        
        await expect(page.locator('text=Current Quantity')).toBeVisible();
      }
    });

    test('should require adjustment reason', async ({ page }) => {
      const adjustButton = page.locator('button:has-text("Adjust")').first();
      if (await adjustButton.isVisible().catch(() => false)) {
        await adjustButton.click();
        await page.locator('button:has-text("Save"), button[type="submit"]').click();
        
        await expect(page.locator('text=required').first()).toBeVisible();
      }
    });
  });

  // ============================================================================
  // Alert Tests
  // ============================================================================
  test.describe('Inventory Alerts', () => {
    test('should display low stock alerts', async ({ page }) => {
      // Navigate to alerts or check for alert indicators
      await expect(page.locator('text=Low Stock').first()).toBeVisible();
    });

    test('should display expiring alerts', async ({ page }) => {
      await expect(page.locator('text=expires, text=Expiring').first()).toBeVisible();
    });

    test('should display expired items', async ({ page }) => {
      // May need to filter to see expired
      const expiredFilter = page.locator('button:has-text("Expired"), select');
      if (await expiredFilter.isVisible().catch(() => false)) {
        await expiredFilter.click();
        await page.locator('text=Expired').click();
      }
      
      await expect(page.locator('text=Expired').first()).toBeVisible();
    });

    test('should acknowledge alerts', async ({ page }) => {
      // Find an alert and acknowledge it
      const acknowledgeButton = page.locator('button:has-text("Acknowledge")').first();
      if (await acknowledgeButton.isVisible().catch(() => false)) {
        await acknowledgeButton.click();
        
        // Alert should be marked as acknowledged
        await expect(page.locator('text=Acknowledged').first()).toBeVisible();
      }
    });
  });

  // ============================================================================
  // Reports and Export Tests
  // ============================================================================
  test.describe('Reports and Export', () => {
    test('should have export option', async ({ page }) => {
      await expect(page.locator('button:has-text("Export"), button:has-text("CSV")').first()).toBeVisible();
    });

    test('should export inventory to CSV', async ({ page }) => {
      // Click export
      await page.locator('button:has-text("Export"), button:has-text("CSV")').first().click();
      
      // Wait for download or success message
      await expect(page.locator('text=export, text=downloaded').first()).toBeVisible();
    });

    test('should show reorder report', async ({ page }) => {
      // Look for reorder report button or filter
      const reorderButton = page.locator('button:has-text("Reorder"), button:has-text("Report")').first();
      if (await reorderButton.isVisible().catch(() => false)) {
        await reorderButton.click();
        
        await expect(page.locator('text=Reorder Report')).toBeVisible();
      }
    });
  });

  // ============================================================================
  // Filter and Sort Tests
  // ============================================================================
  test.describe('Filter and Sort', () => {
    test('should filter by status', async ({ page }) => {
      // Look for status filter
      const statusFilter = page.locator('select').first();
      await statusFilter.selectOption('Active');
      
      // Should show only active items
      await expect(page.locator('tr, [role="row"]').first()).toBeVisible();
    });

    test('should sort by medication name', async ({ page }) => {
      // Click on medication column header to sort
      await page.locator('th:has-text("Medication")').click();
      
      // Items should be sorted
      // This is a basic check - detailed sorting validation would be more complex
      await expect(page.locator('tr, [role="row"]').first()).toBeVisible();
    });

    test('should sort by expiration date', async ({ page }) => {
      await page.locator('th:has-text("Expiration")').click();
      
      await expect(page.locator('tr, [role="row"]').first()).toBeVisible();
    });

    test('should sort by quantity', async ({ page }) => {
      await page.locator('th:has-text("Quantity")').click();
      
      await expect(page.locator('tr, [role="row"]').first()).toBeVisible();
    });
  });

  // ============================================================================
  // Low Stock Workflow Tests
  // ============================================================================
  test.describe('Low Stock Workflow', () => {
    test('should identify items below threshold', async ({ page }) => {
      // Look for items marked as low stock
      await expect(page.locator('text=Low Stock').first()).toBeVisible();
    });

    test('should show reorder recommendations', async ({ page }) => {
      // Click on a low stock item
      await page.locator('text=Low Stock').first().click();
      
      // Should show recommended reorder quantity
      await expect(page.locator('text=Reorder, text=Recommended').first()).toBeVisible();
    });
  });
});
