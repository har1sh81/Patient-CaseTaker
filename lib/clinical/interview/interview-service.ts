/**
 * Task #9 — Adaptive Clinical Interview Service
 * MediKiosk Clinical Architecture
 * 
 * Main orchestration service for the Adaptive Clinical Interview state machine.
 * Enforces consent, patient ownership, anti-repetition, stopping rules, safety, and persistence.
 */

import * as crypto from 'crypto';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { hasValidConsent } from '@/lib/consent/consent-service';
import { createInitialInterviewState, updateStateAfterQuestionAsked, setInterviewStatus, calculateProgress } from './interview-state';
import { selectNextQuestion, selectNextQuestionIntent, getLocalizedQuestionText, normalizeChiefComplaint } from './question-selector';
import { generateDynamicNextQuestion, buildStateDerivedFallbackQuestion } from './dynamic-question-engine';

/** Wrapper: never throws — falls back to a state-derived question on LLM error. */
async function safeGenerateQuestion(state: InterviewState): Promise<ConversationalQuestion> {
  try {
    return await generateDynamicNextQuestion(state);
  } catch (err: any) {
    console.warn('[Interview Service] LLM question generation failed, using fallback:', err.message);
    return buildStateDerivedFallbackQuestion(state);
  }
}
import { getClinicalInterviewQuestionProvider } from './clinical-interview-question-provider';
import { processInterviewAnswer } from './answer-processor';
import { URGENT_SAFETY_MESSAGE } from './safety-controller';
import { evaluateStoppingRules } from './stopping-rules';
import { saveInterviewSession, getInterviewSession, getActiveSessionForEncounter } from './interview-session';
import type { StartInterviewOptions, AnswerInput, ProcessAnswerResult, InterviewState, InterviewServiceResponse, ConversationalQuestion, GenerateQuestionInput } from './types';
import type { ClinicalQuestion } from '../questions/types';

/**
 * Audit logger for interview state machine events.
 * High-level metadata only (NEVER logs raw clinical text).
 */
export async function logInterviewAudit(
  action: 'interview_started' | 'interview_answer_recorded' | 'interview_paused' | 'interview_resumed' | 'interview_completed' | 'interview_terminated_for_safety',
  patientId: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from('audit_logs').insert({
      action,
      actor_type: 'patient',
      actor_id: patientId,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[Interview Audit Log] Error writing audit log:', err);
  }
}

export async function startInterviewSession(
  options: StartInterviewOptions
): Promise<InterviewServiceResponse<{
  sessionId: string;
  status: string;
  currentQuestion?: ConversationalQuestion;
  progress: number;
}>> {
  if (!options.patientId) {
    return { success: false, errorCode: 'INVALID_INPUT', error: 'Patient ID is required' };
  }

  // 1. Consent Verification
  const isAyush = options.consultationMode === 'ayush';
  const permissionKey = isAyush ? 'share_ayush_records' : 'share_health_records';
  const hasConsent = await hasValidConsent(options.patientId, permissionKey);

  if (!hasConsent) {
    await logInterviewAudit('interview_terminated_for_safety', options.patientId, { reason: 'CONSENT_DENIED', permissionKey });
    return {
      success: false,
      errorCode: 'CONSENT_DENIED',
      error: `Patient consent '${permissionKey}' required to start clinical interview`,
    };
  }

  try {
    const adminSupabase = await createAdminClient();

    // Verify patient exists
    const { data: patient } = await adminSupabase.from('patients').select('id').eq('id', options.patientId).single();
    if (!patient) {
      return { success: false, errorCode: 'NOT_FOUND', error: 'Patient record not found' };
    }

    // Check existing active session for encounter (idempotent resume/avoid duplicate sessions)
    if (options.encounterId) {
      const existing = await getActiveSessionForEncounter(options.encounterId);
      if (existing) {
        const conversationalQ = await safeGenerateQuestion(existing);
        return {
          success: true,
          data: {
            sessionId: existing.sessionId,
            status: existing.status,
            currentQuestion: conversationalQ,
            progress: existing.progress,
          },
        };
      }
    }

    // 2. Initialize State
    const sessionId = options.sessionId || crypto.randomUUID();
    let state = createInitialInterviewState(sessionId, options);

    // 3. Ask first question via LLM Engine
    const conversationalQ = await safeGenerateQuestion(state);
    
    state = updateStateAfterQuestionAsked(state, conversationalQ);

    state.progress = calculateProgress(state);

    // 4. Persist Session
    await saveInterviewSession(state);
    await logInterviewAudit('interview_started', options.patientId, {
      sessionId,
      encounterId: options.encounterId,
      department: state.department,
      consultationMode: state.consultationMode,
      language: state.language,
      chiefComplaint: state.chiefComplaint,
    });

    return {
      success: true,
      data: {
        sessionId,
        status: state.status,
        currentQuestion: conversationalQ,
        progress: state.progress,
      },
    };
  } catch (err: any) {
    console.error('[Interview Service] Start Exception:', err);
    return {
      success: false,
      errorCode: 'INTERNAL_SERVER_ERROR',
      error: err.message || 'Failed to start clinical interview session',
    };
  }
}

import { evaluateInterviewCompletion } from './interview-completion-evaluator';

export async function submitInterviewAnswer(
  sessionId: string,
  input: AnswerInput
): Promise<InterviewServiceResponse<ProcessAnswerResult & { nextQuestion?: ConversationalQuestion }>> {
  if (!sessionId || !input.questionId) {
    return { success: false, errorCode: 'INVALID_INPUT', error: 'sessionId and questionId are required' };
  }

  let state = await getInterviewSession(sessionId);
  if (!state) {
    return { success: false, errorCode: 'NOT_FOUND', error: 'Interview session not found' };
  }

  if (state.status === 'completed' || state.status === 'terminated_for_safety') {
    return {
      success: true,
      data: {
        success: true,
        status: state.status,
        factsExtractedCount: 0,
        redFlagStatus: state.status === 'terminated_for_safety' ? 'urgent' : 'none',
        progress: state.progress,
        nextQuestion: undefined,
        message: `Interview session is already ${state.status}`,
      },
    };
  }

  // Anti-Repetition Check: Prevent submitting duplicate answer for already answered question
  if (state.conversationTurns.some(t => t.role === 'patient' && t.questionId === input.questionId)) {
    const completionEval = evaluateInterviewCompletion(state);
    if (completionEval.complete) {
      return {
        success: true,
        data: {
          success: true,
          status: 'completed',
          factsExtractedCount: 0,
          redFlagStatus: 'none',
          progress: 100,
          nextQuestion: undefined,
        },
      };
    }

    const conversationalQuestion = await safeGenerateQuestion(state);
    return {
      success: true,
      data: {
        success: true,
        status: state.status,
        factsExtractedCount: 0,
        redFlagStatus: 'none',
        progress: state.progress,
        nextQuestion: conversationalQuestion,
      },
    };
  }

  try {
    // 1. Process Answer & Extract Facts & Evaluate Safety
    const { updatedState, result } = await processInterviewAnswer(state, input);
    state = updatedState;

    if (result.status === 'terminated_for_safety') {
      await saveInterviewSession(state);
      await logInterviewAudit('interview_terminated_for_safety', state.patientId, {
        sessionId,
        questionId: input.questionId,
        redFlag: result.attentionFlag,
      });

      return {
        success: true,
        data: result,
      };
    }

    // 2. Evaluate Intelligent Completion (Phase 6 / Phase 7)
    const completionEval = evaluateInterviewCompletion(state);
    state.completionMetadata = completionEval;

    if (completionEval.complete) {
      if (completionEval.reason === 'URGENT_REVIEW' || state.status === 'terminated_for_safety' || state.status === 'urgent_review') {
        state = setInterviewStatus(state, 'terminated_for_safety');
        await saveInterviewSession(state);
        await logInterviewAudit('interview_terminated_for_safety', state.patientId, {
          sessionId,
          reason: 'URGENT_REVIEW',
        });

        return {
          success: true,
          data: {
            success: true,
            status: 'terminated_for_safety',
            factsExtractedCount: result.factsExtractedCount,
            redFlagStatus: 'urgent',
            attentionFlag: state.redFlags?.[0] as Record<string, unknown>,
            progress: state.progress,
            nextQuestion: undefined,
            message: URGENT_SAFETY_MESSAGE,
          },
        };
      }

      state = setInterviewStatus(state, 'completed');
      state.lastQuestion = null;
      state.progress = 100;

      await saveInterviewSession(state);
      await logInterviewAudit('interview_completed', state.patientId, {
        sessionId,
        totalQuestionsAsked: state.askedQuestions.length,
        totalAnswered: state.turnCount,
        reason: completionEval.reason,
      });

      return {
        success: true,
        data: {
          success: true,
          status: 'completed',
          factsExtractedCount: result.factsExtractedCount,
          redFlagStatus: result.redFlagStatus,
          progress: 100,
          nextQuestion: undefined,
          message: `Interview session successfully completed: ${completionEval.explanation || completionEval.reason}`,
        },
      };
    }

    // 3. Generate next question if incomplete
    let conversationalQuestion: ConversationalQuestion;
    try {
      conversationalQuestion = await generateDynamicNextQuestion(state);
    } catch (qgenErr: any) {
      // If LLM quota is exhausted or question generation fails, use state-derived fallback
      // The answer was already saved — do NOT let question generation failure undo that.
      console.warn('[Interview Service] generateDynamicNextQuestion failed, using built-in fallback:', qgenErr.message);
      const { buildStateDerivedFallbackQuestion } = await import('./dynamic-question-engine');
      conversationalQuestion = buildStateDerivedFallbackQuestion(state);
    }

    // Update state with selected next question
    state = updateStateAfterQuestionAsked(state, conversationalQuestion);
    state.progress = calculateProgress(state);

    await saveInterviewSession(state);
    await logInterviewAudit('interview_answer_recorded', state.patientId, {
      sessionId,
      questionId: input.questionId,
      inputMethod: input.inputMethod,
      nextQuestionId: conversationalQuestion.id,
      generationMode: conversationalQuestion.generationMode,
      progress: state.progress,
    });

    return {
      success: true,
      data: {
        success: true,
        status: state.status,
        factsExtractedCount: result.factsExtractedCount,
        redFlagStatus: result.redFlagStatus,
        progress: state.progress,
        nextQuestion: conversationalQuestion,
      },
    };
  } catch (err: any) {
    console.error('[Interview Service] Submit Answer Exception:', err);
    return {
      success: false,
      errorCode: 'INTERNAL_SERVER_ERROR',
      error: err.message || 'Failed to process answer',
    };
  }
}

export async function pauseInterviewSession(
  sessionId: string
): Promise<InterviewServiceResponse<{ sessionId: string; status: string }>> {
  let state = await getInterviewSession(sessionId);
  if (!state) return { success: false, errorCode: 'NOT_FOUND', error: 'Session not found' };

  state = setInterviewStatus(state, 'paused');
  await saveInterviewSession(state);
  await logInterviewAudit('interview_paused', state.patientId, { sessionId });

  return { success: true, data: { sessionId, status: state.status } };
}

export async function resumeInterviewSession(
  sessionId: string
): Promise<InterviewServiceResponse<{ sessionId: string; status: string; currentQuestion?: ConversationalQuestion }>> {
  let state = await getInterviewSession(sessionId);
  if (!state) return { success: false, errorCode: 'NOT_FOUND', error: 'Session not found' };

  if (state.status === 'completed' || state.status === 'terminated_for_safety') {
    return {
      success: true,
      data: {
        sessionId,
        status: state.status,
        currentQuestion: undefined,
      },
    };
  }

  state = setInterviewStatus(state, 'active');

  const conversationalQuestion = await safeGenerateQuestion(state);
  
  if (!state.lastQuestion) {
    state = updateStateAfterQuestionAsked(state, conversationalQuestion);
  }

  await saveInterviewSession(state);
  await logInterviewAudit('interview_resumed', state.patientId, { sessionId });

  return {
    success: true,
    data: {
      sessionId,
      status: state.status,
      currentQuestion: conversationalQuestion,
    },
  };
}

export async function completeInterviewSession(
  sessionId: string
): Promise<InterviewServiceResponse<{ sessionId: string; status: string; progress: number }>> {
  let state = await getInterviewSession(sessionId);
  if (!state) return { success: false, errorCode: 'NOT_FOUND', error: 'Session not found' };

  state = setInterviewStatus(state, 'completed');
  state.progress = 100;
  state.lastQuestion = null;

  await saveInterviewSession(state);
  await logInterviewAudit('interview_completed', state.patientId, { sessionId, manual: true });

  return { success: true, data: { sessionId, status: state.status, progress: 100 } };
}
