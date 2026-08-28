import { z } from 'zod';
import { MedicalDocumentTypeSchema, DocumentExtractionResultSchema } from './document.schema';
import { DepartmentModeSchema, IntakeSessionSchema } from './session.schema';
import { PatientSchema } from './patient.schema';
import { ConsentSchema } from './consent.schema';
import { ClinicalHistorySchema } from './clinical-history.schema';

export const DemoConversationStepSchema = z.object({
  questionId: z.string(),
  patientResponse: z.string(),
  transcript: z.string().optional(),
  inputMethod: z.enum(['voice', 'touch']),
  delayMs: z.number().optional(),
});

export const DemoDocumentSchema = z.object({
  documentId: z.string(),
  fileName: z.string(),
  documentType: MedicalDocumentTypeSchema,
  mockOcrText: z.string(),
  expectedExtraction: DocumentExtractionResultSchema.partial(),
});

export const DemoScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  mode: DepartmentModeSchema,
  estimatedDemoDurationMinutes: z.number(),
  patient: PatientSchema,
  consent: ConsentSchema.partial(),
  session: IntakeSessionSchema.partial(),
  conversation: z.array(DemoConversationStepSchema),
  documents: z.array(DemoDocumentSchema),
  expectedClinicalHistory: ClinicalHistorySchema.partial(),
  expectedFlags: z.array(z.string()),
  expectedReportSummary: z.string(),
});
