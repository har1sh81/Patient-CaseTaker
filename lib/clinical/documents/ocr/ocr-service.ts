/**
 * Task #17, #18 & #19 — Medical Document OCR Pipeline Service
 * MediKiosk Clinical Engine
 * 
 * Manages raw text extraction from PDFs, standard images, handwritten documents, and multilingual
 * documents (English, Tamil, Hindi) stored in Supabase Storage.
 * Handles OCR lifecycle (pending -> processing -> completed / failed), consent verification,
 * storage retrieval, DB persistence in public.document_extractions, retry/idempotency, audit logging,
 * and baseline vs handwritten OCR comparison.
 */

import { createClient } from '@/lib/supabase/server';
import { hasValidConsent } from '@/lib/consent/consent-service';
import {
  OcrOptions,
  OcrProcessResult,
  DocumentExtractionRecord,
} from './ocr-types';
import { defaultOcrProvider } from './local-ocr-provider';
import { handwrittenOcrProvider } from './handwritten-ocr-provider';
import { multilingualOcrProvider, normalizeLanguageCode } from './multilingual-ocr-provider';
import crypto from 'crypto';

const BUCKET_NAME = 'medical-documents';

/**
 * Writes an entry to public.audit_logs for OCR pipeline events.
 */
export async function logOcrAudit(
  action: 'document_ocr_started' | 'document_ocr_completed' | 'document_ocr_failed',
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
    console.error('[OCR Pipeline Audit] Failed to write audit log:', err);
  }
}

/**
 * Orchestrates OCR raw text extraction for a medical document.
 * Handles standard OCR (Task #17), handwritten image OCR (Task #18), and multilingual OCR (Task #19).
 * Enforces consent, updates OCR status lifecycle, extracts raw text in original script Unicode,
 * persists to public.document_extractions, and logs audit events.
 */
export async function ocrDocument(
  documentId: string,
  requestingPatientId?: string,
  options: OcrOptions = {}
): Promise<OcrProcessResult> {
  if (!documentId) {
    return {
      success: false,
      documentId: '',
      ocrStatus: 'failed',
      errorCode: 'INVALID_INPUT',
      error: 'documentId is required',
    };
  }

  // 0. Language Code Validation (Task #19)
  if (options.language) {
    const langCheck = normalizeLanguageCode(options.language);
    if (!langCheck.valid) {
      return {
        success: false,
        documentId,
        ocrStatus: 'failed',
        errorCode: 'OCR_FAILED',
        error: langCheck.error || 'UNSUPPORTED_OCR_LANGUAGE',
      };
    }
  }

  const supabase = await createClient();

  // 1. Fetch Medical Document Metadata
  const { data: doc, error: docErr } = await supabase
    .from('medical_documents')
    .select('*')
    .eq('id', documentId)
    .maybeSingle();

  if (docErr || !doc) {
    return {
      success: false,
      documentId,
      ocrStatus: 'failed',
      errorCode: 'NOT_FOUND',
      error: `Medical document not found: ${documentId}`,
    };
  }

  // 2. Validate Ownership / Cross-Patient Access
  if (requestingPatientId && doc.patient_id !== requestingPatientId) {
    return {
      success: false,
      documentId,
      ocrStatus: (doc.ocr_status as any) || 'failed',
      errorCode: 'UNAUTHORIZED',
      error: `Cross-patient document OCR access denied. Document belongs to patient ${doc.patient_id}`,
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
      ocrStatus: (doc.ocr_status as any) || 'failed',
      errorCode: 'CONSENT_DENIED',
      error: `Patient has not granted active consent for '${requiredPermission}'`,
    };
  }

  // 4. Idempotency Check: Return existing extraction if completed and forceRetry is not set
  if (doc.ocr_status === 'completed' && !options.forceRetry) {
    const { data: existingExt } = await supabase
      .from('document_extractions')
      .select('*')
      .eq('document_id', documentId)
      .maybeSingle();

    if (existingExt) {
      return {
        success: true,
        documentId,
        ocrStatus: 'completed',
        extraction: existingExt as DocumentExtractionRecord,
        rawText: existingExt.raw_ocr_text || undefined,
        provider: (existingExt.extracted_json as any)?.provider || 'unknown',
        extractionMethod: (existingExt.extracted_json as any)?.extraction_method || 'text_extraction',
        confidence: existingExt.confidence_score !== null ? Number(existingExt.confidence_score) : undefined,
        comparison: (existingExt.extracted_json as any)?.comparison || undefined,
      };
    }
  }

  // 5. Update OCR status to 'processing' & Log Start Audit
  await supabase
    .from('medical_documents')
    .update({ ocr_status: 'processing' })
    .eq('id', documentId);

  await logOcrAudit('document_ocr_started', doc.patient_id, documentId, {
    file_name: doc.file_name,
    mime_type: doc.mime_type,
    mode: options.mode || 'auto',
    language: options.language || 'en',
  });

  // 6. Download File from Supabase Storage
  let storageObjectPath = doc.storage_path;
  if (storageObjectPath.startsWith(`${BUCKET_NAME}/`)) {
    storageObjectPath = storageObjectPath.substring(`${BUCKET_NAME}/`.length);
  }

  const { data: fileData, error: downloadErr } = await supabase.storage
    .from(BUCKET_NAME)
    .download(storageObjectPath);

  if (downloadErr || !fileData) {
    console.error(`[OCR Pipeline] Failed to download document ${documentId} from storage:`, downloadErr?.message);
    await supabase.from('medical_documents').update({ ocr_status: 'failed' }).eq('id', documentId);
    await logOcrAudit('document_ocr_failed', doc.patient_id, documentId, { reason: downloadErr?.message });
    return {
      success: false,
      documentId,
      ocrStatus: 'failed',
      errorCode: 'STORAGE_ERROR',
      error: `Storage download failed: ${downloadErr?.message || 'File not found'}`,
    };
  }

  // 7. Perform OCR / Raw Text Extraction (Route to Standard vs Handwritten vs Multilingual Path)
  const isHandwrittenMode =
    options.mode === 'handwritten' ||
    doc.document_type === 'handwritten_prescription' ||
    doc.file_name?.toLowerCase().includes('handwritten');

  const isMultilingualMode =
    options.mode === 'multilingual' ||
    !!options.language ||
    doc.file_name?.toLowerCase().includes('ayurveda') ||
    doc.file_name?.toLowerCase().includes('tamil') ||
    doc.file_name?.toLowerCase().includes('hindi');

  let ocrResult;
  let comparisonPayload: any = undefined;

  try {
    const arrayBuf = await fileData.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuf);

    if (isHandwrittenMode) {
      // Task #18: Handwritten OCR
      const baselineRes = await defaultOcrProvider.extractText(fileBuffer, doc.mime_type, doc.file_name);
      const handwrittenRes = await handwrittenOcrProvider.extractText(fileBuffer, doc.mime_type, doc.file_name);

      ocrResult = {
        ...handwrittenRes,
        extractionMethod: 'handwritten_ocr' as const,
      };

      comparisonPayload = {
        baselineOutput: baselineRes.text,
        baselineConfidence: baselineRes.confidence,
        handwrittenOutput: handwrittenRes.text,
        handwrittenConfidence: handwrittenRes.confidence,
        preprocessingSteps: handwrittenRes.metadata?.preprocessing_steps || ['grayscale_conversion', 'contrast_enhancement', 'adaptive_thresholding'],
      };
    } else if (isMultilingualMode) {
      // Task #19: Multilingual OCR
      const targetLang = options.language || 'ta';
      ocrResult = await multilingualOcrProvider.extractText(fileBuffer, doc.mime_type, doc.file_name, targetLang);
    } else {
      // Task #17: Standard OCR
      ocrResult = await defaultOcrProvider.extractText(fileBuffer, doc.mime_type, doc.file_name);
    }
  } catch (ocrErr: any) {
    console.error(`[OCR Pipeline] Engine error processing document ${documentId}:`, ocrErr);
    await supabase.from('medical_documents').update({ ocr_status: 'failed' }).eq('id', documentId);
    await logOcrAudit('document_ocr_failed', doc.patient_id, documentId, { reason: ocrErr.message });
    return {
      success: false,
      documentId,
      ocrStatus: 'failed',
      errorCode: 'OCR_FAILED',
      error: `OCR processing failed: ${ocrErr.message}`,
    };
  }

  // 8. Store / Update Extraction Record in public.document_extractions
  const extractedJson = {
    provider: ocrResult.provider,
    extraction_method: ocrResult.extractionMethod,
    pages: ocrResult.pages,
    metadata: ocrResult.metadata || {},
    comparison: comparisonPayload,
    extracted_at: new Date().toISOString(),
  };

  const confidenceScore = ocrResult.confidence !== undefined ? ocrResult.confidence : null;

  // Check if extraction row already exists
  const { data: existingExtRow } = await supabase
    .from('document_extractions')
    .select('id')
    .eq('document_id', documentId)
    .maybeSingle();

  let savedExtractionRecord: DocumentExtractionRecord | null = null;

  if (existingExtRow) {
    // Update existing row
    const { data: updatedExt, error: updateErr } = await supabase
      .from('document_extractions')
      .update({
        raw_ocr_text: ocrResult.text,
        extracted_json: extractedJson,
        confidence_score: confidenceScore,
        processed_at: new Date().toISOString(),
      })
      .eq('id', existingExtRow.id)
      .select()
      .single();

    if (updateErr) {
      console.error(`[OCR Pipeline] Failed to update document_extractions row:`, updateErr.message);
      await supabase.from('medical_documents').update({ ocr_status: 'failed' }).eq('id', documentId);
      return {
        success: false,
        documentId,
        ocrStatus: 'failed',
        errorCode: 'DB_ERROR',
        error: `Database update failed: ${updateErr.message}`,
      };
    }
    savedExtractionRecord = updatedExt as DocumentExtractionRecord;
  } else {
    // Insert new extraction row
    const extractionId = crypto.randomUUID ? crypto.randomUUID() : `e${Date.now()}`;
    const { data: insertedExt, error: insertErr } = await supabase
      .from('document_extractions')
      .insert({
        id: extractionId,
        document_id: documentId,
        raw_ocr_text: ocrResult.text,
        extracted_json: extractedJson,
        confidence_score: confidenceScore,
        processed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) {
      console.error(`[OCR Pipeline] Failed to insert document_extractions row:`, insertErr.message);
      await supabase.from('medical_documents').update({ ocr_status: 'failed' }).eq('id', documentId);
      return {
        success: false,
        documentId,
        ocrStatus: 'failed',
        errorCode: 'DB_ERROR',
        error: `Database insertion failed: ${insertErr.message}`,
      };
    }
    savedExtractionRecord = insertedExt as DocumentExtractionRecord;
  }

  // 9. Update medical_documents.ocr_status to 'completed'
  await supabase
    .from('medical_documents')
    .update({ ocr_status: 'completed' })
    .eq('id', documentId);

  // 10. Write Audit Log
  await logOcrAudit('document_ocr_completed', doc.patient_id, documentId, {
    provider: ocrResult.provider,
    extraction_method: ocrResult.extractionMethod,
    page_count: ocrResult.pages.length,
    raw_text_length: ocrResult.text.length,
    mode: options.mode || 'auto',
    language: options.language || 'en',
  });

  return {
    success: true,
    documentId,
    ocrStatus: 'completed',
    extraction: savedExtractionRecord,
    rawText: ocrResult.text,
    pages: ocrResult.pages,
    provider: ocrResult.provider,
    extractionMethod: ocrResult.extractionMethod,
    confidence: ocrResult.confidence,
    comparison: comparisonPayload,
  };
}

/**
 * Fetches the current OCR extraction result for a document.
 */
export async function getDocumentOcr(
  documentId: string,
  requestingPatientId?: string
): Promise<OcrProcessResult> {
  const supabase = await createClient();

  const { data: doc, error: docErr } = await supabase
    .from('medical_documents')
    .select('*')
    .eq('id', documentId)
    .maybeSingle();

  if (docErr || !doc) {
    return {
      success: false,
      documentId,
      ocrStatus: 'failed',
      errorCode: 'NOT_FOUND',
      error: `Medical document not found: ${documentId}`,
    };
  }

  if (requestingPatientId && doc.patient_id !== requestingPatientId) {
    return {
      success: false,
      documentId,
      ocrStatus: doc.ocr_status || 'failed',
      errorCode: 'UNAUTHORIZED',
      error: `Cross-patient document access denied`,
    };
  }

  const isAyush = doc.document_type?.toLowerCase().includes('ayush') || doc.document_type?.toLowerCase().includes('ayurveda');
  const requiredPermission = isAyush ? 'share_ayush_records' : 'share_health_records';
  const consentGranted = await hasValidConsent(doc.patient_id, requiredPermission);

  if (!consentGranted) {
    return {
      success: false,
      documentId,
      ocrStatus: doc.ocr_status || 'failed',
      errorCode: 'CONSENT_DENIED',
      error: `Patient consent required to access OCR extraction`,
    };
  }

  const { data: extRow } = await supabase
    .from('document_extractions')
    .select('*')
    .eq('document_id', documentId)
    .maybeSingle();

  if (!extRow) {
    return {
      success: true,
      documentId,
      ocrStatus: doc.ocr_status || 'pending',
    };
  }

  return {
    success: true,
    documentId,
    ocrStatus: doc.ocr_status || 'completed',
    extraction: extRow as DocumentExtractionRecord,
    rawText: extRow.raw_ocr_text || undefined,
    provider: (extRow.extracted_json as any)?.provider || 'unknown',
    extractionMethod: (extRow.extracted_json as any)?.extraction_method || 'text_extraction',
    confidence: extRow.confidence_score !== null ? Number(extRow.confidence_score) : undefined,
    comparison: (extRow.extracted_json as any)?.comparison || undefined,
  };
}

/**
 * Triggers re-processing of OCR for a document (with optional mode & language).
 */
export async function retryDocumentOcr(
  documentId: string,
  requestingPatientId?: string,
  mode?: 'standard' | 'handwritten' | 'multilingual',
  language?: string
): Promise<OcrProcessResult> {
  return ocrDocument(documentId, requestingPatientId, { forceRetry: true, mode, language });
}
