/**
 * Task #30 — AI Clinical Summary Safety & Grounding Validator
 * MediKiosk Clinical Engine
 * 
 * Performs deterministic safety validation on LLM output.
 * Detects unauthorized diagnosis generation, treatment recommendations,
 * prognosis/risk scores, negation inversions, and hallucinated facts.
 */

import type { AiSummaryInput } from './types';

export interface SummaryValidationResult {
  passed: boolean;
  safetyCheckStatus: 'passed' | 'rejected' | 'warning';
  warnings: string[];
  rejectionReason?: string;
}

export function validateClinicalSummary(
  summaryText: string,
  input: AiSummaryInput
): SummaryValidationResult {
  const warnings: string[] = [];
  const lowerText = summaryText.toLowerCase();

  // 1. Mandatory Disclaimer Check
  if (!summaryText.includes('AI-Generated Draft — Physician Review Required')) {
    warnings.push('MISSING_MANDATORY_DISCLAIMER');
  }

  // Extract all existing documented diagnosis titles from input (lowercase)
  const existingDiagnoses = (input.diagnoses || []).map(d => (d.title || d.summary || '').toLowerCase());

  // 2. Diagnosis Generation Patterns
  const diagnosisForbiddenPatterns = [
    'diagnosed with',
    'likely',
    'probable',
    'suspected',
    'consistent with',
    'suggestive of',
    'suspicious for',
    'may indicate',
    'indicates',
    'differential diagnosis',
    'acute coronary syndrome',
    'myocardial infarction',
    'acs',
    'diabetic retinopathy',
    'heart failure',
    'sepsis',
    'pancreatitis',
  ];

  for (const pattern of diagnosisForbiddenPatterns) {
    if (lowerText.includes(pattern)) {
      return {
        passed: false,
        safetyCheckStatus: 'rejected',
        warnings: [...warnings, `UNSAFE_DIAGNOSIS_PATTERN: ${pattern}`],
        rejectionReason: `Summary contains forbidden diagnosis generation phrase: "${pattern}"`,
      };
    }
  }

  // Check for newly inferred diagnosis (e.g. "patient has diabetes" when diabetes is not in diagnoses)
  const commonUncheckedDiagnoses = ['diabetes', 'hypertension', 'asthma', 'ckd', 'copd', 'stroke'];
  for (const diag of commonUncheckedDiagnoses) {
    if (lowerText.includes(diag)) {
      const isDocumented = existingDiagnoses.some(ed => ed.includes(diag));
      if (!isDocumented) {
        // Verify if it's asserted as diagnosis in text
        if (
          lowerText.includes(`diagnosed with ${diag}`) ||
          lowerText.includes(`has ${diag}`) ||
          lowerText.includes(`suffers from ${diag}`) ||
          lowerText.includes(`worsening ${diag}`)
        ) {
          return {
            passed: false,
            safetyCheckStatus: 'rejected',
            warnings: [...warnings, `UNSAFE_NEW_DIAGNOSIS: ${diag}`],
            rejectionReason: `Summary inferred undocumented diagnosis: "${diag}"`,
          };
        }
      }
    }
  }

  // 3. Treatment / Prescribing / Referral Patterns
  const treatmentForbiddenPatterns = [
    'start ',
    'stop ',
    'increase ',
    'decrease ',
    'prescribe',
    'recommend ',
    'refer to',
    'consult cardiology',
    'see specialist',
    'take aspirin',
    'take metformin',
    'avoid ',
  ];

  for (const pattern of treatmentForbiddenPatterns) {
    if (lowerText.includes(pattern)) {
      return {
        passed: false,
        safetyCheckStatus: 'rejected',
        warnings: [...warnings, `UNSAFE_TREATMENT_PATTERN: ${pattern}`],
        rejectionReason: `Summary contains forbidden treatment/referral phrase: "${pattern}"`,
      };
    }
  }

  // 4. Risk / Prognosis / Trend Severity Assertions
  const riskForbiddenPatterns = [
    'high risk',
    'low risk',
    'prognosis',
    'mortality risk',
    'worsened',
    'worsening',
    'deteriorating',
    'uncontrolled',
    'increasing diabetes severity',
  ];

  for (const pattern of riskForbiddenPatterns) {
    if (lowerText.includes(pattern)) {
      return {
        passed: false,
        safetyCheckStatus: 'rejected',
        warnings: [...warnings, `UNSAFE_RISK_PROGNOSIS_PATTERN: ${pattern}`],
        rejectionReason: `Summary contains forbidden risk/prognosis/trend assertion: "${pattern}"`,
      };
    }
  }

  // 5. Missing Information -> Negative Finding Conversion
  const hasMissingAllergies = (input.missingInformation || []).some(m => m.toLowerCase().includes('allergy'));
  if (hasMissingAllergies) {
    if (
      lowerText.includes('no known drug allergies') ||
      lowerText.includes('nkda') ||
      lowerText.includes('no allergies documented')
    ) {
      return {
        passed: false,
        safetyCheckStatus: 'rejected',
        warnings: [...warnings, 'UNSAFE_MISSING_INFO_CONVERSION'],
        rejectionReason: 'Summary converted missing allergy information into a negative finding ("no known drug allergies")',
      };
    }
  }

  // 6. Negation Inversion Check
  const negatedItems = (input.currentPresentation || []).filter(item => item.isNegated || item.summary?.toLowerCase().includes('no '));
  for (const neg of negatedItems) {
    const itemTitle = (neg.title || '').toLowerCase();
    if (itemTitle && lowerText.includes(itemTitle)) {
      // Check if it appears positive without negation prefix
      const negPhrases = [`no ${itemTitle}`, `without ${itemTitle}`, `denies ${itemTitle}`, `negative for ${itemTitle}`];
      const hasNegationPrefix = negPhrases.some(np => lowerText.includes(np));
      if (!hasNegationPrefix && lowerText.includes(`presents with ${itemTitle}`)) {
        return {
          passed: false,
          safetyCheckStatus: 'rejected',
          warnings: [...warnings, `UNSAFE_NEGATION_INVERSION: ${itemTitle}`],
          rejectionReason: `Summary inverted negative symptom "${itemTitle}" to a positive assertion`,
        };
      }
    }
  }

  // 7. Grounding Verification (Fact Presence Check)
  // Check if any medication mentioned in summary exists in input.medications
  const allInputMedNames = (input.medications || []).map(m => (m.title || m.summary || '').toLowerCase());
  const commonMeds = ['aspirin', 'metformin', 'amlodipine', 'atorvastatin', 'lisinopril', 'paracetamol'];
  for (const med of commonMeds) {
    if (lowerText.includes(med)) {
      const exists = allInputMedNames.some(im => im.includes(med));
      if (!exists) {
        warnings.push(`Potentially unsupported statement detected: Medication ${med} not found in input`);
      }
    }
  }

  return {
    passed: true,
    safetyCheckStatus: warnings.length > 0 ? 'warning' : 'passed',
    warnings,
  };
}
