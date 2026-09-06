/**
 * Task #21 — Medical Information Extraction Service
 * MediKiosk Clinical Engine
 * 
 * Extracts structured medical facts with document provenance from OCR text and classification metadata.
 * Validates ownership, enforces server-side consent, attaches document/page provenance,
 * persists facts to document_extractions JSON and relational clinical tables idempotently,
 * and logs audit events.
 */

import { createClient } from '@/lib/supabase/server';
import { hasValidConsent } from '@/lib/consent/consent-service';
import { ocrDocument } from '../ocr/ocr-service';
import { classifyMedicalDocument } from '../classification/classification-service';
import {
  ExtractedMedicalFact,
  ExtractionProcessResult,
  MedicalExtractionInput,
  ProvenanceSource,
} from './types';
import { defaultMedicalExtractor } from './extractor';
import { normalizeAndValidateVitals } from '@/lib/clinical/vitals/vitals-service';

/**
 * Writes an entry to public.audit_logs for medical extraction events.
 */
export async function logExtractionAudit(
  action:
    | 'document_extraction_started'
    | 'document_extraction_completed'
    | 'document_extraction_failed',
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
    console.error('[Extraction Service] Failed to write audit log:', err);
  }
}

/**
 * Orchestrates medical information extraction from a medical document.
 */
export async function extractMedicalInformation(
  documentId: string,
  requestingPatientId?: string,
  options: { forceReextract?: boolean } = {}
): Promise<ExtractionProcessResult> {
  if (!documentId) {
    return {
      success: false,
      documentId: '',
      errorCode: 'INVALID_INPUT',
      error: 'documentId is required',
    };
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
      errorCode: 'NOT_FOUND',
      error: `Medical document not found: ${documentId}`,
    };
  }

  // 2. Validate Ownership / Cross-Patient Access
  if (requestingPatientId && doc.patient_id !== requestingPatientId) {
    return {
      success: false,
      documentId,
      errorCode: 'UNAUTHORIZED',
      error: `Cross-patient document extraction access denied. Document belongs to patient ${doc.patient_id}`,
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

  await logExtractionAudit('document_extraction_started', doc.patient_id, documentId, {
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

  // 5. Fetch or Trigger Document Classification (Task #20)
  let predictedDocType = doc.document_type;
  const existingClassification = (extraction?.extracted_json as any)?.classification;
  if (existingClassification?.predicted_document_type) {
    predictedDocType = existingClassification.predicted_document_type;
  } else {
    const classRes = await classifyMedicalDocument(documentId, requestingPatientId);
    if (classRes.success && classRes.result) {
      predictedDocType = classRes.result.predictedDocumentType;
    }
  }

  // Determine provenance source from document metadata
  let provenanceSource: ProvenanceSource = 'historical_document';
  if (doc.mime_type?.startsWith('image/')) {
    provenanceSource = 'scanned_paper';
  } else if (doc.file_name?.includes('ayurveda') || doc.file_name?.includes('external')) {
    provenanceSource = 'external_document';
  }

  // 6. Execute Medical Information Extractor
  const input: MedicalExtractionInput = {
    documentId,
    patientId: doc.patient_id,
    encounterId: doc.encounter_id,
    rawOcrText: rawText,
    documentType: predictedDocType,
    provenanceSource,
  };

  const result = await defaultMedicalExtractor.extract(input);

  // 7. Persist Extraction Result to document_extractions JSON
  if (extraction) {
    const existingJson = (extraction.extracted_json as Record<string, unknown>) || {};
    const updatedJson = {
      ...existingJson,
      clinical_extraction: {
        facts_detected: result.factsDetected,
        symptoms_count: result.symptomsCount,
        diagnoses_count: result.diagnosesCount,
        medication_candidates_count: result.medicationCandidatesCount,
        lab_candidates_count: result.labCandidatesCount,
        vitals_count: result.vitalsCount,
        ayush_count: result.ayushCount,
        status: result.status,
        extracted_at: result.extractedAt,
        facts: result.facts,
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

  // 8. Idempotently Sync Genuine Clinical Entities to Relational Tables
  // A. Symptoms -> clinical_symptoms
  const symptomFacts = result.facts.filter((f) => f.entityType === 'symptom');
  for (const sym of symptomFacts) {
    const { data: existingSym } = await supabase
      .from('clinical_symptoms')
      .select('id')
      .eq('encounter_id', doc.encounter_id)
      .eq('symptom_name', sym.concept)
      .maybeSingle();

    if (!existingSym) {
      await supabase.from('clinical_symptoms').insert({
        encounter_id: doc.encounter_id,
        patient_id: doc.patient_id,
        symptom_name: sym.concept,
        duration_text: sym.value ? sym.value.replace('Duration: ', '') : undefined,
        verification_status: 'unverified',
        provenance_source: provenanceSource,
        source_id: doc.source_id || doc.id,
      });
    }
  }

  // B. Diagnoses / Documented History -> clinical_diagnoses
  const diagFacts = result.facts.filter((f) => f.entityType === 'diagnosis_history');
  for (const diag of diagFacts) {
    const { data: existingDiag } = await supabase
      .from('clinical_diagnoses')
      .select('id')
      .eq('encounter_id', doc.encounter_id)
      .eq('diagnosis_name', diag.concept)
      .maybeSingle();

    if (!existingDiag) {
      await supabase.from('clinical_diagnoses').insert({
        encounter_id: doc.encounter_id,
        patient_id: doc.patient_id,
        diagnosis_name: diag.concept,
        diagnosis_type: diag.qualifier === 'clinician_assessment' ? 'working' : 'historical',
        verification_status: 'unverified',
        provenance_source: provenanceSource,
        source_id: doc.source_id || doc.id,
      });
    }
  }

  // C. Vitals -> clinical_vitals (Pass through Task #15 vitals service)
  const vitalFacts = result.facts.filter((f) => f.entityType === 'vital');
  for (const vital of vitalFacts) {
    if (vital.concept === 'Blood Pressure' && vital.value) {
      const bpMatch = vital.value.match(/(\d{2,3})\/(\d{2,3})/);
      if (bpMatch) {
        const sys = parseInt(bpMatch[1], 10);
        const dia = parseInt(bpMatch[2], 10);
        const norm = normalizeAndValidateVitals({
          systolicBp: sys,
          diastolicBp: dia,
          provenanceSource: 'historical_document',
          verificationStatus: 'unverified',
        });

        if (norm.valid) {
          const { data: existingVital } = await supabase
            .from('clinical_vitals')
            .select('id')
            .eq('encounter_id', doc.encounter_id)
            .eq('systolic_bp', sys)
            .eq('diastolic_bp', dia)
            .maybeSingle();

          if (!existingVital) {
            await supabase.from('clinical_vitals').insert({
              encounter_id: doc.encounter_id,
              patient_id: doc.patient_id,
              systolic_bp: sys,
              diastolic_bp: dia,
              verification_status: 'unverified',
              provenance_source: provenanceSource,
              source_id: doc.source_id || doc.id,
            });
          }
        }
      }
    }
  }

  // D. AYUSH Assessment -> clinical_ayush_assessments
  const ayushFacts = result.facts.filter((f) => f.entityType === 'ayush_assessment');
  if (ayushFacts.length > 0) {
    const { data: existingAyush } = await supabase
      .from('clinical_ayush_assessments')
      .select('id')
      .eq('encounter_id', doc.encounter_id)
      .maybeSingle();

    if (!existingAyush) {
      const prakritiFact = ayushFacts.find((f) => f.concept === 'Prakriti');
      const vikritiFact = ayushFacts.find((f) => f.concept === 'Vikriti');
      const agniFact = ayushFacts.find((f) => f.concept === 'Agni');
      const koshthaFact = ayushFacts.find((f) => f.concept === 'Koshtha');

      await supabase.from('clinical_ayush_assessments').insert({
        encounter_id: doc.encounter_id,
        patient_id: doc.patient_id,
        prakriti_dosha: prakritiFact?.value,
        vikriti_dosha: vikritiFact?.value,
        agni_type: agniFact?.value,
        koshtha_type: koshthaFact?.value,
        verification_status: 'unverified',
        provenance_source: provenanceSource,
        source_id: doc.source_id || doc.id,
      });
    }
  }

  await logExtractionAudit('document_extraction_completed', doc.patient_id, documentId, {
    facts_detected: result.factsDetected,
    symptoms_count: result.symptomsCount,
    diagnoses_count: result.diagnosesCount,
    medication_candidates_count: result.medicationCandidatesCount,
    lab_candidates_count: result.labCandidatesCount,
  });

  return {
    success: true,
    documentId,
    data: {
      documentId,
      factsDetected: result.factsDetected,
      symptoms: result.symptomsCount,
      diagnoses: result.diagnosesCount,
      medicationCandidates: result.medicationCandidatesCount,
      labCandidates: result.labCandidatesCount,
      vitals: result.vitalsCount,
      ayush: result.ayushCount,
      allergies: result.allergyCount,
      status: result.status,
      facts: result.facts,
    },
  };
}

/**
 * Retrieves existing document extraction result or triggers extraction if missing.
 */
export async function getDocumentMedicalInformation(
  documentId: string,
  requestingPatientId?: string
): Promise<ExtractionProcessResult> {
  const supabase = await createClient();

  const { data: extraction } = await supabase
    .from('document_extractions')
    .select('*')
    .eq('document_id', documentId)
    .maybeSingle();

  const extractionJson = (extraction?.extracted_json as any)?.clinical_extraction;

  if (extractionJson) {
    return {
      success: true,
      documentId,
      data: {
        documentId,
        factsDetected: extractionJson.facts_detected || 0,
        symptoms: extractionJson.symptoms_count || 0,
        diagnoses: extractionJson.diagnoses_count || 0,
        medicationCandidates: extractionJson.medication_candidates_count || 0,
        labCandidates: extractionJson.lab_candidates_count || 0,
        vitals: extractionJson.vitals_count || 0,
        ayush: extractionJson.ayush_count || 0,
        allergies: extractionJson.allergies_count || 0,
        status: extractionJson.status || 'completed',
        facts: extractionJson.facts || [],
      },
    };
  }

  return extractMedicalInformation(documentId, requestingPatientId);
}
