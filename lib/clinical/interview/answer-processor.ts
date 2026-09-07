/**
 * Task #9 — Answer Processor & Fact Extraction Bridge
 * MediKiosk Clinical Architecture
 * 
 * Persists raw conversation answers in public.conversation_answers.
 * Invokes Task #8 Fact Extraction (extractClinicalFactsForEncounter).
 * Updates InterviewState with collected facts and safety flags.
 */

import { createAdminClient } from '@/lib/supabase/server';
import { extractClinicalFactsForEncounter } from '../fact-extraction';
import { evaluateSessionSafety } from './safety-controller';
import { updateStateAfterAnswer } from './interview-state';
import type { InterviewState, AnswerInput, ProcessAnswerResult } from './types';

import { analyzeAndUpdateInterviewState } from './interview-state-analyzer';

export async function processInterviewAnswer(
  state: InterviewState,
  input: AnswerInput
): Promise<{ updatedState: InterviewState; result: ProcessAnswerResult }> {
  const adminSupabase = await createAdminClient();
  const timestamp = new Date().toISOString();

  const answerString = Array.isArray(input.answer)
    ? input.answer.join(', ')
    : String(input.answer || '');

  // 1. Persist raw answer in public.conversation_answers
  if (state.encounterId) {
    const { error: ansErr } = await adminSupabase.from('conversation_answers').insert({
      encounter_id: state.encounterId,
      question_id: input.questionId,
      section: state.turnCount === 0 ? 'chief_complaint' : 'hpi',
      source_language: state.language || 'en',
      raw_text: answerString,
      normalized_english_text: input.nativeTranscript || answerString,
      input_method: input.inputMethod || 'touch',
      created_at: timestamp,
    });

    if (ansErr) {
      console.error('[Answer Processor] Error saving conversation answer:', ansErr);
    }
  }

  // 2. Run Task #8 Fact Extraction
  let extractedFacts: Array<Record<string, unknown>> = [];
  let factsExtractedCount = 0;

  if (state.encounterId) {
    const extractRes = await extractClinicalFactsForEncounter(state.encounterId);
    if (extractRes.success && extractRes.data) {
      factsExtractedCount = extractRes.data.factsCreated;
      extractedFacts = [
        {
          symptomsExtracted: extractRes.data.symptomsExtracted,
          medicationsExtracted: extractRes.data.medicationsExtracted,
          vitalsExtracted: extractRes.data.vitalsExtracted,
          ayushExtracted: extractRes.data.ayushExtracted,
          factsCreated: extractRes.data.factsCreated,
        },
      ];
    }
  }

  // 3. Update State with Answer and Extracted Facts
  const turn: import('./types').ConversationTurn = {
    role: 'patient',
    text: answerString,
    timestamp,
    questionId: input.questionId,
  };
  let newState = updateStateAfterAnswer(state, input, turn, extractedFacts);

  // 3b. Phase 4: Reason over evolving clinical state BEFORE next question / safety
  newState = await analyzeAndUpdateInterviewState(newState);

  // 4. Run Task #14 Red-Flag Evaluation
  const safetyRes = await evaluateSessionSafety(newState);

  if (safetyRes.isUrgent) {
    newState = {
      ...newState,
      status: 'terminated_for_safety',
      redFlags: safetyRes.triggeredFlag ? [...newState.redFlags, safetyRes.triggeredFlag] : newState.redFlags,
      completedAt: timestamp,
      updatedAt: timestamp,
    };

    return {
      updatedState: newState,
      result: {
        success: true,
        status: 'terminated_for_safety',
        factsExtractedCount,
        redFlagStatus: 'urgent',
        attentionFlag: safetyRes.triggeredFlag,
        progress: newState.progress,
        message: safetyRes.message,
      },
    };
  }

  return {
    updatedState: newState,
    result: {
      success: true,
      status: newState.status,
      factsExtractedCount,
      redFlagStatus: safetyRes.redFlagStatus,
      attentionFlag: safetyRes.triggeredFlag,
      progress: newState.progress,
    },
  };
}
