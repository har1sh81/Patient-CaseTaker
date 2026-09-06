/**
 * Task #9 — Interview Stopping Rules
 * MediKiosk Clinical Architecture
 * 
 * Evaluates when an adaptive interview session should terminate or complete.
 */

import type { InterviewState } from './types';

export const MAXIMUM_QUESTION_LIMIT = 40;
export const MINIMUM_ESSENTIAL_QUESTIONS = 3;

export interface StoppingEvaluationResult {
  shouldStop: boolean;
  reason?: 'MAX_LIMIT_REACHED' | 'POOL_EXHAUSTED' | 'SAFETY_TERMINATED' | 'USER_COMPLETED' | 'ESSENTIALS_SATISFIED';
}

export function evaluateStoppingRules(
  state: InterviewState,
  remainingCandidateCount: number,
  userRequestedCompletion: boolean = false
): StoppingEvaluationResult {
  if (state.status === 'terminated_for_safety') {
    return { shouldStop: true, reason: 'SAFETY_TERMINATED' };
  }

  if (userRequestedCompletion) {
    return { shouldStop: true, reason: 'USER_COMPLETED' };
  }

  const totalAsked = state.askedQuestionIds.length;
  if (totalAsked >= MAXIMUM_QUESTION_LIMIT) {
    return { shouldStop: true, reason: 'MAX_LIMIT_REACHED' };
  }

  if (remainingCandidateCount === 0) {
    return { shouldStop: true, reason: 'POOL_EXHAUSTED' };
  }

  return { shouldStop: false };
}
