/**
 * Task #32 — FHIR Mapping & Export Service
 * MediKiosk Clinical Architecture
 * 
 * Orchestrates batched clinical data retrieval, consent checking, FHIR resource mapping,
 * reference resolution, and Bundle assembly.
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { hasValidConsent } from '@/lib/consent/consent-service';
import { mapPatientToFhir } from './patient-mapper';
import { mapEncounterToFhir } from './encounter-mapper';
import { mapVitalToFhirObservation, mapSymptomToFhirObservation, mapLabToFhirObservation, mapAyushToFhirObservation } from './observation-mapper';
import { mapDiagnosisToFhirCondition } from './condition-mapper';
import { mapMedicationToFhirStatement } from './medication-statement-mapper';
import { mapProcedureToFhir } from './procedure-mapper';
import { mapLabGroupToDiagnosticReport } from './diagnostic-report-mapper';
import { mapDocumentToFhirReference } from './document-reference-mapper';
import { mapProvenanceChainToFhir } from './provenance-mapper';
import { buildFhirBundle } from './bundle-builder';
import { getProvenanceChain } from '@/lib/clinical/provenance/provenance-service';
import type { FhirExportOptions, FhirExportResult, FhirResource, FhirServiceResponse, FhirObservation } from './types';

/**
 * Audit logger for FHIR export events.
 * High-level audit metadata only (never logs raw FHIR bundle content).
 */
export async function logFhirAudit(
  action: 'fhir_export_started' | 'fhir_export_completed' | 'fhir_export_failed',
  patientId: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from('audit_logs').insert({
      action,
      actor_type: 'clinician',
      actor_id: patientId,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[FHIR Audit Log] Error writing audit log:', err);
  }
}

/**
 * Exports existing structured patient clinical records into a FHIR R4 Bundle.
 */
export async function exportPatientFhirBundle(
  options: FhirExportOptions
): Promise<FhirServiceResponse<FhirExportResult>> {
  const { patientId, encounterId, includeDocuments = true, includeProvenance = false } = options;

  if (!patientId || typeof patientId !== 'string' || patientId.trim() === '') {
    return { success: false, errorCode: 'INVALID_INPUT', error: 'Patient ID is required' };
  }

  await logFhirAudit('fhir_export_started', patientId, { encounterId, includeDocuments, includeProvenance });

  // 1. Consent Verification
  const hasConsent = await hasValidConsent(patientId, 'share_health_records');
  if (!hasConsent) {
    await logFhirAudit('fhir_export_failed', patientId, { reason: 'CONSENT_DENIED' });
    return {
      success: false,
      errorCode: 'CONSENT_DENIED',
      error: "Patient consent 'share_health_records' required to perform FHIR export",
    };
  }

  const hasAyushConsent = await hasValidConsent(patientId, 'share_ayush_records');

  try {
    const supabase = await createAdminClient();

    // 2. Batched Data Retrieval (Cross-patient isolated)
    const [
      { data: patient },
      { data: identifiers },
      { data: encounters },
      { data: vitals },
      { data: symptoms },
      { data: labs },
      { data: diagnoses },
      { data: medications },
      { data: procedures },
      { data: ayushAssessments },
      { data: documents },
    ] = await Promise.all([
      supabase.from('patients').select('*').eq('id', patientId).single(),
      supabase.from('patient_external_identifiers').select('*').eq('patient_id', patientId),
      encounterId
        ? supabase.from('encounters').select('*').eq('patient_id', patientId).eq('id', encounterId)
        : supabase.from('encounters').select('*').eq('patient_id', patientId),
      encounterId
        ? supabase.from('clinical_vitals').select('*').eq('patient_id', patientId).eq('encounter_id', encounterId)
        : supabase.from('clinical_vitals').select('*').eq('patient_id', patientId),
      encounterId
        ? supabase.from('clinical_symptoms').select('*').eq('patient_id', patientId).eq('encounter_id', encounterId)
        : supabase.from('clinical_symptoms').select('*').eq('patient_id', patientId),
      encounterId
        ? supabase.from('clinical_lab_results').select('*').eq('patient_id', patientId).eq('encounter_id', encounterId)
        : supabase.from('clinical_lab_results').select('*').eq('patient_id', patientId),
      encounterId
        ? supabase.from('clinical_diagnoses').select('*').eq('patient_id', patientId).eq('encounter_id', encounterId)
        : supabase.from('clinical_diagnoses').select('*').eq('patient_id', patientId),
      encounterId
        ? supabase.from('clinical_medications').select('*').eq('patient_id', patientId).eq('encounter_id', encounterId)
        : supabase.from('clinical_medications').select('*').eq('patient_id', patientId),
      encounterId
        ? supabase.from('clinical_procedures').select('*').eq('patient_id', patientId).eq('encounter_id', encounterId)
        : supabase.from('clinical_procedures').select('*').eq('patient_id', patientId),
      encounterId
        ? supabase.from('clinical_ayush_assessments').select('*').eq('patient_id', patientId).eq('encounter_id', encounterId)
        : supabase.from('clinical_ayush_assessments').select('*').eq('patient_id', patientId),
      includeDocuments
        ? encounterId
          ? supabase.from('medical_documents').select('*').eq('patient_id', patientId).eq('encounter_id', encounterId)
          : supabase.from('medical_documents').select('*').eq('patient_id', patientId)
        : Promise.resolve({ data: [] }),
    ]);

    if (!patient) {
      await logFhirAudit('fhir_export_failed', patientId, { reason: 'PATIENT_NOT_FOUND' });
      return { success: false, errorCode: 'NOT_FOUND', error: 'Patient not found' };
    }

    const resources: FhirResource[] = [];

    // A. Map Patient
    const fhirPatient = mapPatientToFhir(patient, identifiers || []);
    resources.push(fhirPatient);

    // B. Map Encounters
    for (const enc of encounters || []) {
      resources.push(mapEncounterToFhir(enc));
    }

    // C. Map Vitals -> Observations
    for (const v of vitals || []) {
      const vObsList = mapVitalToFhirObservation(v);
      resources.push(...vObsList);
    }

    // D. Map Symptoms -> Observations
    for (const sym of symptoms || []) {
      resources.push(mapSymptomToFhirObservation(sym));
    }

    // E. Map Labs -> Observations + DiagnosticReport
    const labObservations: FhirObservation[] = [];
    for (const lab of labs || []) {
      const lObs = mapLabToFhirObservation(lab);
      labObservations.push(lObs);
      resources.push(lObs);
    }

    if (labObservations.length > 0) {
      const report = mapLabGroupToDiagnosticReport(
        `report-${patientId}`,
        patientId,
        encounterId || (encounters && encounters[0]?.id),
        labObservations
      );
      resources.push(report);
    }

    // F. Map AYUSH Assessments (if consent granted) -> Observations
    if (hasAyushConsent) {
      for (const ayush of ayushAssessments || []) {
        resources.push(mapAyushToFhirObservation(ayush));
      }
    }

    // G. Map Diagnoses (Clinician-verified ONLY) -> Conditions
    for (const diag of diagnoses || []) {
      resources.push(mapDiagnosisToFhirCondition(diag));
    }

    // H. Map Medications -> MedicationStatements
    for (const med of medications || []) {
      resources.push(mapMedicationToFhirStatement(med));
    }

    // I. Map Procedures -> Procedures
    for (const proc of procedures || []) {
      resources.push(mapProcedureToFhir(proc));
    }

    // J. Map Documents -> DocumentReferences
    if (includeDocuments) {
      for (const doc of documents || []) {
        resources.push(mapDocumentToFhirReference(doc));
      }
    }

    // K. Optional Task #31 Provenance Mapping
    if (includeProvenance) {
      for (const lab of labs || []) {
        const provRes = await getProvenanceChain(patientId, 'lab', lab.id);
        if (provRes.success && provRes.data) {
          resources.push(mapProvenanceChainToFhir({ reference: `Observation/${lab.id}`, type: 'Observation' }, provRes.data));
        }
      }
    }

    // 3. Assemble Bundle
    const exportResult = buildFhirBundle(patientId, resources);

    await logFhirAudit('fhir_export_completed', patientId, {
      fhirVersion: exportResult.fhirVersion,
      totalEntries: exportResult.bundle.entry.length,
      resourceCounts: exportResult.resourceCounts,
    });

    return {
      success: true,
      data: exportResult,
    };
  } catch (err: any) {
    console.error('[FHIR Service] Export exception:', err);
    await logFhirAudit('fhir_export_failed', patientId, { error: err.message });
    return {
      success: false,
      errorCode: 'INTERNAL_SERVER_ERROR',
      error: err.message || 'Failed to generate FHIR Bundle',
    };
  }
}
