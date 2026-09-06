/**
 * Task #26 — Clinical Timeline Builder
 * MediKiosk Clinical Engine
 *
 * Transforms raw database rows from 12 tables into standardized TimelineEvent objects.
 */

import { EventDatePrecision, TimelineEvent, TimelineEventType } from './types';
import type { ProvenanceSource, VerificationStatus } from '../documents/document-storage-types';

/**
 * Normalizes date string into YYYY-MM-DD or YYYY format and determines date precision.
 */
export function normalizeEventDate(
  rawDate?: string | null,
  fallbackEncounterDate?: string | null
): { eventDate?: string; eventDatePrecision: EventDatePrecision; eventDateSource: string } {
  if (rawDate && typeof rawDate === 'string' && rawDate.trim().length > 0) {
    const trimmed = rawDate.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return {
        eventDate: trimmed.slice(0, 10),
        eventDatePrecision: 'day',
        eventDateSource: 'explicit_date',
      };
    }
    if (/^\d{4}-\d{2}$/.test(trimmed)) {
      return {
        eventDate: trimmed,
        eventDatePrecision: 'month',
        eventDateSource: 'explicit_date',
      };
    }
    if (/^\d{4}$/.test(trimmed)) {
      return {
        eventDate: trimmed,
        eventDatePrecision: 'year',
        eventDateSource: 'explicit_date',
      };
    }
    // Try Date parsing for strings like "12 Apr 2025" or ISO strings
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return {
        eventDate: parsed.toISOString().slice(0, 10),
        eventDatePrecision: 'day',
        eventDateSource: 'explicit_date',
      };
    }
  }

  if (fallbackEncounterDate && typeof fallbackEncounterDate === 'string' && fallbackEncounterDate.trim().length > 0) {
    const trimmed = fallbackEncounterDate.trim();
    return {
      eventDate: trimmed.slice(0, 10),
      eventDatePrecision: 'encounter',
      eventDateSource: 'encounter',
    };
  }

  return {
    eventDate: undefined,
    eventDatePrecision: 'unknown',
    eventDateSource: 'unknown',
  };
}

/**
 * Maps public.encounters row into TimelineEvent.
 */
export function buildEncounterEvent(row: Record<string, any>): TimelineEvent {
  const dateInfo = normalizeEventDate(row.started_at || row.created_at || row.date);
  return {
    id: `tl_enc_${row.id}`,
    patientId: row.patient_id,
    encounterId: row.id,
    eventDate: dateInfo.eventDate,
    eventDatePrecision: dateInfo.eventDatePrecision,
    eventDateSource: dateInfo.eventDateSource,
    eventType: 'encounter',
    title: row.title || row.reason_for_visit || row.department ? `${row.department || 'Clinical'} Encounter` : 'Medical Encounter',
    summary: row.summary || row.reason_for_visit || row.chief_complaint || 'Encounter record',
    sourceType: 'encounter',
    sourceId: String(row.id),
    verificationStatus: 'verified',
    provenanceSource: 'historical_document',
    importance: 'medium',
    details: { department: row.department, status: row.status },
    metadata: { createdAt: row.created_at },
  };
}

/**
 * Maps public.clinical_symptoms row into TimelineEvent.
 */
export function buildSymptomEvent(row: Record<string, any>, encounterDate?: string): TimelineEvent {
  const dateInfo = normalizeEventDate(row.onset_date || row.recorded_at || row.created_at, encounterDate);
  const severityStr = row.severity ? ` (${row.severity})` : '';
  const durationStr = row.onset_duration || row.duration ? ` — ${row.onset_duration || row.duration}` : '';
  return {
    id: `tl_sym_${row.id}`,
    patientId: row.patient_id,
    encounterId: row.encounter_id,
    eventDate: dateInfo.eventDate,
    eventDatePrecision: dateInfo.eventDatePrecision,
    eventDateSource: dateInfo.eventDateSource,
    eventType: 'symptom',
    title: row.symptom_name || row.name || 'Symptom',
    summary: `${row.symptom_name || row.name || 'Symptom'}${severityStr}${durationStr}`,
    sourceType: 'symptom',
    sourceId: String(row.id),
    sourceDocumentId: row.source_id || row.document_id,
    pageNumber: row.page_number,
    sourceText: row.source_text,
    verificationStatus: (row.verification_status as VerificationStatus) || 'unverified',
    provenanceSource: row.provenance_source || 'patient_reported',
    importance: row.severity === 'severe' ? 'high' : 'medium',
    details: { bodySite: row.body_site, severity: row.severity, duration: row.onset_duration },
    metadata: { createdAt: row.created_at },
  };
}

/**
 * Maps public.clinical_vitals row into TimelineEvent.
 */
export function buildVitalEvent(row: Record<string, any>, encounterDate?: string): TimelineEvent {
  const dateInfo = normalizeEventDate(row.recorded_at || row.vital_date || row.created_at, encounterDate);
  let summary = '';
  if (row.vital_name && row.vital_value) {
    summary = `${row.vital_name}: ${row.vital_value} ${row.unit || ''}`.trim();
  } else if (row.systolic && row.diastolic) {
    summary = `BP: ${row.systolic}/${row.diastolic} mmHg`;
  } else if (row.heart_rate) {
    summary = `Heart Rate: ${row.heart_rate} bpm`;
  } else if (row.spo2) {
    summary = `SpO2: ${row.spo2}%`;
  } else {
    summary = row.summary || 'Vital Observation';
  }

  return {
    id: `tl_vit_${row.id}`,
    patientId: row.patient_id,
    encounterId: row.encounter_id,
    eventDate: dateInfo.eventDate,
    eventDatePrecision: dateInfo.eventDatePrecision,
    eventDateSource: dateInfo.eventDateSource,
    eventType: 'vital',
    title: row.vital_name || 'Vital Observation',
    summary,
    sourceType: 'vital',
    sourceId: String(row.id),
    sourceDocumentId: row.source_id || row.document_id,
    pageNumber: row.page_number,
    sourceText: row.source_text,
    verificationStatus: (row.verification_status as VerificationStatus) || 'unverified',
    provenanceSource: row.provenance_source || 'patient_reported',
    importance: 'medium',
    details: { unit: row.unit, rawValue: row.vital_value },
    metadata: { createdAt: row.created_at },
  };
}

/**
 * Maps public.clinical_medications row into TimelineEvent.
 */
export function buildMedicationEvent(row: Record<string, any>, encounterDate?: string): TimelineEvent {
  const dateInfo = normalizeEventDate(row.start_date || row.prescribed_date || row.documented_date || row.created_at, encounterDate);
  const doseStr = row.dose || row.dosage ? ` ${row.dose || row.dosage}` : '';
  const freqStr = row.frequency ? ` ${row.frequency}` : '';
  const statusStr = row.status ? ` — ${row.status}` : '';
  const title = row.medication_name || row.name || 'Medication';

  return {
    id: `tl_med_${row.id}`,
    patientId: row.patient_id,
    encounterId: row.encounter_id,
    eventDate: dateInfo.eventDate,
    eventDatePrecision: dateInfo.eventDatePrecision,
    eventDateSource: dateInfo.eventDateSource,
    eventType: 'medication',
    title,
    summary: `${title}${doseStr}${freqStr}${statusStr}`.trim(),
    sourceType: 'medication',
    sourceId: String(row.id),
    sourceDocumentId: row.source_id || row.document_id,
    pageNumber: row.page_number,
    sourceText: row.source_text,
    verificationStatus: (row.verification_status as VerificationStatus) || 'unverified',
    provenanceSource: row.provenance_source || 'historical_document',
    importance: 'medium',
    details: { dose: row.dose, frequency: row.frequency, status: row.status, route: row.route },
    metadata: { createdAt: row.created_at },
  };
}

/**
 * Maps public.clinical_lab_results row into TimelineEvent.
 */
export function buildLabEvent(row: Record<string, any>, encounterDate?: string): TimelineEvent {
  const dateInfo = normalizeEventDate(row.specimen_date || row.result_date || row.test_date || row.created_at, encounterDate);
  const testName = row.test_name || row.lab_test || 'Laboratory Observation';
  const valStr = row.result_value || row.numeric_value !== undefined ? String(row.result_value ?? row.numeric_value) : '';
  const unitStr = row.unit ? ` ${row.unit}` : '';
  const interpStr = row.interpretation || row.calculated_classification ? ` — ${row.interpretation || row.calculated_classification}` : '';
  
  return {
    id: `tl_lab_${row.id}`,
    patientId: row.patient_id,
    encounterId: row.encounter_id,
    eventDate: dateInfo.eventDate,
    eventDatePrecision: dateInfo.eventDatePrecision,
    eventDateSource: dateInfo.eventDateSource,
    eventType: 'lab',
    title: testName,
    summary: `${testName}: ${valStr}${unitStr}${interpStr}`.trim(),
    sourceType: 'lab',
    sourceId: String(row.id),
    sourceDocumentId: row.source_id || row.document_id,
    pageNumber: row.page_number,
    sourceText: row.source_text,
    verificationStatus: (row.verification_status as VerificationStatus) || 'unverified',
    provenanceSource: row.provenance_source || 'historical_document',
    importance: row.interpretation === 'critical' || row.calculated_classification === 'critical' ? 'critical' : 'medium',
    details: { resultValue: row.result_value, unit: row.unit, referenceRange: row.reference_range, interpretation: row.interpretation },
    metadata: { createdAt: row.created_at },
  };
}

/**
 * Maps public.clinical_diagnoses row into TimelineEvent.
 */
export function buildDiagnosisEvent(row: Record<string, any>, encounterDate?: string): TimelineEvent {
  const dateInfo = normalizeEventDate(row.diagnosed_date || row.onset_date || row.created_at, encounterDate);
  const diagName = row.diagnosis_name || row.condition_name || 'Diagnosis';
  const statusStr = row.verification_status ? ` — ${row.verification_status}` : '';

  return {
    id: `tl_diag_${row.id}`,
    patientId: row.patient_id,
    encounterId: row.encounter_id,
    eventDate: dateInfo.eventDate,
    eventDatePrecision: dateInfo.eventDatePrecision,
    eventDateSource: dateInfo.eventDateSource,
    eventType: 'diagnosis',
    title: diagName,
    summary: `${diagName}${statusStr}`,
    sourceType: 'diagnosis',
    sourceId: String(row.id),
    sourceDocumentId: row.source_id || row.document_id,
    pageNumber: row.page_number,
    sourceText: row.source_text,
    verificationStatus: (row.verification_status as VerificationStatus) || 'unverified',
    provenanceSource: row.provenance_source || 'historical_document',
    importance: 'high',
    details: { icd10: row.icd10_code, category: row.category, verificationStatus: row.verification_status },
    metadata: { createdAt: row.created_at },
  };
}

/**
 * Maps public.clinical_procedures row into TimelineEvent.
 */
export function buildProcedureEvent(row: Record<string, any>, encounterDate?: string): TimelineEvent {
  const dateInfo = normalizeEventDate(row.procedure_date || row.created_at, encounterDate);
  const procName = row.procedure_name || 'Procedure';
  const statusStr = row.status ? ` — ${row.status}` : '';
  const siteStr = row.body_site || row.laterality ? ` (${[row.laterality, row.body_site].filter(Boolean).join(' ')})` : '';

  return {
    id: `tl_proc_${row.id}`,
    patientId: row.patient_id,
    encounterId: row.encounter_id,
    eventDate: dateInfo.eventDate,
    eventDatePrecision: dateInfo.eventDatePrecision,
    eventDateSource: dateInfo.eventDateSource,
    eventType: 'procedure',
    title: procName,
    summary: `${procName}${siteStr}${statusStr}`.trim(),
    sourceType: 'procedure',
    sourceId: String(row.id),
    sourceDocumentId: row.source_id || row.document_id,
    pageNumber: row.page_number,
    sourceText: row.source_text,
    verificationStatus: (row.verification_status as VerificationStatus) || 'unverified',
    provenanceSource: row.provenance_source || 'historical_document',
    importance: row.category === 'surgery' ? 'high' : 'medium',
    details: { category: row.category, status: row.status, bodySite: row.body_site, laterality: row.laterality },
    metadata: { createdAt: row.created_at },
  };
}

/**
 * Maps public.medical_documents row into TimelineEvent.
 */
export function buildDocumentEvent(row: Record<string, any>): TimelineEvent {
  const dateInfo = normalizeEventDate(row.document_date || row.created_at);
  const docTypeStr = row.document_type ? row.document_type.replace(/_/g, ' ') : 'Medical Document';
  const fileName = row.file_name || 'Document';

  return {
    id: `tl_doc_${row.id}`,
    patientId: row.patient_id,
    encounterId: row.encounter_id,
    eventDate: dateInfo.eventDate,
    eventDatePrecision: dateInfo.eventDatePrecision,
    eventDateSource: dateInfo.eventDateSource,
    eventType: 'document',
    title: `${docTypeStr} (${fileName})`,
    summary: `Document type: ${docTypeStr} — status: ${row.upload_status || 'uploaded'}`,
    sourceType: 'document',
    sourceId: String(row.id),
    sourceDocumentId: row.id,
    verificationStatus: 'unverified',
    provenanceSource: 'scanned_paper',
    importance: 'medium',
    details: { documentType: row.document_type, mimeType: row.mime_type },
    metadata: { createdAt: row.created_at },
  };
}

/**
 * Maps public.clinical_ayush_assessments row into TimelineEvent.
 */
export function buildAyushEvent(row: Record<string, any>, encounterDate?: string): TimelineEvent {
  const dateInfo = normalizeEventDate(row.assessment_date || row.created_at, encounterDate);
  const typeStr = row.assessment_type || 'AYUSH Assessment';
  const prakritiStr = row.prakriti ? ` — Prakriti: ${row.prakriti}` : '';

  return {
    id: `tl_ayush_${row.id}`,
    patientId: row.patient_id,
    encounterId: row.encounter_id,
    eventDate: dateInfo.eventDate,
    eventDatePrecision: dateInfo.eventDatePrecision,
    eventDateSource: dateInfo.eventDateSource,
    eventType: 'ayush_assessment',
    title: typeStr,
    summary: `${typeStr}${prakritiStr}`.trim(),
    sourceType: 'ayush_assessment',
    sourceId: String(row.id),
    sourceDocumentId: row.source_id || row.document_id,
    verificationStatus: (row.verification_status as VerificationStatus) || 'unverified',
    provenanceSource: row.provenance_source || 'patient_reported',
    importance: 'medium',
    details: { assessmentType: row.assessment_type, prakriti: row.prakriti, agni: row.agni, koshtha: row.koshtha },
    metadata: { createdAt: row.created_at },
  };
}

/**
 * Maps public.attention_flags row into TimelineEvent.
 */
export function buildAttentionFlagEvent(row: Record<string, any>, patientId?: string, encounterDate?: string): TimelineEvent {
  const dateInfo = normalizeEventDate(row.flagged_at || row.created_at || row.generated_at, encounterDate);
  const title = row.flag_label || row.label || row.flag_title || row.category || 'Safety Attention Flag';
  const severityStr = row.severity ? ` [${String(row.severity).toUpperCase()}]` : '';

  return {
    id: `tl_flag_${row.id}`,
    patientId: row.patient_id || patientId || '',
    encounterId: row.encounter_id || row.session_id,
    eventDate: dateInfo.eventDate,
    eventDatePrecision: dateInfo.eventDatePrecision,
    eventDateSource: dateInfo.eventDateSource,
    eventType: 'attention_flag',
    title: `${title}${severityStr}`,
    summary: row.message || row.reason || row.description || title,
    sourceType: 'attention_flag',
    sourceId: String(row.id),
    sourceDocumentId: row.source_id || row.document_id,
    verificationStatus: 'unverified',
    provenanceSource: 'patient_reported',
    importance: row.severity === 'critical' ? 'critical' : row.severity === 'high' ? 'high' : 'medium',
    details: { flagType: row.flag_label || row.label || row.category, severity: row.severity },
    metadata: { createdAt: row.created_at || row.generated_at },
  };
}

/**
 * Maps public.conversation_answers row into TimelineEvent.
 */
export function buildConversationEvent(row: Record<string, any>, patientId?: string, encounterDate?: string): TimelineEvent {
  const dateInfo = normalizeEventDate(row.answered_at || row.created_at, encounterDate);
  const prompt = row.question_id || row.section || 'Patient Statement';
  const answer = row.normalized_english_text || row.raw_text || row.answer_text || 'Recorded answer';

  return {
    id: `tl_conv_${row.id}`,
    patientId: row.patient_id || patientId || '',
    encounterId: row.encounter_id,
    eventDate: dateInfo.eventDate,
    eventDatePrecision: dateInfo.eventDatePrecision,
    eventDateSource: dateInfo.eventDateSource,
    eventType: 'conversation',
    title: `Intake (${prompt})`,
    summary: answer,
    sourceType: 'conversation',
    sourceId: String(row.id),
    verificationStatus: 'unverified',
    provenanceSource: 'patient_reported',
    importance: 'low',
    details: { questionId: row.question_id, section: row.section },
    metadata: { createdAt: row.created_at },
  };
}
