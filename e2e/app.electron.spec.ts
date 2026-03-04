/**
 * E2E Tests for Hyacinth - Electron App
 * Requires: npm run build (or package) first
 * Runs against the built Electron app
 */
import {
  test,
  expect,
  _electron as electron,
  Page,
  ElectronApplication,
} from '@playwright/test';
import path from 'path';

const mainPath = path.join(__dirname, '..', 'release', 'app', 'dist', 'main', 'main.js');

test.describe.serial('Hyacinth Electron App', () => {
  let page: Page;
  let electronApp: ElectronApplication;

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [mainPath],
      env: { ...process.env, NODE_ENV: 'production', HYACINTH_E2E_TEST: '1' },
      timeout: 60000,
    });
    page = await electronApp.firstWindow();
    page.on('console', (msg) => console.log('[Renderer]', msg.text()));
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('shows login screen', async () => {
    await expect(page.locator('text=Hyacinth')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Enter your PIN')).toBeVisible();
    const pinInputs = page.locator('input[inputmode="numeric"], input[type="password"]');
    await expect(pinInputs).toHaveCount(4);
  });

  test('accepts PIN and navigates after login', async () => {
    const inputs = page.locator('input[inputmode="numeric"], input[type="password"]');
    await inputs.nth(0).fill('1');
    await inputs.nth(1).fill('2');
    await inputs.nth(2).fill('3');
    await inputs.nth(3).fill('4');
    await expect(page.getByRole('tab', { name: 'Entry Form' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('tab', { name: 'Inventory' })).toBeVisible();
  });

  test('shows Entry Form tab and step flow', async () => {
    await expect(page.locator('text=New Dispensing Entry')).toBeVisible();
    await expect(page.getByText('Search or scan a patient').or(page.getByText('Add Medication')).first()).toBeVisible({ timeout: 5000 });
  });

  test('has navigation tabs', async () => {
    await expect(page.getByRole('tab', { name: 'Entry Form' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Dispensing Log' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Inventory' })).toBeVisible();
  });

});
