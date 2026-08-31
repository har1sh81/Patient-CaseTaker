import { Question, ConversationAnswer } from '../../types';
import { LocalClinicalNLP } from '../ai/local-nlp';
import { buildAdaptiveContext, evaluateDomainCompleteness, selectNextQuestion } from './adaptive-logic';

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
  
  // 1. Check if there are explicit followUpRules to jump to a specific question
  // Build adaptive context for followUpRules domain checking
  const allowedQuestionIds = questions.map(q => q.id);
  const latestAnswerForRules = answers[currentQuestionId];
  const ctxForRules = buildAdaptiveContext(answers, latestAnswerForRules || null, allowedQuestionIds);
  const domainsForRules = evaluateDomainCompleteness(ctxForRules);
  
  // Question-to-domain mapping (used by followUpRules)
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
    fever_check: 'systemic_review',
    sleep_quality: 'systemic_review',
    appetite_changes: 'systemic_review',
    fatigue_energy: 'systemic_review',
    stress_anxiety: 'risk_factors',
    recent_travel: 'risk_factors',
    smoking_alcohol: 'risk_factors',
    family_history: 'family_social_history',
    neuro_symptoms: 'neuro_check',
    bowel_habits: 'bowel_urinary',
  };

  if (currentQ.followUpRules && currentQ.followUpRules.length > 0) {
    const answer = answers[currentQuestionId];
    for (const rule of currentQ.followUpRules) {
      if (evaluateCondition(rule.condition, answer)) {
        const targetQ = questions.find((q) => q.id === rule.nextQuestionId);
        if (targetQ) {
          const targetDomain = questionDomainMap[targetQ.id];
          // Skip if target domain is already complete (info already extracted)
          if (targetDomain && domainsForRules[targetDomain]?.status === 'COMPLETE') {
            continue; // Try next rule or fall through to sequential logic
          }
          return targetQ;
        }
      }
    }
  }

  // 2. Sequential logic using shared adaptive logic
  const ctx = buildAdaptiveContext(answers, latestAnswerForRules || null, allowedQuestionIds);
  const domains = evaluateDomainCompleteness(ctx);
  
  const nextQuestionId = selectNextQuestion(ctx, domains);
  
  if (nextQuestionId) {
    return questions.find(q => q.id === nextQuestionId) || null;
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
  // Requirement 1 & 2: Do NOT invalidate past answers in an adaptive flow 
  // just because they are skipped in a forward route (they are skipped because they are COMPLETE).
  // For now, the safest approach to prevent data loss is to not blindly invalidate.
  // We explicitly protect the changedQuestionId and all previously gathered facts.
  return [];
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
