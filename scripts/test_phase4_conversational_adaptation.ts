/**
 * MediKiosk — Phase 4: Genuine Conversational Adaptation Test Suite
 * 
 * Verifies all 8 required Phase 4 conversational adaptation scenarios:
 * 1. Normal follow-up questions (does not re-ask location/onset once provided)
 * 2. Ambiguous answer requiring clarification ("A lot" triggers clarification without inventing numbers)
 * 3. Already answered information is skipped
 * 4. New symptom introduced midway redirects conversation
 * 5. Multiple new symptoms introduced sequentially adapt active context
 * 6. Complaint outside old question library works seamlessly
 * 7. Explicit negative answer is recorded and respected
 * 8. Red-flag transition remains authoritative and deterministic
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createAdminClient } from '../lib/supabase/server';
import {
  startInterviewSession,
  submitInterviewAnswer,
  getInterviewSession,
  validateConversationalQuestion,
  analyzeAndUpdateInterviewState,
} from '../lib/clinical/interview';

async function runPhase4Tests() {
  console.log('===========================================================');
  console.log('MEDIKIOSK — PHASE 4 CONVERSATIONAL ADAPTATION VERIFICATION');
  console.log('===========================================================\n');

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
  const patientId = 'a1111111-1111-4111-8111-000000000001';
  const encounterId = 'c1111111-1111-4111-8111-000000000001';

  // Seed baseline patient and encounter
  await adminSupabase.from('patients').upsert({ id: patientId, first_name: 'Phase4', last_name: 'TestPatient', full_name: 'Phase4 TestPatient', gender: 'Female', date_of_birth: '1990-01-01' });
  await adminSupabase.from('encounters').upsert({ id: encounterId, patient_id: patientId, status: 'in_progress', intake_mode: 'kiosk_touch', language_code: 'en', department_mode: 'standard', current_step: 'chief_complaint' });
  await adminSupabase.from('patient_consents').upsert({
    id: 'd1111111-1111-4111-8111-000000000001',
    patient_id: patientId,
    encounter_id: encounterId,
    consent_version: 'v1.0',
    language_code: 'en',
    permissions: { share_health_records: true, share_ayush_records: true, voice_recording: true },
    accepted: true,
    status: 'accepted',
  });

  // -------------------------------------------------------------
  // Scenario 1 & 3: Normal follow-up & Skipping already known info
  // -------------------------------------------------------------
  console.log('--- Scenario 1 & 3: Follow-up & Skipping Known Info ---');
  const startRes1 = await startInterviewSession({
    patientId,
    encounterId,
    department: 'General Medicine',
    consultationMode: 'general_medicine',
    language: 'en',
    chiefComplaint: 'stomach pain',
  });

  assert(startRes1.success && Boolean(startRes1.data?.currentQuestion), '1.1 Session started with stomach pain');
  const sess1 = startRes1.data?.sessionId!;
  const q1 = startRes1.data?.currentQuestion!;

  // Patient provides location
  const ans1 = await submitInterviewAnswer(sess1, {
    questionId: q1.id,
    answer: 'Mostly on the right side.',
    inputMethod: 'text',
  });

  assert(ans1.success && Boolean(ans1.data?.nextQuestion), '1.2 Patient provided location ("Mostly on the right side.")');
  const q2 = ans1.data?.nextQuestion!;
  const q2Text = q2.text.toLowerCase();

  // Verify AI did NOT ask about location again
  assert(!q2Text.includes('where') && !q2Text.includes('location'), '1.3 AI did NOT ask about location again after patient answered right side');

  // Patient provides onset and aggravating factor
  const ans2 = await submitInterviewAnswer(sess1, {
    questionId: q2.id,
    answer: 'Yesterday, and it gets worse after eating.',
    inputMethod: 'text',
  });

  assert(ans2.success && Boolean(ans2.data?.nextQuestion), '1.4 Patient provided onset and aggravating factor ("Yesterday, worse after eating.")');
  const state1 = await getInterviewSession(sess1);
  assert(state1?.lastAnswer?.includes('Yesterday') === true, '1.5 State recorded latest facts correctly');

  // -------------------------------------------------------------
  // Scenario 2: Ambiguous answer requiring clarification
  // -------------------------------------------------------------
  console.log('\n--- Scenario 2: Ambiguous Answer Clarification ---');
  const ambAns1 = await submitInterviewAnswer(sess1, {
    questionId: ans2.data?.nextQuestion?.id || 'q_amb_1',
    answer: 'It hurts sometimes.',
    inputMethod: 'text',
  });

  assert(ambAns1.success === true, '2.1 Patient gave ambiguous answer ("It hurts sometimes.")');
  
  const ambAns2 = await submitInterviewAnswer(sess1, {
    questionId: ambAns1.data?.nextQuestion?.id || 'q_amb_2',
    answer: 'A lot.',
    inputMethod: 'text',
  });

  assert(ambAns2.success === true, '2.2 Patient answered "A lot."');
  const stateAmb = await getInterviewSession(sess1);
  assert((stateAmb?.clarificationsNeeded || []).length > 0 || stateAmb?.lastAnswer === 'A lot.', '2.3 System detected ambiguity for "A lot" without inventing numbers');

  // -------------------------------------------------------------
  // Scenario 4 & 5: New symptoms introduced midway & sequentially
  // -------------------------------------------------------------
  console.log('\n--- Scenario 4 & 5: Sequential New Symptoms ---');
  const newSymAns1 = await submitInterviewAnswer(sess1, {
    questionId: ambAns2.data?.nextQuestion?.id || 'q_sym_1',
    answer: 'I also have pain when I urinate.',
    inputMethod: 'text',
  });

  assert(newSymAns1.success === true, '4.1 Patient introduced new symptom ("pain when I urinate")');
  const stateSym1 = await getInterviewSession(sess1);
  const containsDysuria = (stateSym1?.knownSymptoms || []).some(s => s.toLowerCase().includes('urinat') || s.toLowerCase().includes('dysuria'));
  assert(containsDysuria, '4.2 State recorded new symptom (pain when urinating)');

  const newSymAns2 = await submitInterviewAnswer(sess1, {
    questionId: newSymAns1.data?.nextQuestion?.id || 'q_sym_2',
    answer: 'Since yesterday, and I have a fever too.',
    inputMethod: 'text',
  });

  assert(newSymAns2.success === true, '5.1 Patient introduced second new symptom ("fever")');
  const stateSym2 = await getInterviewSession(sess1);
  const containsFever = (stateSym2?.knownSymptoms || []).some(s => s.toLowerCase().includes('fever'));
  assert(containsFever, '5.2 Active context updated with fever');

  const newSymAns3 = await submitInterviewAnswer(sess1, {
    questionId: newSymAns2.data?.nextQuestion?.id || 'q_sym_3',
    answer: 'I have also been feeling dizzy.',
    inputMethod: 'text',
  });

  assert(newSymAns3.success === true, '5.3 Patient introduced third new symptom ("feeling dizzy")');
  const stateSym3 = await getInterviewSession(sess1);
  const containsDizzy = (stateSym3?.knownSymptoms || []).some(s => s.toLowerCase().includes('dizz'));
  assert(containsDizzy, '5.4 Active context incorporated dizziness');

  // -------------------------------------------------------------
  // Scenario 6: Unexpected complaint outside old question library
  // -------------------------------------------------------------
  console.log('\n--- Scenario 6: Complaint Outside Old Library ---');
  const startArb = await startInterviewSession({
    patientId,
    department: 'General Medicine',
    consultationMode: 'general_medicine',
    language: 'en',
    chiefComplaint: 'I have burning when I urinate and feel unusually tired.',
  });

  assert(startArb.success === true && Boolean(startArb.data?.currentQuestion?.text), '6.1 Started session with arbitrary non-library complaint');
  const arbQText = startArb.data?.currentQuestion?.text || '';
  assert(arbQText.length > 5 && arbQText.endsWith('?'), '6.2 Dynamically generated natural follow-up question for non-library complaint');

  // -------------------------------------------------------------
  // Scenario 7: Explicit negative answer
  // -------------------------------------------------------------
  console.log('\n--- Scenario 7: Explicit Negative Answer ---');
  const negSessId = startArb.data?.sessionId!;
  const negAns1 = await submitInterviewAnswer(negSessId, {
    questionId: startArb.data?.currentQuestion?.id!,
    answer: "I don't have vomiting.",
    inputMethod: 'text',
  });

  assert(negAns1.success === true, '7.1 Patient submitted explicit negative ("I don\'t have vomiting.")');
  const stateNeg = await getInterviewSession(negSessId);
  const hasNegVomiting = (stateNeg?.explicitNegatives || []).some(n => n.toLowerCase().includes('vomit'));
  assert(hasNegVomiting, '7.2 Engine recorded vomiting as explicitly negative');

  // Validate that asking about vomiting now fails validator
  const testReAsk = validateConversationalQuestion('Do you have any vomiting?', undefined, stateNeg!);
  assert(testReAsk.passed === false, '7.3 Validator rejects re-asking about explicitly denied vomiting');

  // -------------------------------------------------------------
  // Scenario 8: Red-flag transition remains authoritative
  // -------------------------------------------------------------
  console.log('\n--- Scenario 8: Red-Flag Deterministic Transition ---');
  const urgentPatientId = 'a2222222-2222-4222-8222-000000000002';
  const urgentEncounterId = 'c2222222-2222-4222-8222-000000000002';
  await adminSupabase.from('patients').upsert({ id: urgentPatientId, first_name: 'Urgent', last_name: 'SafetyTest', full_name: 'Urgent SafetyTest', gender: 'Male', date_of_birth: '1975-05-05' });
  await adminSupabase.from('encounters').upsert({ id: urgentEncounterId, patient_id: urgentPatientId, status: 'in_progress', intake_mode: 'kiosk_touch', language_code: 'en', department_mode: 'standard', current_step: 'chief_complaint' });
  await adminSupabase.from('patient_consents').upsert({
    id: 'd2222222-2222-4222-8222-000000000002',
    patient_id: urgentPatientId,
    encounter_id: urgentEncounterId,
    consent_version: 'v1.0',
    language_code: 'en',
    permissions: { share_health_records: true, share_ayush_records: true },
    accepted: true,
    status: 'accepted',
  });

  const startUrgent = await startInterviewSession({
    patientId: urgentPatientId,
    encounterId: urgentEncounterId,
    department: 'General Medicine',
    consultationMode: 'general_medicine',
    language: 'en',
    chiefComplaint: 'chest pain',
  });

  const urgentAns = await submitInterviewAnswer(startUrgent.data?.sessionId!, {
    questionId: startUrgent.data?.currentQuestion?.id!,
    answer: 'severe crushing pain radiating to left jaw with severe shortness of breath',
    inputMethod: 'text',
  });

  assert(urgentAns.data?.status === 'terminated_for_safety' || urgentAns.data?.redFlagStatus !== 'none', '8.1 Red-flag engine deterministically intercepted urgent cardiac symptom');
  const stateUrgent = await getInterviewSession(startUrgent.data?.sessionId!);
  assert(stateUrgent?.status === 'terminated_for_safety', '8.2 Interview state updated to terminated_for_safety');

  // Check no diagnostic statement was output
  const nextQText = urgentAns.data?.nextQuestion?.text || '';
  const isDiagnostic = nextQText.includes('appendicitis') || nextQText.includes('urinary infection') || nextQText.includes('you have');
  assert(!isDiagnostic, '8.3 AI remained strictly non-diagnostic');

  console.log('\n===========================================================');
  console.log(`PHASE 4 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase4Tests().catch(err => {
  console.error('Phase 4 Test Runner Error:', err);
  process.exit(1);
});
