/**
 * E2E Tests for Login Flow
 * Tests the authentication and PIN entry workflow
 * Note: Full login and post-login tests require Electron (run test:e2e:electron).
 * Browser mode tests only the login screen DOM.
 */

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:1212');
});

test.describe('Login Screen', () => {
  test('should display login screen on app launch', async ({ page }) => {
    await expect(page.locator('text=Enter your PIN')).toBeVisible();
    const pinInputs = page.locator('input[inputmode="numeric"], input[type="password"]');
    await expect(pinInputs).toHaveCount(4);
  });

  test('should have 4 PIN input fields', async ({ page }) => {
    const pinInputs = page.locator(
      'input[type="password"], input[inputmode="numeric"]',
    );
    await expect(pinInputs).toHaveCount(4);
  });

  test('should accept PIN entry', async ({ page }) => {
    const inputs = page.locator('input[inputmode="numeric"], input[type="password"]');
    await inputs.nth(0).fill('1');
    await inputs.nth(1).fill('2');
    await inputs.nth(2).fill('3');
    await inputs.nth(3).fill('4');

    await expect(inputs.nth(0)).toHaveValue('1');
    await expect(inputs.nth(1)).toHaveValue('2');
    await expect(inputs.nth(2)).toHaveValue('3');
    await expect(inputs.nth(3)).toHaveValue('4');
  });

  test('should only accept numeric input', async ({ page }) => {
    const firstInput = page.locator(
      'input[inputmode="numeric"], input[type="password"]',
    ).first();
    await firstInput.fill('a');
    await expect(firstInput).toHaveValue('');
    await firstInput.fill('1');
    await expect(firstInput).toHaveValue('1');
  });

  test('should auto-advance between PIN fields', async ({ page }) => {
    const inputs = page.locator(
      'input[inputmode="numeric"], input[type="password"]',
    );
    await inputs.nth(0).fill('1');
    await expect(inputs.nth(1)).toBeFocused();
  });

  test('should handle backspace navigation', async ({ page }) => {
    const inputs = page.locator(
      'input[inputmode="numeric"], input[type="password"]',
    );
    await inputs.nth(0).fill('1');
    await inputs.nth(1).fill('2');
    await inputs.nth(1).press('Backspace');
    await expect(inputs.nth(0)).toBeFocused();
  });

  test('should show error for invalid PIN', async ({ page }) => {
    const inputs = page.locator(
      'input[inputmode="numeric"], input[type="password"]',
    );
    await inputs.nth(0).fill('9');
    await inputs.nth(1).fill('9');
    await inputs.nth(2).fill('9');
    await inputs.nth(3).fill('9');

    await expect(
      page.locator(
        'text=Invalid PIN, text=Application API is not available, text=An error occurred',
      ),
    ).toBeVisible({ timeout: 8000 });
  });

  test('should have accessible labels', async ({ page }) => {
    await expect(page.locator('[aria-label="PIN digit 1"]')).toBeVisible();
    await expect(page.locator('[aria-label="PIN digit 2"]')).toBeVisible();
    await expect(page.locator('[aria-label="PIN digit 3"]')).toBeVisible();
    await expect(page.locator('[aria-label="PIN digit 4"]')).toBeVisible();
  });

  test('should display Hyacinth branding', async ({ page }) => {
    await expect(page.locator('text=Hyacinth')).toBeVisible();
  });
});
