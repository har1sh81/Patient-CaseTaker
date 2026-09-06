/**
 * Task #27 — Relevance Retrieval Service
 * MediKiosk Clinical Engine
 */

import { createClient } from '@/lib/supabase/server';
import { hasValidConsent } from '@/lib/consent/consent-service';
import type { RelevanceContext, RelevanceResult } from './types';
import { retrieveRelevantCandidates } from './relevance-retriever';

/**
 * Writes an entry to public.audit_logs for relevance retrieval events.
 * Note: Full patient history / raw text is NOT logged in audit metadata.
 */
export async function logRelevanceAudit(
  action:
    | 'relevance_retrieval_started'
    | 'relevance_retrieval_completed'
    | 'relevance_retrieval_failed',
  patientId: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from('audit_logs').insert({
      action,
      actor_type: 'patient',
      actor_id: patientId,
      metadata: {
        patient_id: patientId,
        ...metadata,
      },
    });
  } catch (err) {
    console.error('[Relevance Service] Failed to write audit log:', err);
  }
}

/**
 * Core clinical relevance retrieval function.
 */
export async function getRelevantClinicalEvidence(
  context: RelevanceContext
): Promise<RelevanceResult> {
  const { patientId, department, requestedEventTypes } = context;

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
    await logRelevanceAudit('relevance_retrieval_failed', patientId, {
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
    (Array.isArray(requestedEventTypes) && requestedEventTypes.includes('ayush_assessment')) ||
    department?.toLowerCase().includes('ayush') ||
    department?.toLowerCase().includes('ayurveda');

  if (isAyushRequested) {
    const hasAyushConsent = await hasValidConsent(patientId, 'share_ayush_records');
    if (!hasAyushConsent) {
      await logRelevanceAudit('relevance_retrieval_failed', patientId, {
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

  await logRelevanceAudit('relevance_retrieval_started', patientId, {
    department,
    encounter_id: context.encounterId,
    chief_complaint: context.chiefComplaint,
  });

  try {
    // 4. Retrieve & Score Candidates
    const { candidates, totalRetrieved } = await retrieveRelevantCandidates(context);

    await logRelevanceAudit('relevance_retrieval_completed', patientId, {
      total_retrieved: totalRetrieved,
      total_returned: candidates.length,
    });

    return {
      success: true,
      data: {
        queryContext: {
          patientId: context.patientId,
          encounterId: context.encounterId,
          department: context.department,
          consultationMode: context.consultationMode,
          chiefComplaint: context.chiefComplaint,
          symptoms: context.symptoms,
        },
        candidates,
        totalRetrieved,
        totalReturned: candidates.length,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    await logRelevanceAudit('relevance_retrieval_failed', patientId, {
      error: err?.message || String(err),
    });
    return {
      success: false,
      errorCode: 'INTERNAL_ERROR',
      error: err?.message || 'Failed to retrieve relevant clinical evidence',
    };
  }
}
