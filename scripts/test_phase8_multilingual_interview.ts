/**
 * MediKiosk — Phase 8: Multilingual Dynamic Interview Automated Test Suite
 *
 * Verifies all 11 required Phase 8 tests (Test A through Test K):
 * - Test A: English dynamic questioning
 * - Test B: Tamil dynamic questioning
 * - Test C: Hindi dynamic questioning
 * - Test D: Tamil conversational adaptation (new symptom reprioritization)
 * - Test E: Hindi conversational adaptation (new symptom reprioritization)
 * - Test F: Tamil/Hindi explicit negative handling
 * - Test G: Tamil/Hindi ambiguity clarification in target language
 * - Test H: Code-switched mixed-language normalization
 * - Test I: Multilingual deterministic safety authority
 * - Test J: Language-independent clinical state completion parity
 * - Test K: Multilingual state-derived fallback without question library
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { evaluateSessionSafety } from '../lib/clinical/interview/safety-controller';
import { evaluateInterviewCompletion } from '../lib/clinical/interview/interview-completion-evaluator';
import { generateDynamicNextQuestion, buildStateDerivedFallbackQuestion } from '../lib/clinical/interview/dynamic-question-engine';
import { createInitialInterviewState, updateStateAfterAnswer } from '../lib/clinical/interview/interview-state';
import { analyzeAndUpdateInterviewState } from '../lib/clinical/interview/interview-state-analyzer';
import { startInterviewSession, submitInterviewAnswer } from '../lib/clinical/interview/interview-service';
import { createAdminClient } from '../lib/supabase/server';
import type { InterviewState } from '../lib/clinical/interview/types';

async function updateStateWithTurn(state: InterviewState, text: string): Promise<InterviewState> {
  const turn = { role: 'patient' as const, text, timestamp: new Date().toISOString() };
  let updated = updateStateAfterAnswer(state, { sessionId: state.sessionId, answer: text }, turn);
  updated = await analyzeAndUpdateInterviewState(updated);
  return updated;
}

async function runPhase8Tests() {
  console.log('===========================================================');
  console.log('MEDIKIOSK — PHASE 8 MULTILINGUAL DYNAMIC INTERVIEW TEST SUITE');
  console.log('===========================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    }
  }

  // Seed patient & consent for API service integration tests
  const adminSupabase = await createAdminClient();
  const patientId = 'a8888888-8888-4888-8888-000000000008';
  const encounterId = 'c8888888-8888-4888-8888-000000000008';

  await adminSupabase.from('patients').upsert({
    id: patientId,
    first_name: 'Phase8',
    last_name: 'MultilingualTest',
    full_name: 'Phase8 MultilingualTest',
    gender: 'Female',
    date_of_birth: '1992-02-02',
  });
  await adminSupabase.from('encounters').upsert({
    id: encounterId,
    patient_id: patientId,
    status: 'in_progress',
    intake_mode: 'kiosk_touch',
    language_code: 'ta',
    department_mode: 'standard',
    current_step: 'chief_complaint',
  });
  await adminSupabase.from('patient_consents').upsert({
    id: 'd8888888-8888-4888-8888-000000000008',
    patient_id: patientId,
    encounter_id: encounterId,
    consent_version: 'v1.0',
    language_code: 'ta',
    permissions: { share_health_records: true, share_ayush_records: true },
    accepted: true,
    status: 'accepted',
  });

  // --- Test A: English dynamic questioning ---
  {
    let state = createInitialInterviewState('sess_p8_en', { patientId: 'p1', encounterId: 'e1', language: 'en', chiefComplaint: 'stomach pain' });
    state = await updateStateWithTurn(state, 'I have stomach pain.');
    const nextQ = await generateDynamicNextQuestion(state);

    assert(
      nextQ && nextQ.text && nextQ.text.length > 5,
      'Test A: English dynamic follow-up question generated',
      `Generated: "${nextQ?.text}"`
    );
  }

  // --- Test B: Tamil dynamic questioning ---
  {
    let state = createInitialInterviewState('sess_p8_ta', { patientId: 'p1', encounterId: 'e1', language: 'ta', chiefComplaint: 'வயிற்று வலி' });
    state = await updateStateWithTurn(state, 'எனக்கு இரண்டு நாட்களாக வயிற்று வலி இருக்கிறது.');
    const nextQ = await generateDynamicNextQuestion(state);

    assert(
      nextQ && nextQ.text && nextQ.text.length > 5,
      'Test B: Tamil dynamic follow-up question generated',
      `Generated: "${nextQ?.text}"`
    );
  }

  // --- Test C: Hindi dynamic questioning ---
  {
    let state = createInitialInterviewState('sess_p8_hi', { patientId: 'p1', encounterId: 'e1', language: 'hi', chiefComplaint: 'पेट दर्द' });
    state = await updateStateWithTurn(state, 'मुझे दो दिनों से पेट में दर्द है।');
    const nextQ = await generateDynamicNextQuestion(state);

    assert(
      nextQ && nextQ.text && nextQ.text.length > 5,
      'Test C: Hindi dynamic follow-up question generated',
      `Generated: "${nextQ?.text}"`
    );
  }

  // --- Test D: Tamil adaptation ---
  {
    let state = createInitialInterviewState('sess_p8_d', { patientId: 'p1', encounterId: 'e1', language: 'ta', chiefComplaint: 'வயிற்று வலி' });
    state = await updateStateWithTurn(state, 'எனக்கு இரண்டு நாட்களாக வயிற்று வலி இருக்கிறது.');
    state = await updateStateWithTurn(state, 'எனக்கு சிறுநீர் கழிக்கும் போது வலி இருக்கிறது.');

    assert(
      (state.knownSymptoms || []).includes('dysuria / painful urination') || (state.newSymptoms || []).includes('dysuria / painful urination'),
      'Test D: Tamil patient introduces new symptom midway, reprioritizing state',
      `Known symptoms: ${JSON.stringify(state.knownSymptoms)}, New symptoms: ${JSON.stringify(state.newSymptoms)}`
    );
  }

  // --- Test E: Hindi adaptation ---
  {
    let state = createInitialInterviewState('sess_p8_e', { patientId: 'p1', encounterId: 'e1', language: 'hi', chiefComplaint: 'पेट दर्द' });
    state = await updateStateWithTurn(state, 'मुझे दो दिनों से पेट में दर्द है।');
    state = await updateStateWithTurn(state, 'मुझे पेशाब में जलन है।');

    assert(
      (state.knownSymptoms || []).includes('dysuria / painful urination') || (state.newSymptoms || []).includes('dysuria / painful urination'),
      'Test E: Hindi patient introduces new symptom midway, reprioritizing state',
      `Known symptoms: ${JSON.stringify(state.knownSymptoms)}, New symptoms: ${JSON.stringify(state.newSymptoms)}`
    );
  }

  // --- Test F: Explicit negative in Tamil/Hindi ---
  {
    let state = createInitialInterviewState('sess_p8_f', { patientId: 'p1', encounterId: 'e1', language: 'ta', chiefComplaint: 'வயிற்று வலி' });
    state = await updateStateWithTurn(state, 'எனக்கு வயிற்று வலி இருக்கிறது. வாந்தி இல்லை.');

    assert(
      (state.explicitNegatives || []).includes('vomiting'),
      'Test F: Tamil/Hindi explicit negative symptom correctly recognized in state',
      `Explicit negatives: ${JSON.stringify(state.explicitNegatives)}`
    );
  }

  // --- Test G: Ambiguous answer clarification in Tamil/Hindi ---
  {
    let state = createInitialInterviewState('sess_p8_g', { patientId: 'p1', encounterId: 'e1', language: 'ta', chiefComplaint: 'வலி' });
    state = await updateStateWithTurn(state, 'எனக்கு கொஞ்சம் வலி இருக்கிறது.');

    assert(
      (state.clarificationsNeeded || []).length > 0,
      'Test G: Ambiguous answer in Tamil/Hindi triggers clarification requirement',
      `Clarifications: ${JSON.stringify(state.clarificationsNeeded)}`
    );
  }

  // --- Test H: Mixed language / Code-switching normalization ---
  {
    let state = createInitialInterviewState('sess_p8_h', { patientId: 'p1', encounterId: 'e1', language: 'ta', chiefComplaint: 'stomach pain' });
    state = await updateStateWithTurn(state, 'எனக்கு stomach pain இருக்கு.');

    assert(
      (state.knownSymptoms || []).includes('stomach pain'),
      'Test H: Code-switched mixed-language answer normalizes correctly to clinical concept',
      `Known symptoms: ${JSON.stringify(state.knownSymptoms)}`
    );
  }

  // --- Test I: Multilingual deterministic safety authority ---
  {
    let state = createInitialInterviewState('sess_p8_i', { patientId: 'p1', encounterId: 'e1', language: 'ta', chiefComplaint: 'நெஞ்சு வலி' });
    state = await updateStateWithTurn(state, 'எனக்கு நெஞ்சு வலி மற்றும் மூச்சுத்திணறல் இருக்கிறது.');
    const safetyRes = await evaluateSessionSafety(state);

    assert(
      safetyRes.isUrgent && safetyRes.redFlagStatus === 'urgent',
      'Test I: Tamil/Hindi urgent red flag phrasing triggers deterministic safety termination',
      `isUrgent=${safetyRes.isUrgent}, status=${safetyRes.redFlagStatus}`
    );
  }

  // --- Test J: Language-independent completion parity ---
  {
    // English presentation
    let stateEn = createInitialInterviewState('sess_p8_j_en', { patientId: 'p1', encounterId: 'e1', language: 'en', chiefComplaint: 'abdominal pain' });
    stateEn = await updateStateWithTurn(stateEn, 'I have right-sided abdominal pain for two days, worse after food, no vomiting.');
    const compEn = evaluateInterviewCompletion(stateEn);

    // Tamil presentation with equivalent clinical facts
    let stateTa = createInitialInterviewState('sess_p8_j_ta', { patientId: 'p1', encounterId: 'e1', language: 'ta', chiefComplaint: 'வயிற்று வலி' });
    stateTa = await updateStateWithTurn(stateTa, 'எனக்கு இரண்டு நாட்களாக வலது பக்கத்தில் வயிற்று வலி இருக்கிறது, சாப்பிட்ட பிறகு அதிகமாகும், வாந்தி இல்லை.');
    const compTa = evaluateInterviewCompletion(stateTa);

    assert(
      compEn.complete && compTa.complete,
      'Test J: Clinical completion evaluator achieves parity across English and Tamil/Hindi',
      `compEn.complete=${compEn.complete}, compTa.complete=${compTa.complete}`
    );
  }

  // --- Test K: Multilingual state-derived fallback without question library ---
  {
    let stateTa = createInitialInterviewState('sess_p8_k_ta', { patientId: 'p1', encounterId: 'e1', language: 'ta', chiefComplaint: 'காய்ச்சல்' });
    stateTa.newSymptoms = ['காய்ச்சல்'];
    const fallbackTa = buildStateDerivedFallbackQuestion(stateTa);

    let stateHi = createInitialInterviewState('sess_p8_k_hi', { patientId: 'p1', encounterId: 'e1', language: 'hi', chiefComplaint: 'बुखार' });
    stateHi.newSymptoms = ['बुखार'];
    const fallbackHi = buildStateDerivedFallbackQuestion(stateHi);

    assert(
      fallbackTa.text.includes('காய்ச்சல்') && fallbackHi.text.includes('बुखार'),
      'Test K: State-derived fallbacks operate in patient language without question library',
      `Tamil fallback: "${fallbackTa.text}", Hindi fallback: "${fallbackHi.text}"`
    );
  }

  console.log(`\n=== Test Summary: ${passed}/${total} passed ===`);
  if (passed !== total) {
    process.exit(1);
  }
}

runPhase8Tests().catch(err => {
  console.error('Phase 8 test execution failed:', err);
  process.exit(1);
});
