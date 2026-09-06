/**
 * Task #25 — Procedure & Surgery Extraction Service
 * MediKiosk Clinical Engine
 */

import { createClient } from '@/lib/supabase/server';
import { hasValidConsent } from '@/lib/consent/consent-service';
import { ocrDocument } from '../../ocr/ocr-service';
import {
  ExtractedProcedure,
  ProcedureExtractionInput,
  ProcedureExtractor,
  ProcedureProcessResult,
} from './types';
import { DefaultProcedureExtractor } from './procedure-parser';
import { ProvenanceSource } from '../../document-storage-types';

export const defaultProcedureExtractor = new DefaultProcedureExtractor();

/**
 * Writes an entry to public.audit_logs for procedure extraction events.
 */
export async function logProcedureAudit(
  action:
    | 'procedure_extraction_started'
    | 'procedure_extraction_completed'
    | 'procedure_extraction_failed',
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
    console.error('[Procedure Service] Failed to write audit log:', err);
  }
}

/**
 * Extract and normalize procedures/surgeries from a medical document.
 */
export async function extractDocumentProcedures(
  documentId: string,
  requestingPatientId?: string,
  options: { forceReextract?: boolean; customExtractor?: ProcedureExtractor } = {}
): Promise<ProcedureProcessResult> {
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
      error: `Cross-patient document procedure extraction access denied. Document belongs to patient ${doc.patient_id}`,
    };
  }

  // 3. Enforce Server-Side Consent
  const isAyush =
    doc.document_type?.toLowerCase().includes('ayush') ||
    doc.document_type?.toLowerCase().includes('ayurveda');
  const requiredPermission = isAyush ? 'share_ayush_records' : 'share_health_records';

  const consentGranted = await hasValidConsent(doc.patient_id, requiredPermission);
  if (!consentGranted) {
    await logProcedureAudit('procedure_extraction_failed', doc.patient_id, documentId, {
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

  await logProcedureAudit('procedure_extraction_started', doc.patient_id, documentId, {
    file_name: doc.file_name,
    document_type: doc.document_type,
  });

  // 4. Fetch or Trigger Document OCR Text
  let { data: extraction } = await supabase
    .from('document_extractions')
    .select('*')
    .eq('document_id', documentId)
    .maybeSingle();

  if (!extraction || !extraction.raw_ocr_text) {
    const ocrRes = await ocrDocument(documentId, requestingPatientId);
    if (ocrRes.success && ocrRes.extraction) {
      extraction = ocrRes.extraction as any;
    }
  }

  const rawText = (extraction?.raw_ocr_text && extraction.raw_ocr_text.trim().length > 0)
    ? extraction.raw_ocr_text
    : (doc.raw_text || doc.ocr_text || '');

  // 5. Retrieve Task #20 classification context if available
  let predictedDocType = doc.document_type;
  const existingClassification = (extraction?.extracted_json as any)?.classification;
  if (existingClassification?.predicted_document_type) {
    predictedDocType = existingClassification.predicted_document_type;
  }

  // Determine provenance source
  let provenanceSource: ProvenanceSource = 'historical_document';
  if (doc.mime_type?.startsWith('image/')) {
    provenanceSource = 'scanned_paper';
  } else if (doc.file_name?.includes('ayurveda') || doc.file_name?.includes('external')) {
    provenanceSource = 'external_document';
  }

  // Retrieve candidates from Task #21 if available
  let candidates: Array<{ sourceText?: string; pageNumber?: number; concept?: string; value?: string }> | undefined;
  const clinicalCandidates = (extraction?.extracted_json as any)?.clinicalCandidates;
  if (Array.isArray(clinicalCandidates)) {
    candidates = clinicalCandidates.filter(
      (c: any) => c.concept === 'procedure' || c.concept === 'surgery' || c.concept === 'procedure_candidate'
    );
  }

  // 6. Execute Procedure Extractor
  const input: ProcedureExtractionInput = {
    documentId,
    patientId: doc.patient_id,
    encounterId: doc.encounter_id,
    rawOcrText: rawText,
    documentType: predictedDocType,
    candidates,
    provenanceSource,
  };

  const extractorInstance = options.customExtractor || defaultProcedureExtractor;
  const result = await extractorInstance.extract(input);

  // 7. Persist Extraction Result to document_extractions JSON
  if (extraction) {
    const existingJson = (extraction.extracted_json as Record<string, unknown>) || {};
    const updatedJson = {
      ...existingJson,
      procedureExtraction: {
        procedures_detected: result.proceduresDetected,
        procedures_created: result.proceduresCreated,
        needs_review_count: result.needsReviewCount,
        uncertain_count: result.uncertainCount,
        status: result.status,
        extracted_at: result.extractedAt,
        procedures: result.procedures,
      },
      procedures: result.procedures,
    };

    if (extraction.id) {
      await supabase
        .from('document_extractions')
        .update({
          extracted_json: updatedJson,
          processed_at: new Date().toISOString(),
        })
        .eq('id', extraction.id);
    } else {
      await supabase
        .from('document_extractions')
        .update({
          extracted_json: updatedJson,
          processed_at: new Date().toISOString(),
        })
        .eq('document_id', documentId);
    }
  }

  // 8. Idempotently Sync Procedures into public.clinical_procedures Table
  let proceduresCreatedCount = 0;
  for (const proc of result.procedures) {
    const { data: existingProc } = await supabase
      .from('clinical_procedures')
      .select('id')
      .eq('encounter_id', doc.encounter_id)
      .eq('procedure_name', proc.procedureName)
      .eq('status', proc.status)
      .maybeSingle();

    if (!existingProc) {
      await supabase.from('clinical_procedures').insert({
        encounter_id: doc.encounter_id,
        patient_id: doc.patient_id,
        procedure_name: proc.procedureName,
        raw_procedure_name: proc.rawProcedureName,
        procedure_name_native: proc.procedureNameNative || null,
        normalized_procedure_name: proc.normalizedProcedureName || null,
        category: proc.category,
        status: proc.status,
        procedure_date: proc.procedureDate || null,
        indication_text: proc.indicationText || null,
        body_site: proc.bodySite || null,
        laterality: proc.laterality || null,
        provider_text: proc.providerText || null,
        facility_text: proc.facilityText || null,
        outcome_text: proc.outcomeText || null,
        needs_review: proc.needsReview,
        is_uncertain: proc.isUncertain,
        uncertainty_reason: proc.uncertaintyReason || null,
        provenance_source: provenanceSource,
        verification_status: 'unverified',
        source_id: doc.source_id || doc.id,
      });
      proceduresCreatedCount++;
    }
  }

  await logProcedureAudit('procedure_extraction_completed', doc.patient_id, documentId, {
    procedures_detected: result.proceduresDetected,
    procedures_created: proceduresCreatedCount,
    needs_review_count: result.needsReviewCount,
  });

  return {
    success: true,
    documentId,
    data: {
      documentId,
      proceduresDetected: result.proceduresDetected,
      proceduresCreated: proceduresCreatedCount,
      needsReview: result.needsReviewCount,
      status: result.status,
      procedures: result.procedures,
    },
  };
}

/**
 * Retrieves existing procedure extraction result or triggers extraction if missing.
 */
export async function getDocumentProcedures(
  documentId: string,
  requestingPatientId?: string
): Promise<ProcedureProcessResult> {
  const supabase = await createClient();

  const { data: extraction } = await supabase
    .from('document_extractions')
    .select('*')
    .eq('document_id', documentId)
    .maybeSingle();

  const procJson = (extraction?.extracted_json as any)?.procedureExtraction;

  if (procJson) {
    return {
      success: true,
      documentId,
      data: {
        documentId,
        proceduresDetected: procJson.procedures_detected,
        proceduresCreated: procJson.procedures_created,
        needsReview: procJson.needs_review_count,
        status: procJson.status,
        procedures: procJson.procedures,
      },
    };
  }

  return extractDocumentProcedures(documentId, requestingPatientId);
}
