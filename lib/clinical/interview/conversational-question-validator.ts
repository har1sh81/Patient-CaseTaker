/**
 * Task #9 — Conversational Clinical Question Validator
 * MediKiosk Clinical Architecture
 * 
 * Safety Validator ensuring LLM-generated question wording strictly complies
 * with safety boundaries before presentation to patient.
 */

import type { GenerateQuestionInput } from './types';

const DIAGNOSIS_KEYWORDS = [
  'heart attack',
  'myocardial infarction',
  'appendicitis',
  'stroke',
  'cancer',
  'diabetes',
  'pneumonia',
  'covid',
  'tuberculosis',
  'gallstones',
  'kidney stone',
  'ulcer',
  'angina',
  'asthma',
  'hypertension',
];

const TREATMENT_KEYWORDS = [
  'take aspirin',
  'take paracetamol',
  'take ibuprofen',
  'take medication',
  'take medicine',
  'prescribe',
  'prescription',
  'dosage',
  'surgery',
  'home remedy',
];

const REFERRAL_PROGNOSIS_KEYWORDS = [
  'see a cardiologist',
  'go to the emergency room',
  'go to er',
  'you might have',
  'do you think you have',
  'could be a sign of',
  'is this serious',
  'probability of',
];

const PROMPT_INJECTION_KEYWORDS = [
  'ignore previous instructions',
  'system prompt',
  'as an ai model',
  'as a large language model',
  'developer mode',
];

export interface QuestionValidationResult {
  passed: boolean;
  rejectionReason?: string;
}

export function validateConversationalQuestion(
  questionText: string,
  input: GenerateQuestionInput
): QuestionValidationResult {
  if (!questionText || typeof questionText !== 'string') {
    return { passed: false, rejectionReason: 'Empty or non-string question output' };
  }

  const trimmed = questionText.trim();

  // 1. Length boundaries
  if (trimmed.length < 5) {
    return { passed: false, rejectionReason: 'Question text too short' };
  }
  if (trimmed.length > 300) {
    return { passed: false, rejectionReason: 'Question text exceeds maximum length boundary (300 chars)' };
  }

  const lower = trimmed.toLowerCase();

  // 2. Exactly one question (count question marks)
  const qMarkCount = (trimmed.match(/\?/g) || []).length;
  if (qMarkCount > 1) {
    return { passed: false, rejectionReason: 'Multiple question marks detected; must be exactly ONE question' };
  }

  // 3. Prompt injection check
  for (const kw of PROMPT_INJECTION_KEYWORDS) {
    if (lower.includes(kw)) {
      return { passed: false, rejectionReason: `Prompt injection keyword detected: ${kw}` };
    }
  }

  // 4. Forbidden Diagnosis check
  for (const kw of DIAGNOSIS_KEYWORDS) {
    if (lower.includes(kw)) {
      return { passed: false, rejectionReason: `Forbidden diagnosis term detected: ${kw}` };
    }
  }

  // 5. Forbidden Treatment / Medication check
  for (const kw of TREATMENT_KEYWORDS) {
    if (lower.includes(kw)) {
      return { passed: false, rejectionReason: `Forbidden treatment/medication term detected: ${kw}` };
    }
  }

  // 6. Forbidden Referral / Prognosis / Leading check
  for (const kw of REFERRAL_PROGNOSIS_KEYWORDS) {
    if (lower.includes(kw)) {
      return { passed: false, rejectionReason: `Forbidden referral or prognosis statement detected: ${kw}` };
    }
  }

  // 7. Check negation reversal or asking about denied facts
  const deniedFacts = input.collectedFacts.filter((f) => f.isNegated || f.status === 'denied');
  for (const denied of deniedFacts) {
    const factName = String(denied.symptomName || denied.targetField || '').toLowerCase();
    if (factName && lower.includes(factName) && input.intent.targetFact !== factName) {
      return { passed: false, rejectionReason: `Re-asking about explicitly denied fact: ${factName}` };
    }
  }

  return { passed: true };
}
