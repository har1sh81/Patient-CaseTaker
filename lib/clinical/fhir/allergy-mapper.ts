/**
 * Task #32 — FHIR AllergyIntolerance Mapper
 * MediKiosk Clinical Architecture
 * 
 * Maps explicit allergy records into FHIR AllergyIntolerance R4.
 * CRITICAL SAFETY MANDATE: Must NOT infer allergy status from missing data or medication history.
 */

import type { FhirAllergyIntolerance } from './types';

export function mapAllergyToFhir(allergy: any): FhirAllergyIntolerance {
  return {
    resourceType: 'AllergyIntolerance',
    id: allergy.id,
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hlth.org/CodeSystem/allergyintolerance-clinical', code: 'active', display: 'Active' }],
      text: 'Active',
    },
    verificationStatus: {
      coding: [{ system: 'http://terminology.hlth.org/CodeSystem/allergyintolerance-verification', code: 'confirmed', display: 'Confirmed' }],
      text: 'Confirmed',
    },
    code: {
      coding: allergy.code ? [{ code: allergy.code, display: allergy.allergy_name }] : [],
      text: allergy.allergy_name || 'Allergy',
    },
    patient: {
      reference: `Patient/${allergy.patient_id}`,
      type: 'Patient',
    },
    recordedDate: allergy.recorded_at || allergy.created_at,
  };
}
