/**
 * Task #9 — Deterministic Adaptive Question Selector Engine
 * MediKiosk Clinical Architecture
 * 
 * Explainable & deterministic state-machine question selection.
 * NO LLM call. Strictly rule-grounded, dependency-aware, and priority-ranked.
 */

import { getAllQuestions, getQuestionsForComplaint, getCommonHistoryQuestions } from '../questions';
import { ALL_AYUSH_QUESTIONS } from '../questions/ayush';
import type { ClinicalQuestion, ComplaintType, QuestionChoice } from '../questions/types';
import type { InterviewState, LanguageCode, QuestionIntent } from './types';

/**
 * Maps raw chief complaint input to standard ComplaintType enum.
 */
export function normalizeChiefComplaint(complaintText?: string): ComplaintType {
  if (!complaintText) return 'chest_pain';
  const c = complaintText.toLowerCase();

  if (c.includes('chest') || c.includes('மார்பு') || c.includes('சீன') || c.includes('सीना')) return 'chest_pain';
  if (c.includes('abdom') || c.includes('stomach') || c.includes('belly') || c.includes('வயிறு') || c.includes('पेट')) return 'abdominal_pain';
  if (c.includes('head') || c.includes('migraine') || c.includes('தலை') || c.includes('सिर')) return 'headache';
  if (c.includes('fever') || c.includes('temperature') || c.includes('காய்ச்சல்') || c.includes('बुखार')) return 'fever';
  if (c.includes('cough') || c.includes('இருமல்') || c.includes('खांसी')) return 'cough';
  if (c.includes('breath') || c.includes('shortness') || c.includes('மூச்சு') || c.includes('सांस')) return 'breathlessness';
  if (c.includes('vomit') || c.includes('nausea') || c.includes('வாந்தி') || c.includes('उल्टी')) return 'vomiting';
  if (c.includes('diarrhea') || c.includes('loose') || c.includes('வயிற்றுப்போக்கு') || c.includes('दस्त')) return 'diarrhea';
  if (c.includes('dizzy') || c.includes('vertigo') || c.includes('மயக்கம்') || c.includes('चक्कर')) return 'dizziness';
  if (c.includes('back') || c.includes('முதுகு') || c.includes('पीठ')) return 'back_pain';
  if (c.includes('joint') || c.includes('knee') || c.includes('மூட்டு') || c.includes('जोड़ों')) return 'joint_pain';
  if (c.includes('urine') || c.includes('urinary') || c.includes('சிறுநீர்') || c.includes('मूत्र')) return 'urinary';
  if (c.includes('fatigue') || c.includes('tired') || c.includes('சோர்வு') || c.includes('थकावट')) return 'fatigue';

  return 'chest_pain';
}

/**
 * Checks if a question's prerequisite dependency is satisfied.
 * Unknown / Skipped is NOT treated as false.
 */
export function isQuestionDependencySatisfied(
  question: ClinicalQuestion,
  answeredQuestionIds: string[],
  skippedQuestionIds: string[]
): boolean {
  const dependsOn = (question as any).dependsOn;
  if (!dependsOn) return true;

  const { questionId: parentId } = dependsOn;

  // If parent question was skipped, allow dependent question unless explicitly negative requirement
  if (skippedQuestionIds.includes(parentId)) {
    return true;
  }

  // If parent question has not been asked yet, defer dependent question
  if (!answeredQuestionIds.includes(parentId)) {
    return false;
  }

  return true;
}

/**
 * Retrieves the pool of candidate questions based on consultation mode and complaint.
 */
export function getCandidateQuestionPool(
  mode: 'general_medicine' | 'ayush',
  complaint: ComplaintType
): ClinicalQuestion[] {
  if (mode === 'ayush') {
    return [...ALL_AYUSH_QUESTIONS];
  }

  const complaintQuestions = getQuestionsForComplaint(complaint);
  const commonHistory = getCommonHistoryQuestions();
  return [...complaintQuestions, ...commonHistory];
}

/**
 * Deterministically selects the next highest-priority unanswered question for an interview session.
 */
export function selectNextQuestion(
  state: InterviewState
): ClinicalQuestion | null {
  const normComplaint = normalizeChiefComplaint(state.chiefComplaint);
  const pool = getCandidateQuestionPool(state.consultationMode, normComplaint);

  const askedSet = new Set(state.askedQuestionIds);

  // Filter un-asked questions whose dependencies are satisfied
  const availableCandidates = pool.filter((q) => {
    if (askedSet.has(q.id)) return false;
    return isQuestionDependencySatisfied(q, state.answeredQuestionIds, state.skippedQuestionIds);
  });

  if (availableCandidates.length === 0) {
    return null;
  }

  // Deterministic Ranking Sort Strategy:
  // 1. Red-flag candidate questions matching chief complaint (Priority 1)
  // 2. Question priority asc (1 = highest)
  // 3. Question section order (onset, location, character, radiation, associated, history)
  // 4. Stable ID fallback
  const sortedCandidates = availableCandidates.sort((a, b) => {
    const aRedFlag = a.redFlagCandidate ? 1 : 0;
    const bRedFlag = b.redFlagCandidate ? 1 : 0;
    if (aRedFlag !== bRedFlag) return bRedFlag - aRedFlag;

    const aPrio = a.priority ?? 99;
    const bPrio = b.priority ?? 99;
    if (aPrio !== bPrio) return aPrio - bPrio;

    return a.id.localeCompare(b.id);
  });

  return sortedCandidates[0];
}

/**
 * Converts selected candidate question into a clinical QuestionIntent.
 */
export function selectNextQuestionIntent(state: InterviewState): QuestionIntent | null {
  const question = selectNextQuestion(state);
  if (!question) return null;

  return {
    intentId: `${question.complaint}_${question.category}_${question.targetField}`,
    domain: question.complaint,
    targetFact: question.targetField,
    reason: `Gather clinical detail regarding ${question.category} for ${question.targetField}`,
    answerType: question.answerType,
    category: question.category,
    section: question.section,
    redFlagCandidate: question.redFlagCandidate,
    priority: question.priority,
    originalQuestion: question,
  };
}

/**
 * Localizes question text and options to requested language.
 */
export function getLocalizedQuestionText(
  question: ClinicalQuestion,
  lang: LanguageCode = 'en'
): { text: string; options?: Array<{ label: string; value: string }> } {
  const qLang = lang as 'en' | 'ta' | 'hi';
  const text = question.questionText?.[qLang] || question.questionText?.en || question.id;
  const rawChoices = question.choices || (question as any).options;
  const options = rawChoices?.map((opt: QuestionChoice) => ({
    value: opt.value,
    label: opt.label?.[qLang] || opt.label?.en || opt.value,
  }));

  return { text, options };
}
