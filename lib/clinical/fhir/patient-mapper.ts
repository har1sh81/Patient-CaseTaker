/**
 * Task #32 — FHIR Patient Mapper
 * MediKiosk Clinical Architecture
 * 
 * Maps public.patients + public.patient_external_identifiers into FHIR Patient R4.
 */

import { FHIR_SYSTEMS } from './fhir-constants';
import type { FhirPatient, FhirIdentifier } from './types';

export function mapPatientToFhir(
  patient: any,
  identifiers: any[] = []
): FhirPatient {
  const fhirIdentifiers: FhirIdentifier[] = [];

  // Internal UUID
  fhirIdentifiers.push({
    use: 'official',
    system: FHIR_SYSTEMS.PATIENT_IDENTIFIER_INTERNAL,
    value: patient.id,
  });

  // External Identifiers (ABHA Number, ABHA Address, Hospital ID)
  for (const extId of identifiers) {
    let system: string = FHIR_SYSTEMS.PATIENT_IDENTIFIER_HOSPITAL;
    if (extId.identifier_type === 'abha_number') system = FHIR_SYSTEMS.PATIENT_IDENTIFIER_ABHA_NUMBER;
    else if (extId.identifier_type === 'abha_address') system = FHIR_SYSTEMS.PATIENT_IDENTIFIER_ABHA_ADDRESS;

    fhirIdentifiers.push({
      use: extId.verification_status === 'verified' ? 'official' : 'usual',
      type: { text: extId.identifier_type },
      system,
      value: extId.identifier_value,
      assigner: extId.issuer ? { display: extId.issuer } : undefined,
    });
  }

  // Gender Mapping
  let gender: 'male' | 'female' | 'other' | 'unknown' = 'unknown';
  if (patient.gender) {
    const g = patient.gender.toLowerCase();
    if (g.includes('male') && !g.includes('female')) gender = 'male';
    else if (g.includes('female')) gender = 'female';
    else if (g.includes('non-binary') || g.includes('transgender') || g.includes('other')) gender = 'other';
  }

  const telecom: any[] = [];
  if (patient.phone_number) telecom.push({ system: 'phone', value: patient.phone_number, use: 'mobile' });
  if (patient.email) telecom.push({ system: 'email', value: patient.email, use: 'home' });

  return {
    resourceType: 'Patient',
    id: patient.id,
    active: true,
    identifier: fhirIdentifiers,
    name: [
      {
        use: 'official',
        text: patient.full_name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim(),
        family: patient.last_name || undefined,
        given: patient.first_name ? [patient.first_name] : undefined,
      },
    ],
    telecom: telecom.length > 0 ? telecom : undefined,
    gender,
    birthDate: patient.date_of_birth || undefined,
    communication: patient.preferred_language
      ? [{ language: { text: patient.preferred_language }, preferred: true }]
      : undefined,
  };
}
