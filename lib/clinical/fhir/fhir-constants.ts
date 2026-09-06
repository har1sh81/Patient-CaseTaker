/**
 * Task #32 — FHIR Mapping Constants
 * MediKiosk Clinical Architecture
 * 
 * FHIR Version: 4.0.1 (FHIR R4)
 */

export const FHIR_VERSION = '4.0.1' as const;

export const FHIR_SYSTEMS = {
  PATIENT_IDENTIFIER_ABHA_NUMBER: 'https://healthid.ndhm.gov.in/abha-number',
  PATIENT_IDENTIFIER_ABHA_ADDRESS: 'https://healthid.ndhm.gov.in/abha-address',
  PATIENT_IDENTIFIER_HOSPITAL: 'https://medikiosk.in/identifiers/hospital-number',
  PATIENT_IDENTIFIER_INTERNAL: 'https://medikiosk.in/identifiers/patient-uuid',

  OBSERVATION_CATEGORY_VITAL: 'http://terminology.hlth.org/CodeSystem/observation-category/vital-signs',
  OBSERVATION_CATEGORY_LAB: 'http://terminology.hlth.org/CodeSystem/observation-category/laboratory',
  OBSERVATION_CATEGORY_EXAM: 'http://terminology.hlth.org/CodeSystem/observation-category/exam',
  OBSERVATION_CATEGORY_AYUSH: 'https://medikiosk.in/fhir/StructureDefinition/ayush-observation',

  CONDITION_CATEGORY_PROBLEM: 'http://terminology.hlth.org/CodeSystem/condition-category/problem-list-item',
  CONDITION_CLINICAL_ACTIVE: 'http://terminology.hlth.org/CodeSystem/condition-clinical/active',
  CONDITION_CLINICAL_RESOLVED: 'http://terminology.hlth.org/CodeSystem/condition-clinical/resolved',
  CONDITION_VERIFICATION_CONFIRMED: 'http://terminology.hlth.org/CodeSystem/condition-ver-status/confirmed',
  CONDITION_VERIFICATION_UNCONFIRMED: 'http://terminology.hlth.org/CodeSystem/condition-ver-status/unconfirmed',

  MEDICATION_STATUS_ACTIVE: 'active',
  MEDICATION_STATUS_COMPLETED: 'completed',
  MEDICATION_STATUS_STOPPED: 'stopped',

  PROCEDURE_STATUS_COMPLETED: 'completed',
  PROCEDURE_STATUS_PREPARATION: 'preparation',
  PROCEDURE_STATUS_NOT_DONE: 'not-done',

  EXTENSION_AYUSH_PRAKRITI: 'https://medikiosk.in/fhir/StructureDefinition/ayush-prakriti',
  EXTENSION_AYUSH_VIKRITI: 'https://medikiosk.in/fhir/StructureDefinition/ayush-vikriti',
  EXTENSION_AYUSH_AGNI: 'https://medikiosk.in/fhir/StructureDefinition/ayush-agni',
  EXTENSION_AYUSH_KOSHTHA: 'https://medikiosk.in/fhir/StructureDefinition/ayush-koshtha',
  EXTENSION_AYUSH_DASHAVIDHA: 'https://medikiosk.in/fhir/StructureDefinition/ayush-dashavidha',
  EXTENSION_VERIFICATION_STATUS: 'https://medikiosk.in/fhir/StructureDefinition/verification-status',
  EXTENSION_PROVENANCE_SOURCE: 'https://medikiosk.in/fhir/StructureDefinition/provenance-source',
  EXTENSION_AI_TRACE: 'https://medikiosk.in/fhir/StructureDefinition/ai-summary-trace',
} as const;
