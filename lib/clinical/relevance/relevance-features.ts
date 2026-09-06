/**
 * Task #27 — Relevance Feature Extraction & Multilingual Normalization
 * MediKiosk Clinical Engine
 */

import type { TimelineEvent } from '../timeline/types';
import type { RelevanceContext } from './types';

// Multilingual concept map for Tamil, Hindi, and English medical terms
const MULTILINGUAL_SYMPTOM_DICTIONARY: Record<string, string[]> = {
  'chest pain': ['chest pain', 'மார்பு வலி', 'सीने में दर्द', 'angina', 'sternal pain', 'precordial pain'],
  'shortness of breath': ['shortness of breath', 'breathlessness', 'dyspnea', 'மூச்சுத்திணறல்', 'सांस फूलना'],
  'diabetes': ['diabetes', 'diabetic', 'hba1c', 'fasting glucose', 'glucose', 'sugar', 'metformin', 'insulin', 'சர்க்கரை நோய்', 'இரத்த சர்க்கரை', 'मधुमेह', 'इंसुलिन'],
  'hypertension': ['hypertension', 'bp', 'blood pressure', 'high bp', 'amlodipine', 'telmisartan', 'atenolol', 'ரத்த அழுத்தம்', 'उच्च रक्तचाप'],
  'knee pain': ['knee pain', 'knee', 'arthroscopy', 'joint pain', 'முழங்கால் வலி', 'घुटने में दर्द'],
  'fever': ['fever', 'pyrexia', 'காய்ச்சல்', 'बुखार'],
  'cough': ['cough', 'இருமல்', 'खांसी'],
  'headache': ['headache', 'தலைவலி', 'सिरदर्द'],
  'abdominal pain': ['abdominal pain', 'stomach pain', 'appendectomy', 'வயிறு வலி', 'पेट दर्द'],
  'thirst': ['thirst', 'polydipsia', 'increased thirst', 'அதிக தாகம்', 'प्यासा'],
  'kidney': ['kidney', 'creatinine', 'renal', 'serum creatinine', 'gfr', 'கிடனி', 'गुर्दा', 'किडनी'],
};

/**
 * Standardize text string to lowercase clean tokens.
 */
export function normalizeText(text?: string): string {
  if (!text) return '';
  return text.toLowerCase().trim().replace(/[\s\-_]+/g, ' ');
}

/**
 * Check if text contains any of the target concepts or their multilingual synonyms.
 */
export function textMatchesConcept(text?: string, targetConcept?: string): boolean {
  if (!text || !targetConcept) return false;
  const normText = normalizeText(text);
  const normTarget = normalizeText(targetConcept);

  if (normText.includes(normTarget)) return true;

  for (const [key, synonyms] of Object.entries(MULTILINGUAL_SYMPTOM_DICTIONARY)) {
    const isTargetMatch = normTarget.includes(key) || synonyms.some((syn) => normTarget.includes(syn.toLowerCase()));
    if (isTargetMatch) {
      if (synonyms.some((syn) => normText.includes(syn.toLowerCase()))) {
        return true;
      }
    }
  }

  return false;
}

export interface FeatureExtractionResult {
  chiefComplaintMatch: boolean;
  symptomMatch: boolean;
  conceptOverlap: boolean;
  departmentMatch: boolean;
  encounterLinkage: boolean;
  recencyBonus: boolean;
  verifiedDiagnosisMatch: boolean;
  medicationMatch: boolean;
  labMatch: boolean;
  procedureMatch: boolean;
  attentionFlagMatch: boolean;
  ayushMatch: boolean;
  reasons: string[];
}

/**
 * Extract feature signals for a timeline candidate relative to consultation context.
 */
export function extractRelevanceFeatures(
  event: TimelineEvent,
  context: RelevanceContext
): FeatureExtractionResult {
  const reasons: string[] = [];
  const eventTitleNorm = normalizeText(event.title);
  const eventSummaryNorm = normalizeText(event.summary);
  const eventTextNorm = `${eventTitleNorm} ${eventSummaryNorm} ${normalizeText(event.sourceText)}`;

  // 1. Chief Complaint Match
  let chiefComplaintMatch = false;
  if (context.chiefComplaint) {
    if (textMatchesConcept(eventTextNorm, context.chiefComplaint)) {
      chiefComplaintMatch = true;
      reasons.push('Matches current chief complaint');
    }
  }

  // 2. Symptom Match
  let symptomMatch = false;
  if (Array.isArray(context.symptoms) && context.symptoms.length > 0) {
    for (const sym of context.symptoms) {
      if (textMatchesConcept(eventTextNorm, sym)) {
        symptomMatch = true;
        reasons.push('Matches current symptom');
        break;
      }
    }
  }

  // 3. Clinical Concept Overlap (Domain-specific matching)
  let conceptOverlap = false;
  const contextTerms = [
    context.chiefComplaint,
    ...(context.symptoms || []),
    ...(context.clinicalFacts || []),
    context.questionContext,
  ]
    .filter(Boolean)
    .map((t) => normalizeText(t));

  for (const ctxTerm of contextTerms) {
    if (ctxTerm && textMatchesConcept(eventTextNorm, ctxTerm)) {
      conceptOverlap = true;
      if (!chiefComplaintMatch && !symptomMatch) {
        reasons.push('Matches consultation clinical context');
      }
      break;
    }
  }

  // 4. Department Match
  let departmentMatch = false;
  if (context.department && event.details?.department) {
    const deptCtx = normalizeText(context.department);
    const deptEvent = normalizeText(String(event.details.department));
    if (deptCtx && (deptEvent.includes(deptCtx) || deptCtx.includes(deptEvent))) {
      departmentMatch = true;
      reasons.push('Same department');
    }
  }

  // 5. Encounter Linkage
  let encounterLinkage = false;
  if (context.encounterId && event.encounterId === context.encounterId) {
    encounterLinkage = true;
    reasons.push('Linked to current encounter');
  }

  // 6. Recency Bonus (within last 90 days of currentDate or today)
  let recencyBonus = false;
  if (event.eventDate) {
    const refDate = context.currentDate ? new Date(context.currentDate) : new Date();
    const evDate = new Date(event.eventDate);
    if (!isNaN(refDate.getTime()) && !isNaN(evDate.getTime())) {
      const diffDays = Math.abs((refDate.getTime() - evDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 90) {
        recencyBonus = true;
        reasons.push('Recent relevant evidence');
      }
    }
  }

  // 7. Verified Diagnosis Match
  let verifiedDiagnosisMatch = false;
  if (event.eventType === 'diagnosis' && (conceptOverlap || chiefComplaintMatch || symptomMatch)) {
    if (event.verificationStatus === 'verified' || event.verificationStatus === 'doctor_verified') {
      verifiedDiagnosisMatch = true;
      reasons.push('Physician-verified diagnosis matches consultation context');
    }
  }

  // 8. Medication Match
  let medicationMatch = false;
  if (event.eventType === 'medication' && (conceptOverlap || chiefComplaintMatch || symptomMatch)) {
    medicationMatch = true;
    reasons.push('Related documented medication context');
  }

  // 9. Lab Match
  let labMatch = false;
  if (event.eventType === 'lab' && (conceptOverlap || chiefComplaintMatch || symptomMatch)) {
    labMatch = true;
    reasons.push('Related laboratory test');
  }

  // 10. Procedure Match
  let procedureMatch = false;
  if (event.eventType === 'procedure' && (conceptOverlap || chiefComplaintMatch || symptomMatch)) {
    procedureMatch = true;
    reasons.push('Related procedure');
  }

  // 11. Attention Flag Match
  let attentionFlagMatch = false;
  if (event.eventType === 'attention_flag' && (conceptOverlap || chiefComplaintMatch || symptomMatch)) {
    attentionFlagMatch = true;
    reasons.push('Relevant safety attention flag');
  }

  // 12. AYUSH Assessment Match
  let ayushMatch = false;
  if (event.eventType === 'ayush_assessment' && (conceptOverlap || context.department?.toLowerCase().includes('ayush'))) {
    ayushMatch = true;
    reasons.push('Relevant AYUSH clinical assessment');
  }

  return {
    chiefComplaintMatch,
    symptomMatch,
    conceptOverlap,
    departmentMatch,
    encounterLinkage,
    recencyBonus,
    verifiedDiagnosisMatch,
    medicationMatch,
    labMatch,
    procedureMatch,
    attentionFlagMatch,
    ayushMatch,
    reasons,
  };
}
