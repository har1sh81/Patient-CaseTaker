import { test, expect } from '@playwright/test';

test.describe('Phase 23 — Real Browser E2E Clinical Workflow Validation', () => {

  test('Golden Path 1: Patient Kiosk Check-In & Language Selection', async ({ page }) => {
    await page.goto('/kiosk');
    await expect(page.locator('h2')).toContainText(/Welcome to MediKiosk/i);

    // Select General Medicine
    const genMedBtn = page.getByRole('button', { name: /General Medicine/i });
    await expect(genMedBtn).toBeVisible();
    await genMedBtn.click();

    // Start Check-in
    const startBtn = page.getByRole('main').getByRole('button', { name: /Start Check-In/i });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // Navigation to lookup method selection
    await expect(page.locator('h2')).toContainText(/How would you like to identify yourself/i);
    await expect(page.getByText(/ABHA Health ID/i)).toBeVisible();
    await expect(page.getByText(/Hospital Patient ID/i)).toBeVisible();
  });

  test('Golden Path 2: Doctor Auth & Case Queue Access Security', async ({ page }) => {
    // 1. Unauthenticated doctor page access should redirect to login
    await page.goto('/doctor');
    await page.waitForURL('**/login**');
    await expect(page.locator('body')).toContainText(/Doctor Access Only/i);

    // 2. Doctor Login
    await page.fill('#email-address', 'doctor@takecare.health');
    await page.fill('#password', 'Password123!');
    await page.click('button[type="submit"]');

    // 3. Verify Case Queue loads cleanly
    await page.waitForURL('**/doctor');
    await expect(page.getByRole('heading', { name: /Case Queue/i })).toBeVisible();
  });

  test('Golden Path 3: Security & Unauthenticated API Rejection', async ({ request }) => {
    // Attempting unauthenticated access to doctor API routes must fail (401 / 403)
    const res = await request.get('/api/doctor/cases');
    expect([401, 403]).toContain(res.status());
  });

  test('Golden Path 4: Demo Sandbox Access', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.locator('h1')).toContainText(/MediKiosk Demo Sandbox/i);
  });

});
