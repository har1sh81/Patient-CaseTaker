/**
 * Task #32 — FHIR Procedure Mapper
 * MediKiosk Clinical Architecture
 * 
 * Maps public.clinical_procedures into FHIR Procedure R4.
 */

import { FHIR_SYSTEMS } from './fhir-constants';
import type { FhirProcedure } from './types';

export function mapProcedureToFhir(procedure: any): FhirProcedure {
  let status: FhirProcedure['status'] = 'completed';
  if (procedure.status === 'planned' || procedure.status === 'preparation') status = 'preparation';
  else if (procedure.status === 'cancelled' || procedure.status === 'not-done') status = 'not-done';
  else if (procedure.status === 'completed') status = 'completed';

  return {
    resourceType: 'Procedure',
    id: procedure.id,
    status,
    code: {
      coding: procedure.code ? [{ code: procedure.code, display: procedure.procedure_name }] : [],
      text: procedure.procedure_name,
    },
    subject: {
      reference: `Patient/${procedure.patient_id}`,
      type: 'Patient',
    },
    encounter: procedure.encounter_id ? { reference: `Encounter/${procedure.encounter_id}`, type: 'Encounter' } : undefined,
    performedDateTime: procedure.performed_at || procedure.created_at,
    bodySite: procedure.body_site ? [{ text: procedure.body_site }] : undefined,
    note: procedure.outcome_notes ? [{ text: procedure.outcome_notes }] : undefined,
    extension: [
      { url: FHIR_SYSTEMS.EXTENSION_VERIFICATION_STATUS, valueString: procedure.verification_status || 'unverified' },
      { url: FHIR_SYSTEMS.EXTENSION_PROVENANCE_SOURCE, valueString: procedure.provenance_source || 'ocr_extracted' },
      procedure.laterality ? { url: 'https://medikiosk.in/fhir/StructureDefinition/laterality', valueString: procedure.laterality } : undefined,
    ].filter(Boolean) as any,
  };
}
