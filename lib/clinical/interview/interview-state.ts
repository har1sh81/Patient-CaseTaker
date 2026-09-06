/**
 * Task #9 — Interview State Manager
 * MediKiosk Clinical Architecture
 * 
 * Pure state transition logic for the Adaptive Clinical Interview state machine.
 */

import type { InterviewState, StartInterviewOptions, AnswerInput, InterviewSessionStatus, LanguageCode } from './types';

export function createInitialInterviewState(
  sessionId: string,
  options: StartInterviewOptions
): InterviewState {
  const timestamp = new Date().toISOString();
  return {
    sessionId,
    patientId: options.patientId,
    encounterId: options.encounterId,
    department: options.department || 'General Medicine',
    consultationMode: options.consultationMode || 'general_medicine',
    language: options.language || 'en',
    chiefComplaint: options.chiefComplaint,
    askedQuestionIds: [],
    answeredQuestionIds: [],
    skippedQuestionIds: [],
    collectedFacts: [],
    redFlags: [],
    progress: 0,
    status: 'active',
    startedAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateStateAfterQuestionAsked(
  state: InterviewState,
  questionId: string
): InterviewState {
  const asked = new Set(state.askedQuestionIds);
  asked.add(questionId);

  return {
    ...state,
    currentQuestionId: questionId,
    askedQuestionIds: Array.from(asked),
    updatedAt: new Date().toISOString(),
  };
}

export function updateStateAfterAnswer(
  state: InterviewState,
  input: AnswerInput,
  facts: Array<Record<string, unknown>> = [],
  flags: Array<Record<string, unknown>> = []
): InterviewState {
  const answered = new Set(state.answeredQuestionIds);
  const skipped = new Set(state.skippedQuestionIds);

  if (input.answerStatus === 'unknown' || input.answerStatus === 'skipped') {
    skipped.add(input.questionId);
  } else {
    answered.add(input.questionId);
  }

  const existingFacts = [...state.collectedFacts];
  facts.forEach((f) => existingFacts.push(f));

  const existingFlags = [...state.redFlags];
  flags.forEach((fl) => existingFlags.push(fl));

  return {
    ...state,
    answeredQuestionIds: Array.from(answered),
    skippedQuestionIds: Array.from(skipped),
    collectedFacts: existingFacts,
    redFlags: existingFlags,
    updatedAt: new Date().toISOString(),
  };
}

export function setInterviewStatus(
  state: InterviewState,
  status: InterviewSessionStatus
): InterviewState {
  const timestamp = new Date().toISOString();
  return {
    ...state,
    status,
    completedAt: status === 'completed' || status === 'terminated_for_safety' ? timestamp : state.completedAt,
    updatedAt: timestamp,
  };
}

export function calculateProgress(state: InterviewState, totalEstimatedQuestions: number = 10): number {
  const answeredCount = state.answeredQuestionIds.length;
  const skippedCount = state.skippedQuestionIds.length;
  const totalCovered = answeredCount + skippedCount;

  if (totalCovered === 0) return 0;
  const rawProgress = Math.round((totalCovered / Math.max(totalEstimatedQuestions, 1)) * 100);
  return Math.min(Math.max(rawProgress, 5), 100);
}
