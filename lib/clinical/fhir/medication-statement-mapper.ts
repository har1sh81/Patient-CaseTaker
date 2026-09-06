/**
 * Task #32 — FHIR MedicationStatement Mapper
 * MediKiosk Clinical Architecture
 * 
 * Maps public.clinical_medications into FHIR MedicationStatement R4.
 */

import { FHIR_SYSTEMS } from './fhir-constants';
import type { FhirMedicationStatement } from './types';

export function mapMedicationToFhirStatement(medication: any): FhirMedicationStatement {
  let status: FhirMedicationStatement['status'] = 'active';
  if (medication.status === 'discontinued' || medication.status === 'stopped') status = 'stopped';
  else if (medication.status === 'completed') status = 'completed';

  const dosageText = `${medication.dosage || ''} ${medication.frequency || ''}`.trim();

  return {
    resourceType: 'MedicationStatement',
    id: medication.id,
    status,
    medicationCodeableConcept: {
      coding: [],
      text: medication.medication_name,
    },
    subject: {
      reference: `Patient/${medication.patient_id}`,
      type: 'Patient',
    },
    context: medication.encounter_id ? { reference: `Encounter/${medication.encounter_id}`, type: 'Encounter' } : undefined,
    dateAsserted: medication.created_at,
    dosage: dosageText
      ? [
          {
            text: dosageText,
            route: medication.route ? { text: medication.route } : undefined,
          },
        ]
      : undefined,
    extension: [
      { url: FHIR_SYSTEMS.EXTENSION_VERIFICATION_STATUS, valueString: medication.verification_status || 'unverified' },
      { url: FHIR_SYSTEMS.EXTENSION_PROVENANCE_SOURCE, valueString: medication.provenance_source || 'patient_reported' },
      medication.medication_name_native ? { url: 'https://medikiosk.in/fhir/StructureDefinition/native-text', valueString: medication.medication_name_native } : undefined,
    ].filter(Boolean) as any,
  };
}
