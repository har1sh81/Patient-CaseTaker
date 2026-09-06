/**
 * Task #32 — FHIR Condition Mapper
 * MediKiosk Clinical Architecture
 * 
 * Maps public.clinical_diagnoses (Clinician-Verified Diagnoses ONLY) into FHIR Condition R4.
 * CRITICAL SAFETY MANDATE: Must NOT map symptoms, labs, vitals, or AI summaries into Conditions.
 */

import { FHIR_SYSTEMS } from './fhir-constants';
import type { FhirCondition, FhirCoding } from './types';

export function mapDiagnosisToFhirCondition(diagnosis: any): FhirCondition {
  let clinicalStatusCode = 'active';
  if (diagnosis.clinical_status === 'resolved') clinicalStatusCode = 'resolved';

  let verStatusCode = 'confirmed';
  if (diagnosis.verification_status === 'unverified') verStatusCode = 'unconfirmed';

  const codings: FhirCoding[] = [];
  if (diagnosis.icd10_code) {
    codings.push({
      system: 'http://hl7.org/fhir/sid/icd-10',
      code: diagnosis.icd10_code,
      display: diagnosis.condition_name,
    });
  }

  return {
    resourceType: 'Condition',
    id: diagnosis.id,
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hlth.org/CodeSystem/condition-clinical', code: clinicalStatusCode, display: clinicalStatusCode }],
      text: clinicalStatusCode,
    },
    verificationStatus: {
      coding: [{ system: 'http://terminology.hlth.org/CodeSystem/condition-ver-status', code: verStatusCode, display: verStatusCode }],
      text: verStatusCode,
    },
    category: [
      {
        coding: [{ system: FHIR_SYSTEMS.CONDITION_CATEGORY_PROBLEM, code: 'problem-list-item', display: 'Problem List Item' }],
        text: 'Problem List Item',
      },
    ],
    code: {
      coding: codings,
      text: diagnosis.condition_name,
    },
    subject: {
      reference: `Patient/${diagnosis.patient_id}`,
      type: 'Patient',
    },
    encounter: diagnosis.encounter_id ? { reference: `Encounter/${diagnosis.encounter_id}`, type: 'Encounter' } : undefined,
    onsetDateTime: diagnosis.diagnosed_at || diagnosis.created_at,
    recordedDate: diagnosis.created_at,
    note: diagnosis.notes ? [{ text: diagnosis.notes }] : undefined,
    extension: [
      { url: FHIR_SYSTEMS.EXTENSION_VERIFICATION_STATUS, valueString: diagnosis.verification_status || 'doctor_verified' },
      { url: FHIR_SYSTEMS.EXTENSION_PROVENANCE_SOURCE, valueString: diagnosis.provenance_source || 'doctor_verified' },
      diagnosis.diagnosed_by ? { url: 'https://medikiosk.in/fhir/StructureDefinition/diagnosed-by', valueString: diagnosis.diagnosed_by } : undefined,
    ].filter(Boolean) as any,
  };
}
