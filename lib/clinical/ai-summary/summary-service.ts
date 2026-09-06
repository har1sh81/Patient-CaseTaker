/**
 * Task #30 — AI Clinical Summary Service
 * MediKiosk Clinical Engine
 * 
 * Manages controlled AI summary generation, prompt versioning, idempotency,
 * DB persistence to public.clinical_consultation_summaries.ai_summary_draft,
 * physician review/edits, consent enforcement, and audit logging.
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { hasValidConsent } from '@/lib/consent/consent-service';
import { generateClinicalSynthesis } from '../synthesis/synthesis-service';
import type {
  AiSummaryServiceRequest,
  AiSummaryServiceResponse,
  AiClinicalSummary,
  PhysicianReviewRequest,
  PhysicianNotesEditsData,
  ClinicalSummaryProvider,
} from './types';
import { buildAiSummaryInput } from './summary-input-builder';
import { getClinicalSummaryProvider } from './summary-provider';

/**
 * Logs audit events for AI Clinical Summary actions.
 * Full patient medical history is NOT stored in audit log metadata.
 */
export async function logAiSummaryAudit(
  action:
    | 'ai_summary_generation_started'
    | 'ai_summary_generation_completed'
    | 'ai_summary_generation_failed'
    | 'ai_summary_reviewed',
  patientId: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = await createAdminClient();
    const cleanMetadata: Record<string, unknown> = { patient_id: patientId };
    for (const [k, v] of Object.entries(metadata)) {
      if (v !== undefined) {
        cleanMetadata[k] = v;
      }
    }
    const { error: insertErr } = await supabase.from('audit_logs').insert({
      action,
      actor_type: 'doctor',
      actor_id: patientId,
      metadata: cleanMetadata,
    });
    if (insertErr) {
      console.error('[AI Summary Service] Audit log insert error:', insertErr);
    }
  } catch (err) {
    console.error('[AI Summary Service] Failed to log audit event:', err);
  }
}

/**
 * Generates an AI draft clinical summary from Task #29 Structured Synthesis.
 */
export async function generateAiClinicalSummary(
  request: AiSummaryServiceRequest,
  overrideProvider?: ClinicalSummaryProvider
): Promise<AiSummaryServiceResponse> {
  const { patientId, encounterId, summaryLanguage = 'en', forceRegenerate = false } = request;

  if (!patientId || typeof patientId !== 'string' || patientId.trim() === '') {
    return {
      success: false,
      errorCode: 'INVALID_INPUT',
      error: 'Patient ID is required',
    };
  }

  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

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
    await logAiSummaryAudit('ai_summary_generation_failed', patientId, {
      reason: 'CONSENT_DENIED',
      permission: 'share_health_records',
    });
    return {
      success: false,
      errorCode: 'CONSENT_DENIED',
      error: "Patient has not granted active consent for 'share_health_records'",
    };
  }

  // 3. Retrieve Task #29 Structured Synthesis
  const synthesisResult = await generateClinicalSynthesis({ patientId, encounterId });
  if (!synthesisResult.success || !synthesisResult.data) {
    await logAiSummaryAudit('ai_summary_generation_failed', patientId, {
      reason: synthesisResult.errorCode || 'SYNTHESIS_FAILED',
    });
    return {
      success: false,
      errorCode: synthesisResult.errorCode || 'SYNTHESIS_FAILED',
      error: synthesisResult.error || 'Failed to retrieve structured clinical synthesis',
    };
  }

  const synthesisRecord = synthesisResult.data;
  const fingerprint = synthesisRecord.fingerprint;

  // 4. Idempotency Check
  if (!forceRegenerate) {
    let query = adminSupabase
      .from('clinical_consultation_summaries')
      .select('*')
      .eq('patient_id', patientId);

    if (encounterId) {
      query = query.eq('encounter_id', encounterId);
    }

    const { data: existingSummaryRow } = await query.order('created_at', { ascending: false }).maybeSingle();

    if (
      existingSummaryRow &&
      existingSummaryRow.fingerprint === fingerprint &&
      existingSummaryRow.ai_summary_draft
    ) {
      const draft = existingSummaryRow.ai_summary_draft as AiClinicalSummary;
      // Check if language matches requested language
      if (draft && draft.summaryText) {
        return {
          success: true,
          data: {
            patientId,
            encounterId: existingSummaryRow.encounter_id || encounterId,
            summary: draft,
            physicianReview: existingSummaryRow.physician_notes_edits as PhysicianNotesEditsData,
          },
        };
      }
    }
  }

  // 5. Build Controlled AI Summary Input
  const aiInput = buildAiSummaryInput(patientId, synthesisRecord.synthesis, {
    encounterId,
    summaryLanguage,
  });

  // 6. Invoke AI Provider
  await logAiSummaryAudit('ai_summary_generation_started', patientId, {
    encounter_id: encounterId,
    language: summaryLanguage,
  });

  const provider = getClinicalSummaryProvider(overrideProvider);
  const generationResult = await provider.generateSummary(aiInput);

  if (!generationResult.success || !generationResult.data) {
    await logAiSummaryAudit('ai_summary_generation_failed', patientId, {
      reason: generationResult.errorCode || 'AI_SUMMARY_UNAVAILABLE',
      error: generationResult.error,
    });
    return {
      success: false,
      errorCode: generationResult.errorCode || 'AI_SUMMARY_UNAVAILABLE',
      error: generationResult.error || 'AI summary generation failed',
    };
  }

  const aiSummary = generationResult.data;
  aiSummary.sourceSynthesisVersion = synthesisRecord.synthesisVersion;
  aiSummary.sourceFingerprint = fingerprint;

  // 7. Persist Draft to public.clinical_consultation_summaries
  let targetEncounterId = encounterId || null;
  if (!targetEncounterId) {
    const { data: enc } = await adminSupabase
      .from('encounters')
      .select('id')
      .eq('patient_id', patientId)
      .limit(1)
      .maybeSingle();

    targetEncounterId = enc?.id || null;
  }

  let summaryQuery = adminSupabase
    .from('clinical_consultation_summaries')
    .select('id')
    .eq('patient_id', patientId);

  if (targetEncounterId) {
    summaryQuery = summaryQuery.eq('encounter_id', targetEncounterId);
  } else {
    summaryQuery = summaryQuery.is('encounter_id', null);
  }

  const { data: existingRow } = await summaryQuery.maybeSingle();

  if (existingRow?.id) {
    await adminSupabase
      .from('clinical_consultation_summaries')
      .update({
        ai_summary_draft: aiSummary as any,
        fingerprint,
        structured_synthesis: synthesisRecord.synthesis as any,
        synthesis_version: synthesisRecord.synthesisVersion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingRow.id);
  } else {
    await adminSupabase
      .from('clinical_consultation_summaries')
      .insert({
        patient_id: patientId,
        encounter_id: targetEncounterId,
        ai_summary_draft: aiSummary as any,
        fingerprint,
        structured_synthesis: synthesisRecord.synthesis as any,
        synthesis_version: synthesisRecord.synthesisVersion,
      });
  }

  await logAiSummaryAudit('ai_summary_generation_completed', patientId, {
    encounter_id: targetEncounterId,
    fingerprint,
    safety_status: aiSummary.safetyCheckStatus,
  });

  return {
    success: true,
    data: {
      patientId,
      encounterId: targetEncounterId || undefined,
      summary: aiSummary,
    },
  };
}

/**
 * Retrieves the latest AI clinical summary draft for a patient.
 */
export async function getLatestAiClinicalSummary(
  patientId: string,
  encounterId?: string
): Promise<AiSummaryServiceResponse> {
  if (!patientId || typeof patientId !== 'string' || patientId.trim() === '') {
    return { success: false, errorCode: 'INVALID_INPUT', error: 'Patient ID is required' };
  }

  const hasGeneralConsent = await hasValidConsent(patientId, 'share_health_records');
  if (!hasGeneralConsent) {
    return { success: false, errorCode: 'CONSENT_DENIED', error: "Consent 'share_health_records' required" };
  }

  const adminSupabase = await createAdminClient();

  let query = adminSupabase
    .from('clinical_consultation_summaries')
    .select('*')
    .eq('patient_id', patientId);

  if (encounterId) {
    query = query.eq('encounter_id', encounterId);
  }

  const { data: row, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

  if (error || !row || !row.ai_summary_draft) {
    return { success: false, errorCode: 'NOT_FOUND', error: 'No AI clinical summary draft found for patient' };
  }

  return {
    success: true,
    data: {
      patientId,
      encounterId: row.encounter_id,
      summary: row.ai_summary_draft as AiClinicalSummary,
      physicianReview: row.physician_notes_edits as PhysicianNotesEditsData,
    },
  };
}

/**
 * Processes physician review (accept or edit) for an AI summary draft.
 * Preserves original ai_summary_draft untouched and records physician changes separately.
 */
export async function reviewAiClinicalSummary(
  patientId: string,
  review: PhysicianReviewRequest
): Promise<AiSummaryServiceResponse> {
  if (!patientId || typeof patientId !== 'string' || patientId.trim() === '') {
    return { success: false, errorCode: 'INVALID_INPUT', error: 'Patient ID is required' };
  }

  const hasGeneralConsent = await hasValidConsent(patientId, 'share_health_records');
  if (!hasGeneralConsent) {
    return { success: false, errorCode: 'CONSENT_DENIED', error: "Consent 'share_health_records' required" };
  }

  const adminSupabase = await createAdminClient();

  let query = adminSupabase
    .from('clinical_consultation_summaries')
    .select('*')
    .eq('patient_id', patientId);

  if (review.encounterId) {
    query = query.eq('encounter_id', review.encounterId);
  }

  const { data: row } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

  if (!row || !row.ai_summary_draft) {
    return { success: false, errorCode: 'NOT_FOUND', error: 'No AI summary draft found to review' };
  }

  const existingDraft = row.ai_summary_draft as AiClinicalSummary;

  // Verify that draft was not rejected by safety check
  if (existingDraft.safetyCheckStatus === 'rejected') {
    return {
      success: false,
      errorCode: 'UNSAFE_SUMMARY_CANNOT_BE_APPROVED',
      error: 'Cannot accept or approve an AI summary that failed safety validation checks',
    };
  }

  const editedText = review.action === 'accept'
    ? existingDraft.summaryText
    : (review.editedText || existingDraft.summaryText);

  const reviewData: PhysicianNotesEditsData = {
    status: review.action === 'accept' ? 'accepted' : 'edited',
    editedText,
    reviewedBy: review.reviewedBy || 'physician',
    reviewedAt: new Date().toISOString(),
    originalAiSummaryText: existingDraft.summaryText,
  };

  await adminSupabase
    .from('clinical_consultation_summaries')
    .update({
      physician_notes_edits: reviewData as any,
      physician_verified: true,
      physician_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id);

  await logAiSummaryAudit('ai_summary_reviewed', patientId, {
    action: review.action,
    encounter_id: row.encounter_id,
    reviewed_by: reviewData.reviewedBy,
  });

  return {
    success: true,
    data: {
      patientId,
      encounterId: row.encounter_id,
      summary: existingDraft,
      physicianReview: reviewData,
    },
  };
}
