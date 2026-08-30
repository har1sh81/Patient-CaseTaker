import { Question, ConversationAnswer } from '../../types';
import { LocalClinicalNLP } from '../ai/local-nlp';

/**
 * Evaluates a single rule condition against an answer's normalizedValue (or rawValue if no normalizedValue).
 */
function evaluateCondition(condition: { fieldId: string; operator: string; value?: unknown }, answer?: ConversationAnswer): boolean {
  if (!answer) return false;

  const val = answer.normalizedValue !== undefined ? answer.normalizedValue : answer.rawValue;
  
  switch (condition.operator) {
    case 'equals':
      return val === condition.value;
    case 'not_equals':
      return val !== condition.value;
    case 'exists':
      return val !== undefined && val !== null && val !== '';
    case 'contains':
      if (Array.isArray(val)) {
        return val.includes(condition.value);
      }
      if (typeof val === 'string' && typeof condition.value === 'string') {
        return val.includes(condition.value);
      }
      return false;
    case 'greater_than':
      return typeof val === 'number' && typeof condition.value === 'number' && val > condition.value;
    case 'less_than':
      return typeof val === 'number' && typeof condition.value === 'number' && val < condition.value;
    default:
      return false;
  }
}

/**
 * Determines the next valid question ID based on current question's rules and provided answers.
 */
export interface CurrentProblemDomainStatus {
  domain: string;
  status: 'COMPLETE' | 'PARTIAL' | 'MISSING';
  value?: string;
}

export function evalCurrentProblemDomains(
  answers: Record<string, ConversationAnswer>
): Record<string, CurrentProblemDomainStatus> {
  const combinedText = Object.values(answers)
    .map(a => String(a.transcript || a.rawValue || a.normalizedValue || ''))
    .join(' ');
  const nlpResult = LocalClinicalNLP.extractFacts(combinedText, 'en');

  return {
    chief_complaint: {
      domain: 'chief_complaint',
      status: (answers['reason_for_visit'] || nlpResult.primarySymptom) ? 'COMPLETE' : 'MISSING',
      value: nlpResult.primarySymptom || (answers['reason_for_visit']?.rawValue as string),
    },
    onset_duration: {
      domain: 'onset_duration',
      status: (answers['symptom_duration'] || nlpResult.duration) ? 'COMPLETE' : 'MISSING',
      value: nlpResult.duration || (answers['symptom_duration']?.rawValue as string),
    },
    location: {
      domain: 'location',
      status: (answers['pain_location'] || nlpResult.location) ? 'COMPLETE' : 'MISSING',
      value: nlpResult.location || (answers['pain_location']?.rawValue as string),
    },
    character_quality: {
      domain: 'character_quality',
      status: (answers['symptom_character'] || nlpResult.character) ? 'COMPLETE' : 'MISSING',
      value: nlpResult.character || (answers['symptom_character']?.rawValue as string),
    },
    severity: {
      domain: 'severity',
      status: (answers['pain_scale'] || nlpResult.painScore || nlpResult.severity) ? 'COMPLETE' : 'MISSING',
      value: nlpResult.painScore ? `${nlpResult.painScore}/10` : (nlpResult.severity || (answers['pain_scale']?.rawValue as string)),
    },
    progression: {
      domain: 'progression',
      status: (answers['symptom_progression'] || nlpResult.progression) ? 'COMPLETE' : 'MISSING',
      value: nlpResult.progression || (answers['symptom_progression']?.rawValue as string),
    },
    aggravating_relieving: {
      domain: 'aggravating_relieving',
      status: (answers['aggravating_relieving'] || answers['stomach_pain_triggers'] || nlpResult.aggravatingFactors || nlpResult.relievingFactors) ? 'COMPLETE' : 'MISSING',
      value: nlpResult.aggravatingFactors || nlpResult.relievingFactors || (answers['aggravating_relieving']?.rawValue as string) || (answers['stomach_pain_triggers']?.rawValue as string),
    },
    associated_symptoms: {
      domain: 'associated_symptoms',
      status: (answers['associated_symptoms'] || answers['gi_red_flags'] || answers['cardiac_radiation_check'] || nlpResult.associatedSymptoms || nlpResult.negatedSymptoms.length > 0) ? 'COMPLETE' : 'MISSING',
      value: (answers['associated_symptoms']?.rawValue as string) || (answers['gi_red_flags']?.rawValue as string) || (nlpResult.negatedSymptoms.length ? `No ${nlpResult.negatedSymptoms.join(', ')}` : undefined),
    },
    previous_treatments: {
      domain: 'previous_treatments',
      status: (answers['previous_treatments'] || nlpResult.previousTreatments) ? 'COMPLETE' : 'MISSING',
      value: nlpResult.previousTreatments || (answers['previous_treatments']?.rawValue as string),
    },
  };
}

/**
 * Determines the next valid question ID based on current question's rules and 9-domain coverage.
 */
export function getNextQuestion(
  currentQuestionId: string,
  answers: Record<string, ConversationAnswer>,
  questions: Question[]
): Question | null {
  const currentIndex = questions.findIndex((q) => q.id === currentQuestionId);
  if (currentIndex === -1 || currentIndex === questions.length - 1) {
    return null; // No next question
  }

  const currentQ = questions[currentIndex];
  
  // Question-to-domain mapping (used by both followUpRules and sequential logic)
  const questionDomainMap: Record<string, string> = {
    reason_for_visit: 'chief_complaint',
    symptom_duration: 'onset_duration',
    pain_location: 'location',
    symptom_character: 'character_quality',
    pain_scale: 'severity',
    safety_check: 'severity',
    symptom_progression: 'progression',
    aggravating_relieving: 'aggravating_relieving',
    stomach_pain_triggers: 'aggravating_relieving',
    associated_symptoms: 'associated_symptoms',
    gi_red_flags: 'associated_symptoms',
    cardiac_radiation_check: 'associated_symptoms',
    previous_treatments: 'previous_treatments',
  };

  // Evaluate domains ONCE to use for both followUpRules and sequential logic
  const domains = evalCurrentProblemDomains(answers);
  const combinedText = Object.values(answers)
    .map(a => String(a.transcript || a.rawValue || a.normalizedValue || ''))
    .join(' ');

  // 1. Check if there are explicit followUpRules to jump to a specific question
  // BUT respect domain completeness - don't jump to a question whose domain is already COMPLETE
  if (currentQ.followUpRules && currentQ.followUpRules.length > 0) {
    const answer = answers[currentQuestionId];
    for (const rule of currentQ.followUpRules) {
      if (evaluateCondition(rule.condition, answer)) {
        const targetQ = questions.find((q) => q.id === rule.nextQuestionId);
        if (targetQ) {
          const targetDomain = questionDomainMap[targetQ.id];
          // Skip if target domain is already complete (info already extracted)
          if (targetDomain && domains[targetDomain]?.status === 'COMPLETE') {
            continue; // Try next rule or fall through to sequential logic
          }
          return targetQ;
        }
      }
    }
  }

  // 2. Sequential logic using 9 Current-Problem Domains
  let nextIdx = currentIndex + 1;
  while (nextIdx < questions.length) {
    const candidateQ = questions[nextIdx];
    const targetDomain = questionDomainMap[candidateQ.id];

    // Skip cardiac radiation check if patient has not mentioned chest/cardiac symptoms
    if (candidateQ.id === 'cardiac_radiation_check') {
      const mentionsChest = /chest|heart|cardiac|angina|stern/i.test(combinedText);
      if (!mentionsChest) {
        nextIdx++;
        continue;
      }
    }

    // Skip GI-specific questions if patient has not mentioned stomach/abdominal/digestive symptoms
    if (candidateQ.id === 'stomach_pain_triggers' || candidateQ.id === 'gi_red_flags') {
      const mentionsGI = /stomach|abdomen|abdominal|epigastri|belly|digest|gastric|acid|reflux|burn/i.test(combinedText);
      if (!mentionsGI) {
        nextIdx++;
        continue;
      }
    }

    // Skip candidate question if its domain is ALREADY COMPLETE (info already extracted via NLP or answered)
    if (targetDomain && domains[targetDomain]?.status === 'COMPLETE') {
      nextIdx++;
      continue;
    }

    if (answers[candidateQ.id]) {
      nextIdx++;
      continue;
    }

    return candidateQ;
  }

  return null;
}

/**
 * Calculates the reverse route to find the previous question.
 * Re-simulates the forward routing from start to find which question routed to the current one.
 */
export function getPreviousQuestion(
  currentQuestionId: string,
  answers: Record<string, ConversationAnswer>,
  questions: Question[]
): Question | null {
  if (questions.length === 0 || currentQuestionId === questions[0].id) {
    return null;
  }

  const route: Question[] = [];
  let current: Question | null = questions[0];

  while (current && current.id !== currentQuestionId) {
    route.push(current);
    // If we haven't answered this question yet, we shouldn't be here in a valid path,
    // but we simulate using the answers we have.
    current = getNextQuestion(current.id, answers, questions);
    
    // Prevent infinite loop if somehow stuck
    if (route.length > questions.length) break;
  }

  return route.length > 0 ? route[route.length - 1] : null;
}

/**
 * When an answer changes, identifies downstream answers that are no longer valid.
 */
export function invalidateBranch(
  changedQuestionId: string,
  answers: Record<string, ConversationAnswer>,
  questions: Question[]
): string[] {
  // If we change an answer, the new route might skip questions that were previously answered.
  // We re-calculate the valid route from the changed question forward.
  const validRouteIds = new Set<string>();
  
  let current: Question | null = questions.find(q => q.id === changedQuestionId) || null;
  
  while (current) {
    validRouteIds.add(current.id);
    current = getNextQuestion(current.id, answers, questions);
    if (validRouteIds.has(current?.id || '')) break; // avoid infinite loop
  }

  // Any answer that is after the changed question logically, but not in the new validRouteIds, is invalidated.
  // To be safe, we just collect all answer keys that are not in the valid route from the START.
  
  const absoluteValidRoute = new Set<string>();
  let start: Question | null = questions[0];
  while (start) {
    absoluteValidRoute.add(start.id);
    start = getNextQuestion(start.id, answers, questions);
    if (absoluteValidRoute.has(start?.id || '')) break;
  }

  const invalidQuestionIds = Object.keys(answers).filter(id => !absoluteValidRoute.has(id));
  return invalidQuestionIds;
}

/**
 * Calculates the valid route of question IDs from start to end based on current answers.
 */
export function getValidRoute(answers: Record<string, ConversationAnswer>, questions: Question[]): string[] {
  const route: string[] = [];
  let current: Question | null = questions.length > 0 ? questions[0] : null;
  
  while (current) {
    route.push(current.id);
    const next: Question | null = getNextQuestion(current.id, answers, questions);
    if (next && route.includes(next.id)) break; // avoid loop
    current = next;
  }
  return route;
}
