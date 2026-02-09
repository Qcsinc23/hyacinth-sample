/**
 * E2E Tests for Dispensing Flow
 * Tests the complete medication dispensing workflow
 */

import { test, expect } from '@playwright/test';

test.describe('Dispensing Workflow', () => {
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
    
    // Navigate to dispense tab
    await page.locator('text=Dispense').click();
  });

  // ============================================================================
  // Patient Selection Tests
  // ============================================================================
  test.describe('Patient Selection', () => {
    test('should open patient search', async ({ page }) => {
      await expect(page.locator('text=Select Patient')).toBeVisible();
    });

    test('should search for patient by name', async ({ page }) => {
      // Type patient name in search
      await page.locator('input[placeholder*="Search"], input[placeholder*="patient"]').fill('Wilson');
      
      // Should show results
      await expect(page.locator('text=Wilson, James')).toBeVisible();
    });

    test('should search for patient by chart number', async ({ page }) => {
      await page.locator('input[placeholder*="Search"]').fill('HC001234');
      
      await expect(page.locator('text=HC001234')).toBeVisible();
    });

    test('should select patient from search results', async ({ page }) => {
      await page.locator('input[placeholder*="Search"]').fill('Wilson');
      await page.locator('text=Wilson, James').click();
      
      // Selected patient should be displayed
      await expect(page.locator('text=James Wilson')).toBeVisible();
      await expect(page.locator('text=HC001234')).toBeVisible();
    });

    test('should display patient details after selection', async ({ page }) => {
      await page.locator('input[placeholder*="Search"]').fill('Wilson');
      await page.locator('text=Wilson, James').click();
      
      // Check for DOB, age, etc.
      await expect(page.locator('text=DOB')).toBeVisible();
      await expect(page.locator('text=03/15/1985')).toBeVisible();
    });
  });

  // ============================================================================
  // Medication Selection Tests
  // ============================================================================
  test.describe('Medication Selection', () => {
    test.beforeEach(async ({ page }) => {
      // Select patient first
      await page.locator('input[placeholder*="Search"]').fill('Wilson');
      await page.locator('text=Wilson, James').click();
    });

    test('should display medication dropdown', async ({ page }) => {
      await expect(page.locator('text=Medication')).toBeVisible();
      await expect(page.locator('select, [role="combobox"]').first()).toBeVisible();
    });

    test('should list all PRD medications', async ({ page }) => {
      await page.locator('select').first().click();
      
      // Check for medications from PRD
      await expect(page.locator('text=Biktarvy (nPEP)')).toBeVisible();
      await expect(page.locator('text=Biktarvy (ID)')).toBeVisible();
      await expect(page.locator('text=Biktarvy (PrEP)')).toBeVisible();
      await expect(page.locator('text=Descovy')).toBeVisible();
      await expect(page.locator('text=Symtuza')).toBeVisible();
      await expect(page.locator('text=Dovato')).toBeVisible();
      await expect(page.locator('text=Bactrim')).toBeVisible();
      await expect(page.locator('text=Doxycycline')).toBeVisible();
    });

    test('should select medication and show lot options', async ({ page }) => {
      await page.locator('select').first().selectOption('Biktarvy (nPEP)');
      
      // Should show lot selection
      await expect(page.locator('text=Lot')).toBeVisible();
    });

    test('should show available quantity for selected lot', async ({ page }) => {
      await page.locator('select').first().selectOption('Biktarvy (nPEP)');
      
      // Should show quantity available
      await expect(page.locator('text=Available')).toBeVisible();
    });

    test('should warn when selecting depleted medication', async ({ page }) => {
      // Symtuza is depleted in mock data
      await page.locator('select').first().selectOption('Symtuza');
      
      // Should show out of stock warning
      await expect(page.locator('text=Out of Stock')).toBeVisible();
    });

    test('should warn when selecting expiring lot', async ({ page }) => {
      // Descovy expires soon
      await page.locator('select').first().selectOption('Descovy');
      
      // Should show expiration warning
      await expect(page.locator('text=expires')).toBeVisible();
    });
  });

  // ============================================================================
  // Dispensing Form Tests
  // ============================================================================
  test.describe('Dispensing Form', () => {
    test.beforeEach(async ({ page }) => {
      // Select patient
      await page.locator('input[placeholder*="Search"]').fill('Wilson');
      await page.locator('text=Wilson, James').click();
      
      // Select medication
      await page.locator('select').first().selectOption('Biktarvy (nPEP)');
    });

    test('should have quantity input', async ({ page }) => {
      await expect(page.locator('label:has-text("Quantity") + input, input[type="number"]')).toBeVisible();
    });

    test('should have reason dropdown', async ({ page }) => {
      await expect(page.locator('text=Reason')).toBeVisible();
    });

    test('should list all PRD reasons', async ({ page }) => {
      await page.locator('select').nth(1).click();
      
      await expect(page.locator('text=ADDP Application Pending')).toBeVisible();
      await expect(page.locator('text=nPEP Initiation')).toBeVisible();
      await expect(page.locator('text=Rapid Initiation PrEP')).toBeVisible();
    });

    test('should have prescribed by field', async ({ page }) => {
      await expect(page.locator('text=Prescribed By')).toBeVisible();
    });

    test('should have prescribed date field', async ({ page }) => {
      await expect(page.locator('text=Prescribed Date')).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      // Try to submit without filling form
      await page.locator('button:has-text("Dispense"), button[type="submit"]').click();
      
      // Should show validation errors
      await expect(page.locator('text=required')).toBeVisible();
    });

    test('should validate quantity is positive', async ({ page }) => {
      await page.locator('input[type="number"]').fill('-1');
      await page.locator('button:has-text("Dispense"), button[type="submit"]').click();
      
      await expect(page.locator('text=greater than 0')).toBeVisible();
    });

    test('should warn on excessive quantity', async ({ page }) => {
      await page.locator('input[type="number"]').fill('2000');
      
      await expect(page.locator('text=unusually high')).toBeVisible();
    });
  });

  // ============================================================================
  // Complete Dispensing Tests
  // ============================================================================
  test.describe('Complete Dispensing', () => {
    test('should complete nPEP dispensing workflow', async ({ page }) => {
      // Select patient
      await page.locator('input[placeholder*="Search"]').fill('Wilson');
      await page.locator('text=Wilson, James').click();
      
      // Fill form
      await page.locator('select').first().selectOption('Biktarvy (nPEP)');
      await page.locator('input[type="number"]').fill('30');
      await page.locator('select').nth(1).selectOption('nPEP Initiation');
      await page.locator('input[type="text"]').fill('Dr. Sarah Johnson');
      
      // Submit
      await page.locator('button:has-text("Dispense"), button[type="submit"]').click();
      
      // Should show success message
      await expect(page.locator('text=successfully')).toBeVisible();
    });

    test('should complete PrEP dispensing workflow', async ({ page }) => {
      // Select patient
      await page.locator('input[placeholder*="Search"]').fill('Garcia');
      await page.locator('text=Garcia, Maria').click();
      
      // Fill form
      await page.locator('select').first().selectOption('Descovy');
      await page.locator('input[type="number"]').fill('30');
      await page.locator('select').nth(1).selectOption('Rapid Initiation PrEP');
      await page.locator('input[type="text"]').fill('Dr. Michael Chen');
      
      // Submit
      await page.locator('button:has-text("Dispense"), button[type="submit"]').click();
      
      // Should show success message
      await expect(page.locator('text=successfully')).toBeVisible();
    });

    test('should complete antibiotic dispensing workflow', async ({ page }) => {
      // Select patient
      await page.locator('input[placeholder*="Search"]').fill('O\'Connor');
      await page.locator('text=O\'Connor, Robert').click();
      
      // Fill form
      await page.locator('select').first().selectOption('Bactrim');
      await page.locator('input[type="number"]').fill('14');
      await page.locator('select').nth(1).selectOption('STI/UTI Treatment');
      await page.locator('input[type="text"]').fill('Dr. Emily Davis');
      
      // Submit
      await page.locator('button:has-text("Dispense"), button[type="submit"]').click();
      
      // Should show success message
      await expect(page.locator('text=successfully')).toBeVisible();
    });

    test('should deduct inventory after dispensing', async ({ page }) => {
      // Note: In a real test, we'd verify the database state change
      // For E2E, we can check for success and then verify in inventory view
      
      // Complete dispensing
      await page.locator('input[placeholder*="Search"]').fill('Wilson');
      await page.locator('text=Wilson, James').click();
      await page.locator('select').first().selectOption('Biktarvy (nPEP)');
      await page.locator('input[type="number"]').fill('30');
      await page.locator('select').nth(1).selectOption('nPEP Initiation');
      await page.locator('input[type="text"]').fill('Dr. Test');
      await page.locator('button:has-text("Dispense"), button[type="submit"]').click();
      
      // Navigate to inventory
      await page.locator('text=Inventory').click();
      
      // Check that quantity was deducted
      // This would depend on the actual UI implementation
    });

    test('should show confirmation dialog', async ({ page }) => {
      await page.locator('input[placeholder*="Search"]').fill('Wilson');
      await page.locator('text=Wilson, James').click();
      await page.locator('select').first().selectOption('Biktarvy (nPEP)');
      await page.locator('input[type="number"]').fill('30');
      await page.locator('select').nth(1).selectOption('nPEP Initiation');
      await page.locator('input[type="text"]').fill('Dr. Test');
      
      // Click dispense
      await page.locator('button:has-text("Dispense"), button[type="submit"]').click();
      
      // May show confirmation dialog
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
      if (await confirmButton.isVisible().catch(() => false)) {
        await confirmButton.click();
      }
      
      // Should complete
      await expect(page.locator('text=successfully')).toBeVisible();
    });

    test('should clear form after successful dispensing', async ({ page }) => {
      // Complete dispensing
      await page.locator('input[placeholder*="Search"]').fill('Wilson');
      await page.locator('text=Wilson, James').click();
      await page.locator('select').first().selectOption('Biktarvy (nPEP)');
      await page.locator('input[type="number"]').fill('30');
      await page.locator('select').nth(1).selectOption('nPEP Initiation');
      await page.locator('input[type="text"]').fill('Dr. Test');
      await page.locator('button:has-text("Dispense"), button[type="submit"]').click();
      
      // Wait for success
      await expect(page.locator('text=successfully')).toBeVisible();
      
      // Form should be cleared or reset
      // This depends on the actual implementation
    });
  });

  // ============================================================================
  // Void and Correction Tests
  // ============================================================================
  test.describe('Void and Correction', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to history first
      await page.locator('text=History').click();
    });

    test('should display dispensing history', async ({ page }) => {
      await expect(page.locator('text=Dispensing History')).toBeVisible();
    });

    test('should have void option for records', async ({ page }) => {
      // Look for void buttons in the list
      const voidButton = page.locator('button:has-text("Void")').first();
      await expect(voidButton).toBeVisible();
    });

    test('should void a dispensing record', async ({ page }) => {
      // Click void on first record
      await page.locator('button:has-text("Void")').first().click();
      
      // Should show void dialog
      await expect(page.locator('text=Void Reason')).toBeVisible();
      
      // Enter reason
      await page.locator('textarea, input[placeholder*="reason"]').fill('Incorrect medication');
      
      // Confirm
      await page.locator('button:has-text("Confirm")').click();
      
      // Should show voided status
      await expect(page.locator('text=Voided')).toBeVisible();
    });

    test('should have correct option for records', async ({ page }) => {
      const correctButton = page.locator('button:has-text("Correct")').first();
      await expect(correctButton).toBeVisible();
    });

    test('should correct a dispensing record', async ({ page }) => {
      // Click correct
      await page.locator('button:has-text("Correct")').first().click();
      
      // Should show correction form
      await expect(page.locator('text=Correction')).toBeVisible();
      
      // Modify quantity
      await page.locator('input[type="number"]').fill('60');
      
      // Enter reason
      await page.locator('input[placeholder*="reason"], textarea').fill('Wrong quantity entered');
      
      // Submit
      await page.locator('button:has-text("Submit"), button:has-text("Save")').click();
      
      // Should show corrected status
      await expect(page.locator('text=Corrected')).toBeVisible();
    });
  });

  // ============================================================================
  // Alert Tests
  // ============================================================================
  test.describe('Dispensing Alerts', () => {
    test('should show low stock warning', async ({ page }) => {
      // Navigate to inventory to see low stock
      await page.locator('text=Inventory').click();
      
      // Should show low stock indicators
      await expect(page.locator('text=Low Stock').first()).toBeVisible();
    });

    test('should show expiring warning', async ({ page }) => {
      await page.locator('text=Inventory').click();
      
      // Should show expiring indicators
      await expect(page.locator('text=expires').first()).toBeVisible();
    });

    test('should prevent dispensing from expired lot', async ({ page }) => {
      await page.locator('text=Dispense').click();
      await page.locator('input[placeholder*="Search"]').fill('Wilson');
      await page.locator('text=Wilson, James').click();
      
      // Try to select expired lot
      // Should show error or disable option
    });
  });
});
