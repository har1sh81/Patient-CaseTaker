/**
 * Task #24 — Reference Range Interpretation Service
 * MediKiosk Clinical Engine
 */

import { createClient } from '@/lib/supabase/server';
import { hasValidConsent } from '@/lib/consent/consent-service';
import { extractDocumentLabs } from './lab-service';
import { ExtractedLabResult } from './types';
import {
  InterpretationProcessResult,
  LabInterpretationInput,
  LabInterpretationResult,
  LabObservationInterpretation,
} from './interpretation-types';
import { interpretLabObservation } from './reference-range-engine';
import { ProvenanceSource } from '../../document-storage-types';

/**
 * Writes an entry to public.audit_logs for laboratory interpretation events.
 */
export async function logInterpretationAudit(
  action:
    | 'lab_interpretation_started'
    | 'lab_interpretation_completed'
    | 'lab_interpretation_failed',
  patientId: string,
  documentId: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from('audit_logs').insert({
      action,
      actor_type: 'patient',
      actor_id: patientId,
      metadata: {
        document_id: documentId,
        ...metadata,
      },
    });
  } catch (err) {
    console.error('[Interpretation Service] Failed to write audit log:', err);
  }
}

/**
 * Interpret laboratory observations for a document against explicit source reference ranges.
 */
export async function interpretDocumentLabs(
  documentId: string,
  requestingPatientId?: string,
  options: { forceReinterpret?: boolean } = {}
): Promise<InterpretationProcessResult> {
  if (!documentId) {
    return {
      success: false,
      documentId: '',
      errorCode: 'INVALID_INPUT',
      error: 'documentId is required',
    };
  }

  const supabase = await createClient();

  // 1. Fetch Document Record
  const { data: doc, error: docErr } = await supabase
    .from('medical_documents')
    .select('*')
    .eq('id', documentId)
    .maybeSingle();

  if (docErr || !doc) {
    return {
      success: false,
      documentId,
      errorCode: 'NOT_FOUND',
      error: `Medical document not found: ${documentId}`,
    };
  }

  // 2. Validate Patient Ownership / Cross-Patient Access
  if (requestingPatientId && doc.patient_id !== requestingPatientId) {
    return {
      success: false,
      documentId,
      errorCode: 'UNAUTHORIZED',
      error: `Cross-patient lab interpretation access denied. Document belongs to patient ${doc.patient_id}`,
    };
  }

  // 3. Enforce Server-Side Consent
  const isAyush =
    doc.document_type?.toLowerCase().includes('ayush') ||
    doc.document_type?.toLowerCase().includes('ayurveda');
  const requiredPermission = isAyush ? 'share_ayush_records' : 'share_health_records';

  const consentGranted = await hasValidConsent(doc.patient_id, requiredPermission);
  if (!consentGranted) {
    await logInterpretationAudit('lab_interpretation_failed', doc.patient_id, documentId, {
      reason: 'CONSENT_DENIED',
      requiredPermission,
    });
    return {
      success: false,
      documentId,
      errorCode: 'CONSENT_DENIED',
      error: `Patient has not granted active consent for '${requiredPermission}'`,
    };
  }

  await logInterpretationAudit('lab_interpretation_started', doc.patient_id, documentId, {
    file_name: doc.file_name,
    document_type: doc.document_type,
  });

  // 4. Fetch or Trigger Task #23 Lab Extractions
  let { data: extraction } = await supabase
    .from('document_extractions')
    .select('*')
    .eq('document_id', documentId)
    .maybeSingle();

  let labs: ExtractedLabResult[] = (extraction?.extracted_json as any)?.labs || [];

  if (!labs || labs.length === 0) {
    const labRes = await extractDocumentLabs(documentId, doc.patient_id);
    if (labRes.success && labRes.data?.labs) {
      labs = labRes.data.labs;
    }
  }

  if (!labs || labs.length === 0) {
    await logInterpretationAudit('lab_interpretation_failed', doc.patient_id, documentId, {
      reason: 'LABS_MISSING',
    });
    return {
      success: false,
      documentId,
      errorCode: 'LABS_MISSING',
      error: `No laboratory observations found in document '${documentId}'. Run lab extraction first.`,
    };
  }

  // 5. Evaluate each laboratory observation
  const interpretations: LabObservationInterpretation[] = [];
  const summary = {
    normal: 0,
    low: 0,
    high: 0,
    critical: 0,
    abnormal_unspecified: 0,
    unable_to_interpret: 0,
  };

  for (const lab of labs) {
    const interp = interpretLabObservation(lab);
    interpretations.push(interp);
    summary[interp.classification]++;
  }

  // 6. Update document_extractions JSON metadata with labInterpretations
  if (extraction) {
    const existingJson = (extraction.extracted_json as Record<string, unknown>) || {};
    const updatedJson = {
      ...existingJson,
      labInterpretations: interpretations,
      labInterpretationSummary: {
        interpretedAt: new Date().toISOString(),
        labsInterpreted: interpretations.length,
        summary,
      },
    };

    await supabase
      .from('document_extractions')
      .update({
        extracted_json: updatedJson,
        processed_at: new Date().toISOString(),
      })
      .eq('id', extraction.id);
  }

  await logInterpretationAudit('lab_interpretation_completed', doc.patient_id, documentId, {
    labs_interpreted: interpretations.length,
    summary,
  });

  return {
    success: true,
    documentId,
    data: {
      documentId,
      labsInterpreted: interpretations.length,
      summary,
      status: 'completed',
      interpretations,
    },
  };
}

/**
 * Retrieves existing lab interpretation result or triggers interpretation if missing.
 */
export async function getDocumentLabInterpretations(
  documentId: string,
  requestingPatientId?: string
): Promise<InterpretationProcessResult> {
  const supabase = await createClient();

  const { data: extraction } = await supabase
    .from('document_extractions')
    .select('*')
    .eq('document_id', documentId)
    .maybeSingle();

  const interps = (extraction?.extracted_json as any)?.labInterpretations as LabObservationInterpretation[];
  const meta = (extraction?.extracted_json as any)?.labInterpretationSummary;

  if (interps && meta) {
    return {
      success: true,
      documentId,
      data: {
        documentId,
        labsInterpreted: meta.labsInterpreted,
        summary: meta.summary,
        status: 'completed',
        interpretations: interps,
      },
    };
  }

  return interpretDocumentLabs(documentId, requestingPatientId);
}
