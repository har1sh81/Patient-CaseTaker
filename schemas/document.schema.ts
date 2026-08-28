import { z } from 'zod';
import {
  ProcessingStatusSchema,
  ConfidenceLevelSchema,
  DataProvenanceSchema,
  SupportedLanguageSchema,
} from './common.schema';
import { MedicationSchema, AllergySchema } from './clinical-history.schema';

export const MedicalDocumentTypeSchema = z.enum([
  'prescription',
  'laboratory_report',
  'discharge_summary',
  'scan',
  'medical_note',
  'other',
  'unknown',
]);

export const MedicalDocumentSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  patientId: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  storagePath: z.string().optional(),
  documentType: MedicalDocumentTypeSchema,
  documentDate: z.string().optional(),
  uploadStatus: ProcessingStatusSchema,
  uploadedAt: z.string(),
  provenance: DataProvenanceSchema,
});

export const OCRRequestSchema = z.object({
  documentId: z.string(),
  storagePath: z.string().optional(),
  languageHints: z.array(SupportedLanguageSchema).optional(),
});

export const OCRPageSchema = z.object({
  pageNumber: z.number(),
  text: z.string(),
  confidence: z.number().optional(),
});

export const OCRResponseSchema = z.object({
  documentId: z.string(),
  rawText: z.string(),
  pages: z.array(OCRPageSchema),
  confidence: ConfidenceLevelSchema,
  status: ProcessingStatusSchema,
  error: z.string().optional(),
});

export const ExtractedConditionSchema = z.object({
  name: z.string(),
  status: z.enum(['mentioned', 'historical', 'active_if_document_indicates', 'unknown']),
  sourceText: z.string().optional(),
  provenance: DataProvenanceSchema,
});

export const ExtractedProcedureSchema = z.object({
  name: z.string(),
  date: z.string().optional(),
  notes: z.string().optional(),
  provenance: DataProvenanceSchema,
});

export const HospitalAdmissionSchema = z.object({
  admissionDate: z.string().optional(),
  dischargeDate: z.string().optional(),
  hospital: z.string().optional(),
  reason: z.string().optional(),
  summary: z.string().optional(),
  provenance: DataProvenanceSchema,
});

export const LabResultSchema = z.object({
  id: z.string(),
  testName: z.string(),
  valueRaw: z.string(),
  numericValue: z.number().optional(),
  unit: z.string().optional(),
  referenceRangeRaw: z.string().optional(),
  referenceRange: z.object({
    lower: z.number().optional(),
    upper: z.number().optional(),
  }).optional(),
  documentProvidedRange: z.boolean(),
  testDate: z.string().optional(),
  sourceDocumentId: z.string(),
  provenance: DataProvenanceSchema,
});

export const MedicalTimelineEventTypeSchema = z.enum([
  'symptom',
  'diagnosis_mentioned',
  'medication',
  'procedure',
  'laboratory_test',
  'hospital_admission',
  'hospital_discharge',
  'document',
  'other',
]);

export const MedicalTimelineEventSchema = z.object({
  id: z.string(),
  date: z.string().optional(),
  eventType: MedicalTimelineEventTypeSchema,
  title: z.string(),
  description: z.string().optional(),
  sourceDocumentId: z.string().optional(),
  provenance: DataProvenanceSchema,
});

export const DocumentExtractionResultSchema = z.object({
  documentId: z.string(),
  documentType: MedicalDocumentTypeSchema,
  documentDate: z.string().optional(),
  extractionStatus: ProcessingStatusSchema,
  diagnosesMentioned: z.array(ExtractedConditionSchema),
  medications: z.array(MedicationSchema),
  allergies: z.array(AllergySchema),
  procedures: z.array(ExtractedProcedureSchema),
  laboratoryResults: z.array(LabResultSchema),
  admissions: z.array(HospitalAdmissionSchema),
  timelineEvents: z.array(MedicalTimelineEventSchema),
  unstructuredSummary: z.string().optional(),
  confidence: ConfidenceLevelSchema,
});
