import { POST as createConsent } from '../app/api/patients/consent/route';
import { POST as revokeConsent } from '../app/api/patients/consent/revoke/route';
import { POST as checkConsent } from '../app/api/patients/consent/check/route';
import { POST as identifyPatient } from '../app/api/patients/identify/route';
import { createClient } from '../lib/supabase/server';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const ARUMUGAM_ID = 'a1111111-1111-4111-8111-000000000001';
const PRIYA_ID = 'a1111111-1111-4111-8111-000000000004';
const UNKNOWN_PATIENT_ID = 'a9999999-9999-4999-8999-000000000999';

async function runTests() {
  console.log('====================================================');
  console.log('Task #6 — Consent Management & Data Model Verification');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assertTest(condition: boolean, name: string, detail: string) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      console.log(`       ${detail}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      console.error(`       ${detail}`);
      failed++;
    }
    console.log('----------------------------------------------------');
  }

  // 1. Valid Accepted Consent Check (Arumugam - share_health_records)
  const req1 = new Request('http://localhost:3000/api/patients/consent/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientId: ARUMUGAM_ID, permission: 'share_health_records' }),
  });
  const res1 = await checkConsent(req1);
  const body1 = await res1.json();
  assertTest(
    res1.status === 200 && body1.allowed === true,
    '1. Valid Accepted Consent Check (Arumugam - share_health_records)',
    `HTTP ${res1.status}, Allowed: ${body1.allowed}`
  );

  // 2. Rejected Consent Check (Priya Ramanathan - share_health_records)
  const req2 = new Request('http://localhost:3000/api/patients/consent/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientId: PRIYA_ID, permission: 'share_health_records' }),
  });
  const res2 = await checkConsent(req2);
  const body2 = await res2.json();
  assertTest(
    res2.status === 200 && body2.allowed === false,
    '2. Rejected Consent Check (Priya - share_health_records)',
    `HTTP ${res2.status}, Allowed: ${body2.allowed}`
  );

  // 3. Accepted Consent without requested permission (Arumugam - share_ayush_records is false in seed)
  const req3 = new Request('http://localhost:3000/api/patients/consent/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientId: ARUMUGAM_ID, permission: 'share_ayush_records' }),
  });
  const res3 = await checkConsent(req3);
  const body3 = await res3.json();
  assertTest(
    res3.status === 200 && body3.allowed === false,
    '3. Accepted Consent without requested permission (Arumugam - share_ayush_records)',
    `HTTP ${res3.status}, Allowed: ${body3.allowed}`
  );

  // 4. Create a new Consent Record via POST /api/patients/consent
  const req4 = new Request('http://localhost:3000/api/patients/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId: ARUMUGAM_ID,
      permissions: {
        share_health_records: true,
        share_ayush_records: true,
        voice_recording: true,
        ocr_processing: true,
      },
      purpose: 'ayush_integration_test',
      version: 'v1.2',
      accepted: true,
    }),
  });
  const res4 = await createConsent(req4);
  const body4 = await res4.json();
  const createdConsentId = body4.consent?.id;
  assertTest(
    res4.status === 201 && body4.success && createdConsentId,
    '4. Create New Consent Record (POST /api/patients/consent)',
    `HTTP ${res4.status}, Consent ID: ${createdConsentId}`
  );

  // 5. Verify newly granted permission works (Arumugam - share_ayush_records now allowed = true)
  const req5 = new Request('http://localhost:3000/api/patients/consent/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientId: ARUMUGAM_ID, permission: 'share_ayush_records' }),
  });
  const res5 = await checkConsent(req5);
  const body5 = await res5.json();
  assertTest(
    res5.status === 200 && body5.allowed === true,
    '5. Verify Newly Granted Permission Check (share_ayush_records allowed = true)',
    `HTTP ${res5.status}, Allowed: ${body5.allowed}`
  );

  // 6. Revoke the newly created consent via POST /api/patients/consent/revoke
  const req6 = new Request('http://localhost:3000/api/patients/consent/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consentId: createdConsentId }),
  });
  const res6 = await revokeConsent(req6);
  const body6 = await res6.json();
  assertTest(
    res6.status === 200 && body6.success && body6.consent?.status === 'revoked',
    '6. Revoke Active Consent (POST /api/patients/consent/revoke)',
    `HTTP ${res6.status}, Revoked: ${body6.revoked}, Status: ${body6.consent?.status}`
  );

  // 7. Verify Revoked Consent Check returns allowed = false
  const req7 = new Request('http://localhost:3000/api/patients/consent/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientId: ARUMUGAM_ID, permission: 'share_ayush_records' }),
  });
  const res7 = await checkConsent(req7);
  const body7 = await res7.json();
  assertTest(
    res7.status === 200 && body7.allowed === false,
    '7. Revoked Consent Permission Check (allowed = false)',
    `HTTP ${res7.status}, Allowed: ${body7.allowed}`
  );

  // 8. Expired Consent Check
  const req8Create = new Request('http://localhost:3000/api/patients/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId: ARUMUGAM_ID,
      permissions: { voice_recording: true },
      purpose: 'expired_test',
      version: 'v1.0',
      accepted: true,
      expiresAt: new Date(Date.now() - 60000).toISOString(), // Expired 1 minute ago
    }),
  });
  const res8Create = await createConsent(req8Create);
  const body8Create = await res8Create.json();

  const req8Check = new Request('http://localhost:3000/api/patients/consent/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientId: ARUMUGAM_ID, permission: 'voice_recording' }),
  });
  const res8Check = await checkConsent(req8Check);
  const body8Check = await res8Check.json();
  assertTest(
    res8Check.status === 200 && body8Check.allowed === false,
    '8. Expired Consent Check (expiresAt in past -> allowed = false)',
    `HTTP ${res8Check.status}, Allowed: ${body8Check.allowed}`
  );

  // 9. Unknown Patient Check (404)
  const req9 = new Request('http://localhost:3000/api/patients/consent/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientId: UNKNOWN_PATIENT_ID, permission: 'share_health_records' }),
  });
  const res9 = await checkConsent(req9);
  const body9 = await res9.json();
  assertTest(
    res9.status === 404 && body9.error?.code === 'PATIENT_NOT_FOUND',
    '9. Unknown Patient Consent Check (HTTP 404 PATIENT_NOT_FOUND)',
    `HTTP ${res9.status}, Code: ${body9.error?.code}`
  );

  // 10. Unsupported Permission Check (400)
  const req10 = new Request('http://localhost:3000/api/patients/consent/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientId: ARUMUGAM_ID, permission: 'invalid_permission_xyz' }),
  });
  const res10 = await checkConsent(req10);
  const body10 = await res10.json();
  assertTest(
    res10.status === 400 && body10.error?.code === 'INVALID_PERMISSION',
    '10. Unsupported Permission Check (HTTP 400 INVALID_PERMISSION)',
    `HTTP ${res10.status}, Code: ${body10.error?.code}`
  );

  // 11. Verify Historical Revoked Record Persists in Database
  const supabase = await createClient();
  const { data: dbRevokedRecord } = await supabase
    .from('patient_consents')
    .select('*')
    .eq('id', createdConsentId)
    .single();

  assertTest(
    !!dbRevokedRecord && dbRevokedRecord.status === 'revoked' && !!dbRevokedRecord.withdrawn_at,
    '11. Historical Consent Persistence (Row exists in DB with status = revoked)',
    `Record ID: ${dbRevokedRecord?.id}, Status: ${dbRevokedRecord?.status}, WithdrawnAt: ${dbRevokedRecord?.withdrawn_at}`
  );

  // 12. Verify Task #5 Patient Identification Unchanged & Functional
  const req12 = new Request('http://localhost:3000/api/patients/identify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifierType: 'abha_number', identifierValue: 'DEMO-ABHA-918273645001' }),
  });
  const res12 = await identifyPatient(req12);
  const body12 = await res12.json();
  assertTest(
    res12.status === 200 && body12.patient?.id === ARUMUGAM_ID,
    '12. Task #5 Patient Identification Regression Verification',
    `HTTP ${res12.status}, Patient: ${body12.patient?.name}`
  );

  console.log(`\nConsent Test Summary: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
