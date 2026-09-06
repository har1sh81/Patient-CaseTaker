/**
 * Task #32 — FHIR DocumentReference Mapper
 * MediKiosk Clinical Architecture
 * 
 * Maps public.medical_documents into FHIR DocumentReference R4.
 * Securely references document download endpoint without leaking storage keys.
 */

import type { FhirDocumentReference } from './types';

export function mapDocumentToFhirReference(doc: any): FhirDocumentReference {
  return {
    resourceType: 'DocumentReference',
    id: doc.id,
    status: 'current',
    type: {
      coding: [],
      text: doc.document_type || 'Clinical Document',
    },
    subject: {
      reference: `Patient/${doc.patient_id}`,
      type: 'Patient',
    },
    context: doc.encounter_id
      ? {
          encounter: [{ reference: `Encounter/${doc.encounter_id}`, type: 'Encounter' }],
        }
      : undefined,
    date: doc.uploaded_at || doc.created_at,
    content: [
      {
        attachment: {
          contentType: doc.mime_type || 'application/pdf',
          url: `/api/clinical/documents/${doc.id}/download`,
          title: doc.file_name || 'Medical Document',
        },
      },
    ],
    extension: doc.ocr_status
      ? [{ url: 'https://medikiosk.in/fhir/StructureDefinition/ocr-status', valueString: doc.ocr_status }]
      : undefined,
  };
}
