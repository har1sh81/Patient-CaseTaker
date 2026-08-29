import { z } from 'zod';

export const ExportTypeSchema = z.enum(['fhir_hospital', 'fhir_abdm']);

export const ExportStatusSchema = z.enum([
  'queued',
  'sending',
  'sent',
  'failed',
  'retrying',
]);

export const ExportRecordSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  reportId: z.string(),
  exportType: ExportTypeSchema,
  status: ExportStatusSchema,
  externalReferenceId: z.string().optional(),
  provider: z.string(),
  failureReason: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
