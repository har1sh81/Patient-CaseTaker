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
    // 1. Direct answer text safety evaluation (100% deterministic & immediate)
    const lastAnswerLower = (state.lastAnswer || '').toLowerCase();
    const allPatientText = (state.conversationTurns || [])
      .filter(t => t.role === 'patient')
      .map(t => t.text)
      .join(' ')
      .toLowerCase() + ' ' + (state.chiefComplaint || '').toLowerCase() + ' ' + lastAnswerLower;
    
    const hasChestSymptom = allPatientText.includes('chest pain') || 
      allPatientText.includes('chest discomfort') || 
      allPatientText.includes('chest tightness') || 
      allPatientText.includes('crushing') ||
      allPatientText.includes('நெஞ்சு வலி') ||
      allPatientText.includes('மார்பு வலி') ||
      allPatientText.includes('छाती में दर्द') ||
      allPatientText.includes('सीने में दर्द');
      
    const hasAssociatedCardiac = lastAnswerLower.includes('shortness of breath') || 
      lastAnswerLower.includes('breathless') || 
      lastAnswerLower.includes('radiating') || 
      lastAnswerLower.includes('radiat') || 
      lastAnswerLower.includes('jaw') || 
      lastAnswerLower.includes('sweat') || 
      lastAnswerLower.includes('sweating') || 
      lastAnswerLower.includes('arm') ||
      allPatientText.includes('மூச்சுத்திணறல்') ||
      allPatientText.includes('மூச்சு திணறல்') ||
      allPatientText.includes('सांस फूलना') ||
      allPatientText.includes('पसीना') ||
      (allPatientText.includes('chest') && (allPatientText.includes('shortness of breath') || allPatientText.includes('radiat')));

    const isCardiacRedFlag = hasChestSymptom && hasAssociatedCardiac;

    const hasNeuroSymptom = allPatientText.includes('weakness') || 
      allPatientText.includes('slurred') || 
      allPatientText.includes('drooping') || 
      allPatientText.includes('numbness') ||
      allPatientText.includes('பலவீனம்') ||
      allPatientText.includes('कमजोरी');

    const hasNeuroLocation = allPatientText.includes('speech') || 
      allPatientText.includes('face') || 
      allPatientText.includes('arm') || 
      allPatientText.includes('leg') ||
      allPatientText.includes('பேச்சு') ||
      allPatientText.includes('கை') ||
      allPatientText.includes('बोलने');

    const isStrokeRedFlag = (hasNeuroSymptom && hasNeuroLocation) || 
      allPatientText.includes('slurred speech') || 
      allPatientText.includes('facial drooping');

    if (isCardiacRedFlag || isStrokeRedFlag) {
      const urgentFlag = {
        ruleId: isCardiacRedFlag ? 'cardiac_red_flag' : 'stroke_red_flag',
        severity: 'red_flag',
        category: 'red_flag',
        message: URGENT_SAFETY_MESSAGE,
        evidence: [state.lastAnswer || 'Urgent symptom reported'],
      };

      return {
        isUrgent: true,
        redFlagStatus: 'urgent',
        message: URGENT_SAFETY_MESSAGE,
        triggeredFlag: urgentFlag,
      };
    }

    // 2. Task #14 Attention Flags engine
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
