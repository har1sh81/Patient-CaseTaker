/**
 * Task #32 — FHIR Encounter Mapper
 * MediKiosk Clinical Architecture
 * 
 * Maps public.encounters into FHIR Encounter R4.
 */

import type { FhirEncounter } from './types';

export function mapEncounterToFhir(encounter: any): FhirEncounter {
  let status: FhirEncounter['status'] = 'in-progress';
  if (encounter.status === 'completed' || encounter.status === 'sent_to_doctor') status = 'finished';
  else if (encounter.status === 'cancelled') status = 'cancelled';
  else if (encounter.status === 'active') status = 'in-progress';

  return {
    resourceType: 'Encounter',
    id: encounter.id,
    status,
    class: {
      system: 'http://terminology.hlth.org/CodeSystem/v3-ActCode',
      code: 'AMB',
      display: 'ambulatory',
    },
    subject: {
      reference: `Patient/${encounter.patient_id}`,
      type: 'Patient',
    },
    period: {
      start: encounter.started_at || encounter.created_at,
      end: encounter.completed_at || undefined,
    },
    serviceType: {
      text: encounter.department_mode || 'standard',
    },
    extension: encounter.intake_mode
      ? [{ url: 'https://medikiosk.in/fhir/StructureDefinition/intake-mode', valueString: encounter.intake_mode }]
      : undefined,
  };
}
