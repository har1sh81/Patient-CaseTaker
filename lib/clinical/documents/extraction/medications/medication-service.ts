/**
 * Task #22 — Medication Extraction & Normalization Service
 * MediKiosk Clinical Engine
 * 
 * Orchestrates specialized medication extraction, abbreviation normalization,
 * persistence to public.clinical_medications, consent enforcement, audit logging,
 * and idempotency management.
 */

import { createClient } from '@/lib/supabase/server';
import { hasValidConsent } from '@/lib/consent/consent-service';
import { ocrDocument } from '../../ocr/ocr-service';
import { classifyMedicalDocument } from '../../classification/classification-service';
import {
  ExtractedMedicationRecord,
  MedicationExtractionInput,
  MedicationProcessResult,
} from './types';
import { defaultMedicationExtractor } from './medication-parser';
import { ProvenanceSource } from '../../document-storage-types';

/**
 * Writes an entry to public.audit_logs for medication extraction events.
 */
export async function logMedicationAudit(
  action:
    | 'medication_extraction_started'
    | 'medication_extraction_completed'
    | 'medication_extraction_failed',
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
    console.error('[Medication Service] Failed to write audit log:', err);
  }
}

/**
 * Extract and normalize medications from a medical document.
 */
export async function extractDocumentMedications(
  documentId: string,
  requestingPatientId?: string,
  options: { forceReextract?: boolean } = {}
): Promise<MedicationProcessResult> {
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
      error: `Cross-patient document medication extraction access denied. Document belongs to patient ${doc.patient_id}`,
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

  await logMedicationAudit('medication_extraction_started', doc.patient_id, documentId, {
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

  // 6. Execute Medication Extractor
  const input: MedicationExtractionInput = {
    documentId,
    patientId: doc.patient_id,
    encounterId: doc.encounter_id,
    rawOcrText: rawText,
    documentType: predictedDocType,
    provenanceSource,
  };

  const result = await defaultMedicationExtractor.extract(input);

  // 7. Persist Extraction Result to document_extractions JSON
  if (extraction) {
    const existingJson = (extraction.extracted_json as Record<string, unknown>) || {};
    const updatedJson = {
      ...existingJson,
      medication_extraction: {
        medications_detected: result.medicationsDetected,
        medications_created: result.medicationsCreated,
        needs_review_count: result.needsReviewCount,
        uncertain_count: result.uncertainCount,
        status: result.status,
        extracted_at: result.extractedAt,
        medications: result.medications,
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

  // 8. Idempotently Sync Medications into public.clinical_medications Table
  for (const med of result.medications) {
    const { data: existingMed } = await supabase
      .from('clinical_medications')
      .select('id')
      .eq('encounter_id', doc.encounter_id)
      .eq('medication_name', med.medicationName)
      .maybeSingle();

    if (!existingMed) {
      await supabase.from('clinical_medications').insert({
        encounter_id: doc.encounter_id,
        patient_id: doc.patient_id,
        medication_name: med.medicationName,
        medication_name_native: med.rawMedicationName !== med.medicationName ? med.rawMedicationName : undefined,
        dosage: med.dosage,
        frequency: med.normalizedFrequency || med.frequency,
        route: med.route,
        status: med.status,
        provenance_source: provenanceSource,
        verification_status: 'unverified',
        source_id: doc.source_id || doc.id,
      });
    }
  }

  await logMedicationAudit('medication_extraction_completed', doc.patient_id, documentId, {
    medications_detected: result.medicationsDetected,
    medications_created: result.medicationsCreated,
    needs_review_count: result.needsReviewCount,
  });

  return {
    success: true,
    documentId,
    data: {
      documentId,
      medicationsDetected: result.medicationsDetected,
      medicationsCreated: result.medicationsCreated,
      needsReview: result.needsReviewCount,
      status: result.status,
      medications: result.medications,
    },
  };
}

/**
 * Retrieves existing medication extraction result or triggers extraction if missing.
 */
export async function getDocumentMedications(
  documentId: string,
  requestingPatientId?: string
): Promise<MedicationProcessResult> {
  const supabase = await createClient();

  const { data: extraction } = await supabase
    .from('document_extractions')
    .select('*')
    .eq('document_id', documentId)
    .maybeSingle();

  const medJson = (extraction?.extracted_json as any)?.medication_extraction;

  if (medJson) {
    return {
      success: true,
      documentId,
      data: {
        documentId,
        medicationsDetected: medJson.medications_detected || 0,
        medicationsCreated: medJson.medications_created || 0,
        needsReview: medJson.needs_review_count || 0,
        status: medJson.status || 'completed',
        medications: medJson.medications || [],
      },
    };
  }

  return extractDocumentMedications(documentId, requestingPatientId);
}
