import { test, expect } from '@playwright/test';

test.describe('MediKiosk E2E Checks', () => {
  test('should load the patient kiosk and navigate to identification selection', async ({ page }) => {
    // 1. Go to the kiosk page
    await page.goto('/kiosk');

    // 2. Verify welcome header and subtitle
    await expect(page.locator('h2')).toContainText('Welcome to MediKiosk');
    await expect(page.getByText('Your AI-Assisted Patient Intake Companion')).toBeVisible();

    // 3. Verify department selection options are present
    const standardDeptBtn = page.getByRole('button', { name: 'General Medicine' });
    const ayushDeptBtn = page.getByRole('button', { name: 'Ayurveda (AYUSH)' });
    await expect(standardDeptBtn).toBeVisible();
    await expect(ayushDeptBtn).toBeVisible();

    // 4. Click the start button to enter the identification step
    const startBtn = page.getByRole('main').getByRole('button', { name: 'Start Check-In' });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // 5. Verify navigation to the method selection page
    await expect(page.locator('h2')).toContainText('How would you like to identify yourself?');
    
    // Check that various identification cards exist
    await expect(page.getByText('ABHA Health ID')).toBeVisible();
    await expect(page.getByText('Hospital Patient ID')).toBeVisible();
    await expect(page.getByText('Mobile Number Check')).toBeVisible();
  });

  test('should load the doctor portal login page and log in with real credentials', async ({ page }) => {
    await page.goto('/login');

    // Verify presence of doctor login text
    const pageBody = page.locator('body');
    await expect(pageBody).toContainText(/Doctor/i);

    // Fill credentials and log in
    await page.fill('#email-address', 'doctor@takecare.health');
    await page.fill('#password', 'Password123!');
    await page.click('button[type="submit"]');

    // Verify it redirects to the doctor dashboard (/doctor) and shows Case Queue
    await page.waitForURL('**/doctor');
    await expect(page.getByRole('heading', { name: 'Case Queue' })).toBeVisible();
  });

  test('should load the demo sandbox page', async ({ page }) => {
    await page.goto('/demo');

    // Verify demo title
    await expect(page.locator('h1')).toContainText('MediKiosk Demo Sandbox');
    await expect(page.locator('p')).toContainText('A pre-configured sandbox to demonstrate voice intake');
  });
});
