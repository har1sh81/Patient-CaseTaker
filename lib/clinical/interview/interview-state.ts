/**
 * Task #9 — Interview State Manager
 * MediKiosk Clinical Architecture
 * 
 * Pure state transition logic for the Adaptive Clinical Interview state machine.
 */

import type { InterviewState, StartInterviewOptions, AnswerInput, InterviewSessionStatus, LanguageCode } from './types';

// Generic/default chief complaint values that are NOT real clinical symptoms
const GENERIC_CHIEF_COMPLAINTS = new Set([
  'general checkup', 'general check up', 'checkup', 'check up', 'general', '',
]);

function isRealChiefComplaint(cc?: string): boolean {
  if (!cc || !cc.trim()) return false;
  return !GENERIC_CHIEF_COMPLAINTS.has(cc.toLowerCase().trim());
}

export function createInitialInterviewState(
  sessionId: string,
  options: StartInterviewOptions
): InterviewState {
  const timestamp = new Date().toISOString();
  const hasRealCC = isRealChiefComplaint(options.chiefComplaint);
  return {
    sessionId,
    patientId: options.patientId,
    encounterId: options.encounterId,
    department: options.department || 'General Medicine',
    consultationMode: options.consultationMode || 'general_medicine',
    language: options.language || 'en',
    chiefComplaint: options.chiefComplaint,
    conversationTurns: [],
    extractedFacts: [],
    coveredTopics: [],
    missingInformation: [],
    redFlags: [],
    askedQuestions: [],
    lastQuestion: null,
    lastAnswer: null,
    progress: 0,
    status: 'active',
    turnCount: 0,
    knownSymptoms: hasRealCC ? [options.chiefComplaint!] : [],
    newSymptoms: hasRealCC ? [options.chiefComplaint!] : [],
    explicitNegatives: [],
    unresolvedTopics: hasRealCC
      ? [`location of ${options.chiefComplaint}`, `onset of ${options.chiefComplaint}`, `severity of ${options.chiefComplaint}`]
      : [],
    activeTopic: hasRealCC ? options.chiefComplaint! : 'general',
    recentTopics: hasRealCC ? [options.chiefComplaint!] : [],
    clarificationsNeeded: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateStateAfterQuestionAsked(
  state: InterviewState,
  question: import('./types').ConversationalQuestion
): InterviewState {
  const asked = new Set(state.askedQuestions);
  asked.add(question.id);
  
  const turn: import('./types').ConversationTurn = {
    role: 'assistant',
    text: question.text,
    timestamp: new Date().toISOString(),
    questionId: question.id,
    intentId: question.intentId
  };

  return {
    ...state,
    lastQuestion: question.id,
    askedQuestions: Array.from(asked),
    conversationTurns: [...state.conversationTurns, turn],
    updatedAt: new Date().toISOString(),
  };
}

export function updateStateAfterAnswer(
  state: InterviewState,
  input: AnswerInput,
  turn: import('./types').ConversationTurn,
  facts: import('./types').ClinicalFacts = [],
  flags: import('./types').RedFlagState[] = []
): InterviewState {
  const existingFacts = [...state.extractedFacts];
  facts.forEach((f) => existingFacts.push(f));

  const existingFlags = [...state.redFlags];
  flags.forEach((fl) => existingFlags.push(fl));

  const answerString = Array.isArray(input.answer)
    ? input.answer.join(', ')
    : String(input.answer || '');

  return {
    ...state,
    conversationTurns: [...state.conversationTurns, turn],
    extractedFacts: existingFacts,
    redFlags: existingFlags,
    lastAnswer: answerString,
    turnCount: state.turnCount + 1,
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
  const totalCovered = state.turnCount;

  if (totalCovered === 0) return 0;
  const rawProgress = Math.round((totalCovered / Math.max(totalEstimatedQuestions, 1)) * 100);
  return Math.min(Math.max(rawProgress, 5), 100);
}
