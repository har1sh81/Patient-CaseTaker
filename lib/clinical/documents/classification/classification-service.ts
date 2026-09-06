/**
 * Task #20 — Medical Document Classification Service
 * MediKiosk Clinical Engine
 * 
 * Manages document category determination from OCR text and metadata.
 * Validates patient ownership, enforces server-side consent, retrieves OCR text,
 * executes classification, updates extraction metadata without overwriting manual document_type,
 * and logs audit events.
 */

import { createClient } from '@/lib/supabase/server';
import { hasValidConsent } from '@/lib/consent/consent-service';
import { ocrDocument } from '../ocr/ocr-service';
import {
  ClassificationInput,
  ClassificationProcessResult,
  DocumentClassificationResult,
  normalizeDocumentType,
} from './types';
import { defaultClassifier } from './classifier';

/**
 * Writes an entry to public.audit_logs for document classification events.
 */
export async function logClassificationAudit(
  action:
    | 'document_classification_started'
    | 'document_classification_completed'
    | 'document_classification_failed',
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
    console.error('[Classification Service] Failed to write audit log:', err);
  }
}

/**
 * Classifies a medical document given its ID and optional requesting patient context.
 */
export async function classifyMedicalDocument(
  documentId: string,
  requestingPatientId?: string,
  options: { forceReclassify?: boolean } = {}
): Promise<ClassificationProcessResult> {
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
      error: `Cross-patient document classification access denied. Document belongs to patient ${doc.patient_id}`,
    };
  }

  // 3. Enforce Server-Side Consent
  const isAyush =
    doc.document_type?.toLowerCase().includes('ayush') ||
    doc.document_type?.toLowerCase().includes('ayurveda');
  const requiredPermission = isAyush ? 'share_ayush_records' : 'share_health_records';

  const consentGranted = await hasValidConsent(doc.patient_id, requiredPermission);
  if (!consentGranted) {
    return {
      success: false,
      documentId,
      errorCode: 'CONSENT_DENIED',
      error: `Patient has not granted active consent for '${requiredPermission}'`,
    };
  }

  await logClassificationAudit('document_classification_started', doc.patient_id, documentId, {
    file_name: doc.file_name,
    manual_document_type: doc.document_type,
  });

  // 4. Fetch or Trigger Document OCR Text
  let { data: extraction } = await supabase
    .from('document_extractions')
    .select('*')
    .eq('document_id', documentId)
    .maybeSingle();

  if (!extraction || !extraction.raw_ocr_text) {
    // Attempt auto-OCR if not yet processed
    const ocrRes = await ocrDocument(documentId, requestingPatientId);
    if (ocrRes.success && ocrRes.extraction) {
      extraction = ocrRes.extraction as any;
    }
  }

  const rawText = extraction?.raw_ocr_text || '';

  // 5. Run Classification Engine
  const input: ClassificationInput = {
    documentId,
    rawOcrText: rawText,
    fileName: doc.file_name,
    mimeType: doc.mime_type,
    storagePath: doc.storage_path,
    manualDocumentType: doc.document_type,
    metadata: (extraction?.extracted_json as any)?.metadata || {},
  };

  const result = await defaultClassifier.classify(input);

  // 6. Update document_extractions JSON metadata with classification result without modifying doc.document_type
  if (extraction) {
    const existingJson = (extraction.extracted_json as Record<string, unknown>) || {};
    const updatedJson = {
      ...existingJson,
      classification: {
        predicted_document_type: result.predictedDocumentType,
        confidence: result.confidence,
        method: result.method,
        classifier_version: result.classifierVersion,
        evidence: result.evidence,
        matched_keywords: result.matchedKeywords,
        needs_review: result.needsReview,
        manual_document_type: doc.document_type,
        matches_manual_type: result.matchesManualType,
        classified_at: result.classifiedAt,
      },
    };

    const { error: updateErr } = await supabase
      .from('document_extractions')
      .update({
        extracted_json: updatedJson,
        processed_at: new Date().toISOString(),
      })
      .eq('id', extraction.id);

    if (updateErr) {
      console.error('[Classification Service] Failed to persist classification metadata:', updateErr);
    }
  }

  await logClassificationAudit('document_classification_completed', doc.patient_id, documentId, {
    predicted_document_type: result.predictedDocumentType,
    confidence: result.confidence,
    method: result.method,
    evidence_count: result.evidence.length,
    matches_manual_type: result.matchesManualType,
  });

  return {
    success: true,
    documentId,
    result,
  };
}

/**
 * Retrieves existing classification prediction for a document or runs classification if missing.
 */
export async function getDocumentClassification(
  documentId: string,
  requestingPatientId?: string
): Promise<ClassificationProcessResult> {
  const supabase = await createClient();

  const { data: extraction } = await supabase
    .from('document_extractions')
    .select('*')
    .eq('document_id', documentId)
    .maybeSingle();

  const classData = (extraction?.extracted_json as any)?.classification;

  if (classData) {
    const result: DocumentClassificationResult = {
      predictedDocumentType: classData.predicted_document_type,
      confidence: classData.confidence,
      method: classData.method,
      classifierVersion: classData.classifier_version,
      evidence: classData.evidence || [],
      matchedKeywords: classData.matched_keywords || [],
      needsReview: !!classData.needs_review,
      manualDocumentType: classData.manual_document_type,
      matchesManualType: classData.matches_manual_type,
      classifiedAt: classData.classified_at || new Date().toISOString(),
    };

    return {
      success: true,
      documentId,
      result,
    };
  }

  return classifyMedicalDocument(documentId, requestingPatientId);
}
