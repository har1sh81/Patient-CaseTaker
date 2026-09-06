/**
 * Task #28 — Clinical Conflict Classifier
 * MediKiosk Clinical Engine
 *
 * Classifies candidate evidence groups into specific conflict types and assigns severity.
 */

import type { ConflictCandidate, ConflictSeverity, ConflictType } from './types';

export interface ClassificationResult {
  conflictType: ConflictType;
  severity: ConflictSeverity;
  explanation: string;
  isDuplicate: boolean;
  isTemporalDifference: boolean;
  hasUncertainty: boolean;
}

/**
 * Checks if two date strings are on different explicit dates.
 */
function areDifferentDates(dateA?: string, dateB?: string): boolean {
  if (!dateA || !dateB) return false;
  const dA = dateA.slice(0, 10);
  const dB = dateB.slice(0, 10);
  return dA !== dB;
}

/**
 * Checks if values are exact duplicates (including identical verification status & reference range).
 */
function isExactDuplicateCandidate(c1: ConflictCandidate, c2: ConflictCandidate): boolean {
  const val1 = JSON.stringify(c1.value);
  const val2 = JSON.stringify(c2.value);
  const date1 = c1.eventDate ? c1.eventDate.slice(0, 10) : '';
  const date2 = c2.eventDate ? c2.eventDate.slice(0, 10) : '';
  const unit1 = c1.unit || '';
  const unit2 = c2.unit || '';
  const status1 = c1.status || '';
  const status2 = c2.status || '';
  const ver1 = c1.verificationStatus || '';
  const ver2 = c2.verificationStatus || '';
  const ref1 = (c1.provenance?.referenceRange as string) || (c1 as any).referenceRange || '';
  const ref2 = (c2.provenance?.referenceRange as string) || (c2 as any).referenceRange || '';

  return (
    val1 === val2 &&
    date1 === date2 &&
    unit1 === unit2 &&
    status1 === status2 &&
    ver1 === ver2 &&
    ref1 === ref2
  );
}

/**
 * Classifies a set of candidates for a single concept key.
 */
export function classifyCandidateGroup(
  groupKey: string,
  candidates: ConflictCandidate[]
): ClassificationResult {
  if (!candidates || candidates.length === 0) {
    return {
      conflictType: 'other',
      severity: 'informational',
      explanation: 'No candidates provided for classification.',
      isDuplicate: false,
      isTemporalDifference: false,
      hasUncertainty: false,
    };
  }

  // Check OCR / Extraction Uncertainty
  const hasUncertainty = candidates.some(
    (c) => c.needsReview || String(c.value).includes('?') || (c.sourceText && c.sourceText.includes('?'))
  );

  if (candidates.length === 1) {
    if (hasUncertainty) {
      return {
        conflictType: 'extraction_uncertainty',
        severity: 'low',
        explanation: 'Extraction uncertainty flagged in source document OCR.',
        isDuplicate: false,
        isTemporalDifference: false,
        hasUncertainty: true,
      };
    }
    return {
      conflictType: 'other',
      severity: 'informational',
      explanation: 'Single candidate record provided.',
      isDuplicate: false,
      isTemporalDifference: false,
      hasUncertainty: false,
    };
  }

  // Check Exact Duplicates across all candidates
  const allExactDuplicates = candidates.every((c) => isExactDuplicateCandidate(candidates[0], c));
  if (allExactDuplicates) {
    return {
      conflictType: 'duplicate_or_near_duplicate',
      severity: 'informational',
      explanation: 'Exact duplicate observation detected from repeated ingestion.',
      isDuplicate: true,
      isTemporalDifference: false,
      hasUncertainty,
    };
  }

  const [c1, c2] = candidates;

  // 1. Medication Candidates
  if (groupKey.startsWith('med:')) {
    const datesDifferent = areDifferentDates(c1.eventDate, c2.eventDate);

    if (datesDifferent) {
      // Check status transition across different dates
      const s1 = (c1.status || '').toLowerCase();
      const s2 = (c2.status || '').toLowerCase();
      if ((s1 === 'active' && s2 === 'discontinued') || (s1 === 'discontinued' && s2 === 'active')) {
        return {
          conflictType: 'medication_status_conflict',
          severity: 'low',
          explanation: 'Earlier medication record is active; later record documents discontinuation.',
          isDuplicate: false,
          isTemporalDifference: false, // Flag status conflict resolution priority
          hasUncertainty,
        };
      }
      return {
        conflictType: 'temporal_difference',
        severity: 'informational',
        explanation: 'Different observations documented on different dates.',
        isDuplicate: false,
        isTemporalDifference: true,
        hasUncertainty,
      };
    }

    // Same date medication checks
    const s1 = (c1.status || '').toLowerCase();
    const s2 = (c2.status || '').toLowerCase();
    if (s1 && s2 && s1 !== s2 && ((s1 === 'active' && s2 === 'discontinued') || (s1 === 'discontinued' && s2 === 'active'))) {
      return {
        conflictType: 'medication_status_conflict',
        severity: 'high',
        explanation: 'Conflicting medication status documented for the same date/time frame.',
        isDuplicate: false,
        isTemporalDifference: false,
        hasUncertainty,
      };
    }

    // Check dose conflict on same date
    const val1Str = JSON.stringify(c1.value).toLowerCase();
    const val2Str = JSON.stringify(c2.value).toLowerCase();
    if (val1Str !== val2Str) {
      return {
        conflictType: 'medication_dose_conflict',
        severity: 'high',
        explanation: 'Two different medication doses documented on the same date.',
        isDuplicate: false,
        isTemporalDifference: false,
        hasUncertainty,
      };
    }
  }

  // 2. Lab Candidates
  if (groupKey.startsWith('lab:')) {
    const datesDifferent = areDifferentDates(c1.eventDate, c2.eventDate);

    if (datesDifferent) {
      return {
        conflictType: 'temporal_difference',
        severity: 'informational',
        explanation: 'Different observations documented on different dates.',
        isDuplicate: false,
        isTemporalDifference: true,
        hasUncertainty,
      };
    }

    // Same date lab checks
    const u1 = (c1.unit || '').trim().toLowerCase();
    const u2 = (c2.unit || '').trim().toLowerCase();

    if (u1 && u2 && u1 !== u2) {
      return {
        conflictType: 'lab_unit_conflict',
        severity: 'moderate',
        explanation: 'Incompatible or un-normalized laboratory units for the same test on the same date.',
        isDuplicate: false,
        isTemporalDifference: false,
        hasUncertainty,
      };
    }

    // Reference Range Conflict
    const ref1 = (c1.provenance?.referenceRange as string) || (c1 as any).referenceRange || '';
    const ref2 = (c2.provenance?.referenceRange as string) || (c2 as any).referenceRange || '';
    if (ref1 && ref2 && ref1 !== ref2) {
      return {
        conflictType: 'source_document_conflict',
        severity: 'low',
        explanation: 'Different reference ranges documented across source records.',
        isDuplicate: false,
        isTemporalDifference: false,
        hasUncertainty,
      };
    }

    // Value conflict on same date
    if (String(c1.value) !== String(c2.value)) {
      return {
        conflictType: 'lab_value_conflict',
        severity: 'high',
        explanation: 'Two different laboratory values documented for the same test on the same date.',
        isDuplicate: false,
        isTemporalDifference: false,
        hasUncertainty,
      };
    }
  }

  // 3. Procedure Candidates
  if (groupKey.startsWith('proc:')) {
    const datesDifferent = areDifferentDates(c1.eventDate, c2.eventDate);
    const s1 = (c1.status || '').toLowerCase();
    const s2 = (c2.status || '').toLowerCase();

    if (datesDifferent || s1 !== s2) {
      if ((s1 === 'planned' || s1 === 'scheduled') && s2 === 'completed') {
        return {
          conflictType: 'procedure_status_conflict',
          severity: 'informational',
          explanation: 'Procedure status progression from planned to completed.',
          isDuplicate: false,
          isTemporalDifference: false,
          hasUncertainty,
        };
      }
      if ((s1 === 'completed' && s2 === 'cancelled') || (s1 === 'cancelled' && s2 === 'completed')) {
        return {
          conflictType: 'procedure_status_conflict',
          severity: 'high',
          explanation: 'Conflicting procedure statuses (completed and cancelled) documented.',
          isDuplicate: false,
          isTemporalDifference: datesDifferent,
          hasUncertainty,
        };
      }
    }

    if (datesDifferent) {
      return {
        conflictType: 'temporal_difference',
        severity: 'informational',
        explanation: 'Different observations documented on different dates.',
        isDuplicate: false,
        isTemporalDifference: true,
        hasUncertainty,
      };
    }
  }

  // 4. Diagnosis Candidates
  if (groupKey.startsWith('diag:')) {
    const datesDifferent = areDifferentDates(c1.eventDate, c2.eventDate);
    const s1 = (c1.status || '').toLowerCase();
    const s2 = (c2.status || '').toLowerCase();

    if (s1 !== s2 && (s1 === 'verified' || s2 === 'verified')) {
      return {
        conflictType: 'diagnosis_status_conflict',
        severity: 'low',
        explanation: 'Diagnosis record verification or clinical status difference across documents.',
        isDuplicate: false,
        isTemporalDifference: datesDifferent,
        hasUncertainty,
      };
    }

    if (datesDifferent) {
      return {
        conflictType: 'temporal_difference',
        severity: 'informational',
        explanation: 'Different observations documented on different dates.',
        isDuplicate: false,
        isTemporalDifference: true,
        hasUncertainty,
      };
    }
  }

  // Fallback for generic candidates
  if (areDifferentDates(c1.eventDate, c2.eventDate)) {
    return {
      conflictType: 'temporal_difference',
      severity: 'informational',
      explanation: 'Different observations documented on different dates.',
      isDuplicate: false,
      isTemporalDifference: true,
      hasUncertainty,
    };
  }

  if (hasUncertainty) {
    return {
      conflictType: 'extraction_uncertainty',
      severity: 'low',
      explanation: 'Extraction uncertainty flagged in source document OCR.',
      isDuplicate: false,
      isTemporalDifference: false,
      hasUncertainty: true,
    };
  }

  return {
    conflictType: 'source_document_conflict',
    severity: 'low',
    explanation: 'Multiple document sources document this clinical item.',
    isDuplicate: false,
    isTemporalDifference: false,
    hasUncertainty: false,
  };
}
