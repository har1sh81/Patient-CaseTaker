/**
 * Task #23 — Laboratory Extraction & Normalization Service
 * MediKiosk Clinical Engine
 * 
 * Orchestrates specialized laboratory extraction, test name normalization,
 * persistence to public.clinical_lab_results, consent enforcement, audit logging,
 * and idempotency management.
 */

import { createClient } from '@/lib/supabase/server';
import { hasValidConsent } from '@/lib/consent/consent-service';
import { ocrDocument } from '../../ocr/ocr-service';
import {
  ExtractedLabResult,
  LabExtractionInput,
  LabProcessResult,
  LabExtractor,
} from './types';
import { DefaultLabExtractor } from './lab-parser';
import { ProvenanceSource } from '../../document-storage-types';

export const defaultLabExtractor = new DefaultLabExtractor();

/**
 * Writes an entry to public.audit_logs for laboratory extraction events.
 */
export async function logLabAudit(
  action:
    | 'lab_extraction_started'
    | 'lab_extraction_completed'
    | 'lab_extraction_failed',
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
    console.error('[Lab Service] Failed to write audit log:', err);
  }
}

/**
 * Extract and normalize laboratory results from a medical document.
 */
export async function extractDocumentLabs(
  documentId: string,
  requestingPatientId?: string,
  options: { forceReextract?: boolean; customExtractor?: LabExtractor } = {}
): Promise<LabProcessResult> {
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
      error: `Cross-patient document lab extraction access denied. Document belongs to patient ${doc.patient_id}`,
    };
  }

  // 3. Enforce Server-Side Consent
  const isAyush =
    doc.document_type?.toLowerCase().includes('ayush') ||
    doc.document_type?.toLowerCase().includes('ayurveda');
  const requiredPermission = isAyush ? 'share_ayush_records' : 'share_health_records';

  const consentGranted = await hasValidConsent(doc.patient_id, requiredPermission);
  if (!consentGranted) {
    await logLabAudit('lab_extraction_failed', doc.patient_id, documentId, {
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

  await logLabAudit('lab_extraction_started', doc.patient_id, documentId, {
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

  const rawText = extraction?.raw_ocr_text || '';

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
      (c: any) => c.concept === 'laboratory' || c.concept === 'lab' || c.concept === 'lab_result'
    );
  }

  // 6. Execute Laboratory Extractor
  const input: LabExtractionInput = {
    documentId,
    patientId: doc.patient_id,
    encounterId: doc.encounter_id,
    rawOcrText: rawText,
    documentType: predictedDocType,
    candidates,
    provenanceSource,
  };

  const extractorInstance = options.customExtractor || defaultLabExtractor;
  const result = await extractorInstance.extract(input);

  // 7. Persist Extraction Result to document_extractions JSON
  if (extraction) {
    const existingJson = (extraction.extracted_json as Record<string, unknown>) || {};
    const updatedJson = {
      ...existingJson,
      lab_extraction: {
        labs_detected: result.labsDetected,
        labs_created: result.labsCreated,
        needs_review_count: result.needsReviewCount,
        uncertain_count: result.uncertainCount,
        status: result.status,
        extracted_at: result.extractedAt,
        labs: result.labs,
      },
      labs: result.labs,
    };

    await supabase
      .from('document_extractions')
      .update({
        extracted_json: updatedJson,
        processed_at: new Date().toISOString(),
      })
      .eq('id', extraction.id);
  }

  // 8. Idempotently Sync Labs into public.clinical_lab_results Table
  let labsCreatedCount = 0;
  for (const lab of result.labs) {
    const { data: existingLab } = await supabase
      .from('clinical_lab_results')
      .select('id')
      .eq('encounter_id', doc.encounter_id)
      .eq('test_name', lab.canonicalTestName)
      .eq('result_value', lab.resultValue)
      .maybeSingle();

    if (!existingLab) {
      await supabase.from('clinical_lab_results').insert({
        encounter_id: doc.encounter_id,
        patient_id: doc.patient_id,
        test_name: lab.canonicalTestName,
        result_value: lab.resultValue,
        unit: lab.unit || null,
        reference_range: lab.referenceRange || null,
        abnormal_flag: lab.abnormalFlag || false,
        specimen_date: lab.specimenDate || null,
        provenance_source: provenanceSource,
        verification_status: 'unverified',
        source_id: doc.source_id || doc.id,
      });
      labsCreatedCount++;
    }
  }

  await logLabAudit('lab_extraction_completed', doc.patient_id, documentId, {
    labs_detected: result.labsDetected,
    labs_created: labsCreatedCount,
    needs_review_count: result.needsReviewCount,
  });

  return {
    success: true,
    documentId,
    data: {
      documentId,
      labsDetected: result.labsDetected,
      labsCreated: labsCreatedCount,
      needsReview: result.needsReviewCount,
      status: result.status,
      labs: result.labs,
    },
  };
}

/**
 * Retrieves existing lab extraction result or triggers extraction if missing.
 */
export async function getDocumentLabs(
  documentId: string,
  requestingPatientId?: string
): Promise<LabProcessResult> {
  const supabase = await createClient();

  const { data: extraction } = await supabase
    .from('document_extractions')
    .select('*')
    .eq('document_id', documentId)
    .maybeSingle();

  const labJson = (extraction?.extracted_json as any)?.lab_extraction;

  if (labJson) {
    return {
      success: true,
      documentId,
      data: {
        documentId,
        labsDetected: labJson.labs_detected,
        labsCreated: labJson.labs_created,
        needsReview: labJson.needs_review_count,
        status: labJson.status,
        labs: labJson.labs,
      },
    };
  }

  return extractDocumentLabs(documentId, requestingPatientId);
}
