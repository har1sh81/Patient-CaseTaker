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
  if (currentQ.followUpRules && currentQ.followUpRules.length > 0) {
    const answer = answers[currentQuestionId];
    for (const rule of currentQ.followUpRules) {
      if (evaluateCondition(rule.condition, answer)) {
        const targetQ = questions.find((q) => q.id === rule.nextQuestionId);
        if (targetQ) return targetQ;
      }
    }
  }

  // 2. Dynamic Adaptive Progress & Fact-Aware Question Skipping
  const combinedText = Object.values(answers)
    .map(a => String(a.transcript || a.rawValue || a.normalizedValue || ''))
    .join(' ');
  const nlpResult = LocalClinicalNLP.extractFacts(combinedText, 'en');

  let nextIdx = currentIndex + 1;
  while (nextIdx < questions.length) {
    const candidateQ = questions[nextIdx];
    const fields = candidateQ.informationFields || [];

    const isDurationAnswered = fields.includes('duration') && (nlpResult.duration || Boolean(answers['symptom_duration']));
    const isSeverityAnswered = fields.includes('severity') && (nlpResult.severity || Boolean(answers['symptom_severity']) || Boolean(answers['pain_scale']));
    const isPainLocationAnswered = fields.includes('pain_location') && (nlpResult.location || Boolean(answers['pain_location']));

    // If candidate question asks for duration, severity, or location that was ALREADY spoken/extracted, skip it!
    if (isDurationAnswered || isSeverityAnswered || isPainLocationAnswered) {
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
