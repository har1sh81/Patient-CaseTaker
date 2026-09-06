/**
 * Task #28 — Clinical Conflict Resolver
 * MediKiosk Clinical Engine
 *
 * Conservatively attempts deterministic, non-clinical resolutions for candidate evidence groups.
 * Otherwise returns resolutionStatus = "unresolved" and requiresClinicianReview = true.
 */

import type { ClassificationResult } from './conflict-classifier';
import type { ConflictCandidate, ConflictRecord, ResolutionStatus } from './types';

/**
 * Resolves a group of candidate records based on classification results.
 */
export function resolveCandidateGroup(
  patientId: string,
  groupKey: string,
  candidates: ConflictCandidate[],
  classification: ClassificationResult,
  encounterId?: string
): ConflictRecord {
  const { conflictType, severity, explanation, isDuplicate, isTemporalDifference, hasUncertainty } =
    classification;

  // Generate deterministic conflict key for idempotency
  const sortedSourceIds = candidates.map((c) => `${c.sourceType}:${c.sourceId}`).sort().join('|');
  const conflictKey = `${patientId}:${conflictType}:${groupKey}:${sortedSourceIds}`;
  const now = new Date().toISOString();
  const id = `conf_${Math.abs(hashString(conflictKey)).toString(16)}`;

  let resolutionStatus: ResolutionStatus = 'unresolved';
  let requiresClinicianReview = true;
  let finalExplanation = explanation;
  let preferredCandidate: ConflictCandidate | null = null; // Default null - NEVER force a winner!

  // Rule 1: Verified vs Unverified with identical value
  if (
    candidates.length >= 2 &&
    String(candidates[0].value) === String(candidates[1].value) &&
    candidates[0].verificationStatus !== candidates[1].verificationStatus &&
    (candidates[0].verificationStatus === 'verified' || candidates[1].verificationStatus === 'verified')
  ) {
    resolutionStatus = 'resolved_by_source_verification';
    requiresClinicianReview = false;
    finalExplanation = 'Observation verified by authoritative clinical source.';
    preferredCandidate =
      candidates[0].verificationStatus === 'verified' ? candidates[0] : candidates[1];
  }
  // Rule 2: Medication Status Progression across dates
  else if (
    conflictType === 'medication_status_conflict' &&
    candidates.length >= 2 &&
    candidates[0].eventDate &&
    candidates[1].eventDate &&
    candidates[0].eventDate !== candidates[1].eventDate
  ) {
    resolutionStatus = 'resolved_by_temporal_order';
    requiresClinicianReview = false;
    finalExplanation = 'Earlier medication record is active; later record documents discontinuation.';
    preferredCandidate = null;
  }
  // Rule 3: Procedure Status Progression (planned -> completed across dates)
  else if (
    conflictType === 'procedure_status_conflict' &&
    candidates.length >= 2 &&
    candidates[0].eventDate &&
    candidates[1].eventDate &&
    candidates[0].eventDate !== candidates[1].eventDate
  ) {
    resolutionStatus = 'resolved_by_temporal_order';
    requiresClinicianReview = false;
    finalExplanation = 'Procedure status progression from planned to completed.';
    preferredCandidate = null;
  }
  // Rule 4: Temporal Difference (different dates, non-conflicting)
  else if (isTemporalDifference || conflictType === 'temporal_difference') {
    resolutionStatus = 'resolved_as_non_conflict';
    requiresClinicianReview = false;
    finalExplanation = 'Different observations documented on different dates.';
    preferredCandidate = null;
  }
  // Rule 5: Exact Duplicate Observation
  else if (isDuplicate || conflictType === 'duplicate_or_near_duplicate') {
    resolutionStatus = 'resolved_as_non_conflict';
    requiresClinicianReview = false;
    finalExplanation = 'Exact duplicate observation detected from repeated ingestion.';
    preferredCandidate = null;
  }
  // Rule 6: Extraction Uncertainty
  else if (conflictType === 'extraction_uncertainty' || hasUncertainty) {
    resolutionStatus = 'needs_clinician_review';
    requiresClinicianReview = true;
    finalExplanation = 'Extraction uncertainty flagged in source document OCR.';
    preferredCandidate = null;
  }
  // Rule 7: Unresolved Conditions (Same-date lab conflict, dose conflict, status conflict, incompatible units, etc.)
  else {
    resolutionStatus = 'unresolved';
    requiresClinicianReview = true;
    preferredCandidate = null; // Always null when unresolved
  }

  return {
    id,
    patientId,
    encounterId,
    conflictType,
    severity,
    resolutionStatus,
    explanation: finalExplanation,
    candidates,
    preferredCandidate,
    requiresClinicianReview,
    createdAt: now,
    updatedAt: now,
    conflictKey,
    provenance: {
      patientId,
      encounterId,
      groupKey,
      candidateCount: candidates.length,
    },
  };
}

/**
 * Simple string hashing helper for deterministic ID generation.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}
