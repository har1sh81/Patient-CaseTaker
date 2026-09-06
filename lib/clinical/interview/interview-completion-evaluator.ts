/**
 * Phase 6 — Intelligent Interview Completion Evaluator
 * MediKiosk Clinical Architecture
 *
 * Evaluates state-driven completion of the clinical interview based on:
 * - Sufficient coverage of presentation parameters (onset, location/character, aggravating factors, explicit negatives)
 * - Required vs optional information
 * - Contradiction tracking
 * - Clarification requirements
 * - Safety red-flag authority
 * - Maximum turn bounds (MAX_INTERVIEW_TURNS)
 */

import type { CompletionEvaluationResult, InterviewState } from './types';

export const MAX_INTERVIEW_TURNS = 15;

export function evaluateInterviewCompletion(
  state: InterviewState
): CompletionEvaluationResult {
  // 1. Red-Flag Safety Authority
  if (state.status === 'terminated_for_safety' || (state.redFlags && state.redFlags.length > 0 && state.redFlags.some(f => f.severity === 'red_flag' || f.severity === 'urgent'))) {
    return {
      complete: true,
      reason: 'URGENT_REVIEW',
      explanation: 'Interview terminated for urgent safety review.',
      missingCriticalInformation: [],
      unresolvedImportantTopics: [],
      confidence: 1.0,
    };
  }

  // 2. Max Turns Bound
  if (state.turnCount >= MAX_INTERVIEW_TURNS) {
    return {
      complete: true,
      reason: 'MAX_TURNS_REACHED',
      explanation: `Maximum turn threshold (${MAX_INTERVIEW_TURNS}) reached. Stopping questioning and preserving missing information for clinical review.`,
      missingCriticalInformation: [],
      unresolvedImportantTopics: state.unresolvedTopics || [],
      confidence: 0.8,
    };
  }

  // 3. Minimum Turn Guard (at least 2 patient responses needed unless safety triggered or rich single answer provided)
  const turns = state.conversationTurns || [];
  const patientTurns = turns.filter(t => t.role === 'patient');
  
  if (patientTurns.length < 1) {
    return {
      complete: false,
      reason: 'INSUFFICIENT_HISTORY',
      explanation: 'Initial presentation not yet provided.',
      missingCriticalInformation: ['chief complaint details'],
      unresolvedImportantTopics: state.unresolvedTopics || [],
      confidence: 0.2,
    };
  }

  // 4. Clarification Required Guard
  if (state.clarificationsNeeded && state.clarificationsNeeded.length > 0) {
    return {
      complete: false,
      reason: 'CLARIFICATION_REQUIRED',
      explanation: 'Clinically meaningful ambiguity requires clarification before completion.',
      missingCriticalInformation: [],
      unresolvedImportantTopics: state.clarificationsNeeded,
      confidence: 0.6,
    };
  }

  // 5. Contradiction Evaluation
  const contradictionFound = checkContradictions(state);
  if (contradictionFound) {
    const unresolvedWithContradiction = Array.from(new Set([...(state.unresolvedTopics || []), contradictionFound]));
    state.unresolvedTopics = unresolvedWithContradiction;
  }

  // 6. Newly Introduced Symptom Guard
  if (state.newSymptoms && state.newSymptoms.length > 0 && patientTurns.length > 1) {
    const latestAnswerLower = (state.lastAnswer || '').toLowerCase();
    // If new symptom was introduced in latest turn and onset/duration hasn't been mentioned
    if (!latestAnswerLower.includes('yesterday') && !latestAnswerLower.includes('days') && !latestAnswerLower.includes('since')) {
      return {
        complete: false,
        reason: 'IMPORTANT_TOPIC_UNRESOLVED',
        explanation: `Newly introduced symptom (${state.newSymptoms[0]}) requires baseline history exploration.`,
        missingCriticalInformation: [`onset/duration of ${state.newSymptoms[0]}`],
        unresolvedImportantTopics: state.newSymptoms,
        confidence: 0.6,
      };
    }
  }

  // 7. Clinical Parameter Coverage & Rich Answer Evaluation
  const coverage = evaluatePresentationCoverage(state);

  if (coverage.isSufficient) {
    return {
      complete: true,
      reason: 'SUFFICIENT_HISTORY',
      explanation: 'Sufficient clinically relevant history collected for primary presentation.',
      missingCriticalInformation: [],
      unresolvedImportantTopics: state.unresolvedTopics || [],
      confidence: 0.95,
    };
  }

  // Single vague complaint (e.g. "I have stomach pain" with no onset/location/aggravating factors)
  if (patientTurns.length < 2) {
    return {
      complete: false,
      reason: 'INSUFFICIENT_HISTORY',
      explanation: 'Initial presentation requires essential history parameters (onset, location, severity).',
      missingCriticalInformation: coverage.missingParams,
      unresolvedImportantTopics: coverage.missingParams,
      confidence: 0.4,
    };
  }

  // If 3+ turns completed and primary onset + location/character are covered
  if (patientTurns.length >= 3 && coverage.hasOnset && (coverage.hasLocation || coverage.hasCharacter)) {
    return {
      complete: true,
      reason: 'SUFFICIENT_HISTORY',
      explanation: 'Primary presentation onset and character sufficiently established across multiple turns.',
      missingCriticalInformation: [],
      unresolvedImportantTopics: state.unresolvedTopics || [],
      confidence: 0.9,
    };
  }

  return {
    complete: false,
    reason: 'CRITICAL_INFORMATION_MISSING',
    explanation: 'Essential presentation details (onset, location, aggravating factors) still missing.',
    missingCriticalInformation: coverage.missingParams,
    unresolvedImportantTopics: coverage.missingParams,
    confidence: 0.5,
  };
}

interface CoverageResult {
  isSufficient: boolean;
  hasOnset: boolean;
  hasLocation: boolean;
  hasCharacter: boolean;
  hasAggravating: boolean;
  hasNegatives: boolean;
  missingParams: string[];
}

function evaluatePresentationCoverage(state: InterviewState): CoverageResult {
  const allPatientText = (state.conversationTurns || [])
    .filter(t => t.role === 'patient')
    .map(t => t.text)
    .join(' ')
    .toLowerCase() + ' ' + (state.lastAnswer || '').toLowerCase();

  const extracted = JSON.stringify(state.extractedFacts || {}).toLowerCase();
  const text = allPatientText + ' ' + extracted;

  // Parameters (ASCII word boundaries separated from Unicode scripts)
  const hasOnset = /\b(yesterday|today|days?|weeks?|months?|hours?|since|started|began)\b/i.test(text) || /(நேற்று|நாட்களாக|நாட்கள்|कल|दिनों|दिन|आज)/i.test(text);
  const hasLocation = /\b(right|left|upper|lower|side|chest|abdomen|stomach|back|head|throat|arm|leg|flank)\b/i.test(text) || /(வலது|இடது|பக்கம்|வயிறு|தலை|நெஞ்சு|दाहिनी|बाईं|तरफ|पेट|सिर|छाती)/i.test(text);
  const hasCharacter = /\b(sharp|dull|burning|cramping|throbbing|crushing|pressure|tightness|aching)\b/i.test(text) || /(கடுமையான|எரிச்சல்|तेज|जलन)/i.test(text);
  const hasAggravating = /\b(eating|food|rest|walking|movement|breathing|deep|touching|after)\b/i.test(text) || /(சாப்பிட்ட|சாப்பாடு|நடக்கும்|खाना|चलने)/i.test(text);
  const hasNegatives = (state.explicitNegatives || []).length > 0 || /\b(no\s+|not\s+|don'?t\s+have|without)\b/i.test(text) || /(இல்லை|கிடையாது|नहीं)/i.test(text);

  const missingParams: string[] = [];
  if (!hasOnset) missingParams.push('onset/duration');
  if (!hasLocation) missingParams.push('location/site');
  if (!hasAggravating) missingParams.push('aggravating/relieving factors');

  // Rich Single Answer or Multi-turn Coverage check
  // E.g. "I have right-sided abdominal pain for two days, it is severe, worse after food, no vomiting, no diarrhea and no fever."
  const paramCount = (hasOnset ? 1 : 0) + (hasLocation ? 1 : 0) + (hasCharacter ? 1 : 0) + (hasAggravating ? 1 : 0) + (hasNegatives ? 1 : 0);

  const isSufficient = paramCount >= 3 || (hasOnset && (hasLocation || hasCharacter) && hasNegatives);

  return {
    isSufficient,
    hasOnset,
    hasLocation,
    hasCharacter,
    hasAggravating,
    hasNegatives,
    missingParams,
  };
}

function checkContradictions(state: InterviewState): string | null {
  const turns = (state.conversationTurns || []).filter(t => t.role === 'patient').map(t => t.text.toLowerCase());
  
  let reportedYesterday = false;
  let reportedMonths = false;

  for (const turn of turns) {
    if (turn.includes('yesterday') || turn.includes('2 days') || turn.includes('two days')) reportedYesterday = true;
    if (turn.includes('three months') || turn.includes('3 months') || turn.includes('years')) reportedMonths = true;
  }

  if (reportedYesterday && reportedMonths) {
    return 'contradiction: onset timeframe (yesterday vs 3 months reported)';
  }

  return null;
}
