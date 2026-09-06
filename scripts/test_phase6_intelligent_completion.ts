import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { evaluateInterviewCompletion, MAX_INTERVIEW_TURNS } from '../lib/clinical/interview/interview-completion-evaluator';
import { createInitialInterviewState, updateStateAfterAnswer } from '../lib/clinical/interview/interview-state';
import { analyzeAndUpdateInterviewState } from '../lib/clinical/interview/interview-state-analyzer';
import { submitInterviewAnswer, startInterviewSession, resumeInterviewSession } from '../lib/clinical/interview/interview-service';
import type { InterviewState } from '../lib/clinical/interview/types';


async function updateStateWithTurn(state: InterviewState, text: string): Promise<InterviewState> {
  const turn = { role: 'patient' as const, text, timestamp: new Date().toISOString() };
  let updated = updateStateAfterAnswer(state, { sessionId: state.sessionId, answer: text }, turn);
  updated = await analyzeAndUpdateInterviewState(updated);
  return updated;
}


async function runTests() {
  console.log('=== Starting Phase 6 Intelligent Completion Tests ===\n');
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

  // --- Test A: Too little information ---
  {
    let state = createInitialInterviewState('sess_test_a', { patientId: 'p1', encounterId: 'e1', chiefComplaint: 'stomach pain' });
    state = await updateStateWithTurn(state, 'I have stomach pain.');
    const result = evaluateInterviewCompletion(state);
    assert(
      !result.complete && result.reason === 'INSUFFICIENT_HISTORY',
      'Test A: Too little information remains incomplete',
      `Got complete=${result.complete}, reason=${result.reason}`
    );
  }

  // --- Test B: Progressive completion ---
  {
    let state = createInitialInterviewState('sess_test_b', { patientId: 'p1', encounterId: 'e1', chiefComplaint: 'abdominal pain' });
    
    // Turn 1
    state = await updateStateWithTurn(state, 'I have abdominal pain.');
    let res1 = evaluateInterviewCompletion(state);
    
    // Turn 2
    state = await updateStateWithTurn(state, 'It started yesterday on the right side.');
    let res2 = evaluateInterviewCompletion(state);

    // Turn 3
    state = await updateStateWithTurn(state, 'It gets worse after eating, no vomiting or fever.');
    let res3 = evaluateInterviewCompletion(state);

    assert(
      !res1.complete && res3.complete && res3.reason === 'SUFFICIENT_HISTORY',
      'Test B: Progressive completion across turns',
      `Turn 1 complete=${res1.complete}, Turn 3 complete=${res3.complete}, reason=${res3.reason}, explanation=${res3.explanation}`
    );
  }

  // --- Test C: Explicit negatives count as covered ---
  {
    let state = createInitialInterviewState('sess_test_c', { patientId: 'p1', encounterId: 'e1', chiefComplaint: 'chest tightness' });
    state.explicitNegatives = ['nausea', 'vomiting', 'fever', 'diarrhea'];
    state = await updateStateWithTurn(state, 'I have chest tightness since this morning. No nausea, no vomiting, no fever.');
    const result = evaluateInterviewCompletion(state);

    assert(
      result.complete || (state.explicitNegatives.length > 0 && result.missingCriticalInformation.length < 2),
      'Test C: Explicit negatives count as covered information',
      `Explicit negatives count=${state.explicitNegatives.length}, complete=${result.complete}`
    );
  }

  // --- Test D: Rich initial answer ---
  {
    let state = createInitialInterviewState('sess_test_d', { patientId: 'p1', encounterId: 'e1', chiefComplaint: 'abdominal pain' });
    state = await updateStateWithTurn(
      state,
      'I have severe right-sided abdominal pain for two days, it is worse after food, no vomiting, no diarrhea and no fever.'
    );
    const result = evaluateInterviewCompletion(state);

    assert(
      result.complete && result.reason === 'SUFFICIENT_HISTORY',
      'Test D: Rich initial answer completes interview without redundant questioning',
      `complete=${result.complete}, reason=${result.reason}`
    );
  }

  // --- Test E: New symptom prevents premature completion ---
  {
    let state = createInitialInterviewState('sess_test_e', { patientId: 'p1', encounterId: 'e1', chiefComplaint: 'headache' });
    state = await updateStateWithTurn(state, 'I had a headache yesterday.');
    state = await updateStateWithTurn(state, 'Now I also have blurry vision today.');
    state.newSymptoms = ['blurry vision'];
    
    const result = evaluateInterviewCompletion(state);

    assert(
      !result.complete || result.unresolvedImportantTopics.includes('blurry vision') || result.reason === 'IMPORTANT_TOPIC_UNRESOLVED',
      'Test E: Newly introduced symptom re-opens or delays completion',
      `complete=${result.complete}, reason=${result.reason}`
    );
  }

  // --- Test F: Clarification required ---
  {
    let state = createInitialInterviewState('sess_test_f', { patientId: 'p1', encounterId: 'e1' });
    state = await updateStateWithTurn(state, 'I feel bad.');
    state.clarificationsNeeded = ['Specify if bad means pain, dizziness, or nausea'];
    
    const result = evaluateInterviewCompletion(state);

    assert(
      !result.complete && result.reason === 'CLARIFICATION_REQUIRED',
      'Test F: Required clarification keeps interview incomplete',
      `complete=${result.complete}, reason=${result.reason}`
    );
  }

  // --- Test G: Contradiction handling ---
  {
    let state = createInitialInterviewState('sess_test_g', { patientId: 'p1', encounterId: 'e1' });
    state = await updateStateWithTurn(state, 'The pain started yesterday.');
    state = await updateStateWithTurn(state, "Actually I've had this pain for three months.");
    
    const result = evaluateInterviewCompletion(state);

    assert(
      (state.unresolvedTopics || []).some(t => t.toLowerCase().includes('contradiction')),
      'Test G: Unresolved contradiction identified and added to unresolved topics',
      `Unresolved topics: ${JSON.stringify(state.unresolvedTopics)}`
    );
  }

  // --- Test H: Red flag safety precedence ---
  {
    let state = createInitialInterviewState('sess_test_h', { patientId: 'p1', encounterId: 'e1' });
    state.status = 'urgent_review';
    state.redFlags = [{ id: 'rf1', label: 'Severe chest pain radiating to arm', severity: 'red_flag' }];
    
    const result = evaluateInterviewCompletion(state);

    assert(
      result.complete && result.reason === 'URGENT_REVIEW',
      'Test H: Red flag safety state takes precedence over normal completion',
      `complete=${result.complete}, reason=${result.reason}`
    );
  }

  // --- Test I: Maximum turns protection ---
  {
    let state = createInitialInterviewState('sess_test_i', { patientId: 'p1', encounterId: 'e1' });
    state.turnCount = MAX_INTERVIEW_TURNS;
    
    const result = evaluateInterviewCompletion(state);

    assert(
      result.complete && result.reason === 'MAX_TURNS_REACHED',
      'Test I: Maximum turns bound terminates safely',
      `complete=${result.complete}, reason=${result.reason}`
    );
  }

  // --- Test J: Resumed completed session ---
  {
    const { createAdminClient } = await import('../lib/supabase/server');
    const adminSupabase = await createAdminClient();
    const patientId = 'a6666666-6666-4666-8666-000000000006';
    const encounterId = 'c6666666-6666-4666-8666-000000000006';

    await adminSupabase.from('patients').upsert({ id: patientId, first_name: 'Phase6', last_name: 'CompletionTest', full_name: 'Phase6 CompletionTest', gender: 'Female', date_of_birth: '1995-05-05' });
    await adminSupabase.from('encounters').upsert({ id: encounterId, patient_id: patientId, status: 'in_progress', intake_mode: 'kiosk_touch', language_code: 'en', department_mode: 'standard', current_step: 'chief_complaint' });
    await adminSupabase.from('patient_consents').upsert({
      id: 'd6666666-6666-4666-8666-000000000006',
      patient_id: patientId,
      encounter_id: encounterId,
      consent_version: 'v1.0',
      language_code: 'en',
      permissions: { share_health_records: true, share_ayush_records: true },
      accepted: true,
      status: 'accepted',
    });

    const startRes = await startInterviewSession({
      patientId,
      encounterId,
      chiefComplaint: 'Headache for 3 days',
    });

    if (!startRes.success || !startRes.data) {
      assert(false, 'Test J: Session start failed', startRes.error);
      return;
    }

    const sessionId = startRes.data.sessionId;
    const currentQ = startRes.data.currentQuestion;

    let submitRes = await submitInterviewAnswer(sessionId, {
      sessionId,
      questionId: currentQ?.id || 'q_init',
      answer: 'I have severe throbbing headache for 3 days on the left side, worse with light, no fever, no vision loss.',
    });

    const submitData = submitRes.data;

    assert(
      submitData?.status === 'completed',
      'Test J: Session completes with rich answer',
      `Status=${submitData?.status}`
    );

    // Resume completed session
    const resumeRes = await resumeInterviewSession(sessionId);
    const resumeData = resumeRes.data;

    assert(
      resumeData?.status === 'completed' && resumeData?.nextQuestion === undefined,
      'Test J: Resumed completed session remains completed without generating next question',
      `Resume status=${resumeData?.status}, nextQuestion=${resumeData?.nextQuestion}`
    );
  }


  console.log(`\n=== Test Summary: ${passed}/${total} passed ===`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
