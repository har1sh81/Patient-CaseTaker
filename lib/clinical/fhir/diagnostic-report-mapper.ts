/**
 * Task #32 — FHIR DiagnosticReport Mapper
 * MediKiosk Clinical Architecture
 * 
 * Groups lab Observation references into FHIR DiagnosticReport R4.
 */

import { FHIR_SYSTEMS } from './fhir-constants';
import type { FhirDiagnosticReport, FhirObservation } from './types';

export function mapLabGroupToDiagnosticReport(
  reportId: string,
  patientId: string,
  encounterId: string | undefined,
  labObservations: FhirObservation[],
  specimenDate?: string
): FhirDiagnosticReport {
  return {
    resourceType: 'DiagnosticReport',
    id: reportId,
    status: 'final',
    code: {
      coding: [{ system: FHIR_SYSTEMS.OBSERVATION_CATEGORY_LAB, code: 'laboratory', display: 'Laboratory Report' }],
      text: 'Laboratory Report',
    },
    subject: {
      reference: `Patient/${patientId}`,
      type: 'Patient',
    },
    encounter: encounterId ? { reference: `Encounter/${encounterId}`, type: 'Encounter' } : undefined,
    effectiveDateTime: specimenDate || labObservations[0]?.effectiveDateTime || '2026-09-06T00:00:00Z',
    result: labObservations.map(o => ({
      reference: `Observation/${o.id}`,
      type: 'Observation',
    })),
  };
}
