/**
 * Task #28 — Clinical Conflict Service
 * MediKiosk Clinical Engine
 *
 * Main orchestration service for clinical conflict detection, resolution, audit logging,
 * and conflict query management.
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { hasValidConsent } from '@/lib/consent/consent-service';
import { classifyCandidateGroup } from './conflict-classifier';
import { gatherPatientEvidence } from './conflict-detector';
import { resolveCandidateGroup } from './conflict-resolver';
import type {
  ConflictAnalysisOptions,
  ConflictAnalysisResult,
  ConflictQueryFilters,
  ConflictRecord,
} from './types';

/**
 * Writes an entry to public.audit_logs for conflict resolution events.
 */
export async function logConflictAudit(
  action:
    | 'conflict_resolution_started'
    | 'conflict_resolution_completed'
    | 'conflict_resolution_failed',
  patientId: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = await createAdminClient();
    const { error } = await supabase.from('audit_logs').insert({
      action,
      actor_type: 'patient',
      actor_id: patientId,
      metadata: {
        patient_id: patientId,
        ...metadata,
      },
    });
    if (error) {
      console.error('[Conflict Audit] Insert error:', error.message, error.details);
    }
  } catch (err) {
    console.error('[Conflict Service] Failed to write audit log:', err);
  }
}

/**
 * Runs clinical conflict analysis for a patient.
 */
export async function analyzePatientConflicts(
  options: ConflictAnalysisOptions
): Promise<ConflictAnalysisResult> {
  const { patientId, encounterId, eventTypes, fromDate, toDate, includeResolved, limit } = options;

  if (!patientId || typeof patientId !== 'string' || patientId.trim() === '') {
    return {
      success: false,
      errorCode: 'INVALID_INPUT',
      error: 'Patient ID is required',
    };
  }

  const supabase = await createClient();

  // 1. Verify Patient Exists
  const { data: patient, error: patientErr } = await supabase
    .from('patients')
    .select('id')
    .eq('id', patientId)
    .maybeSingle();

  if (patientErr || !patient) {
    return {
      success: false,
      errorCode: 'NOT_FOUND',
      error: `Patient not found: ${patientId}`,
    };
  }

  // 2. Enforce General Medicine Consent (share_health_records)
  const hasGeneralConsent = await hasValidConsent(patientId, 'share_health_records');
  if (!hasGeneralConsent) {
    await logConflictAudit('conflict_resolution_failed', patientId, {
      reason: 'CONSENT_DENIED',
      permission: 'share_health_records',
    });
    return {
      success: false,
      errorCode: 'CONSENT_DENIED',
      error: "Patient has not granted active consent for 'share_health_records'",
    };
  }

  // 3. Enforce AYUSH Consent if AYUSH data is explicitly requested
  const isAyushRequested =
    Array.isArray(eventTypes) && (eventTypes.includes('ayush') || eventTypes.includes('ayush_assessment'));
  if (isAyushRequested) {
    const hasAyushConsent = await hasValidConsent(patientId, 'share_ayush_records');
    if (!hasAyushConsent) {
      await logConflictAudit('conflict_resolution_failed', patientId, {
        reason: 'CONSENT_DENIED',
        permission: 'share_ayush_records',
      });
      return {
        success: false,
        errorCode: 'CONSENT_DENIED',
        error: "Patient has not granted active consent for 'share_ayush_records'",
      };
    }
  }

  await logConflictAudit('conflict_resolution_started', patientId, {
    encounter_id: encounterId,
    event_types: eventTypes,
    from_date: fromDate,
    to_date: toDate,
  });

  try {
    // 4. Gather candidate evidence groups
    const candidateGroups = await gatherPatientEvidence(patientId, {
      encounterId,
      eventTypes,
      fromDate,
      toDate,
    });

    const conflicts: ConflictRecord[] = [];

    // 5. Classify & Resolve each group
    for (const [groupKey, candidates] of candidateGroups.entries()) {
      const classification = classifyCandidateGroup(groupKey, candidates);
      const conflict = resolveCandidateGroup(
        patientId,
        groupKey,
        candidates,
        classification,
        encounterId
      );
      conflicts.push(conflict);
    }

    // 6. Upsert conflicts into public.clinical_conflicts for idempotency
    if (conflicts.length > 0) {
      const upsertRows = conflicts.map((c) => ({
        patient_id: c.patientId,
        encounter_id: c.encounterId || null,
        conflict_type: c.conflictType,
        severity: c.severity,
        resolution_status: c.resolutionStatus,
        explanation: c.explanation,
        preferred_source_type: c.preferredCandidate ? c.preferredCandidate.sourceType : null,
        preferred_source_id: c.preferredCandidate ? c.preferredCandidate.sourceId : null,
        requires_clinician_review: c.requiresClinicianReview,
        candidates_json: c.candidates,
        provenance_json: c.provenance || {},
        conflict_key: c.conflictKey,
        updated_at: new Date().toISOString(),
      }));

      await supabase.from('clinical_conflicts').upsert(upsertRows, { onConflict: 'conflict_key' });
    }

    // 7. Filter according to query options
    let filteredConflicts = conflicts;
    if (includeResolved === false) {
      filteredConflicts = filteredConflicts.filter((c) => c.resolutionStatus === 'unresolved' || c.requiresClinicianReview);
    }

    const effectiveLimit = limit ? Math.min(50, Math.max(1, limit)) : 20;
    filteredConflicts = filteredConflicts.slice(0, effectiveLimit);

    // 8. Calculate Summary Counts
    const summary = {
      total: conflicts.length,
      unresolved: conflicts.filter((c) => c.resolutionStatus === 'unresolved').length,
      resolved: conflicts.filter((c) => c.resolutionStatus !== 'unresolved' && c.resolutionStatus !== 'needs_clinician_review').length,
      needsReview: conflicts.filter((c) => c.requiresClinicianReview).length,
    };

    await logConflictAudit('conflict_resolution_completed', patientId, {
      total_conflicts: summary.total,
      unresolved: summary.unresolved,
      resolved: summary.resolved,
      needs_review: summary.needsReview,
    });

    return {
      success: true,
      data: {
        patientId,
        conflicts: filteredConflicts,
        summary,
      },
    };
  } catch (err: any) {
    await logConflictAudit('conflict_resolution_failed', patientId, {
      error: err?.message || String(err),
    });
    return {
      success: false,
      errorCode: 'INTERNAL_ERROR',
      error: err?.message || 'Failed to perform clinical conflict analysis',
    };
  }
}

/**
 * Retrieves existing stored conflicts from public.clinical_conflicts.
 */
export async function getPatientConflicts(
  filters: ConflictQueryFilters
): Promise<ConflictAnalysisResult> {
  const { patientId, encounterId, conflictType, severity, includeResolved, fromDate, toDate, limit } =
    filters;

  if (!patientId || typeof patientId !== 'string' || patientId.trim() === '') {
    return {
      success: false,
      errorCode: 'INVALID_INPUT',
      error: 'Patient ID is required',
    };
  }

  const supabase = await createClient();

  // 1. Verify patient exists
  const { data: patient, error: patientErr } = await supabase
    .from('patients')
    .select('id')
    .eq('id', patientId)
    .maybeSingle();

  if (patientErr || !patient) {
    return {
      success: false,
      errorCode: 'NOT_FOUND',
      error: `Patient not found: ${patientId}`,
    };
  }

  // 2. Consent check
  const hasConsent = await hasValidConsent(patientId, 'share_health_records');
  if (!hasConsent) {
    return {
      success: false,
      errorCode: 'CONSENT_DENIED',
      error: "Patient has not granted active consent for 'share_health_records'",
    };
  }

  // 3. Build query
  let query = supabase.from('clinical_conflicts').select('*').eq('patient_id', patientId);

  if (encounterId) query = query.eq('encounter_id', encounterId);
  if (conflictType) query = query.eq('conflict_type', conflictType);
  if (severity) query = query.eq('severity', severity);
  if (includeResolved === false) {
    query = query.or('resolution_status.eq.unresolved,requires_clinician_review.eq.true');
  }
  if (fromDate) query = query.gte('created_at', fromDate);
  if (toDate) query = query.lte('created_at', toDate);

  const effectiveLimit = limit ? Math.min(50, Math.max(1, limit)) : 20;
  query = query.order('created_at', { ascending: false }).limit(effectiveLimit);

  const { data, error } = await query;

  if (error) {
    return {
      success: false,
      errorCode: 'INTERNAL_ERROR',
      error: error.message,
    };
  }

  const conflicts: ConflictRecord[] = (data || []).map((row: any) => ({
    id: row.id,
    patientId: row.patient_id,
    encounterId: row.encounter_id || undefined,
    conflictType: row.conflict_type,
    severity: row.severity,
    resolutionStatus: row.resolution_status,
    explanation: row.explanation,
    candidates: row.candidates_json || [],
    preferredCandidate: row.preferred_source_id
      ? (row.candidates_json || []).find((c: any) => c.sourceId === row.preferred_source_id) || null
      : null,
    requiresClinicianReview: row.requires_clinician_review,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    conflictKey: row.conflict_key,
    provenance: row.provenance_json || {},
  }));

  const summary = {
    total: conflicts.length,
    unresolved: conflicts.filter((c) => c.resolutionStatus === 'unresolved').length,
    resolved: conflicts.filter((c) => c.resolutionStatus !== 'unresolved' && c.resolutionStatus !== 'needs_clinician_review').length,
    needsReview: conflicts.filter((c) => c.requiresClinicianReview).length,
  };

  return {
    success: true,
    data: {
      patientId,
      conflicts,
      summary,
    },
  };
}
