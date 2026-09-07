/**
 * Task #31 — Source & Provenance System Minimal Sanity Test Suite
 * MediKiosk Clinical Architecture
 * 
 * Verifies the 7 essential provenance requirements:
 * 1. Basic provenance lookup
 * 2. Multi-hop chain traversal
 * 3. Cross-patient authorization failure (PROVENANCE_VALIDATION_FAILED)
 * 4. Consent-denied handling (CONSENT_DENIED)
 * 5. Idempotent link registration (Suppression of duplicates)
 * 6. Clinical fact immutability
 * 7. End-to-end pipeline sanity
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createAdminClient } from '../lib/supabase/server';
import { getProvenanceChain, validateProvenance, registerProvenanceLink } from '../lib/clinical/provenance/provenance-service';
import { hasValidConsent } from '../lib/consent/consent-service';

async function runMinimalSanityChecks() {
  console.log('==================================================');
  console.log('SANITY CHECKS: TASK #31 SOURCE & PROVENANCE SYSTEM');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (detail) console.error(`       Detail: ${detail}`);
      failed++;
    }
  }

  const adminSupabase = await createAdminClient();

  const patientA = 'a1111111-1111-4111-8111-000000000001';
  const patientB = 'a1111111-1111-4111-8111-000000000003';
  const noConsentPatient = 'a1111111-1111-4111-8111-000000000004';

  // Seed baseline patient rows
  await adminSupabase.from('patients').upsert({ id: patientA, first_name: 'Ramesh', last_name: 'Kumar', full_name: 'Ramesh Kumar', gender: 'Male', date_of_birth: '1980-01-01' });
  await adminSupabase.from('patients').upsert({ id: patientB, first_name: 'Rajesh', last_name: 'Sharma', full_name: 'Rajesh Kumar Sharma', gender: 'Male', date_of_birth: '1958-11-05' });

  // Grant consent for patientA
  await adminSupabase.from('patient_consents').upsert({
    id: 'd1111111-1111-4111-8111-000000000001',
    patient_id: patientA,
    consent_version: 'v1.0',
    language_code: 'ta',
    permissions: { share_health_records: true, share_ayush_records: true },
    accepted: true,
    status: 'accepted',
  });

  // Guarantee denial for noConsentPatient
  await adminSupabase.from('patient_consents').delete().eq('patient_id', noConsentPatient);

  // 1. Basic Provenance Lookup
  const labId = 'b1111111-1111-4111-8111-000000000201';
  const docId = 'b1111111-1111-4111-8111-000000000101';
  const encounterId = 'c1111111-1111-4111-8111-000000000001';

  // Ensure baseline encounter exists
  await adminSupabase.from('encounters').upsert({
    id: encounterId,
    patient_id: patientA,
    status: 'completed',
    intake_mode: 'kiosk_voice_touch',
    language_code: 'en',
    department_mode: 'standard',
    current_step: 'summary'
  });

  const { error: docErr } = await adminSupabase.from('medical_documents').upsert({
    id: docId,
    patient_id: patientA,
    encounter_id: encounterId,
    document_type: 'lab_report',
    file_name: 'blood_report.pdf',
    mime_type: 'application/pdf',
    storage_path: 'demo/blood_report.pdf',
  });
  if (docErr) console.log('[DEBUG docErr]', docErr);

  const { error: labErr } = await adminSupabase.from('clinical_lab_results').upsert({
    id: labId,
    patient_id: patientA,
    encounter_id: encounterId,
    test_name: 'HbA1c',
    result_value: '8.9',
    unit: '%',
    provenance_source: 'ocr_extracted',
    verification_status: 'unverified',
  });
  if (labErr) console.log('[DEBUG labErr]', labErr);

  const lookupRes = await getProvenanceChain(patientA, 'lab', labId);
  assert(lookupRes.success === true && lookupRes.data?.rootSource?.sourceId === labId, 'Sanity Check 1: Basic provenance lookup succeeds');

  // 2. Multi-Hop Chain Traversal
  await registerProvenanceLink({
    patientId: patientA,
    fromType: 'ai_summary',
    fromId: 'sum-1',
    toType: 'synthesis',
    toId: 'synth-1',
    relationship: 'synthesized_from',
  });
  await registerProvenanceLink({
    patientId: patientA,
    fromType: 'synthesis',
    fromId: 'synth-1',
    toType: 'lab',
    toId: labId,
    relationship: 'retrieved_from',
  });

  const chainRes = await getProvenanceChain(patientA, 'ai_summary', 'sum-1');
  assert(
    chainRes.success === true && chainRes.data?.nodes.length! >= 2,
    'Sanity Check 2: Multi-hop chain traversal succeeds'
  );

  // 3. Cross-Patient Authorization Failure
  // Create a link where a node from patientA is queried under patientB context
  await registerProvenanceLink({
    patientId: patientA,
    fromType: 'synthesis',
    fromId: 'synth-cross-patient',
    toType: 'lab',
    toId: labId,
    relationship: 'retrieved_from',
  });

  const crossPatientLinkRes = await getProvenanceChain(patientB, 'lab', labId);
  assert(
    !crossPatientLinkRes.success && crossPatientLinkRes.errorCode === 'PROVENANCE_VALIDATION_FAILED',
    'Sanity Check 3: Cross-patient authorization failure rejected with PROVENANCE_VALIDATION_FAILED'
  );

  // 4. Consent Denied Handling
  const consentDeniedRes = await getProvenanceChain(noConsentPatient, 'lab', labId);
  assert(
    !consentDeniedRes.success && consentDeniedRes.errorCode === 'CONSENT_DENIED',
    'Sanity Check 4: Missing consent rejected with CONSENT_DENIED'
  );

  // 5. Idempotent Link Registration (Prevent duplicate identical links)
  const linkReg1 = await registerProvenanceLink({
    patientId: patientA,
    fromType: 'lab',
    fromId: labId,
    toType: 'scanned_document',
    toId: docId,
    relationship: 'extracted_from',
  });
  const linkReg2 = await registerProvenanceLink({
    patientId: patientA,
    fromType: 'lab',
    fromId: labId,
    toType: 'scanned_document',
    toId: docId,
    relationship: 'extracted_from',
  });
  assert(linkReg1.success === true && linkReg2.success === true, 'Sanity Check 5: Duplicate provenance link registration handled idempotently');

  // 6. Clinical Fact Immutability
  const { data: dbLab } = await adminSupabase.from('clinical_lab_results').select('*').eq('id', labId).single();
  assert(dbLab.result_value === '8.9' && dbLab.test_name === 'HbA1c', 'Sanity Check 6: Clinical lab facts remain un-mutated and pristine');

  // 7. Pipeline Validation API Check
  const valRes = await validateProvenance(patientA, 'lab', labId);
  assert(valRes.success === true && valRes.data?.valid === true, 'Sanity Check 7: Provenance validation API check passed');

  console.log('\n==================================================');
  console.log(`TASK #31 SANITY CHECK RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMinimalSanityChecks().catch((err) => {
  console.error('Sanity check runner crashed:', err);
  process.exit(1);
});
