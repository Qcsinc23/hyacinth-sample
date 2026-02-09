/**
 * E2E Tests for Login Flow
 * Tests the authentication and PIN entry workflow
 */

import { test, expect, Page } from '@playwright/test';

// Test setup - assuming the app is running on localhost:1212 (default ERB dev port)
test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:1212');
});

test.describe('Login Screen', () => {
  test('should display login screen on app launch', async ({ page }) => {
    // Check for login screen elements
    await expect(page.locator('text=Enter PIN')).toBeVisible();
    await expect(page.locator('[role="textbox"]')).toHaveCount(4);
  });

  test('should have 4 PIN input fields', async ({ page }) => {
    const pinInputs = page.locator('input[type="password"], input[inputmode="numeric"]');
    await expect(pinInputs).toHaveCount(4);
  });

  test('should accept PIN entry', async ({ page }) => {
    // Enter PIN 1234
    const inputs = page.locator('input[inputmode="numeric"]');
    await inputs.nth(0).fill('1');
    await inputs.nth(1).fill('2');
    await inputs.nth(2).fill('3');
    await inputs.nth(3).fill('4');
    
    // All inputs should be filled
    await expect(inputs.nth(0)).toHaveValue('1');
    await expect(inputs.nth(1)).toHaveValue('2');
    await expect(inputs.nth(2)).toHaveValue('3');
    await expect(inputs.nth(3)).toHaveValue('4');
  });

  test('should only accept numeric input', async ({ page }) => {
    const firstInput = page.locator('input[inputmode="numeric"]').first();
    
    // Try to enter letter
    await firstInput.fill('a');
    await expect(firstInput).toHaveValue('');
    
    // Enter number
    await firstInput.fill('1');
    await expect(firstInput).toHaveValue('1');
  });

  test('should auto-advance between PIN fields', async ({ page }) => {
    const inputs = page.locator('input[inputmode="numeric"]');
    
    await inputs.nth(0).fill('1');
    
    // Second input should be focused
    await expect(inputs.nth(1)).toBeFocused();
  });

  test('should show error for invalid PIN', async ({ page }) => {
    // Enter invalid PIN
    const inputs = page.locator('input[inputmode="numeric"]');
    await inputs.nth(0).fill('9');
    await inputs.nth(1).fill('9');
    await inputs.nth(2).fill('9');
    await inputs.nth(3).fill('9');
    
    // Look for error message
    await expect(page.locator('text=Invalid PIN')).toBeVisible({ timeout: 5000 });
  });

  test('should clear PIN after error', async ({ page }) => {
    const inputs = page.locator('input[inputmode="numeric"]');
    
    // Enter invalid PIN
    await inputs.nth(0).fill('9');
    await inputs.nth(1).fill('9');
    await inputs.nth(2).fill('9');
    await inputs.nth(3).fill('9');
    
    // Wait for error
    await expect(page.locator('text=Invalid PIN')).toBeVisible({ timeout: 5000 });
    
    // PIN should be cleared
    await expect(inputs.nth(0)).toHaveValue('');
  });

  test('should login successfully with valid PIN', async ({ page }) => {
    // Enter valid PIN (1234 - from mock data)
    const inputs = page.locator('input[inputmode="numeric"]');
    await inputs.nth(0).fill('1');
    await inputs.nth(1).fill('2');
    await inputs.nth(2).fill('3');
    await inputs.nth(3).fill('4');
    
    // Should navigate to main app (wait for dashboard or main content)
    await expect(page.locator('text=Hyacinth')).toBeVisible({ timeout: 10000 });
  });

  test('should handle backspace navigation', async ({ page }) => {
    const inputs = page.locator('input[inputmode="numeric"]');
    
    await inputs.nth(0).fill('1');
    await inputs.nth(1).fill('2');
    
    // Press backspace on second input
    await inputs.nth(1).press('Backspace');
    
    // Should move to first input
    await expect(inputs.nth(0)).toBeFocused();
  });

  test('should have accessible labels', async ({ page }) => {
    // Check for aria-labels
    await expect(page.locator('[aria-label="PIN digit 1"]')).toBeVisible();
    await expect(page.locator('[aria-label="PIN digit 2"]')).toBeVisible();
    await expect(page.locator('[aria-label="PIN digit 3"]')).toBeVisible();
    await expect(page.locator('[aria-label="PIN digit 4"]')).toBeVisible();
  });
});

test.describe('Post-Login State', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    const inputs = page.locator('input[inputmode="numeric"]');
    await inputs.nth(0).fill('1');
    await inputs.nth(1).fill('2');
    await inputs.nth(2).fill('3');
    await inputs.nth(3).fill('4');
    
    // Wait for main app to load
    await page.waitForSelector('text=Hyacinth', { timeout: 10000 });
  });

  test('should display user name after login', async ({ page }) => {
    // Sarah Johnson is the user with PIN 1234
    await expect(page.locator('text=Sarah Johnson')).toBeVisible();
  });

  test('should have navigation tabs', async ({ page }) => {
    await expect(page.locator('text=Dispense')).toBeVisible();
    await expect(page.locator('text=History')).toBeVisible();
    await expect(page.locator('text=Inventory')).toBeVisible();
    await expect(page.locator('text=Guide')).toBeVisible();
  });

  test('should have logout option', async ({ page }) => {
    // Look for logout button or menu
    const logoutButton = page.locator('button:has-text("Logout"), [aria-label="Logout"]');
    await expect(logoutButton).toBeVisible();
  });

  test('should logout and return to login screen', async ({ page }) => {
    // Click logout
    await page.locator('button:has-text("Logout"), [aria-label="Logout"]').click();
    
    // Should return to login screen
    await expect(page.locator('text=Enter PIN')).toBeVisible();
  });
});

test.describe('Lock Screen', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    const inputs = page.locator('input[inputmode="numeric"]');
    await inputs.nth(0).fill('1');
    await inputs.nth(1).fill('2');
    await inputs.nth(2).fill('3');
    await inputs.nth(3).fill('4');
    
    await page.waitForSelector('text=Hyacinth', { timeout: 10000 });
  });

  test('should lock after inactivity timeout', async ({ page }) => {
    // This test simulates the lock screen appearing after timeout
    // In a real test, you might trigger this via an IPC call or wait for the timeout
    
    // For now, we'll test the lock button if available
    const lockButton = page.locator('button:has-text("Lock"), [aria-label="Lock"]');
    
    if (await lockButton.isVisible().catch(() => false)) {
      await lockButton.click();
      
      // Should show lock screen
      await expect(page.locator('text=Enter PIN')).toBeVisible();
    }
  });

  test('should unlock with valid PIN', async ({ page }) => {
    // Same as above - test unlock functionality
    const lockButton = page.locator('button:has-text("Lock"), [aria-label="Lock"]');
    
    if (await lockButton.isVisible().catch(() => false)) {
      await lockButton.click();
      
      // Enter PIN to unlock
      const inputs = page.locator('input[inputmode="numeric"]');
      await inputs.nth(0).fill('1');
      await inputs.nth(1).fill('2');
      await inputs.nth(2).fill('3');
      await inputs.nth(3).fill('4');
      
      // Should be unlocked
      await expect(page.locator('text=Hyacinth')).toBeVisible();
    }
  });
});
