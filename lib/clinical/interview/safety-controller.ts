/**
 * Task #9 — Safety Controller & Red-Flag Integration
 * MediKiosk Clinical Architecture
 * 
 * Safety Authority: Task #14.
 * Evaluates red-flag conditions after every answer.
 * If urgent red flags are detected, terminates the interview safely with neutral messaging.
 */

import { evaluateAttentionFlags } from '@/lib/attention/evaluate';
import type { InterviewState } from './types';

export interface SafetyCheckResult {
  isUrgent: boolean;
  redFlagStatus: 'none' | 'warning' | 'urgent';
  message?: string;
  triggeredFlag?: Record<string, unknown>;
}

export const URGENT_SAFETY_MESSAGE =
  'Your responses indicate that urgent clinical review is required. Please proceed to the clinical staff.';

export async function evaluateSessionSafety(
  state: InterviewState
): Promise<SafetyCheckResult> {
  try {
    const flags = await evaluateAttentionFlags(state.sessionId, state.patientId, {
      answers: [],
      extractions: [],
      timeline: null,
    });

    if (!flags || flags.length === 0) {
      return { isUrgent: false, redFlagStatus: 'none' };
    }

    const urgentFlag = flags.find(
      (f: any) =>
        f.severity === 'red_flag' ||
        f.severity === 'high' ||
        f.severity === 'urgent' ||
        f.category === 'red_flag'
    );

    if (urgentFlag) {
      return {
        isUrgent: true,
        redFlagStatus: 'urgent',
        message: URGENT_SAFETY_MESSAGE,
        triggeredFlag: urgentFlag as unknown as Record<string, unknown>,
      };
    }

    return {
      isUrgent: false,
      redFlagStatus: 'warning',
      triggeredFlag: flags[0] as unknown as Record<string, unknown>,
    };
  } catch (err) {
    console.error('[Safety Controller] Error evaluating attention flags:', err);
    return { isUrgent: false, redFlagStatus: 'none' };
  }
}
