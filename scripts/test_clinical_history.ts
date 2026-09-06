import { GET as getHistory } from '../app/api/patients/[patientId]/history/route';
import { POST as identifyPatient } from '../app/api/patients/identify/route';
import { POST as checkConsent } from '../app/api/patients/consent/check/route';
import { POST as createConsent } from '../app/api/patients/consent/route';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const ARUMUGAM_ID = 'a1111111-1111-4111-8111-000000000001';
const MEENA_ID = 'a1111111-1111-4111-8111-000000000002';
const RAJESH_ID = 'a1111111-1111-4111-8111-000000000003';
const PRIYA_ID = 'a1111111-1111-4111-8111-000000000004';
const VIKRAMADITYA_ID = 'a1111111-1111-4111-8111-000000000008';
const ANANYA_ID = 'a1111111-1111-4111-8111-000000000012';
const UNKNOWN_PATIENT_ID = 'a9999999-9999-4999-8999-000000000999';

async function runTests() {
  console.log('====================================================');
  console.log('Task #7 — Clinical History Data Model & Access Tests');
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

  // Helper for calling GET /api/patients/[patientId]/history
  async function callHistoryApi(patientId: string, queryParams: string = '') {
    const url = `http://localhost:3000/api/patients/${patientId}/history${queryParams}`;
    const req = new Request(url, { method: 'GET' });
    const paramsPromise = Promise.resolve({ patientId });
    const res = await getHistory(req, { params: paramsPromise });
    const body = await res.json();
    return { res, body };
  }

  // 1. Arumugam History Retrieval (Cardiac Presentation)
  const t1 = await callHistoryApi(ARUMUGAM_ID);
  const arumugamSymptoms = t1.body.data?.encounters?.flatMap((e: any) => e.symptoms) || [];
  const arumugamChestPain = arumugamSymptoms.find((s: any) => s.symptomName.toLowerCase().includes('chest pain'));
  assertTest(
    t1.res.status === 200 && t1.body.success && !!arumugamChestPain,
    '1. Arumugam Clinical History Retrieval (Chest pain symptom present)',
    `HTTP ${t1.res.status}, Patient: ${t1.body.data?.patient?.fullName}, Total Symptoms: ${arumugamSymptoms.length}`
  );

  // 2. Rajesh Longitudinal History Retrieval (HbA1c Progression: 7.2% -> 8.4% -> 8.9%)
  const t2 = await callHistoryApi(RAJESH_ID);
  const rajeshLabs = t2.body.data?.encounters?.flatMap((e: any) => e.labResults) || [];
  const hba1cTests = rajeshLabs.filter((l: any) => l.testName.toLowerCase().includes('hba1c'));
  assertTest(
    t2.res.status === 200 && hba1cTests.length >= 3,
    '2. Rajesh Longitudinal History Retrieval (HbA1c trend present)',
    `HTTP ${t2.res.status}, HbA1c Lab Records Found: ${hba1cTests.length}`
  );

  // 3. Meena AYUSH History Retrieval (Prakriti, Vikriti, Agni, Koshtha)
  const t3 = await callHistoryApi(MEENA_ID, '?department=ayush');
  const ayushAssessments = t3.body.data?.encounters?.flatMap((e: any) => e.ayushAssessments) || [];
  assertTest(
    t3.res.status === 200 && ayushAssessments.length > 0 && ayushAssessments[0].prakriti === 'Vata-Pitta',
    '3. Meena AYUSH History Retrieval (Prakriti Vata-Pitta & Dashavidha details)',
    `HTTP ${t3.res.status}, AYUSH Assessments Found: ${ayushAssessments.length}, Prakriti: ${ayushAssessments[0]?.prakriti}`
  );

  // 4. Vikramaditya Medication History Retrieval (Active & Discontinued Amlodipine)
  const t4 = await callHistoryApi(VIKRAMADITYA_ID);
  const vikramMeds = t4.body.data?.encounters?.flatMap((e: any) => e.medications) || [];
  const discontinuedAmlodipine = vikramMeds.find((m: any) => m.medicationName.toLowerCase().includes('amlodipine') && m.status === 'discontinued');
  assertTest(
    t4.res.status === 200 && vikramMeds.length >= 4 && !!discontinuedAmlodipine,
    '4. Vikramaditya Medication History (Discontinued Amlodipine & Active meds)',
    `HTTP ${t4.res.status}, Total Meds: ${vikramMeds.length}, Discontinued Amlodipine Found: ${!!discontinuedAmlodipine}`
  );

  // 5. Patient Consent Grant & History Retrieval for Ananya (Minimal / Valid Structure)
  const req5Consent = new Request('http://localhost:3000/api/patients/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId: ANANYA_ID,
      permissions: { share_health_records: true },
      purpose: 'history_retrieval_test',
      accepted: true,
    }),
  });
  await createConsent(req5Consent);

  const t5 = await callHistoryApi(ANANYA_ID);
  assertTest(
    t5.res.status === 200 && t5.body.data?.totalEncounters >= 1 && Array.isArray(t5.body.data?.encounters),
    '5. Patient History Retrieval with Active Consent (Ananya)',
    `HTTP ${t5.res.status}, Total Encounters: ${t5.body.data?.totalEncounters}`
  );

  // 6. Unknown Patient Retrieval (404)
  const t6 = await callHistoryApi(UNKNOWN_PATIENT_ID);
  assertTest(
    t6.res.status === 404 && t6.body.error?.code === 'PATIENT_NOT_FOUND',
    '6. Unknown Patient Retrieval (HTTP 404 PATIENT_NOT_FOUND)',
    `HTTP ${t6.res.status}, Code: ${t6.body.error?.code}`
  );

  // 7. Invalid Patient UUID Format (400)
  const t7 = await callHistoryApi('invalid-uuid-format-1234');
  assertTest(
    t7.res.status === 400 && t7.body.error?.code === 'INVALID_PATIENT_ID',
    '7. Invalid UUID Format Check (HTTP 400 INVALID_PATIENT_ID)',
    `HTTP ${t7.res.status}, Code: ${t7.body.error?.code}`
  );

  // 8. Consent Allowed Access (Arumugam - share_health_records)
  assertTest(
    t1.res.status === 200 && t1.body.success,
    '8. Consent Allowed Access (Authorized patient returns HTTP 200)',
    `HTTP ${t1.res.status}, Success: ${t1.body.success}`
  );

  // 9. Consent Denied Access (Priya Ramanathan - share_health_records rejected)
  const t9 = await callHistoryApi(PRIYA_ID);
  assertTest(
    t9.res.status === 403 && t9.body.error?.code === 'CONSENT_DENIED' && !t9.body.data,
    '9. Consent Denied Access (HTTP 403 CONSENT_DENIED without data leak)',
    `HTTP ${t9.res.status}, Code: ${t9.body.error?.code}, Data Exists: ${!!t9.body.data}`
  );

  // 10. Patient / Encounter Mismatch Detection (No cross-patient contamination)
  const arumugamEncounterPatientIds = t1.body.data?.encounters?.map((e: any) => e.patientId) || [];
  const allMatchArumugam = arumugamEncounterPatientIds.every((pid: string) => pid === ARUMUGAM_ID);
  assertTest(
    allMatchArumugam && arumugamEncounterPatientIds.length > 0,
    '10. Patient/Encounter Mismatch Isolation (Zero cross-patient leakage)',
    `All Encounter Patient IDs Match ${ARUMUGAM_ID}: ${allMatchArumugam}`
  );

  // 11. Provenance Preservation Check
  const symptomWithSource = arumugamSymptoms.find((s: any) => s.sourceId);
  assertTest(
    !!symptomWithSource && symptomWithSource.provenanceSource === 'patient_reported' && !!symptomWithSource.sourceId,
    '11. Provenance Preservation (sourceId and provenanceSource retained)',
    `ProvenanceSource: ${symptomWithSource?.provenanceSource}, SourceId: ${symptomWithSource?.sourceId}`
  );

  // 12. Verification Status Preservation Check
  const arumugamVerificationStatus = arumugamSymptoms[0]?.verificationStatus;
  assertTest(
    arumugamVerificationStatus === 'unverified',
    '12. Verification Status Preservation (Patient-reported symptom remains unverified)',
    `VerificationStatus: ${arumugamVerificationStatus}`
  );

  // 13. Chronological Ordering Check
  const encounters = t1.body.data?.encounters || [];
  let isChronological = true;
  for (let i = 0; i < encounters.length - 1; i++) {
    if (new Date(encounters[i].createdAt).getTime() < new Date(encounters[i + 1].createdAt).getTime()) {
      isChronological = false;
      break;
    }
  }
  assertTest(
    isChronological,
    '13. Chronological Ordering Check (Encounters sorted descending by date)',
    `Chronological Order Preserved: ${isChronological}`
  );

  // 14. Task #5 Patient Identification Regression Check
  const req14 = new Request('http://localhost:3000/api/patients/identify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifierType: 'abha_number', identifierValue: 'DEMO-ABHA-918273645001' }),
  });
  const res14 = await identifyPatient(req14);
  const body14 = await res14.json();
  assertTest(
    res14.status === 200 && body14.patient?.id === ARUMUGAM_ID,
    '14. Task #5 Patient Identification Regression Check',
    `HTTP ${res14.status}, Patient: ${body14.patient?.name}`
  );

  // 15. Task #6 Consent Management Regression Check
  const req15 = new Request('http://localhost:3000/api/patients/consent/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientId: ARUMUGAM_ID, permission: 'share_health_records' }),
  });
  const res15 = await checkConsent(req15);
  const body15 = await res15.json();
  assertTest(
    res15.status === 200 && body15.allowed === true,
    '15. Task #6 Consent Management Regression Check',
    `HTTP ${res15.status}, Allowed: ${body15.allowed}`
  );

  console.log(`\nClinical History Test Summary: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
