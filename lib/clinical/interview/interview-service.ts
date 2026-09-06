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
import { getClinicalInterviewQuestionProvider } from './clinical-interview-question-provider';
import { processInterviewAnswer } from './answer-processor';
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
        const nextQ = existing.currentQuestionId
          ? (await import('../questions')).getQuestionById(existing.currentQuestionId)
          : selectNextQuestion(existing);

        const localized = nextQ ? getLocalizedQuestionText(nextQ, existing.language) : undefined;
        return {
          success: true,
          data: {
            sessionId: existing.sessionId,
            status: existing.status,
            currentQuestion: nextQ
              ? {
                  id: nextQ.id,
                  intentId: `${nextQ.complaint}_${nextQ.category}_${nextQ.targetField}`,
                  text: localized?.text || nextQ.id,
                  generationMode: 'library_fallback',
                  answerType: nextQ.answerType,
                  choices: localized?.options,
                  targetField: nextQ.targetField,
                }
              : undefined,
            progress: existing.progress,
          },
        };
      }
    }

    // 2. Initialize State
    const sessionId = crypto.randomUUID();
    let state = createInitialInterviewState(sessionId, options);

    // 3. Select First Adaptive Question Intent
    const selectedIntent = selectNextQuestionIntent(state);
    const firstQ = selectedIntent?.originalQuestion;
    let conversationalQ: ConversationalQuestion | undefined;

    if (firstQ && selectedIntent) {
      state = updateStateAfterQuestionAsked(state, firstQ.id);

      const provider = getClinicalInterviewQuestionProvider();
      const genInput: GenerateQuestionInput = {
        consultationMode: state.consultationMode,
        language: state.language,
        chiefComplaint: state.chiefComplaint,
        collectedFacts: state.collectedFacts,
        recentTurns: [],
        intent: selectedIntent,
        libraryFallbackQuestion: firstQ,
      };

      const genResult = await provider.generateQuestion(genInput);
      const localized = getLocalizedQuestionText(firstQ, state.language);

      conversationalQ = {
        id: firstQ.id,
        intentId: selectedIntent.intentId,
        text: genResult.questionText,
        generationMode: genResult.generationMode,
        answerType: firstQ.answerType,
        choices: localized.options,
        targetField: firstQ.targetField,
      };
    }

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
      success: false,
      errorCode: 'SAFETY_TERMINATED',
      error: `Interview is already ${state.status}`,
    };
  }

  // Anti-Repetition Check: Prevent submitting duplicate answer for already answered question
  if (state.answeredQuestionIds.includes(input.questionId)) {
    const currentQ = state.currentQuestionId
      ? (await import('../questions')).getQuestionById(state.currentQuestionId)
      : selectNextQuestion(state);

    const localized = currentQ ? getLocalizedQuestionText(currentQ, state.language) : undefined;
    return {
      success: true,
      data: {
        success: true,
        status: state.status,
        factsExtractedCount: 0,
        redFlagStatus: 'none',
        progress: state.progress,
        nextQuestion: currentQ
          ? {
              id: currentQ.id,
              intentId: `${currentQ.complaint}_${currentQ.category}_${currentQ.targetField}`,
              text: localized?.text || currentQ.id,
              generationMode: 'library_fallback',
              answerType: currentQ.answerType,
              choices: localized?.options,
              targetField: currentQ.targetField,
            }
          : undefined,
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

    // 2. Select Next Adaptive Question Intent
    const selectedIntent = selectNextQuestionIntent(state);
    const nextQ = selectedIntent?.originalQuestion;
    const remainingCount = nextQ ? 1 : 0;

    // 3. Evaluate Stopping Rules
    const stoppingEval = evaluateStoppingRules(state, remainingCount);
    if (stoppingEval.shouldStop || !nextQ || !selectedIntent) {
      state = setInterviewStatus(state, 'completed');
      state.currentQuestionId = undefined;
      state.progress = 100;

      await saveInterviewSession(state);
      await logInterviewAudit('interview_completed', state.patientId, {
        sessionId,
        totalQuestionsAsked: state.askedQuestionIds.length,
        totalAnswered: state.answeredQuestionIds.length,
        reason: stoppingEval.reason || 'POOL_EXHAUSTED',
      });

      return {
        success: true,
        data: {
          success: true,
          status: 'completed',
          factsExtractedCount: result.factsExtractedCount,
          redFlagStatus: result.redFlagStatus,
          progress: 100,
          message: 'Interview session successfully completed',
        },
      };
    }

    // 4. Conversational Hybrid Question Generator
    const provider = getClinicalInterviewQuestionProvider();
    const genInput: GenerateQuestionInput = {
      consultationMode: state.consultationMode,
      language: state.language,
      chiefComplaint: state.chiefComplaint,
      collectedFacts: state.collectedFacts,
      recentTurns: [],
      intent: selectedIntent,
      libraryFallbackQuestion: nextQ,
    };

    const genResult = await provider.generateQuestion(genInput);
    const localized = getLocalizedQuestionText(nextQ, state.language);

    const conversationalQuestion: ConversationalQuestion = {
      id: nextQ.id,
      intentId: selectedIntent.intentId,
      text: genResult.questionText,
      generationMode: genResult.generationMode,
      answerType: nextQ.answerType,
      choices: localized.options,
      targetField: nextQ.targetField,
    };

    // Update state with selected next question
    state = updateStateAfterQuestionAsked(state, nextQ.id);
    state.progress = calculateProgress(state);

    await saveInterviewSession(state);
    await logInterviewAudit('interview_answer_recorded', state.patientId, {
      sessionId,
      questionId: input.questionId,
      inputMethod: input.inputMethod,
      nextQuestionId: nextQ.id,
      generationMode: genResult.generationMode,
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

  state = setInterviewStatus(state, 'active');

  let currentQ = state.currentQuestionId
    ? (await import('../questions')).getQuestionById(state.currentQuestionId)
    : undefined;

  if (!currentQ) {
    currentQ = selectNextQuestion(state) || undefined;
    if (currentQ) {
      state = updateStateAfterQuestionAsked(state, currentQ.id);
    }
  }

  await saveInterviewSession(state);
  await logInterviewAudit('interview_resumed', state.patientId, { sessionId });

  const localized = currentQ ? getLocalizedQuestionText(currentQ, state.language) : undefined;

  return {
    success: true,
    data: {
      sessionId,
      status: state.status,
      currentQuestion: currentQ
        ? {
            id: currentQ.id,
            intentId: `${currentQ.complaint}_${currentQ.category}_${currentQ.targetField}`,
            text: localized?.text || currentQ.id,
            generationMode: 'library_fallback',
            answerType: currentQ.answerType,
            choices: localized?.options,
            targetField: currentQ.targetField,
          }
        : undefined,
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
  state.currentQuestionId = undefined;

  await saveInterviewSession(state);
  await logInterviewAudit('interview_completed', state.patientId, { sessionId, manual: true });

  return { success: true, data: { sessionId, status: state.status, progress: 100 } };
}
