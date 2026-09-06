/**
 * Task #29 — Clinical Synthesis Context & Fingerprinting
 * MediKiosk Clinical Engine
 */

import * as crypto from 'crypto';
import type { ClinicalSynthesisContext } from './types';

/**
 * Normalizes input consultation context.
 */
export function normalizeSynthesisContext(
  context: ClinicalSynthesisContext
): ClinicalSynthesisContext {
  const patientId = (context.patientId || '').trim();
  const encounterId = context.encounterId ? context.encounterId.trim() : undefined;
  const department = context.department ? context.department.trim() : undefined;
  const consultationMode = context.consultationMode ? context.consultationMode.trim() : undefined;
  const chiefComplaint = context.chiefComplaint ? context.chiefComplaint.trim() : undefined;
  
  const symptoms = Array.isArray(context.symptoms)
    ? context.symptoms.map((s) => s.trim()).filter(Boolean)
    : [];

  const clinicalFacts = Array.isArray(context.clinicalFacts)
    ? context.clinicalFacts.map((f) => f.trim()).filter(Boolean)
    : [];

  const requestedEventTypes = Array.isArray(context.requestedEventTypes)
    ? context.requestedEventTypes.map((e) => e.trim()).filter(Boolean)
    : undefined;

  return {
    patientId,
    encounterId,
    department,
    consultationMode,
    chiefComplaint,
    symptoms,
    clinicalFacts,
    requestedEventTypes,
    fromDate: context.fromDate,
    toDate: context.toDate,
    limit: context.limit || 20,
    currentDate: context.currentDate,
  };
}

/**
 * Computes a deterministic MD5 fingerprint for the consultation context.
 * Used for idempotency check to avoid duplicate synthesis records.
 */
export function computeContextFingerprint(context: ClinicalSynthesisContext): string {
  const normCtx = normalizeSynthesisContext(context);
  const sortedSymptoms = [...(normCtx.symptoms || [])].sort().join('|');
  const sortedFacts = [...(normCtx.clinicalFacts || [])].sort().join('|');

  const rawKey = [
    `patient:${normCtx.patientId}`,
    `encounter:${normCtx.encounterId || ''}`,
    `dept:${normCtx.department || ''}`,
    `cc:${(normCtx.chiefComplaint || '').toLowerCase()}`,
    `symptoms:${sortedSymptoms.toLowerCase()}`,
    `facts:${sortedFacts.toLowerCase()}`,
  ].join(';');

  return crypto.createHash('md5').update(rawKey).digest('hex');
}
