/**
 * E2E Tests for Dispensing Flow
 * Tests the complete medication dispensing workflow
 * Requires Electron - run with: npm run test:e2e:electron
 * (Browser mode lacks window.electron for login)
 */

import { test, expect } from '@playwright/test';

test.describe.skip('Dispensing Workflow', () => {
  // Login before each test - requires Electron (window.electron.staff.verify)
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:1212');

    const inputs = page.locator(
      'input[inputmode="numeric"], input[type="password"]',
    );
    await inputs.nth(0).fill('1');
    await inputs.nth(1).fill('2');
    await inputs.nth(2).fill('3');
    await inputs.nth(3).fill('4');

    await page.waitForSelector('text=Hyacinth', { timeout: 10000 });

    await page.getByRole('tab', { name: 'Entry Form' }).click();
  });

  // ============================================================================
  // Patient Selection Tests
  // ============================================================================
  test.describe('Patient Selection', () => {
    test('should open patient search', async ({ page }) => {
      await expect(
        page.locator('text=Search or scan a patient'),
      ).toBeVisible();
    });

    test('should search for patient by name', async ({ page }) => {
      await page
        .locator(
          'input[placeholder*="Search"], input[placeholder*="chart number"]',
        )
        .fill('Wilson');

      await expect(page.locator('text=James Wilson')).toBeVisible({
        timeout: 5000,
      });
    });

    test('should search for patient by chart number', async ({ page }) => {
      await page
        .locator(
          'input[placeholder*="Search"], input[placeholder*="chart number"]',
        )
        .fill('HC001234');

      await expect(page.locator('text=HC001234')).toBeVisible({
        timeout: 5000,
      });
    });

    test('should select patient from search results', async ({ page }) => {
      await page
        .locator(
          'input[placeholder*="Search"], input[placeholder*="chart number"]',
        )
        .fill('Wilson');
      await page.locator('text=James Wilson').first().click();

      await expect(page.locator('text=James Wilson')).toBeVisible();
      await expect(page.locator('text=HC001234')).toBeVisible();
    });

    test('should display patient details after selection', async ({
      page,
    }) => {
      await page
        .locator(
          'input[placeholder*="Search"], input[placeholder*="chart number"]',
        )
        .fill('Wilson');
      await page.locator('text=James Wilson').first().click();

      await expect(page.locator('text=DOB')).toBeVisible();
    });
  });

  // ============================================================================
  // Medication Selection Tests
  // ============================================================================
  test.describe('Medication Selection', () => {
    test.beforeEach(async ({ page }) => {
      await page
        .locator(
          'input[placeholder*="Search"], input[placeholder*="chart number"]',
        )
        .fill('Wilson');
      await page.locator('text=James Wilson').first().click();
    });

    test('should display medication selector', async ({ page }) => {
      await expect(
        page.locator('input[placeholder*="Search medication"]'),
      ).toBeVisible();
    });

    test('should list medications in selector', async ({ page }) => {
      await page.locator('input[placeholder*="Search medication"]').click();
      await page
        .locator('input[placeholder*="Search medication"]')
        .fill('Biktarvy');

      await expect(page.locator('text=Biktarvy')).toBeVisible({
        timeout: 5000,
      });
    });

    test('should select medication and show lot options', async ({
      page,
    }) => {
      await page.locator('input[placeholder*="Search medication"]').click();
      await page
        .locator('input[placeholder*="Search medication"]')
        .fill('Biktarvy');
      await page.locator('text=Biktarvy').first().click();

      await expect(page.locator('text=Lot')).toBeVisible();
    });
  });

  // ============================================================================
  // Dispensing Form Tests
  // ============================================================================
  test.describe('Dispensing Form', () => {
    test.beforeEach(async ({ page }) => {
      await page
        .locator(
          'input[placeholder*="Search"], input[placeholder*="chart number"]',
        )
        .fill('Wilson');
      await page.locator('text=James Wilson').first().click();

      await page.locator('input[placeholder*="Search medication"]').click();
      await page
        .locator('input[placeholder*="Search medication"]')
        .fill('Biktarvy');
      await page.locator('text=Biktarvy').first().click();
    });

    test('should have quantity input', async ({ page }) => {
      await expect(page.locator('label:has-text("Quantity") + input, input[type="number"]')).toBeVisible();
    });

    test('should have reason selector', async ({ page }) => {
      await expect(page.locator('text=Reason')).toBeVisible();
    });

    test('should have prescribed by field', async ({ page }) => {
      await expect(page.locator('text=Prescribed By')).toBeVisible();
    });

    test('should have prescribed date field', async ({ page }) => {
      await expect(page.locator('text=Prescribed Date')).toBeVisible();
    });

    test('should have Print or Submit option', async ({ page }) => {
      await expect(
        page.locator(
          'button:has-text("Print"), button:has-text("Submit"), button:has-text("Continue")',
        ).first(),
      ).toBeVisible();
    });
  });

  // ============================================================================
  // Complete Dispensing Tests
  // ============================================================================
  test.describe('Complete Dispensing', () => {
    test('should complete dispensing workflow', async ({ page }) => {
      await page
        .locator(
          'input[placeholder*="Search"], input[placeholder*="chart number"]',
        )
        .fill('Wilson');
      await page.locator('text=James Wilson').first().click();

      await page.locator('input[placeholder*="Search medication"]').click();
      await page
        .locator('input[placeholder*="Search medication"]')
        .fill('Biktarvy');
      await page.locator('text=Biktarvy').first().click();

      await page.locator('input[placeholder*="number"], input[type="number"]').first().fill('30');
      await page.locator('button:has-text("Continue"), button:has-text("Next")').first().click();

      await expect(page.locator('text=Reason')).toBeVisible();
    });
  });

  // ============================================================================
  // Void and Correction Tests
  // ============================================================================
  test.describe('Void and Correction', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('tab', { name: 'Dispensing Log' }).click();
    });

    test('should display dispensing log', async ({ page }) => {
      await expect(
        page.locator('text=Dispensing Log, text=Dispensing History'),
      ).toBeVisible();
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
    test('should show inventory tab', async ({ page }) => {
      await page.getByRole('tab', { name: 'Inventory' }).click();
      await expect(page.locator('text=Inventory').first()).toBeVisible();
    });
  });
});
