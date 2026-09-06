import { ClinicalQuestion, QuestionSection } from '../types';
import { AYUSH_GENERAL_HISTORY_QUESTIONS } from './general-history';
import { AHARA_QUESTIONS } from './ahara';
import { VIHARA_QUESTIONS } from './vihara';
import { AGNI_QUESTIONS } from './agni';
import { KOSHTHA_QUESTIONS } from './koshtha';
import { NIDRA_QUESTIONS } from './nidra';
import { PRAKRITI_QUESTIONS } from './prakriti';
import { VIKRITI_QUESTIONS } from './vikriti';
import { NIDANA_QUESTIONS } from './nidana';
import { SAMPRAPTI_QUESTIONS } from './samprapti';
import { DASHAVIDHA_QUESTIONS } from './dashavidha';
import { TRIVIDHA_QUESTIONS } from './trividha';
import { ASHTAVIDHA_QUESTIONS } from './ashtavidha';

export * from './general-history';
export * from './ahara';
export * from './vihara';
export * from './agni';
export * from './koshtha';
export * from './nidra';
export * from './prakriti';
export * from './vikriti';
export * from './nidana';
export * from './samprapti';
export * from './dashavidha';
export * from './trividha';
export * from './ashtavidha';

export const ALL_AYUSH_QUESTIONS: ClinicalQuestion[] = [
  ...AYUSH_GENERAL_HISTORY_QUESTIONS,
  ...AHARA_QUESTIONS,
  ...VIHARA_QUESTIONS,
  ...AGNI_QUESTIONS,
  ...KOSHTHA_QUESTIONS,
  ...NIDRA_QUESTIONS,
  ...PRAKRITI_QUESTIONS,
  ...VIKRITI_QUESTIONS,
  ...NIDANA_QUESTIONS,
  ...SAMPRAPTI_QUESTIONS,
  ...DASHAVIDHA_QUESTIONS,
  ...TRIVIDHA_QUESTIONS,
  ...ASHTAVIDHA_QUESTIONS,
];

/**
 * Passive retrieval functions (Task #12 requirement: NO NEXT-QUESTION SELECTION LOGIC)
 */

export function getAllAyushQuestions(): ClinicalQuestion[] {
  return ALL_AYUSH_QUESTIONS;
}

export function getQuestionsForAyushSection(section: QuestionSection | string): ClinicalQuestion[] {
  return ALL_AYUSH_QUESTIONS.filter((q) => q.section === section);
}

export function getQuestionsForAyushAssessment(assessmentGroup: string): ClinicalQuestion[] {
  return ALL_AYUSH_QUESTIONS.filter(
    (q) => q.complaint === assessmentGroup || q.category === assessmentGroup || q.ayushDomain === assessmentGroup
  );
}

export function getDashavidhaQuestions(): ClinicalQuestion[] {
  return DASHAVIDHA_QUESTIONS;
}

export function getTrividhaQuestions(): ClinicalQuestion[] {
  return TRIVIDHA_QUESTIONS;
}

export function getAshtavidhaQuestions(): ClinicalQuestion[] {
  return ASHTAVIDHA_QUESTIONS;
}

/**
 * Validation helper for AYUSH question library integrity.
 */
export function validateAyushQuestionLibrary(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const idMap = new Set<string>();

  for (const q of ALL_AYUSH_QUESTIONS) {
    if (!q.id) {
      errors.push(`Question missing id: ${JSON.stringify(q)}`);
    } else if (idMap.has(q.id)) {
      errors.push(`Duplicate question id found: ${q.id}`);
    } else {
      idMap.add(q.id);
    }

    if (q.version !== '1.0') {
      errors.push(`Question ${q.id} has non-1.0 version: ${q.version}`);
    }

    if (!q.targetField) {
      errors.push(`Question ${q.id} missing targetField`);
    }

    if (!q.sourceType) {
      errors.push(`Question ${q.id} missing sourceType`);
    }

    // Require EN, TA, HI for patient-facing questions
    if (q.sourceType === 'patient_input') {
      if (!q.questionText.en || !q.questionText.ta || !q.questionText.hi) {
        errors.push(`Patient-facing question ${q.id} missing one or more language variants (EN/TA/HI)`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
