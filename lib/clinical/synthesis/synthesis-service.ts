/**
 * Task #29 — Clinical Synthesis Service
 * MediKiosk Clinical Engine
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { hasValidConsent } from '@/lib/consent/consent-service';
import type { ClinicalSynthesisContext, ClinicalSynthesisResult, ClinicalSynthesisRecord } from './types';
import { normalizeSynthesisContext, computeContextFingerprint } from './synthesis-context';
import { aggregateSynthesisEvidence } from './synthesis-aggregator';
import { buildStructuredClinicalSynthesis } from './synthesis-rules';

/**
 * Writes an entry to public.audit_logs for clinical synthesis events.
 * Note: Full synthesized medical history is NOT logged in audit metadata.
 */
export async function logSynthesisAudit(
  action:
    | 'clinical_synthesis_started'
    | 'clinical_synthesis_completed'
    | 'clinical_synthesis_failed',
  patientId: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = await createAdminClient();
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
    console.error('[Synthesis Service] Failed to write audit log:', err);
  }
}

/**
 * Generates and idempotently persists structured clinical synthesis for a patient consultation context.
 */
export async function generateClinicalSynthesis(
  rawContext: ClinicalSynthesisContext
): Promise<ClinicalSynthesisResult> {
  const context = normalizeSynthesisContext(rawContext);
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
    await logSynthesisAudit('clinical_synthesis_failed', patientId, {
      reason: 'CONSENT_DENIED',
      permission: 'share_health_records',
    });
    return {
      success: false,
      errorCode: 'CONSENT_DENIED',
      error: "Patient has not granted active consent for 'share_health_records'",
    };
  }

  // 3. Enforce AYUSH Consent if AYUSH data is requested
  const isAyushRequested =
    (Array.isArray(requestedEventTypes) && requestedEventTypes.includes('ayush_assessment')) ||
    department?.toLowerCase().includes('ayush') ||
    department?.toLowerCase().includes('ayurveda');

  if (isAyushRequested) {
    const hasAyushConsent = await hasValidConsent(patientId, 'share_ayush_records');
    if (!hasAyushConsent) {
      await logSynthesisAudit('clinical_synthesis_failed', patientId, {
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

  await logSynthesisAudit('clinical_synthesis_started', patientId, {
    encounter_id: context.encounterId,
    department: context.department,
  });

  try {
    const fingerprint = computeContextFingerprint(context);

    // 4. Check for Existing Synthesis with identical fingerprint
    let existingSummary: any = null;
    if (context.encounterId) {
      const { data } = await supabase
        .from('clinical_consultation_summaries')
        .select('*')
        .eq('encounter_id', context.encounterId)
        .maybeSingle();
      existingSummary = data;
    }

    if (existingSummary && existingSummary.fingerprint === fingerprint && existingSummary.structured_synthesis) {
      const record: ClinicalSynthesisRecord = {
        id: existingSummary.id,
        patientId,
        encounterId: context.encounterId,
        synthesisVersion: existingSummary.synthesis_version || '1.0',
        generatedAt: existingSummary.updated_at || existingSummary.created_at,
        verificationStatus: existingSummary.physician_verified ? 'verified' : 'unverified',
        fingerprint,
        synthesis: existingSummary.structured_synthesis,
      };

      await logSynthesisAudit('clinical_synthesis_completed', patientId, {
        summary_id: existingSummary.id,
        reused_cache: true,
      });

      return {
        success: true,
        data: record,
      };
    }

    // 5. Aggregate Evidence & Build Structured Synthesis
    const aggregated = await aggregateSynthesisEvidence(context);
    const structuredSynthesis = buildStructuredClinicalSynthesis(aggregated);
    const generatedAt = new Date().toISOString();

    // 6. Idempotently Persist to public.clinical_consultation_summaries
    const adminSupabase = await createAdminClient();
    let savedId: string | undefined;

    if (context.encounterId) {
      if (existingSummary) {
        const { data: updated } = await adminSupabase
          .from('clinical_consultation_summaries')
          .update({
            structured_synthesis: structuredSynthesis,
            synthesis_version: '1.0',
            fingerprint,
            updated_at: generatedAt,
          })
          .eq('id', existingSummary.id)
          .select()
          .single();
        savedId = updated?.id || existingSummary.id;
      } else {
        const { data: inserted } = await adminSupabase
          .from('clinical_consultation_summaries')
          .insert({
            patient_id: patientId,
            encounter_id: context.encounterId,
            ai_summary_draft: {}, // Preserve non-null requirement if column has NOT NULL
            structured_synthesis: structuredSynthesis,
            synthesis_version: '1.0',
            fingerprint,
            created_at: generatedAt,
            updated_at: generatedAt,
          })
          .select()
          .single();
        savedId = inserted?.id;
      }
    }

    const record: ClinicalSynthesisRecord = {
      id: savedId,
      patientId,
      encounterId: context.encounterId,
      synthesisVersion: '1.0',
      generatedAt,
      verificationStatus: 'unverified',
      fingerprint,
      synthesis: structuredSynthesis,
    };

    await logSynthesisAudit('clinical_synthesis_completed', patientId, {
      summary_id: savedId,
      unresolved_conflicts_count: structuredSynthesis.unresolvedConflicts.length,
    });

    return {
      success: true,
      data: record,
    };
  } catch (err: any) {
    await logSynthesisAudit('clinical_synthesis_failed', patientId, {
      error: err.message || String(err),
    });
    return {
      success: false,
      errorCode: 'INTERNAL_ERROR',
      error: err.message || 'Clinical synthesis failed',
    };
  }
}

/**
 * Retrieves existing structured synthesis for a patient.
 */
export async function getClinicalSynthesis(
  patientId: string,
  encounterId?: string
): Promise<ClinicalSynthesisResult> {
  if (!patientId) {
    return {
      success: false,
      errorCode: 'INVALID_INPUT',
      error: 'Patient ID is required',
    };
  }

  const hasGeneralConsent = await hasValidConsent(patientId, 'share_health_records');
  if (!hasGeneralConsent) {
    return {
      success: false,
      errorCode: 'CONSENT_DENIED',
      error: "Patient has not granted active consent for 'share_health_records'",
    };
  }

  const supabase = await createClient();
  let query = supabase.from('clinical_consultation_summaries').select('*').eq('patient_id', patientId);

  if (encounterId) {
    query = query.eq('encounter_id', encounterId);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

  if (error || !data || !data.structured_synthesis) {
    return {
      success: false,
      errorCode: 'NOT_FOUND',
      error: 'No structured clinical synthesis found',
    };
  }

  return {
    success: true,
    data: {
      id: data.id,
      patientId,
      encounterId: data.encounter_id,
      synthesisVersion: data.synthesis_version || '1.0',
      generatedAt: data.updated_at || data.created_at,
      verificationStatus: data.physician_verified ? 'verified' : 'unverified',
      fingerprint: data.fingerprint || '',
      synthesis: data.structured_synthesis,
    },
  };
}
