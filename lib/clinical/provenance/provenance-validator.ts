/**
 * Task #31 — Deterministic Provenance Validator
 * MediKiosk Clinical Architecture
 * 
 * Validates provenance references and chains:
 * - Cross-patient ownership isolation
 * - Verification status integrity (no unverified -> verified auto-upgrade)
 * - Page number validity
 * - AI trace completeness
 */

import type { ProvenanceChain, ProvenanceReference, ProvenanceValidationResult } from './types';

/**
 * Validates a single provenance reference.
 */
export function validateProvenanceReference(
  expectedPatientId: string,
  ref: ProvenanceReference
): ProvenanceValidationResult {
  const warnings: string[] = [];

  // 1. Cross-Patient Safety Check
  if (ref.patientId && ref.patientId !== expectedPatientId) {
    return {
      valid: false,
      warnings: ['PROVENANCE_VALIDATION_FAILED'],
      reason: `PROVENANCE_VALIDATION_FAILED: Source record patient ${ref.patientId} does not match requested patient ${expectedPatientId}`,
    };
  }

  // 2. Page Number Check
  if (ref.pageNumber !== undefined && ref.pageNumber !== null) {
    if (!Number.isInteger(ref.pageNumber) || ref.pageNumber < 1) {
      warnings.push(`INVALID_PAGE_NUMBER: ${ref.pageNumber}`);
    }
  }

  // 3. Verification Status Check
  if (ref.provenanceSource === 'unverified' && ref.verificationStatus === 'verified') {
    return {
      valid: false,
      warnings: ['UNAUTHORIZED_VERIFICATION_UPGRADE'],
      reason: 'PROVENANCE_VALIDATION_FAILED: Unverified source cannot be upgraded to verified without explicit clinician action',
    };
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * Validates an entire multi-hop provenance chain.
 */
export function validateProvenanceChain(
  expectedPatientId: string,
  chain: ProvenanceChain
): ProvenanceValidationResult {
  const warnings: string[] = [...chain.warnings];

  // 1. Verify root source patient match
  const rootValidation = validateProvenanceReference(expectedPatientId, chain.rootSource);
  if (!rootValidation.valid) {
    return rootValidation;
  }

  // 2. Verify all chain node patient ownership matches
  for (const node of chain.nodes) {
    if (node.patientId && node.patientId !== expectedPatientId) {
      return {
        valid: false,
        warnings: ['PROVENANCE_VALIDATION_FAILED'],
        reason: `PROVENANCE_VALIDATION_FAILED: Cross-patient node ${node.sourceType}:${node.sourceId} (patient ${node.patientId}) detected`,
      };
    }
    const nodeVal = validateProvenanceReference(expectedPatientId, node);
    if (!nodeVal.valid) {
      return nodeVal;
    }
  }

  // 3. Cycle & Depth Warnings
  if (!chain.chainValid) {
    return {
      valid: false,
      warnings,
      reason: warnings.includes('PROVENANCE_CYCLE_DETECTED') ? 'PROVENANCE_CYCLE_DETECTED' : 'INVALID_PROVENANCE_CHAIN',
    };
  }

  // 4. AI Trace Validation if AI summary root
  if (chain.rootSource.sourceType === 'ai_summary') {
    if (!chain.aiTraceMetadata?.sourceFingerprint) {
      warnings.push('MISSING_AI_SYNTHESIS_FINGERPRINT');
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
