import { z } from 'zod';
import { SupportedLanguageSchema } from './common.schema';

export const DepartmentModeSchema = z.enum(['standard', 'ayush']);

export const IntakeSessionStatusSchema = z.enum([
  'created',
  'identifying_patient',
  'awaiting_consent',
  'active',
  'review',
  'report_ready',
  'printing',
  'completed',
  'cancelled',
  'expired',
]);

export const IntakeSessionSchema = z.object({
  id: z.string(),

  patientId: z.string().optional(),

  status: IntakeSessionStatusSchema,

  language: SupportedLanguageSchema,

  departmentMode: DepartmentModeSchema,

  consentId: z.string().optional(),

  startedAt: z.string(),
  expiresAt: z.string().optional(),
  completedAt: z.string().optional(),

  currentStep: z.string(),

  progress: z.object({
    completedSections: z.array(z.string()),
    pendingSections: z.array(z.string()),
    percentage: z.number(),
  }),

  cleanupStatus: z.object({
    temporaryDataDeleted: z.boolean(),
    cleanedAt: z.string().optional(),
  }),
});
