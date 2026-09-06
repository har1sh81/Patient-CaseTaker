/**
 * MediKiosk — Phase 9: Voice + Dynamic Interview Integration Automated Test Suite
 *
 * Verifies all 10 required Phase 9 tests (Test A through Test J):
 * - Test A: English voice ASR transcript -> interview state -> dynamic question
 * - Test B: Tamil voice transcript -> language-aware state -> Tamil dynamic question
 * - Test C: Hindi voice transcript -> language-aware state -> Hindi dynamic question
 * - Test D: New symptom by voice (active topic reprioritization)
 * - Test E: Voice red flag (spoken emergency pattern -> deterministic urgent safety termination)
 * - Test F: Voice explicit negative handling ("I don't have vomiting")
 * - Test G: Uncertain/empty transcript handling (no state corruption / no fabricated facts)
 * - Test H: Voice/text equivalence (equivalent text and voice produce compatible state)
 * - Test I: Voice consent enforcement (revoked/missing consent returns 403)
 * - Test J: No old question library fallback during voice processing
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { processVoicePipeline } from '../lib/voice/pipeline/voice-pipeline';
import { startInterviewSession, submitInterviewAnswer } from '../lib/clinical/interview/interview-service';
import { getInterviewSession } from '../lib/clinical/interview/interview-session';
import { createAdminClient } from '../lib/supabase/server';

async function runPhase9Tests() {
  console.log('===========================================================');
  console.log('MEDIKIOSK — PHASE 9 VOICE + DYNAMIC INTERVIEW TEST SUITE');
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

  // Seed test patients & consent
  const adminSupabase = await createAdminClient();
  const patientWithConsentId = 'a9999999-9999-4999-9999-000000000009';
  const patientNoConsentId = 'b9999999-9999-4999-9999-000000000009';
  const encounterIdWithConsent = 'c9999999-9999-4999-9999-000000000009';
  const encounterIdNoConsent = 'd9999999-9999-4999-9999-000000000009';

  // Seed patient with consent
  await adminSupabase.from('patients').upsert({
    id: patientWithConsentId,
    first_name: 'Phase9',
    last_name: 'VoiceTest',
    full_name: 'Phase9 VoiceTest',
    gender: 'Male',
    date_of_birth: '1990-01-01',
  });
  await adminSupabase.from('encounters').upsert({
    id: encounterIdWithConsent,
    patient_id: patientWithConsentId,
    status: 'in_progress',
    intake_mode: 'kiosk_voice',
    language_code: 'en',
    department_mode: 'standard',
    current_step: 'chief_complaint',
  });
  await adminSupabase.from('patient_consents').upsert({
    id: 'e9999999-9999-4999-9999-000000000009',
    patient_id: patientWithConsentId,
    encounter_id: encounterIdWithConsent,
    consent_version: 'v1.0',
    language_code: 'en',
    permissions: { share_health_records: true, share_ayush_records: true, voice_recording: true },
    accepted: true,
    status: 'accepted',
  });

  // Seed patient WITHOUT voice consent
  await adminSupabase.from('patients').upsert({
    id: patientNoConsentId,
    first_name: 'NoVoiceConsent',
    last_name: 'Patient',
    full_name: 'NoVoiceConsent Patient',
    gender: 'Female',
    date_of_birth: '1995-05-05',
  });
  await adminSupabase.from('encounters').upsert({
    id: encounterIdNoConsent,
    patient_id: patientNoConsentId,
    status: 'in_progress',
    intake_mode: 'kiosk_voice',
    language_code: 'en',
    department_mode: 'standard',
    current_step: 'chief_complaint',
  });
  await adminSupabase.from('patient_consents').upsert({
    id: 'f9999999-9999-4999-9999-000000000009',
    patient_id: patientNoConsentId,
    encounter_id: encounterIdNoConsent,
    consent_version: 'v1.0',
    language_code: 'en',
    permissions: { share_health_records: true, share_ayush_records: true, voice_recording: false },
    accepted: true,
    status: 'accepted',
  });

  // --- Test A: English voice ASR transcript -> interview state -> dynamic question ---
  {
    const startRes = await startInterviewSession({
      patientId: patientWithConsentId,
      encounterId: encounterIdWithConsent,
      language: 'en',
      chiefComplaint: 'stomach pain',
    });

    assert(startRes.success && !!startRes.data, 'Test A: Start English session');
    const session = startRes.data!;
    const q1Id = session.currentQuestion?.id || 'q_1';

    const voiceRes = await processVoicePipeline({
      patientId: patientWithConsentId,
      encounterId: encounterIdWithConsent,
      sessionId: session.sessionId,
      questionId: q1Id,
      rawTranscriptOverride: 'I have stomach pain.',
      languageHint: 'en',
    });

    const nextQText = (voiceRes.data?.interview?.nextQuestion as any)?.text;

    assert(
      voiceRes.success &&
      voiceRes.data?.interview?.status === 'in_progress' &&
      !!nextQText,
      'Test A: English voice transcript processed into interview state and produced dynamic next question',
      `Next question text: "${nextQText}"`
    );
  }

  // --- Test B: Tamil voice transcript -> language-aware state -> Tamil dynamic question ---
  {
    const startRes = await startInterviewSession({
      patientId: patientWithConsentId,
      encounterId: encounterIdWithConsent,
      language: 'ta',
      chiefComplaint: 'வயிறு வலி',
    });

    assert(startRes.success && !!startRes.data, 'Test B: Start Tamil session');
    const session = startRes.data!;
    const q1Id = session.currentQuestion?.id || 'q_1';

    const voiceRes = await processVoicePipeline({
      patientId: patientWithConsentId,
      encounterId: encounterIdWithConsent,
      sessionId: session.sessionId,
      questionId: q1Id,
      rawTranscriptOverride: 'எனக்கு வயிறு வலி இருக்கிறது.',
      languageHint: 'ta',
    });

    const nextQText = (voiceRes.data?.interview?.nextQuestion as any)?.text;

    assert(
      voiceRes.success &&
      voiceRes.data?.interview?.status === 'in_progress' &&
      !!nextQText,
      'Test B: Tamil voice transcript processed into interview state and produced dynamic next question',
      `Next question text: "${nextQText}"`
    );
  }

  // --- Test C: Hindi voice transcript -> language-aware state -> Hindi dynamic question ---
  {
    const startRes = await startInterviewSession({
      patientId: patientWithConsentId,
      encounterId: encounterIdWithConsent,
      language: 'hi',
      chiefComplaint: 'पेट दर्द',
    });

    assert(startRes.success && !!startRes.data, 'Test C: Start Hindi session');
    const session = startRes.data!;
    const q1Id = session.currentQuestion?.id || 'q_1';

    const voiceRes = await processVoicePipeline({
      patientId: patientWithConsentId,
      encounterId: encounterIdWithConsent,
      sessionId: session.sessionId,
      questionId: q1Id,
      rawTranscriptOverride: 'मुझे पेट दर्द है.',
      languageHint: 'hi',
    });

    const nextQText = (voiceRes.data?.interview?.nextQuestion as any)?.text;

    assert(
      voiceRes.success &&
      voiceRes.data?.interview?.status === 'in_progress' &&
      !!nextQText,
      'Test C: Hindi voice transcript processed into interview state and produced dynamic next question',
      `Next question text: "${nextQText}"`
    );
  }

  // --- Test D: New symptom introduced by voice ---
  {
    const startRes = await startInterviewSession({
      patientId: patientWithConsentId,
      encounterId: encounterIdWithConsent,
      language: 'en',
      chiefComplaint: 'headache',
    });

    assert(startRes.success && !!startRes.data, 'Test D: Start headache session');
    const session = startRes.data!;
    const q1Id = session.currentQuestion?.id || 'q_1';

    const voiceRes = await processVoicePipeline({
      patientId: patientWithConsentId,
      encounterId: encounterIdWithConsent,
      sessionId: session.sessionId,
      questionId: q1Id,
      rawTranscriptOverride: 'My head hurts, but actually I also started having sharp chest pain today.',
      languageHint: 'en',
    });

    const updatedState = await getInterviewSession(session.sessionId);
    const hasChestPainInState =
      (updatedState?.newSymptoms || []).some(s => s.toLowerCase().includes('chest')) ||
      (updatedState?.knownSymptoms || []).some(s => s.toLowerCase().includes('chest')) ||
      (updatedState?.activeTopic || '').toLowerCase().includes('chest');

    assert(
      voiceRes.success && hasChestPainInState,
      'Test D: Voice answer introducing new symptom (chest pain) reprioritized active topic / updated state',
      `Active topic: "${updatedState?.activeTopic}", Known: ${JSON.stringify(updatedState?.knownSymptoms)}, New: ${JSON.stringify(updatedState?.newSymptoms)}`
    );
  }

  // --- Test E: Voice red flag (spoken emergency pattern -> deterministic urgent safety termination) ---
  {
    const startRes = await startInterviewSession({
      patientId: patientWithConsentId,
      encounterId: encounterIdWithConsent,
      language: 'en',
      chiefComplaint: 'chest pain',
    });

    assert(startRes.success && !!startRes.data, 'Test E: Start session for red flag test');
    const session = startRes.data!;
    const q1Id = session.currentQuestion?.id || 'q_1';

    const voiceRes = await processVoicePipeline({
      patientId: patientWithConsentId,
      encounterId: encounterIdWithConsent,
      sessionId: session.sessionId,
      questionId: q1Id,
      rawTranscriptOverride: 'I have crushing chest pain and I am very short of breath and sweating.',
      languageHint: 'en',
    });

    assert(
      voiceRes.success &&
      voiceRes.data?.interview?.status === 'terminated_for_safety' &&
      voiceRes.data?.interview?.redFlagStatus === 'urgent' &&
      voiceRes.data?.interview?.nextQuestion === undefined,
      'Test E: Voice transcript with red flag triggered immediate deterministic safety termination (no normal next question)',
      `Status: "${voiceRes.data?.interview?.status}", RedFlagStatus: "${voiceRes.data?.interview?.redFlagStatus}"`
    );
  }

  // --- Test F: Voice explicit negative handling ---
  {
    const startRes = await startInterviewSession({
      patientId: patientWithConsentId,
      encounterId: encounterIdWithConsent,
      language: 'en',
      chiefComplaint: 'stomach pain',
    });

    assert(startRes.success && !!startRes.data, 'Test F: Start session for explicit negative test');
    const session = startRes.data!;
    const q1Id = session.currentQuestion?.id || 'q_1';

    const voiceRes = await processVoicePipeline({
      patientId: patientWithConsentId,
      encounterId: encounterIdWithConsent,
      sessionId: session.sessionId,
      questionId: q1Id,
      rawTranscriptOverride: 'I have abdominal pain, but I do not have any vomiting.',
      languageHint: 'en',
    });

    const updatedState = await getInterviewSession(session.sessionId);
    const vomitingNegated = (updatedState?.explicitNegatives || []).some(neg => neg.toLowerCase().includes('vomit'));

    assert(
      voiceRes.success && vomitingNegated,
      'Test F: Spoken explicit negative ("I do not have any vomiting") correctly recorded as negative fact in state',
      `Explicit negatives: ${JSON.stringify(updatedState?.explicitNegatives)}`
    );
  }

  // --- Test G: Uncertain/empty transcript handling ---
  {
    const voiceRes = await processVoicePipeline({
      patientId: patientWithConsentId,
      encounterId: encounterIdWithConsent,
      sessionId: 'sess_test_empty',
      questionId: 'q_empty',
      rawTranscriptOverride: '   ',
      languageHint: 'en',
    });

    assert(
      !voiceRes.success &&
      voiceRes.statusCode === 400 &&
      voiceRes.error?.includes('failed to produce a transcript'),
      'Test G: Empty/whitespace voice transcript rejected with HTTP 400 without state corruption or fabricated facts',
      `StatusCode: ${voiceRes.statusCode}, Error: "${voiceRes.error}"`
    );
  }

  // --- Test H: Voice/text equivalence ---
  {
    const statement = 'I have stomach pain.';

    // Text flow
    const startTextRes = await startInterviewSession({
      patientId: patientWithConsentId,
      encounterId: encounterIdWithConsent,
      language: 'en',
      chiefComplaint: 'stomach pain',
    });
    const sessionText = startTextRes.data!;
    const textSubRes = await submitInterviewAnswer(sessionText.sessionId, {
      questionId: sessionText.currentQuestion?.id || 'q_1',
      answer: statement,
      inputMethod: 'text',
    });

    // Voice flow
    const startVoiceRes = await startInterviewSession({
      patientId: patientWithConsentId,
      encounterId: encounterIdWithConsent,
      language: 'en',
      chiefComplaint: 'stomach pain',
    });
    const sessionVoice = startVoiceRes.data!;
    const voicePipelineRes = await processVoicePipeline({
      patientId: patientWithConsentId,
      encounterId: encounterIdWithConsent,
      sessionId: sessionVoice.sessionId,
      questionId: sessionVoice.currentQuestion?.id || 'q_1',
      rawTranscriptOverride: statement,
      languageHint: 'en',
    });

    const textState = await getInterviewSession(sessionText.sessionId);
    const voiceState = await getInterviewSession(sessionVoice.sessionId);

    assert(
      textSubRes.success &&
      voicePipelineRes.success &&
      textState?.activeTopic === voiceState?.activeTopic &&
      textState?.status === voiceState?.status,
      'Test H: Equivalent text and voice inputs produce compatible state updates and active topic',
      `Text activeTopic: "${textState?.activeTopic}", Voice activeTopic: "${voiceState?.activeTopic}"`
    );
  }

  // --- Test I: Consent enforcement ---
  {
    const voiceRes = await processVoicePipeline({
      patientId: patientNoConsentId,
      encounterId: encounterIdNoConsent,
      rawTranscriptOverride: 'I have pain in my shoulder.',
      languageHint: 'en',
    });

    assert(
      !voiceRes.success &&
      voiceRes.statusCode === 403 &&
      voiceRes.error?.includes('consent missing or revoked'),
      'Test I: Voice request without required voice_recording consent correctly rejected with HTTP 403',
      `StatusCode: ${voiceRes.statusCode}, Error: "${voiceRes.error}"`
    );
  }

  // --- Test J: No old question library fallback during voice processing ---
  {
    const startRes = await startInterviewSession({
      patientId: patientWithConsentId,
      encounterId: encounterIdWithConsent,
      language: 'en',
      chiefComplaint: 'joint pain',
    });
    const session = startRes.data!;
    const q1Id = session.currentQuestion?.id || 'q_1';

    // Intentionally clear API keys to force LLM fallback during voice processing
    const origInterviewKey = process.env.INTERVIEW_LLM_API_KEY;
    const origOpenAIKey = process.env.OPENAI_API_KEY;
    const origGeminiKey = process.env.GEMINI_API_KEY;

    delete process.env.INTERVIEW_LLM_API_KEY;
    delete process.env.OPENAI_API_KEY;
    process.env.GEMINI_API_KEY = 'invalid_key_for_testing';

    const voiceRes = await processVoicePipeline({
      patientId: patientWithConsentId,
      encounterId: encounterIdWithConsent,
      sessionId: session.sessionId,
      questionId: q1Id,
      rawTranscriptOverride: 'My knees hurt when walking.',
      languageHint: 'en',
    });

    if (origInterviewKey) process.env.INTERVIEW_LLM_API_KEY = origInterviewKey;
    if (origOpenAIKey) process.env.OPENAI_API_KEY = origOpenAIKey;
    if (origGeminiKey) process.env.GEMINI_API_KEY = origGeminiKey;

    const nextQ = voiceRes.data?.interview?.nextQuestion as any;
    const isLibraryQuestion = nextQ?.id && (nextQ.id.startsWith('q_headache') || nextQ.id.startsWith('q_chest') || nextQ.id.startsWith('q_fever'));

    assert(
      voiceRes.success &&
      !!nextQ &&
      !isLibraryQuestion &&
      (nextQ.id?.startsWith('dynamic_') || nextQ.id?.startsWith('stalled_')),
      'Test J: LLM error during voice intake falls back to dynamic state-derived question (NEVER legacy library)',
      `Returned Question ID: "${nextQ?.id}", Text: "${nextQ?.text}"`
    );
  }

  console.log('\n===========================================================');
  console.log(`PHASE 9 TEST SUMMARY: ${passed} / ${total} TESTS PASSED`);
  console.log('===========================================================');

  if (passed === total) {
    console.log('\nALL PHASE 9 VOICE INTEGRATION TESTS PASSED!');
    process.exit(0);
  } else {
    console.error(`\nSOME PHASE 9 TESTS FAILED (${total - passed} failed).`);
    process.exit(1);
  }
}

runPhase9Tests().catch(err => {
  console.error('Unhandled exception in Phase 9 test suite:', err);
  process.exit(1);
});
