import { ClinicalQuestion, ComplaintType, QuestionSection } from './types';
import { CHEST_PAIN_QUESTIONS } from './general/chest-pain';
import { ABDOMINAL_PAIN_QUESTIONS } from './general/abdominal-pain';
import { HEADACHE_QUESTIONS } from './general/headache';
import { FEVER_QUESTIONS } from './general/fever';
import { COUGH_QUESTIONS } from './general/cough';
import { BREATHLESSNESS_QUESTIONS } from './general/breathlessness';
import { VOMITING_QUESTIONS } from './general/vomiting';
import { DIARRHEA_QUESTIONS } from './general/diarrhea';
import { DIZZINESS_QUESTIONS } from './general/dizziness';
import { BACK_PAIN_QUESTIONS } from './general/back-pain';
import { JOINT_PAIN_QUESTIONS } from './general/joint-pain';
import { URINARY_QUESTIONS } from './general/urinary';
import { FATIGUE_QUESTIONS } from './general/fatigue';
import { COMMON_HISTORY_QUESTIONS } from './general/common-history';
import { ALL_AYUSH_QUESTIONS } from './ayush';

export * from './types';
export * from './ayush';

// Master Question Registry
const MASTER_QUESTION_LIBRARY: ClinicalQuestion[] = [
  ...CHEST_PAIN_QUESTIONS,
  ...ABDOMINAL_PAIN_QUESTIONS,
  ...HEADACHE_QUESTIONS,
  ...FEVER_QUESTIONS,
  ...COUGH_QUESTIONS,
  ...BREATHLESSNESS_QUESTIONS,
  ...VOMITING_QUESTIONS,
  ...DIARRHEA_QUESTIONS,
  ...DIZZINESS_QUESTIONS,
  ...BACK_PAIN_QUESTIONS,
  ...JOINT_PAIN_QUESTIONS,
  ...URINARY_QUESTIONS,
  ...FATIGUE_QUESTIONS,
  ...COMMON_HISTORY_QUESTIONS,
  ...ALL_AYUSH_QUESTIONS,
];

/**
 * Returns all clinical questions in the General Medicine Question Library.
 */
export function getAllQuestions(): ClinicalQuestion[] {
  return [...MASTER_QUESTION_LIBRARY];
}

/**
 * Retrieves a single question by its unique stable ID.
 */
export function getQuestionById(id: string): ClinicalQuestion | undefined {
  return MASTER_QUESTION_LIBRARY.find((q) => q.id === id);
}

/**
 * Retrieves all questions relevant to a specific chief complaint.
 * 
 * Note: Question Library ONLY. This function performs no adaptive selection or decision logic.
 */
export function getQuestionsForComplaint(complaint: ComplaintType): ClinicalQuestion[] {
  return MASTER_QUESTION_LIBRARY.filter((q) => q.complaint === complaint);
}

/**
 * Retrieves all questions belonging to a specific clinical section.
 */
export function getQuestionsBySection(section: QuestionSection): ClinicalQuestion[] {
  return MASTER_QUESTION_LIBRARY.filter((q) => q.section === section);
}

/**
 * Retrieves all common history questions (PMH, medications, allergies, family, social, lifestyle).
 */
export function getCommonHistoryQuestions(): ClinicalQuestion[] {
  return MASTER_QUESTION_LIBRARY.filter((q) => q.complaint === 'common_history');
}

/**
 * Retrieves all questions marked as red flag screening candidates across all complaints.
 */
export function getRedFlagCandidateQuestions(): ClinicalQuestion[] {
  return MASTER_QUESTION_LIBRARY.filter((q) => q.redFlagCandidate === true);
}

/**
 * Structural validation utility for quality control & testing.
 * Verifies unique IDs, valid versions, required fields, and language coverage.
 */
export function validateQuestionLibrary(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (const q of MASTER_QUESTION_LIBRARY) {
    if (!q.id || !q.id.trim()) {
      errors.push(`Question missing ID: ${JSON.stringify(q)}`);
    } else if (seenIds.has(q.id)) {
      errors.push(`Duplicate question ID detected: '${q.id}'`);
    } else {
      seenIds.add(q.id);
    }

    if (!q.version) {
      errors.push(`Question '${q.id}' is missing a version.`);
    }

    if (!q.targetField) {
      errors.push(`Question '${q.id}' is missing targetField.`);
    }

    if (!q.questionText || !q.questionText.en || !q.questionText.ta || !q.questionText.hi) {
      errors.push(`Question '${q.id}' is missing required multilingual variants (en, ta, hi).`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
