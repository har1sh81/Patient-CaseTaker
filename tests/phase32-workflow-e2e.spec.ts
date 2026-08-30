import { test, expect } from '@playwright/test';

test.describe('Phase 32 — Patient Completion → PDF → Doctor Workflow E2E', () => {
  test('complete patient intake flow and verify doctor dashboard & PDF availability', async ({ page }) => {
    // 1. Start at kiosk start page
    await page.goto('/kiosk');
    await expect(page).toHaveURL(/\/kiosk/);

    // Create session via server API endpoint so it exists in Next.js backend
    const createRes = await page.request.post('/api/kiosk/session', {
      data: {
        patient: {
          id: `pat_e2e_${Date.now()}`,
          demographics: { firstName: 'E2E', fullName: 'E2E Test Patient', age: 30, gender: 'other' },
          identification: {},
          createdAt: new Date().toISOString()
        },
        language: 'en',
        departmentMode: 'standard'
      }
    });
    expect(createRes.ok()).toBeTruthy();
    const sessionData = await createRes.json();
    const sessionId = sessionData.session.id;
    expect(sessionId).toBeTruthy();

    // 3. Navigate directly to Review page to test Review & Completion state
    await page.goto(`/kiosk/review?sessionId=${sessionId}`);

    // Verify Review page headers
    await page.waitForSelector('text=Review your information', { timeout: 15000 });
    await expect(page.getByText('Review your information')).toBeVisible();
    await expect(page.getByText('Current Problem')).toBeVisible();
    await expect(page.getByText('Past History')).toBeVisible();

    // 4. Click Send to Doctor / Confirm
    await page.locator('#confirm-cb').evaluate((el: any) => {
      el.checked = true;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const sendBtn = page.locator('button', { hasText: /Send to Doctor/i });
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();

    // 5. Verify Final Completion Page Requirements
    await expect(page.locator('text=Your information has been successfully submitted.')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Your clinical summary has been prepared for the doctor.')).toBeVisible();

    // Verify status checklist items
    await expect(page.locator('text=Information confirmed')).toBeVisible();
    await expect(page.locator('text=Clinical summary created')).toBeVisible();
    await expect(page.locator('text=PDF generated')).toBeVisible();
    await expect(page.locator('text=Sent to Doctor Dashboard')).toBeVisible();

    // Verify Assigned Practitioner Card
    await expect(page.locator('text=Assigned Practitioner')).toBeVisible();
    await expect(page.locator('text=Consultation Room')).toBeVisible();

    // Verify Finish Button
    const finishBtn = page.locator('button', { hasText: /^Finish$/i });
    await expect(finishBtn).toBeVisible();

    // 6. Test Idempotency (Re-confirming or reloading completed session stays on completion page)
    await page.reload();
    await expect(page.locator('text=Your information has been successfully submitted.')).toBeVisible();
    await expect(page.locator('text=Sent to Doctor Dashboard')).toBeVisible();

    // 7. Verify Doctor API receives the case
    const doctorCasesRes = await page.request.get('/api/doctor/cases');
    console.log('Doctor cases API status:', doctorCasesRes.status(), await doctorCasesRes.text());
    expect(doctorCasesRes.ok()).toBeTruthy();
    const doctorCasesData = await doctorCasesRes.json();
    const caseInQueue = doctorCasesData.cases.find((c: any) => c.session.id === sessionId);
    expect(caseInQueue).toBeTruthy();
    expect(caseInQueue.session.status).toBe('sent_to_doctor');

    // 8. Verify PDF API serves the generated PDF buffer for doctor
    const pdfRes = await page.request.get(`/api/doctor/cases/${sessionId}/pdf`);
    expect(pdfRes.ok()).toBeTruthy();
    expect(pdfRes.headers()['content-type']).toBe('application/pdf');

    // 9. Click Finish button to return to kiosk start page
    await finishBtn.click();
    await expect(page).toHaveURL(/\/kiosk$/);
  });
});
